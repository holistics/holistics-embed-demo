#!/usr/bin/env node
//
// Generates one strong random password per account and prints both the
// plaintext and the env line to paste into .env (local) or Vercel project
// settings (deployed).
//
//   node scripts/generate-passwords.mjs            # all accounts
//   node scripts/generate-passwords.mjs myri       # just one
//
// The plaintext is printed ONCE, to your terminal, and is never written to
// disk by this script. Copy it into a password manager and give each person
// their own over a channel you trust. Lose it and you rerun this and replace
// the hash: there is no recovery, which is the point of storing only hashes.
//
// 20 characters from a 56-character alphabet is about 116 bits. That entropy
// IS the defence against brute force here, because the app has no lockout and
// no per-attempt throttle. Do not swap these for something memorable.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { USERS } from "../netlify/functions/_users.js";
import { hashPassword, passwordEnvVar } from "../netlify/functions/_auth.js";

// No l/I/1/0/O: these get read aloud and retyped.
const ALPHABET = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 20;

function generate() {
  const out = [];
  const limit = 256 - (256 % ALPHABET.length); // reject above this, no modulo bias
  while (out.length < LENGTH) {
    const byte = crypto.randomBytes(1)[0];
    if (byte >= limit) continue;
    out.push(ALPHABET[byte % ALPHABET.length]);
  }
  return out.join("");
}

const argv = process.argv.slice(2);
// --write updates .env in place instead of printing the env lines, so the
// hashes never pass through a clipboard or a chat window. The plaintext is
// still printed, because only you can put that somewhere safe.
const WRITE = argv.includes("--write");
const wanted = argv.filter((a) => !a.startsWith("--"));
const targets = wanted.length ? USERS.filter((u) => wanted.includes(u.id)) : USERS;

if (!targets.length) {
  console.error(`No matching accounts. Known ids: ${USERS.map((u) => u.id).join(", ")}`);
  process.exit(1);
}

// Generate once per account, then print both views of the same value.
const issued = targets.map((user) => ({ user, plain: generate() }));

console.log("\n=== PASSWORDS — shown once, store them now ===\n");
for (const { user, plain } of issued) {
  console.log(`  ${user.email.padEnd(32)} ${plain}`);
}

const lines = issued.map(({ user, plain }) => [passwordEnvVar(user), hashPassword(plain)]);

if (WRITE) {
  const envPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".env");
  let env = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8") : "";
  for (const [key, value] of lines) {
    const re = new RegExp(`^${key}=.*$`, "m");
    env = re.test(env) ? env.replace(re, `${key}=${value}`) : `${env.replace(/\s*$/, "")}\n${key}=${value}\n`;
  }
  fs.writeFileSync(envPath, env, { mode: 0o600 });
  console.log(`\n=== ${lines.length} hash(es) written to .env ===`);
} else {
  console.log("\n=== ENV LINES — paste into .env or Vercel, these are hashes ===\n");
  for (const [key, value] of lines) console.log(`${key}=${value}`);
}

console.log(
  "\nHashes are scrypt with a per-account random salt. They are safe to store;" +
    "\nthe plaintext above is not, and is not written anywhere by this script.\n"
);
