# Embed App — Handover

**Branch:** `shelfoptix`. **Written:** 17 August 2026. **Owner while active:** Dong (Marcus) Le.
**Status:** working demo, runs locally, deliberately not hosted.

This covers the **host application** only. The Holistics side — models, dataset, dashboard, portal, permissions — has its own handover in the `shelfoptix-poc-aml` repo, and that one carries the open data questions. Read both if you are picking up the whole thing.

`README.md` in this repo is a **build guide for customers**, written to teach the pattern. It is not a description of this codebase. This file is.

---

## Where things stand

| | |
|---|---|
| App | Runs locally: `npm run server` + `npm run dev` → https://localhost:5173 |
| Hosted anywhere | **No, and deliberately** — see [Why this is not deployed](#why-this-is-not-deployed) |
| Password | **Check is stubbed.** Any value signs you in, empty included |
| Row-level scoping | Enforced Holistics-side, per user, verified live |
| Credentials | `.env` on Marcus's machine only |

---

## What to work on next

### 1. If anyone wants this hosted, do these three things first

In order of how badly they matter:

1. **Restore the password check.** One function body in `netlify/functions/_auth.js` — the original constant-time compare is kept verbatim in a comment there. Right now any visitor gets the Masterview account, which sees every state and department.
2. **Give each user their own password**, stored as a scrypt hash rather than plaintext. `node:crypto` has scrypt built in, so no new dependency. Today one shared password means the email dropdown *is* the authorisation — pick Masterview and you are Masterview.
3. **Create a separate Netlify site.** Do not reuse `shelfoptix-embed-demo`; it serves a different demo (see below).

Also worth adding at that point: rate limiting on `/api/login`. Netlify functions are stateless, so this needs Netlify Blobs for a counter or an accepted delay.

### 2. Delete the dead Cloudflare directories

`functions/api/` and `frontend/functions/api/` are leftovers from a Cloudflare Pages deployment this project no longer uses. They contain an **older copy of the persona list and token logic** — a real trap, because someone could edit the wrong one and wonder why nothing changed. `netlify/functions/` is the live code.

### 3. Consider backing up the portal credentials

`.env` on one laptop is the only copy of the portal key, portal secret and session secret. The session secret is trivially regenerated. The portal key and secret would need re-issuing from **Tools → Embedded Analytics**. A 1Password item in a non-personal vault would fix this — deliberately not created, because server secrets that bypass the login should not share a vault with a password shared to three people.

---

## How it works

Five functions, one React app.

```
frontend/src/App.jsx          login screen + portal iframe + dev panel
netlify/functions/
  _users.js                   the four users and buildPayload()  ← single source of truth
  _auth.js                    password check (stubbed) + session issue/verify
  login.js                    POST { email, password } → { user, session }
  embed-token.js              POST + Bearer session → { embedUrl, payload }
  config.js                   the user list, for the login dropdown
backend/server.js             local dev server; imports the same modules
```

`backend/server.js` **imports** from `netlify/functions/`, it does not copy. Change the user list once and local dev and the functions agree.

### The request flow

1. `/api/config` gives the login screen the four accounts.
2. `/api/login` verifies (currently: accepts anything), returns a session JWT signed with `SHELFOPTIX_SESSION_SECRET`, valid 8 hours.
3. `/api/embed-token` requires that session in an `Authorization: Bearer` header, reads the user **out of the token**, and signs an embed JWT with the portal secret.
4. The app renders the returned URL in an iframe.

### The one design decision worth preserving

**`/api/embed-token` ignores the request body.** Identity comes from the signed session.

The first version took a user id from the body, which meant anyone could POST to it naming any persona and get that persona's data — a login screen in front of that is decoration. This is the part that makes the scoping real, and it survives even with the password stubbed:

```
POST /api/embed-token   Authorization: Bearer <Myri's session>   body: {"user":"masterview"}
→ mints a token for Myri
```

Worth re-testing after any change to the auth path.

### The four users

Defined in `netlify/functions/_users.js` and nowhere else.

| Name | Email | States | Departments | Capability |
|---|---|---|---|---|
| Amit | amarty@shelfoptix.com | GA | 5 field depts | Explorer |
| Randy | rwilson@retailgis.com | TN, KY | 5 field depts | Explorer |
| Myri | mdiazmartinez@shelfoptix.com | GA, TN, KY | 3 care depts | Standard |
| Masterview | mv@shelfoptix.com | All (`__ALL__`) | All (`__ALL__`) | Explorer |

Explorer → `org_workspace_role: editor`, AI on, personal workspace. Standard → `no_access`, AI off, no saving.

**Adding or changing a user** is one edit to that file plus a restart of `npm run server`. No AML change: the permissions match whatever the token carries.

---

## Why this is not deployed

`shelfoptix-embed-demo.netlify.app` serves the **demo4 retailer/manufacturer demo** — a different app, on a different Holistics tenant, built from commit `ef1aecb`. This branch previously took that site over. It has been restored, and `netlify.toml` was removed from this branch so nothing here suggests deploying is supported.

The RetailFocus portal this app embeds is a customer POC reaching real customer data behind what is now no password at all. It runs on a laptop and is shown by screen share. There is deliberately no link to send — a URL outlives the meeting in a way a screen share does not.

**The five RetailFocus variables have been removed from that Netlify site.** Six remain, all belonging to the demo4 app.

---

## Running it

```bash
npm install          # once
npm run server       # terminal 1 — API on :3001, reads .env
npm run dev          # terminal 2 — app on https://localhost:5173
```

Accept the self-signed certificate warning. Sign in with any of the four emails and anything at all in the password field.

`.env` needs `HOLISTICS_SHELFOPTIX_PORTAL_KEY`, `HOLISTICS_SHELFOPTIX_PORTAL_SECRET`, `SHELFOPTIX_SESSION_SECRET`, `HOLISTICS_HOST`. `SHELFOPTIX_DEMO_PASSWORD` is no longer read.

Stop both:

```bash
pkill -f "backend/server.js"; pkill -f "vite --config"
```

### If the certificate warning blocks you

Some browser extensions refuse to let you interact with a self-signed origin — a password manager did exactly that during this build. Fall back to plain HTTP:

```bash
npm run build
npx serve dist -l 4173     # plus `npm run server`, and a proxy for /api/*
```

---

## Gotchas

**Netlify keeps the previous deploy's functions if you deploy without `--functions`.** We deployed a placeholder to take the app offline and `/api/config` kept serving the full user list. Always pass the flag explicitly, even when the answer is an empty directory.

**`netlify env:set` with stacked `--context` flags fails silently and exits 0.** Five variables reported success and none was set. Use one context, or none.

**Netlify env changes need a redeploy** to reach a running site.

**`.env` is gitignored; `.env.backup-*` is not.** A backup file sat one `git add -A` away from committing portal secrets. Do not leave copies in the repo directory.

**The password generator matters.** The first generated password contained `#`, which `.env` treats as a comment marker — the value was silently truncated and login failed while the file looked correct. Quote the value, and avoid `# $ " ' \ =`.

**Two legacy function directories exist.** See item 2 above.

---

## Reference

| | |
|---|---|
| Holistics side | `shelfoptix-poc-aml`, see its `HANDOVER.md` |
| Portal | `retailfocus_portal` on us.holistics.io, project `1099511670432` |
| Netlify site (demo4, not this app) | `shelfoptix-embed-demo`, id `be17300d-2bb5-4cbb-b452-0dd8f7652435` |
| Login password, if the check is restored | 1Password `Employee` vault, item `zwusu5ixh4ims2m3x4oegzobey` |
| Build guide for customers | `README.md` in this repo |

Verify the app end to end after any auth change:

```bash
npm run server
python3 - <<'EOF'
import json, urllib.request, ssl
ctx=ssl.create_default_context(); ctx.check_hostname=False; ctx.verify_mode=ssl.CERT_NONE
def post(p,b,h=None):
    r=urllib.request.Request("https://localhost:5173"+p, data=json.dumps(b).encode(),
        headers={"Content-Type":"application/json", **(h or {})})
    return json.load(urllib.request.urlopen(r, context=ctx))
s=post("/api/login", {"email":"mdiazmartinez@shelfoptix.com","password":"anything"})
d=post("/api/embed-token", {"user":"masterview"}, {"Authorization":"Bearer "+s["session"]})
print("minted for:", d["payload"]["embed_user_id"], "(must be myri, not masterview)")
print("scope:", d["payload"]["user_attributes"])
EOF
```
