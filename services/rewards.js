const pool = require("../database/db");

const DAILY_CARROT_CAP = Math.max(1, Number(process.env.DAILY_CARROT_CAP) || 30);
const MAX_XP_PER_EVENT = 150;
const MAX_CARROTS_PER_EVENT = 10;
const START_CARROTS = 15;

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS student_rewards (
        user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        xp INT NOT NULL DEFAULT 0,
        carrots INT NOT NULL DEFAULT ${START_CARROTS},
        fed_carrots INT NOT NULL DEFAULT 0,
        daily_date DATE NULL,
        daily_carrots INT NOT NULL DEFAULT 0,
        avatar_type VARCHAR(10) NOT NULL DEFAULT 'initials',
        avatar_value MEDIUMTEXT NULL,
        avatar_color VARCHAR(9) NULL,
        imported TINYINT(1) NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_rewards_xp (xp),
        INDEX idx_rewards_carrots (carrots)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => true).catch(e => { ready = null; throw e; });
  }
  return ready;
}

function vnToday() {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}
function dateOnly(v) {
  if (!v) return "";
  if (v instanceof Date) return new Date(v.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
function levelOf(xp) {
  const x = Math.max(0, Number(xp) || 0);
  return { level: Math.floor(x / 100) + 1, within: x % 100 };
}

async function getRow(userId, conn = pool) {
  await ensureTable();
  await conn.execute("INSERT IGNORE INTO student_rewards (user_id) VALUES (?)", [userId]);
  const [rows] = await conn.execute("SELECT * FROM student_rewards WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0];
}

function publicRewards(row) {
  const today = vnToday();
  const dailyCarrots = dateOnly(row.daily_date) === today ? Number(row.daily_carrots) : 0;
  const lv = levelOf(row.xp);
  return {
    xp: Number(row.xp),
    carrots: Number(row.carrots),
    fedCarrots: Number(row.fed_carrots),
    level: lv.level,
    levelProgress: lv.within,
    dailyCarrots,
    dailyCap: DAILY_CARROT_CAP,
    dailyLeft: Math.max(0, DAILY_CARROT_CAP - dailyCarrots),
    avatar: avatarOf(row),
    imported: Boolean(row.imported),
  };
}

function avatarOf(row) {
  if (!row) return { type: "initials" };
  if (row.avatar_type === "image" && row.avatar_value) return { type: "image", value: row.avatar_value };
  return { type: "initials" };
}

async function getRewards(userId) {
  return publicRewards(await getRow(userId));
}

async function earn(userId, xp, carrots) {
  const wantXp = Math.max(0, Math.min(MAX_XP_PER_EVENT, Math.round(Number(xp) || 0)));
  const wantCarrots = Math.max(0, Math.min(MAX_CARROTS_PER_EVENT, Math.round(Number(carrots) || 0)));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT * FROM student_rewards WHERE user_id = ? FOR UPDATE", [userId]);
    const row = rows[0];
    const today = vnToday();
    const usedToday = dateOnly(row.daily_date) === today ? Number(row.daily_carrots) : 0;
    const grantedCarrots = Math.max(0, Math.min(wantCarrots, DAILY_CARROT_CAP - usedToday));
    await conn.execute(
      "UPDATE student_rewards SET xp = xp + ?, carrots = carrots + ?, daily_date = ?, daily_carrots = ? WHERE user_id = ?",
      [wantXp, grantedCarrots, today, usedToday + grantedCarrots, userId]
    );
    await conn.commit();
    const fresh = await getRow(userId);
    return { ...publicRewards(fresh), grantedXp: wantXp, grantedCarrots, cappedCarrots: wantCarrots - grantedCarrots };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

async function feed(userId, amount) {
  const want = Math.max(1, Math.min(10, Math.round(Number(amount) || 5)));
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT carrots FROM student_rewards WHERE user_id = ? FOR UPDATE", [userId]);
    const have = Number(rows[0].carrots);
    const used = Math.min(want, have);
    if (used > 0) {
      await conn.execute("UPDATE student_rewards SET carrots = carrots - ?, fed_carrots = fed_carrots + ?, xp = xp + ? WHERE user_id = ?", [used, used, used * 5, userId]);
    }
    await conn.commit();
    return { ...publicRewards(await getRow(userId)), fed: used };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

async function importLocal(userId, local) {
  const row = await getRow(userId);
  if (row.imported) return publicRewards(row);
  const xp = Math.max(0, Math.min(20000, Math.round(Number(local && local.points) || 0)));
  const carrots = Math.max(0, Math.min(500, Math.round(Number(local && local.carrots) || 0)));
  const fed = Math.max(0, Math.min(500, Math.round(Number(local && local.fedCarrots) || 0)));
  await pool.execute(
    "UPDATE student_rewards SET xp = GREATEST(xp, ?), carrots = GREATEST(carrots, ?), fed_carrots = GREATEST(fed_carrots, ?), imported = 1 WHERE user_id = ?",
    [xp, carrots, fed, userId]
  );
  return publicRewards(await getRow(userId));
}

async function setAvatar(userId, body) {
  await getRow(userId);
  const type = String(body && body.type || "");
  if (type === "initials") {
    await pool.execute("UPDATE student_rewards SET avatar_type = 'initials', avatar_value = NULL, avatar_color = NULL WHERE user_id = ?", [userId]);
  } else if (type === "image") {
    const v = String(body.value || "");
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(v)) throw new Error("Ảnh không hợp lệ.");
    if (v.length > 120000) throw new Error("Ảnh quá lớn, hãy chọn ảnh khác.");
    await pool.execute("UPDATE student_rewards SET avatar_type = 'image', avatar_value = ?, avatar_color = NULL WHERE user_id = ?", [v, userId]);
  } else {
    throw new Error("Loại ảnh đại diện không hợp lệ.");
  }
  return publicRewards(await getRow(userId));
}

function gradeOf(className) {
  const m = String(className || "").trim().match(/^([6-9])/);
  return m ? m[1] : null;
}

async function leaderboard(userId, { by = "xp", scope = "class", limit = 20 } = {}) {
  await ensureTable();
  const [meRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [userId]);
  const myClass = meRows[0] && meRows[0].class_name ? String(meRows[0].class_name) : null;
  const orderCol = by === "carrots" ? "COALESCE(r.carrots, 0) + COALESCE(r.fed_carrots, 0)" : "COALESCE(r.xp, 0)";
  const where = ["u.role = 'student'", "u.status = 'active'"];
  const params = [];
  if (scope === "class" && myClass) { where.push("u.class_name = ?"); params.push(myClass); }
  else if (scope === "grade" && gradeOf(myClass)) { where.push("u.class_name LIKE ?"); params.push(gradeOf(myClass) + "%"); }
  const base = `FROM users u LEFT JOIN student_rewards r ON r.user_id = u.id WHERE ${where.join(" AND ")}`;
  const cap = Math.max(5, Math.min(50, Number(limit) || 20));
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.class_name, COALESCE(r.xp, 0) AS xp, COALESCE(r.carrots, ${START_CARROTS}) AS carrots,
            COALESCE(r.fed_carrots, 0) AS fed_carrots, r.avatar_type, r.avatar_value, r.avatar_color, ${orderCol} AS score
     ${base} ORDER BY score DESC, u.full_name ASC LIMIT ${cap}`, params);
  const [myScoreRows] = await pool.query(`SELECT ${orderCol} AS score ${base} AND u.id = ?`, [...params, userId]);
  let me = null;
  if (myScoreRows.length) {
    const myScore = Number(myScoreRows[0].score);
    const [ahead] = await pool.query(`SELECT COUNT(*) AS n ${base} AND ${orderCol} > ?`, [...params, myScore]);
    me = { rank: Number(ahead[0].n) + 1, score: myScore };
  }
  const [total] = await pool.query(`SELECT COUNT(*) AS n ${base}`, params);
  let rank = 0, prev = null;
  const list = rows.map((r, i) => {
    const score = Number(r.score);
    if (score !== prev) { rank = i + 1; prev = score; }
    return {
      rank,
      id: r.id,
      name: r.full_name,
      className: r.class_name,
      xp: Number(r.xp),
      level: levelOf(r.xp).level,
      carrots: Number(r.carrots) + Number(r.fed_carrots),
      score,
      avatar: avatarOf(r),
      isMe: Number(r.id) === Number(userId),
    };
  });
  return { by: by === "carrots" ? "carrots" : "xp", scope, className: myClass, total: Number(total[0].n), list, me };
}

async function avatarsFor(userIds) {
  await ensureTable();
  if (!userIds.length) return {};
  const [rows] = await pool.query("SELECT user_id, avatar_type, avatar_value, avatar_color FROM student_rewards WHERE user_id IN (?)", [userIds]);
  return Object.fromEntries(rows.map(r => [r.user_id, avatarOf(r)]));
}

module.exports = {
  DAILY_CARROT_CAP,
  ensureTable, getRewards, earn, feed, importLocal, setAvatar, leaderboard, avatarsFor, levelOf,
};
