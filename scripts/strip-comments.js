const fs = require("fs");
const path = require("path");

function stripJs(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  let prevMeaning = "";
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") {
      let j = i + 2;
      while (j < n && src[j] !== "\n") j++;
      const lineStart = out.lastIndexOf("\n") + 1;
      const before = out.slice(lineStart);
      if (!before.trim()) {
        out = out.slice(0, lineStart);
        if (src[j] === "\n") j++;
      } else {
        out = out.replace(/[ \t]+$/, "");
      }
      i = j;
      continue;
    }
    if (c === "/" && d === "*") {
      let j = i + 2;
      while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j += 2;
      const lineStart = out.lastIndexOf("\n") + 1;
      const before = out.slice(lineStart);
      const after = src.slice(j, src.indexOf("\n", j) < 0 ? n : src.indexOf("\n", j));
      if (!before.trim() && !after.trim()) {
        out = out.slice(0, lineStart);
        if (src[j] === "\n") j++;
      } else {
        out = out.replace(/[ \t]+$/, "");
        if (before.trim() && after.trim()) out += " ";
      }
      i = j;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      let j = i + 1;
      let depth = 0;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (quote === "`" && src[j] === "$" && src[j + 1] === "{") { depth++; j += 2; continue; }
        if (quote === "`" && depth > 0 && src[j] === "}") { depth--; j++; continue; }
        if (src[j] === quote && depth === 0) { j++; break; }
        j++;
      }
      const chunk = src.slice(i, j);
      out += chunk;
      prevMeaning = quote;
      i = j;
      continue;
    }
    if (c === "/" && isRegexStart(prevMeaning)) {
      let j = i + 1, inClass = false, ok = false;
      while (j < n) {
        const ch = src[j];
        if (ch === "\\") { j += 2; continue; }
        if (ch === "\n") break;
        if (ch === "[") inClass = true;
        else if (ch === "]") inClass = false;
        else if (ch === "/" && !inClass) { j++; ok = true; break; }
        j++;
      }
      if (ok) {
        while (j < n && /[a-z]/i.test(src[j])) j++;
        out += src.slice(i, j);
        prevMeaning = "regex";
        i = j;
        continue;
      }
    }
    out += c;
    if (!/\s/.test(c)) prevMeaning = c;
    i++;
  }
  return tidy(out);
}

function isRegexStart(prev) {
  if (!prev) return true;
  if (prev === "regex") return false;
  return !/[a-zA-Z0-9_$)\]'"`]/.test(prev);
}

function tidy(text) {
  return text
    .split("\n")
    .map(line => line.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\n+/, "")
    .replace(/\n+$/, "\n");
}

function stripCss(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "*") {
      let j = i + 2;
      while (j < n && !(src[j] === "*" && src[j + 1] === "/")) j++;
      j += 2;
      const lineStart = out.lastIndexOf("\n") + 1;
      const rest = src.slice(j, src.indexOf("\n", j) < 0 ? n : src.indexOf("\n", j));
      if (!out.slice(lineStart).trim() && !rest.trim()) {
        out = out.slice(0, lineStart);
        if (src[j] === "\n") j++;
      } else {
        out = out.replace(/[ \t]+$/, "");
      }
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") { j += 2; continue; }
        if (src[j] === c) { j++; break; }
        j++;
      }
      out += src.slice(i, j);
      i = j;
      continue;
    }
    out += c;
    i++;
  }
  return tidy(out);
}

function stripHtml(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    if (src.startsWith("<!--", i) && !src.startsWith("<!--[", i)) {
      let j = src.indexOf("-->", i);
      j = j < 0 ? n : j + 3;
      const lineStart = out.lastIndexOf("\n") + 1;
      const rest = src.slice(j, src.indexOf("\n", j) < 0 ? n : src.indexOf("\n", j));
      if (!out.slice(lineStart).trim() && !rest.trim()) {
        out = out.slice(0, lineStart);
        if (src[j] === "\n") j++;
      } else {
        out = out.replace(/[ \t]+$/, "");
      }
      i = j;
      continue;
    }
    out += src[i];
    i++;
  }
  return tidy(out);
}

function stripSql(src) {
  return tidy(src.split("\n").filter(line => !/^\s*--/.test(line)).join("\n"));
}

const HANDLERS = { ".js": stripJs, ".css": stripCss, ".html": stripHtml, ".sql": stripSql };
const SKIP_DIRS = new Set(["node_modules", ".git", ".import", "fonts", "images", "unit-cache", ".claude"]);

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (HANDLERS[path.extname(entry.name).toLowerCase()]) acc.push(p);
  }
  return acc;
}

const root = path.resolve(process.argv[2] || ".");
const files = walk(root);
let changed = 0;
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const crlf = before.includes("\r\n");
  const src = crlf ? before.split("\r\n").join("\n") : before;
  const after = HANDLERS[path.extname(file).toLowerCase()](src);
  if (after === src) continue;
  fs.writeFileSync(file, crlf ? after.split("\n").join("\r\n") : after);
  changed++;
  console.log(path.relative(root, file), before.length, "->", after.length);
}
console.log("files changed:", changed, "/", files.length);
