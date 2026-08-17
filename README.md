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

For us it was **state** *and* **department**. Two attributes at completely different grains — a state belongs to a store, a department belongs to a product. That mismatch drove the entire model design, and we got it wrong three times before getting it right.

Write your answer down before modelling. If it is a single attribute on a single dimension, the rest of this guide is easy. If it is two attributes at different grains, read [Step 3](#step-3-build-the-access-dimension) carefully — that step exists for exactly this case.

---

## Step 1: Model your data

Start with a normal star schema. Facts join to dimensions; dimensions do not join to each other.

```aml
Dataset shelfoptix_pg_ai {
  models: [
    store_meta,        // dimension: one row per store
    sales_detail,      // fact: what sold
    onhand_detail      // fact: what is in stock
  ]

  relationships: [
    relationship(sales_detail.store_no  > store_meta.store_no, true, 'one_way'),
    relationship(onhand_detail.store_no > store_meta.store_no, true, 'one_way')
  ]
}
```

`one_way` means the dimension filters the fact, never the reverse. It is the right default and it keeps nonsense combinations out of the field list.

### When the source data cannot answer the question

Do not force it in AQL. Write a query model — a model whose source is SQL you control:

```aml
Model order_lines {
  type: 'query'
  data_source_name: 'your_connection'

  dimension store_no { type: 'number' definition: @sql {{ #SOURCE.store_no }};; }
  // ... one dimension per output column

  query: @sql
    select s.store_no, s.primary_sku_no, sum(s.units) as units
    from sales s
    join onhand o using (store_no, primary_sku_no)
    group by 1, 2
  ;;
}
```

We needed this twice: once to join sales and on-hand at store × SKU (the two views only met at store level), and once to pre-compute a peer benchmark. Doing the join in SQL avoided a whole class of problem — no computed join keys, no relationship ordering, nothing added to the source models.

> **Watch out.** We first tried a computed dimension on a source model and used it in a relationship. It validated locally and failed in the cloud with `Field pair_key not found in model ...`, because the dataset reached the server before the edited model did. SQL sidesteps it.

---

## Step 2: Create your user attributes

In Holistics, go to **Admin → User Attributes** and create one per scope. Ours:

| Attribute | Example value |
|---|---|
| `store_state` | `GA` |
| `dept` | `HOME CLEANING` |

The names matter — they must match the permission definitions exactly, and the keys your app puts in the token.

Confirm they exist before going further. The CLI tells you:

```bash
holistics aml validate
# Use 5 user attribute(s) on server: store_state, dept, h_email, h_role, h_name
```

`h_email`, `h_role` and `h_name` are built in. If your two are not listed, the permissions will silently do nothing.

> **Also:** row-level permission as code is **off by default**. Ask Holistics support to enable it for your workspace, or your permission blocks will be ignored.

---

## Step 3: Build the access dimension

Here is the rule that governs everything, and it is not obvious:

> **Every model in a query must be able to reach the model your permission sits on.**
>
> If it cannot, Holistics does not skip the rule — it **blocks the widget**, because returning rows it cannot prove are in scope would be a leak.

If you scope by one attribute that lives on one dimension every fact joins to, you are already fine: put the permission there and skip to [Step 4](#step-4-add-the-permissions).

If you scope by **two attributes at different grains**, you need a dimension sitting at the grain where both questions can be answered. We learned this the expensive way:

| We put the permission on | What broke |
|---|---|
| Each fact table | A query over sales cannot reach a rule on on-hand — facts join to dimensions, never to each other. Everything blocked. |
| A product dimension | Facts fine. Every widget showing a store column blocked. |
| A department dimension | Tiles fine. Every table with store attributes blocked. |
| **A store × department dimension** | **Works** |

So build one row per combination:

```aml
Model dim_store_dept {
  type: 'query'

  dimension scope_key       { type: 'text' primary_key: true
    definition: @sql {{ #SOURCE.scope_key }};; }
  dimension store_state     { type: 'text' definition: @sql {{ #SOURCE.store_state }};; }
  dimension dept            { type: 'text' definition: @sql {{ #SOURCE.dept }};; }
  dimension store_group_a_b { type: 'text' definition: @sql {{ #SOURCE.store_group_a_b }};; }
  dimension store_city      { type: 'text' definition: @sql {{ #SOURCE.store_city }};; }

  query: @sql
    with depts as (
      select distinct dept_description as dept from sales where dept_description is not null
    ),
    stores as (
      select store_no,
             max(store_state)      as store_state,
             max(store_city)       as store_city,
             max(store_group_a_b)  as store_group_a_b
      from store_meta group by store_no
    )
    select concat(cast(s.store_no as string), '|', d.dept) as scope_key,
           s.store_no, d.dept, s.store_state, s.store_city, s.store_group_a_b
    from stores s cross join depts d
  ;;
}
```

Relationships join on a **single column**, so pair your two keys into one. Declare that key in the dataset, which means you never edit the source models:

```aml
  dimension sales_scope_key {
    type: 'text'
    hidden: true
    definition: @aql concat(cast(sales.store_no, 'text'), '|', sales.dept_description) ;;
    model: sales
  }

  relationships: [
    relationship(sales.sales_scope_key > dim_store_dept.scope_key, true, 'one_way')
    // ... one per fact
  ]
```

### The part everyone misses

**Put every attribute your dashboard filters on into this dimension too** — not only the scoped ones.

We had an A/B Cohort filter reading `store_group_a_b` off the store dimension. That one filter pulled the store dimension into *every query on the page*, which made the department permission unreachable everywhere, no matter where the other columns came from. Moving the filter onto the access dimension fixed it.

If a filter or a table column reads a model that cannot reach your permission, that widget breaks. Check every one.

---

## Step 4: Add the permissions

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

### Giving someone full access

Send the string `__ALL__` instead of a list and that one rule is bypassed:

```js
user_attributes: {
  store_state: "__ALL__",              // sees every state
  dept: ["HOME CLEANING", "HARDWARE"]  // still scoped by department
}
```

That is how an admin account works without a second portal or a special case anywhere in your code.

---

## Step 5: Define the embed portal

A portal is what your users land in. One file, named `*.embed.aml`:

```aml
EmbedPortal retailfocus_portal {
  description: 'RetailFocus: dashboard plus the dataset behind it.'
  objects: [
    shelfoptix_retailfocus,   // a dashboard
    shelfoptix_pg_ai,         // a dataset
  ]
  initial_object: 'ai'
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

Three things worth knowing:

- **Listing a dataset enables self-serve exploration and Ask AI on it.** Omit the dataset and users get dashboards only. There is no per-user switch — it is a property of the portal.
- **`initial_object`** is where users land: `'ai'` for the assistant, or a dashboard name.
- **One `EmbedPortal` per file.** Two in one file and the object will not resolve — you get `Couldn't find EmbedPortal` even after publishing.

> **`ai { enabled: true }` does not exist.** The `ai` block is customization only. AI is switched on per user in the token (Step 7), and must also be enabled for your workspace.

---

## Step 6: Publish, then get your credentials

**Embed objects and permissions resolve against production, not your development branch.**

```bash
holistics aml validate     # always, before publishing
```

Then hit **Publish** in the Studio. Until you do:

- the portal 404s with `Couldn't find EmbedPortal`
- permission changes appear not to work, because production still has the old ones

We lost hours to this. If behaviour does not match your code, **check what is published before debugging anything else.**

Then **Tools → Embedded Analytics**, find your portal, click **Enable**, and copy the **Key ID** and **Secret**. One credential pair covers every portal in the workspace — they are per-tenant, not per-portal.

---

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

> **`org_workspace_role` does nothing without `embed_org_id`.** We set the role for a week before noticing it was inert. Users sharing an `embed_org_id` can see each other's shared dashboards; different ids are isolated.

---

## Step 8: Do not let the browser choose the identity

The most common mistake, and we made it first:

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
- [ ] Embed credentials in the server environment, never in the browser
- [ ] Identity derived from a signed session, not the request body
- [ ] Verified as a non-admin user, two accounts, different numbers
- [ ] `embed_org_id` set if you use `org_workspace_role`

---

## Reference

- [Embed Portal](https://docs.holistics.io/embedded/embed-portal/) · [Token parameters](https://docs.holistics.io/embedded/embed-portal/parameters-reference) · [Identity and workspaces](https://docs.holistics.io/embedded/identity-workspace)
- [Self-serve exploration](https://docs.holistics.io/embedded/self-serve-exploration) · [Row-level permission as code](https://docs.holistics.io/docs/access-control/row-level-permission-as-code)
