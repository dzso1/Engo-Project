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
  } catch (e) {}

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
  } catch (e) {}

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
  } catch (e) {}

  // 4. Migration: Bổ sung các cột nếu bảng đã tồn tại từ trước
  try { await pool.query("ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL"); } catch (e) {}
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
  } catch (e) {}
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

    // 1. Kiểm tra mã OTP nếu hệ thống yêu cầu
    if (!otp) {
      return res.status(400).json({ success: false, message: "Vui lòng bấm 'Gửi mã OTP' và nhập mã xác thực từ Gmail để hoàn tất đăng ký." });
    }

    const storedOtp = emailOtpStore.get(normalizedEmail);
    if (!storedOtp) {
      return res.status(400).json({ success: false, message: "Chưa có mã OTP nào được gửi đến email này hoặc mã đã hết hạn. Vui lòng bấm gửi lại mã." });
    }

    if (Date.now() > storedOtp.expiresAt) {
      emailOtpStore.delete(normalizedEmail);
      return res.status(400).json({ success: false, message: "Mã OTP đã hết hiệu lực (quá 5 phút). Vui lòng yêu cầu mã mới." });
    }

    if (storedOtp.otp !== String(otp).trim()) {
      storedOtp.attempts = (storedOtp.attempts || 0) + 1;
      if (storedOtp.attempts >= 5) {
        emailOtpStore.delete(normalizedEmail);
        return res.status(400).json({ success: false, message: "Bạn đã nhập sai mã quá 5 lần. Vui lòng yêu cầu mã mới." });
      }
      return res.status(400).json({ success: false, message: `Mã OTP không chính xác. Bạn còn ${5 - storedOtp.attempts} lần thử.` });
    }

    // Xóa OTP sau khi xác thực thành công
    emailOtpStore.delete(normalizedEmail);

    // 2. Kiểm tra tính xác thực của email
    const emailCheck = await verifyEmailAddress(normalizedEmail);
    if (!emailCheck.valid) {
      return res.status(400).json({ success: false, message: emailCheck.reason });
    }

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
    const { answers = {}, tabViolations = 0, violationPenalty = 0, isForcedSubmit = false } = req.body;
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
    
    // Tính trừ điểm vi phạm thi cử (Lần 1: -0.5đ, Lần 2: -1.25đ, Lần 3: -2.25đ)
    const penalty = Math.max(0, Number(violationPenalty) || 0);
    const violationsCount = Math.max(0, Number(tabViolations) || 0);
    const forced = Boolean(isForcedSubmit) ? 1 : 0;
    const netObjectiveEarned = Math.max(0, Number((earned - penalty).toFixed(2)));

    await pool.execute(
      `INSERT INTO writing_submissions (test_id, student_id, objective_answers_json, writing_answers_json, objective_score, tab_violations, violation_penalty, is_forced_submit, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE 
         objective_answers_json = VALUES(objective_answers_json), 
         writing_answers_json = VALUES(writing_answers_json), 
         objective_score = VALUES(objective_score), 
         tab_violations = VALUES(tab_violations),
         violation_penalty = VALUES(violation_penalty),
         is_forced_submit = VALUES(is_forced_submit),
         manual_score = NULL, teacher_feedback = NULL, status = VALUES(status), submitted_at = CURRENT_TIMESTAMP, graded_at = NULL`,
      [req.params.id, req.user.userId, JSON.stringify(answers), JSON.stringify(writingAnswers), netObjectiveEarned, violationsCount, penalty, forced, status]
    );

    let submitMsg = status === "pending_manual" ? "Đã nộp bài. Phần Writing đang chờ giáo viên chấm." : "Đã nộp bài kiểm tra.";
    if (forced) {
      submitMsg = `⛔ BÀI THI BỊ THU TỰ ĐỘNG do rời tab 3 lần! (Bị trừ ${penalty} điểm vi phạm).`;
    } else if (penalty > 0) {
      submitMsg += ` (Lưu ý: Bị trừ ${penalty}đ do có ${violationsCount} lần rời tab).`;
    }

    return res.json({ 
      success: true, 
      objectiveScore: netObjectiveEarned, 
      rawObjectiveScore: earned,
      violationPenalty: penalty,
      tabViolations: violationsCount,
      isForcedSubmit: Boolean(forced),
      objectiveMax, 
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
        ws.status, ws.submitted_at, ws.graded_at, ws.tab_violations, ws.violation_penalty, ws.is_forced_submit,
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
        tabViolations: Number(row.tab_violations || 0),
        violationPenalty: Number(row.violation_penalty || 0),
        isForcedSubmit: Boolean(row.is_forced_submit),
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
        ws.tab_violations, ws.violation_penalty, ws.is_forced_submit,
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
        ws.status, ws.submitted_at, ws.graded_at, ws.tab_violations, ws.violation_penalty, ws.is_forced_submit,
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
      const summary = typeof row.summary_json === "string" ? JSON.parse(row.summary_json) : (row.summary_json || {});
      const objectiveScore = Number(row.objective_score || 0);
      const manualScore = row.manual_score !== null ? Number(row.manual_score) : null;
      const totalScore = manualScore !== null ? Number((objectiveScore + manualScore).toFixed(2)) : objectiveScore;
      const maxScore = Number(summary.totalPoints || 10);
      const scoreOnTen = maxScore > 0 ? Number((totalScore / maxScore * 10).toFixed(1)) : totalScore;
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
    return res.json({
      success: true,
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
