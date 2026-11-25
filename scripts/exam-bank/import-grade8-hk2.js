require("dotenv").config();
const path = require("path");
const mammoth = require("mammoth");
const pool = require("../../database/db");
const ai = require("../../services/ai-service");
const { structureTestWithAi } = require("../../services/test-structurer");

const SRC_DIR = "d:/typeshi/Bộ đề KT Tiếng Anh 8 kì 2 - Đại Lợi";
const F15 = path.join(SRC_DIR, "I. ĐỀ KIỂM TRA 15 PHÚT - HỌC KỲ 2.docx");
const FCK = path.join(SRC_DIR, "III. ĐẾ KIỂM TRA CUỐI HỌC KỲ - HỌC KỲ 2.docx");
const FKEY = path.join(SRC_DIR, "ĐÁP ÁN KT kì 2.docx");

const DEFAULT_TIERS = {
  advanced: { easy: 25, medium: 35, hard: 40, timeFactor: 0.9 },
  regular: { easy: 45, medium: 40, hard: 15, timeFactor: 1.1 }
};

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

function splitSections(text, regex) {
  const matches = [...text.matchAll(regex)];
  const out = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    out.push({ header: matches[i][0].trim(), body: text.slice(start, end).trim(), groups: matches[i].slice(1) });
  }
  return out;
}

(async () => {
  const [t15, tck, tkey] = await Promise.all([
    mammoth.extractRawText({ path: F15 }).then(r => r.value),
    mammoth.extractRawText({ path: FCK }).then(r => r.value),
    mammoth.extractRawText({ path: FKEY }).then(r => r.value)
  ]);

  const k15Start = tkey.search(/15-MINUTE ENGLISH TEST/i);
  const kMidStart = tkey.search(/MID-TERM TEST/i);
  const kCkStart = tkey.search(/SECOND TERM TEST 1/i);
  const key15Text = tkey.slice(k15Start, kMidStart > k15Start ? kMidStart : tkey.length);
  const keyCkText = tkey.slice(kCkStart);

  const key15List = splitSections(key15Text, /15-MINUTE ENGLISH TEST\s+N[O0Q][.\-\s]*(\d+)\s*\(UNIT\s*(\d+)\)/gi);
  const keyCkList = splitSections(keyCkText, /SECOND TERM TEST\s+(\d+)/gi);

  const test15List = splitSections(t15, /15-MINUTE ENGLISH TEST\s+N[O0Q][.\-\s]*(\d+)\s*\(UNIT\s*(\d+)\)/gi);
  const testCkList = splitSections(tck, /ENGLISH SECOND TERM TEST\s+(\d+)/gi);

  const jobs = [];
  // Pick 2 15-minute tests per Unit (Units 7..12 => 12 KTTX HK2 tests)
  for (let u = 7; u <= 12; u++) {
    const unitTests = test15List.filter(t => Number(t.groups[1]) === u).slice(0, 2);
    for (const t of unitTests) {
      const no = Number(t.groups[0]);
      const k = key15List.find(x => Number(x.groups[0]) === no) || key15List.find(x => Number(x.groups[1]) === u);
      jobs.push({
        slug: `kttx-u${u}-no${no}`,
        title: `Anh 8 · Thường xuyên HK2 · Unit ${u} (Đề ${no})`,
        type: "kttx",
        unitNo: u,
        duration: 15,
        text: t.body + "\n\n=== ĐÁP ÁN ===\n" + (k ? k.body : "")
      });
    }
  }
  // Pick 3 Final Term II tests (KTCK HK2)
  for (const t of testCkList.slice(0, 3)) {
    const no = Number(t.groups[0]);
    const k = keyCkList.find(x => Number(x.groups[0]) === no);
    jobs.push({
      slug: `ktck-hk2-no${no}`,
      title: `Anh 8 · Cuối kì HK2 · Đề ${no}`,
      type: "ktck",
      unitNo: null,
      duration: 60,
      text: t.body + "\n\n=== ĐÁP ÁN ===\n" + (k ? k.body : "")
    });
  }

  const [tRows] = await pool.query("SELECT id FROM users WHERE role IN ('admin','teacher') ORDER BY role = 'admin' DESC, id LIMIT 1");
  if (!tRows.length) throw new Error("Chưa có tài khoản giáo viên/admin.");
  const teacherId = tRows[0].id;
  const [have] = await pool.query("SELECT source_file_name FROM imported_tests WHERE source_file_name LIKE 'bank:g8-hk2-%'");
  const done = new Set(have.map(r => r.source_file_name));

  let ok = 0, fail = 0;
  for (const job of jobs) {
    const sourceKey = "bank:g8-hk2-" + job.slug;
    if (done.has(sourceKey)) { console.log("SKIP (exists):", job.title); continue; }
    try {
      const test = await structureTestWithAi(job.text, {
        title: job.title,
        hints: `grade 8; ${job.type.toUpperCase()}; học kì 2${job.unitNo ? "; Unit " + job.unitNo : ""}`
      });
      if (!test.questions || !test.questions.length) throw new Error("0 questions structured");
      const perQuestion = await ai.analyzeTestQuestions(test.questions);
      const analysis = { perQuestion, variants: buildVariants(test.questions, perQuestion), matrixId: null, analyzedAt: new Date().toISOString() };
      await pool.execute(
        "INSERT INTO imported_tests (teacher_id, title, source_file_name, class_name, questions_json, summary_json, analysis_json, matrix_id, duration_minutes, test_type, semester, unit_no, grade) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [teacherId, job.title, sourceKey, null, JSON.stringify({ ...test, sourceFile: job.slug }), JSON.stringify(test.summary), JSON.stringify(analysis), null, job.duration, job.type, 2, job.unitNo, 8]
      );
      ok++;
      console.log(`OK ${job.title}: ${test.questions.length} câu`);
    } catch (e) {
      fail++;
      console.error(`FAIL ${job.title}:`, e.message);
    }
  }
  console.log(`Done importing Grade 8 HK2 exams: ok=${ok}, fail=${fail}`);
  await pool.end();
  process.exit(fail > 0 && ok === 0 ? 1 : 0);
})();
