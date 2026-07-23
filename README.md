# Mercateam × Holistics — Embed Portal Demo

A small React app that embeds Mercateam's Holistics **Embed Portal** (`mercateam_portal`) — the
3 dashboards (Workstation Coverage, Skills per Employees, Training Timeline) + self-serve
Explore + Ask-AI — behind JWT auth, with **per-site row-level security**.

Each demo user is scoped to one or more **sites** (`site_id`). The token puts those in
`user_attributes.site_id`, and every dataset's `site_access` permission clips rows to them —
so a user only ever sees their own site(s)' data, including via Explore and Ask-AI.

## Tech stack
- **Frontend**: React + Vite + Tailwind
- **Backend (local)**: Node/Express + `jsonwebtoken`
- **Deploy**: Cloudflare Pages + Pages Functions (`functions/api/`)

## 1. Get your Embed Portal credentials (from Holistics)
1. In Holistics (**eu.holistics.io**), open the **`mercateam_portal`** Embed Portal.
2. Open its **Embed** settings → enable embedding.
3. Copy the two values:
   - **Embed Code** → this is the key in the URL (`/embed/<EMBED_CODE>`)
   - **Secret Key** → used to sign the JWT

## 2. Configure environment variables
Create a `.env` in the project root (git-ignored — never commit it):

```env
HOLISTICS_MERCATEAM_PORTAL_KEY=your_embed_code_here
HOLISTICS_MERCATEAM_PORTAL_SECRET=your_secret_key_here
```

> These are **new, Mercateam-specific** names — any existing tokens (e.g. other demos) in the
> same `.env` are left untouched. See `.env.example`.

## 3. Run locally
```bash
npm install

# terminal 1 — token backend on :3001
npm run server

# terminal 2 — frontend (Vite proxies /api → :3001)
npm run dev
```
Open the printed URL (**https://localhost:5173**) and accept the self-signed cert warning.

Use the **"Viewing as"** switcher (top-right) to change the embed user and watch the data
re-scope by site. Toggle **Show Dev Tools** (bottom-left) to inspect the JWT payload.

## Demo users (site scopes)
| User | site_id(s) | Sees |
|------|-----------|------|
| Rue du Perche — Site Manager | `Ce6amNfeKmH9XssxVCwT` | one site |
| Gerson — Site Manager | `3BD7SuGKJknq9C4cpwmR` | one site |
| Regional Lead — 2 sites | both of the above | multiple sites |

To add/change users or their site scope, edit **`functions/api/config.js`** (deploy) **and**
**`backend/server.js`** (local) — keep the two lists in sync.

## How scoping works
- The token's `user_attributes.site_id` is an **array** (a user can hold several sites).
- Each dataset (`workstation_coverage`, `skill_per_person`, `training_timeline`) has a
  `permission site_access { field: r(<model>.site_id) operator: 'matches_user_attribute' value: 'site_id' }`.
- Every dataset in the portal is scoped — dashboard filters are **not** security, so Explore /
  Ask-AI on an unscoped dataset would leak other sites. All three are covered.
- **View-only vs builder**: `permissions.enable_personal_workspace` in the token (`embed-token.js`
  / `server.js`) toggles whether users can build & save their own dashboards.

## Deploy (Cloudflare Pages)
```bash
npm run build
cp -r frontend/functions functions   # if needed; functions/ must sit beside dist/
CLOUDFLARE_ACCOUNT_ID=<id> wrangler pages deploy dist --project-name mercateam-embed-demo --commit-dirty=true
```
Set the secrets on the Pages project (same new names):
```bash
echo -n 'your_embed_code' | CLOUDFLARE_ACCOUNT_ID=<id> wrangler pages secret put HOLISTICS_MERCATEAM_PORTAL_KEY --project-name mercateam-embed-demo
echo -n 'your_secret'     | CLOUDFLARE_ACCOUNT_ID=<id> wrangler pages secret put HOLISTICS_MERCATEAM_PORTAL_SECRET --project-name mercateam-embed-demo
```

## Files to know
- `functions/api/embed-token.js` — signs the portal JWT (deploy)
- `backend/server.js` — same, for local dev
- `functions/api/config.js` / `backend/server.js` — portals + demo users
- `frontend/src/App.jsx` — the switcher + iframe UI
