// ============================================================
// DOCX -> văn bản thuần có giữ:
//   - phần GẠCH CHÂN  -> <u>...</u>   (đề ngữ âm: "underlined part pronounced differently")
//   - phần IN ĐẬM     -> <b>...</b>   (tiêu đề phần / yêu cầu task)
//   - bảng            -> mỗi hàng một dòng, các ô cách nhau " | " (đáp án dạng bảng không bị dính)
//   - tab / xuống dòng trong đoạn
// mammoth.extractRawText bỏ hết định dạng nên học sinh không biết chữ nào được gạch chân.
// ============================================================
const JSZip = require("jszip");

const XML_ENT = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'" };
function decodeXml(s) {
  return String(s || "").replace(/&(amp|lt|gt|quot|apos);/g, m => XML_ENT[m]).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

// Đọc một đoạn <w:p>...</w:p> -> chuỗi có <u>/<b>
function paragraphText(pXml) {
  const out = [];
  let curU = false, curB = false;
  const runRe = /<w:r\b[^>]*>([\s\S]*?)<\/w:r>|<w:hyperlink\b[^>]*>([\s\S]*?)<\/w:hyperlink>/g;
  const pieces = [];
  let m;
  // Hyperlink chứa run bên trong: xử lý đệ quy đơn giản bằng cách bung ra
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
  // Gộp các run liền nhau cùng định dạng
  for (const p of pieces) {
    if (p.u !== curU) { out.push(p.u ? "<u>" : "</u>"); curU = p.u; }
    if (p.b !== curB) { out.push(p.b ? "<b>" : "</b>"); curB = p.b; }
    out.push(p.text);
  }
  if (curU) out.push("</u>");
  if (curB) out.push("</b>");
  return out.join("")
    // Gạch chân/đậm chỉ bao khoảng trắng thì bỏ
    .replace(/<u>(\s*)<\/u>/g, "$1").replace(/<b>(\s*)<\/b>/g, "$1")
    // </u> <u> liền nhau -> nối
    .replace(/<\/u>(\s*)<u>/g, "$1").replace(/<\/b>(\s*)<b>/g, "$1");
}

// Chuyển thân document (đã bỏ bảng lồng nhau ở mức đơn giản) -> các dòng
function bodyToLines(xml) {
  const lines = [];
  // Tách theo bảng và đoạn ở mức cao nhất
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

// Bỏ thẻ định dạng khi cần văn bản thuần (vd. so khớp đáp án, TTS)
function stripMarks(s) { return String(s || "").replace(/<\/?[ub]>/g, ""); }

module.exports = { docxToText, stripMarks };
