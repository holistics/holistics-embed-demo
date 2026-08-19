// =====================================================================
// Sign-in for the RetailFocus app.
//
// PER-USER PASSWORDS. Each account has its own password; there is no
// shared one. This replaced a single SHELFOPTIX_DEMO_PASSWORD that any of
// the four emails could use, which was fine on a laptop and is not fine on
// a public URL fronting real ShelfOptix / P&G / Dollar General data.
//
// WHERE THE SECRETS LIVE. Hashes only, one env var per account, named
// SHELFOPTIX_PW_<ID> from the user id: SHELFOPTIX_PW_AMIT, _RANDY, _MYRI,
// _MASTERVIEW. Env vars rather than the user file because _users.js is
// committed and these must never be. Plaintext is never stored anywhere,
// by us or by the app.
//
// SCRYPT, not sha256. sha256 is a fast hash: with the digest in hand an
// attacker tries billions of candidates a second. scrypt is deliberately
// slow and memory-hard, so a leaked hash is not a leaked password. Node
// ships it, so this adds no dependency.
//
// EVERY COMPARISON IS CONSTANT TIME, and an unknown email costs the same
// as a known one, because verify() runs against a dummy hash rather than
// returning early. Otherwise response timing would enumerate the accounts
// that login.js is careful not to name.
//
// WHAT THIS STILL IS NOT. There is no lockout, no rotation, no revocation
// beyond changing SHELFOPTIX_SESSION_SECRET, and no per-attempt throttle.
// On a public URL the defence against brute force is password entropy, so
// generate them with scripts/generate-passwords.mjs and do not hand-pick
// them. Put a platform rate limit in front of this as well.
// =====================================================================
import crypto from "node:crypto";
import jwt from "jsonwebtoken";

import { USERS } from "./_users.js";

const SESSION_TTL_SECONDS = 8 * 60 * 60; // a working day

export function authConfigError() {
  if (!process.env.SHELFOPTIX_SESSION_SECRET) return "SHELFOPTIX_SESSION_SECRET is not set.";
  const missing = USERS.filter((u) => !process.env[passwordEnvVar(u)]).map((u) => passwordEnvVar(u));
  if (missing.length) {
    return `No password configured for ${missing.length} account(s): ${missing.join(", ")}.`;
  }
  return null;
}

export function assertDeployable() {
  const problem = authConfigError();
  if (!problem) return;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      `Refusing to start: ${problem} This app fronts real customer data; ` +
        "it must not run without a password check. See netlify/functions/_auth.js."
    );
  }
  console.warn(`[auth] ${problem} Sign-in will return 500 until it is set.`);
}

export function passwordEnvVar(user) {
  return `SHELFOPTIX_PW_${String(user.id).toUpperCase()}`;
}

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

// The hash is scrypt$N$r$p$<salt base64>$<key base64>, but it is STORED
// base64-encoded so the value holds no '$'.
//
// That is not decoration. Pasting the raw form into Vercel's bulk .env box
// silently mangled it: something in that path treats '$16384' and '$8' as
// shell-style interpolation, so what came back out was a short string that
// failed the six-part format check and returned false for every password.
// The symptom was a plain 401 with no clue, and because the variables are
// marked Sensitive they cannot be read back to see what landed.
//
// Base64 keeps the stored value to [A-Za-z0-9+/=], which no parser rewrites.
export function hashPassword(plain) {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(String(plain), salt, SCRYPT.keylen, SCRYPT);
  const raw = [
    "scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p,
    salt.toString("base64"), key.toString("base64"),
  ].join("$");
  return Buffer.from(raw, "utf8").toString("base64");
}

// Accepts either encoding. A value containing '$' is the old raw form, so
// existing local .env files keep working without a flag day.
function decodeStored(stored) {
  const s = String(stored).trim();
  if (s.includes("$")) return s;
  try {
    return Buffer.from(s, "base64").toString("utf8");
  } catch {
    return s;
  }
}

function verifyAgainstHash(stored, candidate) {
  const parts = decodeStored(stored).split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, N, r, p, saltB64, keyB64] = parts;
  const salt = Buffer.from(saltB64, "base64");
  const expected = Buffer.from(keyB64, "base64");
  const actual = crypto.scryptSync(String(candidate ?? ""), salt, expected.length, {
    N: Number(N), r: Number(r), p: Number(p),
  });
  return crypto.timingSafeEqual(actual, expected);
}

// A real scrypt hash of a value nobody knows. Verifying against this when
// the email is unknown makes a bad email cost the same as a bad password,
// so timing cannot enumerate the accounts.
const DUMMY_HASH = hashPassword(crypto.randomBytes(32).toString("hex"));

// Takes the USER, not just the candidate: each account has its own secret.
// An unknown user still burns a full scrypt verification.
export function passwordMatches(user, candidate) {
  const stored = user ? process.env[passwordEnvVar(user)] : null;
  if (!stored) {
    verifyAgainstHash(DUMMY_HASH, candidate);
    return false;
  }
  return verifyAgainstHash(stored, candidate);
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
