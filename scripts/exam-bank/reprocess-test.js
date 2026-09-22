require("dotenv").config();
const fs = require("fs");
const pool = require("../../database/db");
const ai = require("../../services/ai-service");
const { docxToText } = require("../../services/docx-text");
const { structureTestWithAi } = require("../../services/test-structurer");

(async () => {
  const [id, file, title] = process.argv.slice(2);
  if (!id || !file) { console.error("Dùng: node scripts/exam-bank/reprocess-test.js <id> <file> [tên]"); process.exit(1); }
  const buf = fs.readFileSync(file);
  const text = /\.pdf$/i.test(file) ? (await require("pdf-parse")(buf)).text : await docxToText(buf);
  const [rows] = await pool.execute("SELECT id, title, test_type FROM imported_tests WHERE id = ? LIMIT 1", [id]);
  if (!rows.length) throw new Error("Không có đề id " + id);
  const test = await structureTestWithAi(text, { title: title || rows[0].title, hints: file });
  const perQuestion = await ai.analyzeTestQuestions(test.questions);
  const ids = test.questions.map(q => q.id);
  const full = ids.reduce((s, qid) => s + Number(perQuestion[qid]?.seconds || 45), 0);
  const analysis = { perQuestion, variants: { full: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil(full / 60)) }, advanced: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil(full * 0.9 / 60)) }, regular: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil(full * 1.1 / 60)) }, counts: { easy: 0, medium: 0, hard: 0 } }, matrixId: null, analyzedAt: new Date().toISOString() };
  Object.values(perQuestion).forEach(a => { analysis.variants.counts[a.difficulty] = (analysis.variants.counts[a.difficulty] || 0) + 1; });
  const type = rows[0].test_type || "kttx";
  const duration = test.durationHint || (type === "kttx" ? (test.questions.length <= 20 ? 15 : 45) : 60);
  await pool.execute("UPDATE imported_tests SET title = ?, questions_json = ?, summary_json = ?, analysis_json = ?, duration_minutes = ? WHERE id = ?",
    [test.title, JSON.stringify(test), JSON.stringify(test.summary), JSON.stringify(analysis), duration, id]);
  console.log(`Đã cập nhật đề #${id}: "${test.title}", ${test.questions.length} câu, ${duration} phút, keyIssues:`, JSON.stringify(test.keyIssues));
  await pool.end();
})().catch(e => { console.error(e.message); process.exit(1); });
