require("dotenv").config();

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");
const https = require("https");
const dns = require("dns").promises;
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const mammoth = require("mammoth");

const pool = require("./database/db");
const { parseDocxAssessment } = require("./services/docx-assessment-parser");
const aiService = require("./services/ai-service");
const speakingScorer = require("./services/speaking-scorer");
const { extractDocumentText } = require("./services/document-text");
const progressService = require("./services/progress");
const unitsData = require("./services/units-data");

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

const schemaErrors = new Set();
function logSchemaError(e) {
  const msg = String(e && e.message || e);
  if (/Duplicate column|already exists|check that column.key exists|Unknown column 'password'/i.test(msg)) return; // migration đã áp dụng
  if (schemaErrors.has(msg)) return;
  schemaErrors.add(msg);
  console.warn("[DB SCHEMA] " + msg);
  if (/command denied/i.test(msg) && !schemaErrors.has("__hint")) {
    schemaErrors.add("__hint");
    console.warn("[DB SCHEMA] Tài khoản MySQL thiếu quyền CREATE/ALTER. Hãy chạy bằng root:  mysql -u root -p < database/migrate-v2.sql");
  }
}

async function ensureAssessmentTables() {
  // 1. Tạo bảng users nếu chưa có
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'student',
        class_name VARCHAR(50) NULL,
        parent_student_id BIGINT UNSIGNED NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_users_email (email),
        INDEX idx_users_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 2. Tạo bảng imported_tests nếu chưa có
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS imported_tests (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        teacher_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        source_file_name VARCHAR(255) NOT NULL,
        class_name VARCHAR(50) NULL,
        questions_json JSON NOT NULL,
        summary_json JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_imported_tests_created_at (created_at),
        INDEX idx_imported_tests_class (class_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 3. Tạo bảng writing_submissions nếu chưa có
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS writing_submissions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        test_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        objective_answers_json JSON NOT NULL,
        writing_answers_json JSON NOT NULL,
        objective_score DECIMAL(5,2) NOT NULL DEFAULT 0,
        manual_score DECIMAL(5,2) NULL,
        teacher_feedback TEXT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending_manual',
        tab_violations INT NOT NULL DEFAULT 0,
        violation_penalty DECIMAL(5,2) NOT NULL DEFAULT 0,
        is_forced_submit TINYINT(1) NOT NULL DEFAULT 0,
        submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        graded_at TIMESTAMP NULL,
        UNIQUE KEY uq_writing_submission (test_id, student_id),
        INDEX idx_writing_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 4. Tạo bảng speaking_assignments nếu chưa có
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS speaking_assignments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        teacher_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        class_name VARCHAR(50) NULL,
        sentence TEXT NOT NULL,
        ipa VARCHAR(255) NULL,
        translation TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_speaking_teacher (teacher_id),
        INDEX idx_speaking_class (class_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 5. Tạo bảng speaking_submissions nếu chưa có
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS speaking_submissions (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        assignment_id BIGINT UNSIGNED NOT NULL,
        student_id BIGINT UNSIGNED NOT NULL,
        accuracy_percent INT NOT NULL DEFAULT 0,
        spoken_transcript TEXT NULL,
        submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_speaking_sub (assignment_id, student_id),
        INDEX idx_speaking_sub_student (student_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 6. Bảng lịch sử từng lượt luyện nói (theo dõi tiến bộ theo giai đoạn)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS speaking_attempts (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        assignment_id BIGINT UNSIGNED NULL,
        stage TINYINT NOT NULL DEFAULT 1,
        item_index INT NOT NULL DEFAULT 0,
        context VARCHAR(20) NOT NULL DEFAULT 'practice',
        target_text TEXT NOT NULL,
        transcript TEXT NULL,
        accuracy INT NOT NULL DEFAULT 0,
        errors_json JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_spk_att_student (student_id, created_at),
        INDEX idx_spk_att_assignment (assignment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 7. Nhật ký kết quả học tập tổng hợp (test / speaking / vocab / healing) của từng học sinh
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS learning_events (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        student_id BIGINT UNSIGNED NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        ref_id VARCHAR(64) NULL,
        title VARCHAR(255) NULL,
        score DECIMAL(6,2) NULL,
        max_score DECIMAL(6,2) NULL,
        meta_json JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_le_student (student_id, created_at),
        INDEX idx_le_type (event_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 8. Ma trận đề kiểm tra do giáo viên upload (PDF/DOCX -> JSON)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_matrices (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        teacher_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        source_file_name VARCHAR(255) NULL,
        matrix_json JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_matrix_teacher (teacher_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 9. Phân loại lớp: tăng cường (advanced) / thường (regular)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS class_settings (
        class_name VARCHAR(50) NOT NULL PRIMARY KEY,
        tier VARCHAR(20) NOT NULL DEFAULT 'regular',
        updated_by BIGINT UNSIGNED NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (e) { logSchemaError(e); }

  // 10. Migration: cột mới cho luyện nói nhiều giai đoạn, phân tích độ khó đề và điểm speaking trong bài kiểm tra
  try { await pool.query("ALTER TABLE speaking_assignments ADD COLUMN stage TINYINT NOT NULL DEFAULT 1"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_assignments ADD COLUMN items_json JSON NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_assignments ADD COLUMN unit_title VARCHAR(255) NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_assignments ADD COLUMN source_file_name VARCHAR(255) NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_assignments MODIFY COLUMN ipa TEXT NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_submissions ADD COLUMN items_result_json JSON NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_submissions ADD COLUMN attempts INT NOT NULL DEFAULT 1"); } catch (e) {}
  try { await pool.query("ALTER TABLE speaking_submissions ADD COLUMN best_accuracy INT NOT NULL DEFAULT 0"); } catch (e) {}
  try { await pool.query("ALTER TABLE imported_tests ADD COLUMN matrix_id BIGINT UNSIGNED NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE imported_tests ADD COLUMN analysis_json JSON NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE imported_tests ADD COLUMN duration_minutes INT NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE imported_tests ADD COLUMN test_type VARCHAR(10) NOT NULL DEFAULT 'kttx'"); } catch (e) {}
  try { await pool.query("ALTER TABLE imported_tests ADD COLUMN semester TINYINT NOT NULL DEFAULT 1"); } catch (e) {}
  try { await pool.query("ALTER TABLE imported_tests ADD COLUMN unit_no INT NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN speaking_answers_json JSON NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN speaking_score DECIMAL(5,2) NOT NULL DEFAULT 0"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN objective_max DECIMAL(5,2) NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN variant VARCHAR(20) NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN time_spent_seconds INT NULL"); } catch (e) {}

  // 11. Migration: Bổ sung các cột nếu bảng đã tồn tại từ trước
  try { await pool.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE users MODIFY COLUMN password VARCHAR(255) NULL DEFAULT NULL"); } catch (e) {}
  try { await pool.query("UPDATE users SET password_hash = password WHERE (password_hash IS NULL OR password_hash = '') AND password IS NOT NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN tab_violations INT NOT NULL DEFAULT 0"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN violation_penalty DECIMAL(5,2) NOT NULL DEFAULT 0"); } catch (e) {}
  try { await pool.query("ALTER TABLE writing_submissions ADD COLUMN is_forced_submit TINYINT(1) NOT NULL DEFAULT 0"); } catch (e) {}
  try { await pool.query("ALTER TABLE users ADD COLUMN parent_student_id BIGINT UNSIGNED NULL"); } catch (e) {}
  try { await pool.query("ALTER TABLE users ADD COLUMN class_name VARCHAR(50) NULL"); } catch (e) {}

  // 5. Nếu bảng users hoàn toàn trống, tự tạo tài khoản Admin và Giáo viên mẫu để dùng ngay
  try {
    const [userRows] = await pool.query("SELECT COUNT(*) AS total FROM users");
    if (userRows && userRows[0] && userRows[0].total === 0) {
      const defaultHash = await bcrypt.hash("123456", 12);
      await pool.query(
        `INSERT INTO users (full_name, email, password_hash, role, status) VALUES 
         ('Quản Trị Viên', 'admin@engo.edu.vn', ?, 'admin', 'active'),
         ('Cô Nguyễn Lan Hương', 'teacher@engo.edu.vn', ?, 'teacher', 'active')`,
        [defaultHash, defaultHash]
      );
      console.log("[DB] Đã khởi tạo tài khoản mặc định (admin@engo.edu.vn / 123456).");
    }
  } catch (e) { logSchemaError(e); }

  // 12. Khởi tạo 13 lớp 9A1..9A13 trong bảng phân loại (chỉ chèn lớp chưa có; GV đổi lại trong "Phân loại lớp")
  try {
    const values = DEFAULT_CLASSES.map(c => [c, ["9A5", "9A6"].includes(c) ? "advanced" : "regular"]);
    await pool.query("INSERT IGNORE INTO class_settings (class_name, tier) VALUES " + values.map(() => "(?, ?)").join(", "), values.flat());
  } catch (e) { logSchemaError(e); }

  await syncSubmissionColumns();
}

let tableCols = {
  tab_violations: false,
  violation_penalty: false,
  is_forced_submit: false
};

// Bộ nhớ cột hiện có của từng bảng -> server chạy được cả khi CSDL chưa migrate đủ cột
const schemaCols = {};
async function syncSubmissionColumns() {
  for (const table of ["writing_submissions", "imported_tests", "speaking_assignments", "speaking_submissions"]) {
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM " + table);
      schemaCols[table] = new Set(cols.map(c => c.Field));
    } catch (e) {
      schemaCols[table] = new Set();
    }
  }
  const ws = schemaCols.writing_submissions;
  tableCols.tab_violations = ws.has("tab_violations");
  tableCols.violation_penalty = ws.has("violation_penalty");
  tableCols.is_forced_submit = ws.has("is_forced_submit");
}
// Làm mới cache cột mỗi 60s để server nhận cột mới ngay sau khi migrate, không cần restart
setInterval(() => { syncSubmissionColumns().catch(() => {}); progressService.invalidateColumnCache(); }, 60000).unref();
function hasCol(table, col) { return Boolean(schemaCols[table] && schemaCols[table].has(col)); }
// Trả về "alias.col" nếu cột tồn tại, ngược lại "NULL AS col" (hoặc giá trị mặc định)
function optCol(table, alias, col, def = "NULL") { return hasCol(table, col) ? `${alias}.${col}` : `${def} AS ${col}`; }
function optCols(table, alias, cols) { return cols.map(c => optCol(table, alias, c)).join(", "); }

function getViolationSelectCols() {
  const tabCol = tableCols.tab_violations ? "ws.tab_violations" : "0 AS tab_violations";
  const penaltyCol = tableCols.violation_penalty ? "ws.violation_penalty" : "0 AS violation_penalty";
  const forcedCol = tableCols.is_forced_submit ? "ws.is_forced_submit" : "0 AS is_forced_submit";
  return `${tabCol}, ${penaltyCol}, ${forcedCol}`;
}

const assessmentReady = ensureAssessmentTables()
  .then(() => true)
  .catch(error => { console.error("Assessment tables unavailable:", error); return false; });


function normalizeAnswer(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function getStoredTest(row) {
  const questions = typeof row.questions_json === "string" ? JSON.parse(row.questions_json) : row.questions_json;
  const out = { ...row, questions };
  // Khi CSDL chưa có cột analysis_json, phân tích được nhúng trong questions_json
  if ((out.analysis_json === null || out.analysis_json === undefined) && questions && questions.analysis) out.analysis_json = questions.analysis;
  return out;
}

function parseJsonField(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

// 13 lớp mặc định của khối 9 (9A1 -> 9A13); giáo viên có thể thêm lớp khác trong "Phân loại lớp"
const DEFAULT_CLASSES = Array.from({ length: 13 }, (_, i) => `9A${i + 1}`);
const DEFAULT_TIERS = {
  advanced: { label: "Lớp tăng cường", easy: 25, medium: 35, hard: 40, timeFactor: 0.9 },
  regular: { label: "Lớp thường", easy: 45, medium: 35, hard: 20, timeFactor: 1.1 }
};

// Lấy phân loại lớp (advanced / regular). Lớp chưa cấu hình -> null (nhận đề đầy đủ)
async function getClassTier(className) {
  if (!className) return null;
  try {
    const [rows] = await pool.execute("SELECT tier FROM class_settings WHERE class_name = ? LIMIT 1", [className]);
    return rows.length ? rows[0].tier : null;
  } catch (e) { return null; }
}

// Xây dựng 2 biến thể đề (nâng cao / cơ bản) từ phân tích độ khó + ma trận
function buildTestVariants(questions, analysis, matrix) {
  const tiers = matrix && matrix.tiers ? matrix.tiers : DEFAULT_TIERS;
  const ids = questions.map(q => q.id);
  const objective = questions.filter(q => !q.manual && q.type !== "speaking");
  const byDifficulty = { easy: [], medium: [], hard: [] };
  objective.forEach(q => {
    const d = analysis[q.id]?.difficulty || "medium";
    byDifficulty[d].push(q.id);
  });
  const total = objective.length;
  const keepFor = (tier) => {
    if (!tier) return ids;
    const hardAllowed = Math.max(1, Math.round((Number(tier.hard) / 100) * total));
    const mediumAllowed = Math.max(1, Math.round(((Number(tier.hard) + Number(tier.medium)) / 100) * total)) - Math.min(hardAllowed, byDifficulty.hard.length);
    const dropHard = new Set(byDifficulty.hard.slice(hardAllowed));
    const dropMedium = new Set(byDifficulty.medium.slice(Math.max(mediumAllowed, Math.ceil(byDifficulty.medium.length * 0.6))));
    return ids.filter(id => !dropHard.has(id) && !dropMedium.has(id));
  };
  const sumSeconds = (list) => list.reduce((s, id) => s + Number(analysis[id]?.seconds || 45), 0);
  const fullSeconds = sumSeconds(ids);
  const regularIds = keepFor(tiers.regular);
  return {
    full: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil(fullSeconds / 60)) },
    advanced: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil((fullSeconds * Number(tiers.advanced.timeFactor || 0.9)) / 60)) },
    regular: { questionIds: regularIds, durationMinutes: Math.max(10, Math.ceil((sumSeconds(regularIds) * Number(tiers.regular.timeFactor || 1.1)) / 60)) },
    counts: { easy: byDifficulty.easy.length, medium: byDifficulty.medium.length, hard: byDifficulty.hard.length }
  };
}

function resolveVariantName(tier, analysis) {
  if (!analysis || !analysis.variants) return "full";
  if (tier === "regular") return "regular";
  if (tier === "advanced") return "advanced";
  return "full";
}

function variantQuestions(test, variantName) {
  const analysis = parseJsonField(test.analysis_json, null);
  const all = test.questions && test.questions.questions ? test.questions.questions : [];
  if (!analysis || !analysis.variants || !analysis.variants[variantName]) return all;
  const allowed = new Set(analysis.variants[variantName].questionIds);
  return all.filter(q => allowed.has(q.id));
}

function publicTest(test, { variantName = "full", includeAnswers = false } = {}) {
  const analysis = parseJsonField(test.analysis_json, null);
  const summary = parseJsonField(test.summary_json, {});
  const questions = variantQuestions(test, variantName);
  const perQuestion = analysis && analysis.perQuestion ? analysis.perQuestion : {};
  const decorate = (question) => {
    const { answer, accepted, referenceAnswer, ...rest } = question;
    const info = perQuestion[question.id] || {};
    const out = { ...rest, difficulty: info.difficulty || "medium", suggestedSeconds: info.seconds || 45 };
    if (includeAnswers) { out.answer = answer; out.accepted = accepted; out.referenceAnswer = referenceAnswer; }
    return out;
  };
  const sectionNames = ["Phonetics", "Grammar and Vocabulary", "Reading", "Writing", "Speaking"];
  const sections = sectionNames
    .map(name => ({ name, questions: questions.filter(q => q.section === name).map(decorate) }))
    .filter(section => section.questions.length);
  const variantInfo = analysis && analysis.variants && analysis.variants[variantName] ? analysis.variants[variantName] : null;
  const objectivePoints = questions.filter(q => !q.manual).reduce((s, q) => s + Number(q.points || 0), 0);
  const totalPoints = questions.reduce((s, q) => s + Number(q.points || 0), 0);
  return {
    id: test.id,
    title: test.title,
    sourceFileName: test.source_file_name,
    className: test.class_name || null,
    createdAt: test.created_at,
    matrixId: test.matrix_id || null,
    testType: test.test_type || "kttx",
    semester: Number(test.semester) || 1,
    unitNo: test.unit_no !== null && test.unit_no !== undefined ? Number(test.unit_no) : null,
    variant: variantName,
    durationMinutes: variantInfo ? variantInfo.durationMinutes : (test.duration_minutes || 45),
    difficultyCounts: analysis && analysis.variants ? analysis.variants.counts : null,
    summary: {
      ...summary,
      questionCount: questions.length,
      objectiveCount: questions.filter(q => !q.manual && q.type !== "speaking").length,
      manualCount: questions.filter(q => q.manual).length,
      speakingCount: questions.filter(q => q.type === "speaking").length,
      objectivePoints: Number(objectivePoints.toFixed(2)),
      totalPoints: Number(totalPoints.toFixed(2))
    },
    sections,
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

app.get("/api/tts", (req, res) => {
  const text = (req.query.text || "").trim();
  const lang = (req.query.lang || "vi").trim();
  if (!text) {
    return res.status(400).send("Text is required");
  }
  const cleanText = text.replace(/[\u{1F300}-\u{1FAFF}]|[\u{2600}-\u{27BF}]/gu, '').replace(/[()]/g, ' ').trim().slice(0, 300);
  const targetUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(cleanText)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

  const ttsReq = https.get(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (ttsRes) => {
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    ttsRes.pipe(res);
  });

  ttsReq.on("error", (err) => {
    console.error("TTS proxy error:", err);
    res.status(500).send("TTS Error");
  });
});

const DISPOSABLE_EMAIL_DOMAINS = new Set([
  "tempmail.com", "10minutemail.com", "mailinator.com", "guerrillamail.com",
  "yopmail.com", "sharklasers.com", "trashmail.com", "getairmail.com",
  "dispostable.com", "burnermail.io", "fakeinbox.com", "temp-mail.org",
  "throwawaymail.com", "getnada.com", "fakemailgenerator.com", "mohmal.com",
  "crazymailing.com", "tempail.com", "emailondeck.com", "maildrop.cc"
]);

// Cấu hình API Key kiểm tra email thực tế (AbstractAPI, Hunter.io, ZeroBounce...)
// Bạn có thể đăng ký miễn phí tại https://www.abstractapi.com/api/email-verification-validation-api hoặc https://hunter.io
const ABSTRACT_EMAIL_API_KEY = process.env.ABSTRACT_EMAIL_API_KEY || "";
const HUNTER_EMAIL_API_KEY = process.env.HUNTER_EMAIL_API_KEY || "";

function isGibberishUsername(username) {
  const u = String(username || "").toLowerCase();
  // 1. Quá nhiều phụ âm liên tiếp không thể phát âm (>= 5 phụ âm)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(u)) return true;
  
  // 2. Tỉ lệ nguyên âm bất thường với tên dài
  const lettersOnly = u.replace(/[^a-z]/g, "");
  if (lettersOnly.length >= 7) {
    const vowels = (lettersOnly.match(/[aeiou]/g) || []).length;
    const vowelRatio = vowels / lettersOnly.length;
    if (vowelRatio < 0.15) return true;
  }

  // 3. Các chuỗi gõ phím ngẫu nhiên / bàn phím mashing phổ biến (như aksjodajodw, asdfgh, etc.)
  const spamPatterns = [
    "asdf", "dfgh", "ghjk", "hjkl", "jkl;", "qwerty", "werty", "ertyu", "rtyui", "tyuio",
    "zxcv", "xcvb", "cvbn", "vbnm", "aksj", "sjod", "joda", "jodw", "odaw", "dajo", "ajod",
    "12345", "23456", "34567", "45678", "56789", "aaaaa", "bbbbb", "ccccc", "ddddd"
  ];
  let spamCount = 0;
  for (const pat of spamPatterns) {
    if (u.includes(pat)) {
      spamCount++;
      if (pat.length >= 5 || spamCount >= 2) return true;
    }
  }
  return false;
}

async function verifyEmailWithAPI(email) {
  // 1. Kiểm tra qua AbstractAPI nếu đã cấu hình key
  if (ABSTRACT_EMAIL_API_KEY) {
    try {
      const res = await fetch(`https://emailvalidation.abstractapi.com/v1/?api_key=${ABSTRACT_EMAIL_API_KEY}&email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.deliverability === "UNDELIVERABLE" || data.is_smtp_valid?.value === false) {
          return { valid: false, reason: "Hộp thư Gmail này không tồn tại trên hệ thống của Google." };
        }
        if (data.deliverability === "DELIVERABLE" && data.is_smtp_valid?.value === true) {
          return { valid: true, domain: email.split("@")[1], isGmail: email.includes("gmail"), provider: "AbstractAPI" };
        }
      }
    } catch (e) {
      console.warn("[EmailAPI] AbstractAPI check failed:", e.message);
    }
  }

  // 2. Kiểm tra qua Hunter.io nếu đã cấu hình key
  if (HUNTER_EMAIL_API_KEY) {
    try {
      const res = await fetch(`https://api.hunter.io/v2/email-verifier?email=${encodeURIComponent(email)}&api_key=${HUNTER_EMAIL_API_KEY}`);
      if (res.ok) {
        const data = await res.json();
        if (data.data?.result === "undeliverable") {
          return { valid: false, reason: "Địa chỉ email này không tồn tại trên hệ thống máy chủ." };
        }
        if (data.data?.result === "deliverable") {
          return { valid: true, domain: email.split("@")[1], isGmail: email.includes("gmail"), provider: "Hunter.io" };
        }
      }
    } catch (e) {
      console.warn("[EmailAPI] Hunter.io check failed:", e.message);
    }
  }

  return null; // Không có API key hoặc API bận -> chuyển sang kiểm tra DNS MX + heuristic
}

async function verifyEmailAddress(email) {
  const trimmed = String(email || "").trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!trimmed || !emailRegex.test(trimmed)) {
    return { valid: false, reason: "Định dạng email không hợp lệ (ví dụ đúng: student@gmail.com)." };
  }

  const [username, domain] = trimmed.split("@");
  if (!username || !domain) {
    return { valid: false, reason: "Email thiếu tên người dùng hoặc tên miền." };
  }

  // Chặn email tạm thời / rác
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return { valid: false, reason: "Không được sử dụng email tạm thời / email rác để đăng ký." };
  }

  // Kiểm tra cú pháp chuẩn riêng của Gmail
  if (domain === "gmail.com" || domain === "googlemail.com") {
    if (username.length < 6 || username.length > 30) {
      return { valid: false, reason: "Tên tài khoản Gmail phải có độ dài từ 6 đến 30 ký tự." };
    }
    if (!/^[a-z0-9.]+$/.test(username)) {
      return { valid: false, reason: "Tên tài khoản Gmail chỉ được chứa chữ cái (a-z), số (0-9) và dấu chấm (.)." };
    }
    if (username.startsWith(".") || username.endsWith(".") || username.includes("..")) {
      return { valid: false, reason: "Tên tài khoản Gmail không được bắt đầu, kết thúc bằng dấu chấm hoặc chứa 2 dấu chấm liên tiếp." };
    }
    // Chặn tên tài khoản gõ bàn phím rác ngẫu nhiên (aksjodajodw, asdfgh...)
    if (isGibberishUsername(username)) {
      return { valid: false, reason: "Tên email có dạng gõ phím ngẫu nhiên / không có thật. Vui lòng nhập email thật." };
    }
  }

  // 1. Kiểm tra trực tiếp qua Email Validation API bên thứ 3 (nếu có key)
  const apiResult = await verifyEmailWithAPI(trimmed);
  if (apiResult !== null) {
    return apiResult;
  }

  // 2. Tra cứu bản ghi MX thực tế qua DNS
  try {
    const mxRecords = await dns.resolveMx(domain);
    if (!mxRecords || mxRecords.length === 0) {
      return { valid: false, reason: `Tên miền @${domain} không có máy chủ nhận email (MX record).` };
    }
    return {
      valid: true,
      domain,
      isGmail: domain === "gmail.com" || domain === "googlemail.com",
      mxHost: mxRecords[0].exchange
    };
  } catch (err) {
    // Dự phòng cho các tên miền phổ biến nếu mất mạng tạm thời
    if (["gmail.com", "googlemail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com", "edu.vn"].includes(domain)) {
      return { valid: true, domain, isGmail: domain.includes("gmail"), isFallback: true };
    }
    return { valid: false, reason: `Tên miền @${domain} không tồn tại trên hệ thống máy chủ thư (${err.code || "ENOTFOUND"}).` };
  }
}

// Hàm mã hóa an toàn HTML
function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Bộ nhớ lưu mã OTP tạm thời: email -> { otp, expiresAt, attempts }
const emailOtpStore = new Map();
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

async function sendEmailOTP(recipientEmail, fullName, otpCode) {
  const brandName = "ENGO Learning Hub";
  const htmlContent = `
    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
      <div style="background:linear-gradient(135deg,#4f46e5,#3b82f6);padding:32px 24px;text-align:center;color:#ffffff">
        <h1 style="margin:0;font-size:26px;font-weight:800;letter-spacing:-0.5px">ENGO Learning Hub</h1>
        <p style="margin:8px 0 0;font-size:14px;color:#e0e7ff">Hệ thống học và kiểm tra tiếng Anh thông minh</p>
      </div>
      <div style="padding:32px 28px;color:#1e293b">
        <h2 style="margin-top:0;font-size:20px;color:#0f172a">Xác thực tài khoản của bạn</h2>
        <p style="font-size:15px;line-height:1.6;color:#475569">
          Xin chào <strong>${escapeHTML(fullName || "bạn")}</strong>,<br>
          Bạn vừa yêu cầu đăng ký tài khoản tại <strong>ENGO Learning Hub</strong>. Vui lòng sử dụng mã xác nhận (OTP) 6 chữ số dưới đây để kích hoạt tài khoản:
        </p>
        
        <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:20px;text-align:center;margin:24px 0">
          <span style="font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1px;font-weight:700;display:block;margin-bottom:8px">Mã xác thực của bạn</span>
          <div style="font-size:36px;font-weight:900;letter-spacing:10px;color:#4f46e5;font-family:monospace">${otpCode}</div>
          <span style="font-size:12px;color:#94a3b8;display:block;margin-top:8px">⏱ Mã có hiệu lực trong vòng 5 phút</span>
        </div>

        <p style="font-size:13px;color:#64748b;line-height:1.5">
          ⚠️ <em>Lưu ý: Không chia sẻ mã này cho bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</em>
        </p>
      </div>
      <div style="background:#f1f5f9;padding:16px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0">
        © 2026 ENGO Learning Hub · Hotline hỗ trợ học sinh: 1900 6868
      </div>
    </div>
  `;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "ENGO Learning Hub <onboarding@resend.dev>",
        to: [recipientEmail],
        subject: `[ENGO] ${otpCode} là mã xác thực đăng ký tài khoản của bạn`,
        html: htmlContent
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn("[Resend Notice]:", data.message || data);
      // Ghi log mã OTP cho môi trường thử nghiệm
      console.log(`[ENGO OTP DEV] Mã OTP gửi tới ${recipientEmail}: ${otpCode}`);
    }
    return { success: true, resendId: data.id };
  } catch (err) {
    console.error("[Email OTP Send Error]:", err.message);
    console.log(`[ENGO OTP DEV FALLBACK] Mã OTP gửi tới ${recipientEmail}: ${otpCode}`);
    return { success: true, fallback: true };
  }
}

// API Gửi mã OTP xác minh qua Email
app.post("/api/auth/send-otp", async (req, res) => {
  try {
    await assessmentReady;
    const { email, fullName } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Vui lòng cung cấp địa chỉ email." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // 1. Kiểm tra tính hợp lệ cú pháp và máy chủ thư
    const emailCheck = await verifyEmailAddress(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.reason });
    }

    // 2. Kiểm tra xem email đã được đăng ký trong database chưa
    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Email này đã được đăng ký tài khoản trên hệ thống." });
    }

    // 3. Tạo mã OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 phút

    emailOtpStore.set(normalizedEmail, { otp, expiresAt, attempts: 0 });

    // 4. Gửi email qua Resend
    const sendResult = await sendEmailOTP(normalizedEmail, fullName, otp);

    const isDirectRecipient = normalizedEmail === "khoa1029384756@gmail.com";
    const devHint = isDirectRecipient 
      ? `Đã gửi mã xác nhận 6 số đến hộp thư ${normalizedEmail}. Vui lòng kiểm tra hộp thư đến (hoặc thư rác/spam).`
      : `Đã gửi mã xác nhận! [Mã OTP của bạn: ${otp}]. (Mã cũng đã được ghi nhận an toàn trên hệ thống).`;

    return res.json({
      success: true,
      message: devHint,
      devOtp: otp,
      expiresInSeconds: 300
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Lỗi hệ thống khi gửi mã xác thực: " + err.message });
  }
});

// API Kiểm tra tính hợp lệ và tồn tại của email
app.get("/api/auth/verify-email", async (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.status(400).json({ success: false, valid: false, message: "Vui lòng cung cấp email cần kiểm tra." });
  }
  const checkResult = await verifyEmailAddress(email);
  return res.json({
    success: true,
    valid: checkResult.valid,
    message: checkResult.valid ? "Email hợp lệ và có máy chủ thư điện tử (MX) hoạt động thật." : checkResult.reason,
    details: checkResult
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    await assessmentReady;
    const { fullName, email, password, role = "student", className, otp } = req.body;
    if (!fullName || !email || !password) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập đầy đủ thông tin." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }
    if (role === "parent") {
      return res.status(400).json({ success: false, message: "Tài khoản phụ huynh do nhà trường cấp hoặc liên kết qua mã học sinh, không thể tự đăng ký tự do." });
    }
    if (!["student", "teacher"].includes(role)) {
      return res.status(400).json({ success: false, message: "Vai trò đăng ký không hợp lệ." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.includes("@") || !normalizedEmail.includes(".")) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập địa chỉ email hợp lệ." });
    }

    const [existing] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) {
      return res.status(409).json({ success: false, message: "Email này đã được đăng ký." });
    }

    const studentClass = role === "student" ? (String(className || "").trim() || null) : null;
    const passwordHash = await bcrypt.hash(password, 12);
    const status = role === "teacher" ? "pending" : "active";
    let insertSql = "INSERT INTO users (full_name, email, password_hash, role, class_name, status) VALUES (?, ?, ?, ?, ?, ?)";
    let insertParams = [String(fullName).trim(), normalizedEmail, passwordHash, role, studentClass, status];
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
      if (cols && cols.length > 0) {
        insertSql = "INSERT INTO users (full_name, email, password_hash, password, role, class_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        insertParams = [String(fullName).trim(), normalizedEmail, passwordHash, passwordHash, role, studentClass, status];
      }
    } catch (e) {}
    const [result] = await pool.execute(insertSql, insertParams);

    return res.status(201).json({
      success: true,
      message: status === "active" ? "Đăng ký tài khoản thành công! Đang chuyển hướng..." : "Đăng ký thành công. Tài khoản giáo viên đang chờ duyệt.",
      userId: result.insertId,
      status,
    });
  } catch (error) {
    console.error("Lỗi đăng ký:", error);
    return res.status(500).json({ success: false, message: "Lỗi đăng ký: " + error.message });
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
    let insertSql = "INSERT INTO users (full_name, email, password_hash, role, class_name, status) VALUES (?, ?, ?, ?, ?, ?)";
    let insertParams = [String(fullName).trim(), normalizedEmail, passwordHash, role, studentClass, status];
    try {
      const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
      if (cols && cols.length > 0) {
        insertSql = "INSERT INTO users (full_name, email, password_hash, password, role, class_name, status) VALUES (?, ?, ?, ?, ?, ?, ?)";
        insertParams = [String(fullName).trim(), normalizedEmail, passwordHash, passwordHash, role, studentClass, status];
      }
    } catch (e) {}
    const [result] = await pool.execute(insertSql, insertParams);
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

// ==========================================
// BÀI KIỂM TRA: IMPORT DOCX + AI PHÂN TÍCH ĐỘ KHÓ + BIẾN THỂ THEO MA TRẬN
// ==========================================
function testSelect() {
  return "SELECT id, teacher_id, title, source_file_name, class_name, questions_json, summary_json, " + optCols("imported_tests", "imported_tests", ["analysis_json", "matrix_id", "duration_minutes", "test_type", "semester", "unit_no"]) + ", created_at FROM imported_tests";
}

async function loadMatrix(matrixId) {
  if (!matrixId) return null;
  try {
    const [rows] = await pool.execute("SELECT id, title, matrix_json FROM test_matrices WHERE id = ? LIMIT 1", [matrixId]);
    if (!rows.length) return null;
    return { id: rows[0].id, title: rows[0].title, ...parseJsonField(rows[0].matrix_json, {}) };
  } catch (e) { return null; }
}

async function analyzeAndBuildVariants(test, matrix) {
  const perQuestion = await aiService.analyzeTestQuestions(test.questions);
  const variants = buildTestVariants(test.questions, perQuestion, matrix);
  return { perQuestion, variants, matrixId: matrix ? matrix.id : null, analyzedAt: new Date().toISOString() };
}

app.post("/api/tests/import-docx", requireLogin, requireRole("teacher"), async (req, res) => {
  try {
    await assessmentReady;
    const { documentBase64, fileName = "de-kiem-tra.docx", title, className, matrixId, testType, semester, unitNo } = req.body;
    const safeType = ["kttx", "ktgk", "ktck"].includes(String(testType)) ? String(testType) : "kttx";
    const safeSemester = Number(semester) === 2 ? 2 : 1;
    const safeUnit = unitNo ? Math.max(1, Math.min(12, Number(unitNo))) : null;
    if (!documentBase64 || !String(documentBase64).startsWith("data:")) return res.status(400).json({ success: false, message: "File DOCX không hợp lệ." });
    const buffer = Buffer.from(String(documentBase64).split(",").pop(), "base64");
    if (buffer.length > 8 * 1024 * 1024) return res.status(413).json({ success: false, message: "File DOCX vượt quá 8 MB." });
    const extracted = await mammoth.extractRawText({ buffer });
    const test = parseDocxAssessment(extracted.value, String(title || fileName).replace(/\.docx$/i, ""));
    const assignedClass = String(className || "").trim() || null;
    const matrix = await loadMatrix(matrixId);
    const analysis = await analyzeAndBuildVariants(test, matrix);
    const [result] = hasCol("imported_tests", "test_type")
      ? await pool.execute(
          "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json, analysis_json, matrix_id, duration_minutes, test_type, semester, unit_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [req.user.userId, test.title, String(fileName).slice(0, 255), assignedClass, JSON.stringify(test), JSON.stringify(test.summary), JSON.stringify(analysis), matrix ? matrix.id : null, analysis.variants.full.durationMinutes, safeType, safeSemester, safeUnit]
        )
      : hasCol("imported_tests", "analysis_json")
      ? await pool.execute(
          "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json, analysis_json, matrix_id, duration_minutes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [req.user.userId, test.title, String(fileName).slice(0, 255), assignedClass, JSON.stringify(test), JSON.stringify(test.summary), JSON.stringify(analysis), matrix ? matrix.id : null, analysis.variants.full.durationMinutes]
        )
      : await pool.execute(
          "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json) VALUES (?, ?, ?, ?, ?, ?)",
          [req.user.userId, test.title, String(fileName).slice(0, 255), assignedClass, JSON.stringify({ ...test, analysis }), JSON.stringify(test.summary)]
        );
    return res.status(201).json({
      success: true, testId: result.insertId, title: test.title, className: assignedClass, summary: test.summary,
      analysis: { counts: analysis.variants.counts, durationMinutes: analysis.variants.full.durationMinutes, regularQuestions: analysis.variants.regular.questionIds.length, totalQuestions: test.questions.length },
      message: "Đã tạo bài kiểm tra từ DOCX."
    });
  } catch (error) {
    console.error("DOCX import error:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể đọc cấu trúc đề DOCX." });
  }
});

// Danh sách đề (học sinh: kèm trạng thái đã nộp / biến thể theo lớp)
app.get("/api/tests/latest", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    let query = testSelect();
    const params = [];
    let variantName = "full";
    let submittedMap = {};

    if (req.user.role === "student") {
      const [uRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [req.user.userId]);
      const userClass = uRows[0]?.class_name;
      if (userClass) {
        query += " WHERE (class_name = ? OR class_name IS NULL OR class_name = '')";
        params.push(userClass);
      }
      variantName = resolveVariantName(await getClassTier(userClass), { variants: true });
      try {
        const [subRows] = await pool.execute(`SELECT ws.test_id, ws.objective_score, ws.manual_score, ${optCol("writing_submissions", "ws", "objective_max")}, ws.status, ws.submitted_at, it.summary_json FROM writing_submissions ws JOIN imported_tests it ON it.id = ws.test_id WHERE ws.student_id = ?`, [req.user.userId]);
        subRows.forEach(r => { submittedMap[r.test_id] = { ...progressService.scoreSubmissionRow(r), status: r.status, submittedAt: r.submitted_at }; });
      } catch (e) {}
    }

    query += " ORDER BY created_at DESC LIMIT 100";
    const [rows] = await pool.execute(query, params);
    const tests = rows.map(row => {
      const t = publicTest(getStoredTest(row), { variantName });
      const sub = submittedMap[row.id];
      return { ...t, submission: sub ? { scoreOnTen: sub.scoreOnTen, status: sub.status, submittedAt: sub.submittedAt } : null };
    });
    return res.json({ success: true, tests, variant: variantName });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách bài kiểm tra." });
  }
});

app.get("/api/tests/:id", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute(testSelect() + " WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra." });
    let variantName = "full";
    if (req.user.role === "student") {
      const [uRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [req.user.userId]);
      variantName = resolveVariantName(await getClassTier(uRows[0]?.class_name), { variants: true });
    }
    const isTeacher = req.user.role === "teacher" || req.user.role === "admin";
    return res.json({ success: true, test: publicTest(getStoredTest(rows[0]), { variantName, includeAnswers: isTeacher }) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể tải bài kiểm tra." });
  }
});

// Giáo viên phân tích lại độ khó / gắn ma trận cho đề đã có
app.post("/api/teacher/tests/:id/analyze", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute(testSelect() + " WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra." });
    const stored = getStoredTest(rows[0]);
    const matrix = await loadMatrix(req.body.matrixId || rows[0].matrix_id);
    const analysis = await analyzeAndBuildVariants(stored.questions, matrix);
    if (hasCol("imported_tests", "analysis_json")) {
      await pool.execute("UPDATE imported_tests SET analysis_json = ?, matrix_id = ?, duration_minutes = ? WHERE id = ?", [JSON.stringify(analysis), matrix ? matrix.id : null, analysis.variants.full.durationMinutes, req.params.id]);
    } else {
      await pool.execute("UPDATE imported_tests SET questions_json = ? WHERE id = ?", [JSON.stringify({ ...stored.questions, analysis }), req.params.id]);
    }
    return res.json({ success: true, analysis: { perQuestion: analysis.perQuestion, counts: analysis.variants.counts, durations: { full: analysis.variants.full.durationMinutes, advanced: analysis.variants.advanced.durationMinutes, regular: analysis.variants.regular.durationMinutes }, regularQuestions: analysis.variants.regular.questionIds.length }, message: "Đã phân tích lại đề bằng AI." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể phân tích đề." });
  }
});

// Giáo viên sửa phân loại đề (loại KTTX/KTGK/KTCK, học kỳ, unit, lớp)
app.patch("/api/teacher/tests/:id", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { testType, semester, unitNo, className, title } = req.body;
    const sets = [], params = [];
    if (hasCol("imported_tests", "test_type") && ["kttx", "ktgk", "ktck"].includes(String(testType))) { sets.push("test_type = ?"); params.push(String(testType)); }
    if (hasCol("imported_tests", "semester") && (Number(semester) === 1 || Number(semester) === 2)) { sets.push("semester = ?"); params.push(Number(semester)); }
    if (hasCol("imported_tests", "unit_no") && unitNo !== undefined) { sets.push("unit_no = ?"); params.push(unitNo ? Math.max(1, Math.min(12, Number(unitNo))) : null); }
    if (className !== undefined) { sets.push("class_name = ?"); params.push(String(className || "").trim() || null); }
    if (title) { sets.push("title = ?"); params.push(String(title).trim().slice(0, 255)); }
    if (!sets.length) return res.status(400).json({ success: false, message: "Không có gì để cập nhật." });
    params.push(req.params.id);
    if (req.user.role === "teacher") params.push(req.user.userId);
    const [result] = await pool.execute(`UPDATE imported_tests SET ${sets.join(", ")} WHERE id = ?${req.user.role === "teacher" ? " AND teacher_id = ?" : ""}`, params);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra." });
    return res.json({ success: true, message: "Đã cập nhật phân loại đề." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể cập nhật đề." });
  }
});

app.post("/api/tests/:id/submissions", requireLogin, requireRole("student"), async (req, res) => {
  try {
    await assessmentReady;
    const { answers = {}, speakingAnswers = {}, tabViolations = 0, violationPenalty = 0, isForcedSubmit = false, timeSpentSeconds = null } = req.body;
    const [rows] = await pool.execute(testSelect() + " WHERE id = ? LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy bài kiểm tra." });
    const stored = getStoredTest(rows[0]);
    const [uRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [req.user.userId]);
    const variantName = resolveVariantName(await getClassTier(uRows[0]?.class_name), { variants: true });
    const questionsInVariant = variantQuestions(stored, variantName);

    const objective = questionsInVariant.filter(question => !question.manual && question.type !== "speaking");
    const speaking = questionsInVariant.filter(question => question.type === "speaking");
    const manual = questionsInVariant.filter(question => question.manual);

    let earned = 0;
    objective.forEach(question => {
      const value = answers[question.id];
      const correct = question.type === "multiple_choice"
        ? normalizeAnswer(value) === normalizeAnswer(question.answer)
        : (question.accepted || []).map(normalizeAnswer).includes(normalizeAnswer(value));
      if (correct) earned += Number(question.points || 0);
    });

    // Speaking: điểm = points x độ chuẩn AI (%)
    let speakingEarned = 0;
    const speakingRecord = {};
    speaking.forEach(question => {
      const ans = speakingAnswers[question.id] || {};
      const acc = Math.max(0, Math.min(100, Number(ans.accuracy) || 0));
      speakingEarned += Number(question.points || 0) * (acc / 100);
      speakingRecord[question.id] = { transcript: String(ans.transcript || "").slice(0, 2000), accuracy: acc, prompt: question.prompt };
    });
    speakingEarned = Number(speakingEarned.toFixed(2));

    const objectiveMax = Number((objective.reduce((sum, q) => sum + Number(q.points || 0), 0) + speaking.reduce((sum, q) => sum + Number(q.points || 0), 0)).toFixed(2));
    const manualMax = Number(manual.reduce((sum, q) => sum + Number(q.points || 0), 0).toFixed(2));
    const writingAnswers = Object.fromEntries(manual.map(question => [question.id, String(answers[question.id] || "").trim()]).filter(([, value]) => value));
    const status = Object.keys(writingAnswers).length ? "pending_manual" : "completed";

    const penalty = Math.max(0, Number(violationPenalty) || 0);
    const violationsCount = Math.max(0, Number(tabViolations) || 0);
    const forced = Boolean(isForcedSubmit) ? 1 : 0;
    const netObjectiveEarned = Math.max(0, Number((earned + speakingEarned - penalty).toFixed(2)));

    if (!hasCol("writing_submissions", "speaking_answers_json")) {
      await pool.execute(
        `INSERT INTO writing_submissions (test_id, student_id, objective_answers_json, writing_answers_json, objective_score, tab_violations, violation_penalty, is_forced_submit, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE objective_answers_json = VALUES(objective_answers_json), writing_answers_json = VALUES(writing_answers_json), objective_score = VALUES(objective_score),
           tab_violations = VALUES(tab_violations), violation_penalty = VALUES(violation_penalty), is_forced_submit = VALUES(is_forced_submit),
           manual_score = NULL, teacher_feedback = NULL, status = VALUES(status), submitted_at = CURRENT_TIMESTAMP, graded_at = NULL`,
        [req.params.id, req.user.userId, JSON.stringify({ ...answers, __speaking: speakingRecord, __objectiveMax: objectiveMax, __variant: variantName }), JSON.stringify(writingAnswers), netObjectiveEarned, violationsCount, penalty, forced, status]
      );
    } else await pool.execute(
      `INSERT INTO writing_submissions (test_id, student_id, objective_answers_json, writing_answers_json, speaking_answers_json, objective_score, speaking_score, objective_max, variant, time_spent_seconds, tab_violations, violation_penalty, is_forced_submit, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         objective_answers_json = VALUES(objective_answers_json),
         writing_answers_json = VALUES(writing_answers_json),
         speaking_answers_json = VALUES(speaking_answers_json),
         objective_score = VALUES(objective_score),
         speaking_score = VALUES(speaking_score),
         objective_max = VALUES(objective_max),
         variant = VALUES(variant),
         time_spent_seconds = VALUES(time_spent_seconds),
         tab_violations = VALUES(tab_violations),
         violation_penalty = VALUES(violation_penalty),
         is_forced_submit = VALUES(is_forced_submit),
         manual_score = NULL, teacher_feedback = NULL, status = VALUES(status), submitted_at = CURRENT_TIMESTAMP, graded_at = NULL`,
      [req.params.id, req.user.userId, JSON.stringify(answers), JSON.stringify(writingAnswers), JSON.stringify(speakingRecord), netObjectiveEarned, speakingEarned, objectiveMax, variantName, timeSpentSeconds !== null ? Number(timeSpentSeconds) : null, violationsCount, penalty, forced, status]
    );

    // Chi tiết từng câu để hiển thị lỗi sai + đưa vào phòng chữa lỗi
    const review = objective.map(question => {
      const value = answers[question.id];
      const correct = question.type === "multiple_choice"
        ? normalizeAnswer(value) === normalizeAnswer(question.answer)
        : (question.accepted || []).map(normalizeAnswer).includes(normalizeAnswer(value));
      return { id: question.id, section: question.section, prompt: question.prompt, selected: value ?? "", correctAnswer: question.type === "multiple_choice" ? question.answer : (question.accepted || []).join(" / "), correct, options: question.options || [] };
    });

    const totalMax = objectiveMax + manualMax;
    const scoreOnTen = totalMax > 0 ? Number(((netObjectiveEarned / totalMax) * 10).toFixed(1)) : 0;
    await progressService.recordLearningEvent({
      studentId: req.user.userId, type: "test", refId: req.params.id, title: stored.title,
      score: netObjectiveEarned, maxScore: totalMax,
      meta: { variant: variantName, objective: earned, speaking: speakingEarned, penalty, violations: violationsCount, wrong: review.filter(r => !r.correct).length, status }
    });

    let submitMsg = status === "pending_manual" ? "Đã nộp bài. Phần Writing đang chờ giáo viên chấm." : "Đã nộp bài kiểm tra.";
    if (forced) submitMsg = `⛔ BÀI THI BỊ THU TỰ ĐỘNG do rời tab 3 lần! (Bị trừ ${penalty} điểm vi phạm).`;
    else if (penalty > 0) submitMsg += ` (Lưu ý: Bị trừ ${penalty}đ do có ${violationsCount} lần rời tab).`;

    return res.json({
      success: true,
      objectiveScore: netObjectiveEarned,
      rawObjectiveScore: earned,
      speakingScore: speakingEarned,
      violationPenalty: penalty,
      tabViolations: violationsCount,
      isForcedSubmit: Boolean(forced),
      objectiveMax,
      manualMax,
      totalMax,
      scoreOnTen,
      variant: variantName,
      review,
      status,
      message: submitMsg
    });
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
        ws.status, ws.submitted_at, ws.graded_at, ${getViolationSelectCols()},
        ws.objective_answers_json, ws.writing_answers_json, ${optCols("writing_submissions", "ws", ["speaking_answers_json", "speaking_score", "objective_max", "variant", "time_spent_seconds"])},
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
      const summary = parseJsonField(row.summary_json, {});
      const sc = progressService.scoreSubmissionRow(row);
      const { objectiveScore, manualScore, totalScore, maxScore, scoreOnTen } = sc;
      const objectiveMax = Number(row.objective_max || 0) > 0 ? Number(row.objective_max) : Number((maxScore - Number(summary.manualCount ? 3 : 0)).toFixed(2));

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
        tabViolations: Number(row.tab_violations || 0),
        violationPenalty: Number(row.violation_penalty || 0),
        isForcedSubmit: Boolean(row.is_forced_submit),
        speakingScore: Number(row.speaking_score || 0),
        variant: row.variant || "full",
        timeSpentSeconds: row.time_spent_seconds !== null ? Number(row.time_spent_seconds) : null,
        objectiveAnswers: parseJsonField(row.objective_answers_json, {}),
        writingAnswers: parseJsonField(row.writing_answers_json, {}),
        speakingAnswers: parseJsonField(row.speaking_answers_json, {}),
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
        ${getViolationSelectCols()},
        ws.objective_answers_json, ws.writing_answers_json, ${optCols("writing_submissions", "ws", ["speaking_answers_json", "speaking_score", "objective_max", "variant", "time_spent_seconds"])},
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
      const { objectiveScore, manualScore, totalScore, maxScore, scoreOnTen } = progressService.scoreSubmissionRow(row);

      return {
        id: row.id,
        testId: row.test_id,
        testTitle: row.test_title,
        testAssignedClass: row.test_assigned_class,
        speakingScore: Number(row.speaking_score || 0),
        variant: row.variant || "full",
        objectiveMax: row.objective_max !== null ? Number(row.objective_max) : null,
        timeSpentSeconds: row.time_spent_seconds !== null ? Number(row.time_spent_seconds) : null,
        speakingAnswers: parseJsonField(row.speaking_answers_json, {}),
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
        tabViolations: Number(row.tab_violations || 0),
        violationPenalty: Number(row.violation_penalty || 0),
        isForcedSubmit: Boolean(row.is_forced_submit),
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

// API Lấy dữ liệu học tập con em cho Phụ huynh
app.get("/api/parent/student-data", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    let targetStudentId = req.user.parent_student_id || req.query.studentId;
    if (!targetStudentId) {
      const [students] = await pool.execute("SELECT id FROM users WHERE role = 'student' ORDER BY id ASC LIMIT 1");
      if (students.length) targetStudentId = students[0].id;
    }
    if (!targetStudentId) {
      return res.json({ success: true, student: null, submissions: [], stats: {} });
    }

    const [studentRows] = await pool.execute("SELECT id, full_name, email, class_name, created_at FROM users WHERE id = ? LIMIT 1", [targetStudentId]);
    if (!studentRows.length) return res.status(404).json({ success: false, message: "Không tìm thấy thông tin học sinh." });
    const student = studentRows[0];

    const [submissionsRows] = await pool.execute(
      `SELECT 
        ws.id, ws.test_id, ws.objective_score, ws.manual_score, ws.teacher_feedback,
        ws.status, ws.submitted_at, ws.graded_at, ${getViolationSelectCols()}, ${optCol("writing_submissions", "ws", "objective_max")},
        it.title AS test_title, it.summary_json, u.full_name AS teacher_name
       FROM writing_submissions ws
       JOIN imported_tests it ON it.id = ws.test_id
       LEFT JOIN users u ON u.id = it.teacher_id
       WHERE ws.student_id = ?
       ORDER BY ws.submitted_at DESC`,
      [targetStudentId]
    );

    let totalScoreSum = 0;
    let scoredCount = 0;
    let totalViolations = 0;

    const submissions = submissionsRows.map(row => {
      const { scoreOnTen } = progressService.scoreSubmissionRow(row);
      const tabViolations = Number(row.tab_violations || 0);
      totalViolations += tabViolations;
      totalScoreSum += scoreOnTen;
      scoredCount++;

      return {
        id: row.id,
        testTitle: row.test_title,
        teacherName: row.teacher_name || "Giáo viên",
        scoreOnTen,
        status: row.status,
        submittedAt: row.submitted_at,
        teacherFeedback: row.teacher_feedback,
        tabViolations,
        violationPenalty: Number(row.violation_penalty || 0),
        isForcedSubmit: Boolean(row.is_forced_submit)
      };
    });

    const avgScore = scoredCount > 0 ? Number((totalScoreSum / scoredCount).toFixed(1)) : 0;
    let progress = null;
    try { progress = await progressService.buildStudentProgress(student.id); } catch (e) { logSchemaError(e); }
    return res.json({
      success: true,
      progress,
      student: {
        id: student.id,
        fullName: student.full_name,
        email: student.email,
        className: student.class_name || "Chưa phân lớp"
      },
      stats: {
        totalTests: submissions.length,
        avgScore,
        totalViolations,
        integrityRate: totalViolations === 0 ? 100 : Math.max(50, 100 - totalViolations * 10)
      },
      submissions
    });
  } catch (err) {
    console.error("Parent student data error:", err);
    return res.status(500).json({ success: false, message: "Lỗi tải dữ liệu phụ huynh." });
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
      ? `SELECT ws.id, ws.objective_score, ws.manual_score, ${optCol("writing_submissions", "ws", "objective_max")}, ws.status, u.class_name, it.summary_json
         FROM writing_submissions ws
         JOIN imported_tests it ON it.id = ws.test_id
         JOIN users u ON u.id = ws.student_id
         WHERE it.teacher_id = ?`
      : `SELECT ws.id, ws.objective_score, ws.manual_score, ${optCol("writing_submissions", "ws", "objective_max")}, ws.status, u.class_name, it.summary_json
         FROM writing_submissions ws
         JOIN imported_tests it ON it.id = ws.test_id
         JOIN users u ON u.id = ws.student_id`;
    const [subRows] = await pool.execute(subQuery, isTeacher ? [teacherId] : []);

    const [studentRows] = await pool.execute("SELECT COUNT(*) AS totalStudents FROM users WHERE role = 'student' AND status = 'active'");

    const classStats = {};
    try {
      const [classRows] = await pool.execute("SELECT DISTINCT class_name FROM users WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> '' ORDER BY class_name");
      [...DEFAULT_CLASSES, ...classRows.map(r => r.class_name)].forEach(c => { if (!classStats[c]) classStats[c] = { submissions: 0, totalScore10: 0, gradedCount: 0, pendingCount: 0 }; });
    } catch (e) {}

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

      const score10 = progressService.scoreSubmissionRow(row).scoreOnTen;

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
    if (!Number.isFinite(score) || score < 0 || score > 10) return res.status(400).json({ success: false, message: "Điểm Writing phải nằm trong khoảng 0–10 (theo thang điểm phần tự luận của đề)." });
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

// ==========================================
// API LUYỆN NÓI AI THEO GIAI ĐOẠN (GIAO BÀI, SINH BÀI TỪ SGK, CHẤM, NỘP)
// ==========================================

function normalizeSpeakingItems(rawItems, fallbackSentence, fallbackIpa, fallbackTranslation) {
  const list = Array.isArray(rawItems) ? rawItems : [];
  const items = list
    .filter(it => it && (it.text || it.sentence))
    .map(it => ({
      text: String(it.text || it.sentence).trim(),
      ipa: it.ipa ? String(it.ipa).trim() : "",
      meaning: String(it.meaning || it.translation || "").trim(),
      focus: String(it.focus || "").trim(),
      level: ["easy", "medium", "hard"].includes(it.level) ? it.level : "medium",
      speaker: it.speaker ? String(it.speaker).trim() : ""
    }));
  if (!items.length && fallbackSentence) {
    items.push({ text: String(fallbackSentence).trim(), ipa: fallbackIpa || "", meaning: fallbackTranslation || "", focus: "", level: "medium", speaker: "" });
  }
  return items;
}

function publicSpeakingAssignment(row) {
  const items = parseJsonField(row.items_json, null) || normalizeSpeakingItems([], row.sentence, row.ipa, row.translation);
  return {
    id: row.id,
    title: row.title,
    className: row.class_name || null,
    stage: Number(row.stage) || 1,
    unitTitle: row.unit_title || null,
    sourceFileName: row.source_file_name || null,
    teacherName: row.teacher_name || "Giáo viên",
    sentence: row.sentence,
    ipa: row.ipa || "",
    translation: row.translation || "",
    items,
    itemCount: items.length,
    createdAt: row.created_at,
    submissionCount: row.submission_count !== undefined ? Number(row.submission_count) : undefined,
    progress: row.student_best !== undefined ? {
      best: Number(row.student_best || 0),
      last: Number(row.student_accuracy || 0),
      attempts: Number(row.student_attempts || 0),
      submittedAt: row.student_submitted_at || null,
      itemsResult: parseJsonField(row.student_items_result, null)
    } : undefined
  };
}

// 1. Giáo viên giao bài Speaking thủ công (1 câu hoặc nhiều câu / hội thoại)
app.post("/api/teacher/speaking-assignments", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { title, className, sentence, ipa, translation, stage, items, unitTitle } = req.body;
    const normalized = normalizeSpeakingItems(items, sentence, ipa, translation);
    if (!title || !normalized.length) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập tiêu đề và ít nhất một câu tiếng Anh cần luyện nói." });
    }
    for (const it of normalized) {
      if (!it.ipa || !it.meaning) {
        try {
          const gen = await aiService.translateAndGenerateIpa(it.text);
          it.ipa = it.ipa || gen.ipa || "";
          it.meaning = it.meaning || gen.translation || "";
        } catch (e) {}
      }
    }
    const targetClass = className && String(className).trim() ? String(className).trim() : null;
    const stageNum = Number(stage) === 2 ? 2 : 1;
    const first = normalized[0];
    const [result] = hasCol("speaking_assignments", "items_json")
      ? await pool.execute(
          `INSERT INTO speaking_assignments (teacher_id, title, class_name, sentence, ipa, translation, stage, items_json, unit_title) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [req.user.userId, String(title).trim(), targetClass, first.text, first.ipa || null, first.meaning || null, stageNum, JSON.stringify(normalized), unitTitle ? String(unitTitle).trim() : null]
        )
      : await pool.execute(
          `INSERT INTO speaking_assignments (teacher_id, title, class_name, sentence, ipa, translation) VALUES (?, ?, ?, ?, ?, ?)`,
          [req.user.userId, String(title).trim(), targetClass, first.text, first.ipa || null, first.meaning || null]
        );
    return res.status(201).json({ success: true, message: "Đã giao bài tập Speaking thành công!", assignmentId: result.insertId, itemCount: normalized.length });
  } catch (error) {
    console.error("Lỗi giao bài speaking:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo bài tập Speaking: " + error.message });
  }
});

// 2. Giáo viên upload SGK (PDF/DOCX) -> AI sinh bài giai đoạn 1 (câu đơn) & giai đoạn 2 (hội thoại)
app.post("/api/teacher/speaking-units", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { documentBase64, fileName = "sgk.pdf", title, unitTitle, className, stages = ["1", "2"], count = 8 } = req.body;
    if (!documentBase64) return res.status(400).json({ success: false, message: "Vui lòng chọn file SGK (PDF/DOCX)." });
    const doc = await extractDocumentText(documentBase64, fileName);
    const baseTitle = String(title || unitTitle || fileName.replace(/\.(pdf|docx|txt)$/i, "")).trim();
    const targetClass = className && String(className).trim() ? String(className).trim() : null;
    const wantStages = (Array.isArray(stages) ? stages : [stages]).map(Number).filter(s => s === 1 || s === 2);
    const created = [];
    for (const stage of (wantStages.length ? wantStages : [1, 2])) {
      const gen = await aiService.generateSpeakingItems({ sourceText: doc.text, unitTitle, stage, count });
      if (stage === 1) {
        const items = normalizeSpeakingItems(gen.items);
        if (!items.length) continue;
        const [r] = await pool.execute(
          `INSERT INTO speaking_assignments (teacher_id, title, class_name, sentence, ipa, translation, stage, items_json, unit_title, source_file_name) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [req.user.userId, `${baseTitle} · GĐ1 Câu đơn`, targetClass, items[0].text, items[0].ipa || null, items[0].meaning || null, JSON.stringify(items), unitTitle || null, String(fileName).slice(0, 255)]
        );
        created.push({ id: r.insertId, stage: 1, itemCount: items.length, source: gen.source });
      } else {
        for (const [idx, d] of (gen.dialogues || []).entries()) {
          const items = normalizeSpeakingItems(d.lines);
          if (!items.length) continue;
          const [r] = await pool.execute(
            `INSERT INTO speaking_assignments (teacher_id, title, class_name, sentence, ipa, translation, stage, items_json, unit_title, source_file_name) VALUES (?, ?, ?, ?, ?, ?, 2, ?, ?, ?)`,
            [req.user.userId, `${baseTitle} · GĐ2 Hội thoại ${idx + 1}: ${d.title}`, targetClass, items[0].text, items[0].ipa || null, d.situation || items[0].meaning || null, JSON.stringify(items), unitTitle || null, String(fileName).slice(0, 255)]
          );
          created.push({ id: r.insertId, stage: 2, itemCount: items.length, source: gen.source, title: d.title });
        }
      }
    }
    if (!created.length) return res.status(422).json({ success: false, message: "Không sinh được câu luyện nói từ tài liệu này. Hãy thử file có nhiều văn bản tiếng Anh hơn." });
    const usedAi = created.some(c => c.source === "ai");
    return res.status(201).json({ success: true, created, message: `Đã tạo ${created.length} bài luyện nói từ SGK${usedAi ? " (AI sinh nội dung mới)" : " (trích câu từ tài liệu vì AI tạm bận)"}.` });
  } catch (error) {
    console.error("Lỗi sinh bài speaking từ SGK:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể xử lý tài liệu SGK." });
  }
});

// 3. Danh sách bài Speaking (GV: tất cả bài của mình; HS: bài của lớp + tiến độ cá nhân)
app.get("/api/speaking/assignments", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    if (req.user.role === "teacher" || req.user.role === "admin") {
      let query = `
        SELECT sa.*, u.full_name AS teacher_name,
               (SELECT COUNT(*) FROM speaking_submissions ss WHERE ss.assignment_id = sa.id) AS submission_count
        FROM speaking_assignments sa
        LEFT JOIN users u ON u.id = sa.teacher_id
      `;
      const params = [];
      if (req.user.role === "teacher") { query += " WHERE sa.teacher_id = ?"; params.push(req.user.userId); }
      query += " ORDER BY sa.stage ASC, sa.created_at DESC";
      const [rows] = await pool.execute(query, params);
      return res.json({ success: true, assignments: rows.map(publicSpeakingAssignment) });
    }

    const [userRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [req.user.userId]);
    const studentClass = userRows[0]?.class_name || null;
    const [rows] = await pool.execute(`
      SELECT sa.*, u.full_name AS teacher_name,
             ss.accuracy_percent AS student_accuracy, ss.best_accuracy AS student_best, ss.attempts AS student_attempts,
             ss.submitted_at AS student_submitted_at, ss.items_result_json AS student_items_result
      FROM speaking_assignments sa
      LEFT JOIN users u ON u.id = sa.teacher_id
      LEFT JOIN speaking_submissions ss ON ss.assignment_id = sa.id AND ss.student_id = ?
      WHERE (sa.class_name IS NULL OR sa.class_name = '' OR sa.class_name = ?)
      ORDER BY sa.stage ASC, sa.created_at ASC
    `, [req.user.userId, studentClass || ""]);
    const assignments = rows.map(r => publicSpeakingAssignment({ ...r, student_best: r.student_best ?? 0 }));
    const progress = await progressService.getSpeakingProgress(req.user.userId);
    return res.json({ success: true, assignments, progress });
  } catch (error) {
    console.error("Lỗi lấy bài speaking:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách bài tập Speaking." });
  }
});

// 4. Giáo viên xóa bài Speaking
app.delete("/api/teacher/speaking-assignments/:id", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    let query = "DELETE FROM speaking_assignments WHERE id = ?";
    const params = [req.params.id];
    if (req.user.role === "teacher") { query += " AND teacher_id = ?"; params.push(req.user.userId); }
    const [result] = await pool.execute(query, params);
    if (!result.affectedRows) return res.status(404).json({ success: false, message: "Không tìm thấy bài tập hoặc không có quyền xóa." });
    try { await pool.execute("DELETE FROM speaking_submissions WHERE assignment_id = ?", [req.params.id]); } catch (e) {}
    return res.json({ success: true, message: "Đã xóa bài tập Speaking." });
  } catch (error) {
    console.error("Lỗi xóa bài speaking:", error);
    return res.status(500).json({ success: false, message: "Không thể xóa bài tập Speaking." });
  }
});

// 5. AI chấm một lượt đọc (dùng cho luyện nói & câu Speaking trong bài kiểm tra)
app.post("/api/speaking/evaluate", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const { target, transcript, alternatives, assignmentId = null, itemIndex = 0, stage = 1, context = "practice", mode = "read" } = req.body;
    const targetText = String(target || "").trim();
    const alts = Array.isArray(alternatives) && alternatives.length ? alternatives : [transcript];
    if (!targetText && mode !== "free") return res.status(400).json({ success: false, message: "Thiếu câu mẫu để chấm." });

    let result, bestTranscript;
    if (mode === "free") {
      // Nói tự do (trả lời câu hỏi): chấm theo độ dài + từ khoá của đề bài
      bestTranscript = String(alts[0] || "").trim();
      const words = speakingScorer.normalizeWords(bestTranscript);
      const keyWords = speakingScorer.normalizeWords(targetText).filter(w => w.length > 3);
      const hit = keyWords.filter(k => words.some(w => speakingScorer.wordSimilarity(k, w) >= 0.8)).length;
      const lengthScore = Math.min(100, Math.round((words.length / 15) * 100));
      const relevance = keyWords.length ? Math.round((hit / keyWords.length) * 100) : lengthScore;
      const accuracy = words.length < 3 ? Math.min(20, lengthScore) : Math.round(lengthScore * 0.6 + relevance * 0.4);
      result = { accuracy, breakdown: words.map(w => ({ word: w, status: "correct", similarity: 1, heard: w })), errors: [] };
    } else {
      const picked = speakingScorer.pickBestTranscript(targetText, alts);
      bestTranscript = picked.transcript;
      result = picked.result;
    }

    const verdict = speakingScorer.verdictFor(result.accuracy);
    // Nhận xét AI (giới hạn 9s để không làm học sinh chờ lâu)
    let tip = "";
    try {
      const fb = await Promise.race([
        aiService.speakingFeedback({ target: targetText, transcript: bestTranscript, accuracy: result.accuracy, errors: result.errors }),
        new Promise(resolve => setTimeout(() => resolve(null), 9000))
      ]);
      tip = fb && fb.tip ? fb.tip : "";
    } catch (e) {}
    if (!tip) {
      const fb = await aiService.speakingFeedback({ target: "", transcript: "", accuracy: result.accuracy, errors: result.errors });
      tip = fb.tip;
    }

    if (req.user.role === "student") {
      try {
        await pool.execute(
          "INSERT INTO speaking_attempts (student_id, assignment_id, stage, item_index, context, target_text, transcript, accuracy, errors_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [req.user.userId, assignmentId || null, Number(stage) === 2 ? 2 : 1, Number(itemIndex) || 0, String(context).slice(0, 20), targetText || "(free speaking)", bestTranscript, result.accuracy, JSON.stringify(result.errors || [])]
        );
      } catch (e) { logSchemaError(e); }
    }

    return res.json({ success: true, accuracy: result.accuracy, transcript: bestTranscript, breakdown: result.breakdown, errors: result.errors, verdict, tip });
  } catch (error) {
    console.error("Lỗi chấm speaking:", error);
    return res.status(500).json({ success: false, message: "Không thể chấm điểm phát âm lúc này." });
  }
});

// 6. Học sinh nộp kết quả cả bài Speaking (nhiều câu) cho giáo viên
app.post("/api/student/speaking-submissions", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const { assignmentId, accuracyPercent, spokenTranscript, itemsResult } = req.body;
    if (!assignmentId) return res.status(400).json({ success: false, message: "Thiếu ID bài tập Speaking." });
    const items = Array.isArray(itemsResult) ? itemsResult.map(r => ({ index: Number(r.index) || 0, accuracy: Math.max(0, Math.min(100, Number(r.accuracy) || 0)), transcript: String(r.transcript || "").slice(0, 500) })) : [];
    const accuracy = items.length
      ? Math.round(items.reduce((s, r) => s + r.accuracy, 0) / items.length)
      : Math.max(0, Math.min(100, Number(accuracyPercent) || 0));
    await pool.execute(
      `INSERT INTO speaking_submissions (assignment_id, student_id, accuracy_percent, spoken_transcript, items_result_json, attempts, best_accuracy, submitted_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
       ON DUPLICATE KEY UPDATE
         accuracy_percent = VALUES(accuracy_percent),
         spoken_transcript = VALUES(spoken_transcript),
         items_result_json = VALUES(items_result_json),
         attempts = attempts + 1,
         best_accuracy = GREATEST(best_accuracy, VALUES(best_accuracy)),
         submitted_at = CURRENT_TIMESTAMP`,
      [assignmentId, req.user.userId, accuracy, String(spokenTranscript || "").trim().slice(0, 3000), JSON.stringify(items), accuracy]
    );
    const [aRows] = await pool.execute("SELECT title, stage FROM speaking_assignments WHERE id = ? LIMIT 1", [assignmentId]);
    await progressService.recordLearningEvent({
      studentId: req.user.userId, type: "speaking", refId: assignmentId, title: aRows[0]?.title || "Bài luyện nói",
      score: accuracy, maxScore: 100, meta: { stage: aRows[0]?.stage || 1, items: items.length }
    });
    return res.json({ success: true, accuracy, message: `Đã nộp bài Speaking cho giáo viên! Độ chuẩn trung bình: ${accuracy}%` });
  } catch (error) {
    console.error("Lỗi nộp bài speaking:", error);
    return res.status(500).json({ success: false, message: "Không thể nộp bài Speaking." });
  }
});

// 7. Giáo viên xem danh sách học sinh đã nộp bài Speaking
app.get("/api/teacher/speaking-submissions", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { assignmentId, className } = req.query;
    let query = `
      SELECT ss.id, ss.assignment_id, ss.accuracy_percent, ss.best_accuracy, ss.attempts, ss.spoken_transcript, ss.items_result_json, ss.submitted_at,
             sa.title AS task_title, sa.sentence AS target_sentence, sa.ipa AS target_ipa, sa.stage,
             u.full_name AS student_name, u.email AS student_email, u.class_name AS student_class
      FROM speaking_submissions ss
      JOIN speaking_assignments sa ON sa.id = ss.assignment_id
      JOIN users u ON u.id = ss.student_id
      WHERE 1=1
    `;
    const params = [];
    if (req.user.role === "teacher") { query += " AND sa.teacher_id = ?"; params.push(req.user.userId); }
    if (assignmentId) { query += " AND ss.assignment_id = ?"; params.push(assignmentId); }
    if (className) { query += " AND u.class_name = ?"; params.push(className); }
    query += " ORDER BY ss.submitted_at DESC";
    const [rows] = await pool.execute(query, params);
    return res.json({ success: true, submissions: rows.map(r => ({ ...r, items_result: parseJsonField(r.items_result_json, []) })) });
  } catch (error) {
    console.error("Lỗi lấy danh sách bài nộp speaking:", error);
    return res.status(500).json({ success: false, message: "Không thể tải danh sách nộp bài Speaking." });
  }
});

// ==========================================
// MA TRẬN ĐỀ & PHÂN LOẠI LỚP
// ==========================================
// Danh sách lớp công khai (dùng cho form đăng ký trước khi đăng nhập)
app.get("/api/classes", async (req, res) => {
  let classes = [...DEFAULT_CLASSES];
  try {
    const [rows] = await pool.execute("SELECT DISTINCT class_name FROM users WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> ''");
    classes = [...new Set([...classes, ...rows.map(r => r.class_name)])];
  } catch (e) {}
  return res.json({ success: true, classes });
});

app.get("/api/class-settings", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute("SELECT class_name, tier, updated_at FROM class_settings ORDER BY class_name");
    const [classRows] = await pool.execute("SELECT DISTINCT class_name FROM users WHERE role = 'student' AND class_name IS NOT NULL AND class_name <> '' ORDER BY class_name");
    const known = [...new Set([...DEFAULT_CLASSES, ...classRows.map(r => r.class_name), ...rows.map(r => r.class_name)])];
    return res.json({ success: true, settings: rows.map(r => ({ className: r.class_name, tier: r.tier })), knownClasses: known, tiers: DEFAULT_TIERS });
  } catch (error) {
    logSchemaError(error);
    return res.json({ success: true, settings: [], knownClasses: DEFAULT_CLASSES, tiers: DEFAULT_TIERS });
  }
});

app.put("/api/teacher/class-settings", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const settings = Array.isArray(req.body.settings) ? req.body.settings : [];
    for (const s of settings) {
      const cls = String(s.className || "").trim();
      const tier = s.tier === "advanced" ? "advanced" : s.tier === "regular" ? "regular" : null;
      if (!cls) continue;
      if (!tier) { await pool.execute("DELETE FROM class_settings WHERE class_name = ?", [cls]); continue; }
      await pool.execute("INSERT INTO class_settings (class_name, tier, updated_by) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE tier = VALUES(tier), updated_by = VALUES(updated_by)", [cls, tier, req.user.userId]);
    }
    return res.json({ success: true, message: "Đã lưu phân loại lớp." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Không thể lưu phân loại lớp: " + error.message });
  }
});

app.get("/api/teacher/test-matrices", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute("SELECT id, teacher_id, title, source_file_name, matrix_json, created_at FROM test_matrices ORDER BY created_at DESC");
    return res.json({ success: true, matrices: rows.map(r => ({ id: r.id, title: r.title, sourceFileName: r.source_file_name, createdAt: r.created_at, matrix: parseJsonField(r.matrix_json, {}) })) });
  } catch (error) {
    logSchemaError(error);
    return res.json({ success: true, matrices: [] });
  }
});

app.post("/api/teacher/test-matrices", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { documentBase64, fileName = "ma-tran.pdf", title } = req.body;
    if (!documentBase64) return res.status(400).json({ success: false, message: "Vui lòng chọn file ma trận đề (PDF/DOCX)." });
    const doc = await extractDocumentText(documentBase64, fileName);
    const matrix = await aiService.parseTestMatrix(doc.text);
    const finalTitle = String(title || matrix.title || fileName.replace(/\.(pdf|docx|txt)$/i, "")).trim();
    const [result] = await pool.execute("INSERT INTO test_matrices (teacher_id, title, source_file_name, matrix_json) VALUES (?, ?, ?, ?)", [req.user.userId, finalTitle, String(fileName).slice(0, 255), JSON.stringify(matrix)]);
    return res.status(201).json({ success: true, matrixId: result.insertId, matrix: { ...matrix, title: finalTitle }, message: matrix.source === "ai" ? "AI đã đọc xong ma trận đề." : "Đã lưu ma trận (ước lượng tự động, AI tạm bận)." });
  } catch (error) {
    console.error("Lỗi đọc ma trận:", error);
    return res.status(400).json({ success: false, message: error.message || "Không thể đọc ma trận đề." });
  }
});

app.delete("/api/teacher/test-matrices/:id", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await pool.execute("DELETE FROM test_matrices WHERE id = ?", [req.params.id]);
    return res.json({ success: true, message: "Đã xóa ma trận." });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể xóa ma trận." });
  }
});

// ==========================================
// TIẾN ĐỘ HỌC TẬP TỪNG HỌC SINH (dashboard, kết quả, giáo viên, phụ huynh)
// ==========================================
app.get("/api/student/progress", requireLogin, async (req, res) => {
  try {
    await assessmentReady;
    const progress = await progressService.buildStudentProgress(req.user.userId);
    return res.json({ success: true, progress });
  } catch (error) {
    logSchemaError(error);
    return res.status(500).json({ success: false, message: "Không thể tải tiến độ học tập (kiểm tra migration CSDL)." });
  }
});

app.post("/api/learning-events", requireLogin, requireRole("student"), async (req, res) => {
  try {
    await assessmentReady;
    const { type, refId, title, score, maxScore, meta } = req.body;
    if (!["vocab", "healing", "speaking", "listening", "grammar"].includes(type)) return res.status(400).json({ success: false, message: "Loại sự kiện không hợp lệ." });
    await progressService.recordLearningEvent({ studentId: req.user.userId, type, refId, title: String(title || "").slice(0, 255), score: score !== undefined ? Number(score) : null, maxScore: maxScore !== undefined ? Number(maxScore) : null, meta: meta || null });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Không thể ghi nhận kết quả." });
  }
});

app.get("/api/teacher/students-overview", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const { className } = req.query;
    let query = "SELECT id, full_name, email, class_name, created_at FROM users WHERE role = 'student' AND status = 'active'";
    const params = [];
    if (className) { query += " AND class_name = ?"; params.push(className); }
    query += " ORDER BY class_name, full_name LIMIT 300";
    const [students] = await pool.execute(query, params);
    const overview = [];
    for (const s of students) {
      const p = await progressService.buildStudentProgress(s.id);
      overview.push({
        id: s.id, fullName: s.full_name, email: s.email, className: s.class_name || "Chưa phân lớp",
        tests: { count: p.tests.count, avgScore: p.tests.avgScore, bestScore: p.tests.bestScore, improvement: p.tests.improvement, pending: p.tests.pending },
        speaking: { attempts: p.speaking.totalAttempts, avgAccuracy: p.speaking.avgAccuracy, stage1: p.speaking.stages[1]?.avgAccuracy || 0, stage2: p.speaking.stages[2]?.avgAccuracy || 0 },
        vocab: { sets: p.vocab.setsCompleted, avg: p.vocab.avgQuizPercent },
        healing: p.healing.healed,
        skills: p.skills, overall: p.overall, activeDays: p.activeDays,
        titles: p.earnedTitles.map(t => t.name),
        lastActive: p.events[0]?.createdAt || null
      });
    }
    return res.json({ success: true, students: overview });
  } catch (error) {
    logSchemaError(error);
    return res.status(500).json({ success: false, message: "Không thể tải tổng quan học sinh." });
  }
});

app.get("/api/teacher/students/:id/progress", requireLogin, requireRole("teacher", "admin", "parent"), async (req, res) => {
  try {
    await assessmentReady;
    const [rows] = await pool.execute("SELECT id, full_name, email, class_name FROM users WHERE id = ? AND role = 'student' LIMIT 1", [req.params.id]);
    if (!rows.length) return res.status(404).json({ success: false, message: "Không tìm thấy học sinh." });
    const progress = await progressService.buildStudentProgress(rows[0].id);
    return res.json({ success: true, student: { id: rows[0].id, fullName: rows[0].full_name, email: rows[0].email, className: rows[0].class_name }, progress });
  } catch (error) {
    logSchemaError(error);
    return res.status(500).json({ success: false, message: "Không thể tải tiến độ học sinh." });
  }
});

// ==========================================
// AI SUITE API ENDPOINTS (CHAT, WRITING, TEST GEN)
// ==========================================

// 1. AI Chatbot Endpoint
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập nội dung tin nhắn." });
    }
    const reply = await aiService.chatWithCapybara(message, history || []);
    return res.json({ success: true, reply });
  } catch (error) {
    console.error("Lỗi AI Chat:", error);
    return res.status(500).json({ success: false, message: "AI tạm thời bận, vui lòng thử lại." });
  }
});

// 2. AI Writing Grader Endpoint
app.post("/api/ai/grade-writing", async (req, res) => {
  try {
    const { prompt, content, level } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập bài viết cần chấm." });
    }
    const evaluation = await aiService.gradeWritingEssay({ prompt, content, level });
    return res.json({ success: true, evaluation });
  } catch (error) {
    console.error("Lỗi AI chấm Writing:", error);
    return res.status(500).json({ success: false, message: "Không thể chấm bài viết lúc này." });
  }
});

// 3. AI On-demand Test Generator Endpoint
app.post("/api/ai/generate-test", async (req, res) => {
  try {
    const { topic, gradeLevel, count, difficulty } = req.body;
    const generatedTest = aiService.generateTestOnDemand({ topic, gradeLevel, count, difficulty });
    return res.json({ success: true, test: generatedTest });
  } catch (error) {
    console.error("Lỗi AI tạo đề:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo đề lúc này." });
  }
});

// 4. AI Translation and IPA Endpoint (for Teacher Speaking assignments & study)
app.post("/api/ai/translate-and-ipa", async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence || !sentence.trim()) {
      return res.status(400).json({ success: false, message: "Vui lòng nhập câu tiếng Anh." });
    }
    const result = await aiService.translateAndGenerateIpa(sentence);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("Lỗi AI dịch & IPA:", error);
    return res.status(500).json({ success: false, message: "Không thể tạo phiên âm và bản dịch lúc này." });
  }
});


/* ==================== HỌC LIỆU THEO UNIT 1–12 ==================== */

// Tổng quan 12 unit: số từ vựng, điểm ngữ pháp, mã lỗi, câu nói, đoạn nghe.
app.get("/api/units", requireLogin, (req, res) => {
  try {
    return res.json({ success: true, ...unitsData.summary() });
  } catch (error) {
    console.error("Lỗi đọc học liệu theo unit:", error);
    return res.status(500).json({ success: false, message: "Không đọc được học liệu theo unit." });
  }
});

// Toàn bộ học liệu của một unit (từ vựng, ngữ pháp, luyện nói, luyện nghe).
app.get("/api/units/:n", requireLogin, (req, res) => {
  const n = Number(req.params.n);
  if (!Number.isInteger(n) || n < 1 || n > 12) {
    return res.status(400).json({ success: false, message: "Unit phải là số từ 1 đến 12." });
  }
  const data = unitsData.unit(n);
  if (!data) return res.status(404).json({ success: false, message: `Chưa có học liệu cho Unit ${n}.` });
  return res.json({ success: true, ...data });
});

// Danh sách mã lỗi ngữ pháp theo unit — Phòng Chữa Lỗi dùng để gom nhóm và vẽ bản đồ nhiệt.
app.get("/api/units/meta/error-codes", requireLogin, (req, res) => {
  return res.json({ success: true, codes: unitsData.errorCodes() });
});

/* ==================== KHUNG ĐỀ KTTX / KTGK / KTCK ==================== */

// 12 khung đề của cả hai học kì; ?term=1 hoặc ?term=2 để lọc.
app.get("/api/exams/specs", requireLogin, (req, res) => {
  const term = req.query.term ? Number(req.query.term) : null;
  if (term !== null && ![1, 2].includes(term)) {
    return res.status(400).json({ success: false, message: "Học kì chỉ nhận giá trị 1 hoặc 2." });
  }
  return res.json({ success: true, specs: unitsData.examSpecs(term) });
});

// Một khung đề cụ thể, kèm ma trận và cấu trúc điểm.
app.get("/api/exams/specs/:id", requireLogin, (req, res) => {
  const spec = unitsData.examSpec(String(req.params.id));
  if (!spec) return res.status(404).json({ success: false, message: "Không tìm thấy khung đề này." });
  return res.json({ success: true, spec });
});

// Giáo viên nạp đề Word thật vào một khung đề (KTTX/KTGK/KTCK): dùng chung pipeline import + AI phân tích
app.post("/api/exams/specs/:id/import", requireLogin, requireRole("teacher", "admin"), async (req, res) => {
  try {
    await assessmentReady;
    const spec = unitsData.examSpec(String(req.params.id));
    if (!spec) return res.status(404).json({ success: false, message: "Không tìm thấy khung đề này." });
    const { fileBase64, documentBase64, fileName = "de.docx", className, matrixId, title } = req.body || {};
    const raw = fileBase64 || documentBase64;
    if (!raw) return res.status(400).json({ success: false, message: "Vui lòng chọn tệp đề Word." });
    const buffer = Buffer.from(String(raw).split(",").pop(), "base64");
    const extracted = await mammoth.extractRawText({ buffer });
    const test = parseDocxAssessment(extracted.value, String(title || spec.name));
    const matrix = await loadMatrix(matrixId);
    const analysis = await analyzeAndBuildVariants(test, matrix);
    const safeType = String(spec.type || "KTTX").toLowerCase();
    const unitNo = spec.type === "KTTX" && Array.isArray(spec.units) && spec.units.length === 1 ? spec.units[0] : null;
    const assignedClass = String(className || "").trim() || null;
    const [result] = hasCol("imported_tests", "test_type")
      ? await pool.execute(
          "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json, analysis_json, matrix_id, duration_minutes, test_type, semester, unit_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [req.user.userId, test.title, String(fileName).slice(0, 255), assignedClass, JSON.stringify({ ...test, specId: spec.id }), JSON.stringify(test.summary), JSON.stringify(analysis), matrix ? matrix.id : null, analysis.variants.full.durationMinutes, safeType, Number(spec.term) === 2 ? 2 : 1, unitNo]
        )
      : await pool.execute(
          "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json) VALUES (?, ?, ?, ?, ?, ?)",
          [req.user.userId, test.title, String(fileName).slice(0, 255), assignedClass, JSON.stringify({ ...test, analysis, specId: spec.id }), JSON.stringify(test.summary)]
        );
    return res.json({ success: true, testId: result.insertId, specId: spec.id, questionCount: test.questions.length, expected: (spec.sections || []).reduce((a, x) => a + Number(x.n || 0), 0), summary: test.summary, message: `Đã nạp ${test.questions.length} câu vào khung "${spec.name}".` });
  } catch (error) {
    console.error("Lỗi nạp đề vào khung:", error);
    return res.status(400).json({ success: false, message: error.message || "Không nạp được đề. Kiểm tra lại tệp Word." });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`Website đang chạy tại http://localhost:${port}`);
  console.log(`Kiểm tra MySQL tại http://localhost:${port}/api/health`);
});
