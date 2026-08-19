#!/usr/bin/env node
//
// Generates one strong password per account, writes it straight into
// 1Password, and prints only the scrypt hashes for Vercel.
//
//   node scripts/provision-1password.mjs --vault "Employee"
//   node scripts/provision-1password.mjs --vault "Employee" --combined
//   node scripts/provision-1password.mjs --vault "Employee" --dry-run
//   node scripts/provision-1password.mjs --vault "Employee" myri
//
// THE PLAINTEXT IS NEVER PRINTED and never touches your shell history or a
// clipboard. It goes generate -> 1Password and nowhere else. What comes back
// on stdout is the SHELFOPTIX_PW_<ID> hash lines to paste into Vercel.
//
// It is also never passed as a command-line argument, because argv is
// visible to anyone who can run `ps` on this machine. Each item is written
// through a temp JSON template with mode 600 that is deleted immediately
// afterwards, including on failure.
//
// WHY ONE ITEM PER PERSON. Each account has its own password, and the point
// of that is isolation: Myri's password opens Myri's three departments and
// nothing else. Put all four in one item and share it, and every recipient
// holds the Masterview password, which is states ALL and depts ALL, the
// whole 560 store estate. So the per-person items are what you share
// outward, one secure link each.
//
// The customer users are external (shelfoptix.com, retailgis.com), so they
// cannot be added to an employee vault. Share each item individually with
// 1Password's "Share item" link, which is time limited and needs no account
// on their side.
//
// --combined additionally writes ONE internal item holding all four, for
// whoever runs demos and needs to switch personas. Keep that one in the
// employee vault and do not share it outward.
//
// AFTER RUNNING THIS the deployment still has the OLD hashes. Paste the
// printed lines into Vercel project settings, then redeploy, or nobody can
// sign in with the new passwords.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import { USERS, CAPABILITY_LABEL, ALL } from "../netlify/functions/_users.js";
import { hashPassword, passwordEnvVar } from "../netlify/functions/_auth.js";

const APP_URL = "https://shelfoptix-retailfocus-app.vercel.app";

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

const scopeText = (v) => (v === ALL ? "All" : v.join(", "));

function op(args, { input } = {}) {
  return execFileSync("op", args, {
    encoding: "utf8",
    stdio: input ? ["pipe", "pipe", "pipe"] : ["ignore", "pipe", "pipe"],
    input,
  });
}

// Writes the template to a 600 temp file, creates the item, then removes the
// file. The password is in that file for the lifetime of one op invocation
// and in no argv at any point.
function createItem(vault, template, dryRun) {
  if (dryRun) {
    const redacted = JSON.parse(JSON.stringify(template));
    for (const f of redacted.fields || []) {
      if (f.type === "CONCEALED") f.value = "<redacted>";
    }
    // stderr, not stdout: stdout carries the hashes only, so
    // `... > vercel.env` captures exactly what you paste and nothing else.
    console.error(`\n--- would create in vault "${vault}" ---`);
    console.error(JSON.stringify(redacted, null, 2));
    return;
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "op-provision-"));
  const file = path.join(dir, "item.json");
  try {
    fs.writeFileSync(file, JSON.stringify(template), { mode: 0o600 });
    op(["item", "create", "--vault", vault, "--template", file]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function loginTemplate(user, plain) {
  return {
    title: `ShelfOptix RetailFocus - ${user.name}`,
    category: "LOGIN",
    urls: [{ label: "website", primary: true, href: APP_URL }],
    fields: [
      { id: "username", type: "STRING", purpose: "USERNAME", label: "username", value: user.email },
      { id: "password", type: "CONCEALED", purpose: "PASSWORD", label: "password", value: plain },
      {
        id: "notesPlain",
        type: "STRING",
        purpose: "NOTES",
        label: "notesPlain",
        value: [
          `${user.name} (${user.org})`,
          `States: ${scopeText(user.states)}`,
          `Departments: ${scopeText(user.depts)}`,
          `Access: ${CAPABILITY_LABEL[user.capability]}`,
          "",
          "Scope is enforced by row-level permission on the Holistics dataset,",
          "not by the app. This password opens this account only.",
        ].join("\n"),
      },
    ],
  };
}

function combinedTemplate(issued) {
  return {
    title: "ShelfOptix RetailFocus - all demo accounts (INTERNAL)",
    category: "SECURE_NOTE",
    fields: [
      {
        id: "notesPlain",
        type: "STRING",
        purpose: "NOTES",
        label: "notesPlain",
        value: [
          "Internal only. Do NOT share this item outward.",
          "",
          "It holds every account including Masterview, which sees all 560",
          "stores and every department. Each customer user gets their own",
          "item and their own share link instead.",
          "",
          APP_URL,
        ].join("\n"),
      },
      ...issued.map(({ user, plain }) => ({
        id: user.id,
        section: { id: "accounts", label: "Accounts" },
        type: "CONCEALED",
        label: `${user.name} (${user.email})`,
        value: plain,
      })),
    ],
  };
}

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const combined = argv.includes("--combined");
const vaultIndex = argv.indexOf("--vault");
const vault = vaultIndex >= 0 ? argv[vaultIndex + 1] : null;
const wanted = argv.filter((a, i) => !a.startsWith("--") && i !== vaultIndex + 1);

if (!vault) {
  console.error('Missing --vault. Run `op vault list` to see the names, then:');
  console.error('  node scripts/provision-1password.mjs --vault "Employee"');
  process.exit(1);
}

if (!dryRun) {
  // `op whoami` reports "not signed in" even when desktop app integration is
  // working, so it is a useless gate. Reading the target vault checks the
  // two things that actually matter: we are authorised, and the vault exists
  // before we start writing items into it.
  try {
    op(["vault", "get", vault]);
  } catch (err) {
    console.error(`Cannot read vault "${vault}".`);
    console.error("Run `op signin`, then `op vault list` to check the name.");
    console.error(String(err.stderr || err.message).trim().split("\n").slice(-2).join("\n"));
    process.exit(1);
  }
}

const targets = wanted.length ? USERS.filter((u) => wanted.includes(u.id)) : USERS;
if (!targets.length) {
  console.error(`No matching accounts. Known ids: ${USERS.map((u) => u.id).join(", ")}`);
  process.exit(1);
}

const issued = targets.map((user) => ({ user, plain: generate() }));

for (const { user, plain } of issued) {
  createItem(vault, loginTemplate(user, plain), dryRun);
  console.error(`  ${dryRun ? "would write" : "wrote"}  ShelfOptix RetailFocus - ${user.name}`);
}

if (combined) {
  createItem(vault, combinedTemplate(issued), dryRun);
  console.error(`  ${dryRun ? "would write" : "wrote"}  all demo accounts (INTERNAL)`);
}

console.error(`\n=== paste into Vercel, then REDEPLOY or these do not take effect ===\n`);
for (const { user, plain } of issued) {
  console.log(`${passwordEnvVar(user)}=${hashPassword(plain)}`);
}
console.error(
  `\nVercel: https://vercel.com/holistics1/shelfoptix-retailfocus-app/settings/environment-variables` +
    `\nShare each per-person item with 1Password's "Share item" link, one per` +
    `\nrecipient. Do not share the combined item.\n`
);
