// ============================================================
// Sinh nội dung học theo Unit 1-12 (Tiếng Anh 9 Global Success) bằng AI:
//   - câu ví dụ cho từ vựng (từ file "TỪ VỰNG 9.docx")
//   - ngữ pháp: lý thuyết + bài tập
//   - luyện nghe: 3 mức (dễ / trung bình / khó) + câu hỏi
//   - luyện nói: câu đơn (dễ -> khó) + hội thoại
// Dùng: node scripts/generate-unit-content.js "<đường dẫn TỪ VỰNG 9.docx>" [unitTừ] [unitĐến]
// Kết quả ghi vào public/data/{vocab-decks,grammar-units,listening-sets,speaking-sets}.js
// Có thể chạy lại nhiều lần: unit đã sinh xong (cache trong data/unit-cache/) sẽ được bỏ qua.
// ============================================================
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { parseVocabDocx } = require("./parse-vocab-docx");
const ai = require("../services/ai-service");

const CACHE_DIR = path.join(__dirname, "..", "public", "data", "unit-cache");
const OUT_DIR = path.join(__dirname, "..", "public", "data");
fs.mkdirSync(CACHE_DIR, { recursive: true });

function cachePath(unit, kind) { return path.join(CACHE_DIR, `u${unit}-${kind}.json`); }
function readCache(unit, kind) { try { return JSON.parse(fs.readFileSync(cachePath(unit, kind), "utf8")); } catch (e) { return null; } }
function writeCache(unit, kind, data) { fs.writeFileSync(cachePath(unit, kind), JSON.stringify(data, null, 1)); }

async function withRetry(fn, label, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { const r = await fn(); if (r) return r; console.warn(`  [${label}] rỗng, thử lại ${i}/${tries}`); }
    catch (e) { console.warn(`  [${label}] lỗi: ${e.message} (thử ${i}/${tries})`); }
    await new Promise(r => setTimeout(r, 2500));
  }
  return null;
}

const SYSTEM = `You are an experienced Vietnamese lower-secondary English teacher who knows the textbook "Tiếng Anh 9 Global Success" (Bộ GD&ĐT, 2024) very well. Always answer with valid JSON only (no markdown fences).`;

function vocabContext(unit) {
  return unit.words.filter(w => w.meaning).slice(0, 60).map(w => `${w.word} (${w.pos}) = ${w.meaning}`).join("; ");
}

async function genExamples(unit) {
  const cached = readCache(unit.unit, "examples"); if (cached) return cached;
  const words = unit.words.filter(w => w.meaning);
  const chunks = []; for (let i = 0; i < words.length; i += 35) chunks.push(words.slice(i, i + 35));
  const result = {};
  for (const chunk of chunks) {
    const parsed = await withRetry(() => ai.callAiJson(SYSTEM, `For each vocabulary item of Unit ${unit.unit} "${unit.title}" write ONE natural example sentence (8-14 words, Grade 9 level, related to the unit topic) that contains the item, plus a Vietnamese translation of the sentence. Fix the Vietnamese meaning if it is missing.
Items: ${JSON.stringify(chunk.map(w => ({ word: w.word, pos: w.pos, meaning: w.meaning })))}
Return JSON: {"items":[{"word":"...","example":"...","exampleVi":"...","meaning":"(Vietnamese meaning)"}]}`, null, 90000), `U${unit.unit} examples`);
    (parsed?.items || []).forEach(it => { if (it && it.word) result[String(it.word).toLowerCase()] = it; });
  }
  writeCache(unit.unit, "examples", result); return result;
}

async function genGrammar(unit) {
  const cached = readCache(unit.unit, "grammar"); if (cached) return cached;
  const parsed = await withRetry(() => ai.callAiJson(SYSTEM, `Create the GRAMMAR lesson for Unit ${unit.unit} "${unit.title}" of Tiếng Anh 9 Global Success. Use the grammar focus of that unit in the official textbook ("A Closer Look 2" section). Unit vocabulary for context: ${vocabContext(unit)}.
Return JSON:
{"points":[{"name":"(tên điểm ngữ pháp, tiếng Anh)","explanation":"(giải thích ngắn gọn bằng tiếng Việt, 2-4 câu)","formula":"(công thức, vd: S + wish + S + V-ed)","notes":["(lưu ý tiếng Việt)"],"examples":[{"en":"...","vi":"..."}]}],
 "exercises":[{"type":"mc","level":"easy|medium|hard","prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt)"}],
 "rewrite":[{"level":"medium|hard","prompt":"(rewrite / fill-in instruction + sentence)","answer":"(đáp án chuẩn)","accepted":["(các đáp án chấp nhận khác, có thể rỗng)"],"explanation":"(tiếng Việt)"}]}
Requirements: 1-3 grammar points; exactly 12 "mc" exercises ordered easy(4) -> medium(4) -> hard(4) covering all points; 4 "rewrite" items. Options must include the letter prefix. Sentences use the unit's vocabulary and topic.`, null, 120000), `U${unit.unit} grammar`);
  if (!parsed) {
    // Bản rút gọn (ít câu, giải thích ngắn) khi bản đầy đủ quá dài làm hỏng JSON
    parsed = await withRetry(() => ai.callAiJson(SYSTEM, `Create a COMPACT grammar lesson for Unit ${unit.unit} "${unit.title}" of Tiếng Anh 9 Global Success (grammar focus of "A Closer Look 2"). Keep every text field short (explanation <= 2 sentences, explanation of exercises <= 1 sentence). Avoid double quotes inside strings.
Return JSON: {"points":[{"name":"...","explanation":"(tiếng Việt)","formula":"...","notes":[],"examples":[{"en":"...","vi":"..."}]}],
 "exercises":[{"type":"mc","level":"easy|medium|hard","prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt)"}],
 "rewrite":[{"level":"medium","prompt":"...","answer":"...","accepted":[],"explanation":"(tiếng Việt)"}]}
Exactly 9 "mc" (3 easy, 3 medium, 3 hard) and 3 "rewrite".`, null, 120000), `U${unit.unit} grammar-compact`, 2);
  }
  if (parsed) writeCache(unit.unit, "grammar", parsed); return parsed;
}

async function genListening(unit) {
  const cached = readCache(unit.unit, "listening"); if (cached) return cached;
  const parsed = await withRetry(() => ai.callAiJson(SYSTEM, `Create LISTENING practice for Unit ${unit.unit} "${unit.title}" of Tiếng Anh 9 Global Success (the audio will be produced by text-to-speech, so write clean, natural spoken English). Unit vocabulary: ${vocabContext(unit)}.
Three levels:
- "easy": 5 short independent sentences (6-10 words) about the topic; 4 multiple-choice questions checking key details.
- "medium": a dialogue between two students (A/B, 8 turns, 8-14 words per turn) in the style of the textbook; 5 multiple-choice questions.
- "hard": a monologue/passage of 110-140 words (radio report, talk or story) using the unit grammar & vocabulary; 5 multiple-choice questions including 1 inference question.
Return JSON: {"levels":[{"level":"easy","title":"...","intro":"(1 câu tiếng Việt mô tả tình huống)","script":["sentence 1","sentence 2"],"questions":[{"prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt, trích dẫn chỗ nghe được)"}]}]}
For "medium", each element of "script" is one turn like "A: ...". For "hard", "script" is an array of 3-5 sentences groups (plain text, no speaker label). Options include letter prefixes.`, null, 120000), `U${unit.unit} listening`);
  if (parsed) writeCache(unit.unit, "listening", parsed); return parsed;
}

async function genSpeaking(unit) {
  const cached = readCache(unit.unit, "speaking"); if (cached) return cached;
  const source = `UNIT ${unit.unit}: ${unit.title}. Vocabulary: ${vocabContext(unit)}`;
  const s1 = await withRetry(async () => { const r = await ai.generateSpeakingItems({ sourceText: source, unitTitle: `Unit ${unit.unit}: ${unit.title}`, stage: 1, count: 8 }); return r && r.source === "ai" ? r : null; }, `U${unit.unit} speaking-1`);
  const s2 = await withRetry(async () => { const r = await ai.generateSpeakingItems({ sourceText: source, unitTitle: `Unit ${unit.unit}: ${unit.title}`, stage: 2, count: 6 }); return r && r.source === "ai" ? r : null; }, `U${unit.unit} speaking-2`);
  const data = { items: s1?.items || [], dialogues: s2?.dialogues || [] };
  if (data.items.length || data.dialogues.length) writeCache(unit.unit, "speaking", data);
  return data;
}

function writeJs(file, varName, data, header) {
  fs.writeFileSync(path.join(OUT_DIR, file), `// ${header}\n// Sinh tự động bởi scripts/generate-unit-content.js (nguồn: TỪ VỰNG 9 Global Success + AI). Chỉnh tay được.\nwindow.${varName} = ${JSON.stringify(data, null, 1)};\n`);
}

function assemble(units) {
  const vocab = {}, grammar = {}, listening = {}, speaking = [];
  for (const u of units) {
    const ex = readCache(u.unit, "examples") || {};
    vocab[`unit${u.unit}`] = {
      name: `Unit ${u.unit} · ${u.title}`, unit: u.unit,
      cards: u.words.filter(w => w.meaning || ex[w.word.toLowerCase()]?.meaning).map(w => {
        const e = ex[w.word.toLowerCase()] || {};
        return { word: w.word, pos: w.pos, phonetic: w.ipa, meaning: w.meaning || e.meaning || "", section: w.section, examples: e.example ? [e.example] : [], exampleVi: e.exampleVi || "" };
      })
    };
    const g = readCache(u.unit, "grammar");
    if (g) grammar[`unit${u.unit}`] = { unit: u.unit, title: u.title, ...g };
    const l = readCache(u.unit, "listening");
    if (l) listening[`unit${u.unit}`] = { unit: u.unit, title: u.title, levels: l.levels || [] };
    const sp = readCache(u.unit, "speaking");
    if (sp) {
      if (sp.items?.length) speaking.push({ id: `unit${u.unit}-s1`, unit: u.unit, title: `Unit ${u.unit} · Câu đơn: ${u.title}`, stage: 1, system: true, items: sp.items });
      (sp.dialogues || []).forEach((d, i) => speaking.push({ id: `unit${u.unit}-s2-${i + 1}`, unit: u.unit, title: `Unit ${u.unit} · Hội thoại: ${d.title}`, stage: 2, system: true, situation: d.situation, items: d.lines }));
    }
  }
  writeJs("vocab-decks.js", "ENGO_VOCAB_DECKS", vocab, "Bộ từ vựng Tiếng Anh 9 Global Success theo Unit 1-12");
  writeJs("grammar-units.js", "ENGO_GRAMMAR_UNITS", grammar, "Ngữ pháp theo Unit 1-12: lý thuyết + bài tập");
  writeJs("listening-sets.js", "ENGO_LISTENING_SETS", listening, "Luyện nghe theo Unit 1-12: 3 mức độ + câu hỏi");
  writeJs("speaking-sets.js", "ENGO_SPEAKING_SETS", speaking, "Bộ bài luyện nói mặc định theo Unit 1-12 (GĐ1 câu đơn, GĐ2 hội thoại)");
  console.log(`Đã ghi: vocab ${Object.keys(vocab).length} unit, grammar ${Object.keys(grammar).length}, listening ${Object.keys(listening).length}, speaking ${speaking.length} bài`);
}

(async () => {
  const docx = process.argv[2];
  if (!docx) { console.error("Thiếu đường dẫn file TỪ VỰNG 9.docx"); process.exit(1); }
  const from = Number(process.argv[3] || 1), to = Number(process.argv[4] || 12);
  const units = await parseVocabDocx(docx);
  fs.writeFileSync(path.join(CACHE_DIR, "vocab-parsed.json"), JSON.stringify(units, null, 1));
  for (const u of units.filter(x => x.unit >= from && x.unit <= to)) {
    console.log(`\n=== Unit ${u.unit}: ${u.title} (${u.words.length} từ) ===`);
    let t = Date.now(); const ex = await genExamples(u); console.log(`  ví dụ: ${Object.keys(ex).length} từ (${Math.round((Date.now() - t) / 1000)}s)`);
    t = Date.now(); const g = await genGrammar(u); console.log(`  ngữ pháp: ${g ? (g.points || []).length + " điểm, " + (g.exercises || []).length + " MC" : "THẤT BẠI"} (${Math.round((Date.now() - t) / 1000)}s)`);
    t = Date.now(); const l = await genListening(u); console.log(`  nghe: ${l ? (l.levels || []).length + " mức" : "THẤT BẠI"} (${Math.round((Date.now() - t) / 1000)}s)`);
    t = Date.now(); const s = await genSpeaking(u); console.log(`  nói: ${s.items.length} câu, ${s.dialogues.length} hội thoại (${Math.round((Date.now() - t) / 1000)}s)`);
    assemble(units);
  }
  assemble(units);
  console.log("\nHoàn tất.");
  process.exit(0);
})();
