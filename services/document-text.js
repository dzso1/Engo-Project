const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const MAX_BYTES = 12 * 1024 * 1024;

function decodeDataUrl(documentBase64) {
  const raw = String(documentBase64 || "");
  if (!raw) throw new Error("Thiếu nội dung file.");
  const base64 = raw.includes(",") ? raw.split(",").pop() : raw;
  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) throw new Error("File rỗng hoặc không đọc được.");
  if (buffer.length > MAX_BYTES) throw new Error("File vượt quá 12 MB.");
  return buffer;
}

function detectKind(fileName, buffer) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".pdf") || buffer.slice(0, 4).toString() === "%PDF") return "pdf";
  if (lower.endsWith(".docx") || (buffer[0] === 0x50 && buffer[1] === 0x4b)) return "docx";
  if (lower.endsWith(".txt")) return "txt";
  return "unknown";
}

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/ /g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function extractDocumentText(documentBase64, fileName) {
  const buffer = decodeDataUrl(documentBase64);
  const kind = detectKind(fileName, buffer);
  if (kind === "pdf") {
    const data = await pdfParse(buffer);
    const text = cleanText(data.text);
    if (!text) throw new Error("PDF không chứa văn bản có thể đọc (có thể là file scan ảnh).");
    return { kind, text, pages: data.numpages || 0 };
  }
  if (kind === "docx") {
    const extracted = await mammoth.extractRawText({ buffer });
    const text = cleanText(extracted.value);
    if (!text) throw new Error("DOCX không chứa văn bản.");
    return { kind, text, pages: 0 };
  }
  if (kind === "txt") {
    return { kind, text: cleanText(buffer.toString("utf8")), pages: 0 };
  }
  throw new Error("Chỉ hỗ trợ file PDF, DOCX hoặc TXT.");
}

module.exports = { extractDocumentText, cleanText };
