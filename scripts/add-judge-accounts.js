// Tạo (hoặc đặt lại) các tài khoản dùng thử dành cho Ban giám khảo.
// Chạy: node scripts/add-judge-accounts.js            (dùng DB trong .env)
//       railway run node scripts/add-judge-accounts.js (dùng DB trên Railway)
// Chạy lại bao nhiêu lần cũng được: tài khoản đã có sẽ được đặt lại mật khẩu, mở khoá, gán lại lớp.
require("dotenv").config();
const bcrypt = require("bcryptjs");
const pool = require("../database/db");
const scope = require("../services/scope");

const CLASS_NAME = "9GK";            // lớp riêng cho giám khảo, không lẫn dữ liệu học sinh thật
const PASSWORD = "Engo@2026";

const STUDENTS = [
  ["Học sinh Giám khảo 1", "hs1.giamkhao@engo.web"],
  ["Học sinh Giám khảo 2", "hs2.giamkhao@engo.web"],
  ["Học sinh Giám khảo 3", "hs3.giamkhao@engo.web"],
  ["Học sinh Giám khảo 4", "hs4.giamkhao@engo.web"],
];
const TEACHERS = [
  ["Giáo viên Giám khảo 1", "gv1.giamkhao@engo.web"],
  ["Giáo viên Giám khảo 2", "gv2.giamkhao@engo.web"],
];
// Phụ huynh giám khảo: đăng nhập bằng email, theo dõi con là "Học sinh Giám khảo 1"
const PARENTS = [
  ["Phụ huynh Giám khảo 1", "ph1.giamkhao@engo.web"],
];

async function columns(table) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM ${table}`);
  return new Set(rows.map(r => r.Field));
}

async function upsertUser(fullName, email, role, className, hash, cols) {
  const [found] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
  if (found.length) {
    const sets = ["full_name = ?", "password_hash = ?", "role = ?", "class_name = ?", "status = 'active'"];
    const params = [fullName, hash, role, className];
    if (cols.has("password")) { sets.push("password = ?"); params.push(hash); }
    if (cols.has("must_change_password")) sets.push("must_change_password = 0");
    if (cols.has("lock_reason")) sets.push("lock_reason = NULL");
    await pool.execute(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`, [...params, found[0].id]);
    return { id: Number(found[0].id), status: "đặt lại" };
  }
  const names = ["full_name", "email", "password_hash", "role", "class_name", "status"];
  const vals = [fullName, email, hash, role, className, "active"];
  if (cols.has("password")) { names.push("password"); vals.push(hash); }
  if (cols.has("must_change_password")) { names.push("must_change_password"); vals.push(0); }
  const [r] = await pool.execute(`INSERT INTO users (${names.join(", ")}) VALUES (${names.map(() => "?").join(", ")})`, vals);
  return { id: Number(r.insertId), status: "mới" };
}

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const cols = await columns("users");
  const rows = [];

  const studentIds = [];
  for (const [name, email] of STUDENTS) {
    const r = await upsertUser(name, email, "student", CLASS_NAME, hash, cols);
    studentIds.push(r.id); rows.push({ vai_tro: "Học sinh", ho_ten: name, email, lop: CLASS_NAME, trang_thai: r.status });
  }
  const teacherIds = [];
  for (const [name, email] of TEACHERS) {
    const r = await upsertUser(name, email, "teacher", null, hash, cols);
    teacherIds.push(r.id); rows.push({ vai_tro: "Giáo viên", ho_ten: name, email, lop: CLASS_NAME, trang_thai: r.status });
  }

  // Phụ huynh giám khảo liên kết với Học sinh Giám khảo 1
  await scope.ensureTables();
  for (const [name, email] of PARENTS) {
    const r = await upsertUser(name, email, "parent", null, hash, cols);
    await pool.execute("INSERT IGNORE INTO parent_students (parent_id, student_id) VALUES (?, ?)", [r.id, studentIds[0]]);
    rows.push({ vai_tro: "Phụ huynh", ho_ten: name, email, lop: `con: ${STUDENTS[0][0]}`, trang_thai: r.status });
  }

  // Lớp 9GK: lớp tăng cường (nhận đề đầy đủ)
  try { await pool.query("INSERT INTO class_settings (class_name, tier) VALUES (?, 'advanced') ON DUPLICATE KEY UPDATE tier = 'advanced'", [CLASS_NAME]); } catch (e) {}

  // Giáo viên giám khảo phụ trách lớp 9GK
  await pool.query("CREATE TABLE IF NOT EXISTS teacher_classes (teacher_id BIGINT UNSIGNED NOT NULL, class_name VARCHAR(50) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (teacher_id, class_name), INDEX idx_tc_class (class_name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
  for (const id of teacherIds) await pool.execute("INSERT IGNORE INTO teacher_classes (teacher_id, class_name) VALUES (?, ?)", [id, CLASS_NAME]);

  // 4 học sinh giám khảo là bạn bè của nhau để thử ngay Trò chuyện và Thách đấu
  try {
    for (let i = 0; i < studentIds.length; i++) {
      for (let j = i + 1; j < studentIds.length; j++) {
        const a = Math.min(studentIds[i], studentIds[j]), b = Math.max(studentIds[i], studentIds[j]);
        await pool.execute(
          "INSERT INTO friendships (user_a, user_b, status, requested_by, accepted_at) VALUES (?, ?, 'accepted', ?, NOW()) ON DUPLICATE KEY UPDATE status = 'accepted', accepted_at = COALESCE(accepted_at, NOW())",
          [a, b, a]);
      }
    }
  } catch (e) {
    console.log("(Chưa có bảng friendships – mở trang Bạn bè một lần rồi chạy lại lệnh này để kết bạn sẵn.)");
  }

  console.table(rows);
  console.log(`Mật khẩu chung: ${PASSWORD}  –  lớp ${CLASS_NAME}`);
  await pool.end();
}

main().catch(e => { console.error("Lỗi:", e.message); process.exit(1); });
