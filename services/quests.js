const pool = require("../database/db");
const rewards = require("./rewards");

const CHEST_XP = 40;
const CHEST_CARROTS = 4;

const QUEST_POOL = {
  vocab_quiz: {
    key: "vocab_quiz",
    skill: "Vocabulary",
    activities: ["vocab"],
    minPercent: 80,
    targetCount: 1,
    targetView: "vocabulary",
    title: "Hoàn thành 1 bộ từ vựng (≥ 80%)",
    xp: 20,
    carrots: 2
  },
  speaking_one: {
    key: "speaking_one",
    skill: "Speaking",
    activities: ["speaking"],
    minPercent: 70,
    targetCount: 1,
    targetView: "speaking-lab",
    title: "Hoàn thành 1 bài luyện nói (≥ 70%)",
    xp: 20,
    carrots: 2
  },
  grammar_unit: {
    key: "grammar_unit",
    skill: "Grammar",
    activities: ["grammar"],
    minPercent: 80,
    targetCount: 1,
    targetView: "vocabulary",
    title: "Hoàn thành 1 bài ngữ pháp Unit (≥ 80%)",
    xp: 20,
    carrots: 2
  },
  listening_one: {
    key: "listening_one",
    skill: "Listening",
    activities: ["listening"],
    minPercent: 80,
    targetCount: 1,
    targetView: "listening-lab",
    title: "Hoàn thành 1 bài luyện nghe (≥ 80%)",
    xp: 20,
    carrots: 2
  },
  wordform_one: {
    key: "wordform_one",
    skill: "Writing",
    activities: ["wordform"],
    minPercent: 70,
    targetCount: 1,
    targetView: "vocabulary",
    title: "Luyện 1 lượt Word Form (≥ 70%)",
    xp: 20,
    carrots: 2
  },
  healing_two: {
    key: "healing_two",
    skill: "Grammar",
    activities: ["healing_grammar", "healing_pron"],
    minPercent: 0,
    targetCount: 2,
    targetView: "errorHealing",
    title: "Chữa khỏi 2 lỗi trong Phòng chữa lỗi",
    xp: 20,
    carrots: 2
  },
  pvp_two: {
    key: "pvp_two",
    skill: "Reading",
    activities: ["pvp_bot", "pvp_human"],
    minPercent: 0,
    targetCount: 2,
    targetView: "pvp",
    title: "Chơi 2 trận Đấu trường (Bot hoặc Bạn)",
    xp: 20,
    carrots: 2
  }
};

let ready = null;
function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_quests (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
          user_id BIGINT UNSIGNED NOT NULL,
          day DATE NOT NULL,
          slot TINYINT NOT NULL,
          quest_key VARCHAR(40) NOT NULL,
          title VARCHAR(160) NOT NULL,
          target_view VARCHAR(40) NOT NULL,
          target_count TINYINT NOT NULL DEFAULT 1,
          progress TINYINT NOT NULL DEFAULT 0,
          min_percent TINYINT NOT NULL DEFAULT 0,
          reward_xp SMALLINT NOT NULL DEFAULT 20,
          reward_carrots TINYINT NOT NULL DEFAULT 2,
          claimed TINYINT(1) NOT NULL DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_dq_slot (user_id, day, slot)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS daily_quest_chests (
          user_id BIGINT UNSIGNED NOT NULL,
          day DATE NOT NULL,
          claimed TINYINT(1) NOT NULL DEFAULT 0,
          PRIMARY KEY (user_id, day)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      return true;
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}

function dayHash(userId, day) {
  let h = Number(userId) || 1;
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0;
  return h;
}

async function pickQuestsFor(userId, day) {
  let skills = null;
  try {
    const progressService = require("./progress");
    const p = await progressService.buildStudentProgress(userId);
    skills = p && p.skills ? p.skills : null;
  } catch (_) {}

  const poolList = Object.values(QUEST_POOL);
  const picked = [];
  const usedKeys = new Set();

  if (skills) {
    const sortedSkills = Object.entries(skills).sort((a, b) => a[1] - b[1]).map(([k]) => k);
    for (const sk of sortedSkills) {
      if (picked.length >= 2) break;
      const candidates = poolList.filter(q => q.skill === sk && !usedKeys.has(q.key));
      if (candidates.length) {
        const chosen = candidates[dayHash(userId, day + sk) % candidates.length];
        picked.push(chosen);
        usedKeys.add(chosen.key);
      }
    }
  }

  const fallbackOrder = ["vocab_quiz", "speaking_one", "listening_one", "grammar_unit", "wordform_one", "healing_two", "pvp_two"];
  const offset = dayHash(userId, day) % fallbackOrder.length;
  for (let i = 0; i < fallbackOrder.length && picked.length < 3; i++) {
    const key = fallbackOrder[(offset + i) % fallbackOrder.length];
    if (!usedKeys.has(key)) {
      picked.push(QUEST_POOL[key]);
      usedKeys.add(key);
    }
  }
  return picked.slice(0, 3);
}

async function ensureTodayQuests(userId, today = rewards.vnToday()) {
  await ensureTables();
  const [existing] = await pool.execute(
    "SELECT * FROM daily_quests WHERE user_id = ? AND day = ? ORDER BY slot ASC",
    [userId, today]
  );
  if (existing.length >= 3) return existing;

  const chosen = await pickQuestsFor(userId, today);
  for (let i = 0; i < chosen.length; i++) {
    const q = chosen[i];
    await pool.execute(
      `INSERT IGNORE INTO daily_quests
       (user_id, day, slot, quest_key, title, target_view, target_count, progress, min_percent, reward_xp, reward_carrots)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [userId, today, i + 1, q.key, q.title, q.targetView, q.targetCount, q.minPercent, q.xp, q.carrots]
    );
  }
  await pool.execute("INSERT IGNORE INTO daily_quest_chests (user_id, day) VALUES (?, ?)", [userId, today]);
  const [fresh] = await pool.execute(
    "SELECT * FROM daily_quests WHERE user_id = ? AND day = ? ORDER BY slot ASC",
    [userId, today]
  );
  return fresh;
}

async function getToday(userId) {
  const today = rewards.vnToday();
  const rows = await ensureTodayQuests(userId, today);
  const [chestRows] = await pool.execute("SELECT claimed FROM daily_quest_chests WHERE user_id = ? AND day = ? LIMIT 1", [userId, today]);
  const chestClaimed = Boolean(chestRows[0] && chestRows[0].claimed);
  const quests = rows.map(r => ({
    slot: Number(r.slot),
    key: r.quest_key,
    title: r.title,
    targetView: r.target_view,
    targetCount: Number(r.target_count),
    progress: Number(r.progress),
    minPercent: Number(r.min_percent),
    rewardXp: Number(r.reward_xp),
    rewardCarrots: Number(r.reward_carrots),
    done: Number(r.progress) >= Number(r.target_count),
    claimed: Boolean(r.claimed)
  }));
  const completedCount = quests.filter(q => q.done).length;
  return {
    day: today,
    quests,
    completedCount,
    totalCount: quests.length,
    chest: {
      ready: quests.length > 0 && completedCount === quests.length,
      claimed: chestClaimed,
      rewardXp: CHEST_XP,
      rewardCarrots: CHEST_CARROTS
    }
  };
}

async function recordProgress(userId, { activity, percent = 100 } = {}) {
  if (!activity) return { updatedCount: 0 };
  const today = rewards.vnToday();
  const rows = await ensureTodayQuests(userId, today);
  const pct = Number.isFinite(Number(percent)) ? Number(percent) : 100;
  let updatedCount = 0;
  for (const r of rows) {
    if (Number(r.claimed) || Number(r.progress) >= Number(r.target_count)) continue;
    const def = QUEST_POOL[r.quest_key];
    if (!def || !def.activities.includes(activity)) continue;
    if (pct < Number(r.min_percent || 0)) continue;
    const [res] = await pool.execute(
      "UPDATE daily_quests SET progress = LEAST(target_count, progress + 1) WHERE id = ? AND claimed = 0 AND progress < target_count",
      [r.id]
    );
    if (res.affectedRows > 0) updatedCount++;
  }
  return { updatedCount };
}

async function claimQuest(userId, { slot, chest = false } = {}) {
  const today = rewards.vnToday();
  await ensureTodayQuests(userId, today);
  const conn = await pool.getConnection();
  let grantXp = 0;
  let grantCarrots = 0;

  try {
    await conn.beginTransaction();
    if (chest) {
      const [qRows] = await conn.execute("SELECT progress, target_count FROM daily_quests WHERE user_id = ? AND day = ? FOR UPDATE", [userId, today]);
      if (qRows.length < 3 || !qRows.every(r => Number(r.progress) >= Number(r.target_count))) {
        throw Object.assign(new Error("Hãy hoàn thành đủ 3 nhiệm vụ hôm nay trước khi mở rương."), { status: 400 });
      }
      await conn.execute("INSERT IGNORE INTO daily_quest_chests (user_id, day) VALUES (?, ?)", [userId, today]);
      const [cRows] = await conn.execute("SELECT claimed FROM daily_quest_chests WHERE user_id = ? AND day = ? FOR UPDATE", [userId, today]);
      if (cRows[0] && Number(cRows[0].claimed)) {
        throw Object.assign(new Error("Bạn đã mở rương nhiệm vụ hôm nay rồi."), { status: 400 });
      }
      await conn.execute("UPDATE daily_quest_chests SET claimed = 1 WHERE user_id = ? AND day = ?", [userId, today]);
      grantXp = CHEST_XP;
      grantCarrots = CHEST_CARROTS;
    } else {
      const s = Math.round(Number(slot));
      if (![1, 2, 3].includes(s)) throw Object.assign(new Error("Nhiệm vụ không hợp lệ."), { status: 400 });
      const [rows] = await conn.execute("SELECT * FROM daily_quests WHERE user_id = ? AND day = ? AND slot = ? FOR UPDATE", [userId, today, s]);
      if (!rows.length) throw Object.assign(new Error("Không tìm thấy nhiệm vụ."), { status: 404 });
      const q = rows[0];
      if (Number(q.claimed)) throw Object.assign(new Error("Bạn đã nhận thưởng nhiệm vụ này rồi."), { status: 400 });
      if (Number(q.progress) < Number(q.target_count)) throw Object.assign(new Error("Nhiệm vụ chưa hoàn thành."), { status: 400 });
      await conn.execute("UPDATE daily_quests SET claimed = 1 WHERE id = ?", [q.id]);
      grantXp = Number(q.reward_xp);
      grantCarrots = Number(q.reward_carrots);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }

  const rw = await rewards.grantDirect(userId, grantXp, grantCarrots);
  return {
    ...(await getToday(userId)),
    grantedXp: grantXp,
    grantedCarrots: grantCarrots,
    rewards: rw
  };
}

module.exports = {
  QUEST_POOL,
  CHEST_XP,
  CHEST_CARROTS,
  ensureTables,
  getToday,
  recordProgress,
  claimQuest
};
