function normalizeText(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseAnswerKey(answerText) {
  const choices = {};
  for (const match of answerText.matchAll(/(?:^|\n|\s)(\d{1,2})\.\s*([A-D])\b/g)) choices[Number(match[1])] = match[2];
  const textAnswers = {};
  for (const match of answerText.matchAll(/(?:^|\n|\s)(\d{1,2})\.\s*([^\n]+?)(?=(?:\s+\d{1,2}\.)|$)/g)) {
    const number = Number(match[1]);
    if (!choices[number]) textAnswers[number] = match[2].trim();
  }
  return { choices, textAnswers };
}

function parseOptions(block) {
  const options = [];
  const matcher = /(?:^|\n|\s{2,})([A-D])\.\s*([\s\S]*?)(?=(?:\n|\s{2,})[A-D]\.|$)/g;
  for (const match of block.matchAll(matcher)) options.push({ key: match[1], text: match[2].trim() });
  return options;
}

function sectionFor(number) {
  if (number <= 4) return "Phonetics";
  if (number <= 14) return "Grammar and Vocabulary";
  if (number <= 20) return "Reading";
  return "Writing";
}

const SPEAKING_HEADING = /(?:^|\n)[ \t]*(?:(?:[IVX]+|\d+|[A-H])[.)]\s*|PART\s*\d+\s*[:.)-]?\s*|SECTION\s*\d+\s*[:.)-]?\s*)?(?:SPEAKING|PHẦN\s+NÓI|NÓI)\b[^\n]*/i;
const NEXT_SECTION = /\n[ \t]*(?:(?:[IVX]+|[A-H])[.)]\s+(?:[A-ZÀ-Ỹ][A-ZÀ-Ỹ\s&]{3,}|LISTENING|READING|WRITING|PRONUNCIATION|PHONETICS|GRAMMAR|VOCABULARY|LANGUAGE)|PART\s*\d+|SECTION\s*\d+|---\s*THE END|THE END)/i;

function classifySpeakingPrompt(prompt) {
  const p = prompt.trim();
  if (/\?$/.test(p) || /^(talk|speak|tell|describe|introduce|discuss|say|give|present|explain|answer)\b/i.test(p) || /\b(about|your|you)\b/i.test(p) && /^(what|why|how|where|when|who|do|does|did|are|is|can|could|would|have)\b/i.test(p)) {
    return "free";
  }
  return "read";
}

function extractSpeakingSection(questionText) {
  const headingMatch = questionText.match(SPEAKING_HEADING);
  if (!headingMatch) return { remaining: questionText, speakingQuestions: [] };
  const start = headingMatch.index + (headingMatch[0].startsWith("\n") ? 1 : 0);
  const afterHeading = questionText.slice(start + headingMatch[0].trim().length);
  const nextMatch = afterHeading.match(NEXT_SECTION);
  const blockEnd = nextMatch ? nextMatch.index : afterHeading.length;
  const block = afterHeading.slice(0, blockEnd);
  const remaining = (questionText.slice(0, start) + "\n" + afterHeading.slice(blockEnd)).trim();

  const pointsMatch = headingMatch[0].match(/(\d+(?:[.,]\d+)?)\s*(?:points?|điểm|pts?)/i);
  const sectionPoints = pointsMatch ? Number(pointsMatch[1].replace(",", ".")) : 0;

  const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
  const items = [];
  let buffer = "";
  for (const line of lines) {
    const numbered = line.match(/^(?:\d{1,2}[.)]|[a-h][.)]|[-•*–])\s*(.+)$/i);
    if (numbered) {
      if (buffer) items.push(buffer);
      buffer = numbered[1].trim();
    } else if (buffer && /^[a-z(]/i.test(line) && line.length < 200) {
      buffer += " " + line;
    } else if (!buffer && /[A-Za-z]{3,}/.test(line) && !/^(instruction|hướng dẫn|yêu cầu)/i.test(line) && line.length > 12) {
      items.push(line);
    }
  }
  if (buffer) items.push(buffer);

  const cleaned = items
    .map(i => i.replace(/\s*\(\s*\d+(?:[.,]\d+)?\s*(?:points?|điểm|pts?)\s*\)\s*$/i, "").trim())
    .filter(i => i.length >= 4 && /[A-Za-z]/.test(i))
    .slice(0, 10);

  const perItem = cleaned.length ? Number(((sectionPoints || Math.min(2, cleaned.length * 0.5)) / cleaned.length).toFixed(2)) : 0;
  const speakingQuestions = cleaned.map((prompt, idx) => ({
    id: `speaking-${idx + 1}`,
    target: prompt.replace(/^(?:read\s+(?:aloud|the\s+(?:sentence|text|paragraph))|đọc(?:\s+to)?|say)\s*[:\-–]?\s*/i, "").trim(),
    number: 100 + idx + 1,
    section: "Speaking",
    type: "speaking",
    mode: classifySpeakingPrompt(prompt),
    prompt,
    options: [],
    points: perItem || 0.5,
    manual: false,
  }));
  return { remaining, speakingQuestions };
}

function parseDocxAssessment(rawText, title = "Bài kiểm tra DOCX") {
  const text = normalizeText(rawText);
  const answerMarker = text.search(/(?:^|\n)ĐÁP ÁN\b/i);
  if (answerMarker < 0) throw new Error("Không tìm thấy phần ĐÁP ÁN ở cuối file.");

  const speaking = extractSpeakingSection(text.slice(0, answerMarker).trim());
  const questionText = speaking.remaining;
  const answerText = text.slice(answerMarker).replace(/^ĐÁP ÁN\s*/i, "");
  const answerKey = parseAnswerKey(answerText);
  const passageMatch = questionText.match(/A\.\s*Read[\s\S]*?\n([\s\S]*?)\n15\.\s*/i);
  const readingPassage = passageMatch ? passageMatch[1].trim() : "";
  const questions = [];
  const pattern = /(?:^|\n)(\d{1,2})\.\s*([\s\S]*?)(?=\n\d{1,2}\.\s|\n(?:II|III|IV)\.\s|\nB\.\s*Fill|\nB\.\s*Write|\n---\s*THE END|$)/g;

  for (const match of questionText.matchAll(pattern)) {
    const number = Number(match[1]);
    if (number < 1 || number > 23) continue;
    const block = match[2].trim();
    const options = parseOptions(block);
    const prompt = options.length ? block.slice(0, block.search(/(?:^|\s)A\.\s/)).trim() : block;
    const manual = number >= 21;
    const question = {
      id: `q-${number}`,
      number,
      section: sectionFor(number),
      type: options.length ? "multiple_choice" : manual ? "writing" : "short_answer",
      prompt,
      options,
      points: number <= 4 ? 0.25 : number <= 14 ? 0.3 : number <= 18 ? 0.5 : 0.5,
      manual,
    };
    if (number >= 15 && number <= 18 && readingPassage) question.context = readingPassage;
    if (options.length && answerKey.choices[number]) question.answer = answerKey.choices[number];
    if (!options.length && number <= 20) {
      const accepted = String(answerKey.textAnswers[number] || "")
        .split("/").map(value => value.trim().toLowerCase()).filter(Boolean);
      question.accepted = accepted;
    }
    if (manual) question.referenceAnswer = answerKey.textAnswers[number] || "";
    questions.push(question);
  }

  const fillMatch = questionText.match(/B\.\s*Fill in each blank[\s\S]*?\n([\s\S]*?)(?=\nIV\.\s*WRITING|$)/i);
  const fillPassage = fillMatch ? fillMatch[1].trim() : "";
  const fillAnswers = {};
  const pair = answerText.match(/19\.\s*([^\n]+?)\s+20\.\s*([^\n]+)/i);
  if (pair) { fillAnswers[19] = pair[1]; fillAnswers[20] = pair[2]; }
  for (const marker of fillPassage.matchAll(/\((19|20)\)\s+_{3,}/g)) {
    const number = Number(marker[1]);
    const maskedPassage = fillPassage.replace(/\((19|20)\)\s+_{3,}/g, (_, itemNumber) => Number(itemNumber) === number ? "(____)" : "(…)" );
    questions.push({
      id: `q-${number}`,
      number,
      section: "Reading",
      type: "short_answer",
      prompt: `Fill blank ${number}: ${maskedPassage}`,
      options: [],
      points: 0.5,
      manual: false,
      accepted: String(fillAnswers[number] || answerKey.textAnswers[number] || "").split("/").map(value => value.trim().toLowerCase()).filter(Boolean),
    });
  }

  const paragraphMatch = questionText.match(/B\.\s*Write a short paragraph[\s\S]*?(?=\n---\s*THE END|$)/i);
  if (paragraphMatch) {
    questions.push({
      id: "writing-paragraph",
      number: 24,
      section: "Writing",
      type: "writing",
      prompt: paragraphMatch[0].replace(/\n\.{3,}[\s\S]*/g, "").trim(),
      points: 1.5,
      manual: true,
      referenceAnswer: "Chấm theo nội dung, ngữ pháp, từ vựng và độ dài 80–100 từ.",
    });
  }

  questions.push(...speaking.speakingQuestions);
  questions.sort((left, right) => left.number - right.number);
  const objectiveCount = questions.filter(question => !question.manual && question.type !== "speaking").length;
  const manualCount = questions.filter(question => question.manual).length;
  const speakingCount = questions.filter(question => question.type === "speaking").length;
  if (objectiveCount < 5 && !speakingCount) throw new Error("Không nhận diện đủ câu hỏi trắc nghiệm của đề (cần đánh số 1., 2., ... và phần ĐÁP ÁN ở cuối).");

  return {
    title,
    sourceFormat: "english-9-semester-test",
    sections: ["Phonetics", "Grammar and Vocabulary", "Reading", "Writing", "Speaking"]
      .map(name => ({ name, questions: questions.filter(question => question.section === name) }))
      .filter(section => section.questions.length),
    questions,
    answerKey: { generated: true },
    summary: {
      objectiveCount,
      manualCount,
      speakingCount,
      totalPoints: Number(questions.reduce((sum, question) => sum + Number(question.points || 0), 0).toFixed(2))
    },
  };
}

module.exports = { parseDocxAssessment, extractSpeakingSection };
