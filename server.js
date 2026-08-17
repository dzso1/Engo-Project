require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mammoth = require("mammoth");

const pool = require("./database/db");
const { parseDocxAssessment } = require("./services/docx-assessment-parser");

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    className: row.class_name || null,
    status: row.status,
    createdAt: row.created_at,
  };
}

function requireLogin(req, res, next) {
  const token = req.cookies.engo_token;
  if (!token) {
    return res.status(401).json({ success: false, message: "Vui lòng đăng nhập." });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Phiên đăng nhập đã hết hạn." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: "Không có quyền thực hiện thao tác này." });
    }
    return next();
  };
}

async function ensureAssessmentTables() {
  // Verify that the required tables were created by an admin (see database/assessment-schema.sql).
  // The application DB user (engo_app) only has SELECT/INSERT/UPDATE — no DDL rights.
  // If the tables are missing, an error will be thrown here and logged at startup.
  const [[users]] = await pool.query("SELECT 1 FROM users LIMIT 0");
  const [[imported]] = await pool.query("SELECT 1 FROM imported_tests LIMIT 0");
  const [[writing]] = await pool.query("SELECT 1 FROM writing_submissions LIMIT 0");
}

const assessmentReady = ensureAssessmentTables()
  .then(() => true)
  .catch(error => { console.error("Assessment tables unavailable:", error); return false; });


function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getStoredTest(row) {
  return { ...row, questions: typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json };
}

function publicTest(test) {
  return {
    id: test.id,
    title: test.title,
    sourceFileName: test.source_file_name,
    className: test.class_name || null,
    createdAt: test.created_at,
    summary: typeof test.summary_json === "string" ? JSON.parse(test.summary_json) : test.summary_json,
    sections: test.questions && test.questions.sections ? test.questions.sections.map(section => ({
      name: section.name,
      questions: section.questions.map(({ answer, accepted, referenceAnswer, ...question }) => question),
    })) : [],
  };
}

app.get("/api/health", async (req, res) => {
  try {
    const [rows] = await pool.execute("SELECT NOW() AS databaseTime");
    return res.json({
      success: true,
      message: "Node.js đã kết nối thành công với MySQL.",
      databaseTime: rows[0].databaseTime,
    });
  } catch (error) {
    console.error("Lỗi kết nối MySQL:", error);
    return res.status(500).json({ success: false, message: "Không thể kết nối với MySQL.", error: error.message });
  }
});

app.post("/api/auth/register", async (req, res) => {
  try {
    await assessmentReady;
    const { fullName, email, password, role = "student", className } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }
    if (!["student", "teacher", "parent"].includes(role)) {
      return res.status(400).json({ success: false, message: "Vai trò không hợp lệ." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Email này đã được đăng ký." });
    }

    const studentClass = role === "student" ? (String(className || "").trim() || null) : null;
    const passwordHash = await bcrypt.hash(password, 12);
    const status = role === "teacher" ? "pending" : "active";
    const [result] = await pool.execute(
      "INSERT INTO users (full_name, email, password_hash, role, class_name, status) VALUES (?, ?, ?, ?, ?, ?)",
      [String(fullName).trim(), normalizedEmail, passwordHash, role, studentClass, status]
    );

    return res.status(201).json({
      success: true,
      message: status === "active" ? "Đăng ký thành công. Có thể đăng nhập ngay." : "Đăng ký thành công. Tài khoản giáo viên đang chờ duyệt.",
      userId: result.insertId,
      status,
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ success: false, message: "Không thể đăng ký tài khoản." });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin đăng nhập." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [rows] = await pool.execute(
      "SELECT id, full_name, email, password_hash, role, class_name, status, created_at FROM users WHERE email = ? AND role = ? LIMIT 1",
      [normalizedEmail, role]
    );
    const user = rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Email, mật khẩu hoặc vai trò không đúng." });
    }
    if (user.status === "pending") {
      return res.status(403).json({ success: false, message: "Tài khoản đang chờ quản trị viên duyệt." });
    }
    if (user.status === "locked") {
      return res.status(403).json({ success: false, message: "Tài khoản đã bị khóa." });
    }

    const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "8h" });
    res.cookie("engo_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 8 * 60 * 60 * 1000,
    });

    return res.json({ success: true, message: "Đăng nhập thành công.", user: publicUser(user) });
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    return res.status(500).json({ success: false, message: "Không thể đăng nhập." });
  }
});

app.get("/api/auth/me", requireLogin, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, full_name, email, role, class_name, status, created_at FROM users WHERE id = ? LIMIT 1",
      [req.user.userId]
    );
    const user = rows[0];
    if (!user || user.status !== "active") {
      res.clearCookie("engo_token");
      return res.status(401).json({ success: false, message: "Tài khoản không còn hoạt động." });
    }
    return res.json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể lấy thông tin tài khoản." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("engo_token", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.json({ success: true, message: "Đã đăng xuất." });
});

app.delete("/api/auth/delete-me", requireLogin, async (req, res) => {
  try {
    const userId = req.user.userId;
    if (req.user.role === "admin") {
      const [countRows] = await pool.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'");
      if (Number(countRows[0].total) <= 1) {
        return res.status(400).json({ success: false, message: "Không thể xóa tài khoản quản trị viên duy nhất." });
      }
    }
    await pool.execute("DELETE FROM users WHERE id = ?", [userId]);
    res.clearCookie("engo_token", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return res.json({ success: true, message: "Đã xóa tài khoản thành công." });
  } catch (error) {
    console.error("Lỗi tự xóa tài khoản:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa tài khoản." });
  }
});

app.get("/api/admin/users", requireLogin, requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, full_name, email, role, class_name, status, created_at FROM users ORDER BY created_at DESC"
    );
    return res.json({ success: true, users: rows.map(publicUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách người dùng." });
  }
});

app.post("/api/admin/users", requireLogin, requireRole("admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { fullName, email, password, role, className, status = "active" } = req.body;
    if (!fullName || !email || !password || !["student", "teacher", "parent", "admin"].includes(role)) {
      return res.status(400).json({ success: false, message: "Thông tin tài khoản không hợp lệ." });
    }
    if (!["pending", "active", "locked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Email này đã tồn tại." });
    }

    const studentClass = role === "student" ? (String(className || "").trim() || null) : null;
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (full_name, email, password_hash, role, class_name, status) VALUES (?, ?, ?, ?, ?, ?)",
      [String(fullName).trim(), normalizedEmail, passwordHash, role, studentClass, status]
    );
    return res.status(201).json({ success: true, message: "Đã thêm tài khoản.", userId: result.insertId });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể thêm tài khoản." });
  }
});

app.patch("/api/admin/users/:id/status", requireLogin, requireRole("admin"), async (req, res) => {
  try {
    const { status } = req.body;
    if (!["pending", "active", "locked"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ." });
    }
    if (Number(req.params.id) === Number(req.user.userId) && status !== "active") {
      return res.status(400).json({ success: false, message: "Không thể khóa tài khoản đang đăng nhập." });
    }
    const [result] = await pool.execute("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    return res.json({ success: true, message: "Đã cập nhật trạng thái tài khoản." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật tài khoản." });
  }
});

app.delete("/api/admin/users/:id", requireLogin, requireRole("admin"), async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.userId)) {
      return res.status(400).json({ success: false, message: "Không thể tự xóa tài khoản đang đăng nhập." });
    }
    const [targetRows] = await pool.execute("SELECT role FROM users WHERE id = ? LIMIT 1", [req.params.id]);
    if (!targetRows.length) return res.status(404).json({ success: false, message: "Không tìm thấy tài khoản." });
    if (targetRows[0].role === "admin") {
      const [countRows] = await pool.execute("SELECT COUNT(*) AS total FROM users WHERE role = 'admin' AND status = 'active'");
      if (Number(countRows[0].total) <= 1) {
        return res.status(400).json({ success: false, message: "Không thể xóa quản trị viên hoạt động cuối cùng." });
      }
    }
    await pool.execute("DELETE FROM users WHERE id = ?", [req.params.id]);
    return res.json({ success: true, message: "Đã xóa tài khoản." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể xóa tài khoản." });
  }
});

app.post("/api/tests/import-docx", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    await assessmentReady;
    const { documentBase64, fileName = "de-kiem-tra.docx", title, className } = req.body;
    if (!documentBase64 || !String(documentBase64).startsWith("data:")) return res.status(400).json({ success: false, message: "File DOCX không hợp lệ." });
    const buffer = Buffer.from(String(documentBase64).split(",").pop(), "base64");
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ success: false, message: "File DOCX vượt quá 8 MB." });
    const extracted = await mammoth.extractRawText({ buffer });
    const test = parseDocxAssessment(extracted.value, String(title || fileName).replace(/\.docx$/i, ""));
    const assignedClass = String(className || "").trim() || null;
    const [result] = await pool.execute(
      "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.userId, test.title, String(fileName).slice(0, 255), assignedClass, JSON.stringify(test), JSON.stringify(test.summary)]
    );
    return res.status(201).json({ success: true, testId: result.insertId, title: test.title, className: assignedClass, summary: test.summary, message: "Đã tạo bài kiểm tra từ DOCX." });
  } catch (error) {
    console.error("DOCX import error:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể đọc cấu trúc đề DOCX." });
  }
});

app.get("/api/tests/latest", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    let query = "SELECT id, teacher_id, title, source_file_name, class_name, questions_json, summary_json, created_at FROM imported_tests";
    const params = [];

    if (req.user.role === "student") {
      const [uRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [req.user.userId]);
      const userClass = uRows[0]?.class_name;
      if (userClass) {
        query += " WHERE (class_name = ? OR class_name IS NULL OR class_name = '')";
        params.push(userClass);
      }
    }

    query += " ORDER BY created_at DESC LIMIT 20";
    const [rows] = await pool.execute(query, params);
    return res.json({ success: true, tests: rows.map(row => publicTest(getStoredTest(row))) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách bài kiểm tra." });
  }
});

app.get("/api/tests/:id", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute("SELECT id, teacher_id, title, source_file_name, class_name, questions_json, summary_json, created_at FROM imported_tests WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra." });
    return res.json({ success: true, test: publicTest(getStoredTest(rows[0])) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải bài kiểm tra." });
  }
});

app.post("/api/tests/:id/submissions", requireLogin, requireRole("student"), async (req, res) => {
  try {
    await assessmentReady;
    const { answers = {} } = req.body;
    const [rows] = await pool.execute("SELECT questions_json FROM imported_tests WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra." });
    const test = typeof rows[0].questions_json === "string" ? JSON.parse(rows[0].questions_json) : rows[0].questions_json;
    const objective = test.questions.filter(question => !question.manual);
    const manual = test.questions.filter(question => question.manual);
    let earned = 0;
    objective.forEach(question => {
      const value = answers[question.id];
      const correct = question.type === "multiple_choice" ? normalizeAnswer(value) === normalizeAnswer(question.answer) : (question.accepted || []).map(normalizeAnswer).includes(normalizeAnswer(value));
      if (correct) earned += Number(question.points || 0);
    });
    const objectiveMax = objective.reduce((sum, question) => sum + Number(question.points || 0), 0);
    const writingAnswers = Object.fromEntries(manual.map(question => [question.id, String(answers[question.id] || "").trim()]).filter(([, value]) => value));
    const status = Object.keys(writingAnswers).length ? "pending_manual" : "completed";
    await pool.execute(
      `INSERT INTO writing_submissions (test_id, student_id, objective_answers_json, writing_answers_json, objective_score, status)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE objective_answers_json = VALUES(objective_answers_json), writing_answers_json = VALUES(writing_answers_json), objective_score = VALUES(objective_score), manual_score = NULL, teacher_feedback = NULL, status = VALUES(status), submitted_at = CURRENT_TIMESTAMP, graded_at = NULL`,
      [req.params.id, req.user.userId, JSON.stringify(answers), JSON.stringify(writingAnswers), earned, status]
    );
    return res.json({ success: true, objectiveScore: earned, objectiveMax, status, message: status === "pending_manual" ? "Đã nộp bài. Phần Writing đang chờ giáo viên chấm." : "Đã nộp bài kiểm tra." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể nộp bài kiểm tra." });
  }
});

app.delete("/api/tests/:id", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const isTeacher = req.user.role === "teacher";
    const query = isTeacher
      ? "DELETE FROM imported_tests WHERE id = ? AND teacher_id = ?"
      : "DELETE FROM imported_tests WHERE id = ?";
    const params = isTeacher ? [req.params.id, req.user.userId] : [req.params.id];

    const [result] = await pool.execute(query, params);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra hoặc bạn không có quyền xóa." });
    }
    return res.json({ success: true, message: "Đã xóa bài kiểm tra thành công." });
  } catch (error) {
    console.error("Lỗi xóa bài kiểm tra:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa bài kiểm tra." });
  }
});

app.delete("/api/teacher/submissions/:id", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const [result] = await pool.execute("DELETE FROM writing_submissions WHERE id = ?", [req.params.id]);
    if (!result.affectedRows) {
      return res.status(404).json({ success: false, message: "Không tìm thấy bài nộp." });
    }
    return res.json({ success: true, message: "Đã xóa bài làm của học sinh." });
  } catch (error) {
    console.error("Lỗi xóa bài nộp:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa bài làm." });
  }
});

app.get("/api/student/results", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute(
      `SELECT 
        ws.id, ws.test_id, ws.objective_score, ws.manual_score, ws.teacher_feedback,
        ws.status, ws.submitted_at, ws.graded_at,
        ws.objective_answers_json, ws.writing_answers_json,
        it.title AS test_title, it.summary_json, it.questions_json,
        u.full_name AS teacher_name, stu.full_name AS student_name, stu.class_name AS student_class
       FROM writing_submissions ws
       JOIN imported_tests it ON it.id = ws.test_id
       LEFT JOIN users u ON u.id = it.teacher_id
       JOIN users stu ON stu.id = ws.student_id
       WHERE ws.student_id = ?
       ORDER BY ws.submitted_at DESC`,
      [req.user.userId]
    );

    let totalScoreSum = 0;
    let scoredCount = 0;
    let totalObjectiveEarned = 0;
    let totalObjectiveMax = 0;
    let pendingWriting = 0;

    const submissions = rows.map(row => {
      const summary = typeof row.summary_json === "string" ? JSON.parse(row.summary_json) : (row.summary_json || {});
      const objectiveScore = Number(row.objective_score || 0);
      const manualScore = row.manual_score !== null ? Number(row.manual_score) : null;
      const totalScore = manualScore !== null ? Number((objectiveScore + manualScore).toFixed(2)) : objectiveScore;
      const maxScore = Number(summary.totalPoints || 10);
      const scoreOnTen = maxScore > 0 ? Number((totalScore / maxScore * 10).toFixed(1)) : totalScore;
      const objectiveMax = Number(summary.objectiveCount ? summary.objectiveCount * 0.25 : 7.0);

      totalObjectiveEarned += objectiveScore;
      totalObjectiveMax += objectiveMax;

      if (row.status === "pending_manual") {
        pendingWriting++;
      }
      
      totalScoreSum += scoreOnTen;
      scoredCount++;

      return {
        id: row.id,
        testId: row.test_id,
        testTitle: row.test_title,
        teacherName: row.teacher_name || "Giáo viên",
        objectiveScore,
        objectiveMax,
        manualScore,
        totalScore,
        maxScore,
        scoreOnTen,
        teacherFeedback: row.teacher_feedback,
        status: row.status,
        submittedAt: row.submitted_at,
        gradedAt: row.graded_at,
        objectiveAnswers: typeof row.objective_answers_json === "string" ? JSON.parse(row.objective_answers_json) : row.objective_answers_json,
        writingAnswers: typeof row.writing_answers_json === "string" ? JSON.parse(row.writing_answers_json) : row.writing_answers_json,
      };
    });

    const avgScore = scoredCount > 0 ? Number((totalScoreSum / scoredCount).toFixed(1)) : 0;
    const accuracy = totalObjectiveMax > 0 ? Math.round((totalObjectiveEarned / totalObjectiveMax) * 100) : (scoredCount > 0 ? Math.round((avgScore / 10) * 100) : 0);

    return res.json({
      success: true,
      submissions,
      stats: {
        totalTests: submissions.length,
        avgScore,
        accuracy,
        pendingWriting
      }
    });
  } catch (error) {
    console.error("Lỗi lấy kết quả học tập của học sinh:", error);
    return res.status(500).json({ success: false, message: "Không thể tải kết quả học tập." });
  }
});

app.get("/api/teacher/results", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { className, testId } = req.query;
    let query = `
      SELECT 
        ws.id, ws.test_id, ws.student_id, ws.objective_score, ws.manual_score, 
        ws.teacher_feedback, ws.status, ws.submitted_at, ws.graded_at,
        ws.objective_answers_json, ws.writing_answers_json,
        u.full_name AS student_name, u.email AS student_email, u.class_name AS student_class,
        it.title AS test_title, it.class_name AS test_assigned_class, it.summary_json, it.questions_json
      FROM writing_submissions ws
      JOIN imported_tests it ON it.id = ws.test_id
      JOIN users u ON u.id = ws.student_id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role === "teacher") {
      query += " AND it.teacher_id = ?";
      params.push(req.user.userId);
    }
    if (className) {
      query += " AND u.class_name = ?";
      params.push(className);
    }
    if (testId) {
      query += " AND ws.test_id = ?";
      params.push(testId);
    }
    query += " ORDER BY ws.submitted_at DESC";

    const [rows] = await pool.execute(query, params);

    const submissions = rows.map(row => {
      const summary = typeof row.summary_json === "string" ? JSON.parse(row.summary_json) : (row.summary_json || {});
      const objectiveScore = Number(row.objective_score || 0);
      const manualScore = row.manual_score !== null ? Number(row.manual_score) : null;
      const totalScore = manualScore !== null ? Number((objectiveScore + manualScore).toFixed(2)) : objectiveScore;
      const maxScore = Number(summary.totalPoints || 10);
      const scoreOnTen = maxScore > 0 ? Number((totalScore / maxScore * 10).toFixed(1)) : totalScore;

      return {
        id: row.id,
        testId: row.test_id,
        testTitle: row.test_title,
        testAssignedClass: row.test_assigned_class,
        studentId: row.student_id,
        studentName: row.student_name,
        studentEmail: row.student_email,
        studentClass: row.student_class || "Chưa phân lớp",
        objectiveScore,
        manualScore,
        totalScore,
        maxScore,
        scoreOnTen,
        teacherFeedback: row.teacher_feedback,
        status: row.status,
        submittedAt: row.submitted_at,
        gradedAt: row.graded_at,
        objectiveAnswers: typeof row.objective_answers_json === "string" ? JSON.parse(row.objective_answers_json) : row.objective_answers_json,
        writingAnswers: typeof row.writing_answers_json === "string" ? JSON.parse(row.writing_answers_json) : row.writing_answers_json,
      };
    });

    return res.json({ success: true, submissions });
  } catch (error) {
    console.error("Lỗi lấy danh sách kết quả học tập:", error);
    return res.status(500).json({ success: false, message: "Không thể tải kết quả học tập." });
  }
});

app.get("/api/teacher/results/stats", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const isTeacher = req.user.role === "teacher";
    const teacherId = req.user.userId;

    const testCountQuery = isTeacher 
      ? "SELECT COUNT(*) AS totalTests FROM imported_tests WHERE teacher_id = ?"
      : "SELECT COUNT(*) AS totalTests FROM imported_tests";
    const [testCountRows] = await pool.execute(testCountQuery, isTeacher ? [teacherId] : []);

    const subQuery = isTeacher
      ? `SELECT ws.id, ws.objective_score, ws.manual_score, ws.status, u.class_name, it.summary_json
         FROM writing_submissions ws
         JOIN imported_tests it ON it.id = ws.test_id
         JOIN users u ON u.id = ws.student_id
         WHERE it.teacher_id = ?`
      : `SELECT ws.id, ws.objective_score, ws.manual_score, ws.status, u.class_name, it.summary_json
         FROM writing_submissions ws
         JOIN imported_tests it ON it.id = ws.test_id
         JOIN users u ON u.id = ws.student_id`;
    const [subRows] = await pool.execute(subQuery, isTeacher ? [teacherId] : []);

    const [studentRows] = await pool.execute("SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student' AND status = 'active'");

    const classStats = {};
    const defaultClasses = ["9A1", "9A2", "9A3", "9A4"];
    defaultClasses.forEach(c => {
      classStats[c] = { submissions: 0, totalScore10: 0, gradedCount: 0, pendingCount: 0 };
    });

    let pendingGrading = 0;
    let totalScoreSum = 0;
    let scoredCount = 0;

    subRows.forEach(row => {
      const cls = row.class_name || "Chưa phân lớp";
      if (!classStats[cls]) {
        classStats[cls] = { submissions: 0, totalScore10: 0, gradedCount: 0, pendingCount: 0 };
      }
      classStats[cls].submissions++;

      if (row.status === "pending_manual") {
        pendingGrading++;
        classStats[cls].pendingCount++;
      } else {
        classStats[cls].gradedCount++;
      }

      const summary = typeof row.summary_json === "string" ? JSON.parse(row.summary_json) : (row.summary_json || {});
      const max = Number(summary.totalPoints || 10);
      const totalRaw = Number(row.objective_score || 0) + (row.manual_score !== null ? Number(row.manual_score) : 0);
      const score10 = max > 0 ? (totalRaw / max * 10) : totalRaw;

      classStats[cls].totalScore10 += score10;
      totalScoreSum += score10;
      scoredCount++;
    });

    const classSummary = Object.keys(classStats).map(className => {
      const count = classStats[className].submissions;
      const avg = count > 0 ? Number((classStats[className].totalScore10 / count).toFixed(1)) : 0;
      return {
        className,
        submissions: count,
        avgScore: avg,
        pending: classStats[className].pendingCount,
        graded: classStats[className].gradedCount
      };
    });

    return res.json({
      success: true,
      stats: {
        totalTests: testCountRows[0]?.totalTests || 0,
        totalStudents: studentRows[0]?.totalStudents || 0,
        totalSubmissions: subRows.length,
        pendingGrading,
        avgScoreOverall: scoredCount > 0 ? Number((totalScoreSum / scoredCount).toFixed(1)) : 0,
        classSummary
      }
    });
  } catch (error) {
    console.error("Lỗi thống kê kết quả:", error);
    return res.status(500).json({ success: false, message: "Không thể tải thống kê." });
  }
});

app.get("/api/teacher/writing-submissions", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute(
      `SELECT ws.id, ws.test_id, ws.objective_score, ws.writing_answers_json, ws.manual_score, ws.teacher_feedback, ws.status, ws.submitted_at, ws.graded_at, u.full_name AS student_name, u.class_name AS student_class, it.title AS test_title
       FROM writing_submissions ws JOIN imported_tests it ON it.id = ws.test_id JOIN users u ON u.id = ws.student_id
       WHERE it.teacher_id = ? AND ws.status IN ('pending_manual', 'graded') ORDER BY ws.status = 'pending_manual' DESC, ws.submitted_at DESC`,
      [req.user.userId]
    );
    return res.json({ success: true, submissions: rows.map(row => ({ ...row, writingAnswers: typeof row.writing_answers_json === "string" ? JSON.parse(row.writing_answers_json) : row.writing_answers_json })) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải hàng đợi Writing." });
  }
});

app.patch("/api/teacher/writing-submissions/:id", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    await assessmentReady;
    const score = Number(req.body.score);
    const feedback = String(req.body.feedback || "").trim();
    if (!Number.isFinite(score) || score < 0 || score > 3) return res.status(400).json({ success: false, message: "Điểm Writing phải nằm trong khoảng 0–3." });
    const [result] = await pool.execute(
      `UPDATE writing_submissions ws JOIN imported_tests it ON it.id = ws.test_id SET ws.manual_score = ?, ws.teacher_feedback = ?, ws.status = 'graded', ws.graded_at = CURRENT_TIMESTAMP WHERE ws.id = ? AND it.teacher_id = ?`,
      [score, feedback, req.params.id, req.user.userId]
    );
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy bài nộp Writing." });
    return res.json({ success: true, message: "Đã chấm phần Writing." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể lưu điểm Writing." });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Website đang chạy tại http://localhost:${port}`);
  console.log(`Kiểm tra MySQL tại http://localhost:${port}/api/health`);
});
