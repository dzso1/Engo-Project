const pool = require("../database/db");
const rbac = require("./rbac");

let ready = null;
function ensureTables() {
  if (ready) return ready;
  ready = (async () => {
    await pool.query("CREATE TABLE IF NOT EXISTS teacher_classes (teacher_id BIGINT UNSIGNED NOT NULL, class_name VARCHAR(50) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (teacher_id, class_name), INDEX idx_tc_class (class_name)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    await pool.query("CREATE TABLE IF NOT EXISTS parent_students (parent_id BIGINT UNSIGNED NOT NULL, student_id BIGINT UNSIGNED NOT NULL, created_by BIGINT UNSIGNED NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (parent_id, student_id), INDEX idx_ps_student (student_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    try { await pool.query("ALTER TABLE users ADD COLUMN phone VARCHAR(20) NULL"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD UNIQUE INDEX uq_users_phone (phone)"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN must_change_password TINYINT(1) NOT NULL DEFAULT 0"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN lock_reason VARCHAR(255) NULL"); } catch (e) {}
    try { await pool.query("ALTER TABLE users ADD COLUMN locked_at DATETIME NULL"); } catch (e) {}
    try { await pool.query("INSERT IGNORE INTO parent_students (parent_id, student_id) SELECT id, parent_student_id FROM users WHERE role = 'parent' AND parent_student_id IS NOT NULL"); } catch (e) {}
    return true;
  })().catch(e => { ready = null; throw e; });
  return ready;
}

function normalizePhone(v) {
  let s = String(v || "").replace(/[^\d+]/g, "");
  if (s.startsWith("+84")) s = "0" + s.slice(3);
  else if (s.startsWith("84") && s.length === 11) s = "0" + s.slice(2);
  s = s.replace(/\D/g, "");
  return /^0\d{9,10}$/.test(s) ? s : "";
}

async function teacherClasses(teacherId) {
  await ensureTables();
  const [rows] = await pool.execute("SELECT class_name FROM teacher_classes WHERE teacher_id = ? ORDER BY class_name", [teacherId]);
  return rows.map(r => r.class_name);
}

async function setTeacherClasses(teacherId, classes) {
  await ensureTables();
  const list = [...new Set((classes || []).map(c => String(c || "").trim().toUpperCase()).filter(c => /^[0-9A-Z]{2,10}$/.test(c)))].slice(0, 40);
  await pool.execute("DELETE FROM teacher_classes WHERE teacher_id = ?", [teacherId]);
  for (const c of list) await pool.execute("INSERT IGNORE INTO teacher_classes (teacher_id, class_name) VALUES (?, ?)", [teacherId, c]);
  return list;
}

async function childrenOf(parentId) {
  await ensureTables();
  const [rows] = await pool.execute("SELECT u.id, u.full_name, u.class_name, u.email FROM parent_students ps JOIN users u ON u.id = ps.student_id WHERE ps.parent_id = ? AND u.role = 'student' ORDER BY u.full_name", [parentId]);
  return rows;
}

async function scopeOf(user) {
  if (!user) return { none: true };
  if (rbac.can(user, "users.manage")) return { all: true };
  if (user.role === "teacher") return { classes: await teacherClasses(user.userId) };
  if (user.role === "parent") return { studentIds: (await childrenOf(user.userId)).map(c => c.id) };
  if (user.role === "student") return { studentIds: [Number(user.userId)] };
  return { none: true };
}

function filterSql(scope, alias = "u") {
  if (scope.all) return { sql: "1=1", params: [] };
  if (scope.classes) return scope.classes.length ? { sql: `${alias}.class_name IN (${scope.classes.map(() => "?").join(",")})`, params: scope.classes } : { sql: "1=0", params: [] };
  if (scope.studentIds) return scope.studentIds.length ? { sql: `${alias}.id IN (${scope.studentIds.map(() => "?").join(",")})`, params: scope.studentIds } : { sql: "1=0", params: [] };
  return { sql: "1=0", params: [] };
}

function inScope(scope, student) {
  if (!student) return false;
  if (scope.all) return true;
  if (scope.classes) return scope.classes.includes(String(student.class_name || "").toUpperCase());
  if (scope.studentIds) return scope.studentIds.map(Number).includes(Number(student.id));
  return false;
}

async function accessibleStudent(user, studentId) {
  await ensureTables();
  const [rows] = await pool.execute("SELECT id, full_name, email, class_name, status, created_at FROM users WHERE id = ? AND role = 'student' LIMIT 1", [studentId]);
  if (!rows.length) return null;
  return inScope(await scopeOf(user), rows[0]) ? rows[0] : null;
}

module.exports = { ensureTables, normalizePhone, teacherClasses, setTeacherClasses, childrenOf, scopeOf, filterSql, inScope, accessibleStudent };
