const https = require('https');

async function chatWithCapybara(userMessage, conversationHistory = []) {
  const text = (userMessage || '').trim();
  if (!text) return 'Chào bạn! Mình là Capybara AI Tutor. Hãy gửi câu hỏi hoặc chủ đề bạn muốn luyện tập nhé! 🦫✨';

  if (process.env.GROQ_API_KEY) {
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are Capybara, a friendly, enthusiastic, and highly knowledgeable AI English Tutor for Vietnamese secondary school students (Grade 6-9). You explain grammar clearly in Vietnamese with examples, correct mistakes politely, and encourage students with capybara charm and carrots 🥕. Keep responses concise, well-formatted with markdown and bullet points.'
        },
        ...conversationHistory.slice(-6),
        { role: 'user', content: text }
      ];
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + process.env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages,
          temperature: 0.7
        })
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content) return content;
      }
    } catch (e) {}
  }

  const lower = text.toLowerCase();
  if (lower.includes('quá khứ') || lower.includes('past simple') || lower.includes('past tense')) {
    return '### 🦫 Gia sư Capybara: Thì Quá khứ đơn (Past Simple)\n\n**1. Công thức:**\n* **Khẳng định:** S + V2/V-ed + (O)\n  * *Ví dụ:* She **visited** Hanoi yesterday. / They **went** to school by bus.\n* **Phủ định:** S + didn\'t + V-nguyên thể\n  * *Ví dụ:* I **didn\'t see** him this morning.\n* **Nghi vấn:** Did + S + V-nguyên thể?\n  * *Ví dụ:* **Did** you **finish** your homework?\n\n**2. Dấu hiệu:** *yesterday, last week/month/year, ago, in 2020...*\n\n💡 **Mẹo Capybara:** Trong câu phủ định hoặc nghi vấn khi đã có **DID / DIDN\'T**, động từ chính luôn ở dạng **nguyên mẫu** nhé! 🥕';
  }
  if (lower.includes('hiện tại đơn') || lower.includes('present simple')) {
    return '### 🦫 Gia sư Capybara: Thì Hiện tại đơn (Present Simple)\n\n**1. Công thức:**\n* **Số nhiều (I/You/We/They):** S + V-nguyên thể\n* **Số ít (He/She/It):** S + V-s/es\n* **Phủ định:** S + don\'t / doesn\'t + V-nguyên thể\n* **Nghi vấn:** Do / Does + S + V-nguyên thể?\n\n**2. Thêm -es khi tận cùng là:** O, S, X, Z, CH, SH *(Mẹo: **Ô**ng **S**áu **X**em **Z**ô **CH**ạy **SH**)*\n\n**3. Dấu hiệu:** *always, usually, often, sometimes, rarely, never, every day...* 🥕';
  }
  if (lower.includes('so sánh') || lower.includes('comparative') || lower.includes('superlative')) {
    return '### 🦫 Gia sư Capybara: Cấu trúc So Sánh\n\n**1. So sánh hơn:**\n* **Tính từ ngắn:** S1 + be + Adj-er + than + S2 *(An is taller than Nam)*\n* **Tính từ dài:** S1 + be + more + Adj + than + S2 *(This book is more interesting than that one)*\n\n**2. Bất quy tắc:**\n* good -> **better** -> the best\n* bad -> **worse** -> the worst\n* many/much -> **more** -> the most 🥕';
  }
  if (lower.includes('điều kiện') || lower.includes('conditional') || lower.includes('if')) {
    return '### 🦫 Gia sư Capybara: Câu Điều Kiện\n\n**1. Loại 1 (Có thật ở hiện tại/tương lai):**\n* If + S + V (Hiện tại đơn), S + will/can + V-nguyên thể\n* *Ví dụ:* If it **rains** tomorrow, we **will stay** home.\n\n**2. Loại 2 (Giả định trái hiện tại):**\n* If + S + V2/V-ed (To be = were), S + would/could + V-nguyên thể\n* *Ví dụ:* If I **were** you, I **would study** harder. 🥕';
  }

  return 'Chào bạn! Mình là **Gia sư Capybara AI** của ENGO 🦫.\n\nMình có thể giúp bạn:\n1. 💡 **Giải thích mọi điểm ngữ pháp THCS**.\n2. ✍️ **Sửa lỗi câu & chấm bài Writing**.\n3. 🗣️ **Luyện nói & giao tiếp tiếng Anh**.\n4. 🎯 **Tạo đề ôn thi và câu hỏi trắc nghiệm** theo yêu cầu.\n\nHãy gửi câu hỏi cho mình nhé! 🥕✨';
}

function gradeWritingEssay({ prompt, content, level = 'grade9' }) {
  const text = (content || '').trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 10) {
    return {
      score: 3.0,
      band: 'A1 - Cần viết dài hơn',
      wordCount,
      criteria: {
        taskAchievement: { score: 3.0, comment: 'Bài viết quá ngắn (dưới 10 từ).' },
        coherence: { score: 3.0, comment: 'Chưa đủ cấu trúc đoạn văn.' },
        lexicalResource: { score: 3.5, comment: 'Cần bổ sung thêm từ vựng.' },
        grammaticalAccuracy: { score: 3.0, comment: 'Hãy viết từ 50 - 100 từ để nhận đánh giá chi tiết.' }
      },
      mistakes: [],
      improvedVersion: prompt ? 'In response to the prompt "' + prompt + '", you should develop at least 4-5 clear sentences.' : 'Please write a longer paragraph.',
      generalFeedback: 'Bài viết còn quá ngắn. Hãy cố gắng phát triển thêm ý tưởng với ít nhất 5-7 câu hoàn chỉnh nhé! 🦫💪',
      rewards: { xp: 5, carrots: 0 }
    };
  }

  const mistakes = [];
  const lowerText = text.toLowerCase();

  const matchDont = text.match(/\b(he|she|it)\s+don't\b/i);
  if (matchDont) {
    mistakes.push({
      original: matchDont[0],
      corrected: matchDont[0].replace(/don't/i, "doesn't"),
      type: 'Chia động từ (Subject-Verb Agreement)',
      explanation: 'Chủ ngữ ngôi thứ 3 số ít (He/She/It) trong câu phủ định thì Hiện tại đơn dùng doesn\'t, không dùng don\'t.'
    });
  }

  const matchDidntVed = text.match(/\b(didn't|did not)\s+([a-z]+ed|[a-z]+went|[a-z]+bought|[a-z]+saw)\b/i);
  if (matchDidntVed) {
    mistakes.push({
      original: matchDidntVed[0],
      corrected: 'didn\'t + V-nguyên thể',
      type: 'Thì Quá khứ đơn (Past Simple)',
      explanation: 'Sau trợ động từ didn\'t / did not, động từ chính luôn ở dạng nguyên mẫu không chia.'
    });
  }

  const matchMoreShort = text.match(/\bmore\s+(tall|big|fast|small|short|high|cheap|rich|poor|old|young)\b/i);
  if (matchMoreShort) {
    const adj = matchMoreShort[1];
    mistakes.push({
      original: matchMoreShort[0],
      corrected: adj + 'er',
      type: 'So sánh hơn tính từ ngắn',
      explanation: 'Tính từ ngắn 1 âm tiết "' + adj + '" khi so sánh hơn thêm đuôi "-er" (' + adj + 'er), không dùng "more ' + adj + '".'
    });
  }

  if (lowerText.includes('in the weekend')) {
    mistakes.push({
      original: 'in the weekend',
      corrected: 'at the weekend / on weekends',
      type: 'Giới từ chỉ thời gian',
      explanation: 'Chỉ thời gian cuối tuần dùng giới từ at the weekend hoặc on weekends.'
    });
  }

  let baseScore = 7.0;
  if (wordCount >= 50 && wordCount <= 150) baseScore += 1.0;
  else if (wordCount > 150) baseScore += 1.5;

  const penalty = Math.min(2.5, mistakes.length * 0.5);
  const finalScore = Math.max(4.0, Math.min(9.5, +(baseScore - penalty).toFixed(1)));

  let band = 'B1 - Đạt chuẩn THCS';
  if (finalScore >= 9.0) band = 'B2 - Xuất sắc';
  else if (finalScore >= 7.5) band = 'B1+ - Khá giỏi';
  else if (finalScore >= 6.0) band = 'B1 - Đạt yêu cầu';
  else band = 'A2 - Cần củng cố';

  let improvedVersion = text
    .replace(/\b(he|she|it)\s+don't\b/gi, (m, p1) => p1 + " doesn't")
    .replace(/\bin the weekend\b/gi, 'at the weekend')
    .replace(/\bmore\s+(tall|fast|cheap)\b/gi, (m, p1) => p1 + 'er')
    .replace(/\bvery good\b/gi, 'excellent')
    .replace(/\bvery nice\b/gi, 'wonderful')
    .replace(/\ba lot of\b/gi, 'numerous');

  if (!improvedVersion.endsWith('.')) improvedVersion += '.';

  const taskScore = Math.min(10, +(finalScore + 0.3).toFixed(1));
  const cohScore = Math.min(10, +(finalScore - 0.2).toFixed(1));
  const lexScore = Math.min(10, +(finalScore + 0.1).toFixed(1));
  const graScore = Math.max(4.0, +(finalScore - penalty * 0.3).toFixed(1));

  return {
    score: finalScore,
    band,
    wordCount,
    criteria: {
      taskAchievement: {
        score: taskScore,
        comment: 'Bài viết ' + wordCount + ' từ đã đáp ứng tốt yêu cầu nội dung của chủ đề.'
      },
      coherence: {
        score: cohScore,
        comment: 'Mạch văn tương đối liền mạch. Hãy sử dụng thêm các liên từ (Furthermore, However) để tự nhiên hơn.'
      },
      lexicalResource: {
        score: lexScore,
        comment: 'Sử dụng từ vựng phù hợp với trình độ THCS. Có thể nâng cấp một số từ cơ bản sang từ đồng nghĩa cao cấp hơn.'
      },
      grammaticalAccuracy: {
        score: graScore,
        comment: mistakes.length === 0 ? 'Ngữ pháp rất chuẩn xác, cấu trúc câu phong phú.' : 'Phát hiện ' + mistakes.length + ' điểm cần lưu ý về thì và cấu trúc câu.'
      }
    },
    mistakes,
    improvedVersion,
    generalFeedback: finalScore >= 8.0
      ? '🌟 Bài viết rất xuất sắc! Văn phong lưu loát, bố cục rõ ràng và từ vựng phong phú. Tiếp tục phát huy nhé!'
      : '👍 Bài viết khá tốt và đúng trọng tâm. Hãy xem kỹ các lỗi được chỉ ra ở bảng bên dưới để hoàn thiện hơn nhé!',
    rewards: {
      xp: finalScore >= 8.0 ? 30 : 20,
      carrots: finalScore >= 8.0 ? 3 : 1
    }
  };
}

const CURRICULUM_TOPIC_BANKS = {
  tenses: [
    { prompt: 'Look at the clouds! It ______ rain soon.', options: ['A. will', 'B. is going to', 'C. rains', 'D. rained'], answer: 1, explanation: 'Dùng "be going to" diễn tả sự việc sắp xảy ra có bằng chứng rõ ràng ở hiện tại ("Look at the clouds").' },
    { prompt: 'When I arrived at the station, the train ______ already.', options: ['A. leaves', 'B. left', 'C. had left', 'D. was leaving'], answer: 2, explanation: 'Hành động tàu rời đi xảy ra trước thời điểm "arrived" trong quá khứ nên dùng Quá khứ hoàn thành (had + V3).' },
    { prompt: 'My brother usually ______ to work by bus, but today he is riding his bike.', options: ['A. goes', 'B. go', 'C. is going', 'D. went'], answer: 0, explanation: 'Thói quen hàng ngày với "usually", chủ ngữ số ít "My brother" -> động từ thêm -es (goes).' },
    { prompt: 'They ______ English for five years and they speak it fluently now.', options: ['A. study', 'B. studied', 'C. have studied', 'D. are studying'], answer: 2, explanation: 'Hành động bắt đầu trong quá khứ kéo dài đến hiện tại với "for five years" -> Hiện tại hoàn thành (have studied).' },
    { prompt: 'While Mary ______ a book, her sister was listening to music.', options: ['A. read', 'B. was reading', 'C. is reading', 'D. has read'], answer: 1, explanation: 'Hai hành động diễn ra song song cùng lúc trong quá khứ nối bằng "While" -> Quá khứ tiếp diễn (was reading).' }
  ],
  conditionals: [
    { prompt: 'If you ______ hard, you will pass the final examination with high scores.', options: ['A. study', 'B. studied', 'C. will study', 'D. had studied'], answer: 0, explanation: 'Câu điều kiện loại 1: Mệnh đề IF chia thì Hiện tại đơn (S + V-s/es), mệnh đề chính dùng "will + V".' },
    { prompt: 'If I ______ you, I wouldn\'t accept that dangerous job offer.', options: ['A. am', 'B. was', 'C. were', 'D. have been'], answer: 2, explanation: 'Câu điều kiện loại 2: To be ở mệnh đề IF dùng "were" cho mọi ngôi.' },
    { prompt: 'Unless you hurry up, we ______ the last train tonight.', options: ['A. miss', 'B. will miss', 'C. missed', 'D. would miss'], answer: 1, explanation: '"Unless" = "If not". Mệnh đề chính câu điều kiện loại 1 dùng "will + V".' },
    { prompt: 'What would you do if you ______ one million dollars?', options: ['A. win', 'B. won', 'C. will win', 'D. had won'], answer: 1, explanation: 'Câu điều kiện loại 2 (mệnh đề chính "would you do" -> mệnh đề IF chia Quá khứ đơn "won").' },
    { prompt: 'If the weather ______ fine tomorrow, we will go camping in the national park.', options: ['A. is', 'B. will be', 'C. was', 'D. would be'], answer: 0, explanation: 'Mệnh đề IF câu điều kiện loại 1 chia Hiện tại đơn: "the weather is".' }
  ],
  passive: [
    { prompt: 'A new shopping mall ______ in our neighborhood next month.', options: ['A. is built', 'B. will be built', 'C. was built', 'D. has built'], answer: 1, explanation: 'Câu bị động thì Tương lai đơn: S + will be + V3/V-ed.' },
    { prompt: 'The novel "Harry Potter" ______ by J.K. Rowling in 1997.', options: ['A. wrote', 'B. is written', 'C. was written', 'D. has been written'], answer: 2, explanation: 'Câu bị động thì Quá khứ đơn: S + was/were + V3 (was written).' },
    { prompt: 'English ______ as a compulsory subject in many Vietnamese schools today.', options: ['A. is taught', 'B. teaches', 'C. was taught', 'D. has taught'], answer: 0, explanation: 'Câu bị động thì Hiện tại đơn: S + am/is/are + V3 (is taught).' },
    { prompt: 'All the plastic bottles should ______ before being thrown away.', options: ['A. recycle', 'B. be recycled', 'C. recycled', 'D. to recycle'], answer: 1, explanation: 'Câu bị động với động từ khuyết thiếu: Modal + be + V3.' }
  ],
  relative: [
    { prompt: 'The girl ______ is talking to Mr. David is the best student in our class.', options: ['A. who', 'B. whom', 'C. which', 'D. whose'], answer: 0, explanation: 'Đại từ quan hệ "who" thay thế cho người ("The girl") và làm chủ ngữ cho "is talking".' },
    { prompt: 'Do you know the city ______ the 33rd SEA Games will take place?', options: ['A. which', 'B. where', 'C. when', 'D. whose'], answer: 1, explanation: 'Trạng từ quan hệ "where" thay thế cho danh từ chỉ nơi chốn "the city".' },
    { prompt: 'The book ______ I bought yesterday is very informative and interesting.', options: ['A. which', 'B. who', 'C. whom', 'D. whose'], answer: 0, explanation: 'Đại từ quan hệ "which" thay thế cho danh từ chỉ vật "The book".' },
    { prompt: 'Meet my friend Peter, ______ father is a famous surgeon at Bach Mai Hospital.', options: ['A. who', 'B. whom', 'C. which', 'D. whose'], answer: 3, explanation: 'Đại từ quan hệ chỉ sở hữu "whose" (= his father).' }
  ],
  environment_vocab: [
    { prompt: 'We should use reusable bags instead of single-use plastic bags to ______ the environment.', options: ['A. pollute', 'B. protect', 'C. damage', 'D. destroy'], answer: 1, explanation: 'protect the environment = bảo vệ môi trường.' },
    { prompt: 'Deforestation causes serious soil erosion and leads to natural ______ such as floods.', options: ['A. disasters', 'B. resources', 'C. habitats', 'D. products'], answer: 0, explanation: 'natural disasters = thiên tai (như lũ lụt).' },
    { prompt: 'Solar energy and wind power are clean and ______ sources of energy.', options: ['A. non-renewable', 'B. renewable', 'C. harmful', 'D. limited'], answer: 1, explanation: 'renewable sources of energy = nguồn năng lượng tái tạo.' },
    { prompt: 'The government is trying to ______ the amount of carbon emissions from factories.', options: ['A. reduce', 'B. increase', 'C. expand', 'D. produce'], answer: 0, explanation: 'reduce = cắt giảm (lượng khí thải carbon).' }
  ]
};

function generateTestOnDemand({ topic = 'tenses', gradeLevel = '9', count = 10, difficulty = 'medium' }) {
  const numCount = Math.min(20, Math.max(3, Number(count) || 5));
  let pool = [];

  const lowerTopic = String(topic).toLowerCase();

  if (lowerTopic.includes('if') || lowerTopic.includes('điều kiện')) {
    pool = [...CURRICULUM_TOPIC_BANKS.conditionals, ...CURRICULUM_TOPIC_BANKS.tenses];
  } else if (lowerTopic.includes('bị động') || lowerTopic.includes('passive')) {
    pool = [...CURRICULUM_TOPIC_BANKS.passive, ...CURRICULUM_TOPIC_BANKS.tenses];
  } else if (lowerTopic.includes('quan hệ') || lowerTopic.includes('relative') || lowerTopic.includes('who')) {
    pool = [...CURRICULUM_TOPIC_BANKS.relative, ...CURRICULUM_TOPIC_BANKS.conditionals];
  } else if (lowerTopic.includes('môi trường') || lowerTopic.includes('environment') || lowerTopic.includes('từ vựng')) {
    pool = [...CURRICULUM_TOPIC_BANKS.environment_vocab, ...CURRICULUM_TOPIC_BANKS.tenses];
  } else {
    pool = [
      ...CURRICULUM_TOPIC_BANKS.tenses,
      ...CURRICULUM_TOPIC_BANKS.conditionals,
      ...CURRICULUM_TOPIC_BANKS.passive,
      ...CURRICULUM_TOPIC_BANKS.relative,
      ...CURRICULUM_TOPIC_BANKS.environment_vocab
    ];
  }

  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const selectedQuestions = [];

  for (let i = 0; i < numCount; i++) {
    const template = shuffled[i % shuffled.length];
    selectedQuestions.push({
      id: 'ai-q-' + Date.now() + '-' + (i + 1),
      question: template.prompt,
      options: template.options,
      answer: template.answer,
      explanation: template.explanation,
      type: 'multiple-choice'
    });
  }

  return {
    testTitle: 'Đề Luyện Tập AI: ' + (topic || 'Tổng hợp Ngữ pháp THCS') + ' (Khối ' + gradeLevel + ')',
    gradeLevel,
    difficulty,
    totalQuestions: selectedQuestions.length,
    timeMinutes: Math.max(5, Math.round(selectedQuestions.length * 1.5)),
    questions: selectedQuestions
  };
}

module.exports = {
  chatWithCapybara,
  gradeWritingEssay,
  generateTestOnDemand
};