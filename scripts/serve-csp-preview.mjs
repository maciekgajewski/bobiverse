#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const host = process.env.CSP_PREVIEW_HOST ?? "127.0.0.1";
const port = Number(process.env.CSP_PREVIEW_PORT ?? 4202);

export const CSP_HEADER =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'";

const types = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".ttf", "font/ttf"],
  [".otf", "font/otf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".svg", "image/svg+xml"],
  [".json", "application/json"],
  [".md", "text/markdown; charset=utf-8"],
]);

function setSecurityHeaders(res) {
  res.setHeader("Content-Security-Policy", CSP_HEADER);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error(`CSP preview: missing ${root}/index.html. Run npm run build first.`);
  process.exit(1);
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? "/", "http://127.0.0.1").pathname);
  } catch {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }
  if (pathname.endsWith("/")) pathname += "index.html";
  const file = path.normalize(path.join(root, pathname));
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.statusCode = 403;
    res.end("Forbidden");
    return;
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      fs.readFile(path.join(root, "index.html"), (fallbackError, html) => {
        if (fallbackError) {
          res.statusCode = 404;
          res.end("Not found");
          return;
        }
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
      return;
    }
    res.setHeader(
      "Content-Type",
      types.get(path.extname(file)) ?? "application/octet-stream",
    );
    res.end(data);
  });
});

server.listen(port, host, () => {
  console.log(`CSP preview http://${host}:${port}/ (root ${root})`);
});
