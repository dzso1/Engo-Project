// ============================================================
// Tải ảnh minh hoạ cho từ vựng (Wikipedia/Wikimedia Commons, không cần API key) -> public/data/vocab-images.js
//   node scripts/fetch-vocab-images.js
// Chạy lại được: từ đã có ảnh (hoặc đã tra mà không có) sẽ bỏ qua. Nghỉ 1.2 s giữa các request để không bị chặn.
// ============================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public/data/vocab-images.js");
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "public/data/vocab-decks.js"), "utf8"), sandbox);
const decks = sandbox.window.ENGO_VOCAB_DECKS || {};
const words = [...new Set(Object.values(decks).flatMap(d => d.cards.map(c => c.word)))];

let map = {};
if (fs.existsSync(OUT)) { const sb = { window: {} }; vm.runInNewContext(fs.readFileSync(OUT, "utf8"), sb); map = sb.window.ENGO_VOCAB_IMAGES || {}; }

const sleep = ms => new Promise(r => setTimeout(r, ms));
function candidates(word) {
  const w = word.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/\b(sb|sth|somebody|something|someone)\b/g, "").replace(/\s+/g, " ").trim();
  const list = [w];
  if (/^(to|a|an|the) /.test(w)) list.push(w.replace(/^(to|a|an|the) /, ""));
  if (w.endsWith("s") && w.length > 4) list.push(w.slice(0, -1));
  return [...new Set(list)].filter(Boolean);
}
async function lookup(title) {
  const res = await fetch("https://en.wikipedia.org/api/rest_v1/page/summary/" + encodeURIComponent(title.replace(/ /g, "_")), { headers: { accept: "application/json", "user-agent": "ENGO-LearningHub/1.0 (school project)" } });
  if (res.status === 429) { await sleep(15000); return lookup(title); }
  if (!res.ok) return null;
  const j = await res.json();
  if (j.type !== "standard" || !j.thumbnail || !j.thumbnail.source) return null;
  // Ảnh kích thước ~400px cho thẻ từ
  return j.thumbnail.source.replace(/\/\d+px-/, "/400px-");
}
function save() {
  fs.writeFileSync(OUT, "// Ảnh minh hoạ từ vựng (Wikimedia Commons qua Wikipedia summary API). Sinh bởi scripts/fetch-vocab-images.js\n// null = đã tra nhưng không có ảnh phù hợp\nwindow.ENGO_VOCAB_IMAGES = " + JSON.stringify(map, null, 1) + ";\n");
}
(async () => {
  let n = 0, found = 0;
  for (const word of words) {
    if (word in map) continue;
    let url = null;
    for (const c of candidates(word)) {
      try { url = await lookup(c); } catch (e) { console.warn("ERR", word, e.message); }
      await sleep(1200);
      if (url) break;
    }
    map[word] = url;
    n++; if (url) found++;
    if (n % 20 === 0) { save(); console.log(`${n} tra, ${found} có ảnh...`); }
  }
  save();
  const total = Object.values(map).filter(Boolean).length;
  console.log(`Xong: ${words.length} từ, ${total} có ảnh (${Math.round((total / words.length) * 100)}%).`);
})();
