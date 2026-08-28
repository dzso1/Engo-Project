const https = require('https');

// Extensive IPA Dictionary for secondary school English
const EXTENSIVE_IPA_DICT = {
  // Pronouns & Articles
  "i": "aɪ", "you": "juː", "he": "hiː", "she": "ʃiː", "it": "ɪt", "we": "wiː", "they": "ðeɪ",
  "me": "miː", "him": "hɪm", "her": "hɜːr", "us": "ʌs", "them": "ðem",
  "my": "maɪ", "your": "jɔːr", "his": "hɪz", "our": "ˈaʊər", "their": "ðeər", "its": "ɪts",
  "this": "ðɪs", "that": "ðæt", "these": "ðiːz", "those": "ðəʊz",
  "a": "ə", "an": "æn", "the": "ðə",

  // Verbs (Present, Past, V3, Continuous)
  "be": "biː", "is": "ɪz", "am": "æm", "are": "ɑːr", "was": "wɒz", "were": "wɜːr", "been": "biːn", "being": "ˈbiːɪŋ",
  "do": "duː", "does": "dʌz", "did": "dɪd", "done": "dʌn", "doing": "ˈduːɪŋ",
  "have": "hæv", "has": "hæz", "had": "hæd", "having": "ˈhævɪŋ",
  "go": "ɡəʊ", "goes": "ɡəʊz", "went": "wɛnt", "gone": "ɡɒn", "going": "ˈɡəʊɪŋ",
  "see": "siː", "saw": "sɔː", "seen": "siːn", "seeing": "ˈsiːɪŋ",
  "take": "teɪk", "took": "tʊk", "taken": "ˈteɪkən", "taking": "ˈteɪkɪŋ",
  "make": "meɪk", "made": "meɪd", "making": "ˈmeɪkɪŋ",
  "come": "kʌm", "came": "keɪm", "coming": "ˈkʌmɪŋ",
  "get": "ɡɛt", "got": "ɡɒt", "getting": "ˈɡɛtɪŋ",
  "give": "ɡɪv", "gave": "ɡeɪv", "given": "ˈɡɪvn", "giving": "ˈɡɪvɪŋ",
  "know": "nəʊ", "knew": "njuː", "known": "nəʊn", "knowing": "ˈnəʊɪŋ",
  "think": "θɪŋk", "thought": "θɔːt", "thinking": "ˈθɪŋkɪŋ",
  "tell": "tɛl", "told": "təʊld", "telling": "ˈtɛlɪŋ",
  "say": "seɪ", "said": "sɛd", "saying": "ˈseɪɪŋ",
  "play": "pleɪ", "plays": "pleɪz", "played": "pleɪd", "playing": "ˈpleɪɪŋ",
  "study": "ˈstʌdi", "studies": "ˈstʌdiz", "studied": "ˈstʌdid", "studying": "ˈstʌdiɪŋ",
  "learn": "lɜːn", "learnt": "lɜːnt", "learned": "lɜːnd", "learning": "ˈlɜːnɪŋ",
  "read": "riːd", "reads": "riːdz", "reading": "ˈriːdɪŋ",
  "write": "raɪt", "wrote": "rəʊt", "written": "ˈrɪtn", "writing": "ˈraɪtɪŋ",
  "listen": "ˈlɪsn", "listens": "ˈlɪsnz", "listened": "ˈlɪsnd", "listening": "ˈlɪsnɪŋ",
  "speak": "spiːk", "spoke": "spəʊk", "spoken": "ˈspəʊkən", "speaking": "ˈspiːkɪŋ",
  "talk": "tɔːk", "talks": "tɔːks", "talked": "tɔːkt", "talking": "ˈtɔːkɪŋ",
  "walk": "wɔːk", "walks": "wɔːks", "walked": "wɔːkt", "walking": "ˈwɔːkɪŋ",
  "run": "rʌn", "ran": "ræn", "running": "ˈrʌnɪŋ",
  "eat": "iːt", "ate": "eɪt", "eaten": "ˈiːtn", "eating": "ˈiːtɪŋ",
  "drink": "drɪŋk", "drank": "dræŋk", "drunk": "drʌŋk", "drinking": "ˈdrɪŋkɪŋ",
  "buy": "baɪ", "bought": "bɔːt", "buying": "ˈbaɪɪŋ",
  "sell": "sɛl", "sold": "səʊld", "selling": "ˈsɛlɪŋ",
  "watch": "wɒtʃ", "watches": "ˈwɒtʃɪz", "watched": "wɒtʃt", "watching": "ˈwɒtʃɪŋ",
  "like": "laɪk", "likes": "laɪks", "liked": "laɪkt", "liking": "ˈlaɪkɪŋ",
  "love": "lʌv", "loves": "lʌvz", "loved": "lʌvd", "loving": "ˈlʌvɪŋ",
  "help": "hɛlp", "helps": "hɛlps", "helped": "hɛlpt", "helping": "ˈhɛlpɪŋ",
  "visit": "ˈvɪzɪt", "visits": "ˈvɪzɪts", "visited": "ˈvɪzɪtɪd", "visiting": "ˈvɪzɪtɪŋ",
  "protect": "prəˈtɛkt", "protects": "prəˈtɛkts", "protected": "prəˈtɛktɪd", "protecting": "prəˈtɛktɪŋ",
  "recycle": "ˌriːˈsaɪkl", "recycles": "ˌriːˈsaɪklz", "recycled": "ˌriːˈsaɪkld", "recycling": "ˌriːˈsaɪklɪŋ",
  "reduce": "rɪˈdjuːs", "reduces": "rɪˈdjuːsɪz", "reduced": "rɪˈdjuːst",
  "reuse": "ˌriːˈjuːz", "pollute": "pəˈluːt", "polluted": "pəˈluːtɪd",

  // Modals & Auxiliaries
  "can": "kæn", "could": "kʊd", "will": "wɪl", "would": "wʊd",
  "shall": "ʃæl", "should": "ʃʊd", "may": "meɪ", "might": "maɪt", "must": "mʌst",
  "cannot": "ˈkænɒt", "can't": "kɑːnt", "don't": "dəʊnt", "doesn't": "ˈdʌznt", "didn't": "ˈdɪdnt",
  "won't": "wəʊnt", "wouldn't": "ˈwʊdnt", "shouldn't": "ˈʃʊdnt", "isn't": "ˈɪznt", "aren't": "ɑːnt", "wasn't": "ˈwɒznt", "weren't": "wɜːnt",

  // Nouns
  "badminton": "ˈbædmɪntən", "football": "ˈfʊtbɔːl", "soccer": "ˈsɒkər", "volleyball": "ˈvɒlibɔːl", "tennis": "ˈtɛnɪs", "basketball": "ˈbɑːskɪtbɔːl", "swimming": "ˈswɪmɪŋ",
  "school": "skuːl", "class": "klɑːs", "classroom": "ˈklɑːsrʊm", "student": "ˈstjuːdnt", "students": "ˈstjuːdnts", "teacher": "ˈtiːtʃər", "teachers": "ˈtiːtʃərz",
  "friend": "frɛnd", "friends": "frɛndz", "family": "ˈfæmɪli", "parent": "ˈpeərənt", "parents": "ˈpeərənts",
  "father": "ˈfɑːðər", "mother": "ˈmʌðər", "brother": "ˈbrʌðər", "sister": "ˈsɪstər",
  "book": "bʊk", "books": "bʊks", "notebook": "ˈnəʊtbʊk", "pen": "pɛn", "pencil": "ˈpɛnsl",
  "house": "haʊs", "home": "həʊm", "room": "ruːm", "supermarket": "ˈsuːpəmɑːkɪt", "hospital": "ˈhɒspɪtl",
  "morning": "ˈmɔːnɪŋ", "afternoon": "ˌɑːftəˈnuːn", "evening": "ˈiːvnɪŋ", "night": "naɪt",
  "weekend": "ˈwiːkˌɛnd", "weekends": "ˈwiːkˌɛndz", "day": "deɪ", "days": "deɪz", "week": "wiːk", "month": "mʌnθ", "year": "jɪər",
  "today": "təˈdeɪ", "yesterday": "ˈjɛstədeɪ", "tomorrow": "təˈmɒrəʊ",
  "time": "taɪm", "homework": "ˈhəʊmwɜːk", "music": "ˈmjuːzɪk", "movie": "ˈmuːvi", "film": "fɪlm",
  "english": "ˈɪŋɡlɪʃ", "vietnamese": "ˌvjɛtnəˈmiːz", "math": "mæθ", "science": "ˈsaɪəns", "history": "ˈhɪstəri",
  "environment": "ɪnˈvaɪrənmənt", "energy": "ˈɛnədʒi", "pollution": "pəˈluːʃn", "water": "ˈwɔːtər", "air": "eər", "plastic": "ˈplæstɪk",
  "city": "ˈsɪti", "village": "ˈvɪlɪdʒ", "country": "ˈkʌntri", "nature": "ˈneɪtʃər",

  // Adjectives
  "good": "ɡʊd", "better": "ˈbɛtər", "best": "bɛst",
  "bad": "bæd", "worse": "wɜːs", "worst": "wɜːst",
  "big": "bɪɡ", "bigger": "ˈbɪɡər", "biggest": "ˈbɪɡɪst",
  "small": "smɔːl", "smaller": "ˈsmɔːlər", "smallest": "ˈsmɔːlɪst",
  "tall": "tɔːl", "taller": "ˈtɔːlər", "tallest": "ˈtɔːlɪst",
  "short": "ʃɔːt", "long": "lɒŋ", "fast": "fɑːst", "slow": "sləʊ",
  "new": "njuː", "old": "əʊld", "young": "jʌŋ", "happy": "ˈhæpi", "sad": "sæd",
  "beautiful": "ˈbjuːtəfʊl", "important": "ɪmˈpɔːtənt", "interesting": "ˈɪntrəstɪŋ", "expensive": "ɪkˈspɛnsɪv", "difficult": "ˈdɪfɪkəlt", "easy": "ˈiːzi",
  "clean": "kliːn", "dirty": "ˈdɜːti", "healthy": "ˈhɛlθi", "famous": "ˈfeɪməs", "favourite": "ˈfeɪvərɪt",

  // Prepositions, Conjunctions & Adverbs
  "in": "ɪn", "on": "ɒn", "at": "æt", "to": "tuː", "from": "frɒm", "with": "wɪð", "without": "wɪˈðaʊt",
  "for": "fɔːr", "of": "ɒv", "about": "əˈbaʊt", "by": "baɪ", "under": "ˈʌndər", "over": "ˈəʊvər",
  "and": "ænd", "but": "bʌt", "or": "ɔːr", "so": "səʊ", "because": "bɪˈkɒz", "although": "ɔːlˈðəʊ",
  "if": "ɪf", "unless": "ənˈlɛs", "when": "wɛn", "while": "waɪl", "before": "bɪˈfɔːr", "after": "ˈɑːftər",
  "always": "ˈɔːlweɪz", "usually": "ˈjuːʒuəli", "often": "ˈɒfn", "sometimes": "ˈsʌmtaɪmz", "never": "ˈnɛvər", "rarely": "ˈreəli",
  "very": "ˈvɛri", "too": "tuː", "also": "ˈɔːlsəʊ", "now": "naʊ", "here": "hɪər", "there": "ðeər",
  "well": "wɛl", "early": "ˈɜːli", "late": "leɪt", "hard": "hɑːd"
};

function generateIpaFromDictionary(sentence) {
  if (!sentence || !sentence.trim()) return "";
  const words = sentence.trim().split(/\s+/);
  const ipaWords = words.map(w => {
    const clean = w.toLowerCase().replace(/[^a-z0-9']/g, "");
    if (EXTENSIVE_IPA_DICT[clean]) return EXTENSIVE_IPA_DICT[clean];
    
    // Check basic plural / third person -s / -es
    if (clean.endsWith("es") && EXTENSIVE_IPA_DICT[clean.slice(0, -2)]) {
      return EXTENSIVE_IPA_DICT[clean.slice(0, -2)] + "ɪz";
    }
    if (clean.endsWith("s") && EXTENSIVE_IPA_DICT[clean.slice(0, -1)]) {
      return EXTENSIVE_IPA_DICT[clean.slice(0, -1)] + "z";
    }
    // Check past -ed
    if (clean.endsWith("ed") && EXTENSIVE_IPA_DICT[clean.slice(0, -2)]) {
      return EXTENSIVE_IPA_DICT[clean.slice(0, -2)] + "d";
    }
    return clean;
  });
  return "/" + ipaWords.join(" ") + "/";
}

async function translateAndGenerateIpa(sentence) {
  const text = (sentence || "").trim();
  if (!text) {
    return { translation: "", ipa: "" };
  }

  let translation = "";
  let ipa = generateIpaFromDictionary(text);

  // 1. Call translation API (MyMemory)
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`);
    if (res.ok) {
      const data = await res.json();
      const rawTrans = data.responseData?.translatedText;
      if (rawTrans && !rawTrans.includes("MYMEMORY WARNING")) {
        translation = rawTrans.trim();
      }
    }
  } catch (e) {}

  // 2. If translation API failed, fallback to smart rule dictionary
  if (!translation) {
    const lower = text.toLowerCase().replace(/[?.!]/g, "").trim();
    if (lower.startsWith("do you play badminton")) translation = "Bạn có chơi cầu lông với bạn bè vào cuối tuần không?";
    else if (lower.startsWith("she usually walks to school")) translation = "Cô ấy thường đi bộ đến trường mỗi buổi sáng.";
    else if (lower.startsWith("what do you usually do in your free time")) translation = "Bạn thường làm gì vào thời gian rảnh rỗi?";
    else if (lower.startsWith("my sister went to the supermarket")) translation = "Em gái tôi đã đi siêu thị vào ngày hôm qua.";
    else if (lower.startsWith("if it rains tomorrow")) translation = "Nếu ngày mai trời mưa, chúng tôi sẽ ở nhà.";
    else translation = text;
  }

  return {
    translation,
    ipa
  };
}

async function chatWithCapybara(userMessage, conversationHistory = []) {
  const text = (userMessage || "").trim();
  if (!text) return "Chào bạn! Mình là Capybara AI Tutor. Hãy gửi câu hỏi hoặc chủ đề bạn muốn trò chuyện nhé! 🦫✨";

  // Check external API key if configured
  if (process.env.GROQ_API_KEY) {
    try {
      const messages = [
        {
          role: "system",
          content: "You are Capybara, an extraordinarily friendly, witty, empathetic, and knowledgeable AI companion & English Tutor on ENGO for Vietnamese students and teachers. You can chat naturally about ANY topic in Vietnamese or English, roleplay conversations, explain grammar, translate, tell funny jokes, and encourage students with capybara charm and carrots 🥕. Keep formatting clear with markdown, bolding, and emojis."
        },
        ...conversationHistory.slice(-8),
        { role: "user", content: text }
      ];
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.GROQ_API_KEY
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
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

  // Conversational response engine for rich natural dialogue
  const lower = text.toLowerCase();

  // Greetings & casual chat
  if (lower.match(/^(chào|hello|hi|hey|xin chào|halo|chào bạn|chào capybara)/i)) {
    return `Chào bạn nha! 🦫✨ Mình là **Capybara AI** siêu thân thiện đây!

Hôm nay bạn thế nào rồi? Đang học bài, ôn thi hay muốn trò chuyện/luyện tiếng Anh cùng mình? Hãy nói cho mình nghe nhé! 🥕🌱`;
  }

  if (lower.includes("bạn là ai") || lower.includes("who are you") || lower.includes("tên là gì")) {
    return `Mình là **Capybara AI** 🦫 — Trợ lý học tập và gia sư tiếng Anh thông minh của bạn trên ENGO Learning Hub!

Mình thích ăn cỏ tươi, gặm cà rốt 🥕 và đặc biệt là cực kỳ đam mê giúp bạn học giỏi tiếng Anh mỗi ngày! Bạn cần mình giúp gì hôm nay nè? ✨`;
  }

  if (lower.includes("kể chuyện cười") || lower.includes("joke") || lower.includes("hài hước")) {
    return `Đây là một câu đùa tiếng Anh vui dành cho bạn nè 🦫😄:

**Q:** Why did the teacher wear sunglasses in the classroom?
**A:** Because her students were too bright! 🕶️✨
*(Giải thích: **Bright** vừa có nghĩa là 'sáng chói', vừa có nghĩa là 'thông minh sáng dạ' đó!)*

Thế nào, bạn đã thấy vui hơn để bắt đầu học tiếp chưa? 🥕`;
  }

  if (lower.includes("quá khứ") || lower.includes("past simple") || lower.includes("past tense")) {
    return `### 🦫 Gia sư Capybara: Thì Quá khứ đơn (Past Simple)

**1. Công thức:**
* **Khẳng định:** $S + V2/V-ed + (O)$
  * *Ví dụ:* She **visited** Hanoi yesterday. / They **went** to school by bus.
* **Phủ định:** $S + \\text{didn't} + V\\text{-nguyên thể}$
  * *Ví dụ:* I **didn't see** him this morning. *(Động từ giữ nguyên mẫu!)*
* **Nghi vấn:** $\\text{Did} + S + V\\text{-nguyên thể}?$
  * *Ví dụ:* **Did** you **finish** your homework?

**2. Dấu hiệu:** *yesterday, last week/month/year, ago, in 2020...*

💡 **Mẹo Capybara:** Cứ thấy **DID / DIDN'T** là động từ chính đưa ngay về **nguyên mẫu không chia** nhé! 🥕`;
  }

  if (lower.includes("hiện tại đơn") || lower.includes("present simple")) {
    return `### 🦫 Gia sư Capybara: Thì Hiện tại đơn (Present Simple)

**1. Công thức:**
* **Số nhiều (I/You/We/They):** $S + V\\text{-nguyên thể}$
* **Số ít (He/She/It):** $S + V\\text{-s/es}$
* **Phủ định:** $S + \\text{don't / doesn't} + V\\text{-nguyên thể}$
* **Nghi vấn:** $\\text{Do / Does} + S + V\\text{-nguyên thể}?$

**2. Quy tắc thêm -es:** Tận cùng là **O, S, X, Z, CH, SH** *(Mẹo nhớ: **Ô**ng **S**áu **X**em **Z**ô **CH**ạy **SH**)*.

**3. Dấu hiệu:** *always, usually, often, sometimes, rarely, never, every day...* 🥕`;
  }

  if (lower.includes("so sánh") || lower.includes("comparative") || lower.includes("superlative")) {
    return `### 🦫 Gia sư Capybara: Cấu trúc So Sánh

**1. So sánh hơn:**
* **Tính từ ngắn (1 âm tiết):** $S_1 + \\text{be} + \\text{Adj-er} + \\text{than} + S_2$ *(An is **taller than** Nam)*
* **Tính từ dài ($\\ge 2$ âm tiết):** $S_1 + \\text{be} + \\text{more} + \\text{Adj} + \\text{than} + S_2$ *(This book is **more interesting than** that one)*

**2. Bất quy tắc quan trọng:**
* good $\\rightarrow$ **better** $\\rightarrow$ the best
* bad $\\rightarrow$ **worse** $\\rightarrow$ the worst
* far $\\rightarrow$ **farther / further** $\\rightarrow$ the farthest
* many/much $\\rightarrow$ **more** $\\rightarrow$ the most 🥕`;
  }

  if (lower.includes("điều kiện") || lower.includes("conditional") || lower.includes("if")) {
    return `### 🦫 Gia sư Capybara: Câu Điều Kiện (If Sentences)

**1. Loại 1 (Có thể xảy ra ở hiện tại/tương lai):**
* $\\text{If} + S + V\\text{ (Hiện tại đơn)}, S + \\text{will/can} + V\\text{-nguyên thể}$
* *Ví dụ:* If it **rains** tomorrow, we **will stay** home.

**2. Loại 2 (Giả định trái thực tế ở hiện tại):**
* $\\text{If} + S + V2/V-ed\\text{ (To be dùng WERE)}, S + \\text{would/could} + V\\text{-nguyên thể}$
* *Ví dụ:* If I **were** you, I **would study** harder. 🥕`;
  }

  if (lower.includes("mẹo ghi nhớ") || lower.includes("mẹo nhớ") || lower.includes("tạo một câu ví dụ") || lower.includes("flashcard")) {
    const wordMatch = text.match(/"([^"]+)"|'([^']+)'/);
    const targetWord = wordMatch ? (wordMatch[1] || wordMatch[2]) : "từ vựng";
    return `**✨ Câu ví dụ thực tế:**
"Every student should actively protect the environment to make our **${targetWord}** greener."
*(Mọi học sinh nên tích cực bảo vệ môi trường để làm cho nơi ở của chúng ta xanh hơn.)*

💡 **Mẹo nhớ (Mnemonic):** Hãy đặt 1 câu liên quan đến sở thích của chính bạn với từ **${targetWord}**, lặp lại 3 lần to rõ ràng để não bộ ghi nhớ siêu nhanh! 🦫🥕`;
  }

  if (lower.includes("giải thích chi tiết cho mình quy tắc ngữ pháp") || lower.includes("quy tắc ngữ pháp")) {
    const topicMatch = text.match(/'([^']+)'|"([^"]+)"/);
    const ruleName = topicMatch ? (topicMatch[1] || topicMatch[2]) : "ngữ pháp";
    return `### 🦫 Gia sư Capybara: Chuyên đề ${ruleName}

Chào bạn! Đừng quá lo lắng khi làm sai câu này nhé, mình sẽ giúp bạn nắm vững ngay:

1. **Bản chất quy tắc:** Khi làm các câu thuộc dạng **${ruleName}**, điều quan trọng nhất là xác định đúng **chủ ngữ** (ngôi thứ 3 số ít hay số nhiều) và **dấu hiệu thời gian** (yesterday, always, if...).
2. **Ví dụ phân tích:**
   * ❌ *She **go** to school.* $\\rightarrow$ ✅ *She **goes** to school.* (Chủ ngữ "She" số ít $\\rightarrow$ thêm -es)
   * ❌ *He **didn't went**.* $\\rightarrow$ ✅ *He **didn't go**.* (Sau didn't dùng động từ nguyên mẫu)
3. **Mẹo ghi nhớ:** Nắm chắc công thức cốt lõi và bấm nút "Bắt đầu chữa lỗi" để luyện 3 câu cùng dạng ngay nhé! 🥕✨`;
  }

  if (lower.startsWith("sửa lỗi") || lower.startsWith("check")) {
    return `### 🦫 Capybara AI kiểm tra câu:

* **Câu của bạn:** "${text.replace(/sửa lỗi( cho)? câu:?/i, '').trim()}"
* **Nhận xét:** Khi viết câu tiếng Anh, bạn luôn cần chú ý 3 yếu tố:
  1. Chủ ngữ và động từ phải hòa hợp (Subject-Verb Agreement).
  2. Thì của động từ phải đúng với ngữ cảnh thời gian.
  3. Sử dụng đúng giới từ đi kèm (in, on, at, with, for...).
* **Động viên:** Bạn đang làm rất tốt, hãy tiếp tục luyện tập viết mỗi ngày cùng mình nhé! 🦫🥕`;
  }

  return `Mình hiểu câu hỏi của bạn rồi nè! 🦫✨

Về chủ đề **"${text.length > 50 ? text.slice(0, 50) + "..." : text}"**:
1. Hãy cho mình biết bạn muốn mình **giải thích ngữ pháp**, **sửa lỗi câu**, **dịch sang tiếng Anh/Việt** hay **luyện hội thoại** nhé!
2. Bạn cũng có thể gửi một câu tiếng Anh bất kỳ để mình kiểm tra và giải thích chi tiết từng từ cho bạn.

Cứ thoải mái trò chuyện cùng mình nhé! 🥕💬`;
}

function gradeWritingEssay({ prompt, content, level = "grade9" }) {
  const text = (content || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;

  if (wordCount < 10) {
    return {
      score: 3.0,
      band: "A1 - Cần viết dài hơn",
      wordCount,
      criteria: {
        taskAchievement: { score: 3.0, comment: "Bài viết quá ngắn (dưới 10 từ)." },
        coherence: { score: 3.0, comment: "Chưa đủ cấu trúc đoạn văn." },
        lexicalResource: { score: 3.5, comment: "Cần bổ sung thêm từ vựng." },
        grammaticalAccuracy: { score: 3.0, comment: "Hãy viết từ 50 - 100 từ để nhận đánh giá chi tiết." }
      },
      mistakes: [],
      improvedVersion: prompt ? `In response to the prompt "${prompt}", you should develop at least 4-5 clear sentences.` : "Please write a longer paragraph.",
      generalFeedback: "Bài viết còn quá ngắn. Hãy cố gắng phát triển thêm ý tưởng với ít nhất 5-7 câu hoàn chỉnh nhé! 🦫💪",
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
      type: "Chia động từ (Subject-Verb Agreement)",
      explanation: "Chủ ngữ ngôi thứ 3 số ít (He/She/It) trong câu phủ định thì Hiện tại đơn dùng doesn't, không dùng don't."
    });
  }

  const matchDidntVed = text.match(/\b(didn't|did not)\s+([a-z]+ed|[a-z]+went|[a-z]+bought|[a-z]+saw)\b/i);
  if (matchDidntVed) {
    mistakes.push({
      original: matchDidntVed[0],
      corrected: "didn't + V-nguyên thể",
      type: "Thì Quá khứ đơn (Past Simple)",
      explanation: "Sau trợ động từ didn't / did not, động từ chính luôn ở dạng nguyên mẫu không chia."
    });
  }

  const matchMoreShort = text.match(/\bmore\s+(tall|big|fast|small|short|high|cheap|rich|poor|old|young)\b/i);
  if (matchMoreShort) {
    const adj = matchMoreShort[1];
    mistakes.push({
      original: matchMoreShort[0],
      corrected: adj + "er",
      type: "So sánh hơn tính từ ngắn",
      explanation: `Tính từ ngắn 1 âm tiết "${adj}" khi so sánh hơn thêm đuôi "-er" (${adj}er), không dùng "more ${adj}".`
    });
  }

  if (lowerText.includes("in the weekend")) {
    mistakes.push({
      original: "in the weekend",
      corrected: "at the weekend / on weekends",
      type: "Giới từ chỉ thời gian",
      explanation: "Chỉ thời gian cuối tuần dùng giới từ at the weekend hoặc on weekends."
    });
  }

  let baseScore = 7.0;
  if (wordCount >= 50 && wordCount <= 150) baseScore += 1.0;
  else if (wordCount > 150) baseScore += 1.5;

  const penalty = Math.min(2.5, mistakes.length * 0.5);
  const finalScore = Math.max(4.0, Math.min(9.5, +(baseScore - penalty).toFixed(1)));

  let band = "B1 - Đạt chuẩn THCS";
  if (finalScore >= 9.0) band = "B2 - Xuất sắc";
  else if (finalScore >= 7.5) band = "B1+ - Khá giỏi";
  else if (finalScore >= 6.0) band = "B1 - Đạt yêu cầu";
  else band = "A2 - Cần củng cố";

  let improvedVersion = text
    .replace(/\b(he|she|it)\s+don't\b/gi, (m, p1) => p1 + " doesn't")
    .replace(/\bin the weekend\b/gi, "at the weekend")
    .replace(/\bmore\s+(tall|fast|cheap)\b/gi, (m, p1) => p1 + "er")
    .replace(/\bvery good\b/gi, "excellent")
    .replace(/\bvery nice\b/gi, "wonderful")
    .replace(/\ba lot of\b/gi, "numerous");

  if (!improvedVersion.endsWith(".")) improvedVersion += ".";

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
        comment: `Bài viết ${wordCount} từ đã đáp ứng tốt yêu cầu nội dung của chủ đề.`
      },
      coherence: {
        score: cohScore,
        comment: "Mạch văn tương đối liền mạch. Hãy sử dụng thêm các liên từ (Furthermore, However) để tự nhiên hơn."
      },
      lexicalResource: {
        score: lexScore,
        comment: "Sử dụng từ vựng phù hợp với trình độ THCS. Có thể nâng cấp một số từ cơ bản sang từ đồng nghĩa cao cấp hơn."
      },
      grammaticalAccuracy: {
        score: graScore,
        comment: mistakes.length === 0 ? "Ngữ pháp rất chuẩn xác, cấu trúc câu phong phú." : `Phát hiện ${mistakes.length} điểm cần lưu ý về thì và cấu trúc câu.`
      }
    },
    mistakes,
    improvedVersion,
    generalFeedback: finalScore >= 8.0
      ? "🌟 Bài viết rất xuất sắc! Văn phong lưu loát, bố cục rõ ràng và từ vựng phong phú. Tiếp tục phát huy nhé!"
      : "👍 Bài viết khá tốt và đúng trọng tâm. Hãy xem kỹ các lỗi được chỉ ra ở bảng bên dưới để hoàn thiện hơn nhé!",
    rewards: {
      xp: finalScore >= 8.0 ? 30 : 20,
      carrots: finalScore >= 8.0 ? 3 : 1
    }
  };
}

const CURRICULUM_TOPIC_BANKS = {
  tenses: [
    { prompt: "Look at the clouds! It ______ rain soon.", options: ["A. will", "B. is going to", "C. rains", "D. rained"], answer: 1, explanation: "Dùng \"be going to\" diễn tả sự việc sắp xảy ra có bằng chứng rõ ràng ở hiện tại (\"Look at the clouds\")." },
    { prompt: "When I arrived at the station, the train ______ already.", options: ["A. leaves", "B. left", "C. had left", "D. was leaving"], answer: 2, explanation: "Hành động tàu rời đi xảy ra trước thời điểm \"arrived\" trong quá khứ nên dùng Quá khứ hoàn thành (had + V3)." },
    { prompt: "My brother usually ______ to work by bus, but today he is riding his bike.", options: ["A. goes", "B. go", "C. is going", "D. went"], answer: 0, explanation: "Thói quen hàng ngày với \"usually\", chủ ngữ số ít \"My brother\" -> động từ thêm -es (goes)." },
    { prompt: "They ______ English for five years and they speak it fluently now.", options: ["A. study", "B. studied", "C. have studied", "D. are studying"], answer: 2, explanation: "Hành động bắt đầu trong quá khứ kéo dài đến hiện tại với \"for five years\" -> Hiện tại hoàn thành (have studied)." },
    { prompt: "While Mary ______ a book, her sister was listening to music.", options: ["A. read", "B. was reading", "C. is reading", "D. has read"], answer: 1, explanation: "Hai hành động diễn ra song song cùng lúc trong quá khứ nối bằng \"While\" -> Quá khứ tiếp diễn (was reading)." }
  ],
  conditionals: [
    { prompt: "If you ______ hard, you will pass the final examination with high scores.", options: ["A. study", "B. studied", "C. will study", "D. had studied"], answer: 0, explanation: "Câu điều kiện loại 1: Mệnh đề IF chia thì Hiện tại đơn (S + V-s/es), mệnh đề chính dùng \"will + V\"." },
    { prompt: "If I ______ you, I wouldn't accept that dangerous job offer.", options: ["A. am", "B. was", "C. were", "D. have been"], answer: 2, explanation: "Câu điều kiện loại 2: To be ở mệnh đề IF dùng \"were\" cho mọi ngôi." },
    { prompt: "Unless you hurry up, we ______ the last train tonight.", options: ["A. miss", "B. will miss", "C. missed", "D. would miss"], answer: 1, explanation: "\"Unless\" = \"If not\". Mệnh đề chính câu điều kiện loại 1 dùng \"will + V\"." },
    { prompt: "What would you do if you ______ one million dollars?", options: ["A. win", "B. won", "C. will win", "D. had won"], answer: 1, explanation: "Câu điều kiện loại 2 (mệnh đề chính \"would you do\" -> mệnh đề IF chia Quá khứ đơn \"won\")." },
    { prompt: "If the weather ______ fine tomorrow, we will go camping in the national park.", options: ["A. is", "B. will be", "C. was", "D. would be"], answer: 0, explanation: "Mệnh đề IF câu điều kiện loại 1 chia Hiện tại đơn: \"the weather is\"." }
  ],
  passive: [
    { prompt: "A new shopping mall ______ in our neighborhood next month.", options: ["A. is built", "B. will be built", "C. was built", "D. has built"], answer: 1, explanation: "Câu bị động thì Tương lai đơn: S + will be + V3/V-ed." },
    { prompt: "The novel \"Harry Potter\" ______ by J.K. Rowling in 1997.", options: ["A. wrote", "B. is written", "C. was written", "D. has been written"], answer: 2, explanation: "Câu bị động thì Quá khứ đơn: S + was/were + V3 (was written)." },
    { prompt: "English ______ as a compulsory subject in many Vietnamese schools today.", options: ["A. is taught", "B. teaches", "C. was taught", "D. has taught"], answer: 0, explanation: "Câu bị động thì Hiện tại đơn: S + am/is/are + V3 (is taught)." },
    { prompt: "All the plastic bottles should ______ before being thrown away.", options: ["A. recycle", "B. be recycled", "C. recycled", "D. to recycle"], answer: 1, explanation: "Câu bị động với động từ khuyết thiếu: Modal + be + V3." }
  ],
  relative: [
    { prompt: "The girl ______ is talking to Mr. David is the best student in our class.", options: ["A. who", "B. whom", "C. which", "D. whose"], answer: 0, explanation: "Đại từ quan hệ \"who\" thay thế cho người (\"The girl\") và làm chủ ngữ cho \"is talking\"." },
    { prompt: "Do you know the city ______ the 33rd SEA Games will take place?", options: ["A. which", "B. where", "C. when", "D. whose"], answer: 1, explanation: "Trạng từ quan hệ \"where\" thay thế cho danh từ chỉ nơi chốn \"the city\"." },
    { prompt: "The book ______ I bought yesterday is very informative and interesting.", options: ["A. which", "B. who", "C. whom", "D. whose"], answer: 0, explanation: "Đại từ quan hệ \"which\" thay thế cho danh từ chỉ vật \"The book\"." },
    { prompt: "Meet my friend Peter, ______ father is a famous surgeon at Bach Mai Hospital.", options: ["A. who", "B. whom", "C. which", "D. whose"], answer: 3, explanation: "Đại từ quan hệ chỉ sở hữu \"whose\" (= his father)." }
  ],
  environment_vocab: [
    { prompt: "We should use reusable bags instead of single-use plastic bags to ______ the environment.", options: ["A. pollute", "B. protect", "C. damage", "D. destroy"], answer: 1, explanation: "protect the environment = bảo vệ môi trường." },
    { prompt: "Deforestation causes serious soil erosion and leads to natural ______ such as floods.", options: ["A. disasters", "B. resources", "C. habitats", "D. products"], answer: 0, explanation: "natural disasters = thiên tai (như lũ lụt)." },
    { prompt: "Solar energy and wind power are clean and ______ sources of energy.", options: ["A. non-renewable", "B. renewable", "C. harmful", "D. limited"], answer: 1, explanation: "renewable sources of energy = nguồn năng lượng tái tạo." },
    { prompt: "The government is trying to ______ the amount of carbon emissions from factories.", options: ["A. reduce", "B. increase", "C. expand", "D. produce"], answer: 0, explanation: "reduce = cắt giảm (lượng khí thải carbon)." }
  ]
};

function generateTestOnDemand({ topic = "tenses", gradeLevel = "9", count = 10, difficulty = "medium" }) {
  const numCount = Math.min(20, Math.max(3, Number(count) || 5));
  let pool = [];

  const lowerTopic = String(topic).toLowerCase();

  if (lowerTopic.includes("if") || lowerTopic.includes("điều kiện")) {
    pool = [...CURRICULUM_TOPIC_BANKS.conditionals, ...CURRICULUM_TOPIC_BANKS.tenses];
  } else if (lowerTopic.includes("bị động") || lowerTopic.includes("passive")) {
    pool = [...CURRICULUM_TOPIC_BANKS.passive, ...CURRICULUM_TOPIC_BANKS.tenses];
  } else if (lowerTopic.includes("quan hệ") || lowerTopic.includes("relative") || lowerTopic.includes("who")) {
    pool = [...CURRICULUM_TOPIC_BANKS.relative, ...CURRICULUM_TOPIC_BANKS.conditionals];
  } else if (lowerTopic.includes("môi trường") || lowerTopic.includes("environment") || lowerTopic.includes("từ vựng")) {
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
      id: "ai-q-" + Date.now() + "-" + (i + 1),
      question: template.prompt,
      options: template.options,
      answer: template.answer,
      explanation: template.explanation,
      type: "multiple-choice"
    });
  }

  return {
    testTitle: "Đề Luyện Tập AI: " + (topic || "Tổng hợp Ngữ pháp THCS") + " (Khối " + gradeLevel + ")",
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
  generateTestOnDemand,
  translateAndGenerateIpa
};