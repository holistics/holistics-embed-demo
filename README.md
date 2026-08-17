# Building an Embedded Analytics Portal with Holistics

A build guide: how to put a Holistics dashboard inside your own application, with each user seeing only the data they are allowed to see — enforced by the database, not by hiding things in the UI.

**Time:** a day for a working version. **You need:** SQL, a little JavaScript, and admin access to a Holistics workspace.

This guide follows a real build — the ShelfOptix RetailFocus programme, reporting on ~560 Dollar General stores for P&G. Four users, each scoped to their own states and product departments. The examples come from that build; the shape applies to any of them.

---

## What you are building

```
  Your app                    Your server                    Holistics
  ────────                    ───────────                    ─────────
  user signs in  ─────────►   verifies them
                              signs a JWT with their scope
                                      │
  <iframe> ◄────────────────  embed URL + token  ─────────►  Embed Portal
                                                                  │
                                                             Dataset
                                                                  │
                                                    row-level permissions
                                                    filter every query
```

The important part: **your app tells Holistics who the user is, and Holistics decides what they can see.** Your app never filters data. It cannot be tricked into showing the wrong rows, because it was never in charge of that.

---

## Before you write anything: decide your scope grain

This is the decision that shapes everything, and the one most likely to cost you a rebuild. Ask:

> **What combination of things decides which rows a user can see?**

Write your answer down before modelling. If it is a single attribute on a single dimension, the rest of this guide is easy. If it is two attributes at different grains, read [Step 2](#step-2-build-the-access-dimension) carefully.

---

## Step 1: Create your user attributes

After define the things that you use to see, then In Holistics, go to **Admin → User Attributes** and create one per scope. Example:

| Attribute | Example value |
|---|---|
| `store_state` | `GA` |
| `dept` | `HOME CLEANING` |

The names matter — they must match the permission definitions exactly, and the keys your app puts in the token.

---

## Step 2: Build the access dimension

Here is the rule that governs everything:

> **Every model in a query must be able to reach the model your permission sits on.**
>
> If it cannot, Holistics does not skip the rule — it **blocks the widget**, because returning rows it cannot prove are in scope would be a leak.

If you scope by one attribute that lives on one dimension every fact joins to, you are already fine: put the permission there and skip to [Step 3](#step-3-add-the-permissions).

If you scope by **two attributes at different grains**, you need a dimension sitting at the grain where both questions can be answered. Failed example:

| Permission placed on | Result |
|---|---|
| Each fact table | A query over sales cannot reach a rule on on-hand — facts join to dimensions, never to each other. Everything blocked. |
| A product dimension | Facts fine. Every widget showing a store column blocked. |
| A department dimension | Tiles fine. Every table with store attributes blocked. |
| **A store × department dimension** | **Works** |

---

## Step 3: Add the permissions

At dataset level, next to `models` and `relationships`:

```aml
Dataset shelfoptix_pg_ai {
  models: [ ... ]

  permission state_scope {
    field: r(dim_store_dept.store_state)
    operator: 'matches_user_attribute'
    value: 'store_state'          // the ATTRIBUTE name, as a string
  }
  permission dept_scope {
    field: r(dim_store_dept.dept)
    operator: 'matches_user_attribute'
    value: 'dept'
  }

  relationships: [ ... ]
}
```

`value` is the user attribute's name, not a value. `field` is what gets filtered.


That is how an admin account works without a second portal or a special case anywhere in your code.

---

## Step 4: Define the embed portal

A portal is what your users land in. One file, named `*.embed.aml`:

```aml
EmbedPortal retailfocus_portal {
  description: 'RetailFocus: dashboard plus the dataset behind it.'
  objects: [
    shelfoptix_retailfocus,   // a dashboard
    shelfoptix_pg_ai,         // a dataset
  ]
  initial_object: 'ai' // object where users first land
  ai {
    customization {
      global { assistant_name: 'RetailFocus Assistant' icon: 'https://.../icon.png' }
      chat_page {
        prompt_placeholder: 'e.g. Which store has the most untapped value?'
      }
    }
  }
}
```

---

## Step 5: Publish, then get your credentials

**Embed objects and permissions resolve against production, not your development branch.** Validate, then publish:

```bash
holistics aml validate
```

Then hit **Publish** in the Studio. Before publishing, a portal returns `Couldn't find EmbedPortal`, and permission changes appear to have no effect because production still has the previous version. If behaviour does not match the code, check what is published before debugging anything else.

Then **Tools → Embedded Analytics**, find your portal, click **Enable**, and copy the **Key ID** and **Secret**. One credential pair covers every portal in the workspace — they are per-tenant, not per-portal.

---

---

## Step 6: Decide where the credentials live

Four secrets come out of the previous step and the app needs all of them. Where they belong depends on nothing more than whether the app is hosted.

| Secret | What it does |
|---|---|
| Embed **Key ID** | Identifies the portal in the URL. Not sensitive on its own |
| Embed **Secret** | Signs the embed token. **Anyone holding it can mint a token for any user** |
| Session secret | Signs your own sign-in sessions. Rotate it and everyone is signed out |
| User passwords | Whatever your app authenticates against |

The embed secret is the one to be careful with. It bypasses your login entirely: hold it and you can assert any identity and any scope, without ever seeing the sign-in screen. Treat it like a database password, not like an API key.

**Running locally.** A gitignored `.env` file, read by the server process only:

```env
HOLISTICS_PORTAL_KEY=...
HOLISTICS_PORTAL_SECRET=...
SESSION_SECRET=...                 # openssl rand -hex 48
HOLISTICS_HOST=https://your-tenant.holistics.io
```

Two things to check. First, that `.env` is actually ignored — and that variants like `.env.backup` are too, since a copy left in the repo directory is one `git add -A` away from being committed. Second, that no secret is quoted into the frontend bundle: anything reaching the browser is public, so read these only in server code.

Values containing `#` need quoting, or `.env` treats the rest of the line as a comment and silently truncates the value. The result is a secret that looks correct in the file and fails at runtime.

**Hosted.** Use your platform's own secret store — environment variables in the hosting provider, or a secrets manager. The deploy artefact should never contain them. This is what keeps the app working when your laptop is off, and it means rotating a secret does not require a code change.

**Sharing passwords with real users.** Use a password manager's share feature rather than email or chat: it can expire, and it can be locked to a recipient's address. If you use 1Password, `op item share <item> --emails a@b.com --expires-in 30d` does both. Keep the *server* secrets in a different item from anything you share with users — they are for the application, not for people.

**What not to do:** commit any of them, put them in the frontend, paste them into a ticket, or share the embed secret with someone who only needs to log in.

## Step 7: Mint the token in your app

Server-side only. The secret must never reach the browser.

```js
import jwt from "jsonwebtoken";

const now = Math.floor(Date.now() / 1000);

const payload = {
  object_name: "retailfocus_portal",
  object_type: "EmbedPortal",

  embed_user_id: user.id,          // stable per person: keys their saved work
  embed_user_email: user.email,
  embed_org_id: user.orgId,        // the shared-workspace boundary

  user_attributes: {               // ← what the permissions match against
    store_state: user.states,      // ["GA"] or "__ALL__"
    dept: user.depts,
  },

  permissions: {
    enable_personal_workspace: true,
    org_workspace_role: "editor",  // no_access | viewer | editor
  },

  settings: {
    ai: { enabled: true },
    allow_dashboard_export: true,
    allow_raw_data_export: false,
  },

  iat: now,
  exp: now + 3600,
};

const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
const url = `https://your-tenant.holistics.io/embed/${EMBED_KEY}?_token=${token}&left_panel_state=collapsed`;
```

Then render `<iframe src={url}>`.

### What you can and cannot control per user

| Per user, in the token | Portal-level only |
|---|---|
| `user_attributes` — which rows | Which dashboards and datasets exist |
| `settings.ai.enabled` | Whether exploration is possible at all |
| `permissions.enable_personal_workspace` | |
| `permissions.org_workspace_role` | |
| export and timezone settings | |

---

## Step 8: Let the server decide who the user is

The most common mistake:

```js
// WRONG — the browser says who it is
app.post("/api/embed-token", (req, res) => {
  const user = findUser(req.body.user);   // anyone can ask for any account
  res.json({ embedUrl: mint(user) });
});
```

Anyone can POST to that endpoint naming any user and get their data. A login screen in front of it changes nothing.

```js
// RIGHT — the server says who it is
app.post("/api/login", (req, res) => {
  const user = authenticate(req.body.email, req.body.password);
  if (!user) return res.status(401).json({ error: "That email and password do not match." });
  res.json({ session: jwt.sign({ sub: user.id }, SESSION_SECRET, { expiresIn: "8h" }) });
});

app.post("/api/embed-token", (req, res) => {
  const userId = verifySession(req.headers.authorization);   // identity from the signature
  if (!userId) return res.status(401).json({ error: "Not signed in." });
  res.json({ embedUrl: mint(findUser(userId)) });            // request body ignored
});
```

Test it: sign in as a restricted user, then POST to `/api/embed-token` asking for the admin account. You should get the restricted user's token back.

Two smaller things worth copying: return the **same** 401 for a wrong password and an unknown email, so the endpoint cannot be used to discover which accounts exist; and compare passwords in constant time over hashes.

---

## Step 9: Test as a real user

> **Row-level permissions never apply to Admins, or to Analysts with data source access.**

You cannot test this from your own account. It will look like nothing is filtered and you will conclude it is broken. Open the embed as an actual embed user.

What to check:

1. A scoped user and an unscoped user return **different numbers** on the same tile
2. The scoped user's tables show only their rows
3. No widget shows a permission error
4. The scoped user's totals are **lower** than the unscoped user's — if they are higher, something is reading an unscoped path

---

## Running this example

> Picking this project up rather than learning the pattern? Read
> **[HANDOVER.md](./HANDOVER.md)** — current state, what to work on next, and
> the gotchas specific to this codebase.


```bash
npm install
npm run server     # API on :3001, reads .env
npm run dev        # app on https://localhost:5173
```

Accept the self-signed certificate warning. `.env` needs:

```env
HOLISTICS_SHELFOPTIX_PORTAL_KEY=...
HOLISTICS_SHELFOPTIX_PORTAL_SECRET=...
SHELFOPTIX_SESSION_SECRET=...          # openssl rand -hex 48
HOLISTICS_HOST=https://your-tenant.holistics.io
```

> **This example runs locally only. Do not deploy it.** The password check is stubbed — any value signs you in, empty included. Hosted, that would hand any visitor the account with the widest access.

---

## Troubleshooting

**`Some permission rules are not applied in the explore ... check RLP on the following model: X`**
A model in the query cannot reach the permission. The message names a model involved in the mismatch, not necessarily the culprit. List every model the widget touches — including ones pulled in by *filters* — and ask which cannot reach your permission's model. Usually it is a dimension that has no business joining to it. Move that filter or column onto the access dimension.

**`Operands of <= cannot be literal NULL`**
A field resolved to NULL because it could not be computed under the permission, and a comparison against it reached the database. This is a *missing operand*, not a bad comparison — the cause is the reachability problem above.

**`Couldn't find EmbedPortal`**
Either you have not published, or you have two portals in one file.

**`Property 'enabled' does not exist on type 'EmbedPortal.ai'`**
AI is switched on in the token, not in the portal definition.

**`undefined is not an object (evaluating 'r2.field.forEach')`**
An empty group in a dataset `view {}` block. Delete metrics from a group and you must delete the group if it empties. The error names neither the group nor the file.

**Everything looks unfiltered**
You are testing as an admin. See [Step 9](#step-9-test-as-a-real-user).

**Your change had no effect**
Check what is published. This is the answer more often than it deserves to be.

**Currency renders without a symbol, with two decimals**
The format is `[$$]#,##0`, not `$#,##0`. An unrecognised pattern is ignored silently.

---

## Checklist

- [ ] Scope grain decided before modelling
- [ ] User attributes created in Admin, names matching exactly
- [ ] RLP-as-code enabled for the workspace
- [ ] Permission sits on a model every query can reach
- [ ] Every filter and column checked against that rule
- [ ] Portal published to production
- [ ] Embed secret in a server-side store, never in the frontend bundle
- [ ] `.env` and its variants gitignored
- [ ] Identity derived from a signed session, not the request body
- [ ] Verified as a non-admin user, two accounts, different numbers
- [ ] `embed_org_id` set if you use `org_workspace_role`

---

## Reference

- [Embed Portal](https://docs.holistics.io/embedded/embed-portal/) · [Token parameters](https://docs.holistics.io/embedded/embed-portal/parameters-reference) · [Identity and workspaces](https://docs.holistics.io/embedded/identity-workspace)
- [Self-serve exploration](https://docs.holistics.io/embedded/self-serve-exploration) · [Row-level permission as code](https://docs.holistics.io/docs/access-control/row-level-permission-as-code)
