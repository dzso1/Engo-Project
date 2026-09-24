require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../../database/db");
const ai = require("../../services/ai-service");
const { structureTestWithAi } = require("../../services/test-structurer");

const ROOT = path.resolve(__dirname, "../..");
const TEXT_DIR = path.join(ROOT, ".import/text");
const OUT_DIR = path.join(ROOT, ".import/structured");
fs.mkdirSync(OUT_DIR, { recursive: true });

const args = process.argv.slice(2);
const argOf = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const ONLY_GRADE = Number(argOf("--grade", 0)) || null;
const LIMIT = Number(argOf("--limit", 0)) || Infinity;
const CONC = Number(argOf("--concurrency", 3)) || 3;
const DRY = args.includes("--dry");
const CACHED_ONLY = args.includes("--cached-only");

const TYPE_LABEL = { kttx: "Thường xuyên", ktgk: "Giữa kì", ktck: "Cuối kì" };
const UNIT_OF_TX = { 1: { 1: 1, 2: 2, 3: 3, 4: 5, 5: 6 }, 2: { 1: 7, 2: 8, 3: 9, 4: 11, 5: 12 } };

function titleOf(rec, structured) {
  const parts = [`Anh ${rec.grade}`, `${TYPE_LABEL[rec.type]}${rec.type === "kttx" && rec.times ? " " + rec.times : ""} HK${rec.semester}`];
  if (rec.variant) parts.push(`Đề ${rec.variant}`);
  if (rec.inclusive) parts.push("Hoà nhập");
  if (rec.backup) parts.push("Dự phòng");
  if (rec.online) parts.push("Online");
  if (rec.className) parts.push(rec.className);
  return parts.join(" · ").slice(0, 200);
}

function durationFor(rec, test, analysis) {
  if (test.durationHint) return Math.max(5, Math.min(180, Number(test.durationHint)));
  if (rec.type === "ktgk" || rec.type === "ktck") return 60;
  const n = test.questions.length;
  const aiFull = analysis.variants.full.durationMinutes;
  return n <= 20 ? 15 : Math.max(15, Math.min(45, aiFull || 15));
}

const DEFAULT_TIERS = { advanced: { easy: 25, medium: 35, hard: 40, timeFactor: 0.9 }, regular: { easy: 45, medium: 40, hard: 15, timeFactor: 1.1 } };
function buildVariants(questions, analysis) {
  const ids = questions.map(q => q.id);
  const objective = questions.filter(q => !q.manual && q.type !== "speaking");
  const by = { easy: [], medium: [], hard: [] };
  objective.forEach(q => by[analysis[q.id]?.difficulty || "medium"].push(q.id));
  const total = objective.length;
  const keepFor = tier => {
    const hardAllowed = Math.max(1, Math.round((tier.hard / 100) * total));
    const mediumAllowed = Math.max(1, Math.round(((tier.hard + tier.medium) / 100) * total)) - Math.min(hardAllowed, by.hard.length);
    const dropHard = new Set(by.hard.slice(hardAllowed));
    const dropMedium = new Set(by.medium.slice(Math.max(mediumAllowed, Math.ceil(by.medium.length * 0.6))));
    return ids.filter(id => !dropHard.has(id) && !dropMedium.has(id));
  };
  const sum = list => list.reduce((s, id) => s + Number(analysis[id]?.seconds || 45), 0);
  const full = sum(ids), regularIds = keepFor(DEFAULT_TIERS.regular);
  return {
    full: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil(full / 60)) },
    advanced: { questionIds: ids, durationMinutes: Math.max(10, Math.ceil((full * 0.9) / 60)) },
    regular: { questionIds: regularIds, durationMinutes: Math.max(10, Math.ceil((sum(regularIds) * 1.1) / 60)) },
    counts: { easy: by.easy.length, medium: by.medium.length, hard: by.hard.length }
  };
}

async function structure(rec) {
  const cacheFile = path.join(OUT_DIR, rec.hash + ".json");
  if (fs.existsSync(cacheFile)) return JSON.parse(fs.readFileSync(cacheFile, "utf8"));
  const { text } = JSON.parse(fs.readFileSync(path.join(TEXT_DIR, rec.id + ".json"), "utf8"));
  const hints = `grade ${rec.grade}; ${rec.type.toUpperCase()}${rec.times ? " lần " + rec.times : ""}; học kì ${rec.semester}; file: ${path.basename(rec.rel)}`;
  const test = await structureTestWithAi(text, { title: titleOf(rec), hints });
  const perQuestion = await ai.analyzeTestQuestions(test.questions);
  const analysis = { perQuestion, variants: buildVariants(test.questions, perQuestion), matrixId: null, analyzedAt: new Date().toISOString() };
  const out = { test, analysis };
  fs.writeFileSync(cacheFile, JSON.stringify(out));
  return out;
}

(async () => {
  const index = JSON.parse(fs.readFileSync(path.join(TEXT_DIR, "_index.json"), "utf8"))
    .filter(r => r.grade && (!ONLY_GRADE || r.grade === ONLY_GRADE));
  const [tRows] = await pool.query("SELECT id FROM users WHERE role IN ('admin','teacher') ORDER BY role = 'admin' DESC, id LIMIT 1");
  if (!tRows.length) throw new Error("Chưa có tài khoản giáo viên/admin để gắn đề.");
  const teacherId = tRows[0].id;
  const [have] = await pool.query("SELECT source_file_name FROM imported_tests WHERE source_file_name LIKE 'bank:%'");
  const done = new Set(have.map(r => r.source_file_name));
  const [cols] = await pool.query("SHOW COLUMNS FROM imported_tests LIKE 'grade'");
  if (!cols.length) throw new Error("Bảng imported_tests chưa có cột grade - chạy database/migrate-v4.sql hoặc khởi động server một lần.");

  const todo = index.filter(r => !done.has("bank:" + r.hash) && (!CACHED_ONLY || fs.existsSync(path.join(OUT_DIR, r.hash + ".json")))).slice(0, LIMIT);
  console.log(`Tổng ${index.length} đề, đã có ${index.length - todo.length - Math.max(0, index.length - done.size - todo.length)} , cần nạp ${todo.length} (concurrency ${CONC}${DRY ? ", DRY" : ""})`);
  let ok = 0, fail = 0, i = 0;
  const log = m => { const line = `[${new Date().toISOString().slice(11, 19)}] ${m}`; console.log(line); fs.appendFileSync(path.join(ROOT, ".import/bank-log.txt"), line + "\n"); };
  const worker = async () => {
    while (i < todo.length) {
      const rec = todo[i++];
      const t0 = Date.now();
      try {
        const { test, analysis } = await structure(rec);
        const title = titleOf(rec, test);
        const duration = durationFor(rec, test, analysis);
        const unitNo = rec.type === "kttx" ? (UNIT_OF_TX[rec.semester] || {})[rec.times || 1] || null : null;
        if (!DRY) {
          await pool.execute(
            "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json, analysis_json, matrix_id, duration_minutes, test_type, semester, unit_no, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [teacherId, title, "bank:" + rec.hash, null, JSON.stringify({ ...test, sourceHash: rec.hash, sourceFile: rec.rel }), JSON.stringify(test.summary), JSON.stringify(analysis), null, duration, rec.type, rec.semester, unitNo, rec.grade]
          );
        }
        ok++;
        log(`OK ${ok + fail}/${todo.length} ${title} — ${test.questions.length} câu, ${duration}', keyIssues ${test.summary.keyIssueCount || 0}, dropped ${test.summary.droppedCount || 0} (${Math.round((Date.now() - t0) / 1000)}s)`);
      } catch (e) {
        fail++;
        log(`FAIL ${ok + fail}/${todo.length} ${rec.rel} :: ${e.message}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONC }, worker));
  log(`XONG: nạp ${ok}, lỗi ${fail}`);
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
