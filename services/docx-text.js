const JSZip = require("jszip");

const XML_ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
function decodeXml(s) {
  return String(s || "").replace(/&(amp|lt|gt|quot|apos);/g, m => XML_ENT[m]).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function paragraphText(pXml) {
  const out = [];
  let curU = false, curB = false;
  const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>|<w:hyperlink\b[^>]*>([\s\S]*?)<\/w:hyperlink>/g;
  const pieces = [];
  let m;
  const flat = pXml.replace(/<w:hyperlink\b[^>]*>([\s\S]*?)<\/w:hyperlink>/g, "$1");
  while ((m = runRe.exec(flat))) {
    const run = m[1] || "";
    const rPr = (run.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/) || [])[1] || "";
    const u = /<w:u\b(?![^>]*w:val="none")/.test(rPr);
    const b = /<w:b\b(?![^>]*w:val="(?:0|false)")/.test(rPr) && !/<w:b\b[^>]*w:val="(?:0|false)"/.test(rPr);
    let text = "";
    const partRe = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<w:cr\s*\/>|<w:sym\b[^>]*\/>/g;
    let pm;
    while ((pm = partRe.exec(run))) {
      if (/^<w:tab/.test(pm[0])) text += "\t";
      else if (/^<w:t[\s>]/.test(pm[0])) text += decodeXml(pm[1]);
      else text += "\n";
    }
    if (!text) continue;
    pieces.push({ text, u, b });
  }
  for (const p of pieces) {
    if (p.u !== curU) { out.push(p.u ? "<u>" : "</u>"); curU = p.u; }
    if (p.b !== curB) { out.push(p.b ? "<b>" : "</b>"); curB = p.b; }
    out.push(p.text);
  }
  if (curU) out.push("</u>");
  if (curB) out.push("</b>");
  return out.join("")
    .replace(/<u>(\s*)<\/u>/g, "$1").replace(/<b>(\s*)<\/b>/g, "$1")
    .replace(/<\/u>(\s*)<u>/g, "$1").replace(/<\/b>(\s*)<b>/g, "$1");
}

function bodyToLines(xml) {
  const lines = [];
  const tokenRe = /<w:tbl\b[\s\S]*?<\/w:tbl>|<w:p\b[\s\S]*?<\/w:p>/g;
  let m;
  while ((m = tokenRe.exec(xml))) {
    const tok = m[0];
    if (tok.startsWith("<w:tbl")) {
      const rows = tok.match(/<w:tr\b[\s\S]*?<\/w:tr>/g) || [];
      for (const row of rows) {
        const cells = row.match(/<w:tc\b[\s\S]*?<\/w:tc>/g) || [];
        const cellTexts = cells.map(c => (c.match(/<w:p\b[\s\S]*?<\/w:p>/g) || []).map(paragraphText).map(s => s.trim()).filter(Boolean).join(" / "));
        const line = cellTexts.filter(Boolean).join(" | ");
        if (line.trim()) lines.push(line);
      }
      lines.push("");
    } else {
      lines.push(paragraphText(tok));
    }
  }
  return lines;
}

async function docxToText(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("File DOCX không hợp lệ (thiếu word/document.xml).");
  const xml = await doc.async("string");
  const body = (xml.match(/<w:body>([\s\S]*)<\/w:body>/) || [, xml])[1];
  return bodyToLines(body).join("\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ /g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripMarks(s) { return String(s || "").replace(/<\/?[ub]>/g, ""); }

module.exports = { docxToText, stripMarks };
