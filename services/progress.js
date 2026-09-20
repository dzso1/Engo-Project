// ==========================================================
// TỔNG HỢP TIẾN ĐỘ HỌC TẬP CỦA TỪNG HỌC SINH
// (bài kiểm tra, luyện nói theo giai đoạn, từ vựng, chữa lỗi)
// ==========================================================
const pool = require("../database/db");

function parseJson(value, fallback) {
  if (value === null || value === undefined) return fallback;
  if (typeof value !== "string") return value;
  try { return JSON.parse(value); } catch (e) { return fallback; }
}

function round1(n) { return Number((Number(n) || 0).toFixed(1)); }

// Cột hiện có của từng bảng (cache) -> truy vấn vẫn chạy khi CSDL chưa migrate đủ cột
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
  // Điểm tối đa: theo biến thể đề (nếu có) hoặc tổng điểm của đề
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

  // Xu hướng theo ngày (điểm trung bình mỗi ngày, tối đa 14 ngày gần nhất)
  const byDay = {};
  attempts.forEach(a => {
    const d = new Date(a.created_at).toISOString().slice(0, 10);
    if (!byDay[d]) byDay[d] = { sum: 0, n: 0 };
    byDay[d].sum += Number(a.accuracy); byDay[d].n += 1;
  });
  const trend = Object.keys(byDay).sort().slice(-14).map(d => ({ date: d, accuracy: Math.round(byDay[d].sum / byDay[d].n), attempts: byDay[d].n }));

  // Từ hay sai nhất
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
  return {
    events: events.slice(0, 40),
    vocab: { sessions: vocab.length, setsCompleted: uniqueSets, avgQuizPercent: vocabAvg, recent: vocab.slice(0, 5) },
    healing: { healed: healing.length, recent: healing.slice(0, 5) },
    activeDays: new Set(events.map(e => new Date(e.createdAt).toISOString().slice(0, 10))).size
  };
}

function buildSkillScores({ tests, speaking, eventsInfo }) {
  const testPct = tests.count ? Math.round(tests.avgScore * 10) : 0;
  const speakingPct = speaking.totalAttempts ? speaking.avgAccuracy : 0;
  const vocabPct = eventsInfo.vocab.sessions ? eventsInfo.vocab.avgQuizPercent : 0;
  const grammarSignal = speaking.totalAttempts ? Math.max(0, 100 - Object.values(speaking.grammarErrors || {}).reduce((s, n) => s + n, 0) * 4) : 0;
  const grammar = tests.count ? Math.round((testPct * 0.7) + (grammarSignal ? grammarSignal * 0.3 : testPct * 0.3)) : (grammarSignal || 0);
  const writingScored = tests.history.filter(h => h.status === "graded");
  const writing = writingScored.length ? Math.round(writingScored.reduce((s, h) => s + h.scoreOnTen, 0) / writingScored.length * 10) : (tests.count ? Math.round(testPct * 0.8) : 0);
  const listening = speaking.totalAttempts ? Math.round(speakingPct * 0.85 + (eventsInfo.activeDays * 2)) : 0;
  return {
    Listening: Math.min(100, listening),
    Speaking: Math.min(100, speakingPct),
    Vocabulary: Math.min(100, vocabPct),
    Grammar: Math.min(100, grammar),
    Writing: Math.min(100, writing),
    Reading: Math.min(100, testPct)
  };
}

function computeTitles({ tests, speaking, eventsInfo }) {
  const titles = [];
  const push = (id, name, icon, desc, earned) => titles.push({ id, name, icon, desc, earned: Boolean(earned) });
  push("pron_king", "Vua Phát Âm", "🎙️", "Trung bình phát âm ≥ 85% với ít nhất 15 lượt luyện", speaking.totalAttempts >= 15 && speaking.avgAccuracy >= 85);
  push("pron_rising", "Ngôi Sao Phát Âm", "🌟", "Đạt ít nhất một lượt ≥ 95%", speaking.bestAccuracy >= 95);
  push("dialogue_master", "Bậc Thầy Hội Thoại", "💬", "Hoàn thành giai đoạn 2 với trung bình ≥ 80%", (speaking.stages[2]?.attempts || 0) >= 8 && (speaking.stages[2]?.avgAccuracy || 0) >= 80);
  push("grammar_king", "Vua Ngữ Pháp", "📘", "Điểm kiểm tra trung bình ≥ 8.5 (≥ 3 bài)", tests.count >= 3 && tests.avgScore >= 8.5);
  push("test_ace", "Chiến Binh Phòng Thi", "🛡️", "Hoàn thành 5 bài kiểm tra không vi phạm", tests.count >= 5 && tests.history.every(h => !h.tabViolations));
  push("vocab_king", "Vua Từ Vựng", "🔤", "Hoàn thành 5 bộ từ vựng với điểm ≥ 80%", eventsInfo.vocab.setsCompleted >= 5 && eventsInfo.vocab.avgQuizPercent >= 80);
  push("healer", "Bác Sĩ Ngữ Pháp", "🩺", "Chữa khỏi 10 lỗi trong Phòng chữa lỗi", eventsInfo.healing.healed >= 10);
  push("rising_star", "Tiến Bộ Vượt Bậc", "🚀", "Điểm kiểm tra tăng ≥ 1.5 điểm so với lúc bắt đầu", tests.improvement >= 1.5);
  push("diligent", "Học Sinh Chăm Chỉ", "🔥", "Hoạt động học tập trong 10 ngày khác nhau", eventsInfo.activeDays >= 10);
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
    healing: eventsInfo.healing,
    events: eventsInfo.events,
    activeDays: eventsInfo.activeDays,
    skills,
    overall,
    titles,
    earnedTitles: titles.filter(t => t.earned)
  };
}

module.exports = { recordLearningEvent, buildStudentProgress, getSpeakingProgress, getTestProgress, scoreSubmissionRow, parseJson, invalidateColumnCache };
