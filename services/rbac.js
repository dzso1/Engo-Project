const pool = require("../database/db");

const ROLES = [
  { key: "admin", label: "Quản trị viên" },
  { key: "teacher", label: "Giáo viên" },
  { key: "student", label: "Học sinh" },
  { key: "parent", label: "Phụ huynh" },
];

const PERMISSIONS = [
  { key: "users.manage", group: "Tài khoản", label: "Quản lý mọi tài khoản (tạo, sửa, xoá, khoá)", roles: ["admin"] },
  { key: "students.manage", group: "Tài khoản", label: "Quản lý học sinh các lớp phụ trách", roles: ["admin", "teacher"] },
  { key: "users.import", group: "Tài khoản", label: "Nhập danh sách tài khoản từ Excel/CSV", roles: ["admin", "teacher"] },
  { key: "parents.manage", group: "Tài khoản", label: "Tạo và liên kết tài khoản phụ huynh", roles: ["admin", "teacher"] },
  { key: "classes.assign_self", group: "Lớp học", label: "Tự chọn lớp phụ trách", roles: ["teacher"] },
  { key: "classes.settings", group: "Lớp học", label: "Cấu hình lớp (tăng cường / thường)", roles: ["admin", "teacher"] },
  { key: "tests.manage", group: "Học liệu", label: "Tải lên, sửa, xoá đề kiểm tra", roles: ["admin", "teacher"] },
  { key: "matrices.manage", group: "Học liệu", label: "Quản lý ma trận đề", roles: ["admin", "teacher"] },
  { key: "speaking.manage", group: "Học liệu", label: "Giao bài luyện nói", roles: ["admin", "teacher"] },
  { key: "wordforms.manage", group: "Học liệu", label: "Soạn họ từ (word family)", roles: ["admin", "teacher"] },
  { key: "grading.manage", group: "Đánh giá", label: "Chấm bài viết, xoá bài nộp", roles: ["admin", "teacher"] },
  { key: "results.view", group: "Đánh giá", label: "Xem kết quả kiểm tra của lớp", roles: ["admin", "teacher"] },
  { key: "progress.view", group: "Tiến trình", label: "Xem tiến trình học tập (trong phạm vi được phép)", roles: ["admin", "teacher", "parent", "student"] },
  { key: "reports.export", group: "Tiến trình", label: "Xuất ảnh báo cáo kết quả", roles: ["admin", "teacher", "parent", "student"] },
  { key: "tests.take", group: "Học tập", label: "Làm bài kiểm tra", roles: ["student"] },
  { key: "learning.record", group: "Học tập", label: "Ghi nhận học tập, nhận thưởng", roles: ["student"] },
  { key: "pvp.play", group: "Học tập", label: "Thi đấu PvP (với bạn hoặc bot)", roles: ["student"] },
  { key: "ai.use", group: "Hệ thống", label: "Dùng trợ lý AI", roles: ["admin", "teacher", "student", "parent"] },
  { key: "system.manage", group: "Hệ thống", label: "Phân quyền, trạng thái hệ thống, sao lưu", roles: ["admin"] },
];

const LOCKED = [["admin", "system.manage"], ["admin", "users.manage"]];

let cache = null;
let ready = null;

async function ensureTables() {
  if (ready) return ready;
  ready = (async () => {
    await pool.query("CREATE TABLE IF NOT EXISTS rbac_roles (role_key VARCHAR(30) NOT NULL PRIMARY KEY, label VARCHAR(100) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    await pool.query("CREATE TABLE IF NOT EXISTS rbac_permissions (perm_key VARCHAR(60) NOT NULL PRIMARY KEY, perm_group VARCHAR(60) NOT NULL, label VARCHAR(200) NOT NULL) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    await pool.query("CREATE TABLE IF NOT EXISTS rbac_role_permissions (role_key VARCHAR(30) NOT NULL, perm_key VARCHAR(60) NOT NULL, PRIMARY KEY (role_key, perm_key)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
    for (const r of ROLES) await pool.execute("INSERT INTO rbac_roles (role_key, label) VALUES (?, ?) ON DUPLICATE KEY UPDATE label = VALUES(label)", [r.key, r.label]);
    for (const p of PERMISSIONS) {
      const [res] = await pool.execute("INSERT IGNORE INTO rbac_permissions (perm_key, perm_group, label) VALUES (?, ?, ?)", [p.key, p.group, p.label]);
      if (res.affectedRows) for (const role of p.roles) await pool.execute("INSERT IGNORE INTO rbac_role_permissions (role_key, perm_key) VALUES (?, ?)", [role, p.key]);
      else await pool.execute("UPDATE rbac_permissions SET perm_group = ?, label = ? WHERE perm_key = ?", [p.group, p.label, p.key]);
    }
    for (const [role, perm] of LOCKED) await pool.execute("INSERT IGNORE INTO rbac_role_permissions (role_key, perm_key) VALUES (?, ?)", [role, perm]);
    await reload();
    return true;
  })().catch(e => { ready = null; throw e; });
  return ready;
}

function defaults() {
  const map = new Map(ROLES.map(r => [r.key, new Set()]));
  for (const p of PERMISSIONS) for (const role of p.roles) map.get(role).add(p.key);
  return map;
}

async function reload() {
  const [rows] = await pool.query("SELECT role_key, perm_key FROM rbac_role_permissions");
  const map = new Map(ROLES.map(r => [r.key, new Set()]));
  for (const r of rows) { if (!map.has(r.role_key)) map.set(r.role_key, new Set()); map.get(r.role_key).add(r.perm_key); }
  cache = map;
  return map;
}

function permsOf(role) {
  const map = cache || defaults();
  return [...(map.get(role) || [])];
}

function can(user, perm) {
  if (!user) return false;
  const map = cache || defaults();
  const set = map.get(user.role);
  return Boolean(set && set.has(perm));
}

function requirePermission(...perms) {
  return async (req, res, next) => {
    try { await ensureTables(); } catch (e) { cache = cache || defaults(); }
    if (req.user && perms.some(p => can(req.user, p))) return next();
    return res.status(403).json({ success: false, code: "FORBIDDEN", message: "Không có quyền thực hiện thao tác này." });
  };
}

async function matrix() {
  await ensureTables();
  await reload();
  return {
    roles: ROLES,
    permissions: PERMISSIONS.map(({ key, group, label }) => ({ key, group, label })),
    grants: Object.fromEntries([...cache.entries()].map(([k, v]) => [k, [...v]])),
    locked: LOCKED.map(([role, perm]) => `${role}:${perm}`),
  };
}

async function setGrants(grants) {
  await ensureTables();
  const valid = new Set(PERMISSIONS.map(p => p.key));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    for (const r of ROLES) {
      const list = Array.isArray(grants && grants[r.key]) ? grants[r.key].filter(p => valid.has(p)) : null;
      if (!list) continue;
      await conn.execute("DELETE FROM rbac_role_permissions WHERE role_key = ?", [r.key]);
      for (const p of new Set(list)) await conn.execute("INSERT INTO rbac_role_permissions (role_key, perm_key) VALUES (?, ?)", [r.key, p]);
    }
    for (const [role, perm] of LOCKED) await conn.execute("INSERT IGNORE INTO rbac_role_permissions (role_key, perm_key) VALUES (?, ?)", [role, perm]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
  await reload();
  return matrix();
}

module.exports = { ROLES, PERMISSIONS, ensureTables, requirePermission, can, permsOf, matrix, setGrants, reload };
