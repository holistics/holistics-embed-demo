import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { Readable } from "node:stream";

import { onRequestGet as getConfig } from "./functions/api/config.js";
import { onRequestPost as createEmbedToken } from "./functions/api/embed-token.js";

const port = Number(process.env.PORT || 8080);
const dist = join(import.meta.dirname, "dist");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};
const securityHeaders = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src https://demo4.holistics.io; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
  "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
};

async function sendWebResponse(response, res) {
  res.writeHead(response.status, Object.fromEntries(response.headers));
  if (response.body) Readable.fromWeb(response.body).pipe(res);
  else res.end();
}

function serveStatic(method, pathname, res) {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  let filePath = normalize(join(dist, relativePath));

  if (!filePath.startsWith(`${dist}/`) || !existsSync(filePath) || statSync(filePath).isDirectory()) {
    filePath = join(dist, "index.html");
  }

  res.writeHead(200, {
    ...securityHeaders,
    "Content-Length": statSync(filePath).size,
    "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
  });

  if (method === "HEAD") res.end();
  else res.end(readFileSync(filePath));
}

createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json", "X-Content-Type-Options": "nosniff" });
    return res.end('{"status":"ok"}');
  }

  if (req.method === "GET" && url.pathname === "/api/config") {
    return sendWebResponse(await getConfig({ env: process.env }), res);
  }

  if (req.method === "POST" && url.pathname === "/api/embed-token") {
    const request = new Request(url, {
      method: "POST",
      headers: req.headers,
      body: Readable.toWeb(req),
      duplex: "half",
    });
    return sendWebResponse(await createEmbedToken({ request, env: process.env }), res);
  }

  if (req.method === "GET" || req.method === "HEAD") return serveStatic(req.method, url.pathname, res);

  res.writeHead(405, { Allow: "GET, HEAD, POST" });
  res.end();
}).listen(port, "0.0.0.0", () => console.log(`SCSI client portal listening on ${port}`));
