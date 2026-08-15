// =====================================================================
// Sign-in for the RetailFocus demo.
//
// One shared password across the four accounts, held in
// SHELFOPTIX_DEMO_PASSWORD. It is checked here on the server and never
// leaves it: the browser posts a password, gets back a session token,
// and from then on carries the token rather than the password.
//
// WHY A SESSION TOKEN AND NOT JUST A BOOLEAN.
// The first cut of this app let the browser post a user id straight to
// /api/embed-token, so the server minted whatever identity it was asked
// for. Adding a password screen in front of that changes nothing on its
// own -- anyone can still POST to the token endpoint directly and skip
// the screen entirely. So /api/login issues a signed session and
// /api/embed-token derives the user FROM that session. The identity now
// comes from something the server signed, not from the request body.
//
// This is demo-grade, not an auth system: one shared password, no
// per-user credentials, no lockout, no rotation, no revocation beyond
// changing SHELFOPTIX_SESSION_SECRET. It is enough that a link to the
// site is not a link to the data, and no more than that.
// =====================================================================
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

const SESSION_TTL_SECONDS = 8 * 60 * 60; // a working day

export function authConfigError() {
  if (!process.env.SHELFOPTIX_DEMO_PASSWORD) return "SHELFOPTIX_DEMO_PASSWORD is not set.";
  if (!process.env.SHELFOPTIX_SESSION_SECRET) return "SHELFOPTIX_SESSION_SECRET is not set.";
  return null;
}

// Constant-time compare so the check cannot be probed a character at a
// time. Hash both sides first: timingSafeEqual throws on length mismatch,
// which would itself leak the password's length.
export function passwordMatches(candidate) {
  const expected = process.env.SHELFOPTIX_DEMO_PASSWORD || "";
  const a = crypto.createHash("sha256").update(String(candidate ?? ""), "utf8").digest();
  const b = crypto.createHash("sha256").update(expected, "utf8").digest();
  return crypto.timingSafeEqual(a, b);
}

export function issueSession(user) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { sub: user.id, email: user.email, iat: now, exp: now + SESSION_TTL_SECONDS },
    process.env.SHELFOPTIX_SESSION_SECRET,
    { algorithm: "HS256" }
  );
}

// Returns the user id the session was issued for, or null. Callers must
// treat null as "not signed in" and refuse to mint an embed token.
export function userIdFromRequest(headers = {}) {
  const raw = headers.authorization || headers.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim());
  if (!match) return null;
  try {
    return jwt.verify(match[1], process.env.SHELFOPTIX_SESSION_SECRET, { algorithms: ["HS256"] }).sub;
  } catch {
    // Expired, tampered with, or signed by a rotated secret. All the same
    // answer to the caller.
    return null;
  }
}

export { SESSION_TTL_SECONDS };
