const fs = require("fs");
const path = require("path");
const { minify } = require("terser");

const cache = new Map();

async function build(file) {
  const stat = fs.statSync(file);
  const hit = cache.get(file);
  if (hit && hit.mtime === stat.mtimeMs) return hit.code;
  const src = fs.readFileSync(file, "utf8");
  let code = src;
  try {
    const out = await minify(src, { compress: { passes: 2, drop_debugger: false }, mangle: true, format: { comments: false } });
    if (out && out.code) code = out.code;
  } catch (e) {
    console.warn("[minify] giữ nguyên", path.basename(file), e.message);
  }
  cache.set(file, { mtime: stat.mtimeMs, code });
  return code;
}

function middleware(publicDir) {
  const root = path.resolve(publicDir);
  return async (req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    if (!req.path.endsWith(".js")) return next();
    const file = path.resolve(root, "." + decodeURIComponent(req.path));
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return next();
    try {
      const code = await build(file);
      res.set("Content-Type", "application/javascript; charset=utf-8");
      res.set("Cache-Control", "public, max-age=604800");
      res.set("X-Content-Type-Options", "nosniff");
      return res.send(code);
    } catch (e) {
      return next();
    }
  };
}

async function warm(publicDir) {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return e.name === "unit-cache" ? [] : walk(p);
    return e.name.endsWith(".js") ? [p] : [];
  });
  const files = walk(path.resolve(publicDir));
  let before = 0, after = 0;
  for (const f of files) { before += fs.statSync(f).size; after += Buffer.byteLength(await build(f)); }
  return { files: files.length, before, after };
}

module.exports = { middleware, warm };
