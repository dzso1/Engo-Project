// ============================================================
// Bước 3: kiểm chứng đáp án của từng đề bằng AI "giải độc lập" (không cho AI xem đáp án gốc),
// chỗ nào khác nhau thì gọi AI trọng tài phân xử có giải thích -> đáp án cuối + ghi chú cho giáo viên.
//   node scripts/exam-bank/verify-keys.js [--concurrency 3] [--limit N]      (chạy AI, cập nhật cache + DB theo .env)
//   node scripts/exam-bank/verify-keys.js --sync-only                          (chỉ đẩy cache đã kiểm chứng vào DB, vd Railway)
// ============================================================
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../../database/db");
const ai = require("../../services/ai-service");

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, ".import/structured");
const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const CONC = Number(argOf("--concurrency", 3)) || 3;
const LIMIT = Number(argOf("--limit", 0)) || Infinity;
const SYNC_ONLY = args.includes("--sync-only");
const log = m => { const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(line); fs.appendFileSync(path.join(ROOT, ".import/verify-log.txt"), line + "\n"); };

const norm = v => String(v || "").toLowerCase().replace(/[’‘`]/g, "'").replace(/[.!?;:,"]+$/g, "").replace(/\s+/g, " ").trim();
const objective = t => t.questions.filter(q => (q.type === "multiple_choice" || q.type === "short_answer") && !q.manual);
const compact = q => ({
  number: q.number, type: q.type,
  task: String(q.instruction || "").slice(0, 140),
  context: q.context ? String(q.context).slice(0, 900) : undefined,
  question: String(q.prompt || "").slice(0, 400),
  options: q.type === "multiple_choice" ? q.options.map(o => `${o.key}. ${o.text}`) : undefined,
});

async function solve(test) {
  const qs = objective(test).map(compact);
  if (!qs.length) return {};
  const system = `You are an expert English teacher. Solve each test item carefully and independently. Output valid JSON only.`;
  const user = `Solve these items from a Vietnamese secondary-school English test (grade ${test.grade || "6-9"}). <u>..</u> marks the underlined part in pronunciation items.
For multiple_choice give the option letter. For short_answer give the single best answer (word form / fill-in / rewritten sentence continuation).
Return JSON: {"answers":[{"number":1,"answer":"B","confidence":0.9}]}

ITEMS:
${JSON.stringify(qs)}`;
  const parsed = await ai.callAiJson(system, user, "verify_solve_" + test.sourceHashKey, 120000);
  const out = {};
  for (const a of (parsed && parsed.answers) || []) out[Number(a.number)] = { answer: String(a.answer || "").trim(), confidence: Number(a.confidence) || 0.5 };
  return out;
}

async function judge(test, disputes) {
  if (!disputes.length) return {};
  const system = `You are the head of an English department settling disagreements about answer keys. Decide the correct answer with rigorous grammar/vocabulary reasoning. Output valid JSON only.`;
  const user = `For each item, the printed key ("key") and an independent solver ("alt") disagree. Decide the FINAL correct answer.
- multiple_choice: "final" is one option letter.
- short_answer: "final" is a list of ALL fully correct answers (may include both if both are correct).
Give a one-sentence Vietnamese explanation in "why".
Return JSON: {"decisions":[{"number":5,"final":"A","why":"..."}]}

ITEMS:
${JSON.stringify(disputes)}`;
  const parsed = await ai.callAiJson(system, user, "verify_judge_" + test.sourceHashKey + "_" + disputes.map(d => d.number).join(","), 120000);
  const out = {};
  for (const d of (parsed && parsed.decisions) || []) out[Number(d.number)] = { final: d.final, why: String(d.why || "").slice(0, 200) };
  return out;
}

async function verifyOne(file) {
  const p = path.join(OUT_DIR, file);
  const data = JSON.parse(fs.readFileSync(p, "utf8"));
  const test = data.test;
  if (data.verification) return { skipped: true };
  test.sourceHashKey = file.replace(".json", "");
  let solved = {};
  // AI hay bị 429 khi chạy hàng loạt: thử lại có chờ, không có lời giải thì KHÔNG đánh dấu đã kiểm chứng
  for (let attempt = 0; attempt < 4 && !Object.keys(solved).length; attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 8000 * attempt));
    solved = await solve(test);
  }
  if (objective(test).length && !Object.keys(solved).length) throw new Error("AI không giải được (quota) - để lần sau");
  const disputes = [];
  let agreed = 0;
  for (const q of objective(test)) {
    const s = solved[q.number];
    if (!s || !s.answer) continue;
    if (q.type === "multiple_choice") {
      const alt = s.answer.toUpperCase().slice(0, 1);
      if (alt === q.answer) { agreed++; q.verified = true; continue; }
      disputes.push({ ...compact(q), key: q.answer, alt });
    } else {
      const acc = (q.accepted || []).map(norm);
      if (acc.includes(norm(s.answer))) { agreed++; q.verified = true; continue; }
      disputes.push({ ...compact(q), key: q.accepted, alt: s.answer });
    }
  }
  const decisions = disputes.length ? await judge(test, disputes) : {};
  let changed = 0, flagged = 0;
  for (const d of disputes) {
    const q = test.questions.find(x => x.number === d.number);
    const dec = decisions[d.number];
    if (!q || !dec) { q && (q.keyNote = (q.keyNote ? q.keyNote + " | " : "") + `AI giải ra "${d.alt}" khác đáp án - GV kiểm tra`); flagged++; continue; }
    if (q.type === "multiple_choice") {
      const fin = String(dec.final || "").toUpperCase().slice(0, 1);
      if (fin && q.options.some(o => o.key === fin) && fin !== q.answer) { q.keyNote = `Đáp án đổi ${q.answer} → ${fin}: ${dec.why}`; q.answer = fin; changed++; }
      else q.keyNote = `Giữ ${q.answer} (AI giải ra ${d.alt}): ${dec.why}`;
    } else {
      const list = (Array.isArray(dec.final) ? dec.final : [dec.final]).map(x => norm(x)).filter(Boolean);
      if (list.length) {
        const before = (q.accepted || []).join("/");
        q.accepted = [...new Set([...list, ...(q.accepted || []).filter(a => list.includes(norm(a)))])];
        if (q.accepted.join("/") !== before) { q.keyNote = `Đáp án điền: ${q.accepted.join(" / ")} (đề: ${before}): ${dec.why}`; changed++; }
      }
    }
    flagged++;
  }
  test.keyIssues = test.questions.filter(q => q.keyNote).map(q => ({ id: q.id, number: q.number, note: q.keyNote }));
  test.summary.keyIssueCount = test.keyIssues.length;
  delete test.sourceHashKey;
  data.verification = { at: new Date().toISOString(), objective: objective(test).length, agreed, disputes: disputes.length, changed };
  fs.writeFileSync(p, JSON.stringify(data));
  return { agreed, disputes: disputes.length, changed, flagged };
}

async function syncToDb(file) {
  const data = JSON.parse(fs.readFileSync(path.join(OUT_DIR, file), "utf8"));
  if (!data.verification) return false;
  const hash = file.replace(".json", "");
  const [rows] = await pool.execute("SELECT id, questions_json FROM imported_tests WHERE source_file_name = ? LIMIT 1", ["bank:" + hash]);
  if (!rows.length) return false;
  const stored = typeof rows[0].questions_json === "string" ? JSON.parse(rows[0].questions_json) : rows[0].questions_json;
  const merged = { ...stored, ...data.test, sourceHash: hash, sourceFile: stored.sourceFile };
  await pool.execute("UPDATE imported_tests SET questions_json = ?, summary_json = ? WHERE id = ?", [JSON.stringify(merged), JSON.stringify(data.test.summary), rows[0].id]);
  return true;
}

(async () => {
  const files = fs.readdirSync(OUT_DIR).filter(f => f.endsWith(".json"));
  if (SYNC_ONLY) {
    let n = 0; for (const f of files) if (await syncToDb(f)) n++;
    log(`SYNC: cập nhật ${n} đề vào DB`); await pool.end(); return;
  }
  const todo = files.filter(f => !JSON.parse(fs.readFileSync(path.join(OUT_DIR, f), "utf8")).verification).slice(0, LIMIT);
  log(`Kiểm chứng ${todo.length}/${files.length} đề (concurrency ${CONC})`);
  let i = 0, done = 0, totalChanged = 0, totalDisp = 0;
  const worker = async () => {
    while (i < todo.length) {
      const f = todo[i++];
      try {
        const r = await verifyOne(f);
        if (!r.skipped) { await syncToDb(f); done++; totalChanged += r.changed; totalDisp += r.disputes; log(`OK ${done}/${todo.length} ${f.slice(0, 8)} đồng ý ${r.agreed}, tranh chấp ${r.disputes}, đổi ${r.changed}`); }
      } catch (e) { log(`FAIL ${f} :: ${e.message}`); }
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  log(`XONG: ${done} đề, ${totalDisp} câu tranh chấp, ${totalChanged} câu đổi đáp án`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
