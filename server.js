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
  await pool.query(`CREATE TABLE IF NOT EXISTS imported_tests (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    teacher_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(255) NOT NULL,
    source_file_name VARCHAR(255) NOT NULL,
    questions_json JSON NOT NULL,
    summary_json JSON NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_imported_tests_created_at (created_at),
    CONSTRAINT fk_imported_tests_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  await pool.query(`CREATE TABLE IF NOT EXISTS writing_submissions (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    test_id BIGINT UNSIGNED NOT NULL,
    student_id BIGINT UNSIGNED NOT NULL,
    objective_answers_json JSON NOT NULL,
    writing_answers_json JSON NOT NULL,
    objective_score DECIMAL(5,2) NOT NULL DEFAULT 0,
    manual_score DECIMAL(5,2) NULL,
    teacher_feedback TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_manual',
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    graded_at TIMESTAMP NULL,
    UNIQUE KEY uq_writing_submission (test_id, student_id),
    INDEX idx_writing_status (status),
    CONSTRAINT fk_writing_test FOREIGN KEY (test_id) REFERENCES imported_tests(id) ON DELETE CASCADE,
    CONSTRAINT fk_writing_student FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
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
    createdAt: test.created_at,
    summary: typeof test.summary_json === "string" ? JSON.parse(test.summary_json) : test.summary_json,
    sections: test.questions.sections.map(section => ({
      name: section.name,
      questions: section.questions.map(({ answer, accepted, referenceAnswer, ...question }) => question),
    })),
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
    const { fullName, email, password, role = "student" } = req.body;
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

    const passwordHash = await bcrypt.hash(password, 12);
    const status = role === "teacher" ? "pending" : "active";
    const [result] = await pool.execute(
      "INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
      [String(fullName).trim(), normalizedEmail, passwordHash, role, status]
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
      "SELECT id, full_name, email, password_hash, role, status, created_at FROM users WHERE email = ? AND role = ? LIMIT 1",
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
      "SELECT id, full_name, email, role, status, created_at FROM users WHERE id = ? LIMIT 1",
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

app.get("/api/admin/users", requireLogin, requireRole("admin"), async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT id, full_name, email, role, status, created_at FROM users ORDER BY created_at DESC"
    );
    return res.json({ success: true, users: rows.map(publicUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách người dùng." });
  }
});

app.post("/api/admin/users", requireLogin, requireRole("admin"), async (req, res) => {
  try {
    const { fullName, email, password, role, status = "active" } = req.body;
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

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.execute(
      "INSERT INTO users (full_name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?)",
      [String(fullName).trim(), normalizedEmail, passwordHash, role, status]
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
    const { documentBase64, fileName = "de-kiem-tra.docx", title } = req.body;
    if (!documentBase64 || !String(documentBase64).startsWith("data:")) return res.status(400).json({ success: false, message: "File DOCX không hợp lệ." });
    const buffer = Buffer.from(String(documentBase64).split(",").pop(), "base64");
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ success: false, message: "File DOCX vượt quá 8 MB." });
    const extracted = await mammoth.extractRawText({ buffer });
    const test = parseDocxAssessment(extracted.value, String(title || fileName).replace(/\.docx$/i, ""));
    const [result] = await pool.execute(
      "INSERT INTO imported_tests (teacher_id, title, source_file_name, questions_json, summary_json) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, test.title, String(fileName).slice(0, 255), JSON.stringify(test), JSON.stringify(test.summary)]
    );
    return res.status(201).json({ success: true, testId: result.insertId, title: test.title, summary: test.summary, message: "Đã tạo bài kiểm tra từ DOCX." });
  } catch (error) {
    console.error("DOCX import error:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể đọc cấu trúc đề DOCX." });
  }
});

app.get("/api/tests/latest", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute("SELECT id, title, source_file_name, questions_json, summary_json, created_at FROM imported_tests ORDER BY created_at DESC LIMIT 12");
    return res.json({ success: true, tests: rows.map(row => publicTest(getStoredTest(row))) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách bài kiểm tra." });
  }
});

app.get("/api/tests/:id", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute("SELECT id, title, source_file_name, questions_json, summary_json, created_at FROM imported_tests WHERE id = ? LIMIT 1", [req.params.id]);
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

app.get("/api/teacher/writing-submissions", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute(
      `SELECT ws.id, ws.test_id, ws.objective_score, ws.writing_answers_json, ws.manual_score, ws.teacher_feedback, ws.status, ws.submitted_at, ws.graded_at, u.full_name AS student_name, it.title AS test_title
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
