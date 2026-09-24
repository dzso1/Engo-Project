const crypto = require("crypto");
const ai = require("./ai-service");
const { stripMarks } = require("./docx-text");

const SECTION_OF = {
  phonetics: "Phonetics", pronunciation: "Phonetics", stress: "Phonetics",
  vocabulary: "Grammar and Vocabulary", grammar: "Grammar and Vocabulary", "language": "Grammar and Vocabulary", "word form": "Grammar and Vocabulary",
  reading: "Reading", cloze: "Reading",
  writing: "Writing", rewrite: "Writing",
  listening: "Listening", speaking: "Speaking",
};
function sectionName(skill) {
  const k = String(skill || "").toLowerCase();
  for (const key of Object.keys(SECTION_OF)) if (k.includes(key)) return SECTION_OF[key];
  return "Grammar and Vocabulary";
}

const SYSTEM = `You are an expert at digitizing Vietnamese secondary-school English tests (grades 6-9). You convert the raw text of a test paper into precise JSON. You never invent questions that are not in the text, and you keep the original wording. Output valid JSON only.`;

function buildPrompt(text, hints) {
  return `Convert this English test into structured JSON.

FORMAT MARKERS in the text: <u>...</u> = underlined part (crucial for phonetics questions: keep these tags EXACTLY in "prompt"/"options" text); <b>...</b> = bold (usually part headings / task instructions - remove the <b> tags in your output). Table rows are written as "cell | cell | cell".

IGNORE: school header, student name lines, the specification/matrix table ("BẢNG ĐẶC TẢ", "MA TRẬN", columns like Nhận biết/Thông hiểu), marks boxes, and the answer key block itself (but USE it for answers).

Return JSON:
{
 "title": "short title from the paper (e.g. 'IL9 - Unit 1 - Test 1')",
 "durationMinutes": number or null (as printed on the paper),
 "parts": [
  {
   "skill": "Phonetics|Stress|Vocabulary|Grammar|Reading|Cloze|Writing|Listening|Speaking",
   "instruction": "the task requirement exactly as written (e.g. 'Choose the word whose underlined part is pronounced differently from the others.')",
   "context": "the reading passage / cloze text for this part, or null. In a cloze text keep the blank numbers like (19) ______",
   "questions": [
    {
     "number": 1,
     "type": "multiple_choice|short_answer|writing|speaking",
     "prompt": "question text; for multiple_choice put ONLY the stem here, options go in options[]",
     "options": [{"key":"A","text":"..."},{"key":"B","text":"..."}],   // multiple_choice only, keep <u> tags
     "answer": "B",                        // multiple_choice: the correct key
     "accepted": ["opportunity"],          // short_answer: ALL correct answers - the key from the paper FIRST, then other answers that are also fully correct (synonyms that fit, contracted/uncontracted forms, with/without optional words). For rewrite sentences give the full expected continuation and natural variants.
     "referenceAnswer": "...",             // writing/speaking: sample answer or marking note
     "points": 0.5,
     "keyIssue": null                      // string if the paper's key is clearly WRONG (grammar/meaning) and you corrected it: "Key says C (were); correct is A (am) - first conditional uses present simple"
    }
   ]
  }
 ],
 "dropped": [{"reason":"listening requires audio","numbers":[1,2,3]}]
}

RULES:
1. Question types: multiple_choice = choose A/B/C/D (also True/False, matching with lettered choices). short_answer = fill one/few words, word form, verb form, sentence rewriting with an expected result, answer questions about a passage briefly. writing = paragraph/essay/letter/free writing (graded by teacher). speaking = speak/talk tasks.
2. Use the paper's answer key (ĐÁP ÁN / KEY / answers table). If a question has no key, solve it yourself. VERIFY every key: if it is clearly wrong, put the correct answer and explain in keyIssue. Otherwise keyIssue must be null.
3. Listening parts: include them ONLY if the paper contains the transcript/script; otherwise list them in "dropped". Questions that depend on a picture/map also go to "dropped".
4. Points: use the points printed on the paper. If none, distribute so all questions total 10.
5. Keep the question numbering of the paper. Never merge or split questions. Never drop <u> tags from phonetics questions or their options.
6. For "Odd one out"/stress questions, options are the words; answer is the key letter.
7. Prompts must be self-contained: for cloze blanks use "Blank (19)" and rely on the part's context.
${hints ? "\nHINTS FROM FILE NAME: " + hints + "\n" : ""}
TEST TEXT:
"""
${text}
"""`;
}

function normalizeStructured(parsed, fallbackTitle) {
  const parts = Array.isArray(parsed && parsed.parts) ? parsed.parts : [];
  const questions = [];
  const seen = new Set();
  let autoNumber = 0;
  for (const part of parts) {
    const section = sectionName(part.skill);
    const instruction = stripMarks(String(part.instruction || "")).trim();
    const context = part.context ? stripMarks(String(part.context)).trim() : "";
    for (const q of (Array.isArray(part.questions) ? part.questions : [])) {
      autoNumber++;
      let number = Number(q.number);
      if (!Number.isFinite(number) || number <= 0 || seen.has(number)) number = seen.size ? Math.max(...seen) + 1 : autoNumber;
      seen.add(number);
      let type = ["multiple_choice", "short_answer", "writing", "speaking"].includes(q.type) ? q.type : "short_answer";
      const options = Array.isArray(q.options) ? q.options.filter(o => o && (o.text || o.key)).map((o, i) => ({ key: String(o.key || String.fromCharCode(65 + i)).trim().toUpperCase().slice(0, 1), text: String(o.text || "").trim() })) : [];
      if (type === "multiple_choice" && options.length < 2) type = "short_answer";
      if (type !== "multiple_choice" && options.length >= 2) type = "multiple_choice";
      const prompt = String(q.prompt || "").replace(/<\/?b>/g, "").trim();
      const points = Number(q.points);
      const item = {
        id: `q-${number}`,
        number,
        section,
        type,
        instruction,
        prompt,
        options: type === "multiple_choice" ? options : [],
        points: Number.isFinite(points) && points > 0 ? Number(points.toFixed(2)) : 0,
        manual: type === "writing",
      };
      if (context) item.context = context;
      if (type === "multiple_choice") {
        const ans = String(q.answer || "").trim().toUpperCase().slice(0, 1);
        item.answer = options.some(o => o.key === ans) ? ans : options[0].key;
      } else if (type === "short_answer") {
        const acc = (Array.isArray(q.accepted) ? q.accepted : [q.accepted]).map(a => stripMarks(String(a || "")).trim()).filter(Boolean);
        if (!acc.length && q.answer) acc.push(stripMarks(String(q.answer)).trim());
        item.accepted = [...new Set(acc.map(a => a.toLowerCase()))];
        if (!item.accepted.length) { item.type = "writing"; item.manual = true; item.referenceAnswer = ""; }
      } else if (type === "writing") {
        item.referenceAnswer = String(q.referenceAnswer || q.answer || "").trim();
      } else if (type === "speaking") {
        item.mode = /\?$/.test(prompt) || /^(talk|speak|tell|describe|introduce|discuss|say|give|present|explain|answer)\b/i.test(prompt) ? "free" : "read";
        item.target = stripMarks(prompt).replace(/^(?:read\s+(?:aloud|the\s+(?:sentence|text|paragraph))|đọc(?:\s+to)?|say)\s*[:\-–]?\s*/i, "").trim();
        item.referenceAnswer = String(q.referenceAnswer || "").trim();
      }
      if (q.keyIssue && !/key is correct|key correct|is correct\.?$/i.test(String(q.keyIssue))) item.keyNote = String(q.keyIssue).slice(0, 300);
      questions.push(item);
    }
  }
  questions.sort((a, b) => a.number - b.number);
  const withPts = questions.filter(q => q.points > 0);
  if (withPts.length < questions.length) {
    const used = withPts.reduce((s, q) => s + q.points, 0);
    const rest = questions.filter(q => !(q.points > 0));
    const each = Math.max(0.1, Number(((10 - used) / rest.length).toFixed(2)));
    rest.forEach(q => { q.points = each; });
  }
  const objectiveCount = questions.filter(q => !q.manual && q.type !== "speaking").length;
  const manualCount = questions.filter(q => q.manual).length;
  const speakingCount = questions.filter(q => q.type === "speaking").length;
  const sectionOrder = ["Phonetics", "Grammar and Vocabulary", "Reading", "Listening", "Writing", "Speaking"];
  const dropped = Array.isArray(parsed.dropped) ? parsed.dropped : [];
  return {
    title: String(parsed.title || fallbackTitle || "Bài kiểm tra").trim().slice(0, 200),
    sourceFormat: "ai-structured",
    durationHint: Number(parsed.durationMinutes) || null,
    sections: sectionOrder.map(name => ({ name, questions: questions.filter(q => q.section === name) })).filter(s => s.questions.length),
    questions,
    answerKey: { generated: true, aiVerified: true },
    dropped,
    keyIssues: questions.filter(q => q.keyNote).map(q => ({ id: q.id, number: q.number, note: q.keyNote })),
    summary: {
      objectiveCount, manualCount, speakingCount,
      droppedCount: dropped.reduce((s, d) => s + (Array.isArray(d.numbers) ? d.numbers.length : 0), 0),
      keyIssueCount: questions.filter(q => q.keyNote).length,
      totalPoints: Number(questions.reduce((s, q) => s + Number(q.points || 0), 0).toFixed(2)),
    },
  };
}

async function structureTestWithAi(text, opts = {}) {
  const clean = String(text || "").replace(/\r/g, "").trim();
  if (clean.length < 200) throw new Error("Nội dung đề quá ngắn để nhận diện.");
  const body = clean.length > 60000 ? clean.slice(0, 60000) : clean;
  const cacheKey = "test_structure_v1_" + crypto.createHash("md5").update(body).digest("hex");
  let parsed = null;
  for (let attempt = 0; attempt < 3 && !(parsed && Array.isArray(parsed.parts)); attempt++) {
    if (attempt) await new Promise(r => setTimeout(r, 4000 * attempt));
    parsed = await ai.callAiJson(SYSTEM, buildPrompt(body, opts.hints), cacheKey, opts.timeoutMs || 150000);
  }
  if (!parsed || !Array.isArray(parsed.parts)) throw new Error("AI không trả về cấu trúc đề hợp lệ.");
  const test = normalizeStructured(parsed, opts.title);
  if (test.questions.length < 3) throw new Error("AI nhận diện được quá ít câu hỏi (" + test.questions.length + ").");
  return test;
}

module.exports = { structureTestWithAi, normalizeStructured, sectionName, buildPrompt, SYSTEM };
