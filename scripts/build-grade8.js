require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const ai = require("../services/ai-service");

const ROOT = path.resolve(__dirname, "..");
const SRC_DIR = "d:/typeshi";
const CACHE_DIR = path.join(ROOT, ".import", "grade8-cache");
const OUT_DIR = path.join(ROOT, "public", "data", "grade8");
fs.mkdirSync(CACHE_DIR, { recursive: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const UNIT_TITLES = {
  1: "Leisure Time",
  2: "Life in the Countryside",
  3: "Teenagers",
  4: "Ethnic Groups of Viet Nam",
  5: "Our Customs and Traditions",
  6: "Lifestyles",
  7: "Environmental Protection",
  8: "Shopping",
  9: "Natural Disasters",
  10: "Communication in the Future",
  11: "Science and Technology",
  12: "Life on Other Planets"
};

const POS_ALLOWED = ["n", "v", "adj", "adv", "np", "vp", "phr.v", "phrase", "prep", "conj", "pron", "n/v", "v/n", "n/adj", "adj/adv", "adj/n", "idiom"];
const WF_POS = new Set(["n", "v", "adj", "adv"]);

function stripWatermarks(text) {
  return String(text || "")
    .replace(/\(\s*(?:FB\s*)?chính\s*chủ[\s\S]*?\)/gi, "")
    .replace(/\(\s*(?:website|by\s*FB)\s*:[\s\S]*?\)/gi, "")
    .replace(/0832[\s.]*96[\s.]*90[\s.]*96/g, "")
    .replace(/Hồng\s+Sương|Riêng\s+Một\s+Góc\s+Trời|tailieuglobalsuccess\.vn/gi, "")
    .replace(/[ \t]+\n/g, "\n");
}

function cachePath(unit, kind) { return path.join(CACHE_DIR, `u${unit}-${kind}.json`); }
function readCache(unit, kind) { try { return JSON.parse(fs.readFileSync(cachePath(unit, kind), "utf8")); } catch { return null; } }
function writeCache(unit, kind, data) { fs.writeFileSync(cachePath(unit, kind), JSON.stringify(data)); }

async function withRetry(fn, label, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const r = await fn();
      if (r) return r;
      console.warn(`  [${label}] empty response, retry ${i}/${tries}`);
    } catch (e) {
      console.warn(`  [${label}] error: ${e.message} (try ${i}/${tries})`);
    }
    await new Promise(r => setTimeout(r, 2000 * i));
  }
  return null;
}

function mapSectionCode(line) {
  const s = line.toUpperCase();
  if (/GETTING STARTED/.test(s)) return "GS";
  if (/CLOSER LOOK\s*1/.test(s)) return "CL1";
  if (/CLOSER LOOK\s*2/.test(s)) return "CL2";
  if (/COMMUNICATION/.test(s)) return "COM";
  if (/SKILLS\s*1/.test(s)) return "SK1";
  if (/SKILLS\s*2/.test(s)) return "SK2";
  if (/LOOKING BACK/.test(s)) return "LB";
  if (/PROJECT/.test(s)) return "PRJ";
  return null;
}

function normalizePos(raw) {
  const p = String(raw || "").trim().toLowerCase().replace(/\.$/, "");
  if (p === "phr.v" || p === "phrv" || p === "phr v") return "phr.v";
  if (p === "np" || p === "n.p") return "n";
  if (p === "vp" || p === "v.p") return "v";
  if (p === "phrase" || p === "phr") return "phr";
  return p;
}

function parseVocabBlock(vocabText) {
  const lines = vocabText.split(/\r?\n/).map(l => l.trim());
  const cards = [];
  const wfSeeds = [];
  let sec = "GS";
  let curEntry = null;
  let lastWordLine = null;

  const posRe = /(?:^|\s)(phr\.v|phrase|adj\/adv|adj\/n|n\/adj|n\/v|v\/n|idiom|prep|conj|pron|adj|adv|np|vp|n|v)\s+/i;
  const ipaRe = /(\/[^/\n]{1,60}\/(?:\s*\/[^/\n]{1,60}\/)*)/;

  function parseEntryLine(raw, numbered) {
    let s = raw.replace(/\s+/g, " ").trim();
    if (!s || /^NUMBER\s+WORD/i.test(s) || /^\d{1,2}$/.test(s)) return null;
    // Extract IPA(s)
    const ipas = [];
    let noIpa = s.replace(/\/[^/]{1,50}\//g, m => { ipas.push(m.trim()); return " "; }).replace(/\s+/g, " ").trim();
    const ipa = ipas.join(" ").trim();
    const mPos = noIpa.match(posRe);
    if (!mPos) return null;
    const idx = noIpa.indexOf(mPos[0]);
    const wordPart = noIpa.slice(0, idx).replace(/^\d+\.\s*/, "").trim();
    const pos = normalizePos(mPos[1]);
    let viPart = noIpa.slice(idx + mPos[0].length).trim();
    // Clean stray slashes or pronunciation remnants
    viPart = viPart.replace(/^[/\s,]+/, "").replace(/\s+/g, " ").trim();
    if (!wordPart || !/[a-zA-Z]/.test(wordPart) || wordPart.length > 55) return null;
    return { w: wordPart, ipa, pos, vi: viPart, sec, numbered };
  }

  function flushCur() {
    if (!curEntry) return;
    curEntry.vi = curEntry.vi.replace(/\s+/g, " ").trim();
    if (curEntry.w && curEntry.vi) {
      if (curEntry.numbered) {
        cards.push({ w: curEntry.w, ipa: curEntry.ipa, pos: curEntry.pos, vi: curEntry.vi, sec: curEntry.sec });
        lastWordLine = curEntry;
      } else {
        // Word-family derivative under previous numbered word
        if (lastWordLine && WF_POS.has(curEntry.pos) && /^[a-z][a-z'\- ]*$/i.test(curEntry.w)) {
          wfSeeds.push({ parent: lastWordLine, member: curEntry });
        }
        // Also keep useful distinct vocabulary if not just inflectional duplicate
        cards.push({ w: curEntry.w, ipa: curEntry.ipa, pos: curEntry.pos, vi: curEntry.vi, sec: curEntry.sec });
      }
    }
    curEntry = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || /^\d{1,3}$/.test(line) || /^NUMBER\s+WORD/i.test(line)) continue;
    const sc = mapSectionCode(line);
    if (sc) { flushCur(); sec = sc; continue; }

    const isNum = /^\d+\.\s+/.test(line);
    if (isNum) {
      flushCur();
      let parsed = parseEntryLine(line, true);
      if (!parsed && i + 1 < lines.length) {
        // Word wrapped onto next line before pos/ipa
        const combined = line + " " + lines[i + 1];
        parsed = parseEntryLine(combined, true);
        if (parsed) i++;
      }
      curEntry = parsed;
    } else {
      const maybeDeriv = parseEntryLine(line, false);
      if (maybeDeriv && /^[a-zA-Z]/.test(maybeDeriv.w)) {
        flushCur();
        curEntry = maybeDeriv;
      } else if (curEntry) {
        // Continuation of Vietnamese meaning or stray IPA fragment
        const cleanCont = line.replace(/\/[^/]{1,40}\//g, m => {
          if (!curEntry.ipa) curEntry.ipa = m;
          else if (!curEntry.ipa.includes(m)) curEntry.ipa += " " + m;
          return "";
        }).trim();
        if (cleanCont && !/^(NUMBER|A\/\s*VOCABULARY)/i.test(cleanCont)) {
          curEntry.vi = (curEntry.vi ? curEntry.vi + " " : "") + cleanCont;
        }
      }
    }
  }
  flushCur();

  // Deduplicate by lowercase word preserving first occurrence
  const seen = new Set();
  const deduped = [];
  for (const c of cards) {
    const k = c.w.toLowerCase();
    if (seen.has(k) || !c.vi) continue;
    seen.add(k);
    deduped.push(c);
  }

  // Group word-family seeds by parent
  const wfMap = new Map();
  for (const { parent, member } of wfSeeds) {
    const pk = parent.w.toLowerCase().replace(/\s*\(.*\)/, "").trim();
    if (!/^[a-z][a-z'\- ]*$/.test(pk)) continue;
    if (!wfMap.has(pk)) {
      const pPos = WF_POS.has(parent.pos) ? parent.pos : "n";
      wfMap.set(pk, { root: pk, members: [{ w: pk, pos: pPos, vi: parent.vi }] });
    }
    const fam = wfMap.get(pk);
    const mw = member.w.toLowerCase().trim();
    if (!fam.members.some(m => m.w === mw)) {
      fam.members.push({ w: mw, pos: member.pos, vi: member.vi });
    }
  }

  return { cards: deduped, wfClusters: [...wfMap.values()] };
}

async function loadSources() {
  const pdfBuf = fs.readFileSync(path.join(SRC_DIR, "TIẾNG ANH 8.pdf"));
  const parsedPdf = await pdf(pdfBuf);
  const cleanPdf = stripWatermarks(parsedPdf.text);
  const pdfParts = cleanPdf.split(/GLOBAL SUCCESS 8\s*-\s*UNIT\s*/i);

  const mlhRes = await mammoth.extractRawText({ path: path.join(SRC_DIR, "Bài tập thực hành/Bài Tập Thực Hành 8 Global Success MLH.docx") });
  const mlhText = mlhRes.value;

  const extraTexts = {};
  for (const [u, rel] of [[7, "BÀI TẬP THEO TỪNG UNIT/BAI TAP UNIT 7.docx"], [8, "BÀI TẬP THEO TỪNG UNIT/BAI TAP UNIT 8.docx"], [9, "BÀI TẬP THEO TỪNG UNIT/BAI TAP UNIT 9.docx"]]) {
    const r = await mammoth.extractRawText({ path: path.join(SRC_DIR, rel) });
    extraTexts[u] = r.value;
  }
  const keyHk2 = (await mammoth.extractRawText({ path: path.join(SRC_DIR, "Bộ đề KT Tiếng Anh 8 kì 2 - Đại Lợi/ĐÁP ÁN KT kì 2.docx") })).value;
  const speakHk2 = (await mammoth.extractRawText({ path: path.join(SRC_DIR, "Bộ Đề Ôn Tập Kiểm Tra HK2/ĐỀ NÓI TIẾNG ANH 8 HK2 MỚI  NH 23-24.docx") })).value;

  const units = [];
  for (let n = 1; n <= 12; n++) {
    const part = pdfParts[n] || "";
    const vIdx = part.search(/A\/\s*VOCABULARY/i);
    const gIdx = part.search(/B\/\s*GRAMMAR/i);
    const vocabText = vIdx >= 0 ? part.slice(vIdx, gIdx > vIdx ? gIdx : part.length) : "";
    const grammarText = gIdx >= 0 ? part.slice(gIdx) : "";
    const { cards, wfClusters } = parseVocabBlock(vocabText);

    // Slice MLH exercises for unit n
    const uRe = new RegExp(`(?:^|\\n)UNIT\\s+${n}[.\\s:]`, "i");
    const nextRe = new RegExp(`(?:^|\\n)UNIT\\s+${n + 1}[.\\s:]`, "i");
    const mStart = mlhText.search(uRe);
    let mlhUnit = "";
    if (mStart >= 0) {
      const rest = mlhText.slice(mStart);
      const mEnd = n < 12 ? rest.slice(20).search(nextRe) : -1;
      mlhUnit = mEnd >= 0 ? rest.slice(0, mEnd + 20) : rest;
    }

    units.push({
      unit: n,
      title: UNIT_TITLES[n],
      cards,
      wfClusters,
      grammarText: grammarText.slice(0, 6000),
      mlhText: mlhUnit.slice(0, 6000),
      extraText: (extraTexts[n] || "").slice(0, 3000),
      speakExtra: n >= 7 ? speakHk2.slice(0, 1500) : "",
      listenExtra: n >= 7 ? keyHk2.slice(keyHk2.search(/Audio script:/i), keyHk2.search(/Audio script:/i) + 1800) : ""
    });
  }
  return units;
}

const SYSTEM = `You are an experienced Vietnamese lower-secondary English teacher who knows the textbook "Tiếng Anh 8 Global Success" (Bộ GD&ĐT, 2023) thoroughly. Always respond with strict valid JSON only (no markdown code fences, no comments).`;

function vocabCtx(u) {
  return u.cards.slice(0, 55).map(c => `${c.w} (${c.pos}) = ${c.vi}`).join("; ");
}

async function genExamples(u) {
  const cached = readCache(u.unit, "examples");
  if (cached && Object.keys(cached).length >= Math.min(20, u.cards.length * 0.7)) return cached;
  const result = cached || {};
  const chunks = [];
  for (let i = 0; i < u.cards.length; i += 32) chunks.push(u.cards.slice(i, i + 32));
  for (const chunk of chunks) {
    const missing = chunk.filter(c => !result[c.w.toLowerCase()]);
    if (!missing.length) continue;
    const parsed = await withRetry(() => ai.callAiJson(
      SYSTEM,
      `For each vocabulary item of Grade 8 Unit ${u.unit} "${u.title}", write ONE natural Grade 8 English example sentence (7-14 words, related to the unit topic) containing the item, plus its Vietnamese translation.
Items: ${JSON.stringify(missing.map(c => ({ word: c.w, pos: c.pos, meaning: c.vi })))}
Return JSON: {"items":[{"word":"...","example":"...","exampleVi":"..."}]}`,
      null,
      90000
    ), `U${u.unit} examples`);
    (parsed?.items || []).forEach(it => {
      if (it && it.word && it.example) result[String(it.word).toLowerCase()] = it;
    });
  }
  writeCache(u.unit, "examples", result);
  return result;
}

async function genGrammar(u) {
  const cached = readCache(u.unit, "grammar");
  if (cached && Array.isArray(cached.points) && Array.isArray(cached.exercises) && cached.exercises.length >= 9) return cached;
  const parsed = await withRetry(() => ai.callAiJson(
    SYSTEM,
    `Create the GRAMMAR lesson for Unit ${u.unit} "${u.title}" of Tiếng Anh 8 Global Success using the unit's official grammar focus and the source material below.
Source grammar notes from textbook guide:
${u.grammarText}
Practice exercises reference:
${u.mlhText.slice(0, 3500)}
${u.extraText.slice(0, 1500)}

Return JSON:
{"points":[{"name":"(English + Vietnamese title)","explanation":"(giải thích tiếng Việt ngắn gọn 2-4 câu)","formula":"(công thức)","notes":["(lưu ý tiếng Việt)"],"examples":[{"en":"...","vi":"..."}]}],
 "exercises":[{"type":"mc","level":"easy|medium|hard","prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt)"}],
 "rewrite":[{"level":"medium|hard","prompt":"(sentence transformation / fill-in instruction)","answer":"(đáp án chuẩn)","accepted":["(đáp án chấp nhận khác)"],"explanation":"(tiếng Việt)"}]}
Requirements: 1-3 grammar points; exactly 12 "mc" exercises ordered easy(4) -> medium(4) -> hard(4); 4 "rewrite" items. Every MC option must start with "A. ", "B. ", "C. ", "D. ". Ground sentences in Unit ${u.unit} vocabulary: ${vocabCtx(u)}`,
    null,
    120000
  ), `U${u.unit} grammar`);
  if (parsed && Array.isArray(parsed.exercises) && parsed.exercises.length) {
    writeCache(u.unit, "grammar", parsed);
  }
  return parsed;
}

function validateWordFamilies(list) {
  const valid = [];
  for (const f of (list || [])) {
    const members = (Array.isArray(f.members) ? f.members : [])
      .map(m => ({ w: String(m.w || "").trim().toLowerCase(), pos: String(m.pos || "").trim().toLowerCase(), vi: String(m.vi || "").trim() }))
      .filter(m => WF_POS.has(m.pos) && /^[a-z][a-z'\- ]*$/.test(m.w) && m.vi);
    const words = members.map(m => m.w);
    const root = String(f.root || (members[0] && members[0].w) || "").trim().toLowerCase();
    if (members.length < 2 || !words.includes(root)) continue;
    const items = (Array.isArray(f.items) ? f.items : [])
      .map(it => ({ s: String(it.s || "").trim().replace(/_{2,}/g, "____"), a: String(it.a || "").trim().toLowerCase() }))
      .filter(it => (it.s.match(/____/g) || []).length === 1 && words.includes(it.a));
    if (items.length >= 2) valid.push({ root, members, items: items.slice(0, 3) });
  }
  return valid;
}

async function genWordFamilies(u) {
  const cached = readCache(u.unit, "wordfamilies");
  if (cached && cached.length >= 7) return cached;
  const seedHint = u.wfClusters.length ? `Word-family clusters extracted from source PDF: ${JSON.stringify(u.wfClusters)}` : "";
  const parsed = await withRetry(() => ai.callAiJson(
    SYSTEM,
    `Create 9 Word Family (Họ từ) groups for Grade 8 Unit ${u.unit} "${u.title}" (Tiếng Anh 8 Global Success).
${seedHint}
Unit vocabulary: ${vocabCtx(u)}
Return JSON: {"families":[{"root":"create","members":[{"w":"create","pos":"v","vi":"tạo ra"},{"w":"creative","pos":"adj","vi":"sáng tạo"},{"w":"creativity","pos":"n","vi":"sự sáng tạo"},{"w":"creatively","pos":"adv","vi":"một cách sáng tạo"}],"items":[{"s":"Students need ____ to design a good DIY project.","a":"creativity"},{"s":"She is very ____ and loves making paper flowers.","a":"creative"},{"s":"He decorated the room ____ using recycled bottles.","a":"creatively"}]}]}
STRICT RULES:
- Exactly 8-10 families per unit.
- Every "w" must be lowercase single word (letters a-z, optional hyphen, no spaces if possible, matching /^[a-z][a-z'\\- ]*$/).
- Every "pos" MUST be strictly one of: "n", "v", "adj", "adv".
- "root" MUST be one of the "w" values in "members".
- Each family has 3 "items", each "s" has EXACTLY ONE "____" blank, and "a" MUST exactly match one "w" in that family's "members".`,
    null,
    120000
  ), `U${u.unit} wordfamilies`);
  const cleaned = validateWordFamilies(parsed?.families);
  if (cleaned.length >= 5) {
    writeCache(u.unit, "wordfamilies", cleaned);
  }
  return cleaned;
}

async function genSpeaking(u) {
  const cached = readCache(u.unit, "speaking");
  if (cached && cached.unitItems?.levels?.length === 3 && cached.setS1?.length >= 6 && cached.setS2?.length >= 2) return cached;
  const parsed = await withRetry(() => ai.callAiJson(
    SYSTEM,
    `Create complete SPEAKING practice for Grade 8 Unit ${u.unit} "${u.title}" (Tiếng Anh 8 Global Success).
Unit vocabulary: ${vocabCtx(u)}
Unit grammar: ${u.grammarText.slice(0, 2000)}
${u.speakExtra ? "Speaking exam topics reference:\n" + u.speakExtra : ""}
Return JSON with THREE parts:
{
  "unitLevels": [
    {"level": 1, "label": "Dễ · Từ khoá của bài", "items": [3 items: {"text":"(2-5 words)","vi":"...","focus":"(1 short pronunciation note in Vietnamese)"}]},
    {"level": 2, "label": "Vừa · Câu dùng ngữ pháp Unit ${u.unit}", "items": [3 items: {"text":"(7-12 word sentence)","vi":"...","focus":"..."}]},
    {"level": 3, "label": "Khó · Câu dài và câu hỏi", "items": [2 items: {"text":"(11-18 word sentence/question)","vi":"...","focus":"..."}]}
  ],
  "stage1": [8 items ordered 3 "easy", 3 "medium", 2 "hard": {"text":"...","ipa":"/.../","meaning":"(Vietnamese)","focus":"(Vietnamese pronunciation tip)","level":"easy|medium|hard"}],
  "stage2": [
    {"title":"(English dialogue title 1)","situation":"(1 câu tiếng Việt mô tả tình huống)","lines":[6 turns alternating A/B: {"speaker":"A","text":"...","ipa":"/.../","meaning":"(Vietnamese)"}]},
    {"title":"(English dialogue title 2)","situation":"(1 câu tiếng Việt mô tả tình huống)","lines":[6 turns alternating A/B: {"speaker":"A","text":"...","ipa":"/.../","meaning":"(Vietnamese)"}]}
  ]
}
Make every sentence natural Grade 8 spoken English using Unit ${u.unit} vocabulary and grammar.`,
    null,
    120000
  ), `U${u.unit} speaking`);
  if (parsed?.unitLevels?.length === 3 && parsed?.stage1?.length && parsed?.stage2?.length) {
    const out = { unitItems: { unit: u.unit, name: `Unit ${u.unit} · ${u.title}`, levels: parsed.unitLevels }, setS1: parsed.stage1, setS2: parsed.stage2 };
    writeCache(u.unit, "speaking", out);
    return out;
  }
  return null;
}

async function genListening(u) {
  const cached = readCache(u.unit, "listening");
  if (cached && cached.tasks?.length === 3 && cached.sets?.length === 3) return cached;
  const parsed = await withRetry(() => ai.callAiJson(
    SYSTEM,
    `Create complete LISTENING practice for Grade 8 Unit ${u.unit} "${u.title}" (Tiếng Anh 8 Global Success). Audio uses TTS, so write clean, natural spoken English.
Unit vocabulary: ${vocabCtx(u)}
${u.listenExtra ? "Reference style:\n" + u.listenExtra : ""}
Return JSON with TWO arrays:
{
  "tasks": [
    {"level":1,"rate":0.82,"title":"(Vietnamese title)","script":"(45-65 words monologue)","qs":[
      {"type":"mcq","q":"...","opts":["opt1","opt2","opt3"],"a":0},
      {"type":"tf","q":"...","a":true},
      {"type":"gap","q":"Sentence with ______ from the script.","a":"singleword"}
    ]},
    {"level":2,"rate":0.95,"title":"(Vietnamese title)","script":"(dialogue with ' — ' separating turns, 65-95 words)","qs":[
      {"type":"mcq","q":"...","opts":["opt1","opt2","opt3"],"a":0},
      {"type":"mcq","q":"...","opts":["opt1","opt2","opt3"],"a":0},
      {"type":"gap","q":"Sentence with ______ from the script.","a":"singleword"}
    ]},
    {"level":3,"rate":1.0,"title":"(Vietnamese title)","script":"(95-125 words talk/story)","qs":[
      {"type":"mcq","q":"...","opts":["opt1","opt2","opt3"],"a":0},
      {"type":"tf","q":"...","a":false},
      {"type":"gap","q":"Sentence with ______ from the script.","a":"singleword"}
    ]}
  ],
  "sets": [
    {"level":"easy","title":"(English title)","intro":"(1 câu tiếng Việt)","script":["5 short independent sentences (6-10 words)"],"questions":[4 items: {"prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt trích dẫn câu nghe được)"}]},
    {"level":"medium","title":"(English title)","intro":"(1 câu tiếng Việt)","script":["A: ...","B: ...","(8 turns total)"],"questions":[5 items: {"prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt)"}]},
    {"level":"hard","title":"(English title)","intro":"(1 câu tiếng Việt)","script":["3-5 paragraph sentences totalling 110-140 words"],"questions":[5 items: {"prompt":"...","options":["A. ...","B. ...","C. ...","D. ..."],"answer":0,"explanation":"(tiếng Việt)"}]}
  ]
}
For "tasks", "gap" answer "a" MUST be an exact single word appearing verbatim in that task's "script", and "opts" do NOT have "A. " prefix. For "sets", "options" DO have "A. ", "B. ", "C. ", "D. " prefixes.`,
    null,
    120000
  ), `U${u.unit} listening`);
  if (parsed?.tasks?.length === 3 && parsed?.sets?.length === 3) {
    writeCache(u.unit, "listening", parsed);
    return parsed;
  }
  return null;
}

function writeOut(file, varName, data) {
  const str = `window.${varName} = ${JSON.stringify(data)};\n`;
  fs.writeFileSync(path.join(OUT_DIR, file), str);
}

function assembleAll(units) {
  const vocabUnits = {}, vocabDecks = {}, grammarUnits = {}, wordFamilies = {}, speakingUnits = {}, speakingSets = [], listeningUnits = {}, listeningSets = {};
  for (const u of units) {
    const k = `unit${u.unit}`;
    const ex = readCache(u.unit, "examples") || {};
    vocabUnits[k] = { unit: u.unit, name: `Unit ${u.unit} · ${u.title}`, cards: u.cards };
    vocabDecks[k] = {
      name: `Unit ${u.unit} · ${u.title}`,
      unit: u.unit,
      cards: u.cards.map(c => {
        const e = ex[c.w.toLowerCase()] || {};
        return { word: c.w, pos: c.pos, phonetic: c.ipa, meaning: c.vi, section: c.sec, examples: e.example ? [e.example] : [], exampleVi: e.exampleVi || "" };
      })
    };
    const g = readCache(u.unit, "grammar");
    if (g) grammarUnits[k] = { unit: u.unit, title: u.title, ...g };
    const wf = readCache(u.unit, "wordfamilies");
    if (wf) wordFamilies[k] = wf;
    const sp = readCache(u.unit, "speaking");
    if (sp) {
      speakingUnits[k] = sp.unitItems;
      speakingSets.push({ id: `g8-unit${u.unit}-s1`, grade: 8, unit: u.unit, title: `Unit ${u.unit} · Câu đơn: ${u.title}`, stage: 1, system: true, items: sp.setS1 });
      sp.setS2.forEach((d, idx) => speakingSets.push({ id: `g8-unit${u.unit}-s2-${idx + 1}`, grade: 8, unit: u.unit, title: `Unit ${u.unit} · Hội thoại: ${d.title}`, stage: 2, system: true, situation: d.situation, items: d.lines }));
    }
    const ls = readCache(u.unit, "listening");
    if (ls) {
      listeningUnits[k] = { unit: u.unit, name: `Unit ${u.unit} · ${u.title}`, tasks: ls.tasks };
      listeningSets[k] = { unit: u.unit, title: u.title, levels: ls.sets };
    }
  }
  writeOut("vocab-units.js", "ENGO_G8_VOCAB_UNITS", vocabUnits);
  writeOut("vocab-decks.js", "ENGO_G8_VOCAB_DECKS", vocabDecks);
  writeOut("grammar-units.js", "ENGO_G8_GRAMMAR_UNITS", grammarUnits);
  writeOut("word-families.js", "ENGO_G8_WORD_FAMILIES", wordFamilies);
  writeOut("speaking-units.js", "ENGO_G8_SPEAKING_UNITS", speakingUnits);
  writeOut("speaking-sets.js", "ENGO_G8_SPEAKING_SETS", speakingSets);
  writeOut("listening-units.js", "ENGO_G8_LISTENING_UNITS", listeningUnits);
  writeOut("listening-sets.js", "ENGO_G8_LISTENING_SETS", listeningSets);
  console.log(`Assembled Grade 8: vocab=${Object.keys(vocabUnits).length}u (${Object.values(vocabUnits).reduce((a, x) => a + x.cards.length, 0)} words), grammar=${Object.keys(grammarUnits).length}u, wf=${Object.keys(wordFamilies).length}u (${Object.values(wordFamilies).reduce((a, x) => a + x.length, 0)} fams), speaking=${speakingSets.length} sets, listening=${Object.keys(listeningUnits).length}u`);
}

(async () => {
  const parseOnly = process.argv.includes("--parse-only");
  const from = Number(process.argv.find(a => a.startsWith("--from="))?.split("=")[1] || 1);
  const to = Number(process.argv.find(a => a.startsWith("--to="))?.split("=")[1] || 12);
  const units = await loadSources();
  for (const u of units) {
    console.log(`Unit ${u.unit} (${u.title}): ${u.cards.length} words, ${u.wfClusters.length} wfClusters, gramLen=${u.grammarText.length}, mlhLen=${u.mlhText.length}`);
  }
  if (parseOnly) return;

  const todo = units.filter(u => u.unit >= from && u.unit <= to);
  let idx = 0;
  const worker = async () => {
    while (idx < todo.length) {
      const u = todo[idx++];
      console.log(`\n=== Building Unit ${u.unit}: ${u.title} ===`);
      await genExamples(u);
      await genGrammar(u);
      await genWordFamilies(u);
      await genSpeaking(u);
      await genListening(u);
      assembleAll(units);
    }
  };
  await Promise.all([worker(), worker()]);
  assembleAll(units);
  console.log("\nGrade 8 generation finished.");
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
