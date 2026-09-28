const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.resolve(__dirname, "..");
const dataFile = path.join(root, "public", "data", "vocab-images.js");
const outDir = path.join(root, "public", "vocab-images");
const UA = "ENGO-Learning-Hub/1.0 (educational vocabulary app; contact khoa1029384756@gmail.com)";

function load() {
  const src = fs.readFileSync(dataFile, "utf8");
  const json = src.slice(src.indexOf("{"), src.lastIndexOf("}") + 1);
  return JSON.parse(json);
}

function candidates(url) {
  const list = [];
  const clean = url.split("?")[0].replace("://thumb.wikimedia.org/", "://upload.wikimedia.org/");
  const m = clean.match(/^(.*\/thumb\/.+\/)\d+px-([^/]+)$/);
  if (m) for (const w of [500, 330, 250]) list.push(`${m[1]}${w}px-${m[2]}`);
  else list.push(clean);
  return [...new Set(list)];
}

const extOf = type => ({ "image/jpeg": ".jpg", "image/png": ".png", "image/gif": ".gif", "image/webp": ".webp", "image/svg+xml": ".svg" })[type] || ".jpg";
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchImage(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA, Accept: "image/*" }, redirect: "follow" });
      if (r.status === 429) { await sleep(3000 * (attempt + 1)); continue; }
      if (!r.ok) return null;
      const type = (r.headers.get("content-type") || "").split(";")[0].trim();
      if (!type.startsWith("image/")) return null;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 800 || buf.length > 600000) return null;
      return { buf, type };
    } catch (e) {
      await sleep(1000);
    }
  }
  return null;
}

(async () => {
  const map = load();
  fs.mkdirSync(outDir, { recursive: true });
  let got = 0, had = 0, failed = 0;
  const out = {};
  for (const [word, url] of Object.entries(map)) {
    if (!url) { out[word] = null; continue; }
    if (url.startsWith("/vocab-images/")) { out[word] = url; had++; continue; }
    const base = crypto.createHash("md5").update(word).digest("hex").slice(0, 16);
    const existing = fs.readdirSync(outDir).find(f => f.startsWith(base + "."));
    if (existing) { out[word] = "/vocab-images/" + existing; had++; continue; }
    let res = null;
    for (const c of candidates(url)) { res = await fetchImage(c); if (res) break; }
    if (!res) { out[word] = null; failed++; console.log("LỖI", word); continue; }
    const name = base + extOf(res.type);
    fs.writeFileSync(path.join(outDir, name), res.buf);
    out[word] = "/vocab-images/" + name;
    got++;
    await sleep(250);
  }
  fs.writeFileSync(dataFile, "window.ENGO_VOCAB_IMAGES = " + JSON.stringify(out, null, 1) + ";\n");
  console.log(`XONG: tải ${got}, có sẵn ${had}, lỗi ${failed}`);
})();
