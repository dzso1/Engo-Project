const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DATA_DIR = path.join(__dirname, "..", "public", "data");
const FILES = ["vocab-units.js", "grammar-units.js", "speaking-units.js", "listening-units.js", "exam-bank.js"];

let cache = null;

function load() {
  if (cache) return cache;
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  for (const f of FILES) {
    const p = path.join(DATA_DIR, f);
    if (!fs.existsSync(p)) continue;
    try {
      vm.runInContext(fs.readFileSync(p, "utf8"), sandbox, { filename: f, timeout: 5000 });
    } catch (err) {
      console.error(`[units-data] Không nạp được ${f}:`, err.message);
    }
  }
  const w = sandbox.window;
  cache = {
    vocab: w.ENGO_VOCAB_UNITS || {},
    grammar: w.ENGO_GRAMMAR_UNITS || {},
    speaking: w.ENGO_SPEAKING_UNITS || {},
    listening: w.ENGO_LISTENING_UNITS || {},
    exam: w.ENGO_EXAM_BANK || { specs: [], levels: [], imported: [] }
  };
  return cache;
}

function summary() {
  const d = load();
  const units = [];
  for (let n = 1; n <= 12; n++) {
    const k = "unit" + n;
    const v = d.vocab[k], g = d.grammar[k], s = d.speaking[k], l = d.listening[k];
    if (!v && !g && !s && !l) continue;
    units.push({
      unit: n,
      name: (v && v.name) || (g && g.name) || `Unit ${n}`,
      words: v ? v.cards.length : 0,
      grammarPoints: g ? g.points.length : 0,
      errorCodes: g ? g.codes.map(c => c.id) : [],
      speakingItems: s ? s.levels.reduce((a, x) => a + x.items.length, 0) : 0,
      listeningTasks: l ? l.tasks.length : 0,
      listeningQuestions: l ? l.tasks.reduce((a, t) => a + t.qs.length, 0) : 0
    });
  }
  return {
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

function unit(n) {
  const d = load();
  const k = "unit" + Number(n);
  if (!d.vocab[k] && !d.grammar[k]) return null;
  return {
    unit: Number(n),
    vocab: d.vocab[k] || null,
    grammar: d.grammar[k] || null,
    speaking: d.speaking[k] || null,
    listening: d.listening[k] || null
  };
}

function examSpecs(term) {
  const d = load();
  const specs = d.exam.specs || [];
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

function errorCodes() {
  const d = load();
  const out = [];
  Object.values(d.grammar).forEach(g => {
    (g.codes || []).forEach(c => out.push({ ...c, unit: g.unit, unitName: g.name }));
  });
  return out;
}

function reload() { cache = null; return load(); }

module.exports = { load, summary, unit, examSpecs, examSpec, errorCodes, reload };
