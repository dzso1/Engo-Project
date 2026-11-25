const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DATA_DIR = path.join(__dirname, "..", "public", "data");
const FILES = {
  9: [
    { file: "vocab-units.js", key: "ENGO_VOCAB_UNITS" },
    { file: "grammar-units.js", key: "ENGO_GRAMMAR_UNITS" },
    { file: "speaking-units.js", key: "ENGO_SPEAKING_UNITS" },
    { file: "listening-units.js", key: "ENGO_LISTENING_UNITS" }
  ],
  8: [
    { file: "grade8/vocab-units.js", key: "ENGO_G8_VOCAB_UNITS" },
    { file: "grade8/grammar-units.js", key: "ENGO_G8_GRAMMAR_UNITS" },
    { file: "grade8/speaking-units.js", key: "ENGO_G8_SPEAKING_UNITS" },
    { file: "grade8/listening-units.js", key: "ENGO_G8_LISTENING_UNITS" }
  ]
};

const caches = { 8: null, 9: null };
let examCache = null;

function normGrade(grade) {
  return Number(grade) === 8 ? 8 : 9;
}

function loadExam() {
  if (examCache) return examCache;
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  const p = path.join(DATA_DIR, "exam-bank.js");
  if (fs.existsSync(p)) {
    try {
      vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: "exam-bank.js", timeout: 5000 });
    } catch (err) {
      console.error("[units-data] Không nạp được exam-bank.js:", err.message);
    }
  }
  examCache = sandbox.window.ENGO_EXAM_BANK || { specs: [], levels: [], imported: [] };
  return examCache;
}

function load(grade = 9) {
  const g = normGrade(grade);
  if (caches[g]) return caches[g];
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  for (const { file } of FILES[g]) {
    const p = path.join(DATA_DIR, file);
    if (!fs.existsSync(p)) continue;
    try {
      vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: file, timeout: 5000 });
    } catch (err) {
      console.error(`[units-data] Không nạp được ${file}:`, err.message);
    }
  }
  const w = sandbox.window;
  const prefix = g === 8 ? "ENGO_G8_" : "ENGO_";
  caches[g] = {
    grade: g,
    vocab: w[prefix + "VOCAB_UNITS"] || {},
    grammar: w[prefix + "GRAMMAR_UNITS"] || {},
    speaking: w[prefix + "SPEAKING_UNITS"] || {},
    listening: w[prefix + "LISTENING_UNITS"] || {},
    exam: loadExam()
  };
  return caches[g];
}

function summary(grade = 9) {
  const g = normGrade(grade);
  const d = load(g);
  const units = [];
  for (let n = 1; n <= 12; n++) {
    const k = "unit" + n;
    const v = d.vocab[k], gr = d.grammar[k], s = d.speaking[k], l = d.listening[k];
    if (!v && !gr && !s && !l) continue;
    units.push({
      unit: n,
      name: (v && v.name) || (gr && (gr.name || `Unit ${n} · ${gr.title}`)) || `Unit ${n}`,
      words: v && v.cards ? v.cards.length : 0,
      grammarPoints: gr && gr.points ? gr.points.length : 0,
      errorCodes: gr && gr.codes ? gr.codes.map(c => c.id) : [],
      speakingItems: s && s.levels ? s.levels.reduce((a, x) => a + x.items.length, 0) : 0,
      listeningTasks: l && l.tasks ? l.tasks.length : 0,
      listeningQuestions: l && l.tasks ? l.tasks.reduce((a, t) => a + t.qs.length, 0) : 0
    });
  }
  return {
    grade: g,
    units,
    totals: units.reduce((a, u) => ({
      words: a.words + u.words,
      grammarPoints: a.grammarPoints + u.grammarPoints,
      errorCodes: a.errorCodes + u.errorCodes.length,
      speakingItems: a.speakingItems + u.speakingItems,
      listeningTasks: a.listeningTasks + u.listeningTasks,
      listeningQuestions: a.listeningQuestions + u.listeningQuestions
    }), { words: 0, grammarPoints: 0, errorCodes: 0, speakingItems: 0, listeningTasks: 0, listeningQuestions: 0 })
  };
}

function unit(n, grade = 9) {
  const g = normGrade(grade);
  const d = load(g);
  const k = "unit" + Number(n);
  if (!d.vocab[k] && !d.grammar[k]) return null;
  return {
    grade: g,
    unit: Number(n),
    vocab: d.vocab[k] || null,
    grammar: d.grammar[k] || null,
    speaking: d.speaking[k] || null,
    listening: d.listening[k] || null
  };
}

function examSpecs(term) {
  const ex = loadExam();
  const specs = ex.specs || [];
  const list = term ? specs.filter(s => s.term === Number(term)) : specs;
  return list.map(s => ({
    ...s,
    totalQuestions: s.sections.reduce((a, x) => a + x.n, 0),
    totalPoints: s.sections.reduce((a, x) => a + x.pts, 0)
  }));
}

function examSpec(id) {
  return examSpecs().find(s => s.id === id) || null;
}

function errorCodes(grade = 9) {
  const d = load(grade);
  const out = [];
  Object.values(d.grammar).forEach(g => {
    (g.codes || []).forEach(c => out.push({ ...c, unit: g.unit, unitName: g.name }));
  });
  return out;
}

function reload() {
  caches[8] = null;
  caches[9] = null;
  examCache = null;
  return load(9);
}

module.exports = { load, summary, unit, examSpecs, examSpec, errorCodes, reload };
