// Shared glue for the Vercel handlers.
//
// The business logic lives in netlify/functions/{_auth,_users}.js and is
// runtime-agnostic. Only the HTTP shape differs between hosts: Netlify
// takes an `event` and returns { statusCode, headers, body }, Vercel takes
// (req, res). These helpers keep that difference to one file so the three
// endpoints below cannot drift from their Netlify twins.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "";

export function applyCors(req, res) {
  // Same-origin in the normal deployment, so no header is needed at all.
  // ALLOWED_ORIGIN is here for the case where the frontend is served from a
  // different domain. Never "*": these endpoints mint scoped embed tokens.
  if (ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  }
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}

export function send(res, status, body) {
  res.setHeader("content-type", "application/json");
  // Never let a CDN or proxy hold an embed token or an account list.
  res.setHeader("cache-control", "no-store");
  res.status(status).send(JSON.stringify(body));
}

// Vercel parses JSON bodies for us, but tolerate a raw string too.
export function readBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return req.body;
}
