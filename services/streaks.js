const pool = require("../database/db");
const rewards = require("./rewards");

const MAX_FREEZE_CARDS = 2;
const MILESTONES = [7, 30, 100];

const CHECKIN_REWARDS = [
  { day: 1, carrots: 1, xp: 15, icon: "<i class=ico-carrot></i>" },
  { day: 2, carrots: 1, xp: 20, icon: "<i class=ico-carrot></i>" },
  { day: 3, carrots: 2, xp: 25, icon: "<i class=ico-carrot></i>" },
  { day: 4, carrots: 2, xp: 30, icon: "<i class=ico-carrot></i>" },
  { day: 5, carrots: 3, xp: 35, icon: "<i class=ico-carrot></i>" },
  { day: 6, carrots: 3, xp: 40, icon: "<i class=ico-carrot></i>" },
  { day: 7, carrots: 5, xp: 60, freezeCard: 1, icon: "<i class=mi>workspace_premium</i>" }
];

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS student_streaks (
        user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
        streak INT NOT NULL DEFAULT 0,
        best_streak INT NOT NULL DEFAULT 0,
        last_claim_date DATE NULL,
        freeze_cards INT NOT NULL DEFAULT 0,
        last_freeze_used DATE NULL,
        total_claimed INT NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => true).catch(e => { ready = null; throw e; });
  }
  return ready;
}

function dateOnly(v) {
  if (!v) return "";
  if (v instanceof Date) return new Date(v.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function daysBetween(a, b) {
  if (!a || !b) return 999;
  const t1 = Date.parse(a + "T00:00:00Z");
  const t2 = Date.parse(b + "T00:00:00Z");
  return Math.round((t2 - t1) / 86400000);
}

async function getRow(userId, conn = pool) {
  await ensureTable();
  await conn.execute("INSERT IGNORE INTO student_streaks (user_id) VALUES (?)", [userId]);
  const [rows] = await conn.execute("SELECT * FROM student_streaks WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0];
}

function computeState(row, today = rewards.vnToday()) {
  const lastClaim = dateOnly(row.last_claim_date);
  const streak = Math.max(0, Number(row.streak || 0));
  const bestStreak = Math.max(streak, Number(row.best_streak || 0));
  const freezeCards = Math.max(0, Math.min(MAX_FREEZE_CARDS, Number(row.freeze_cards || 0)));

  let alreadyClaimed = false;
  let displayStreak = 0;
  let nextStreak = 1;
  let willUseFreeze = false;
  let broken = false;

  if (!lastClaim) {
    displayStreak = 0;
    nextStreak = 1;
  } else {
    const diff = daysBetween(lastClaim, today);
    if (diff <= 0) {
      alreadyClaimed = true;
      displayStreak = Math.max(1, streak);
      nextStreak = displayStreak;
    } else if (diff === 1) {
      displayStreak = streak;
      nextStreak = streak + 1;
    } else if (diff === 2 && freezeCards > 0) {
      displayStreak = streak;
      nextStreak = streak + 1;
      willUseFreeze = true;
    } else {
      displayStreak = 0;
      nextStreak = 1;
      broken = streak > 0;
    }
  }

  const cycleBase = alreadyClaimed ? displayStreak : nextStreak;
  const cycleDay = ((Math.max(1, cycleBase) - 1) % 7) + 1;
  const reward = CHECKIN_REWARDS[cycleDay - 1];

  return {
    today,
    lastClaimDate: lastClaim || null,
    alreadyClaimed,
    streak: displayStreak,
    nextStreak,
    bestStreak,
    cycleDay,
    freezeCards,
    maxFreezeCards: MAX_FREEZE_CARDS,
    willUseFreeze,
    broken,
    reward,
    track: CHECKIN_REWARDS,
    milestones: MILESTONES.map(days => ({ days, reached: bestStreak >= days }))
  };
}

async function getStreak(userId) {
  const row = await getRow(userId);
  return computeState(row, rewards.vnToday());
}

async function claim(userId) {
  const today = rewards.vnToday();
  const conn = await pool.getConnection();
  let stateAfter;
  let usedFreeze = false;
  let earnedFreeze = 0;
  let reward;

  try {
    await conn.beginTransaction();
    await getRow(userId, conn);
    const [rows] = await conn.execute("SELECT * FROM student_streaks WHERE user_id = ? FOR UPDATE", [userId]);
    const row = rows[0];
    const st = computeState(row, today);
    if (st.alreadyClaimed) {
      await conn.commit();
      return { ...st, alreadyClaimed: true, grantedXp: 0, grantedCarrots: 0, usedFreeze: false, earnedFreeze: 0, rewards: await rewards.getRewards(userId) };
    }

    reward = st.reward;
    usedFreeze = st.willUseFreeze;
    const newStreak = st.nextStreak;
    const newBest = Math.max(st.bestStreak, newStreak);
    let freeze = st.freezeCards - (usedFreeze ? 1 : 0);
    if (newStreak % 7 === 0 && freeze < MAX_FREEZE_CARDS) {
      freeze += 1;
      earnedFreeze = 1;
    }

    await conn.execute(
      `UPDATE student_streaks
       SET streak = ?, best_streak = ?, last_claim_date = ?, freeze_cards = ?,
           last_freeze_used = IF(? = 1, ?, last_freeze_used), total_claimed = total_claimed + 1
       WHERE user_id = ?`,
      [newStreak, newBest, today, freeze, usedFreeze ? 1 : 0, today, userId]
    );
    await conn.commit();
    const freshRow = await getRow(userId);
    stateAfter = computeState(freshRow, today);
  } catch (e) {
    await conn.rollback().catch(() => {});
    throw e;
  } finally {
    conn.release();
  }

  const rw = await rewards.grantDirect(userId, reward.xp, reward.carrots);
  return {
    ...stateAfter,
    usedFreeze,
    earnedFreeze,
    grantedXp: reward.xp,
    grantedCarrots: reward.carrots,
    rewards: rw
  };
}

async function getBestStreak(userId) {
  try {
    const row = await getRow(userId);
    return Math.max(Number(row.streak || 0), Number(row.best_streak || 0));
  } catch (_) {
    return 0;
  }
}

module.exports = {
  MAX_FREEZE_CARDS,
  CHECKIN_REWARDS,
  ensureTable,
  computeState,
  getStreak,
  claim,
  getBestStreak
};
