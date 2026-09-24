const path = require("path");
const JSZip = require("jszip");

const NEEDS_IMAGE = /\bsigns?\b|picture|notice|photo|image|poster|label|look at|announcement|warning|advert|ticket|prescription|where might you see|this game/i;
const INSTR_IMAGE = /\bsigns?\b|picture|notice|photo|poster/i;
const WEB_MIME = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };
const QSTART = /^\s*(?:question|câu|cau)?\s*(\d{1,2})\s*[.:)]/i;
const norm = s => String(s || "").replace(/<[^>]+>/g, " ").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "");

function blocksOf(body) {
  const blocks = [];
  let seq = 0;
  const textOf = x => (x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, "")).join("").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
  const imgsOf = x => {
    const out = [];
    for (const g of x.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>|<v:shape\b[\s\S]*?<\/v:shape>/g)) {
      const d = g[0];
      const key = "d" + (seq++);
      if (d.startsWith("<w:drawing")) {
        const id = (d.match(/<a:blip\b[^>]*r:embed="(rId\d+)"/) || [])[1];
        if (!id) continue;
        const sr = (d.match(/<a:srcRect\b[^>]*\/>/) || [""])[0];
        const pc = k => Math.max(0, Number((sr.match(new RegExp("\\b" + k + '="(-?\\d+)"')) || [])[1] || 0) / 100000);
        const ext = d.match(/<wp:extent\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
        out.push({ id, key, crop: { l: pc("l"), t: pc("t"), r: pc("r"), b: pc("b") }, w: ext ? Number(ext[1]) / 9525 : 0, h: ext ? Number(ext[2]) / 9525 : 0 });
      } else {
        const im = (d.match(/<v:imagedata\b[^>]*>/) || [""])[0];
        const id = (im.match(/r:id="(rId\d+)"/) || [])[1];
        if (!id) continue;
        const fr = k => { const v = im.match(new RegExp("\\bcrop" + k + '="(-?[\\d.]+)(f?)"')) || []; if (!v[1]) return 0; const n = Number(v[1]); return Math.max(0, v[2] ? n / 65536 : n); };
        const st = (d.match(/style="([^"]*)"/) || [])[1] || "";
        const dim = k => { const v = st.match(new RegExp("\\b" + k + ":([\\d.]+)(pt|in|px)?")); if (!v) return 0; const n = Number(v[1]); return v[2] === "in" ? n * 96 : v[2] === "px" ? n : n * 4 / 3; };
        out.push({ id, key, crop: { l: fr("left"), t: fr("top"), r: fr("right"), b: fr("bottom") }, w: dim("width"), h: dim("height") });
      }
    }
    return out;
  };
  const re = /<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g;
  let m;
  while ((m = re.exec(body))) {
    const tok = m[0];
    if (tok.startsWith("<w:tbl")) {
      for (const row of tok.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || []) {
        const cells = row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
        blocks.push({ text: cells.map(textOf).join(" | "), images: imgsOf(row) });
      }
    } else blocks.push({ text: textOf(tok), images: imgsOf(tok) });
  }
  return blocks;
}

async function mediaMap(zip) {
  const rels = await zip.file("word/_rels/document.xml.rels")?.async("string") || "";
  const map = {};
  for (const r of rels.matchAll(/<Relationship\b[^>]*>/g)) {
    const id = (r[0].match(/Id="([^"]+)"/) || [])[1];
    const target = (r[0].match(/Target="([^"]+)"/) || [])[1];
    if (id && target && /media\//.test(target)) map[id] = "word/" + target.replace(/^\.\//, "").replace(/^\/word\//, "");
  }
  return map;
}

const startsQuestion = b => QSTART.test(b.text.split("|")[0]) || QSTART.test(b.text);

async function attachDocxImages(buffer, test, save) {
  const report = [];
  const targets = (test.questions || []).filter(q => (q.type === "multiple_choice" || q.type === "short_answer") && (q.hasImage || NEEDS_IMAGE.test(q.prompt) || INSTR_IMAGE.test(q.instruction || "")));
  if (!targets.length) return { targets: 0, attached: 0, report };
  const zip = await JSZip.loadAsync(buffer);
  const docFile = zip.file("word/document.xml");
  if (!docFile) return { targets: targets.length, attached: 0, report };
  const xml = await docFile.async("string");
  const blocks = blocksOf((xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [, xml])[1]);
  const media = await mediaMap(zip);
  const used = new Set();
  let cursor = 0, attached = 0;
  for (const q of [...targets].sort((a, b) => a.number - b.number)) {
    const keys = [norm(q.prompt).slice(0, 40), norm(String(q.prompt).split(/[?\[(:]/)[0]).slice(0, 40)].filter(k => k.length >= 8);
    let at = -1;
    for (const key of keys) {
      for (let i = cursor; i < blocks.length; i++) {
        if (!norm(blocks[i].text).includes(key)) continue;
        const n = (blocks[i].text.match(QSTART) || [])[1];
        if (!n || Number(n) === q.number || at < 0) { at = i; if (!n || Number(n) === q.number) break; }
      }
      if (at >= 0) break;
    }
    if (at < 0) for (let i = cursor; i < blocks.length; i++) { const n = (blocks[i].text.match(QSTART) || [])[1]; if (n && Number(n) === q.number) { at = i; break; } }
    if (at < 0) { report.push(`? Câu ${q.number}: không tìm thấy trong file`); continue; }
    const pick = [];
    const take = i => { const seen = new Set(); for (const im of blocks[i].images) { const sig = im.id + JSON.stringify(im.crop); if (!used.has(im.key) && media[im.id] && !seen.has(sig)) { seen.add(sig); pick.push(im); } } };
    take(at);
    for (let j = at + 1; !pick.length && j < blocks.length && j <= at + 8; j++) {
      if (startsQuestion(blocks[j]) || /^\s*(part|section|[ivx]+\.)\s/i.test(blocks[j].text)) break;
      take(j);
    }
    for (let j = at - 1; !pick.length && j >= Math.max(0, at - 3); j--) {
      if (norm(blocks[j].text).length > 20 && !blocks[j].images.length) break;
      take(j);
      if (startsQuestion(blocks[j])) break;
    }
    cursor = at + 1;
    const urls = [];
    for (const p of pick) {
      used.add(p.key);
      if (p.w && p.h && Math.max(p.w, p.h) < 24) continue;
      const ext = path.extname(media[p.id]).toLowerCase();
      if (!WEB_MIME[ext]) continue;
      const buf = await zip.file(media[p.id])?.async("nodebuffer");
      if (!buf || buf.length < 600) continue;
      const url = await save(buf, ext === ".jpeg" ? ".jpg" : ext, WEB_MIME[ext]);
      if (!url) continue;
      const c = p.crop, cropped = c.l + c.t + c.r + c.b > 0.01 && c.l + c.r < 0.95 && c.t + c.b < 0.95;
      urls.push(cropped ? { src: url, crop: [c.l, c.t, c.r, c.b].map(v => Number(v.toFixed(4))), ratio: p.w && p.h ? Number((p.w / p.h).toFixed(4)) : null } : url);
    }
    if (!urls.length) { report.push(`- Câu ${q.number}: không có ảnh gần câu hỏi`); continue; }
    q.images = urls.filter((u, k) => urls.findIndex(v => JSON.stringify(v) === JSON.stringify(u)) === k);
    const emptyOpts = q.type === "multiple_choice" && q.options.length && q.options.every(o => !String(o.text || "").replace(/<[^>]+>/g, "").trim());
    if (emptyOpts && q.images.length === q.options.length) { q.options.forEach((o, k) => { o.image = q.images[k]; }); q.images = []; }
    const m = String(q.keyNote || "").match(/^Đáp án đổi ([A-D]) → ([A-D]):/);
    if (m && q.answer === m[2]) { q.answer = m[1]; q.keyNote = `Giữ đáp án gốc ${m[1]} (câu có hình, AI không nhìn thấy hình khi kiểm tra)`; }
    attached++;
    report.push(`+ Câu ${q.number}: ${q.images.length || q.options.length} ảnh`);
  }
  if (Array.isArray(test.questions)) {
    test.keyIssues = test.questions.filter(q => q.keyNote).map(q => ({ id: q.id, number: q.number, note: q.keyNote }));
    if (test.summary) test.summary.keyIssueCount = test.keyIssues.length;
  }
  return { targets: targets.length, attached, report };
}

module.exports = { attachDocxImages };
