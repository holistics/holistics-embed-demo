// =====================================================================
// Sign-in for the RetailFocus demo.
//
// THE PASSWORD CHECK IS OFF. Any value signs you in, including an empty
// one. The app runs on a laptop and is shown by screen share, so a
// password was friction protecting nothing -- there is no URL for anyone
// else to reach.
//
// The field is still on the screen and the flow is unchanged, because the
// point of the demo is showing a host app authenticating a user and
// exchanging that for a scoped embed token. Only the comparison is
// stubbed. passwordMatches() below is one line to restore.
//
// THIS MUST NOT BE DEPLOYED. Hosted, it would hand any visitor the
// Masterview account, which sees every state and every department.
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
import jwt from "jsonwebtoken";

const SESSION_TTL_SECONDS = 8 * 60 * 60; // a working day

export function authConfigError() {
  // SHELFOPTIX_DEMO_PASSWORD is no longer required -- nothing reads it.
  // The session secret still is: it signs the token /api/embed-token
  // trusts, and identity still comes from that signature rather than from
  // the request body.
  if (!process.env.SHELFOPTIX_SESSION_SECRET) return "SHELFOPTIX_SESSION_SECRET is not set.";
  return null;
}

// Local demo: every password is accepted, empty included.
//
// To put the check back, restore the body below. It was a constant-time
// compare over sha256 digests -- hashed first because timingSafeEqual
// throws on a length mismatch, which would itself leak the length:
//
//   const expected = process.env.SHELFOPTIX_DEMO_PASSWORD || "";
//   const a = crypto.createHash("sha256").update(String(candidate ?? ""), "utf8").digest();
//   const b = crypto.createHash("sha256").update(expected, "utf8").digest();
//   return crypto.timingSafeEqual(a, b);
export function passwordMatches() {
  return true;
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
