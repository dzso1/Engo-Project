const NUMBER_WORDS = {
  "0": "zero", "1": "one", "2": "two", "3": "three", "4": "four", "5": "five",
  "6": "six", "7": "seven", "8": "eight", "9": "nine", "10": "ten", "11": "eleven",
  "12": "twelve", "13": "thirteen", "14": "fourteen", "15": "fifteen", "16": "sixteen",
  "17": "seventeen", "18": "eighteen", "19": "nineteen", "20": "twenty", "30": "thirty",
  "40": "forty", "50": "fifty", "60": "sixty", "70": "seventy", "80": "eighty", "90": "ninety", "100": "hundred"
};

const CONTRACTIONS = {
  "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is", "it's": "it is",
  "we're": "we are", "they're": "they are", "i've": "i have", "you've": "you have", "we've": "we have",
  "they've": "they have", "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
  "we'll": "we will", "they'll": "they will", "i'd": "i would", "you'd": "you would", "he'd": "he would",
  "she'd": "she would", "we'd": "we would", "they'd": "they would", "don't": "do not", "doesn't": "does not",
  "didn't": "did not", "can't": "cannot", "couldn't": "could not", "won't": "will not", "wouldn't": "would not",
  "shouldn't": "should not", "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "hasn't": "has not", "haven't": "have not", "hadn't": "had not", "let's": "let us", "that's": "that is",
  "what's": "what is", "where's": "where is", "there's": "there is", "who's": "who is", "how's": "how is"
};

function phoneticKey(word) {
  let w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return "";
  if (w.length === 1) return w;
  w = w
    .replace(/^kn/, "n").replace(/^gn/, "n").replace(/^wr/, "r").replace(/^ps/, "s").replace(/^wh/, "w")
    .replace(/mb$/, "m")
    .replace(/ph/g, "f").replace(/gh(?![aeiou])/g, "").replace(/ck/g, "k").replace(/qu/g, "kw")
    .replace(/sch/g, "sk").replace(/tch/g, "ch").replace(/dge/g, "j")
    .replace(/tion/g, "shn").replace(/sion/g, "shn").replace(/ture/g, "cher")
    .replace(/c(?=[eiy])/g, "s").replace(/c/g, "k").replace(/g(?=[eiy])/g, "j").replace(/x/g, "ks")
    .replace(/z/g, "s").replace(/v/g, "f").replace(/w/g, "v").replace(/th/g, "t").replace(/dh/g, "t")
    .replace(/sh/g, "x").replace(/ch/g, "x").replace(/j/g, "x")
    .replace(/r/g, "l")
    .replace(/(.)\1+/g, "$1");
  const first = w[0];
  const rest = w.slice(1).replace(/[aeiouy]/g, "");
  return (first + rest).replace(/(.)\1+/g, "$1");
}

function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const cur = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    cur[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = cur[j];
  }
  return prev[b.length];
}

function ratio(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const d = levenshtein(a, b);
  return 1 - d / Math.max(a.length, b.length);
}

function cleanToken(t) {
  return String(t || "").toLowerCase().replace(/[^a-z0-9']/g, "");
}

function normalizeWords(text) {
  const raw = String(text || "").toLowerCase().replace(/[’‘]/g, "'").split(/\s+/).map(cleanToken).filter(Boolean);
  const out = [];
  for (const t of raw) {
    if (CONTRACTIONS[t]) { out.push(...CONTRACTIONS[t].split(" ")); continue; }
    if (/^\d+$/.test(t)) { out.push(NUMBER_WORDS[t] || t); continue; }
    out.push(t.replace(/'s$/, "s").replace(/'/g, ""));
  }
  return out;
}

function wordSimilarity(a, b) {
  if (a === b) return 1;
  const spell = ratio(a, b);
  const phon = ratio(phoneticKey(a), phoneticKey(b));
  const bonus = a[0] === b[0] ? 0.05 : 0;
  return Math.min(1, Math.max(spell, phon * 0.95) + bonus);
}

function detectEndingIssue(target, spoken) {
  if (!target || !spoken || target === spoken) return null;
  const strip = (w) => w.replace(/ies$/, "y").replace(/(es|s)$/, "").replace(/ied$/, "y").replace(/(ed|d)$/, "").replace(/ing$/, "");
  if (target.endsWith("s") && !spoken.endsWith("s") && (strip(target) === spoken || target.slice(0, -1) === spoken || target.slice(0, -2) === spoken)) return "missing_s";
  if (/(ed|d)$/.test(target) && (target.replace(/ed$/, "") === spoken || target.replace(/d$/, "") === spoken || target.replace(/ied$/, "y") === spoken)) return "missing_ed";
  if (target.endsWith("ing") && (target.replace(/ing$/, "") === spoken || target.replace(/ing$/, "e") === spoken)) return "missing_ing";
  return null;
}

function alignWords(targetWords, spokenWords) {
  const n = targetWords.length, m = spokenWords.length;
  const GAP = -0.35;
  const score = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i++) { score[i][0] = i * GAP; back[i][0] = 1; }
  for (let j = 1; j <= m; j++) { score[0][j] = j * GAP; back[0][j] = 2; }
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const sim = wordSimilarity(targetWords[i - 1], spokenWords[j - 1]);
      const diag = score[i - 1][j - 1] + (sim >= 0.45 ? sim : -0.6);
      const up = score[i - 1][j] + GAP;
      const left = score[i][j - 1] + GAP;
      if (diag >= up && diag >= left) { score[i][j] = diag; back[i][j] = 0; }
      else if (up >= left) { score[i][j] = up; back[i][j] = 1; }
      else { score[i][j] = left; back[i][j] = 2; }
    }
  }
  const pairs = [];
  let i = n, j = m;
  while (i > 0 || j > 0) {
    const b = back[i][j];
    if (i > 0 && j > 0 && b === 0) { pairs.unshift({ t: i - 1, s: j - 1 }); i--; j--; }
    else if (i > 0 && (j === 0 || b === 1)) { pairs.unshift({ t: i - 1, s: -1 }); i--; }
    else { pairs.unshift({ t: -1, s: j - 1 }); j--; }
  }
  return pairs;
}

function mergeSplitTokens(targetWords, spokenWords) {
  const out = [...spokenWords];
  const bestSim = (tok) => Math.max(0, ...targetWords.map(tw => wordSimilarity(tw, tok)));
  for (const tw of targetWords) {
    if (tw.length < 5) continue;
    if (out.some(tok => wordSimilarity(tw, tok) >= 0.82)) continue;
    let merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let len = 2; len <= 3 && i + len <= out.length; len++) {
        const parts = out.slice(i, i + len);
        if (parts.some(p => bestSim(p) >= 0.7)) break;
        const candidate = parts.join("");
        if (wordSimilarity(tw, candidate) >= 0.75) { out.splice(i, len, candidate); merged = true; break; }
      }
    }
  }
  return out;
}

function displayTokens(targetSentence) {
  const originals = String(targetSentence || "").trim().split(/\s+/).filter(Boolean);
  const out = [];
  for (const o of originals) {
    const forms = normalizeWords(o);
    const clean = o.replace(/^[^A-Za-z0-9']+|[^A-Za-z0-9']+$/g, "");
    if (forms.length === 1) out.push(clean || forms[0]);
    else forms.forEach(fm => out.push(fm));
  }
  return out;
}

function scorePronunciation(targetSentence, spokenTranscript) {
  const targetWords = normalizeWords(targetSentence);
  const targetOriginal = displayTokens(targetSentence);
  const spokenWords = mergeSplitTokens(targetWords, normalizeWords(spokenTranscript));
  if (!targetWords.length) return { accuracy: 0, breakdown: [], errors: [], spokenWords, targetWords };
  if (!spokenWords.length) {
    return {
      accuracy: 0,
      breakdown: targetWords.map((w, idx) => ({ word: targetOriginal[idx] || w, status: "missed", similarity: 0, heard: "" })),
      errors: [], spokenWords, targetWords
    };
  }

  const pairs = alignWords(targetWords, spokenWords);
  const breakdown = [];
  const errors = [];
  let total = 0;
  const sameLength = targetWords.length === targetOriginal.length;

  for (const p of pairs) {
    if (p.t < 0) continue;
    const tw = targetWords[p.t];
    const display = sameLength ? targetOriginal[p.t] : tw;
    if (p.s < 0) {
      breakdown.push({ word: display, status: "missed", similarity: 0, heard: "" });
      errors.push({ type: "pronunciation", subtype: "missed", word: display, heard: "" });
      continue;
    }
    const sw = spokenWords[p.s];
    let sim = wordSimilarity(tw, sw);
    const ending = detectEndingIssue(tw, sw);
    let status = "correct";
    if (ending) {
      sim = 0.6;
      status = "ending";
      errors.push({ type: "grammar", subtype: ending, word: display, heard: sw });
    } else if (sim >= 0.82) {
      status = "correct";
    } else if (sim >= 0.55) {
      status = "near";
      errors.push({ type: "pronunciation", subtype: "near", word: display, heard: sw });
    } else {
      status = "missed";
      sim = Math.min(sim, 0.3);
      errors.push({ type: "pronunciation", subtype: "wrong", word: display, heard: sw });
    }
    total += sim;
    breakdown.push({ word: display, status, similarity: Number(sim.toFixed(2)), heard: sw });
  }

  let accuracy = (total / targetWords.length) * 100;
  const lengthRatio = Math.min(spokenWords.length, targetWords.length) / Math.max(spokenWords.length, targetWords.length);
  if (lengthRatio > 0.8 && accuracy > 50 && !errors.length) accuracy += 3;

  const extraRatio = Math.max(0, (spokenWords.length - targetWords.length) / Math.max(1, targetWords.length));
  const extraPenalty = Math.min(0.5, Math.max(0, extraRatio - 0.25) * 0.7);
  if (extraPenalty > 0) {
    accuracy *= 1 - extraPenalty;
    errors.push({ type: "fluency", subtype: "extra_words", word: "", heard: "", extra: spokenWords.length - targetWords.length });
  }
  const matchedInOrder = breakdown.filter(b => b.status !== "missed").length;
  const recognized = spokenWords.filter(sw => targetWords.some(tw => wordSimilarity(tw, sw) >= 0.82)).length;
  if (recognized > matchedInOrder + 1) {
    const orderFactor = Math.max(0.4, matchedInOrder / recognized);
    accuracy *= orderFactor;
    errors.push({ type: "fluency", subtype: "word_order", word: "", heard: "", detail: `${recognized - matchedInOrder} từ sai vị trí` });
  }
  accuracy = Math.max(0, Math.min(100, Math.round(accuracy)));

  return { accuracy, breakdown, errors, spokenWords, targetWords };
}

function pickBestTranscript(targetSentence, alternatives) {
  const list = (Array.isArray(alternatives) ? alternatives : [alternatives]).map(a => String(a || "").trim()).filter(Boolean);
  if (!list.length) return { transcript: "", result: scorePronunciation(targetSentence, "") };
  let best = null;
  for (const alt of list) {
    const r = scorePronunciation(targetSentence, alt);
    if (!best || r.accuracy > best.result.accuracy) best = { transcript: alt, result: r };
  }
  return best;
}

function verdictFor(accuracy) {
  if (accuracy >= 90) return { level: "excellent", label: "Xuất sắc! Phát âm rất chuẩn", xp: 15, carrots: 2 };
  if (accuracy >= 75) return { level: "good", label: "Tốt! Người nghe hiểu rõ", xp: 12, carrots: 1 };
  if (accuracy >= 60) return { level: "fair", label: "Khá! Đạt yêu cầu, cần luyện thêm vài từ", xp: 8, carrots: 1 };
  return { level: "weak", label: "Cần cố gắng thêm", xp: 5, carrots: 0 };
}

module.exports = { scorePronunciation, pickBestTranscript, phoneticKey, wordSimilarity, normalizeWords, verdictFor, detectEndingIssue };
