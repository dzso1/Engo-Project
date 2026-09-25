const fs = require("fs");
const path = require("path");
const vm = require("vm");
const pool = require("../database/db");

const DATA_FILE = path.join(__dirname, "../public/data/word-families.js");
const POS = ["n", "v", "adj", "adv"];

let ready = null;
function ensureTable() {
  if (ready) return ready;
  ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS word_families (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      grade TINYINT NOT NULL DEFAULT 9,
      unit TINYINT NOT NULL,
      root VARCHAR(60) NOT NULL,
      members_json JSON NOT NULL,
      items_json JSON NOT NULL,
      source VARCHAR(10) NOT NULL DEFAULT 'seed',
      created_by BIGINT UNSIGNED NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_wf (grade, unit, root),
      INDEX idx_wf_unit (grade, unit)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await seed();
    return true;
  })().catch(e => { ready = null; throw e; });
  return ready;
}

function readSeed() {
  if (!fs.existsSync(DATA_FILE)) return {};
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(DATA_FILE, "utf8"), ctx);
  return ctx.window.ENGO_WORD_FAMILIES || {};
}

function clean(fam) {
  const members = (Array.isArray(fam.members) ? fam.members : [])
    .map(m => ({ w: String(m.w || "").trim().toLowerCase().slice(0, 40), pos: POS.includes(m.pos) ? m.pos : "n", vi: String(m.vi || "").trim().slice(0, 80) }))
    .filter(m => /^[a-z][a-z'\- ]*$/.test(m.w));
  const words = members.map(m => m.w);
  const root = String(fam.root || (members[0] && members[0].w) || "").trim().toLowerCase();
  const items = (Array.isArray(fam.items) ? fam.items : [])
    .map(it => ({ s: String(it.s || "").trim().slice(0, 240), a: String(it.a || "").trim().toLowerCase() }))
    .filter(it => (it.s.match(/_{2,}/g) || []).length === 1 && words.includes(it.a))
    .map(it => ({ ...it, s: it.s.replace(/_{2,}/, "____") }));
  if (members.length < 2 || !words.includes(root)) throw Object.assign(new Error("Họ từ cần ít nhất 2 từ và phải chứa từ gốc."), { status: 400 });
  return { root, members, items };
}

async function seed() {
  const data = readSeed();
  for (const [key, list] of Object.entries(data)) {
    const unit = Number(String(key).replace(/\D/g, ""));
    if (!unit) continue;
    for (const fam of list || []) {
      try {
        const c = clean(fam);
        await pool.execute("INSERT IGNORE INTO word_families (grade, unit, root, members_json, items_json, source) VALUES (9, ?, ?, ?, ?, 'seed')", [unit, c.root, JSON.stringify(c.members), JSON.stringify(c.items)]);
      } catch (e) {}
    }
  }
}

function toApi(r) {
  const parse = v => (typeof v === "string" ? JSON.parse(v) : v) || [];
  return { id: r.id, grade: r.grade, unit: r.unit, root: r.root, members: parse(r.members_json), items: parse(r.items_json), source: r.source };
}

async function list({ grade = 9, unit = null } = {}) {
  await ensureTable();
  const params = [Number(grade) || 9];
  let sql = "SELECT * FROM word_families WHERE grade = ?";
  if (unit) { sql += " AND unit = ?"; params.push(Number(unit)); }
  sql += " ORDER BY unit, root";
  const [rows] = await pool.execute(sql, params);
  return rows.map(toApi);
}

async function save({ id, grade = 9, unit, root, members, items }, userId) {
  await ensureTable();
  const u = Number(unit);
  if (!(u >= 1 && u <= 12)) throw Object.assign(new Error("Unit không hợp lệ."), { status: 400 });
  const c = clean({ root, members, items });
  if (id) {
    const [r] = await pool.execute("UPDATE word_families SET unit = ?, root = ?, members_json = ?, items_json = ?, source = 'teacher', created_by = ? WHERE id = ?", [u, c.root, JSON.stringify(c.members), JSON.stringify(c.items), userId, id]);
    if (!r.affectedRows) throw Object.assign(new Error("Không tìm thấy họ từ."), { status: 404 });
    return Number(id);
  }
  const [r] = await pool.execute("INSERT INTO word_families (grade, unit, root, members_json, items_json, source, created_by) VALUES (?, ?, ?, ?, ?, 'teacher', ?) ON DUPLICATE KEY UPDATE members_json = VALUES(members_json), items_json = VALUES(items_json), source = 'teacher', created_by = VALUES(created_by)", [Number(grade) || 9, u, c.root, JSON.stringify(c.members), JSON.stringify(c.items), userId]);
  return r.insertId;
}

async function remove(id) {
  await ensureTable();
  await pool.execute("DELETE FROM word_families WHERE id = ?", [id]);
}

module.exports = { ensureTable, list, save, remove, seed };
