const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { attachDocxImages } = require("../../services/docx-images");

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, ".import/kt");
const STRUCT = path.join(ROOT, ".import/structured");
const OUT = path.join(ROOT, "public/exam-images");
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ONLY = (() => { const i = args.indexOf("--hash"); return i >= 0 ? args[i + 1] : null; })();

(async () => {
  const index = JSON.parse(fs.readFileSync(path.join(ROOT, ".import/text/_index.json"), "utf8"));
  let totalT = 0, totalA = 0, tests = 0;
  const save = async (buf, ext) => {
    const name = crypto.createHash("md5").update(buf).digest("hex").slice(0, 16) + ext;
    if (!DRY) { fs.mkdirSync(OUT, { recursive: true }); const p = path.join(OUT, name); if (!fs.existsSync(p)) fs.writeFileSync(p, buf); }
    return "/exam-images/" + name;
  };
  for (const rec of index) {
    if (ONLY && rec.hash !== ONLY) continue;
    const sp = path.join(STRUCT, rec.hash + ".json");
    if (!fs.existsSync(sp) || !/\.docx$/i.test(rec.rel)) continue;
    try {
      const data = JSON.parse(fs.readFileSync(sp, "utf8"));
      const r = await attachDocxImages(fs.readFileSync(path.join(SRC, rec.rel)), data.test, save);
      if (!r.targets) continue;
      tests++; totalT += r.targets; totalA += r.attached;
      if (!DRY && r.attached) fs.writeFileSync(sp, JSON.stringify(data));
      console.log(`${rec.hash} ${r.attached}/${r.targets}`);
      if (ONLY || args.includes("--verbose")) r.report.forEach(l => console.log("  " + l));
    } catch (e) { console.log(`ERR ${rec.hash}: ${e.message}`); }
  }
  console.log(`XONG: ${tests} đề, gắn ảnh ${totalA}/${totalT} câu`);
})();
