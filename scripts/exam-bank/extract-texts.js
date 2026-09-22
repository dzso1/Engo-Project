// ============================================================
// Bước 1: đọc toàn bộ đề Word/PDF trong thư mục ngân hàng đề của tổ,
// phân loại theo đường dẫn (khối, học kì, loại KTTX/KTGK/KTCK, lần, giáo viên, lớp, mã đề)
// và ghi văn bản thuần ra .import/text/<id>.json để bước 2 dùng AI cấu trúc hoá.
//   node scripts/exam-bank/extract-texts.js [thư mục nguồn]   (mặc định .import/kt)
// ============================================================
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { docxToText } = require("../../services/docx-text");
const pdfParse = require("pdf-parse");

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.resolve(process.argv[2] || path.join(ROOT, ".import/kt"));
const OUT = path.join(ROOT, ".import/text");
fs.mkdirSync(OUT, { recursive: true });

const SKIP = /(~\$|MATRAN|MA TR[ẬA]N|DAC TA|\bKEY\b|REVIEW|ôn tập|on tap|DE CUONG|ĐỀ CƯƠNG|dictionary|đáp án\.docx$)/i;

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function stripVN(s) {
  return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
}

function classify(rel) {
  const flat = stripVN(rel).replace(/\\/g, "/");
  const upper = flat.toUpperCase();
  const file = path.basename(flat);
  const gradeM = upper.match(/TA\s?([6-9])\b/) || upper.match(/KHOI\s?([6-9])/) || upper.match(/ANH\s?([6-9])\b/) || upper.match(/IL([6-9])/);
  const grade = gradeM ? Number(gradeM[1]) : null;
  const semester = /^HKII\//.test(upper) || /-HK2-|HK2\b|GK2|CK2|TX\d-HK2/.test(upper) ? 2 : 1;
  let type = "kttx";
  if (/KTGK|-GK\d|\bGK\d/.test(upper)) type = "ktgk";
  if (/KTCK|-CK\d|\bCK\d/.test(upper)) type = "ktck";
  const txM = upper.match(/KTTX\s?(\d)/) || upper.match(/\bTX(\d)\b/) || upper.match(/-TX(\d)-/);
  const times = type === "kttx" ? (txM ? Number(txM[1]) : 1) : null;
  const classM = file.toUpperCase().match(/\b([6-9]A\d{1,2})\b/);
  const className = classM ? classM[1] : null;
  const variantM = stripVN(file).match(/de\s*so\s*(\d(?:\s*,\s*\d)*)/i) || stripVN(file).match(/DE SO (\d)/i);
  const inclusive = /HOA NHAP/i.test(stripVN(file));
  const backup = /DU PHONG/i.test(stripVN(file));
  const online = /online/i.test(file);
  const teacherM = flat.match(/\/([A-Z]+)-TA\d/) || flat.match(/-(C\.|T\.)\s?([A-ZĐ ]+?)(?:_rar|\.rar|\/|\.)/i);
  const teacher = teacherM ? (teacherM[2] ? teacherM[2].trim() : teacherM[1]) : null;
  return { grade, semester, type, times, className, variant: variantM ? variantM[1].replace(/\s/g, "") : null, inclusive, backup, online, teacher };
}

async function extract(file) {
  const buf = fs.readFileSync(file);
  if (/\.pdf$/i.test(file)) { const d = await pdfParse(buf); return d.text; }
  if (/\.docx$/i.test(file)) return docxToText(buf);
  return null;
}

(async () => {
  const files = walk(SRC).filter(f => /\.(docx|pdf)$/i.test(f));
  const seen = new Map();
  const index = [];
  let skipped = 0, empty = 0, dup = 0;
  for (const f of files) {
    const rel = path.relative(SRC, f);
    if (SKIP.test(stripVN(rel))) { skipped++; continue; }
    // .doc đã chuyển sang .docx: bỏ qua bản .doc gốc (không đọc được), bản .docx cùng tên đã có
    let text;
    try { text = await extract(f); } catch (e) { console.warn("ERR", rel, e.message); continue; }
    text = String(text || "").replace(/\r/g, "").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    if (text.length < 400) { empty++; console.warn("EMPTY", rel, text.length); continue; }
    const hash = crypto.createHash("md5").update(text.replace(/\s+/g, " ").toLowerCase()).digest("hex").slice(0, 12);
    if (seen.has(hash)) { dup++; seen.get(hash).aliases.push(rel); continue; }
    const meta = classify(rel);
    const id = `${hash}`;
    const rec = { id, rel, hash, ...meta, chars: text.length, aliases: [] };
    seen.set(hash, rec);
    index.push(rec);
    fs.writeFileSync(path.join(OUT, id + ".json"), JSON.stringify({ ...rec, text }, null, 1));
  }
  fs.writeFileSync(path.join(OUT, "_index.json"), JSON.stringify(index, null, 1));
  const by = (k) => index.reduce((m, r) => { const v = r[k]; m[v] = (m[v] || 0) + 1; return m; }, {});
  console.log({ files: files.length, kept: index.length, skipped, empty, dup, grade: by("grade"), semester: by("semester"), type: by("type") });
})();
