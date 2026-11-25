(function () {
  "use strict";

  const loaded = new Map();

  function loadScript(src) {
    if (loaded.has(src)) return loaded.get(src);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = () => resolve(true);
      s.onerror = () => { loaded.delete(src); reject(new Error("Không nạp được " + src)); };
      document.head.appendChild(s);
    });
    loaded.set(src, p);
    return p;
  }

  function currentUserObj() {
    try { return typeof currentUser !== "undefined" ? currentUser : null; } catch (_) { return null; }
  }

  function isStudent() {
    const u = currentUserObj();
    return Boolean(u && u.role === "student");
  }

  function gradeFromClass(cls) {
    const m = String(cls || "").trim().match(/^([89])/);
    return m ? Number(m[1]) : 9;
  }

  function defaultGrade() {
    const u = currentUserObj();
    return u && u.className ? gradeFromClass(u.className) : 9;
  }

  function gradeKey() {
    const u = currentUserObj();
    return "engoActiveGrade_" + (u && u.id ? u.id : "guest");
  }

  let activeGrade = null;

  function getGrade() {
    if (isStudent()) {
      activeGrade = defaultGrade();
      return activeGrade;
    }
    if (activeGrade === 8 || activeGrade === 9) return activeGrade;
    try {
      const saved = Number(sessionStorage.getItem(gradeKey()));
      if (saved === 8 || saved === 9) { activeGrade = saved; return activeGrade; }
    } catch (_) {}
    activeGrade = defaultGrade();
    return activeGrade;
  }

  function setGrade(g) {
    if (isStudent()) return defaultGrade();
    const next = Number(g) === 8 ? 8 : 9;
    if (activeGrade === next) return next;
    activeGrade = next;
    try { sessionStorage.setItem(gradeKey(), String(next)); } catch (_) {}
    window.dispatchEvent(new CustomEvent("engo:grade-change", { detail: next }));
    return next;
  }

  window.addEventListener("engo:user", () => {
    activeGrade = null;
    getGrade();
  });

  window.addEventListener("engo:logout", () => {
    activeGrade = null;
  });

  const FILES = {
    9: {
      vocab: ["./data/vocab-units.js?v=6", "./data/vocab-decks.js?v=6", "./data/grammar-units.js?v=6", "./data/vocab-images.js?v=2"],
      speaking: ["./data/speaking-units.js?v=6", "./data/speaking-sets.js?v=6"],
      listening: ["./data/listening-units.js?v=6", "./data/listening-sets.js?v=6"],
      wordform: ["./data/vocab-units.js?v=6", "./data/word-families.js?v=2"],
      exam: ["./data/exam-bank.js?v=5"],
      healing: ["./data/healing-bank.js?v=5"]
    },
    8: {
      vocab: ["./data/grade8/vocab-units.js?v=1", "./data/grade8/vocab-decks.js?v=1", "./data/grade8/grammar-units.js?v=1", "./data/vocab-images.js?v=2"],
      speaking: ["./data/grade8/speaking-units.js?v=1", "./data/grade8/speaking-sets.js?v=1"],
      listening: ["./data/grade8/listening-units.js?v=1", "./data/grade8/listening-sets.js?v=1"],
      wordform: ["./data/grade8/vocab-units.js?v=1", "./data/grade8/word-families.js?v=1"],
      exam: ["./data/exam-bank.js?v=5"],
      healing: ["./data/healing-bank.js?v=5"]
    }
  };

  function ensure(kind, grade) {
    const g = (grade === 8 || grade === 9) ? grade : getGrade();
    const list = (FILES[g] && FILES[g][kind]) || FILES[9][kind] || [];
    return Promise.all(list.map(loadScript));
  }

  const pick = (g, name9, name8) => ((g === 8 || (g == null && getGrade() === 8)) ? window[name8] : window[name9]);

  window.ENGO_DATA = {
    GRADES: [8, 9],
    defaultGrade,
    getGrade,
    setGrade,
    ensure,
    vocabUnits: g => pick(g, "ENGO_VOCAB_UNITS", "ENGO_G8_VOCAB_UNITS") || {},
    vocabDecks: g => pick(g, "ENGO_VOCAB_DECKS", "ENGO_G8_VOCAB_DECKS") || {},
    grammarUnits: g => pick(g, "ENGO_GRAMMAR_UNITS", "ENGO_G8_GRAMMAR_UNITS") || {},
    speakingUnits: g => pick(g, "ENGO_SPEAKING_UNITS", "ENGO_G8_SPEAKING_UNITS") || {},
    speakingSets: g => pick(g, "ENGO_SPEAKING_SETS", "ENGO_G8_SPEAKING_SETS") || [],
    listeningUnits: g => pick(g, "ENGO_LISTENING_UNITS", "ENGO_G8_LISTENING_UNITS") || {},
    listeningSets: g => pick(g, "ENGO_LISTENING_SETS", "ENGO_G8_LISTENING_SETS") || {},
    wordFamilies: g => pick(g, "ENGO_WORD_FAMILIES", "ENGO_G8_WORD_FAMILIES") || {},
    examBank: () => window.ENGO_EXAM_BANK || null,
    healingBank: () => window.ENGO_HEALING_BANK || {},
    gradeChipHtml(g = getGrade()) {
      if (isStudent()) {
        return `<span class="badge ${g === 8 ? "blue" : "green"}">Khối ${g}</span>`;
      }
      return '<div class="seg grade-switch" role="group" aria-label="Chọn khối lớp">' +
        [8, 9].map(x => `<button type="button" class="${x === g ? "active" : ""}" data-engo-grade="${x}">Khối ${x}</button>`).join("") +
        "</div>";
    }
  };
})();
