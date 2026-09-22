const mammoth = require("mammoth");

const POS_MAP = { n: "n", v: "v", adj: "adj", adv: "adv", "phr.v": "phr v", "ph.v": "phr v", "phr v": "phr v", phr: "phr", prep: "prep", conj: "conj", pron: "pron", idiom: "idiom", exp: "phr", "n.phr": "phr", "n phr": "phr", modal: "modal" };

function cleanSpaces(s) { return String(s || "").replace(/\s+/g, " ").trim(); }

async function parseVocabDocx(path) {
  const { value } = await mammoth.extractRawText({ path });
  const lines = value.split("\n").map(l => l.replace(/ /g, " ").trimEnd());
  const units = [];
  let current = null, section = "";
  let last = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const unitMatch = line.match(/^Unit\s+(\d{1,2})\s*[.:]\s*(.+)$/i);
    if (unitMatch) {
      current = { unit: Number(unitMatch[1]), title: cleanSpaces(unitMatch[2]), words: [] };
      units.push(current); section = ""; last = null; continue;
    }
    if (!current) continue;
    const secMatch = line.match(/^(I|II|III|IV|V|VI|VII|VIII)\.\s*(.+)$/);
    if (secMatch) { section = cleanSpaces(secMatch[2]); continue; }
    const entry = line.match(/^(\d{1,3})\s*\.\s*(.+)$/);
    if (entry) {
      let rest = cleanSpaces(entry[2]);
      const ipaMatch = rest.match(/\/([^/]+)\//);
      const ipa = ipaMatch ? `/${cleanSpaces(ipaMatch[1])}/` : "";
      let word = ipaMatch ? cleanSpaces(rest.slice(0, ipaMatch.index)) : rest;
      let after = ipaMatch ? cleanSpaces(rest.slice(ipaMatch.index + ipaMatch[0].length)) : "";
      if (!ipaMatch) {
        const m = rest.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/);
        if (m) { word = cleanSpaces(m[1]); after = `(${m[2]}) ${m[3]}`; }
      }
      let pos = "";
      const posMatch = after.match(/^\(([^)]{1,8})\)\s*/);
      if (posMatch) { pos = POS_MAP[posMatch[1].toLowerCase().replace(/\s/g, "")] || POS_MAP[posMatch[1].toLowerCase()] || posMatch[1].toLowerCase(); after = after.slice(posMatch[0].length); }
      const item = { word: word.replace(/\s*\(.*?\)\s*$/, "").trim() || word, ipa, pos, meaning: cleanSpaces(after), section };
      current.words.push(item); last = item; continue;
    }
    if (last && (!last.meaning || !last.pos)) {
      const posMatch = line.match(/^\(([^)]{1,8})\)\s*(.*)$/);
      if (posMatch) { last.pos = last.pos || (POS_MAP[posMatch[1].toLowerCase().replace(/\s/g, "")] || posMatch[1].toLowerCase()); last.meaning = cleanSpaces(posMatch[2]) || last.meaning; }
      else if (!last.meaning) last.meaning = cleanSpaces(line);
    }
  }
  units.forEach(u => u.words.forEach(w => {
    if (!w.pos) w.pos = /\s/.test(w.word) && /^(to |be )/.test(w.word) ? "phr" : /ly$/.test(w.word) ? "adv" : "n";
    w.meaning = w.meaning.replace(/^[:\-–]\s*/, "");
  }));
  return units;
}

if (require.main === module) {
  parseVocabDocx(process.argv[2]).then(units => process.stdout.write(JSON.stringify(units, null, 1))).catch(e => { console.error(e); process.exit(1); });
}
module.exports = { parseVocabDocx };
