const pool = require("../database/db");
const rewards = require("./rewards");
const pvp = require("./pvp");

const MAX_LEN = 500;
const RATE = { windowMs: 30000, max: 15 };
const BAD_WORDS = ["đm", "dm", "đmm", "dmm", "vl", "vcl", "vkl", "cc", "clm", "cl", "đéo", "địt", "dit", "lồn", "buồi", "cặc", "đĩ", "ngu", "óc chó", "oc cho", "chó chết", "fuck", "shit", "bitch", "dick", "asshole", "bastard"];
const sentRecently = new Map();

let ready = null;
function ensureTables() {
  if (ready) return ready;
  ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS friendships (
      user_a BIGINT UNSIGNED NOT NULL,
      user_b BIGINT UNSIGNED NOT NULL,
      status VARCHAR(10) NOT NULL DEFAULT 'pending',
      requested_by BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      accepted_at TIMESTAMP NULL,
      PRIMARY KEY (user_a, user_b),
      INDEX idx_fr_b (user_b)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS user_blocks (
      user_id BIGINT UNSIGNED NOT NULL,
      blocked_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, blocked_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      sender_id BIGINT UNSIGNED NOT NULL,
      receiver_id BIGINT UNSIGNED NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      read_at TIMESTAMP NULL,
      INDEX idx_chat_pair (sender_id, receiver_id, id),
      INDEX idx_chat_unread (receiver_id, read_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    return true;
  })().catch(e => { ready = null; throw e; });
  return ready;
}

const err = (status, message) => Object.assign(new Error(message), { status });
const pair = (x, y) => (Number(x) < Number(y) ? [Number(x), Number(y)] : [Number(y), Number(x)]);

function cleanText(text) {
  let s = String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
  for (const w of BAD_WORDS) {
    const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})(?=$|[^\\p{L}\\p{N}])`, "giu");
    s = s.replace(re, (m, pre, word) => pre + "*".repeat(word.length));
  }
  return s;
}

async function userCard(ids) {
  const list = [...new Set(ids.map(Number))].filter(Boolean);
  if (!list.length) return new Map();
  const [rows] = await pool.query(`SELECT id, full_name, class_name, role FROM users WHERE id IN (${list.map(() => "?").join(",")}) AND status = 'active'`, list);
  let avatars = {};
  try { avatars = await rewards.avatarsFor(list); } catch (e) {}
  return new Map(rows.map(r => [Number(r.id), { id: Number(r.id), name: r.full_name, className: r.class_name, role: r.role, avatar: avatars[r.id] || { type: "initials" }, online: pvp.isOnline(r.id) }]));
}

async function relation(me, other) {
  const [a, b] = pair(me, other);
  const [rows] = await pool.execute("SELECT status, requested_by FROM friendships WHERE user_a = ? AND user_b = ? LIMIT 1", [a, b]);
  const [bl] = await pool.execute("SELECT user_id FROM user_blocks WHERE (user_id = ? AND blocked_id = ?) OR (user_id = ? AND blocked_id = ?)", [me, other, other, me]);
  return { row: rows[0] || null, blockedByMe: bl.some(x => Number(x.user_id) === Number(me)), blockedMe: bl.some(x => Number(x.user_id) === Number(other)) };
}

async function assertStudent(id) {
  const [rows] = await pool.execute("SELECT id, role, status FROM users WHERE id = ? LIMIT 1", [id]);
  if (!rows.length || rows[0].status !== "active") throw err(404, "Không tìm thấy người dùng.");
  if (rows[0].role !== "student") throw err(400, "Chỉ kết bạn được với học sinh.");
}

async function overview(me) {
  await ensureTables();
  const [rows] = await pool.execute("SELECT user_a, user_b, status, requested_by, created_at FROM friendships WHERE user_a = ? OR user_b = ?", [me, me]);
  const otherOf = r => (Number(r.user_a) === Number(me) ? Number(r.user_b) : Number(r.user_a));
  const cards = await userCard(rows.map(otherOf));
  const [unread] = await pool.execute("SELECT sender_id, COUNT(*) AS n FROM chat_messages WHERE receiver_id = ? AND read_at IS NULL GROUP BY sender_id", [me]);
  const unreadBy = new Map(unread.map(u => [Number(u.sender_id), Number(u.n)]));
  const [last] = await pool.execute(
    `SELECT m.* FROM chat_messages m JOIN (SELECT GREATEST(sender_id, receiver_id) AS hi, LEAST(sender_id, receiver_id) AS lo, MAX(id) AS mid FROM chat_messages WHERE sender_id = ? OR receiver_id = ? GROUP BY hi, lo) t ON t.mid = m.id`,
    [me, me]
  );
  const lastBy = new Map(last.map(m => [Number(m.sender_id) === Number(me) ? Number(m.receiver_id) : Number(m.sender_id), m]));
  const friends = [], incoming = [], outgoing = [];
  for (const r of rows) {
    const o = otherOf(r);
    const c = cards.get(o);
    if (!c) continue;
    if (r.status === "accepted") {
      const lm = lastBy.get(o);
      friends.push({ ...c, unread: unreadBy.get(o) || 0, last: lm ? { body: lm.body, mine: Number(lm.sender_id) === Number(me), at: lm.created_at } : null });
    } else if (Number(r.requested_by) === Number(me)) outgoing.push({ ...c, at: r.created_at });
    else incoming.push({ ...c, at: r.created_at });
  }
  friends.sort((x, y) => (y.last ? new Date(y.last.at) : 0) - (x.last ? new Date(x.last.at) : 0) || (y.online - x.online) || x.name.localeCompare(y.name, "vi"));
  return { friends, incoming, outgoing, unread: [...unreadBy.values()].reduce((s, n) => s + n, 0) };
}

async function search(me, q) {
  await ensureTables();
  const text = String(q || "").trim();
  const [meRow] = await pool.execute("SELECT class_name FROM users WHERE id = ? LIMIT 1", [me]);
  const myClass = meRow[0] ? meRow[0].class_name : null;
  let rows;
  if (text.length >= 2) {
    const like = `%${text}%`;
    [rows] = await pool.execute("SELECT id FROM users WHERE role = 'student' AND status = 'active' AND id <> ? AND (full_name LIKE ? OR email LIKE ? OR class_name = ?) ORDER BY class_name = ? DESC, full_name LIMIT 30", [me, like, like, text.toUpperCase(), myClass || ""]);
  } else {
    [rows] = await pool.execute("SELECT id FROM users WHERE role = 'student' AND status = 'active' AND id <> ? AND class_name = ? ORDER BY full_name LIMIT 60", [me, myClass || ""]);
  }
  const ids = rows.map(r => Number(r.id));
  if (!ids.length) return { users: [] };
  const [fr] = await pool.query(`SELECT user_a, user_b, status, requested_by FROM friendships WHERE (user_a = ? AND user_b IN (${ids.map(() => "?").join(",")})) OR (user_b = ? AND user_a IN (${ids.map(() => "?").join(",")}))`, [me, ...ids, me, ...ids]);
  const [bl] = await pool.query(`SELECT user_id, blocked_id FROM user_blocks WHERE (user_id = ? AND blocked_id IN (${ids.map(() => "?").join(",")})) OR (blocked_id = ? AND user_id IN (${ids.map(() => "?").join(",")}))`, [me, ...ids, me, ...ids]);
  const hidden = new Set(bl.map(b => (Number(b.user_id) === Number(me) ? Number(b.blocked_id) : Number(b.user_id))));
  const rel = new Map(fr.map(r => [Number(r.user_a) === Number(me) ? Number(r.user_b) : Number(r.user_a), r]));
  const cards = await userCard(ids);
  return {
    users: ids.filter(id => !hidden.has(id) && cards.has(id)).map(id => {
      const r = rel.get(id);
      const status = !r ? "none" : r.status === "accepted" ? "friend" : Number(r.requested_by) === Number(me) ? "outgoing" : "incoming";
      return { ...cards.get(id), relation: status, sameClass: Boolean(myClass && cards.get(id).className === myClass) };
    }),
  };
}

async function request(me, other) {
  await ensureTables();
  if (Number(me) === Number(other)) throw err(400, "Không thể tự kết bạn với chính mình.");
  await assertStudent(other);
  const rel = await relation(me, other);
  if (rel.blockedByMe) throw err(400, "Bạn đã chặn người này. Hãy bỏ chặn trước.");
  if (rel.blockedMe) throw err(403, "Không thể gửi lời mời kết bạn.");
  const [a, b] = pair(me, other);
  if (rel.row && rel.row.status === "accepted") return { status: "friend", message: "Hai bạn đã là bạn bè." };
  if (rel.row && Number(rel.row.requested_by) !== Number(me)) return accept(me, other);
  if (rel.row) return { status: "outgoing", message: "Đã gửi lời mời trước đó." };
  const [cnt] = await pool.execute("SELECT COUNT(*) AS n FROM friendships WHERE requested_by = ? AND status = 'pending' AND created_at > DATE_SUB(NOW(), INTERVAL 1 DAY)", [me]);
  if (Number(cnt[0].n) >= 40) throw err(429, "Bạn đã gửi quá nhiều lời mời hôm nay.");
  await pool.execute("INSERT INTO friendships (user_a, user_b, status, requested_by) VALUES (?, ?, 'pending', ?)", [a, b, me]);
  const card = (await userCard([me])).get(Number(me));
  pvp.notify(other, "friend-request", { from: card });
  return { status: "outgoing", message: "Đã gửi lời mời kết bạn." };
}

async function accept(me, other) {
  await ensureTables();
  const [a, b] = pair(me, other);
  const [r] = await pool.execute("UPDATE friendships SET status = 'accepted', accepted_at = NOW() WHERE user_a = ? AND user_b = ? AND status = 'pending' AND requested_by <> ?", [a, b, me]);
  if (!r.affectedRows) throw err(404, "Lời mời không còn tồn tại.");
  const card = (await userCard([me])).get(Number(me));
  pvp.notify(other, "friend-accepted", { from: card });
  return { status: "friend", message: "Đã trở thành bạn bè!" };
}

async function remove(me, other) {
  await ensureTables();
  const [a, b] = pair(me, other);
  await pool.execute("DELETE FROM friendships WHERE user_a = ? AND user_b = ?", [a, b]);
  pvp.notify(other, "friend-removed", { id: Number(me) });
  return { status: "none", message: "Đã xoá." };
}

async function block(me, other) {
  await ensureTables();
  if (Number(me) === Number(other)) throw err(400, "Không thể tự chặn.");
  await pool.execute("INSERT IGNORE INTO user_blocks (user_id, blocked_id) VALUES (?, ?)", [me, other]);
  await remove(me, other);
  return { status: "blocked", message: "Đã chặn. Người này không thể nhắn tin hay kết bạn với bạn." };
}
async function unblock(me, other) {
  await ensureTables();
  await pool.execute("DELETE FROM user_blocks WHERE user_id = ? AND blocked_id = ?", [me, other]);
  return { status: "none", message: "Đã bỏ chặn." };
}
async function blocked(me) {
  await ensureTables();
  const [rows] = await pool.execute("SELECT blocked_id FROM user_blocks WHERE user_id = ?", [me]);
  const cards = await userCard(rows.map(r => r.blocked_id));
  return { users: [...cards.values()] };
}

async function assertFriends(me, other) {
  const rel = await relation(me, other);
  if (rel.blockedByMe || rel.blockedMe) throw err(403, "Không thể nhắn tin với người này.");
  if (!rel.row || rel.row.status !== "accepted") throw err(403, "Hai bạn cần kết bạn trước khi nhắn tin.");
}

function toMsg(m, me) {
  return { id: Number(m.id), from: Number(m.sender_id), to: Number(m.receiver_id), mine: Number(m.sender_id) === Number(me), body: m.body, at: m.created_at, read: Boolean(m.read_at) };
}

async function history(me, other, before) {
  await ensureTables();
  await assertFriends(me, other);
  const params = [me, other, other, me];
  let extra = "";
  if (Number(before) > 0) { extra = " AND id < ?"; params.push(Number(before)); }
  const [rows] = await pool.execute(`SELECT * FROM chat_messages WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))${extra} ORDER BY id DESC LIMIT 40`, params);
  const card = (await userCard([other])).get(Number(other));
  return { friend: card, messages: rows.reverse().map(m => toMsg(m, me)), more: rows.length === 40 };
}

async function sendMessage(me, other, text) {
  await ensureTables();
  const body = cleanText(text);
  if (!body) throw err(400, "Tin nhắn trống.");
  await assertFriends(me, other);
  const now = Date.now();
  const recent = (sentRecently.get(Number(me)) || []).filter(t => now - t < RATE.windowMs);
  if (recent.length >= RATE.max) throw err(429, "Bạn gửi tin nhắn quá nhanh, chờ vài giây nhé.");
  recent.push(now);
  sentRecently.set(Number(me), recent);
  const [r] = await pool.execute("INSERT INTO chat_messages (sender_id, receiver_id, body) VALUES (?, ?, ?)", [me, other, body]);
  const [rows] = await pool.execute("SELECT * FROM chat_messages WHERE id = ? LIMIT 1", [r.insertId]);
  const msg = rows[0];
  const card = (await userCard([me])).get(Number(me));
  pvp.notify(other, "chat-message", { message: toMsg(msg, other), from: card });
  pvp.notify(me, "chat-sent", { message: toMsg(msg, me) });
  return { message: toMsg(msg, me) };
}

async function markRead(me, other) {
  await ensureTables();
  const [r] = await pool.execute("UPDATE chat_messages SET read_at = NOW() WHERE receiver_id = ? AND sender_id = ? AND read_at IS NULL", [me, other]);
  if (r.affectedRows) pvp.notify(other, "chat-read", { by: Number(me) });
  return { read: r.affectedRows };
}

async function unreadCount(me) {
  await ensureTables();
  const [rows] = await pool.execute("SELECT COUNT(*) AS n FROM chat_messages WHERE receiver_id = ? AND read_at IS NULL", [me]);
  const [req] = await pool.execute("SELECT COUNT(*) AS n FROM friendships WHERE (user_a = ? OR user_b = ?) AND status = 'pending' AND requested_by <> ?", [me, me, me]);
  return { messages: Number(rows[0].n), requests: Number(req[0].n) };
}

function attach(app, { requireLogin, requirePermission }) {
  const guard = [requireLogin, requirePermission("social.use")];
  const wrap = fn => async (req, res) => {
    try { res.json({ success: true, ...(await fn(req)) }); }
    catch (e) { if (!e.status) console.error("Social:", e); res.status(e.status || 500).json({ success: false, message: e.status ? e.message : "Chức năng bạn bè đang bận, thử lại sau." }); }
  };
  const me = req => Number(req.user.userId);
  const id = req => Number(req.params.id);
  app.get("/api/friends", ...guard, wrap(req => overview(me(req))));
  app.get("/api/friends/search", ...guard, wrap(req => search(me(req), req.query.q)));
  app.get("/api/friends/unread", ...guard, wrap(req => unreadCount(me(req))));
  app.get("/api/friends/blocked", ...guard, wrap(req => blocked(me(req))));
  app.post("/api/friends/:id/request", ...guard, wrap(req => request(me(req), id(req))));
  app.post("/api/friends/:id/accept", ...guard, wrap(req => accept(me(req), id(req))));
  app.delete("/api/friends/:id", ...guard, wrap(req => remove(me(req), id(req))));
  app.post("/api/friends/:id/block", ...guard, wrap(req => block(me(req), id(req))));
  app.delete("/api/friends/:id/block", ...guard, wrap(req => unblock(me(req), id(req))));
  app.get("/api/chat/:id", ...guard, wrap(req => history(me(req), id(req), req.query.before)));
  app.post("/api/chat/:id", ...guard, wrap(req => sendMessage(me(req), id(req), (req.body || {}).body)));
  app.post("/api/chat/:id/read", ...guard, wrap(req => markRead(me(req), id(req))));
}

module.exports = { attach, ensureTables, cleanText };
