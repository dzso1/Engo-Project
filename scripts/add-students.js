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

function initialsName(name) {
  const parts = String(name || "").trim().split(/\s+/).map(slugName).filter(Boolean);
  if (!parts.length) return "";
  const given = parts.pop();
  return parts.map(p => p[0]).join("") + given;
}

async function main() {
  const args = process.argv.slice(2);
  const useInitials = args.includes("--initials");
  const [classArg, file, passArg] = args.filter(a => !a.startsWith("--"));
  const className = String(classArg || "").trim().toUpperCase();
  const password = passArg || "123456";
  if (!className || !file) { console.error("Dùng: node scripts/add-students.js <lớp> <file tên> [mật khẩu] [--initials]"); process.exit(1); }
  const names = fs.readFileSync(file, "utf8").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const suffix = className.toLowerCase();
  const hash = await bcrypt.hash(password, 10);
  const [cols] = await pool.query("SHOW COLUMNS FROM users LIKE 'password'");
  const hasLegacyPassword = cols.length > 0;
  let added = 0, skipped = 0;
  const rows = [];
  for (const fullName of names) {
    const base = useInitials ? initialsName(fullName) : slugName(fullName);
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
