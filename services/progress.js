const pool = require("../database/db");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let healingLabelCache = null;
function healingLabels() {
  if (healingLabelCache) return healingLabelCache;
  healingLabelCache = {};
  try {
    const ctx = { window: {} };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "../public/data/healing-bank.js"), "utf8"), ctx);
    for (const [code, v] of Object.entries(ctx.window.ENGO_HEALING_BANK || {})) healingLabelCache[code] = v && v.label ? v.label : code;
  } catch (e) {}
  return healingLabelCache;
}

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

function round1(n) { return Number((Number(n) || 0).toFixed(1)); }

const colCache = {};
async function tableCols(table) {
  if (colCache[table]) return colCache[table];
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM " + table);
    colCache[table] = new Set(cols.map(c => c.Field));
  } catch (e) { colCache[table] = new Set(); }
  return colCache[table];
}
async function optCols(table, alias, cols) {
  const have = await tableCols(table);
  return cols.map(c => (have.has(c) ? `${alias}.${c}` : `NULL AS ${c}`)).join(", ");
}
function invalidateColumnCache() { Object.keys(colCache).forEach(k => delete colCache[k]); }

async function recordLearningEvent({ studentId, type, refId = null, title = null, score = null, maxScore = null, meta = null }) {
  try {
    await pool.execute(
      "INSERT INTO learning_events (student_id, event_type, ref_id, title, score, max_score, meta_json) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [studentId, type, refId !== null ? String(refId) : null, title, score, maxScore, meta ? JSON.stringify(meta) : null]
    );
  } catch (e) {
    console.warn("recordLearningEvent failed:", e.message);
  }
}

function scoreSubmissionRow(row) {
  const summary = parseJson(row.summary_json, {});
  const objectiveScore = Number(row.objective_score || 0);
  const manualScore = row.manual_score !== null && row.manual_score !== undefined ? Number(row.manual_score) : null;
  const totalScore = manualScore !== null ? Number((objectiveScore + manualScore).toFixed(2)) : objectiveScore;
  const maxScore = Number(row.objective_max || 0) > 0
    ? Number(row.objective_max) + Number(summary.manualPoints || (summary.totalPoints ? Math.max(0, summary.totalPoints - Number(row.objective_max)) : 0))
    : Number(summary.totalPoints || 10);
  const safeMax = maxScore > 0 ? maxScore : 10;
  const scoreOnTen = round1((totalScore / safeMax) * 10);
  return { objectiveScore, manualScore, totalScore, maxScore: safeMax, scoreOnTen };
}

async function getSpeakingProgress(studentId) {
  const [attempts] = await pool.execute(
    "SELECT stage, item_index, accuracy, errors_json, created_at, context FROM speaking_attempts WHERE student_id = ? ORDER BY created_at ASC",
    [studentId]
  );
  const [subs] = await pool.execute(
    `SELECT ss.assignment_id, ss.accuracy_percent, ${await optCols("speaking_submissions", "ss", ["best_accuracy", "attempts"])}, ${await optCols("speaking_assignments", "sa", ["stage"])}, sa.title
     FROM speaking_submissions ss JOIN speaking_assignments sa ON sa.id = ss.assignment_id
     WHERE ss.student_id = ?`,
    [studentId]
  );
  const [assignRows] = (await tableCols("speaking_assignments")).has("stage")
    ? await pool.execute("SELECT stage, COUNT(*) AS total FROM speaking_assignments GROUP BY stage")
    : await pool.execute("SELECT 1 AS stage, COUNT(*) AS total FROM speaking_assignments");
  const totalsByStage = {};
  assignRows.forEach(r => { totalsByStage[Number(r.stage) || 1] = Number(r.total); });

  const stages = {};
  for (const stage of [1, 2]) {
    const stageAttempts = attempts.filter(a => Number(a.stage) === stage);
    const stageSubs = subs.filter(s => Number(s.stage) === stage);
    const avg = stageAttempts.length ? Math.round(stageAttempts.reduce((s, a) => s + Number(a.accuracy), 0) / stageAttempts.length) : 0;
    const best = stageAttempts.length ? Math.max(...stageAttempts.map(a => Number(a.accuracy))) : 0;
    const recent = stageAttempts.slice(-8);
    const early = stageAttempts.slice(0, 8);
    const recentAvg = recent.length ? Math.round(recent.reduce((s, a) => s + Number(a.accuracy), 0) / recent.length) : 0;
    const earlyAvg = early.length ? Math.round(early.reduce((s, a) => s + Number(a.accuracy), 0) / early.length) : 0;
    stages[stage] = {
      stage,
      attempts: stageAttempts.length,
      avgAccuracy: avg,
      bestAccuracy: best,
      improvement: stageAttempts.length >= 4 ? recentAvg - earlyAvg : 0,
      assignmentsTotal: totalsByStage[stage] || 0,
      assignmentsDone: stageSubs.length,
      unlocked: stage === 1 ? true : (stageAttempts.length > 0 || (stages[1] && stages[1].avgAccuracy >= 70 && stages[1].attempts >= 3)),
      submissions: stageSubs.map(s => ({ assignmentId: s.assignment_id, title: s.title, best: Number(s.best_accuracy || s.accuracy_percent || 0), attempts: Number(s.attempts || 1) }))
    };
  }

  const byDay = {};
  attempts.forEach(a => {
    const d = new Date(a.created_at).toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { sum: 0, n: 0 };
    byDay[d].sum += Number(a.accuracy); byDay[d].n += 1;
  });
  const trend = Object.keys(byDay).sort().slice(-14).map(d => ({ date: d, accuracy: Math.round(byDay[d].sum / byDay[d].n), attempts: byDay[d].n }));

  const wordErrors = {};
  const grammarErrors = {};
  attempts.slice(-60).forEach(a => {
    const errs = parseJson(a.errors_json, []);
    (errs || []).forEach(e => {
      const w = String(e.word || "").toLowerCase().replace(/[^a-z']/g, "");
      if (!w) return;
      if (e.type === "grammar") grammarErrors[e.subtype || "ending"] = (grammarErrors[e.subtype || "ending"] || 0) + 1;
      else wordErrors[w] = (wordErrors[w] || 0) + 1;
    });
  });
  const topWords = Object.entries(wordErrors).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([word, count]) => ({ word, count }));

  const all = attempts.length;
  const overallAvg = all ? Math.round(attempts.reduce((s, a) => s + Number(a.accuracy), 0) / all) : 0;
  const overallBest = all ? Math.max(...attempts.map(a => Number(a.accuracy))) : 0;

  return { totalAttempts: all, avgAccuracy: overallAvg, bestAccuracy: overallBest, stages, trend, topWords, grammarErrors };
}

async function getTestProgress(studentId) {
  const [rows] = await pool.execute(
    `SELECT ws.id, ws.test_id, ws.objective_score, ws.manual_score, ws.status, ws.submitted_at,
            ${await optCols("writing_submissions", "ws", ["objective_max", "speaking_score", "tab_violations", "variant"])}, it.title AS test_title, it.summary_json
     FROM writing_submissions ws JOIN imported_tests it ON it.id = ws.test_id
     WHERE ws.student_id = ? ORDER BY ws.submitted_at ASC`,
    [studentId]
  );
  const list = rows.map(r => {
    const sc = scoreSubmissionRow(r);
    return {
      id: r.id, testId: r.test_id, title: r.test_title, status: r.status, submittedAt: r.submitted_at,
      scoreOnTen: sc.scoreOnTen, totalScore: sc.totalScore, maxScore: sc.maxScore,
      speakingScore: Number(r.speaking_score || 0), tabViolations: Number(r.tab_violations || 0), variant: r.variant || "full"
    };
  });
  const avg = list.length ? round1(list.reduce((s, r) => s + r.scoreOnTen, 0) / list.length) : 0;
  const best = list.length ? Math.max(...list.map(r => r.scoreOnTen)) : 0;
  const last3 = list.slice(-3);
  const first3 = list.slice(0, 3);
  const improvement = list.length >= 2
    ? round1(last3.reduce((s, r) => s + r.scoreOnTen, 0) / last3.length - first3.reduce((s, r) => s + r.scoreOnTen, 0) / first3.length)
    : 0;
  return { count: list.length, avgScore: avg, bestScore: best, improvement, pending: list.filter(r => r.status === "pending_manual").length, history: list };
}

async function getEventProgress(studentId) {
  const [rows] = await pool.execute(
    "SELECT id, event_type, ref_id, title, score, max_score, meta_json, created_at FROM learning_events WHERE student_id = ? ORDER BY created_at DESC LIMIT 200",
    [studentId]
  );
  const events = rows.map(r => ({
    id: r.id, type: r.event_type, refId: r.ref_id, title: r.title,
    score: r.score !== null ? Number(r.score) : null, maxScore: r.max_score !== null ? Number(r.max_score) : null,
    meta: parseJson(r.meta_json, null), createdAt: r.created_at
  }));
  const vocab = events.filter(e => e.type === "vocab");
  const vocabAvg = vocab.length ? Math.round(vocab.reduce((s, e) => s + (e.maxScore ? (e.score / e.maxScore) * 100 : Number(e.score || 0)), 0) / vocab.length) : 0;
  const uniqueSets = new Set(vocab.map(e => e.refId || e.title)).size;
  const healing = events.filter(e => e.type === "healing");
  const pct = list => list.length ? Math.round(list.reduce((s, e) => s + (e.maxScore ? (e.score / e.maxScore) * 100 : Number(e.score || 0)), 0) / list.length) : 0;
  const listening = events.filter(e => e.type === "listening");
  const grammar = events.filter(e => e.type === "grammar");
  const unitsOf = list => new Set(list.map(e => e.meta?.unit || e.refId)).size;
  return {
    events: events.slice(0, 40),
    vocab: { sessions: vocab.length, setsCompleted: uniqueSets, avgQuizPercent: vocabAvg, recent: vocab.slice(0, 5) },
    listening: { sessions: listening.length, avgPercent: pct(listening), unitsDone: unitsOf(listening), recent: listening.slice(0, 5) },
    grammar: { sessions: grammar.length, avgPercent: pct(grammar), unitsDone: unitsOf(grammar), recent: grammar.slice(0, 5) },
    healing: { healed: healing.length, recent: healing.slice(0, 5) },
    activeDays: new Set(events.map(e => new Date(e.createdAt).toISOString().slice(0, 10))).size
  };
}

const COVERAGE_TARGETS = { tests: 8, speakingAttempts: 40, listening: 24, grammar: 12, vocab: 12, writing: 6 };
function coverage(done, target) { return Math.min(1, (Number(done) || 0) / target); }
function skill(quality, cov) { return Math.max(0, Math.min(100, Math.round((Number(quality) || 0) * cov))); }
function buildSkillScores({ tests, speaking, eventsInfo }) {
  const testPct = tests.count ? tests.avgScore * 10 : 0;
  const testCov = coverage(tests.count, COVERAGE_TARGETS.tests);
  const speakCov = coverage(speaking.totalAttempts, COVERAGE_TARGETS.speakingAttempts);
  const listenCov = coverage(eventsInfo.listening.sessions, COVERAGE_TARGETS.listening);
  const gramCov = coverage(eventsInfo.grammar.sessions, COVERAGE_TARGETS.grammar);
  const vocabCov = coverage(eventsInfo.vocab.sessions, COVERAGE_TARGETS.vocab);
  const writingScored = tests.history.filter(h => h.status === "graded");
  const writingPct = writingScored.length ? writingScored.reduce((s, h) => s + h.scoreOnTen, 0) / writingScored.length * 10 : 0;
  const gramParts = [];
  if (eventsInfo.grammar.sessions) gramParts.push({ q: eventsInfo.grammar.avgPercent, w: gramCov });
  if (tests.count) gramParts.push({ q: testPct, w: testCov });
  const grammar = gramParts.length ? gramParts.reduce((s, x) => s + x.q * x.w, 0) / gramParts.reduce((s, x) => s + x.w, 0) * Math.min(1, gramCov + testCov) : 0;
  return {
    Listening: skill(eventsInfo.listening.sessions ? eventsInfo.listening.avgPercent : 0, listenCov),
    Speaking: skill(speaking.avgAccuracy, speakCov),
    Vocabulary: skill(eventsInfo.vocab.avgQuizPercent, vocabCov),
    Grammar: Math.round(grammar),
    Writing: skill(writingPct, coverage(writingScored.length, COVERAGE_TARGETS.writing)),
    Reading: skill(testPct, testCov)
  };
}

function computeTitles({ tests, speaking, eventsInfo }) {
  const titles = [];
  const push = (id, name, icon, desc, earned) => titles.push({ id, name, icon, desc, earned: Boolean(earned) });
  push("pron_king", "Vua Phát Âm", "mic", "Trung bình phát âm ≥ 85% với ít nhất 15 lượt luyện", speaking.totalAttempts >= 15 && speaking.avgAccuracy >= 85);
  push("pron_rising", "Ngôi Sao Phát Âm", "star", "Đạt ít nhất một lượt ≥ 95%", speaking.bestAccuracy >= 95);
  push("dialogue_master", "Bậc Thầy Hội Thoại", "forum", "Hoàn thành giai đoạn 2 với trung bình ≥ 80%", (speaking.stages[2]?.attempts || 0) >= 8 && (speaking.stages[2]?.avgAccuracy || 0) >= 80);
  push("grammar_king", "Vua Ngữ Pháp", "menu_book", "Điểm kiểm tra TB ≥ 8.5 (≥ 3 bài) hoặc bài tập ngữ pháp ≥ 85% ở 6 unit", (tests.count >= 3 && tests.avgScore >= 8.5) || (eventsInfo.grammar.unitsDone >= 6 && eventsInfo.grammar.avgPercent >= 85));
  push("listening_king", "Vua Nghe", "headphones", "Luyện nghe ≥ 6 bài với trung bình ≥ 85%", eventsInfo.listening.sessions >= 6 && eventsInfo.listening.avgPercent >= 85);
  push("test_ace", "Chiến Binh Phòng Thi", "shield", "Hoàn thành 5 bài kiểm tra không vi phạm", tests.count >= 5 && tests.history.every(h => !h.tabViolations));
  push("vocab_king", "Vua Từ Vựng", "abc", "Hoàn thành 5 bộ từ vựng với điểm ≥ 80%", eventsInfo.vocab.setsCompleted >= 5 && eventsInfo.vocab.avgQuizPercent >= 80);
  push("healer", "Bác Sĩ Ngữ Pháp", "stethoscope", "Chữa khỏi 10 lỗi trong Phòng chữa lỗi", eventsInfo.healing.healed >= 10);
  push("rising_star", "Tiến Bộ Vượt Bậc", "rocket_launch", "Điểm kiểm tra tăng ≥ 1.5 điểm so với lúc bắt đầu", tests.improvement >= 1.5);
  push("diligent", "Học Sinh Chăm Chỉ", "local_fire_department", "Hoạt động học tập trong 10 ngày khác nhau", eventsInfo.activeDays >= 10);
  return titles;
}

async function buildStudentProgress(studentId) {
  const [tests, speaking, eventsInfo] = await Promise.all([
    getTestProgress(studentId),
    getSpeakingProgress(studentId),
    getEventProgress(studentId)
  ]);
  const skills = buildSkillScores({ tests, speaking, eventsInfo });
  const titles = computeTitles({ tests, speaking, eventsInfo });
  const values = Object.values(skills);
  const overall = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
  return {
    tests,
    speaking,
    vocab: eventsInfo.vocab,
    listening: eventsInfo.listening,
    grammar: eventsInfo.grammar,
    healing: eventsInfo.healing,
    events: eventsInfo.events,
    activeDays: eventsInfo.activeDays,
    skills,
    overall,
    titles,
    earnedTitles: titles.filter(t => t.earned)
  };
}

let studyReady = null;
function ensureStudyTime() {
  if (!studyReady) studyReady = pool.query("CREATE TABLE IF NOT EXISTS study_time (student_id BIGINT UNSIGNED NOT NULL, day DATE NOT NULL, seconds INT NOT NULL DEFAULT 0, PRIMARY KEY (student_id, day)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4").catch(e => { studyReady = null; throw e; });
  return studyReady;
}
function vnDay(offsetDays = 0) {
  return new Date(Date.now() + 7 * 3600 * 1000 - offsetDays * 86400000).toISOString().slice(0, 10);
}
async function recordStudyTime(studentId, seconds) {
  const s = Math.max(0, Math.min(180, Math.round(Number(seconds) || 0)));
  if (!s) return 0;
  await ensureStudyTime();
  await pool.execute("INSERT INTO study_time (student_id, day, seconds) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE seconds = LEAST(43200, seconds + VALUES(seconds))", [studentId, vnDay(), s]);
  return s;
}
async function getStudyTime(studentId) {
  await ensureStudyTime();
  const [rows] = await pool.execute("SELECT DATE_FORMAT(day, '%Y-%m-%d') AS d, seconds FROM study_time WHERE student_id = ? ORDER BY day DESC LIMIT 60", [studentId]);
  const map = Object.fromEntries(rows.map(r => [r.d, Number(r.seconds)]));
  const last7 = Array.from({ length: 7 }, (_, i) => { const d = vnDay(6 - i); return { date: d, seconds: map[d] || 0 }; });
  const [tot] = await pool.execute("SELECT COALESCE(SUM(seconds), 0) AS total FROM study_time WHERE student_id = ?", [studentId]);
  return { totalSeconds: Number(tot[0].total) || 0, todaySeconds: map[vnDay()] || 0, weekSeconds: last7.reduce((s, x) => s + x.seconds, 0), last7 };
}

const GRAMMAR_LABELS = { ending: "Đuôi -s/-ed", tense: "Thì của động từ", article: "Mạo từ", preposition: "Giới từ", "word-form": "Từ loại (word form)", agreement: "Hoà hợp chủ ngữ – động từ", comparison: "So sánh", passive: "Câu bị động", conditional: "Câu điều kiện", reported: "Câu tường thuật", relative: "Mệnh đề quan hệ", gerund: "V-ing / to V", pronunciation: "Phát âm", vocabulary: "Từ vựng" };
async function getCommonErrors(studentId, speaking) {
  const out = { grammar: [], sections: [], words: (speaking && speaking.topWords) || [], total: 0 };
  let profile = null;
  try {
    const [rows] = await pool.execute("SELECT data_json FROM user_data WHERE user_id = ? AND data_key = 'engoHealingProfileV3' LIMIT 1", [studentId]);
    if (rows.length) profile = parseJson(rows[0].data_json, null);
  } catch (e) {}
  const count = (list, keyFn) => { const m = {}; (list || []).forEach(x => { const k = keyFn(x); if (k) m[k] = (m[k] || 0) + 1; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  if (profile) {
    const g = count(profile.grammar, x => x && (x.code || x.type || x.label));
    const sg = speaking && speaking.grammarErrors ? Object.entries(speaking.grammarErrors) : [];
    const merged = {};
    [...g, ...sg].forEach(([k, n]) => { merged[k] = (merged[k] || 0) + n; });
    out.grammar = Object.entries(merged).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([code, n]) => ({ code, label: GRAMMAR_LABELS[code] || healingLabels()[code] || code, count: n }));
    out.sections = count(profile.test, x => x && x.section).slice(0, 5).map(([section, n]) => ({ section, count: n }));
    out.total = (profile.grammar || []).length + (profile.test || []).length + (profile.pronunciation || []).length;
  } else if (speaking && speaking.grammarErrors) {
    out.grammar = Object.entries(speaking.grammarErrors).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([code, n]) => ({ code, label: GRAMMAR_LABELS[code] || healingLabels()[code] || code, count: n }));
  }
  return out;
}

async function getReminders(studentId, progress, study, className) {
  const out = [];
  const today = vnDay();
  const lastDates = [progress.events[0] && progress.events[0].createdAt, progress.tests.history.length && progress.tests.history[progress.tests.history.length - 1].submittedAt].filter(Boolean).map(d => new Date(new Date(d).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10));
  const studiedToday = study.todaySeconds >= 120 || lastDates.includes(today);
  const last = [...lastDates, ...study.last7.filter(x => x.seconds > 0).map(x => x.date)].sort().pop();
  const idleDays = last ? Math.round((new Date(today) - new Date(last)) / 86400000) : null;
  if (idleDays === null) out.push({ level: "warn", icon: "hourglass_empty", text: "Con chưa bắt đầu học trên ENGO. Hãy cùng con đăng nhập và làm bài đầu tiên." });
  else if (idleDays >= 3) out.push({ level: "danger", icon: "notifications_active", text: `Con đã ${idleDays} ngày chưa học. Nhắc con dành 15 phút học từ vựng hoặc luyện nói hôm nay nhé.` });
  else if (!studiedToday) out.push({ level: "info", icon: "schedule", text: "Hôm nay con chưa học. Nhắc con học ít nhất 15 phút." });
  try {
    const [pending] = await pool.execute(
      `SELECT COUNT(*) AS n FROM imported_tests it WHERE (it.class_name = ? OR ((it.class_name IS NULL OR it.class_name = '') AND it.source_file_name NOT LIKE 'bank:%'))
       AND it.created_at >= DATE_SUB(NOW(), INTERVAL 21 DAY) AND NOT EXISTS (SELECT 1 FROM writing_submissions ws WHERE ws.test_id = it.id AND ws.student_id = ?)`,
      [className || "", studentId]
    );
    const n = Number(pending[0].n) || 0;
    if (n) out.push({ level: "warn", icon: "assignment_late", text: `Còn ${n} bài kiểm tra giáo viên giao con chưa làm.` });
  } catch (e) {}
  const recent = progress.tests.history.slice(-1)[0];
  if (recent && recent.scoreOnTen < 5) out.push({ level: "warn", icon: "trending_down", text: `Bài gần nhất "${recent.title}" con được ${recent.scoreOnTen} điểm. Con nên vào Phòng chữa lỗi để ôn lại câu sai.` });
  if (recent && recent.scoreOnTen >= 8) out.push({ level: "good", icon: "celebration", text: `Con làm tốt bài "${recent.title}" (${recent.scoreOnTen} điểm). Hãy khen con nhé!` });
  if (study.weekSeconds >= 3600) out.push({ level: "good", icon: "local_fire_department", text: `Tuần này con đã học ${Math.round(study.weekSeconds / 60)} phút — rất chăm chỉ!` });
  return out;
}

async function buildStudentSummary(student) {
  const progress = await buildStudentProgress(student.id);
  const study = await getStudyTime(student.id).catch(() => ({ totalSeconds: 0, todaySeconds: 0, weekSeconds: 0, last7: [] }));
  const errors = await getCommonErrors(student.id, progress.speaking);
  const reminders = await getReminders(student.id, progress, study, student.class_name);
  const wordform = progress.events.filter(e => e.type === "wordform");
  return {
    student: { id: student.id, fullName: student.full_name, className: student.class_name || null },
    generatedAt: new Date().toISOString(),
    scores: {
      testAvg: progress.tests.avgScore, testBest: progress.tests.bestScore, testCount: progress.tests.count, improvement: progress.tests.improvement,
      speakingAvg: progress.speaking.avgAccuracy, vocabAvg: progress.vocab.avgQuizPercent, listeningAvg: progress.listening.avgPercent, grammarAvg: progress.grammar.avgPercent,
      overall: progress.overall, skills: progress.skills,
      history: progress.tests.history.slice(-10).map(h => ({ title: h.title, score: h.scoreOnTen, at: h.submittedAt, status: h.status })),
    },
    studyTime: study,
    completed: {
      tests: progress.tests.count, vocabSets: progress.vocab.setsCompleted, listeningUnits: progress.listening.unitsDone, grammarUnits: progress.grammar.unitsDone,
      speakingAttempts: progress.speaking.totalAttempts, healed: progress.healing.healed, wordformSessions: wordform.length, activeDays: progress.activeDays,
    },
    commonErrors: errors,
    titles: progress.earnedTitles.map(t => ({ name: t.name, icon: t.icon })),
    reminders,
  };
}

module.exports = { recordLearningEvent, buildStudentProgress, buildStudentSummary, recordStudyTime, getStudyTime, getSpeakingProgress, getTestProgress, scoreSubmissionRow, parseJson, invalidateColumnCache };
