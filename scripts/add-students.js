// ============================================================
// Thêm hàng loạt tài khoản học sinh vào CSDL (theo .env hiện tại)
// Email = tên (viết thường, không dấu, viết liền) + hậu tố lớp + @engo.web
//   node scripts/add-students.js <lớp> [file_ten.txt] [mật_khẩu]
//   vd: node scripts/add-students.js 9A5 scripts/students-9a5.txt 123456
// File tên: mỗi dòng một học sinh. Tài khoản đã tồn tại (trùng email) sẽ được bỏ qua.
// ============================================================
require("dotenv").config();
const fs = require("fs");
const bcrypt = require("bcryptjs");
const pool = require("../database/db");

function slugName(name) {
  return String(name || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const className = String(process.argv[2] || "").trim().toUpperCase();
  const file = process.argv[3];
  const password = process.argv[4] || "123456";
  if (!className || !file) { console.error("Dùng: node scripts/add-students.js <lớp> <file tên> [mật khẩu]"); process.exit(1); }
  const names = fs.readFileSync(file, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const suffix = className.toLowerCase();
  const hash = await bcrypt.hash(password, 12);
  const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
  const hasLegacyPassword = cols.length > 0;
  let added = 0, skipped = 0;
  const rows = [];
  for (const fullName of names) {
    // Trùng email: cùng tên -> bỏ qua; khác tên (vd Hoàng Lam / Hoàng Lâm) -> thêm số 2, 3...
    const base = slugName(fullName);
    let email = base + suffix + "@engo.web", dup = false;
    for (let n = 2; ; n++) {
      const [exists] = await pool.execute("SELECT full_name FROM users WHERE email = ? LIMIT 1", [email]);
      if (!exists.length) break;
      if (exists[0].full_name === fullName) { dup = true; break; }
      email = base + n + suffix + "@engo.web";
    }
    if (dup) { skipped++; rows.push({ fullName, email, status: "đã có" }); continue; }
    if (hasLegacyPassword) {
      await pool.execute("INSERT INTO users (full_name, email, password_hash, password, role, class_name, status) VALUES (?, ?, ?, ?, 'student', ?, 'active')", [fullName, email, hash, hash, className]);
    } else {
      await pool.execute("INSERT INTO users (full_name, email, password_hash, role, class_name, status) VALUES (?, ?, ?, 'student', ?, 'active')", [fullName, email, hash, className]);
    }
    added++; rows.push({ fullName, email, status: "mới" });
  }
  try { await pool.query("INSERT IGNORE INTO class_settings (class_name, tier) VALUES (?, 'regular')", [className]); } catch (e) {}
  console.table(rows);
  console.log(`Lớp ${className}: thêm ${added} tài khoản, bỏ qua ${skipped} (đã có). Mật khẩu mặc định: ${password}`);
  await pool.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
