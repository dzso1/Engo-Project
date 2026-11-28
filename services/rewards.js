const pool = require("../database/db");

const DAILY_XP_SOFT_CAP = Math.max(50, Number(process.env.DAILY_XP_SOFT_CAP) || 300);
const DAILY_STUDY_CARROT_CAP = Math.max(1, Number(process.env.DAILY_STUDY_CARROT_CAP) || 16);
const DAILY_PVP_CARROT_CAP = Math.max(1, Number(process.env.DAILY_PVP_CARROT_CAP) || 8);
const DAILY_CARROT_CAP = DAILY_STUDY_CARROT_CAP + DAILY_PVP_CARROT_CAP;
const MAX_XP_PER_EVENT = 150;
const MAX_CARROTS_PER_EVENT = 10;
const START_CARROTS = 15;

let onActivityHook = null;
function setActivityHook(fn) {
  onActivityHook = typeof fn === "function" ? fn : null;
}

const CAPY_LEVELS = [
  { lv: 1, need: 10, name: "Capybara Mầm Non", next: "Capybara Chăm Chỉ", frame: "", perk: "" },
  { lv: 2, need: 20, name: "Capybara Chăm Chỉ", next: "Capybara Năng Động", frame: "", perk: "" },
  { lv: 3, need: 35, name: "Capybara Năng Động", next: "Capybara Học Giả", frame: "", perk: "" },
  { lv: 4, need: 50, name: "Capybara Học Giả", next: "Capybara Thông Thái", frame: "", perk: "" },
  { lv: 5, need: 70, name: "Capybara Thông Thái", next: "Capybara Tài Năng", frame: "silver", perk: "Khung Bạc" },
  { lv: 6, need: 90, name: "Capybara Tài Năng", next: "Capybara Thủ Lĩnh", frame: "silver", perk: "Khung Bạc" },
  { lv: 7, need: 110, name: "Capybara Thủ Lĩnh", next: "Capybara Huyền Thoại", frame: "gold", perk: "Khung Vàng" },
  { lv: 8, need: 130, name: "Capybara Huyền Thoại", next: "Capybara Tinh Anh", frame: "gold", perk: "Danh hiệu Bạn Thân Capybara" },
  { lv: 9, need: 150, name: "Capybara Tinh Anh", next: "Capybara Hoàng Gia", frame: "diamond", perk: "Khung Kim Cương" },
  { lv: 10, need: 0, name: "Capybara Hoàng Gia", next: "", frame: "royal", perk: "Hào quang Hoàng Gia & Danh hiệu Bậc Thầy" }
];

function capybaraOf(fed = 0) {
  let rem = Math.max(0, Number(fed) || 0);
  for (let i = 0; i < CAPY_LEVELS.length - 1; i++) {
    const c = CAPY_LEVELS[i];
    if (rem < c.need) {
      return {
        lv: c.lv,
        name: c.name,
        currentInLevel: rem,
        neededForNext: c.need,
        percent: Math.round((rem / c.need) * 100),
        nextName: c.next,
        frame: c.frame,
        perk: c.perk,
        isMax: false
      };
    }
    rem -= c.need;
  }
  const top = CAPY_LEVELS[CAPY_LEVELS.length - 1];
  return {
    lv: top.lv,
    name: top.name,
    currentInLevel: rem,
    neededForNext: 0,
    percent: 100,
    nextName: "",
    frame: top.frame,
    perk: top.perk,
    isMax: true
  };
}

function needForLevel(lv) {
  return Math.min(400, 100 + 25 * Math.max(0, lv - 1));
}

function levelOf(xp) {
  let rem = Math.max(0, Number(xp) || 0);
  let lv = 1;
  while (lv < 1000) {
    const need = needForLevel(lv);
    if (rem < need) {
      return { level: lv, within: rem, needed: need, percent: Math.round((rem / need) * 100) };
    }
    rem -= need;
    lv++;
  }
  return { level: lv, within: rem, needed: 400, percent: 100 };
}

function xpForLevel(targetLv) {
  const lv = Math.max(1, Math.round(Number(targetLv) || 1));
  let total = 0;
  for (let i = 1; i < lv; i++) total += needForLevel(i);
  return total;
}

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS student_rewards (
          user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
          xp INT NOT NULL DEFAULT 0,
          carrots INT NOT NULL DEFAULT ${START_CARROTS},
          fed_carrots INT NOT NULL DEFAULT 0,
          daily_date DATE NULL,
          daily_carrots INT NOT NULL DEFAULT 0,
          daily_xp INT NOT NULL DEFAULT 0,
          daily_study_carrots INT NOT NULL DEFAULT 0,
          daily_pvp_carrots INT NOT NULL DEFAULT 0,
          week_key VARCHAR(12) NULL,
          weekly_xp INT NOT NULL DEFAULT 0,
          avatar_type VARCHAR(10) NOT NULL DEFAULT 'initials',
          avatar_value MEDIUMTEXT NULL,
          avatar_color VARCHAR(9) NULL,
          imported TINYINT(1) NOT NULL DEFAULT 0,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_rewards_xp (xp),
          INDEX idx_rewards_carrots (carrots),
          INDEX idx_rewards_week (week_key, weekly_xp)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      const alters = [
        "ALTER TABLE student_rewards ADD COLUMN daily_xp INT NOT NULL DEFAULT 0",
        "ALTER TABLE student_rewards ADD COLUMN daily_study_carrots INT NOT NULL DEFAULT 0",
        "ALTER TABLE student_rewards ADD COLUMN daily_pvp_carrots INT NOT NULL DEFAULT 0",
        "ALTER TABLE student_rewards ADD COLUMN week_key VARCHAR(12) NULL",
        "ALTER TABLE student_rewards ADD COLUMN weekly_xp INT NOT NULL DEFAULT 0",
        "ALTER TABLE student_rewards ADD INDEX idx_rewards_week (week_key, weekly_xp)"
      ];
      for (const sql of alters) {
        try { await pool.query(sql); } catch (_) {}
      }
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reward_activity_log (
          user_id BIGINT UNSIGNED NOT NULL,
          activity VARCHAR(32) NOT NULL,
          ref_id VARCHAR(120) NOT NULL,
          day DATE NOT NULL,
          attempts INT NOT NULL DEFAULT 0,
          best_score DECIMAL(8,2) NULL,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id, activity, ref_id, day),
          INDEX idx_ral_best (user_id, activity, ref_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      return true;
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}

function vnToday(nowMs = Date.now()) {
  return new Date(nowMs + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

function vnWeekKey(nowMs = Date.now()) {
  const d = new Date(nowMs + 7 * 3600 * 1000);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function dateOnly(v) {
  if (!v) return "";
  if (v instanceof Date) return new Date(v.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

async function getRow(userId, conn = pool) {
  await ensureTable();
  await conn.execute("INSERT IGNORE INTO student_rewards (user_id) VALUES (?)", [userId]);
  const [rows] = await conn.execute("SELECT * FROM student_rewards WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0];
}

function avatarOf(row) {
  if (!row) return { type: "initials" };
  if (row.avatar_type === "image" && row.avatar_value) return { type: "image", value: row.avatar_value };
  return { type: "initials" };
}

function publicRewards(row) {
  const today = vnToday();
  const week = vnWeekKey();
  const isToday = dateOnly(row.daily_date) === today;
  const isThisWeek = String(row.week_key || "") === week;
  const dailyStudyCarrots = isToday ? Number(row.daily_study_carrots || 0) : 0;
  const dailyPvpCarrots = isToday ? Number(row.daily_pvp_carrots || 0) : 0;
  const dailyXp = isToday ? Number(row.daily_xp || 0) : 0;
  const weeklyXp = isThisWeek ? Number(row.weekly_xp || 0) : 0;
  const lv = levelOf(row.xp);
  const dailyStudyLeft = Math.max(0, DAILY_STUDY_CARROT_CAP - dailyStudyCarrots);
  const dailyPvpLeft = Math.max(0, DAILY_PVP_CARROT_CAP - dailyPvpCarrots);
  return {
    xp: Number(row.xp),
    carrots: Number(row.carrots),
    fedCarrots: Number(row.fed_carrots),
    level: lv.level,
    levelProgress: lv.within,
    levelNeeded: lv.needed,
    levelPercent: lv.percent,
    weeklyXp,
    weekKey: week,
    dailyXp,
    dailyXpSoftCap: DAILY_XP_SOFT_CAP,
    softCapped: dailyXp >= DAILY_XP_SOFT_CAP,
    dailyStudyCarrots,
    dailyStudyCap: DAILY_STUDY_CARROT_CAP,
    dailyStudyLeft,
    dailyPvpCarrots,
    dailyPvpCap: DAILY_PVP_CARROT_CAP,
    dailyPvpLeft,
    dailyCarrots: dailyStudyCarrots + dailyPvpCarrots,
    dailyCap: DAILY_CARROT_CAP,
    dailyLeft: dailyStudyLeft + dailyPvpLeft,
    capybara: capybaraOf(row.fed_carrots),
    avatar: avatarOf(row),
    imported: Boolean(row.imported)
  };
}

async function getRewards(userId) {
  return publicRewards(await getRow(userId));
}

const CLIENT_ACTIVITIES = new Set([
  "vocab", "grammar", "listening", "speaking", "test", "wordform",
  "healing_grammar", "healing_pron", "healing_review"
]);
const SERVER_ACTIVITIES = new Set(["pvp_bot", "pvp_human"]);

function computeActivityBase(activity, payload) {
  const maxScore = Number(payload.maxScore);
  const rawScore = Number(payload.score);
  const pct = maxScore > 0 && Number.isFinite(rawScore)
    ? Math.max(0, Math.min(100, (rawScore / maxScore) * 100))
    : Number.isFinite(rawScore)
      ? Math.max(0, Math.min(100, rawScore))
      : 0;
  const meta = payload.meta && typeof payload.meta === "object" ? payload.meta : {};

  switch (activity) {
    case "vocab":
      return {
        ...(pct >= 80 ? { baseXp: 30, baseCarrots: 2 } : pct >= 50 ? { baseXp: 20, baseCarrots: 0 } : { baseXp: 10, baseCarrots: 0 }),
        source: "study", trackScore: true, pct
      };
    case "grammar":
    case "listening":
      return {
        ...(pct >= 80 ? { baseXp: 30, baseCarrots: 3 } : { baseXp: 10, baseCarrots: 0 }),
        source: "study", trackScore: true, pct
      };
    case "speaking":
      return {
        ...(pct >= 90 ? { baseXp: 40, baseCarrots: 3 }
          : pct >= 75 ? { baseXp: 30, baseCarrots: 2 }
          : pct >= 60 ? { baseXp: 20, baseCarrots: 1 }
          : { baseXp: 10, baseCarrots: 0 }),
        source: "study", trackScore: true, pct
      };
    case "test":
      return {
        ...(pct >= 80 ? { baseXp: 40, baseCarrots: 3 } : { baseXp: 25, baseCarrots: 1 }),
        source: "study", trackScore: true, firstEverOnly: true, pct
      };
    case "wordform":
      return {
        ...(pct >= 80 ? { baseXp: Math.max(10, Math.round(pct / 5)), baseCarrots: 3 }
          : pct >= 50 ? { baseXp: Math.max(8, Math.round(pct / 5)), baseCarrots: 1 }
          : { baseXp: 5, baseCarrots: 0 }),
        source: "study", trackScore: true, pct
      };
    case "healing_grammar":
      return { baseXp: 15, baseCarrots: 1, source: "study", trackScore: false, pct: 100 };
    case "healing_pron":
      return { baseXp: 10, baseCarrots: 1, source: "study", trackScore: false, pct: 100 };
    case "healing_review": {
      const cnt = Math.max(1, Math.min(5, Math.round(Number.isFinite(rawScore) ? rawScore : 1)));
      return { baseXp: cnt * 5, baseCarrots: 0, source: "study", trackScore: false, pct: 100 };
    }
    case "pvp_bot": {
      const outcome = meta.outcome || "loss";
      const diff = ["easy", "normal", "hard"].includes(meta.difficulty) ? meta.difficulty : "normal";
      const winCfg = { easy: { xp: 10, carrots: 2 }, normal: { xp: 20, carrots: 4 }, hard: { xp: 35, carrots: 6 } }[diff];
      const rw = outcome === "win" ? winCfg : outcome === "draw" ? { xp: 8, carrots: 0 } : { xp: 4, carrots: 0 };
      return { baseXp: rw.xp, baseCarrots: rw.carrots, source: "pvp", trackScore: false, pct, outcome };
    }
    case "pvp_human": {
      const outcome = meta.outcome || "loss";
      let rw;
      if (outcome === "win") {
        const myR = Number(meta.myRating) || 1000;
        const opR = Number(meta.opponentRating) || 1000;
        const eloBonus = Math.max(0, Math.min(15, Math.round((opR - myR) / 25)));
        rw = { xp: 25 + eloBonus, carrots: 4 };
      } else {
        rw = outcome === "draw" ? { xp: 10, carrots: 0 } : { xp: 5, carrots: 0 };
      }
      return { baseXp: rw.xp, baseCarrots: rw.carrots, source: "pvp", trackScore: false, pct, outcome };
    }
    default:
      throw Object.assign(new Error("Hoạt động không hợp lệ."), { status: 400 });
  }
}

async function earnActivity(userId, payload = {}, { serverTrusted = false } = {}) {
  const activity = String(payload.activity || "").trim();
  if (!CLIENT_ACTIVITIES.has(activity) && !(serverTrusted && SERVER_ACTIVITIES.has(activity))) {
    throw Object.assign(new Error("Hoạt động không hợp lệ hoặc không được phép."), { status: 400 });
  }
  const refId = String(payload.refId || "default").trim().slice(0, 110) || "default";
  const spec = computeActivityBase(activity, payload);
  const today = vnToday();
  const week = vnWeekKey();

  const conn = await pool.getConnection();
  let response;
  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT * FROM student_rewards WHERE user_id = ? FOR UPDATE", [userId]);
    const row = rows[0];

    const isToday = dateOnly(row.daily_date) === today;
    const isThisWeek = String(row.week_key || "") === week;
    const usedXpToday = isToday ? Number(row.daily_xp || 0) : 0;
    const usedStudyToday = isToday ? Number(row.daily_study_carrots || 0) : 0;
    const usedPvpToday = isToday ? Number(row.daily_pvp_carrots || 0) : 0;
    const curWeeklyXp = isThisWeek ? Number(row.weekly_xp || 0) : 0;

    const [todayRows] = await conn.execute(
      "SELECT attempts FROM reward_activity_log WHERE user_id = ? AND activity = ? AND ref_id = ? AND day = ? LIMIT 1",
      [userId, activity, refId, today]
    );
    const todayAttempts = todayRows.length ? Number(todayRows[0].attempts || 0) : 0;

    const [allRows] = await conn.execute(
      "SELECT MAX(best_score) AS prev_best, COALESCE(SUM(attempts), 0) AS total_attempts FROM reward_activity_log WHERE user_id = ? AND activity = ? AND ref_id = ?",
      [userId, activity, refId]
    );
    const prevBest = allRows[0] && allRows[0].prev_best !== null ? Number(allRows[0].prev_best) : null;
    const totalAttempts = allRows[0] ? Number(allRows[0].total_attempts || 0) : 0;

    let diminishFactor = 1.0;
    let carrotFactor = 1.0;
    if (activity === "pvp_bot") {
      if (spec.outcome === "win" && todayAttempts >= 5) {
        diminishFactor = 0.2;
        carrotFactor = 0;
      }
    } else if (spec.firstEverOnly) {
      if (totalAttempts > 0) {
        diminishFactor = 0.2;
        carrotFactor = 0;
      }
    } else {
      if (todayAttempts === 1) {
        diminishFactor = 0.5;
        carrotFactor = 0.5;
      } else if (todayAttempts >= 2) {
        diminishFactor = 0.2;
        carrotFactor = 0;
      }
    }

    const personalBest = Boolean(spec.trackScore && prevBest !== null && spec.pct > prevBest);
    let xpAfterDim = Math.round(spec.baseXp * diminishFactor);
    if (spec.baseXp > 0 && xpAfterDim < 1) xpAfterDim = 1;
    if (personalBest) xpAfterDim = Math.round(xpAfterDim * 1.5);

    const carrotsAfterDim = carrotFactor === 0
      ? 0
      : carrotFactor < 1
        ? Math.floor(spec.baseCarrots * carrotFactor)
        : spec.baseCarrots;

    const fullRoom = Math.max(0, DAILY_XP_SOFT_CAP - usedXpToday);
    const fullPart = Math.min(xpAfterDim, fullRoom);
    const overflowPart = xpAfterDim - fullPart;
    const grantedXp = fullPart + (overflowPart > 0 ? Math.max(1, Math.round(overflowPart * 0.25)) : 0);
    const softCapped = overflowPart > 0;

    const isPvp = spec.source === "pvp";
    const capC = isPvp ? DAILY_PVP_CARROT_CAP : DAILY_STUDY_CARROT_CAP;
    const usedC = isPvp ? usedPvpToday : usedStudyToday;
    const grantedCarrots = Math.max(0, Math.min(carrotsAfterDim, capC - usedC));
    const cappedCarrots = Math.max(0, carrotsAfterDim - grantedCarrots);

    const newStudyToday = isPvp ? usedStudyToday : usedStudyToday + grantedCarrots;
    const newPvpToday = isPvp ? usedPvpToday + grantedCarrots : usedPvpToday;

    await conn.execute(
      `UPDATE student_rewards
       SET xp = xp + ?, carrots = carrots + ?,
           daily_date = ?, daily_xp = ?, daily_study_carrots = ?, daily_pvp_carrots = ?, daily_carrots = ?,
           week_key = ?, weekly_xp = ?
       WHERE user_id = ?`,
      [grantedXp, grantedCarrots, today, usedXpToday + grantedXp, newStudyToday, newPvpToday, newStudyToday + newPvpToday, week, curWeeklyXp + grantedXp, userId]
    );

    const logBest = spec.trackScore ? Number(spec.pct.toFixed(2)) : null;
    await conn.execute(
      `INSERT INTO reward_activity_log (user_id, activity, ref_id, day, attempts, best_score)
       VALUES (?, ?, ?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE
         attempts = attempts + 1,
         best_score = IF(best_score IS NULL, VALUES(best_score), IF(VALUES(best_score) IS NULL, best_score, GREATEST(best_score, VALUES(best_score))))`,
      [userId, activity, refId, today, logBest]
    );

    await conn.commit();
    const fresh = await getRow(userId);
    response = {
      ...publicRewards(fresh),
      grantedXp,
      grantedCarrots,
      cappedCarrots,
      softCapped,
      personalBest,
      diminished: diminishFactor < 1,
      repeatCount: todayAttempts + 1,
      source: spec.source
    };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }

  if (onActivityHook) {
    try { await onActivityHook(userId, { activity, refId, percent: spec.pct }); } catch (_) {}
  }
  return response;
}

async function grantDirect(userId, xp = 0, carrots = 0) {
  const addXp = Math.max(0, Math.min(500, Math.round(Number(xp) || 0)));
  const addCarrots = Math.max(0, Math.min(50, Math.round(Number(carrots) || 0)));
  const week = vnWeekKey();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT week_key, weekly_xp FROM student_rewards WHERE user_id = ? FOR UPDATE", [userId]);
    const isThisWeek = String(rows[0].week_key || "") === week;
    const nextWeeklyXp = (isThisWeek ? Number(rows[0].weekly_xp || 0) : 0) + addXp;
    await conn.execute(
      "UPDATE student_rewards SET xp = xp + ?, carrots = carrots + ?, week_key = ?, weekly_xp = ? WHERE user_id = ?",
      [addXp, addCarrots, week, nextWeeklyXp, userId]
    );
    await conn.commit();
    return { ...publicRewards(await getRow(userId)), grantedXp: addXp, grantedCarrots: addCarrots };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

async function earn(userId, xp, carrots, limits = {}) {
  const wantXp = Math.max(0, Math.min(limits.maxXp || MAX_XP_PER_EVENT, Math.round(Number(xp) || 0)));
  const wantCarrots = Math.max(0, Math.min(limits.maxCarrots || MAX_CARROTS_PER_EVENT, Math.round(Number(carrots) || 0)));
  return grantDirect(userId, wantXp, wantCarrots);
}

async function feed(userId, amount) {
  const want = Math.max(1, Math.min(10, Math.round(Number(amount) || 5)));
  const week = vnWeekKey();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT carrots, week_key, weekly_xp FROM student_rewards WHERE user_id = ? FOR UPDATE", [userId]);
    const have = Number(rows[0].carrots);
    const used = Math.min(want, have);
    if (used > 0) {
      const addXp = used * 5;
      const isThisWeek = String(rows[0].week_key || "") === week;
      const nextWeeklyXp = (isThisWeek ? Number(rows[0].weekly_xp || 0) : 0) + addXp;
      await conn.execute(
        "UPDATE student_rewards SET carrots = carrots - ?, fed_carrots = fed_carrots + ?, xp = xp + ?, week_key = ?, weekly_xp = ? WHERE user_id = ?",
        [used, used, addXp, week, nextWeeklyXp, userId]
      );
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

async function improvedLeaderboard(userId, myClass, where, params, cap, scope) {
  const [students] = await pool.query(
    `SELECT u.id, u.full_name, u.class_name, COALESCE(r.xp, 0) AS xp, COALESCE(r.fed_carrots, 0) AS fed_carrots,
            r.avatar_type, r.avatar_value, r.avatar_color
     FROM users u LEFT JOIN student_rewards r ON r.user_id = u.id
     WHERE ${where.join(" AND ")}`,
    params
  );
  const byId = new Map();
  for (const s of students) {
    byId.set(Number(s.id), { ...s, recentSum: 0, recentN: 0, priorSum: 0, priorN: 0 });
  }
  const ids = [...byId.keys()];
  if (!ids.length) return { by: "improved", scope, className: myClass, total: 0, list: [], me: null };

  const cutoff14 = Date.now() - 14 * 86400000;
  const addSample = (uid, pct, dt) => {
    const rec = byId.get(Number(uid));
    if (!rec || !Number.isFinite(pct)) return;
    const ms = new Date(dt).getTime();
    if (ms >= cutoff14) { rec.recentSum += pct; rec.recentN += 1; }
    else { rec.priorSum += pct; rec.priorN += 1; }
  };

  try {
    const [spk] = await pool.query(
      "SELECT student_id, accuracy, created_at FROM speaking_attempts WHERE student_id IN (?) AND created_at >= NOW() - INTERVAL 28 DAY",
      [ids]
    );
    for (const r of spk) addSample(r.student_id, Math.max(0, Math.min(100, Number(r.accuracy))), r.created_at);
  } catch (_) {}

  try {
    const [evs] = await pool.query(
      "SELECT student_id, score, max_score, created_at FROM learning_events WHERE student_id IN (?) AND max_score > 0 AND created_at >= NOW() - INTERVAL 28 DAY",
      [ids]
    );
    for (const r of evs) {
      const pct = Math.max(0, Math.min(100, (Number(r.score) / Number(r.max_score)) * 100));
      addSample(r.student_id, pct, r.created_at);
    }
  } catch (_) {}

  try {
    const [subs] = await pool.query(
      `SELECT ws.student_id, ws.objective_score, ws.manual_score, ws.submitted_at, it.summary_json
       FROM writing_submissions ws JOIN imported_tests it ON it.id = ws.test_id
       WHERE ws.student_id IN (?) AND ws.submitted_at >= NOW() - INTERVAL 28 DAY`,
      [ids]
    );
    for (const r of subs) {
      const summary = typeof r.summary_json === "string" ? (() => { try { return JSON.parse(r.summary_json); } catch (_) { return {}; } })() : (r.summary_json || {});
      const maxPts = Number(summary.totalPoints || 10) || 10;
      const tot = Number(r.objective_score || 0) + (r.manual_score !== null && r.manual_score !== undefined ? Number(r.manual_score) : 0);
      addSample(r.student_id, Math.max(0, Math.min(100, (tot / maxPts) * 100)), r.submitted_at);
    }
  } catch (_) {}

  const eligible = [];
  for (const s of byId.values()) {
    if (s.priorN < 1 || s.recentN < 1) continue;
    const priorAvg = Number((s.priorSum / s.priorN).toFixed(1));
    const recentAvg = Number((s.recentSum / s.recentN).toFixed(1));
    const delta = Number((recentAvg - priorAvg).toFixed(1));
    eligible.push({
      id: s.id,
      name: s.full_name,
      className: s.class_name,
      xp: Number(s.xp),
      level: levelOf(s.xp).level,
      capybara: capybaraOf(s.fed_carrots),
      priorAvg,
      recentAvg,
      delta,
      samples: s.priorN + s.recentN,
      score: delta,
      avatar: avatarOf(s),
      isMe: Number(s.id) === Number(userId)
    });
  }
  eligible.sort((a, b) => (b.delta - a.delta) || (b.recentAvg - a.recentAvg) || a.name.localeCompare(b.name, "vi"));
  let rank = 0, prev = null;
  let me = null;
  const list = [];
  eligible.forEach((it, i) => {
    if (it.delta !== prev) { rank = i + 1; prev = it.delta; }
    it.rank = rank;
    if (it.isMe) me = { rank, score: it.delta };
    if (i < cap) list.push(it);
  });
  return { by: "improved", scope, className: myClass, total: eligible.length, list, me };
}

async function leaderboard(userId, { by = "weekly", scope = "class", limit = 20 } = {}) {
  await ensureTable();
  const mode = ["weekly", "improved", "xp", "carrots"].includes(by) ? by : "weekly";
  const [meRows] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [userId]);
  const myClass = meRows[0] && meRows[0].class_name ? String(meRows[0].class_name) : null;
  const where = ["u.role = 'student'", "u.status = 'active'"];
  const params = [];
  if (scope === "class" && myClass) { where.push("u.class_name = ?"); params.push(myClass); }
  else if (scope === "grade" && gradeOf(myClass)) { where.push("u.class_name LIKE ?"); params.push(gradeOf(myClass) + "%"); }
  const cap = Math.max(5, Math.min(50, Number(limit) || 20));

  if (mode === "improved") {
    return improvedLeaderboard(userId, myClass, where, params, cap, scope);
  }

  const week = vnWeekKey();
  let orderCol, orderArgs = [];
  if (mode === "carrots") {
    orderCol = "COALESCE(r.carrots, 0) + COALESCE(r.fed_carrots, 0)";
  } else if (mode === "weekly") {
    orderCol = "IF(r.week_key = ?, COALESCE(r.weekly_xp, 0), 0)";
    orderArgs = [week];
  } else {
    orderCol = "COALESCE(r.xp, 0)";
  }

  const base = `FROM users u LEFT JOIN student_rewards r ON r.user_id = u.id WHERE ${where.join(" AND ")}`;
  const [rows] = await pool.query(
    `SELECT u.id, u.full_name, u.class_name, COALESCE(r.xp, 0) AS xp, COALESCE(r.carrots, ${START_CARROTS}) AS carrots,
            COALESCE(r.fed_carrots, 0) AS fed_carrots, r.week_key, COALESCE(r.weekly_xp, 0) AS raw_weekly_xp,
            r.avatar_type, r.avatar_value, r.avatar_color, (${orderCol}) AS score
     ${base} ORDER BY score DESC, COALESCE(r.xp, 0) DESC, u.full_name ASC LIMIT ${cap}`,
    [...orderArgs, ...params]
  );
  const [myScoreRows] = await pool.query(
    `SELECT (${orderCol}) AS score ${base} AND u.id = ?`,
    [...orderArgs, ...params, userId]
  );
  let me = null;
  if (myScoreRows.length) {
    const myScore = Number(myScoreRows[0].score);
    const [ahead] = await pool.query(
      `SELECT COUNT(*) AS n ${base} AND (${orderCol}) > ?`,
      [...orderArgs, ...params, myScore]
    );
    me = { rank: Number(ahead[0].n) + 1, score: myScore };
  }
  const [total] = await pool.query(`SELECT COUNT(*) AS n ${base}`, params);
  let rank = 0, prev = null;
  const list = rows.map((r, i) => {
    const score = Number(r.score);
    if (score !== prev) { rank = i + 1; prev = score; }
    const weeklyXp = String(r.week_key || "") === week ? Number(r.raw_weekly_xp || 0) : 0;
    return {
      rank,
      id: r.id,
      name: r.full_name,
      className: r.class_name,
      xp: Number(r.xp),
      weeklyXp,
      level: levelOf(r.xp).level,
      carrots: Number(r.carrots) + Number(r.fed_carrots),
      capybara: capybaraOf(r.fed_carrots),
      score,
      avatar: avatarOf(r),
      isMe: Number(r.id) === Number(userId)
    };
  });
  return { by: mode, scope, weekKey: week, className: myClass, total: Number(total[0].n), list, me };
}

async function avatarsFor(userIds) {
  await ensureTable();
  if (!userIds.length) return {};
  const [rows] = await pool.query("SELECT user_id, avatar_type, avatar_value, avatar_color FROM student_rewards WHERE user_id IN (?)", [userIds]);
  return Object.fromEntries(rows.map(r => [r.user_id, avatarOf(r)]));
}

let adjustReady = null;
function ensureAdjustTable() {
  if (!adjustReady) adjustReady = pool.query(`CREATE TABLE IF NOT EXISTS reward_adjustments (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    admin_id BIGINT UNSIGNED NOT NULL,
    action VARCHAR(20) NOT NULL,
    before_json JSON NULL,
    after_json JSON NULL,
    note VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_adj_user (user_id, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`).catch(e => { adjustReady = null; throw e; });
  return adjustReady;
}

async function adminAdjust(userId, adminId, { level, addCarrots, setCarrots, note } = {}) {
  await ensureAdjustTable();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT xp, carrots FROM student_rewards WHERE user_id = ? FOR UPDATE", [userId]);
    const before = { xp: Number(rows[0].xp), carrots: Number(rows[0].carrots), level: levelOf(rows[0].xp).level };
    let xp = before.xp, carrots = before.carrots;
    const actions = [];
    if (level !== undefined && level !== null && level !== "") {
      const lv = Math.max(1, Math.min(200, Math.round(Number(level))));
      if (!Number.isFinite(lv)) throw Object.assign(new Error("Level không hợp lệ."), { status: 400 });
      xp = xpForLevel(lv);
      actions.push("level");
    }
    if (setCarrots !== undefined && setCarrots !== null && setCarrots !== "") {
      const c = Math.round(Number(setCarrots));
      if (!Number.isFinite(c) || c < 0 || c > 100000) throw Object.assign(new Error("Số cà rốt không hợp lệ."), { status: 400 });
      carrots = c;
      actions.push("set_carrots");
    }
    if (addCarrots !== undefined && addCarrots !== null && addCarrots !== "" && Number(addCarrots) !== 0) {
      const a = Math.round(Number(addCarrots));
      if (!Number.isFinite(a) || Math.abs(a) > 10000) throw Object.assign(new Error("Số cà rốt cộng thêm không hợp lệ (tối đa ±10000)."), { status: 400 });
      carrots = Math.max(0, carrots + a);
      actions.push("add_carrots");
    }
    if (!actions.length) throw Object.assign(new Error("Không có thay đổi nào."), { status: 400 });
    await conn.execute("UPDATE student_rewards SET xp = ?, carrots = ? WHERE user_id = ?", [xp, carrots, userId]);
    const after = { xp, carrots, level: levelOf(xp).level };
    await conn.execute("INSERT INTO reward_adjustments (user_id, admin_id, action, before_json, after_json, note) VALUES (?, ?, ?, ?, ?, ?)", [userId, adminId, actions.join(","), JSON.stringify(before), JSON.stringify(after), note ? String(note).slice(0, 255) : null]);
    await conn.commit();
    return { before, after, rewards: publicRewards(await getRow(userId)) };
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }
}

async function adjustHistory(userId) {
  await ensureAdjustTable();
  const [rows] = await pool.execute("SELECT a.action, a.before_json, a.after_json, a.note, a.created_at, u.full_name AS admin_name FROM reward_adjustments a LEFT JOIN users u ON u.id = a.admin_id WHERE a.user_id = ? ORDER BY a.id DESC LIMIT 10", [userId]);
  const parse = v => (typeof v === "string" ? JSON.parse(v) : v);
  return rows.map(r => ({ action: r.action, before: parse(r.before_json), after: parse(r.after_json), note: r.note, at: r.created_at, by: r.admin_name }));
}

module.exports = {
  DAILY_CARROT_CAP,
  DAILY_XP_SOFT_CAP,
  DAILY_STUDY_CARROT_CAP,
  DAILY_PVP_CARROT_CAP,
  CAPY_LEVELS,
  ensureTable,
  getRewards,
  earn,
  earnActivity,
  grantDirect,
  feed,
  importLocal,
  setAvatar,
  leaderboard,
  avatarsFor,
  levelOf,
  xpForLevel,
  capybaraOf,
  vnToday,
  vnWeekKey,
  setActivityHook,
  adminAdjust,
  adjustHistory
};
