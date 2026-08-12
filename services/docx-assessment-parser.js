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

function parseDocxAssessment(rawText, title = "Bài kiểm tra DOCX") {
  const text = normalizeText(rawText);
  const answerMarker = text.search(/(?:^|\n)ĐÁP ÁN\b/i);
  if (answerMarker < 0) throw new Error("Không tìm thấy phần ĐÁP ÁN ở cuối file.");

  const questionText = text.slice(0, answerMarker).trim();
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

  questions.sort((left, right) => left.number - right.number);
  const objectiveCount = questions.filter(question => !question.manual).length;
  const manualCount = questions.filter(question => question.manual).length;
  if (objectiveCount < 10 || manualCount < 1) throw new Error("Không nhận diện đủ câu hỏi trắc nghiệm và phần Writing của đề.");

  return {
    title,
    sourceFormat: "english-9-semester-test",
    sections: ["Phonetics", "Grammar and Vocabulary", "Reading", "Writing"].map(name => ({ name, questions: questions.filter(question => question.section === name) })),
    questions,
    answerKey: { generated: true },
    summary: { objectiveCount, manualCount, totalPoints: questions.reduce((sum, question) => sum + question.points, 0) },
  };
}

module.exports = { parseDocxAssessment };
