const pool = require("../database/db");

const KEYS = ["engoLearningStatsV3", "engoStreakCheckinV2", "engoHealingProfileV3", "engoVocabV1", "engoSpeakingLocalV1", "engoUnitsProgressV1", "engoNotificationsReadV3", "engoProfileV1"];
const MAX_BYTES = 2 * 1024 * 1024;

let ready = null;
function ensureTable() {
  if (!ready) {
    ready = pool.query(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id BIGINT UNSIGNED NOT NULL,
        data_key VARCHAR(64) NOT NULL,
        data_json MEDIUMTEXT NOT NULL,
        updated_at BIGINT NOT NULL DEFAULT 0,
        PRIMARY KEY (user_id, data_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `).then(() => true).catch(e => { ready = null; throw e; });
  }
  return ready;
}

async function getAll(userId) {
  await ensureTable();
  const [rows] = await pool.execute("SELECT data_key, data_json, updated_at FROM user_data WHERE user_id = ?", [userId]);
  const items = {};
  for (const r of rows) {
    if (!KEYS.includes(r.data_key)) continue;
    try { items[r.data_key] = { value: JSON.parse(r.data_json), updatedAt: Number(r.updated_at) || 0 }; } catch (_) {}
  }
  return items;
}

async function putMany(userId, items) {
  await ensureTable();
  const saved = {};
  for (const [key, entry] of Object.entries(items || {})) {
    if (!KEYS.includes(key) || !entry || entry.value === undefined) continue;
    const json = JSON.stringify(entry.value);
    if (Buffer.byteLength(json) > MAX_BYTES) continue;
    const at = Math.min(Date.now() + 60000, Number(entry.updatedAt) || Date.now());
    await pool.execute(
      "INSERT INTO user_data (user_id, data_key, data_json, updated_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE data_json = IF(VALUES(updated_at) >= updated_at, VALUES(data_json), data_json), updated_at = GREATEST(updated_at, VALUES(updated_at))",
      [userId, key, json, at]
    );
    saved[key] = at;
  }
  return saved;
}

module.exports = { KEYS, ensureTable, getAll, putMany };
