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
1. In Holistics (**eu.holistics.io**), go to `Embedded Analytics,` preview the **`mercateam_portal`** Embed Portal.
2. View the integration code.
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

## Demo users
| User | Sees |
|------|------|
| Rue du Perche — Site Manager | one site |
| Gerson — Site Manager | one site |
| Regional Lead — 2 sites | multiple sites |

The exact site scope for each user is shown on the app's **Users** page. To add/change users or
their scope, edit **`functions/api/config.js`** (deploy) **and** **`backend/server.js`** (local) —
keep the two lists in sync.

## How scoping works
- The token's `user_attributes.site_id` is an **array** (a user can hold several sites).
- Each dataset (`workstation_coverage`, `skill_per_person`, `training_timeline`) has a
  `permission site_access { field: r(<model>.site_id) operator: 'matches_user_attribute' value: 'site_id' }`.
- Every dataset in the portal is scoped — dashboard filters are **not** security, so Explore /
  Ask-AI on an unscoped dataset would leak other sites. All three are covered.

## Workspaces & user-built dashboards
Docs: [user-built dashboards](https://docs.holistics.io/embedded/user-built-dashboards) ·
[identity & workspace](https://docs.holistics.io/embedded/identity-workspace)

Embed users can build their own dashboards on top of the portal's datasets. What they can do is
set by **two independent fields** in the token's `permissions` (in `embed-token.js` / `server.js`),
plus the top-level `embed_org_id`:

| Field | Values | Controls |
|-------|--------|----------|
| `org_workspace_role` | `no_access` (default) · `viewer` · `editor` | The **shared** (org) workspace |
| `enable_personal_workspace` | `false` (default) · `true` | A **private** personal workspace |

**`org_workspace_role`:** `no_access` = can't see the shared workspace · `viewer` = view shared
dashboards, can't edit · `editor` = create / edit / delete shared dashboards.
**`enable_personal_workspace: true`** = a private space to build/save dashboards only that user sees.

The combination is the "tier":

| `org_workspace_role` | `enable_personal_workspace` | View shared | Build personal | Build shared | Tier |
|---|---|:--:|:--:|:--:|---|
| `viewer` | `false` | ✓ | ✗ | ✗ | **Viewer** |
| `no_access` | `true` | ✗ | ✓ | ✗ | **Personal Creator** |
| `editor` | `false` | ✓ | ✗ | ✓ | **Company Creator** |
| `editor` | `true` | ✓ | ✓ | ✓ | Company Creator + personal (full) |

> This demo puts **every** user on the full tier: `org_workspace_role: "editor"` +
> `enable_personal_workspace: true`. For a real rollout, map tiers per user (floor users →
> `viewer`, power users → personal-only, deployment leads → `editor`).

### `embed_org_id` — the shared-workspace boundary
`embed_org_id` (set from each user's `orgId`) defines **who shares a workspace**:
- Users with the **same** `embed_org_id` see and share the same shared dashboards.
- Different `embed_org_id`s are **fully isolated** — a shared dashboard never crosses orgs.
- It's a **single value per token** (not a list). Holistics identifies a user as
  `embed_org_id` + `embed_user_id`, so the **same person under a different org is a different
  identity** with its own separate personal workspace. To move someone across orgs you mint a new
  token — their dashboards don't follow them. (Contrast `site_id`, which is a multi-value
  `user_attributes` array — one user can *see* many sites but *belongs to* one sharing org.)

This single-org model is exactly the isolation Mercateam wants: an embed user can only ever share
within their own org, never across customers.

**Not governed by these roles:** (1) **Explore / drill-down** is gated by whether a dataset is
*included in the portal*, not by `org_workspace_role` — that's why every dataset needs its own
`site_access` RLS. (2) Embed users **cannot create datasets/models** — they build dashboards from
datasets the Holistics/deployment team provides.

### Sharing test setup (this demo)
Rue du Perche, Gerson and Regional Lead share `orgId: "org-region-nord"`, so a dashboard one of
them saves to the **shared** workspace appears for the other two — while each still sees only their
own site's rows (RLS is independent of the org). Genouillac has its own org
(`org-eurocoustic-genouillac`), so it must **not** see the region-nord shared dashboards — the
isolation half of the test. **Try it:** build a shared dashboard as Rue du Perche → switch to
Gerson (sees it) → switch to Genouillac (doesn't). The **Users** page shows each user's org.

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
