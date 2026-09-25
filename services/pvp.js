const crypto = require("crypto");
const pool = require("../database/db");
const rewards = require("./rewards");
const unitsData = require("./units-data");

const BOT = {
  easy: { label: "Dễ", seconds: 15, carrots: 5, xp: 15, accuracy: 0.55, delay: [6, 13.5], name: "Bot Tập Sự" },
  normal: { label: "Thường", seconds: 10, carrots: 10, xp: 25, accuracy: 0.72, delay: [3.2, 8.5], name: "Bot Chiến Binh" },
  hard: { label: "Khó", seconds: 5, carrots: 15, xp: 40, accuracy: 0.88, delay: [1.2, 3.9], name: "Bot Cao Thủ" },
};
const HUMAN = { seconds: 10, carrots: 10, xp: 30 };
const TOTAL_QUESTIONS = 10;
const REVEAL_MS = 2200;
const COUNTDOWN_MS = 3000;
const GRACE_MS = 12000;

const streams = new Map();
const infoCache = new Map();
const queue = new Map();
const invites = new Map();
const rooms = new Map();
const matches = new Map();
const userMatch = new Map();

let ready = null;
function ensureTables() {
  if (ready) return ready;
  ready = (async () => {
    await pool.query(`CREATE TABLE IF NOT EXISTS pvp_players (
      user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
      rating INT NOT NULL DEFAULT 1000,
      matches INT NOT NULL DEFAULT 0,
      wins INT NOT NULL DEFAULT 0,
      losses INT NOT NULL DEFAULT 0,
      draws INT NOT NULL DEFAULT 0,
      streak INT NOT NULL DEFAULT 0,
      best_streak INT NOT NULL DEFAULT 0,
      bot_easy_wins INT NOT NULL DEFAULT 0,
      bot_normal_wins INT NOT NULL DEFAULT 0,
      bot_hard_wins INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_pvp_rating (rating)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    await pool.query(`CREATE TABLE IF NOT EXISTS pvp_matches (
      id VARCHAR(20) NOT NULL PRIMARY KEY,
      mode VARCHAR(10) NOT NULL,
      difficulty VARCHAR(10) NULL,
      p1_id BIGINT UNSIGNED NOT NULL,
      p2_id BIGINT UNSIGNED NULL,
      p1_score INT NOT NULL DEFAULT 0,
      p2_score INT NOT NULL DEFAULT 0,
      winner_id BIGINT UNSIGNED NULL,
      result VARCHAR(12) NOT NULL DEFAULT 'finished',
      detail_json JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pvp_p1 (p1_id, created_at),
      INDEX idx_pvp_p2 (p2_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
    return true;
  })().catch(e => { ready = null; throw e; });
  return ready;
}

const rand = (a, b) => a + Math.random() * (b - a);
const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const newId = (n = 8) => crypto.randomBytes(n).toString("hex").slice(0, n * 2);
const roomCode = () => { const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; let s = ""; for (let i = 0; i < 5; i++) s += abc[crypto.randomInt(abc.length)]; return s; };

function send(userId, event, data) {
  const set = streams.get(Number(userId));
  if (!set) return false;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) { try { res.write(payload); } catch (e) {} }
  return set.size > 0;
}
const online = id => (streams.get(Number(id)) || new Set()).size > 0;

async function playerInfo(userId) {
  const id = Number(userId);
  const cached = infoCache.get(id);
  if (cached && Date.now() - cached.at < 60000) return cached.info;
  await ensureTables();
  const [rows] = await pool.execute("SELECT u.id, u.full_name, u.class_name, COALESCE(p.rating, 1000) AS rating FROM users u LEFT JOIN pvp_players p ON p.user_id = u.id WHERE u.id = ? LIMIT 1", [id]);
  const r = rows[0] || { id, full_name: "Học sinh", class_name: null, rating: 1000 };
  let title = null;
  try {
    const [pf] = await pool.execute("SELECT data_json FROM user_data WHERE user_id = ? AND data_key = 'engoProfileV1' LIMIT 1", [id]);
    if (pf.length) title = (JSON.parse(pf[0].data_json) || {}).displayTitle || null;
  } catch (e) {}
  let avatar = { type: "initials" };
  try { avatar = (await rewards.avatarsFor([id]))[id] || avatar; } catch (e) {}
  const info = { id, name: r.full_name, className: r.class_name, rating: Number(r.rating), title, avatar };
  infoCache.set(id, { at: Date.now(), info });
  return info;
}

let vocabPool = null;
function vocabCards() {
  if (vocabPool) return vocabPool;
  const units = unitsData.load().vocab || {};
  vocabPool = [];
  for (const [key, u] of Object.entries(units)) {
    const unit = Number(String(key).replace(/\D/g, "")) || u.unit;
    for (const c of u.cards || []) {
      const w = String(c.w || "").replace(/\s*\([^)]*\)\s*/g, " ").trim();
      const vi = String(c.vi || "").trim();
      if (w && vi && w.length <= 28) vocabPool.push({ unit, w, vi, pos: c.pos || "" });
    }
  }
  return vocabPool;
}

async function wordFamilyItems(unit) {
  try {
    const [rows] = await pool.execute(unit ? "SELECT members_json, items_json FROM word_families WHERE unit = ?" : "SELECT members_json, items_json FROM word_families", unit ? [unit] : []);
    const out = [];
    for (const r of rows) {
      const members = (typeof r.members_json === "string" ? JSON.parse(r.members_json) : r.members_json) || [];
      const items = (typeof r.items_json === "string" ? JSON.parse(r.items_json) : r.items_json) || [];
      for (const it of items) out.push({ s: it.s, a: it.a, members: members.map(m => m.w) });
    }
    return out;
  } catch (e) { return []; }
}

async function buildQuestions(unit) {
  const cards = vocabCards();
  const scoped = unit ? cards.filter(c => c.unit === Number(unit)) : cards;
  const pool1 = scoped.length >= 8 ? scoped : cards;
  const wf = shuffle(await wordFamilyItems(unit ? Number(unit) : null));
  const qs = [];
  const used = new Set();
  const pickCard = () => { for (let t = 0; t < 50; t++) { const c = pool1[Math.floor(Math.random() * pool1.length)]; if (!used.has(c.w)) { used.add(c.w); return c; } } return pool1[0]; };
  const distinct = (list, key, n, not) => { const seen = new Set([not]); const out = []; for (const x of shuffle(list)) { const k = x[key]; if (!seen.has(k)) { seen.add(k); out.push(k); } if (out.length >= n) break; } return out; };
  const plan = shuffle(["meaning", "meaning", "meaning", "word", "word", "word", "form", "form", "form", "meaning"]).slice(0, TOTAL_QUESTIONS);
  for (const kind of plan) {
    if (kind === "form" && wf.length) {
      const it = wf.pop();
      let options = shuffle(it.members.filter(w => w !== it.a)).slice(0, 3);
      const extra = distinct(cards, "w", 6, it.a).filter(w => !options.includes(w));
      while (options.length < 3) options.push(extra.shift());
      options = shuffle([it.a, ...options]);
      qs.push({ kind: "form", prompt: it.s, hint: "Chọn dạng từ đúng", options, answer: options.indexOf(it.a) });
      continue;
    }
    const c = pickCard();
    if (kind === "word") {
      const options = shuffle([c.w, ...distinct(pool1, "w", 3, c.w)]);
      qs.push({ kind: "word", prompt: c.vi, hint: "Từ tiếng Anh nào có nghĩa này?", options, answer: options.indexOf(c.w) });
    } else {
      const options = shuffle([c.vi, ...distinct(pool1, "vi", 3, c.vi)]);
      qs.push({ kind: "meaning", prompt: c.w, hint: "Nghĩa đúng của từ là?", options, answer: options.indexOf(c.vi) });
    }
  }
  return qs;
}

function publicPlayer(p) {
  return { id: p.id, name: p.name, className: p.className, rating: p.rating, title: p.title, avatar: p.bot ? null : p.avatar, bot: Boolean(p.bot) };
}

function humanIds(m) { return m.players.filter(p => !p.bot).map(p => p.id); }
function broadcast(m, event, dataFor) {
  for (const p of m.players) if (!p.bot) send(p.id, event, typeof dataFor === "function" ? dataFor(p) : dataFor);
}
function clearTimers(m) { (m.timers || []).forEach(t => clearTimeout(t)); m.timers = []; }
function later(m, ms, fn) { const t = setTimeout(fn, ms); m.timers.push(t); return t; }

async function createMatch({ mode, difficulty = null, unit = null, players }) {
  const cfg = mode === "bot" ? BOT[difficulty] : HUMAN;
  const m = {
    id: newId(8), mode, difficulty, unit, seconds: cfg.seconds,
    players: players.map(p => ({ ...p, score: 0, answers: [], correct: 0, connected: true })),
    questions: await buildQuestions(unit), qi: -1, phase: "countdown", qStart: 0, timers: [], createdAt: Date.now(),
  };
  matches.set(m.id, m);
  for (const id of humanIds(m)) { userMatch.set(id, m.id); queue.delete(id); }
  broadcast(m, "match-start", p => ({
    matchId: m.id, mode, difficulty, difficultyLabel: difficulty ? BOT[difficulty].label : null, seconds: m.seconds, total: m.questions.length,
    you: publicPlayer(p), opponent: publicPlayer(m.players.find(x => x !== p)), countdownMs: COUNTDOWN_MS,
    reward: mode === "bot" ? BOT[difficulty].carrots : HUMAN.carrots,
  }));
  later(m, COUNTDOWN_MS, () => nextQuestion(m));
  return m;
}

function nextQuestion(m) {
  if (m.phase === "end") return;
  m.qi++;
  if (m.qi >= m.questions.length) return finish(m, null);
  m.phase = "question";
  m.qStart = Date.now();
  const q = m.questions[m.qi];
  broadcast(m, "question", { matchId: m.id, qi: m.qi, total: m.questions.length, kind: q.kind, prompt: q.prompt, hint: q.hint, options: q.options, seconds: m.seconds, remainingMs: m.seconds * 1000 });
  later(m, m.seconds * 1000 + 350, () => reveal(m, m.qi));
  const bot = m.players.find(p => p.bot);
  if (bot) {
    const cfg = BOT[m.difficulty];
    const delay = Math.min(m.seconds - 0.25, rand(cfg.delay[0], cfg.delay[1])) * 1000;
    const correct = Math.random() < cfg.accuracy;
    const wrongs = q.options.map((_, i) => i).filter(i => i !== q.answer);
    const choice = correct ? q.answer : wrongs[Math.floor(Math.random() * wrongs.length)];
    const skip = !correct && Math.random() < 0.2;
    if (!skip) later(m, delay, () => submit(m, bot.id, m.qi, choice));
  }
}

function submit(m, userId, qi, choice) {
  if (m.phase !== "question" || qi !== m.qi) return { ok: false, reason: "Câu hỏi đã kết thúc." };
  const p = m.players.find(x => x.id === userId);
  if (!p) return { ok: false, reason: "Bạn không ở trong trận này." };
  if (p.answers[qi]) return { ok: false, reason: "Bạn đã trả lời câu này." };
  const ms = Date.now() - m.qStart;
  const limit = m.seconds * 1000;
  if (ms > limit + 400) return { ok: false, reason: "Hết giờ." };
  const q = m.questions[qi];
  const c = Number(choice);
  const correct = c === q.answer;
  const speed = Math.max(0, 1 - Math.min(ms, limit) / limit);
  const points = correct ? 100 + Math.round(100 * speed) : 0;
  p.answers[qi] = { choice: c, correct, points, ms };
  p.score += points;
  if (correct) p.correct++;
  for (const other of m.players) if (!other.bot && other.id !== userId) send(other.id, "opponent-answered", { matchId: m.id, qi });
  if (m.players.every(x => x.answers[qi])) later(m, 450, () => reveal(m, qi));
  return { ok: true, correct, points };
}

function reveal(m, qi) {
  if (m.phase !== "question" || qi !== m.qi) return;
  m.phase = "reveal";
  clearTimers(m);
  const q = m.questions[qi];
  broadcast(m, "reveal", p => ({
    matchId: m.id, qi, answer: q.answer,
    you: p.answers[qi] || { choice: null, correct: false, points: 0 },
    opponent: m.players.find(x => x !== p).answers[qi] || { choice: null, correct: false, points: 0 },
    scores: { you: p.score, opponent: m.players.find(x => x !== p).score },
    last: qi >= m.questions.length - 1,
  }));
  later(m, REVEAL_MS, () => nextQuestion(m));
}

function elo(ra, rb, sa, k = 32) {
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  return Math.round(k * (sa - ea));
}

async function recordStats(userId, { outcome, mode, difficulty, ratingDelta = 0 }) {
  await ensureTables();
  await pool.execute("INSERT IGNORE INTO pvp_players (user_id) VALUES (?)", [userId]);
  const win = outcome === "win" ? 1 : 0, loss = outcome === "loss" ? 1 : 0, draw = outcome === "draw" ? 1 : 0;
  const botCol = mode === "bot" && win ? `, bot_${difficulty}_wins = bot_${difficulty}_wins + 1` : "";
  await pool.execute(
    `UPDATE pvp_players SET matches = matches + 1, wins = wins + ?, losses = losses + ?, draws = draws + ?,
      streak = IF(? = 1, streak + 1, IF(? = 1, 0, streak)), best_streak = GREATEST(best_streak, streak),
      rating = GREATEST(100, rating + ?)${botCol} WHERE user_id = ?`,
    [win, loss, draw, win, loss, ratingDelta, userId]
  );
  infoCache.delete(Number(userId));
}

async function finish(m, forfeitBy) {
  if (m.phase === "end") return;
  m.phase = "end";
  clearTimers(m);
  const [a, b] = m.players;
  let winner = null;
  if (forfeitBy) winner = m.players.find(p => p.id !== forfeitBy) || null;
  else if (a.score !== b.score) winner = a.score > b.score ? a : b;
  const draw = !winner;
  const results = {};
  try {
    let deltaA = 0, deltaB = 0;
    if (m.mode === "human") {
      const sa = draw ? 0.5 : winner === a ? 1 : 0;
      deltaA = elo(a.rating, b.rating, sa);
      deltaB = -deltaA;
    }
    for (const [p, delta] of [[a, deltaA], [b, deltaB]]) {
      if (p.bot) continue;
      const outcome = draw ? "draw" : winner === p ? "win" : "loss";
      let reward = { grantedCarrots: 0, grantedXp: 0, cappedCarrots: 0 };
      if (outcome === "win") {
        const cfg = m.mode === "bot" ? BOT[m.difficulty] : HUMAN;
        reward = await rewards.earn(p.id, cfg.xp, cfg.carrots, { maxCarrots: 15, maxXp: 60 });
      } else if (outcome === "draw" || m.mode === "human") {
        reward = await rewards.earn(p.id, outcome === "draw" ? 10 : 5, 0);
      }
      await recordStats(p.id, { outcome, mode: m.mode, difficulty: m.difficulty, ratingDelta: delta });
      results[p.id] = { outcome, carrots: reward.grantedCarrots || 0, xp: reward.grantedXp || 0, capped: reward.cappedCarrots || 0, dailyLeft: reward.dailyLeft, ratingDelta: delta, rating: Math.max(100, p.rating + delta) };
    }
    await pool.execute(
      "INSERT INTO pvp_matches (id, mode, difficulty, p1_id, p2_id, p1_score, p2_score, winner_id, result, detail_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [m.id, m.mode, m.difficulty, a.id, b.bot ? null : b.id, a.score, b.score, winner && !winner.bot ? winner.id : null, forfeitBy ? "forfeit" : draw ? "draw" : "finished",
        JSON.stringify({ opponent: b.bot ? b.name : null, winnerBot: Boolean(winner && winner.bot), correct: { [a.id]: a.correct, [b.bot ? "bot" : b.id]: b.correct }, total: m.questions.length, seconds: m.seconds })]
    );
  } catch (e) {
    console.error("PvP finish error:", e.message);
  }
  broadcast(m, "end", p => {
    const o = m.players.find(x => x !== p);
    return {
      matchId: m.id, mode: m.mode, difficulty: m.difficulty, draw, forfeit: Boolean(forfeitBy), forfeitByYou: forfeitBy === p.id,
      youWin: Boolean(winner && winner === p), scores: { you: p.score, opponent: o.score }, correct: { you: p.correct, opponent: o.correct }, total: m.questions.length,
      opponent: publicPlayer(o), result: results[p.id] || null,
      review: m.questions.map((q, i) => ({ prompt: q.prompt, kind: q.kind, answer: q.options[q.answer], yours: p.answers[i] ? q.options[p.answers[i].choice] : null, correct: Boolean(p.answers[i] && p.answers[i].correct) })),
    };
  });
  for (const id of humanIds(m)) if (userMatch.get(id) === m.id) userMatch.delete(id);
  setTimeout(() => matches.delete(m.id), 60000);
}

function currentMatch(userId) {
  const id = userMatch.get(Number(userId));
  const m = id && matches.get(id);
  return m && m.phase !== "end" ? m : null;
}

function snapshot(m, userId) {
  const p = m.players.find(x => x.id === Number(userId));
  const o = m.players.find(x => x !== p);
  const q = m.questions[m.qi];
  return {
    matchId: m.id, mode: m.mode, difficulty: m.difficulty, seconds: m.seconds, total: m.questions.length, phase: m.phase,
    you: publicPlayer(p), opponent: publicPlayer(o), scores: { you: p.score, opponent: o.score },
    question: m.phase === "question" && q ? { qi: m.qi, kind: q.kind, prompt: q.prompt, hint: q.hint, options: q.options, remainingMs: Math.max(0, m.seconds * 1000 - (Date.now() - m.qStart)), answered: Boolean(p.answers[m.qi]) } : null,
  };
}

function openStream(req, res, userId) {
  const id = Number(userId);
  res.writeHead(200, { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" });
  res.write("retry: 3000\n\n");
  if (!streams.has(id)) streams.set(id, new Set());
  streams.get(id).add(res);
  const m = currentMatch(id);
  if (m) {
    const p = m.players.find(x => x.id === id);
    if (p) { p.connected = true; if (p.graceTimer) { clearTimeout(p.graceTimer); p.graceTimer = null; } }
    send(id, "resume", snapshot(m, id));
  }
  send(id, "hello", { online: onlineCount() });
  const ping = setInterval(() => { try { res.write(": ping\n\n"); } catch (e) {} }, 20000);
  req.on("close", () => {
    clearInterval(ping);
    const set = streams.get(id);
    if (set) { set.delete(res); if (!set.size) streams.delete(id); }
    if (!online(id)) {
      queue.delete(id);
      const mm = currentMatch(id);
      if (mm) {
        const p = mm.players.find(x => x.id === id);
        if (p && !p.graceTimer) {
          p.connected = false;
          p.graceTimer = setTimeout(() => { p.graceTimer = null; if (!online(id) && currentMatch(id) === mm) finish(mm, id); }, GRACE_MS);
          for (const o of mm.players) if (!o.bot && o.id !== id) send(o.id, "opponent-away", { matchId: mm.id, graceMs: GRACE_MS });
        }
      }
    }
  });
}
const onlineCount = () => streams.size;

function busy(userId) {
  if (currentMatch(userId)) throw Object.assign(new Error("Bạn đang ở trong một trận đấu."), { status: 409 });
}

async function startBot(userId, difficulty, unit) {
  if (!BOT[difficulty]) throw Object.assign(new Error("Chế độ bot không hợp lệ."), { status: 400 });
  busy(userId);
  queue.delete(Number(userId));
  const me = await playerInfo(userId);
  const cfg = BOT[difficulty];
  const bot = { id: -1, bot: true, name: cfg.name, className: `Mức ${cfg.label}`, rating: { easy: 800, normal: 1100, hard: 1400 }[difficulty], title: `${cfg.seconds} giây/câu` };
  const m = await createMatch({ mode: "bot", difficulty, unit: unit ? Number(unit) : null, players: [me, bot] });
  return { matchId: m.id };
}

async function joinQueue(userId) {
  const id = Number(userId);
  busy(id);
  if (!online(id)) throw Object.assign(new Error("Mất kết nối tới đấu trường, hãy tải lại trang."), { status: 409 });
  const me = await playerInfo(id);
  let best = null;
  for (const [otherId, q] of queue) {
    if (otherId === id || !online(otherId) || currentMatch(otherId)) { if (!online(otherId)) queue.delete(otherId); continue; }
    const diff = Math.abs(q.rating - me.rating) - (Date.now() - q.since) / 200;
    if (!best || diff < best.diff) best = { otherId, diff };
  }
  if (best) {
    queue.delete(best.otherId);
    const other = await playerInfo(best.otherId);
    const m = await createMatch({ mode: "human", players: shuffle([me, other]) });
    return { matched: true, matchId: m.id };
  }
  queue.set(id, { since: Date.now(), rating: me.rating });
  send(id, "queued", { waiting: queue.size });
  return { matched: false, waiting: queue.size };
}
function leaveQueue(userId) { queue.delete(Number(userId)); return { ok: true }; }

async function invite(fromId, toId) {
  const from = Number(fromId), to = Number(toId);
  if (from === to) throw Object.assign(new Error("Không thể tự mời chính mình."), { status: 400 });
  busy(from);
  if (!online(to)) throw Object.assign(new Error("Bạn này hiện không online trên ENGO."), { status: 409 });
  if (currentMatch(to)) throw Object.assign(new Error("Bạn này đang trong một trận khác."), { status: 409 });
  const [rows] = await pool.execute("SELECT role FROM users WHERE id = ? LIMIT 1", [to]);
  if (!rows.length || rows[0].role !== "student") throw Object.assign(new Error("Chỉ mời được học sinh."), { status: 400 });
  const inviteId = newId(6);
  const me = await playerInfo(from);
  invites.set(inviteId, { from, to, at: Date.now() });
  setTimeout(() => { if (invites.has(inviteId)) { invites.delete(inviteId); send(from, "invite-expired", { inviteId }); send(to, "invite-cancel", { inviteId }); } }, 30000);
  send(to, "invite", { inviteId, from: publicPlayer(me), expiresMs: 30000 });
  return { inviteId };
}

async function respondInvite(userId, inviteId, accept) {
  const inv = invites.get(inviteId);
  if (!inv || inv.to !== Number(userId)) throw Object.assign(new Error("Lời mời đã hết hạn."), { status: 404 });
  invites.delete(inviteId);
  if (!accept) { send(inv.from, "invite-declined", { inviteId }); return { ok: true }; }
  if (currentMatch(inv.from) || !online(inv.from)) throw Object.assign(new Error("Người mời không còn sẵn sàng."), { status: 409 });
  busy(userId);
  const [a, b] = await Promise.all([playerInfo(inv.from), playerInfo(userId)]);
  const m = await createMatch({ mode: "human", players: [a, b] });
  return { matchId: m.id };
}

async function createRoom(userId) {
  busy(userId);
  for (const [code, r] of rooms) if (r.host === Number(userId)) rooms.delete(code);
  let code = roomCode();
  while (rooms.has(code)) code = roomCode();
  rooms.set(code, { host: Number(userId), at: Date.now() });
  setTimeout(() => rooms.delete(code), 10 * 60000);
  return { code };
}
async function joinRoom(userId, code) {
  const c = String(code || "").trim().toUpperCase();
  const r = rooms.get(c);
  if (!r) throw Object.assign(new Error("Mã phòng không tồn tại hoặc đã hết hạn."), { status: 404 });
  if (r.host === Number(userId)) throw Object.assign(new Error("Đây là phòng của bạn — hãy gửi mã cho bạn bè."), { status: 400 });
  if (!online(r.host) || currentMatch(r.host)) { rooms.delete(c); throw Object.assign(new Error("Chủ phòng không còn sẵn sàng."), { status: 409 }); }
  busy(userId);
  rooms.delete(c);
  const [a, b] = await Promise.all([playerInfo(r.host), playerInfo(userId)]);
  const m = await createMatch({ mode: "human", players: [a, b] });
  return { matchId: m.id };
}
function closeRoom(userId) { for (const [code, r] of rooms) if (r.host === Number(userId)) rooms.delete(code); return { ok: true }; }

function answer(userId, matchId, qi, choice) {
  const m = matches.get(String(matchId));
  if (!m || m.phase === "end") throw Object.assign(new Error("Trận đấu đã kết thúc."), { status: 404 });
  const r = submit(m, Number(userId), Number(qi), choice);
  if (!r.ok) throw Object.assign(new Error(r.reason), { status: 409 });
  return r;
}
function leave(userId, matchId) {
  const m = matches.get(String(matchId));
  if (m && m.phase !== "end" && m.players.some(p => p.id === Number(userId))) finish(m, Number(userId));
  return { ok: true };
}

async function onlinePlayers(userId, className) {
  const ids = [...streams.keys()].filter(id => id !== Number(userId));
  const list = [];
  for (const id of ids.slice(0, 200)) {
    try {
      const info = await playerInfo(id);
      list.push({ ...publicPlayer(info), status: currentMatch(id) ? "playing" : queue.has(id) ? "queue" : "idle", sameClass: Boolean(className && info.className === className) });
    } catch (e) {}
  }
  return list.sort((a, b) => (b.sameClass - a.sameClass) || (a.status === "idle" ? -1 : 1) || a.name.localeCompare(b.name, "vi"));
}

async function stats(userId) {
  await ensureTables();
  await pool.execute("INSERT IGNORE INTO pvp_players (user_id) VALUES (?)", [userId]);
  const [rows] = await pool.execute("SELECT * FROM pvp_players WHERE user_id = ? LIMIT 1", [userId]);
  const r = rows[0];
  const [recent] = await pool.execute(
    `SELECT m.id, m.mode, m.difficulty, m.p1_id, m.p2_id, m.p1_score, m.p2_score, m.winner_id, m.result, m.detail_json, m.created_at, u1.full_name AS p1_name, u2.full_name AS p2_name
     FROM pvp_matches m LEFT JOIN users u1 ON u1.id = m.p1_id LEFT JOIN users u2 ON u2.id = m.p2_id
     WHERE m.p1_id = ? OR m.p2_id = ? ORDER BY m.created_at DESC LIMIT 10`, [userId, userId]);
  const [rank] = await pool.execute("SELECT COUNT(*) + 1 AS r FROM pvp_players WHERE rating > ?", [r.rating]);
  const rw = await rewards.getRewards(userId);
  return {
    rating: r.rating, rank: Number(rank[0].r), matches: r.matches, wins: r.wins, losses: r.losses, draws: r.draws, streak: r.streak, bestStreak: r.best_streak,
    botWins: { easy: r.bot_easy_wins, normal: r.bot_normal_wins, hard: r.bot_hard_wins }, dailyLeft: rw.dailyLeft, dailyCap: rw.dailyCap,
    recent: recent.map(x => {
      const mine = Number(x.p1_id) === Number(userId);
      const detail = typeof x.detail_json === "string" ? JSON.parse(x.detail_json) : (x.detail_json || {});
      const myScore = mine ? x.p1_score : x.p2_score, opScore = mine ? x.p2_score : x.p1_score;
      const outcome = x.result === "draw" ? "draw" : Number(x.winner_id) === Number(userId) ? "win" : "loss";
      return { id: x.id, mode: x.mode, difficulty: x.difficulty, opponent: x.mode === "bot" ? (detail.opponent || "Bot") : (mine ? x.p2_name : x.p1_name), myScore, opScore, outcome, forfeit: x.result === "forfeit", at: x.created_at };
    }),
    online: onlineCount(),
    config: { bot: Object.fromEntries(Object.entries(BOT).map(([k, v]) => [k, { label: v.label, seconds: v.seconds, carrots: v.carrots }])), human: HUMAN, total: TOTAL_QUESTIONS },
    inMatch: currentMatch(userId) ? currentMatch(userId).id : null,
  };
}

async function leaderboard({ className = null, limit = 20 } = {}) {
  await ensureTables();
  const params = [];
  let where = "p.matches > 0";
  if (className) { where += " AND u.class_name = ?"; params.push(className); }
  const [rows] = await pool.execute(`SELECT u.id, u.full_name, u.class_name, p.rating, p.wins, p.matches FROM pvp_players p JOIN users u ON u.id = p.user_id WHERE ${where} ORDER BY p.rating DESC, p.wins DESC LIMIT ${Math.max(1, Math.min(100, Number(limit) || 20))}`, params);
  return rows.map((r, i) => ({ rank: i + 1, id: r.id, name: r.full_name, className: r.class_name, rating: r.rating, wins: r.wins, matches: r.matches }));
}

async function ratingOf(userId) {
  try { await ensureTables(); const [r] = await pool.execute("SELECT rating, wins, matches FROM pvp_players WHERE user_id = ? LIMIT 1", [userId]); return r.length ? { rating: r[0].rating, wins: r[0].wins, matches: r[0].matches } : { rating: 1000, wins: 0, matches: 0 }; } catch (e) { return { rating: 1000, wins: 0, matches: 0 }; }
}

function attach(app, { requireLogin, requirePermission }) {
  const guard = [requireLogin, requirePermission("pvp.play")];
  const wrap = fn => async (req, res) => {
    try { await ensureTables(); res.json({ success: true, ...(await fn(req)) }); }
    catch (e) { if (!e.status) console.error("PvP:", e); res.status(e.status || 500).json({ success: false, message: e.status ? e.message : "Đấu trường đang bận, thử lại sau." }); }
  };
  app.get("/api/pvp/stream", ...guard, (req, res) => openStream(req, res, req.user.userId));
  app.get("/api/pvp/me", ...guard, wrap(req => stats(req.user.userId)));
  app.get("/api/pvp/online", ...guard, wrap(async req => { const me = await playerInfo(req.user.userId); return { players: await onlinePlayers(req.user.userId, me.className) }; }));
  app.get("/api/pvp/leaderboard", requireLogin, wrap(async req => { const me = await playerInfo(req.user.userId); return { players: await leaderboard({ className: req.query.scope === "class" ? me.className : null }) }; }));
  app.post("/api/pvp/bot", ...guard, wrap(req => startBot(req.user.userId, String((req.body || {}).difficulty || ""), (req.body || {}).unit)));
  app.post("/api/pvp/queue", ...guard, wrap(req => joinQueue(req.user.userId)));
  app.delete("/api/pvp/queue", ...guard, wrap(async req => leaveQueue(req.user.userId)));
  app.post("/api/pvp/invite", ...guard, wrap(req => invite(req.user.userId, (req.body || {}).userId)));
  app.post("/api/pvp/invite/:id/accept", ...guard, wrap(req => respondInvite(req.user.userId, req.params.id, true)));
  app.post("/api/pvp/invite/:id/decline", ...guard, wrap(req => respondInvite(req.user.userId, req.params.id, false)));
  app.post("/api/pvp/room", ...guard, wrap(req => createRoom(req.user.userId)));
  app.post("/api/pvp/room/join", ...guard, wrap(req => joinRoom(req.user.userId, (req.body || {}).code)));
  app.delete("/api/pvp/room", ...guard, wrap(async req => closeRoom(req.user.userId)));
  app.post("/api/pvp/answer", ...guard, wrap(async req => answer(req.user.userId, (req.body || {}).matchId, (req.body || {}).qi, (req.body || {}).choice)));
  app.post("/api/pvp/leave", ...guard, wrap(async req => leave(req.user.userId, (req.body || {}).matchId)));
}

module.exports = { attach, ensureTables, ratingOf, leaderboard, BOT, HUMAN };
