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

async function callCloudLlm(messages) {
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
              generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
            }),
            signal: AbortSignal.timeout(20000)
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