const pool = require("../database/db");
const unitsData = require("./units-data");
const rewards = require("./rewards");
const pvp = require("./pvp");
const { scoreSubmissionRow, parseJson } = require("./progress");

const PRACTICE_TYPES = ["vocab", "grammar", "listening", "wordform"];
const TYPE_LABEL = { kttx: "Thường xuyên", ktgk: "Giữa kì", ktck: "Cuối kì" };

function unitOf(e) {
  const meta = parseJson(e.meta_json, {}) || {};
  if (meta.unit) return Number(meta.unit);
  const m = String(e.ref_id || "").match(/^u(?:nit)?(\d{1,2})/i) || String(e.title || "").match(/unit\s*(\d{1,2})/i);
  return m ? Number(m[1]) : null;
}
const pct = (score, max) => (Number(max) > 0 ? (Number(score) / Number(max)) * 10 : Number(score) || 0);
const r1 = n => Math.round(n * 10) / 10;
const avg = list => (list.length ? r1(list.reduce((s, x) => s + x, 0) / list.length) : null);

let totals = null;
function practiceTotals() {
  if (totals) return totals;
  const d = unitsData.load();
  totals = {};
  for (let u = 1; u <= 12; u++) {
    const listening = ((d.listening[`unit${u}`] || {}).tasks || []).length || 3;
    totals[u] = { vocab: d.vocab[`unit${u}`] ? 1 : 0, grammar: d.grammar[`unit${u}`] ? 1 : 0, listening, wordform: 1 };
  }
  return totals;
}
function unitName(u) {
  const d = unitsData.load();
  const v = d.vocab[`unit${u}`];
  return v && v.name ? v.name.replace(/^Unit\s*\d+\s*·\s*/, "") : `Unit ${u}`;
}

function firstBest(events) {
  const map = new Map();
  for (const e of events) {
    const key = `${e.event_type}:${e.ref_id || e.title}`;
    const v = pct(e.score, e.max_score);
    if (!map.has(key)) map.set(key, { e, first: v, best: v, attempts: 1 });
    else { const x = map.get(key); x.best = Math.max(x.best, v); x.attempts++; }
  }
  return [...map.values()];
}

async function testFirstAverages(studentIds) {
  if (!studentIds.length) return new Map();
  const [rows] = await pool.query(
    `SELECT student_id, ref_id, score, max_score FROM learning_events WHERE event_type = 'test' AND student_id IN (${studentIds.map(() => "?").join(",")}) ORDER BY created_at ASC`,
    studentIds
  );
  const firsts = new Map();
  for (const r of rows) {
    const k = `${r.student_id}:${r.ref_id}`;
    if (!firsts.has(k)) firsts.set(k, { sid: Number(r.student_id), v: pct(r.score, r.max_score) });
  }
  const bySid = new Map();
  for (const { sid, v } of firsts.values()) { if (!bySid.has(sid)) bySid.set(sid, []); bySid.get(sid).push(v); }
  const out = new Map();
  for (const [sid, list] of bySid) out.set(sid, list.reduce((s, x) => s + x, 0) / list.length);
  return out;
}

async function build(student, { semester = null } = {}) {
  const sid = Number(student.id);
  const sem = [1, 2].includes(Number(semester)) ? Number(semester) : null;
  const [events] = await pool.execute(
    "SELECT event_type, ref_id, title, score, max_score, meta_json, created_at FROM learning_events WHERE student_id = ? AND event_type IN ('test', 'vocab', 'grammar', 'listening', 'wordform') ORDER BY created_at ASC",
    [sid]
  );
  const testEvents = events.filter(e => e.event_type === "test");
  const tests = firstBest(testEvents);
  const [subs] = await pool.execute(
    `SELECT ws.test_id, ws.objective_score, ws.manual_score, ws.status, it.summary_json, ${await colOr("writing_submissions", "objective_max", "ws")}
     FROM writing_submissions ws JOIN imported_tests it ON it.id = ws.test_id WHERE ws.student_id = ?`, [sid]
  );
  const seen = new Set(tests.map(t => String(t.e.ref_id)));
  for (const s of subs) {
    if (seen.has(String(s.test_id))) continue;
    const v = scoreSubmissionRow(s).scoreOnTen;
    tests.push({ e: { ref_id: String(s.test_id), event_type: "test" }, first: v, best: v, attempts: 1 });
  }
  const ids = [...new Set(tests.map(t => Number(t.e.ref_id)).filter(Boolean))];
  const info = new Map();
  if (ids.length) {
    const [rows] = await pool.query(`SELECT id, title, ${await colOr("imported_tests", "test_type")}, ${await colOr("imported_tests", "semester")}, ${await colOr("imported_tests", "unit_no")} FROM imported_tests WHERE id IN (${ids.map(() => "?").join(",")})`, ids);
    rows.forEach(r => info.set(Number(r.id), r));
  }
  const testRows = tests.map(t => {
    const i = info.get(Number(t.e.ref_id)) || {};
    const unit = i.unit_no ? Number(i.unit_no) : null;
    const semester = Number(i.semester) || (unit ? (unit <= 6 ? 1 : 2) : 1);
    const type = i.test_type || "kttx";
    const label = unit ? `Unit ${unit}` : `${TYPE_LABEL[type] || "Kiểm tra"} HK${semester}`;
    const order = unit ? unit * 10 : semester === 1 ? (type === "ktck" ? 65 : 35) : (type === "ktck" ? 125 : 95);
    return { id: Number(t.e.ref_id), title: i.title || t.e.title || "Bài kiểm tra", label, order, semester, first: r1(t.first), best: r1(t.best), attempts: t.attempts };
  }).filter(t => !sem || t.semester === sem);

  const chapters = new Map();
  for (const t of testRows) {
    if (!chapters.has(t.label)) chapters.set(t.label, { label: t.label, order: t.order, first: [], best: [], count: 0 });
    const c = chapters.get(t.label); c.first.push(t.first); c.best.push(t.best); c.count++;
  }
  const testChart = [...chapters.values()].sort((a, b) => a.order - b.order).map(c => ({ label: c.label, first: avg(c.first), best: avg(c.best), count: c.count }));

  const practice = firstBest(events.filter(e => PRACTICE_TYPES.includes(e.event_type)));
  const units = [];
  const tot = practiceTotals();
  const unitRange = sem === 1 ? [1, 6] : sem === 2 ? [7, 12] : [1, 12];
  let exercisesDone = 0, exercisesTotal = 0;
  for (let u = unitRange[0]; u <= unitRange[1]; u++) {
    const list = practice.filter(p => unitOf(p.e) === u);
    const t = tot[u];
    exercisesTotal += t.vocab + t.grammar + t.listening + t.wordform;
    exercisesDone += Math.min(t.vocab + t.grammar + t.listening + t.wordform, list.filter(p => p.best >= 5).length);
    units.push({ unit: u, label: `Unit ${u}`, name: unitName(u), first: avg(list.map(p => p.first)), best: avg(list.map(p => p.best)), done: list.length });
  }

  const firstAvg = avg(testRows.map(t => t.first));
  const bestAvg = avg(testRows.map(t => t.best));
  let rank = null, classSize = null;
  if (student.class_name) {
    const [cls] = await pool.execute("SELECT id FROM users WHERE role = 'student' AND status = 'active' AND class_name = ?", [student.class_name]);
    classSize = cls.length;
    const avgs = await testFirstAverages(cls.map(c => Number(c.id)));
    const mine = avgs.get(sid);
    rank = mine === undefined ? null : 1 + [...avgs.entries()].filter(([id, v]) => id !== sid && v > mine).length;
  }

  let rw = null;
  try { rw = await rewards.getRewards(sid); } catch (e) {}
  const pv = await pvp.ratingOf(sid);
  let profile = {};
  try {
    const [pf] = await pool.execute("SELECT data_json FROM user_data WHERE user_id = ? AND data_key = 'engoProfileV1' LIMIT 1", [sid]);
    if (pf.length) profile = JSON.parse(pf[0].data_json) || {};
  } catch (e) {}

  return {
    student: { id: sid, fullName: student.full_name, email: student.email, className: student.class_name, avatar: rw ? rw.avatar : { type: "initials" }, displayTitle: profile.displayTitle || null, tagline: profile.tagline || null },
    trophy: { rating: pv.rating, pvpWins: pv.wins, pvpMatches: pv.matches, xp: rw ? rw.xp : 0, level: rw ? rw.level : 1 },
    semester: sem,
    stats: { firstAvg, bestAvg, rank, classSize, testsDone: testRows.length, exercisesDone, exercisesTotal },
    unitChart: units,
    testChart,
    tests: testRows.sort((a, b) => a.order - b.order),
  };
}

const colCache = {};
async function colOr(table, col, alias = null) {
  if (!colCache[table]) {
    try { const [c] = await pool.query("SHOW COLUMNS FROM " + table); colCache[table] = new Set(c.map(x => x.Field)); } catch (e) { colCache[table] = new Set(); }
  }
  const ref = alias ? `${alias}.${col}` : col;
  return colCache[table].has(col) ? ref : `NULL AS ${col}`;
}

const SKILL_ACTION = {
  Listening: { view: "listening-lab", icon: "headphones", text: "Luyện nghe" },
  Speaking: { view: "speaking-lab", icon: "mic", text: "Luyện nói với AI" },
  Vocabulary: { view: "vocabulary", icon: "abc", text: "Ôn từ vựng" },
  Grammar: { view: "errorHealing", icon: "menu_book", text: "Chữa lỗi ngữ pháp" },
  Writing: { view: "tests", icon: "edit_note", text: "Làm bài có phần viết" },
  Reading: { view: "tests", icon: "chrome_reader_mode", text: "Làm bài kiểm tra" },
};
const SKILL_VI = { Listening: "Nghe", Speaking: "Nói", Vocabulary: "Từ vựng", Grammar: "Ngữ pháp", Writing: "Viết", Reading: "Đọc" };

async function recommend(student, summary) {
  let profile = {};
  try {
    const [pf] = await pool.execute("SELECT data_json FROM user_data WHERE user_id = ? AND data_key = 'engoProfileV1' LIMIT 1", [student.id]);
    if (pf.length) profile = JSON.parse(pf[0].data_json) || {};
  } catch (e) {}
  const goal = Math.max(5, Math.min(120, Number(profile.dailyGoalMinutes) || 15));
  const target = Math.max(5, Math.min(10, Number(profile.targetScore) || 8));
  const board = await build(student, {});
  const todayMin = Math.round((summary.studyTime.todaySeconds || 0) / 60);
  const items = [];
  if (todayMin < goal) items.push({ icon: "timer", title: `Còn ${goal - todayMin} phút để đạt mục tiêu hôm nay`, desc: `Mục tiêu của em: ${goal} phút mỗi ngày.`, view: "vocabulary", cta: "Học ngay" });
  const skills = summary.scores.skills || {};
  const focus = Array.isArray(profile.focusSkills) && profile.focusSkills.length ? profile.focusSkills : Object.keys(SKILL_ACTION);
  const weakest = focus.filter(k => SKILL_ACTION[k]).sort((a, b) => (skills[a] || 0) - (skills[b] || 0))[0];
  if (weakest) items.push({ icon: SKILL_ACTION[weakest].icon, title: `${SKILL_ACTION[weakest].text}`, desc: `Kỹ năng ${SKILL_VI[weakest]} đang thấp nhất (${skills[weakest] || 0}/100).`, view: SKILL_ACTION[weakest].view, cta: "Luyện" });
  const weakUnit = board.unitChart.filter(u => u.first !== null && u.first < target).sort((a, b) => a.first - b.first)[0];
  if (weakUnit) items.push({ icon: "replay", title: `Ôn lại ${weakUnit.label} · ${weakUnit.name}`, desc: `Điểm lần đầu ${weakUnit.first}/10, cao nhất ${weakUnit.best}/10 — mục tiêu ${target}.`, view: "vocabulary", unit: weakUnit.unit, cta: "Ôn tập" });
  const next = board.unitChart.find(u => !u.done);
  if (next) items.push({ icon: "flag", title: `Bắt đầu ${next.label} · ${next.name}`, desc: "Em chưa làm bài luyện nào của Unit này.", view: "vocabulary", unit: next.unit, cta: "Bắt đầu" });
  const err = (summary.commonErrors.grammar || [])[0];
  if (err) items.push({ icon: "healing", title: `Chữa lỗi: ${err.label}`, desc: `Em đã mắc lỗi này ${err.count} lần.`, view: "errorHealing", cta: "Chữa lỗi" });
  if (board.stats.firstAvg !== null && board.stats.firstAvg < target) items.push({ icon: "track_changes", title: `Còn ${r1(target - board.stats.firstAvg)} điểm tới mục tiêu ${target}`, desc: "Làm thêm bài kiểm tra và xem lại câu sai sau mỗi bài.", view: "tests", cta: "Làm bài" });
  items.push({ icon: "sports_esports", title: "Thử thách đấu trường", desc: "Thắng bot Dễ +5, Thường +10, Khó +15 cà rốt.", view: "pvp", cta: "Vào đấu" });
  return { goal: { minutes: goal, todayMinutes: todayMin, weekMinutes: Math.round((summary.studyTime.weekSeconds || 0) / 60) }, targetScore: target, items: items.slice(0, 5) };
}

module.exports = { build, recommend };
