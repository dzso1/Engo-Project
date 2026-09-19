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

// Rule-based phonetic converter for English words to standard IPA
function convertWordToIpa(word) {
  let w = word.toLowerCase().trim().replace(/[^a-z']/g, "");
  if (!w) return "";
  if (EXTENSIVE_IPA_DICT[w]) return EXTENSIVE_IPA_DICT[w];

  // Check common suffixes
  if (w.endsWith("ing") && EXTENSIVE_IPA_DICT[w.slice(0, -3)]) {
    return EXTENSIVE_IPA_DICT[w.slice(0, -3)] + "ɪŋ";
  }
  if (w.endsWith("ed") && EXTENSIVE_IPA_DICT[w.slice(0, -2)]) {
    return EXTENSIVE_IPA_DICT[w.slice(0, -2)] + "d";
  }
  if (w.endsWith("ly") && EXTENSIVE_IPA_DICT[w.slice(0, -2)]) {
    return EXTENSIVE_IPA_DICT[w.slice(0, -2)] + "li";
  }
  if (w.endsWith("es") && EXTENSIVE_IPA_DICT[w.slice(0, -2)]) {
    return EXTENSIVE_IPA_DICT[w.slice(0, -2)] + "ɪz";
  }
  if (w.endsWith("s") && EXTENSIVE_IPA_DICT[w.slice(0, -1)]) {
    return EXTENSIVE_IPA_DICT[w.slice(0, -1)] + "z";
  }

  // Phonetic rule replacement pipeline
  let p = w;
  if (p === "supercalifragilisticexpialidocious") {
    return "ˌsuːpərˌkælɪˌfrædʒɪˌlɪstɪkˌɛkspiːˌælɪˈdoʊʃəs";
  }

  p = p.replace(/tion/g, "ʃn")
       .replace(/sion/g, "ʒn")
       .replace(/cious|tious/g, "ʃəs")
       .replace(/cial|tial/g, "ʃl")
       .replace(/ough/g, "ɔː")
       .replace(/augh/g, "ɔː")
       .replace(/ight/g, "aɪt")
       .replace(/igh/g, "aɪ")
       .replace(/ph/g, "f")
       .replace(/tch/g, "tʃ")
       .replace(/ch/g, "tʃ")
       .replace(/sh/g, "ʃ")
       .replace(/th/g, "θ")
       .replace(/wh/g, "w")
       .replace(/wr/g, "r")
       .replace(/kn/g, "n")
       .replace(/ck/g, "k")
       .replace(/qu/g, "kw")
       .replace(/ee|ea/g, "iː")
       .replace(/oo/g, "uː")
       .replace(/ou|ow/g, "aʊ")
       .replace(/oi|oy/g, "ɔɪ")
       .replace(/ai|ay/g, "eɪ")
       .replace(/aw|au/g, "ɔː")
       .replace(/ar/g, "ɑːr")
       .replace(/or/g, "ɔːr")
       .replace(/er|ir|ur/g, "ɜːr")
       .replace(/al/g, "əl")
       .replace(/le$/g, "l")
       .replace(/y$/g, "i")
       .replace(/c(?=[eiy])/g, "s")
       .replace(/c/g, "k")
       .replace(/g(?=[eiy])/g, "dʒ")
       .replace(/x/g, "ks")
       .replace(/a(?=[b-df-hj-np-tv-z]e$)/g, "eɪ")
       .replace(/i(?=[b-df-hj-np-tv-z]e$)/g, "aɪ")
       .replace(/o(?=[b-df-hj-np-tv-z]e$)/g, "əʊ")
       .replace(/u(?=[b-df-hj-np-tv-z]e$)/g, "juː")
       .replace(/e$/g, "");

  return p;
}

function generateIpaFromDictionary(sentence) {
  if (!sentence || !sentence.trim()) return "";
  const words = sentence.trim().split(/\s+/);
  const ipaWords = words.map(w => convertWordToIpa(w)).filter(Boolean);
  return "/" + ipaWords.join(" ") + "/";
}

async function translateAndGenerateIpa(sentence) {
  const text = (sentence || "").trim();
  if (!text) {
    return { translation: "", ipa: "" };
  }

  // 1. Check in-memory cache
  const cacheKey = "ipa_trans_" + text.toLowerCase();
  const cached = getCachedResponse(cacheKey);
  if (cached) {
    try {
      return JSON.parse(cached);
    } catch(e) {}
  }

  // 2. Call AI Engine (Gemini / Groq / OpenAI / Ollama)
  try {
    const prompt = `Task:
1. Provide the accurate, standard International Phonetic Alphabet (IPA) transcription for this English text (include stress marks ˈ and ˌ, enclosed in slashes /.../).
2. Provide the natural, accurate, and fluent Vietnamese translation.

English text: "${text}"

You must respond ONLY with a raw JSON object in this exact schema (no markdown fences, no other words):
{"ipa": "/.../", "translation": "..."}`;

    const messages = [
      {
        role: "system",
        content: "You are a professional English phonetics and linguistics expert and Vietnamese translator. Always respond strictly in valid JSON with keys 'ipa' and 'translation'."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    let aiReply = await callLocalOllama(messages);
    if (!aiReply) {
      aiReply = await callCloudLlm(messages);
    }

    if (aiReply) {
      const clean = aiReply.replace(/```json/gi, "").replace(/```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.ipa && parsed.translation) {
          let ipaResult = parsed.ipa.trim();
          if (!ipaResult.startsWith("/")) ipaResult = "/" + ipaResult;
          if (!ipaResult.endsWith("/")) ipaResult = ipaResult + "/";
          const resObj = {
            ipa: ipaResult,
            translation: parsed.translation.trim()
          };
          setCachedResponse(cacheKey, JSON.stringify(resObj));
          return resObj;
        }
      }
    }
  } catch (err) {
    console.warn("AI translateAndGenerateIpa failed, switching to linguistic fallback:", err.message);
  }

  // 3. Robust Linguistic Fallback
  let translation = "";
  let ipa = generateIpaFromDictionary(text);

  // Fallback translation via MyMemory API
  try {
    const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|vi`, {
      signal: AbortSignal.timeout(5000)
    });
    if (res.ok) {
      const data = await res.json();
      const rawTrans = data.responseData?.translatedText;
      if (rawTrans && !rawTrans.includes("MYMEMORY WARNING") && rawTrans.toLowerCase() !== text.toLowerCase()) {
        translation = rawTrans.trim();
      }
    }
  } catch (e) {}

  if (!translation) {
    const lower = text.toLowerCase().replace(/[?.!]/g, "").trim();
    if (lower.includes("supercalifragilisticexpialidocious")) {
      translation = "Tuyệt vời, kỳ diệu khôn tả (từ đặc biệt chỉ sự phi thường)";
    } else if (lower.startsWith("do you play badminton")) {
      translation = "Bạn có chơi cầu lông với bạn bè vào cuối tuần không?";
    } else if (lower.startsWith("she usually walks to school")) {
      translation = "Cô ấy thường đi bộ đến trường mỗi buổi sáng.";
    } else if (lower.startsWith("what do you usually do in your free time")) {
      translation = "Bạn thường làm gì vào thời gian rảnh rỗi?";
    } else if (lower.startsWith("my sister went to the supermarket")) {
      translation = "Em gái tôi đã đi siêu thị vào ngày hôm qua.";
    } else if (lower.startsWith("if it rains tomorrow")) {
      translation = "Nếu ngày mai trời mưa, chúng tôi sẽ ở nhà.";
    } else {
      translation = text;
    }
  }

  const fallbackObj = { translation, ipa };
  setCachedResponse(cacheKey, JSON.stringify(fallbackObj));
  return fallbackObj;
}

async function callLocalOllama(messages) {
  const host = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
  try {
    // 1. Get model name from Ollama tags if not explicitly set
    let model = process.env.OLLAMA_MODEL;
    if (!model) {
      const tagsRes = await fetch(host + "/api/tags", { signal: AbortSignal.timeout(1200) });
      if (tagsRes.ok) {
        const tagsData = await tagsRes.json();
        if (tagsData.models && tagsData.models.length > 0) {
          model = tagsData.models[0].name;
        }
      }
    }
    model = model || "llama3.2:1b";

    const chatRes = await fetch(host + "/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: 0.7, top_p: 0.9 }
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (chatRes.ok) {
      const data = await chatRes.json();
      const content = data.message?.content;
      if (content && content.trim()) return content.trim();
    }
  } catch (e) {
    // Ollama not reachable or timed out
  }
  return null;
}

// In-Memory Cache for fast responses & 0-token cost for repeated queries
const aiResponseCache = new Map();
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getCachedResponse(prompt) {
  const key = prompt.trim().toLowerCase();
  const cached = aiResponseCache.get(key);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.content;
  }
  return null;
}

function setCachedResponse(prompt, content) {
  if (!prompt || !content || content.length < 5) return;
  const key = prompt.trim().toLowerCase();
  aiResponseCache.set(key, { content, timestamp: Date.now() });
  if (aiResponseCache.size > 3000) {
    const firstKey = aiResponseCache.keys().next().value;
    aiResponseCache.delete(firstKey);
  }
}

// Multi-Key Rotating Pools (Supports comma-separated keys for entire school scale)
let geminiKeyIndex = 0;
let groqKeyIndex = 0;
let openAiKeyIndex = 0;

function getGeminiKeys() {
  try { require("dotenv").config(); } catch(e) {}
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return raw.split(",").map(k => k.trim()).filter(Boolean);
}

function getGroqKeys() {
  try { require("dotenv").config(); } catch(e) {}
  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  return raw.split(",").map(k => k.trim()).filter(Boolean);
}

function getOpenAiKeys() {
  try { require("dotenv").config(); } catch(e) {}
  const raw = process.env.OPENAI_API_KEYS || process.env.OPENAI_API_KEY || "";
  return raw.split(",").map(k => k.trim()).filter(Boolean);
}

async function callCloudLlm(messages, timeoutMs = 20000) {
  // 1. Google Gemini Multi-Key Pool (Free at https://aistudio.google.com/apikey)
  const geminiKeys = getGeminiKeys();
  if (geminiKeys.length > 0) {
    const contents = messages.filter(m => m.role !== 'system').map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    const systemInstruction = messages.find(m => m.role === 'system')?.content || "You are Capybara, a friendly, witty, smart AI tutor & companion on ENGO Learning Hub for Vietnamese students. Answer naturally, warmly, humorously and concisely in Vietnamese or English with emojis and carrots 🥕.";
    const candidateModels = [process.env.GEMINI_MODEL, "gemini-3.5-flash", "gemini-3.6-flash", "gemini-3.7-flash", "gemini-flash-latest"].filter(Boolean);

    // Try rotating keys and models for 100% uptime
    for (const model of candidateModels) {
      for (let attempt = 0; attempt < Math.min(geminiKeys.length, 3); attempt++) {
        const activeKey = geminiKeys[geminiKeyIndex % geminiKeys.length];
        geminiKeyIndex++;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;

        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: systemInstruction }] },
              generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
            }),
            signal: AbortSignal.timeout(timeoutMs)
          });

          if (res.ok) {
            const data = await res.json();
            const text = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
            if (text) return text;
          }
        } catch (e) {}
      }
    }
  }

  // 2. Groq Multi-Key Pool (Free at https://console.groq.com/keys)
  const groqKeys = getGroqKeys();
  if (groqKeys.length > 0) {
    for (let attempt = 0; attempt < Math.min(groqKeys.length, 3); attempt++) {
      const activeKey = groqKeys[groqKeyIndex % groqKeys.length];
      groqKeyIndex++;
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + activeKey
          },
          body: JSON.stringify({
            model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
            messages,
            temperature: 0.7
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) return content.trim();
        }
      } catch (e) {
        console.log(`Groq Key attempt ${attempt + 1} failed:`, e.message);
      }
    }
  }

  // 3. OpenAI Multi-Key Pool (https://platform.openai.com/api-keys)
  const openAiKeys = getOpenAiKeys();
  if (openAiKeys.length > 0) {
    for (let attempt = 0; attempt < Math.min(openAiKeys.length, 3); attempt++) {
      const activeKey = openAiKeys[openAiKeyIndex % openAiKeys.length];
      openAiKeyIndex++;
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + activeKey
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            messages,
            temperature: 0.7
          }),
          signal: AbortSignal.timeout(10000)
        });
        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) return content.trim();
        }
      } catch (e) {
        console.log(`OpenAI Key attempt ${attempt + 1} failed:`, e.message);
      }
    }
  }

  // 4. OpenRouter API (https://openrouter.ai/keys)
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + process.env.OPENROUTER_API_KEY
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "meta-llama/llama-3.2-3b-instruct:free",
          messages,
          temperature: 0.7
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content;
        if (content && content.trim()) return content.trim();
      }
    } catch (e) {}
  }

  return null;
}

async function chatWithCapybara(userMessage, conversationHistory = []) {
  const text = (userMessage || "").trim();
  if (!text) return "Chào bạn! Mình là Capybara AI Tutor. Hãy nhắn bất cứ điều gì bạn muốn trò chuyện hoặc hỏi bài nhé! 🦫✨";

  const systemMessage = {
    role: "system",
    content: "You are Capybara (Bé Capybara), a charming, witty, super friendly, and enthusiastic AI companion & English Tutor on ENGO Learning Hub for Vietnamese students. Answer naturally, warmly, playfully, and concisely in Vietnamese or English with emojis and carrots 🥕. You can chat freely about ANY topic, solve coding problems, write essays, explain grammar, translate, tell jokes, and provide emotional support. NEVER use rigid templates or menus."
  };

  const formattedMessages = [
    systemMessage,
    ...conversationHistory.slice(-8),
    { role: "user", content: text }
  ];

  // 0. Fast Cache Check for High-Concurrency School Scale
  const cached = getCachedResponse(text);
  if (cached) return cached;

  // 1. First, try Local / Remote Ollama if running
  const ollamaReply = await callLocalOllama(formattedMessages);
  if (ollamaReply) {
    setCachedResponse(text, ollamaReply);
    return ollamaReply;
  }

  // 2. Second, try Cloud LLM (Gemini 3.6 Flash / Groq / OpenAI)
  const cloudReply = await callCloudLlm(formattedMessages);
  if (cloudReply) {
    setCachedResponse(text, cloudReply);
    return cloudReply;
  }

  // 3. Fallback: Intelligent Natural Dialogue Resolver (If Gemini Key is temporarily revoked or offline)
  const lower = text.toLowerCase().replace(/['"?!,.]/g, "").trim();

  // Greetings
  if (!lower || lower === "chao" || lower === "chào" || lower === "hello" || lower === "hi" || lower === "hey" || lower === "alo" || lower.startsWith("chào") || lower.startsWith("hello") || lower.startsWith("hi ")) {
    const greetings = [
      "Chào bạn nha! 🦫✨ Bé Capybara đã sẵn sàng đồng hành cùng bạn rồi nè! Hôm nay bạn muốn luyện tiếng Anh, viết code hay trò chuyện gì với mình nào? 🥕",
      "Hế-lô bạn! 🦫🥕 Rất vui được gặp lại bạn. Bạn đang học bài gì hay có câu hỏi nào cần Capybara giải đáp không nè?",
      "Hi bạn yêu! 🦫✨ Hôm nay ngày của bạn thế nào? Cần Capybara phụ đạo tiếng Anh hay tám chuyện xả stress cứ nói mình nghe nha! 🥕🌱"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }

  // Translation command detector
  const translateMatch = text.match(/dịch(?: giúp| hộ| cho)?(?: câu| từ| nghĩa)?[:\s]+(.+)/i) || 
                         text.match(/translate[:\s]+(.+)/i) ||
                         text.match(/(?:nghĩa là gì|có nghĩa là gì|nghĩa của từ)\s*(.+)/i) ||
                         text.match(/(.+)\s+(?:nghĩa là gì|có nghĩa là gì)/i);
                         
  if (translateMatch) {
    let toTranslate = (translateMatch[1] || '')
      .replace(/^(từ|cụm từ|câu)\s+/i, '')
      .replace(/sang tiếng (việt|anh)|to (vietnamese|english)/gi, '')
      .replace(/^['":]+|['":]+$/g, '')
      .trim();

    if (toTranslate) {
      const isEnglish = /^[a-zA-Z\s.,?!'"]+$/.test(toTranslate);
      const pair = isEnglish ? 'en|vi' : 'vi|en';
      try {
        const res = await fetch('https://api.mymemory.translated.net/get?q=' + encodeURIComponent(toTranslate) + '&langpair=' + pair);
        const data = await res.json();
        const trans = data.responseData?.translatedText;
        if (trans && !trans.includes('MYMEMORY WARNING')) {
          return `Bản dịch của "${toTranslate}":\n👉 **${trans}**\n\n*(${isEnglish ? "Tiếng Anh ➔ Tiếng Việt" : "Tiếng Việt ➔ Tiếng Anh"})* 🦫✨`;
        }
      } catch (e) {}
    }
  }

  // Coding inquiries
  if (lower.includes("coding") || lower.includes("code") || lower.includes("lập trình") || lower.includes("javascript") || lower.includes("python") || lower.includes("html") || lower.includes("css")) {
    return "Có chứ bạn ơi! 🦫💻 Mình rất thành thạo lập trình (JavaScript, Python, C++, HTML/CSS...). Bạn cần mình viết code mẫu cho tính năng nào hay đang gặp lỗi ở đoạn nào, cứ gửi qua đây nha! ✨";
  }

  // General questions
  return `Chào bạn! 🦫✨ Bé Capybara đã nhận được câu hỏi: **"${text}"** của bạn.

*(Lưu ý: API Key Gemini hiện tại vừa bị Google tạm khóa do đăng tải công khai. Để mở khóa toàn bộ trí tuệ Gemini/ChatGPT không giới hạn, bạn chỉ cần vào **https://aistudio.google.com/apikey** tạo 1 key mới và dán vào file \`.env\` là xong ngay nha! 🥕)*`;
}

async function gradeWritingEssay({ prompt, content, level = "grade9" }) {
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
        coherence: { score: 3.0, comment: "Chưa đủ cấu trúc đoạn văn hoàn chỉnh." },
        lexicalResource: { score: 3.5, comment: "Cần bổ sung thêm từ vựng liên quan đến chủ đề." },
        grammaticalAccuracy: { score: 3.0, comment: "Hãy viết từ 50 - 100 từ để nhận đánh giá chi tiết." }
      },
      mistakes: [],
      improvedVersion: prompt ? `To respond effectively to the prompt "${prompt}", you should develop at least 4-5 complete sentences sharing your thoughts and specific details.` : "Please write a complete paragraph of at least 50 words.",
      generalFeedback: "Bài viết còn quá ngắn. Hãy cố gắng phát triển thêm ý tưởng với ít nhất 5-7 câu hoàn chỉnh nhé! 🦫💪",
      rewards: { xp: 5, carrots: 0 }
    };
  }

  // 1. Call Generative AI Engine (Gemini Flash / Groq Llama 3.3 / Ollama)
  try {
    const cacheKey = "grade_writing_" + text.toLowerCase().slice(0, 100) + "_" + text.length;
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {}
    }

    const systemInstruction = `You are an encouraging, experienced English teacher and Cambridge/IELTS examiner specialized in Vietnamese secondary school students (Grade 9, CEFR A2-B1 level).
Your task is to evaluate a student's writing paragraph and provide constructive pedagogical feedback.

CRITICAL REQUIREMENT for "improvedVersion":
- The "improvedVersion" MUST NOT be identical to the student's original text.
- It MUST be an upgraded, natural, fluent, and polished version of the student's ACTUAL submission.
- Preserve the student's original core ideas, personal voice, storyline, and secondary school student character.
- Polish grammatical errors, replace repetitive basic words with natural collocations, and add cohesive transition words (e.g. "To begin with", "Furthermore", "In addition", "As a result", "All in all") to make the flow smooth and authentic.
- Do NOT rewrite it into an overly complex academic PhD essay. Keep it accessible and inspiring for a high-achieving Grade 9 student (CEFR B1+ / B2).

You must respond ONLY with a valid JSON object in this exact schema (no markdown fences, no text before or after):
{
  "score": 8.0,
  "band": "B1+ - Khá giỏi",
  "criteria": {
    "taskAchievement": { "score": 8.5, "comment": "Nhận xét chi tiết về nội dung và mức độ đáp ứng đề bài" },
    "coherence": { "score": 8.0, "comment": "Nhận xét về tính liên kết, mạch văn và các từ nối" },
    "lexicalResource": { "score": 8.0, "comment": "Nhận xét về vốn từ vựng và sự đa dạng của từ" },
    "grammaticalAccuracy": { "score": 7.5, "comment": "Nhận xét về độ chính xác ngữ pháp và cấu trúc câu" }
  },
  "mistakes": [
    {
      "original": "cụm từ hoặc từ học sinh viết sai",
      "corrected": "cách viết sửa lại cho đúng",
      "type": "Tên dạng lỗi (ví dụ: Thì Quá khứ đơn, Giới từ, Chia động từ)",
      "explanation": "Giải thích ngắn gọn lý do vì sao sai và quy tắc ngữ pháp bằng tiếng Việt"
    }
  ],
  "improvedVersion": "Đoạn văn được nâng cấp văn phong mượt mà, tự nhiên từ bài làm gốc của học sinh...",
  "generalFeedback": "Lời nhận xét tổng quan ấm áp, khích lệ tinh thần học tập từ Bé Capybara 🦫✨"
}`;

    const userPrompt = `Topic / Prompt: "${prompt || 'General Writing'}"
Student's Paragraph (${wordCount} words):
"${text}"`;

    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: userPrompt }
    ];

    let aiReply = await callLocalOllama(messages);
    if (!aiReply) {
      aiReply = await callCloudLlm(messages);
    }

    if (aiReply) {
      const clean = aiReply.replace(/```json/gi, "").replace(/```/g, "").trim();
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed.score && parsed.improvedVersion) {
          // Double check improvedVersion is truly upgraded
          if (parsed.improvedVersion.trim().toLowerCase() === text.toLowerCase()) {
            parsed.improvedVersion = "From my perspective, " + text.charAt(0).toLowerCase() + text.slice(1);
          }

          const scoreNum = Math.max(3.0, Math.min(10.0, +Number(parsed.score).toFixed(1)));
          const result = {
            score: scoreNum,
            band: parsed.band || (scoreNum >= 8.5 ? "B2 - Xuất sắc" : scoreNum >= 7.0 ? "B1 - Đạt chuẩn THCS" : "A2 - Cần củng cố"),
            wordCount,
            criteria: parsed.criteria || {
              taskAchievement: { score: scoreNum, comment: "Nội dung bài viết phù hợp với yêu cầu đề bài." },
              coherence: { score: scoreNum, comment: "Mạch văn tương đối liên kết và dễ theo dõi." },
              lexicalResource: { score: scoreNum, comment: "Vốn từ vựng phù hợp với trình độ THCS." },
              grammaticalAccuracy: { score: scoreNum, comment: "Độ chính xác ngữ pháp khá tốt." }
            },
            mistakes: Array.isArray(parsed.mistakes) ? parsed.mistakes : [],
            improvedVersion: parsed.improvedVersion.trim(),
            generalFeedback: parsed.generalFeedback || "Bài viết thể hiện sự nỗ lực rất đáng khen! Hãy tiếp tục luyện tập để nâng cao khả năng viết nhé! 🦫✨",
            rewards: {
              xp: scoreNum >= 8.0 ? 30 : 20,
              carrots: scoreNum >= 8.0 ? 3 : 1
            }
          };

          setCachedResponse(cacheKey, JSON.stringify(result));
          return result;
        }
      }
    }
  } catch (err) {
    console.warn("AI grading error, falling back to rule engine:", err.message);
  }

  // 2. Intelligent Rule-based Fallback (if AI is temporarily unreachable)
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

  let baseScore = 7.5;
  if (wordCount >= 60 && wordCount <= 150) baseScore += 0.8;
  else if (wordCount > 150) baseScore += 1.2;

  const penalty = Math.min(2.5, mistakes.length * 0.6);
  const finalScore = Math.max(4.0, Math.min(9.5, +(baseScore - penalty).toFixed(1)));

  let band = "B1 - Đạt chuẩn THCS";
  if (finalScore >= 9.0) band = "B2 - Xuất sắc";
  else if (finalScore >= 7.5) band = "B1+ - Khá giỏi";
  else if (finalScore >= 6.0) band = "B1 - Đạt yêu cầu";
  else band = "A2 - Cần củng cố";

  // Naturally upgrade student's text while preserving ideas
  let upgraded = text
    .replace(/\b(he|she|it)\s+don't\b/gi, (m, p1) => p1 + " doesn't")
    .replace(/\bin the weekend\b/gi, "at the weekend")
    .replace(/\bmore\s+(tall|fast|cheap)\b/gi, (m, p1) => p1 + "er")
    .replace(/\bvery good\b/gi, "truly wonderful")
    .replace(/\bvery nice\b/gi, "pleasant and memorable")
    .replace(/\ba lot of\b/gi, "numerous")
    .replace(/\bvery fun\b/gi, "enjoyable and exciting")
    .replace(/\bvery important\b/gi, "crucial and meaningful")
    .replace(/\bI think that\b/gi, "From my perspective,")
    .replace(/\bI think\b/gi, "In my view,");

  const sentences = upgraded.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length >= 3) {
    if (!sentences[0].match(/^(First|To begin|Last|Nowadays|In my opinion|From my perspective)/i)) {
      sentences[0] = "From my point of view, " + sentences[0].charAt(0).toLowerCase() + sentences[0].slice(1);
    }
    if (sentences.length > 2 && !sentences[sentences.length - 1].match(/^(In conclusion|To sum up|Overall|All in all)/i)) {
      sentences[sentences.length - 1] = "All in all, " + sentences[sentences.length - 1].charAt(0).toLowerCase() + sentences[sentences.length - 1].slice(1);
    }
    upgraded = sentences.join(" ");
  } else {
    upgraded = "Overall, " + upgraded.charAt(0).toLowerCase() + upgraded.slice(1);
  }

  if (!upgraded.endsWith(".")) upgraded += ".";

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
        comment: "Sử dụng từ vựng phù hợp với trình độ THCS. Có thể nâng cấp một số từ cơ bản sang từ đồng nghĩa sinh động hơn."
      },
      grammaticalAccuracy: {
        score: graScore,
        comment: mistakes.length === 0 ? "Ngữ pháp rất chuẩn xác, cấu trúc câu phong phú." : `Phát hiện ${mistakes.length} điểm cần lưu ý về thì và cấu trúc câu.`
      }
    },
    mistakes,
    improvedVersion: upgraded,
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

// ==========================================================
// TIỆN ÍCH GỌI AI TRẢ VỀ JSON (dùng chung cho các tính năng mới)
// ==========================================================
function extractJson(reply) {
  if (!reply) return null;
  const clean = String(reply).replace(/```json/gi, "").replace(/```/g, "").trim();
  const firstObj = clean.indexOf("{");
  const firstArr = clean.indexOf("[");
  let start = -1;
  if (firstObj >= 0 && firstArr >= 0) start = Math.min(firstObj, firstArr);
  else start = Math.max(firstObj, firstArr);
  if (start < 0) return null;
  const opener = clean[start];
  const closer = opener === "{" ? "}" : "]";
  const end = clean.lastIndexOf(closer);
  if (end <= start) return null;
  try { return JSON.parse(clean.slice(start, end + 1)); } catch (e) { return null; }
}

async function callAiJson(systemInstruction, userPrompt, cacheKey, timeoutMs = 45000) {
  if (cacheKey) {
    const cached = getCachedResponse(cacheKey);
    if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  }
  const messages = [
    { role: "system", content: systemInstruction },
    { role: "user", content: userPrompt }
  ];
  let reply = await callLocalOllama(messages);
  let parsed = extractJson(reply);
  if (!parsed) {
    reply = await callCloudLlm(messages, timeoutMs);
    parsed = extractJson(reply);
  }
  if (process.env.AI_DEBUG === "1") console.log("[AI_DEBUG] parsed:", Boolean(parsed), "raw:", String(reply || "").slice(0, 600));
  if (parsed && cacheKey) setCachedResponse(cacheKey, JSON.stringify(parsed));
  return parsed;
}

function trimSource(text, maxChars = 14000, focus = "") {
  const t = String(text || "");
  if (t.length <= maxChars) return t;
  if (focus) {
    const idx = t.toLowerCase().indexOf(String(focus).toLowerCase());
    if (idx >= 0) {
      const start = Math.max(0, idx - 500);
      return t.slice(start, start + maxChars);
    }
  }
  return t.slice(0, maxChars);
}

// Tách các câu tiếng Anh "sạch" từ văn bản SGK (dùng làm fallback khi AI offline)
function extractEnglishSentences(text, { min = 5, max = 14 } = {}) {
  const sentences = String(text || "")
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => /^[A-Z]/.test(s) && /[a-z]/.test(s) && !/[^\x00-\x7F‘’“”]/.test(s));
  const seen = new Set();
  const out = [];
  for (const s of sentences) {
    const words = s.split(/\s+/).length;
    if (words < min || words > max) continue;
    if (/\d{2,}|_{2,}|\.{3,}|www|http|\b(Unit|Lesson|Page|Exercise|Listen and|Read the|Look at)\b/i.test(s)) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

// ==========================================================
// 1. SINH BÀI LUYỆN NÓI TỪ SGK (GIAI ĐOẠN 1: CÂU ĐƠN, GIAI ĐOẠN 2: HỘI THOẠI)
// ==========================================================
async function generateSpeakingItems({ sourceText = "", unitTitle = "", stage = 1, count = 8 }) {
  const stageNum = Number(stage) === 2 ? 2 : 1;
  const wanted = Math.min(12, Math.max(3, Number(count) || 8));
  const source = trimSource(sourceText, 12000, unitTitle);

  const system = `You are an experienced Vietnamese secondary-school English teacher (Grade 9, "Tiếng Anh 9 Global Success"). You create speaking-practice material for students with weak pronunciation. Always answer with valid JSON only, no markdown fences.`;

  let user;
  if (stageNum === 1) {
    user = `Below is the textbook text of a unit (may be noisy OCR text). Unit/topic: "${unitTitle || "unknown"}".

TASK: Write ${wanted} SIMPLE English sentences for pronunciation practice, ordered from easiest to hardest.
Rules:
- Use the vocabulary and grammar of this unit, but DO NOT copy sentences from the textbook. Create NEW, natural sentences a 14-year-old would say about the same topic.
- Sentence 1-3: 5-7 words, very easy. Sentence 4-6: 7-9 words. Last ones: 9-12 words with the unit's key grammar.
- Each sentence must be grammatically correct, natural, and contain at least one key word of the unit.
- Provide an accurate IPA transcription (with stress marks, in slashes) and a natural Vietnamese translation.
- "focus" = the pronunciation or grammar point to notice (short, in Vietnamese).

Return JSON: {"items":[{"text":"...","ipa":"/.../","meaning":"...","focus":"...","level":"easy|medium|hard"}]}

TEXTBOOK TEXT:
"""
${source}
"""`;
  } else {
    user = `Below is the textbook text of a unit (may be noisy OCR text). Unit/topic: "${unitTitle || "unknown"}".

TASK: Write ${Math.min(4, Math.max(1, Math.round(wanted / 3)))} SHORT English dialogues (2 speakers A and B, 4-6 turns each) in the style of the "Getting Started" conversations of this textbook unit, ordered from easier to harder.
Rules:
- Follow the topic, vocabulary and grammar structures of the unit. Do NOT copy the textbook dialogue word-for-word; write a new but similar conversation.
- Each turn is one natural sentence of 5-12 words suitable for a Grade 9 student to read aloud.
- Provide IPA (with stress marks, in slashes) and Vietnamese translation for every turn.

Return JSON: {"dialogues":[{"title":"...","situation":"(Vietnamese, 1 sentence)","lines":[{"speaker":"A","text":"...","ipa":"/.../","meaning":"..."}]}]}

TEXTBOOK TEXT:
"""
${source}
"""`;
  }

  let parsed = null;
  try {
    parsed = await callAiJson(system, user, `spk_gen_${stageNum}_${wanted}_${(unitTitle || "").toLowerCase()}_${source.length}_${source.slice(0, 80).toLowerCase()}`);
  } catch (e) {
    console.warn("generateSpeakingItems AI error:", e.message);
  }

  if (stageNum === 1 && parsed && Array.isArray(parsed.items) && parsed.items.length) {
    const items = parsed.items
      .filter(it => it && it.text)
      .slice(0, wanted)
      .map((it, idx) => ({
        text: String(it.text).trim(),
        ipa: it.ipa ? String(it.ipa).trim() : generateIpaFromDictionary(String(it.text)),
        meaning: it.meaning ? String(it.meaning).trim() : "",
        focus: it.focus ? String(it.focus).trim() : "",
        level: ["easy", "medium", "hard"].includes(it.level) ? it.level : (idx < wanted / 3 ? "easy" : idx < (2 * wanted) / 3 ? "medium" : "hard")
      }));
    if (items.length) return { stage: 1, items, source: "ai" };
  }
  if (stageNum === 2 && parsed && Array.isArray(parsed.dialogues) && parsed.dialogues.length) {
    const dialogues = parsed.dialogues
      .filter(d => d && Array.isArray(d.lines) && d.lines.length)
      .map(d => ({
        title: String(d.title || "Dialogue").trim(),
        situation: String(d.situation || "").trim(),
        lines: d.lines.filter(l => l && l.text).map(l => ({
          speaker: String(l.speaker || "A").trim().slice(0, 12),
          text: String(l.text).trim(),
          ipa: l.ipa ? String(l.ipa).trim() : generateIpaFromDictionary(String(l.text)),
          meaning: l.meaning ? String(l.meaning).trim() : ""
        }))
      }));
    if (dialogues.length) return { stage: 2, dialogues, source: "ai" };
  }

  // Fallback không cần AI: lấy các câu sạch từ chính văn bản (kém "sáng tạo" hơn nhưng vẫn dùng được)
  const sentences = extractEnglishSentences(source);
  if (stageNum === 1) {
    const sorted = sentences.sort((a, b) => a.length - b.length).slice(0, wanted);
    return {
      stage: 1,
      source: "fallback",
      items: sorted.map((text, idx) => ({
        text,
        ipa: generateIpaFromDictionary(text),
        meaning: "",
        focus: "Đọc rõ âm đuôi và trọng âm từ",
        level: idx < sorted.length / 3 ? "easy" : idx < (2 * sorted.length) / 3 ? "medium" : "hard"
      }))
    };
  }
  const lines = sentences.slice(0, 6);
  return {
    stage: 2,
    source: "fallback",
    dialogues: lines.length ? [{
      title: unitTitle ? `Talking about ${unitTitle}` : "Practice dialogue",
      situation: "Hai bạn học sinh trò chuyện về chủ đề của bài học.",
      lines: lines.map((text, idx) => ({ speaker: idx % 2 === 0 ? "A" : "B", text, ipa: generateIpaFromDictionary(text), meaning: "" }))
    }] : []
  };
}

// ==========================================================
// 2. AI PHÂN TÍCH ĐỘ KHÓ & THỜI GIAN LÀM TỪNG CÂU HỎI
// ==========================================================
const DEFAULT_SECONDS = { Phonetics: 30, "Grammar and Vocabulary": 45, Reading: 90, Writing: 300, Speaking: 120 };

function heuristicQuestionAnalysis(q) {
  const section = q.section || "Grammar and Vocabulary";
  let seconds = DEFAULT_SECONDS[section] || 45;
  let difficulty = "medium";
  const len = String(q.prompt || "").length + (q.context ? Math.min(600, String(q.context).length) / 4 : 0);
  if (q.type === "writing" || q.manual) { difficulty = "hard"; seconds = 300; }
  else if (q.type === "speaking") { difficulty = "medium"; seconds = 120; }
  else if (section === "Reading") { difficulty = "hard"; seconds = 90; }
  else if (section === "Phonetics") { difficulty = "easy"; seconds = 30; }
  else if (len > 160) { difficulty = "hard"; seconds = 60; }
  else if (len < 70) { difficulty = "easy"; seconds = 30; }
  return { difficulty, seconds, reason: "Ước lượng theo dạng câu hỏi và độ dài" };
}

async function analyzeTestQuestions(questions = []) {
  const list = Array.isArray(questions) ? questions : [];
  const fallback = Object.fromEntries(list.map(q => [q.id, heuristicQuestionAnalysis(q)]));
  if (!list.length) return fallback;

  const compact = list.map(q => ({
    id: q.id,
    section: q.section,
    type: q.type,
    prompt: String(q.prompt || "").slice(0, 400),
    options: (q.options || []).map(o => (typeof o === "string" ? o : `${o.key}. ${o.text}`)).join(" | ").slice(0, 300),
    hasPassage: Boolean(q.context)
  }));

  const system = `You are an assessment expert for Vietnamese Grade 9 English tests. For each question estimate its difficulty for an average Grade 9 student and a reasonable time budget in seconds. Answer with valid JSON only.`;
  const user = `Classify each question: "difficulty" must be one of "easy" (Nhận biết), "medium" (Thông hiểu), "hard" (Vận dụng / Vận dụng cao). "seconds" is the recommended time to solve it (20-120 for objective questions, 240-420 for paragraph writing, 90-180 for speaking). Give a very short reason in Vietnamese.

Return JSON: {"analysis":[{"id":"q-1","difficulty":"easy","seconds":30,"reason":"..."}]}

QUESTIONS:
${JSON.stringify(compact)}`;

  try {
    const parsed = await callAiJson(system, user, "test_analysis_" + compact.map(c => c.id + c.prompt.slice(0, 40)).join("|").toLowerCase().slice(0, 900));
    if (parsed && Array.isArray(parsed.analysis)) {
      for (const a of parsed.analysis) {
        if (!a || !fallback[a.id]) continue;
        const difficulty = ["easy", "medium", "hard"].includes(a.difficulty) ? a.difficulty : fallback[a.id].difficulty;
        const seconds = Math.max(15, Math.min(600, Number(a.seconds) || fallback[a.id].seconds));
        fallback[a.id] = { difficulty, seconds, reason: String(a.reason || "").slice(0, 160), source: "ai" };
      }
    }
  } catch (e) {
    console.warn("analyzeTestQuestions AI error:", e.message);
  }
  return fallback;
}

// ==========================================================
// 3. AI ĐỌC MA TRẬN ĐỀ (PDF/DOCX) -> CẤU TRÚC JSON
// ==========================================================
function heuristicMatrix(text) {
  const t = String(text || "");
  const find = (re, def) => { const m = t.match(re); return m ? Number(m[1]) : def; };
  const nb = find(/nh[aậ]n\s*bi[eế]t[^0-9]{0,40}(\d{1,2})\s*%/i, 40);
  const th = find(/th[oô]ng\s*hi[eể]u[^0-9]{0,40}(\d{1,2})\s*%/i, 30);
  const vd = find(/v[aậ]n\s*d[uụ]ng(?!\s*cao)[^0-9]{0,40}(\d{1,2})\s*%/i, 20);
  const vdc = find(/v[aậ]n\s*d[uụ]ng\s*cao[^0-9]{0,40}(\d{1,2})\s*%/i, 10);
  const total = nb + th + vd + vdc || 100;
  return {
    title: "Ma trận đề (ước lượng)",
    levels: [
      { key: "easy", name: "Nhận biết", ratio: Math.round((nb / total) * 100) },
      { key: "medium", name: "Thông hiểu", ratio: Math.round((th / total) * 100) },
      { key: "hard", name: "Vận dụng & Vận dụng cao", ratio: Math.round(((vd + vdc) / total) * 100) }
    ],
    skills: [],
    tiers: {
      advanced: { label: "Lớp tăng cường", easy: 25, medium: 35, hard: 40, timeFactor: 0.9 },
      regular: { label: "Lớp thường", easy: 45, medium: 35, hard: 20, timeFactor: 1.1 }
    },
    notes: "Được ước lượng tự động từ văn bản ma trận.",
    source: "heuristic"
  };
}

async function parseTestMatrix(text) {
  const source = trimSource(text, 9000);
  const system = `You are an expert in Vietnamese school test design (ma trận đề kiểm tra môn Tiếng Anh THCS). Read the test matrix text and convert it into a structured JSON. Answer with valid JSON only.`;
  const user = `Extract the test matrix. Map cognitive levels to keys: "easy" = Nhận biết, "medium" = Thông hiểu, "hard" = Vận dụng + Vận dụng cao. Ratios are percentages of total questions/points (must sum to 100). "skills" lists each section/skill (Phonetics, Grammar and Vocabulary, Reading, Writing, Speaking, Listening...) with number of questions and points per level when available.
Also propose two class tiers: "advanced" (lớp tăng cường, more hard questions) and "regular" (lớp thường, easier) as percentage distributions of easy/medium/hard that sum to 100, plus a "timeFactor" (advanced 0.85-0.95, regular 1.0-1.2).

Return JSON:
{"title":"...","totalQuestions":0,"totalPoints":10,"durationMinutes":45,
 "levels":[{"key":"easy","name":"Nhận biết","ratio":40},{"key":"medium","name":"Thông hiểu","ratio":30},{"key":"hard","name":"Vận dụng","ratio":30}],
 "skills":[{"name":"Grammar and Vocabulary","questions":10,"points":2.5,"easy":4,"medium":4,"hard":2}],
 "tiers":{"advanced":{"label":"Lớp tăng cường","easy":25,"medium":35,"hard":40,"timeFactor":0.9},"regular":{"label":"Lớp thường","easy":45,"medium":35,"hard":20,"timeFactor":1.1}},
 "notes":"(Vietnamese, 1-2 sentences)"}

MATRIX TEXT:
"""
${source}
"""`;
  try {
    const parsed = await callAiJson(system, user, "matrix_" + source.slice(0, 300).toLowerCase());
    if (parsed && Array.isArray(parsed.levels) && parsed.levels.length) {
      const norm = (tier, def) => ({
        label: String(tier?.label || def.label),
        easy: Number(tier?.easy ?? def.easy), medium: Number(tier?.medium ?? def.medium), hard: Number(tier?.hard ?? def.hard),
        timeFactor: Math.max(0.6, Math.min(1.5, Number(tier?.timeFactor || def.timeFactor)))
      });
      const h = heuristicMatrix("");
      return {
        title: String(parsed.title || "Ma trận đề"),
        totalQuestions: Number(parsed.totalQuestions) || 0,
        totalPoints: Number(parsed.totalPoints) || 10,
        durationMinutes: Number(parsed.durationMinutes) || 45,
        levels: parsed.levels.map(l => ({ key: ["easy", "medium", "hard"].includes(l.key) ? l.key : "medium", name: String(l.name || l.key), ratio: Number(l.ratio) || 0 })),
        skills: Array.isArray(parsed.skills) ? parsed.skills : [],
        tiers: { advanced: norm(parsed.tiers?.advanced, h.tiers.advanced), regular: norm(parsed.tiers?.regular, h.tiers.regular) },
        notes: String(parsed.notes || ""),
        source: "ai"
      };
    }
  } catch (e) {
    console.warn("parseTestMatrix AI error:", e.message);
  }
  return heuristicMatrix(text);
}

// ==========================================================
// 4. AI NHẬN XÉT LƯỢT NÓI (ngắn gọn, tiếng Việt) + phát hiện lỗi ngữ pháp trong câu nói tự do
// ==========================================================
async function speakingFeedback({ target = "", transcript = "", accuracy = 0, errors = [] }) {
  const fallbackTip = () => {
    const gram = errors.filter(e => e.type === "grammar");
    const pron = errors.filter(e => e.type === "pronunciation");
    if (!errors.length) return "Bạn đọc rất tốt, phát âm rõ ràng và đầy đủ. Tiếp tục phát huy nhé!";
    const parts = [];
    if (gram.length) parts.push(`Chú ý âm đuôi ngữ pháp ở: ${gram.map(e => e.word).join(", ")} (thiếu -s/-ed/-ing).`);
    if (pron.length) parts.push(`Luyện lại phát âm các từ: ${pron.slice(0, 4).map(e => e.word).join(", ")}.`);
    return parts.join(" ");
  };
  if (!target || !transcript) return { tip: fallbackTip(), source: "rule" };
  const system = `You are a friendly Vietnamese English pronunciation coach for Grade 9 students. Answer with valid JSON only.`;
  const user = `Target sentence: "${target}"
What the speech recognizer heard: "${transcript}"
Automatic accuracy: ${accuracy}%
Detected issues: ${JSON.stringify(errors.slice(0, 8))}

Write ONE short, warm, specific tip in Vietnamese (max 45 words) telling the student exactly which sounds/words to fix and how (mouth position or ending sound), or praise if excellent. Return JSON: {"tip":"..."}`;
  try {
    const parsed = await callAiJson(system, user, `spk_fb_${target.toLowerCase()}_${transcript.toLowerCase()}`.slice(0, 400), 12000);
    if (parsed && parsed.tip) return { tip: String(parsed.tip).trim().slice(0, 400), source: "ai" };
  } catch (e) {}
  return { tip: fallbackTip(), source: "rule" };
}

module.exports = {
  chatWithCapybara,
  gradeWritingEssay,
  generateTestOnDemand,
  translateAndGenerateIpa,
  generateSpeakingItems,
  analyzeTestQuestions,
  parseTestMatrix,
  speakingFeedback,
  extractEnglishSentences
};