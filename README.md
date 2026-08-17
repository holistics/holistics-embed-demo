# Holistics Embed Demo

A demo app showing how to securely embed [Holistics](https://www.holistics.io/) analytics portals into a React application using JWT-based authentication.

> **This branch runs locally only. Do not deploy it.**
> The password check is stubbed — *any* value signs you in, including an
> empty one. Hosted, that hands any visitor the Masterview account, which
> sees every state and every department.
> `shelfoptix-embed-demo.netlify.app` serves the demo4 retailer/manufacturer
> demo, not this app. Deploying this branch would take that site over. The
> RetailFocus portal it embeds is a customer POC behind a shared password,
> so it is run on a laptop for a demo and shut down afterwards.

![](./holistics-embed-demo.png)

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, `jsonwebtoken`
- **Runs**: locally — Vite dev server plus an Express API on :3001

## Project Structure

```
├── backend/
│   └── server.js            # Express API server (local dev)
├── frontend/
│   ├── functions/api/        # legacy Cloudflare Pages copy — unused
│   ├── src/                  # React app source
│   ├── public/               # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── eslint.config.js
├── functions/                # legacy Cloudflare Pages copy — unused
├── netlify/functions/        # the API: login, embed-token, config, shared helpers
└── package.json
```

## RetailFocus users

Sign-in is a dropdown of emails. The account chosen becomes the embed
identity; there is no password.

| Name | Credentials | State | Dept Description | Agentic Capability |
| --- | --- | --- | --- | --- |
| Amit | amarty@shelfoptix.com | GA | HOME CLEANING, PAPER PRODUCTS, HOUSEWARE, HARDWARE, SUMMER/SPECIAL EVENTS | Self-Serve (Explorer) |
| Randy | rwilson@retailgis.com | TN, KY | HOME CLEANING, PAPER PRODUCTS, HOUSEWARE, HARDWARE, SUMMER/SPECIAL EVENTS | Self-Serve (Explorer) |
| Myri | mdiazmartinez@shelfoptix.com | GA, TN, KY | BEAUTY CARE, HEALTH CARE, INF/TODD/GIRLS | Standard/Traditional Dashboard View |
| Masterview | mv@shelfoptix.com | All | All | Self-Serve (Explorer) |

The list lives in `netlify/functions/_users.js` and nowhere else. Both
functions and the local dev server import it.

**How the three columns become an embed**

- **State** → `store_state` user attribute.
- **Dept Description** → `dept` user attribute.
- **All** → `__ALL__`, the documented bypass for one attribute, which is
  how Masterview sees everything without a special case.

Both attributes are enforced by row-level permission on the
`shelfoptix_pg_ai` dataset. Two prerequisites, both outside this repo:
RLP-as-code has to be enabled on the tenant by Holistics support, and the
`store_state` and `dept` user attributes have to exist in
**Admin → User Attributes** with exactly those names. Until then the
attributes ride in the token but nothing filters on them.

- **Agentic Capability** → which portal the token names. Self-serve
  exploration is a property of the portal, not of the token: a portal
  that lists the dataset allows exploration, one that lists only the
  dashboard does not. There is no per-user flag for it.

  | Capability | Portal | Contains |
  | --- | --- | --- |
  | Self-Serve (Explorer) | `retailfocus_explorer` | dashboard + dataset |
  | Standard/Traditional | `retailfocus_viewer` | dashboard only |

  On top of that the token varies `settings.ai.enabled` and the workspace
  permissions, so Explorers can save their own work and Viewers cannot.

**How sign-in works**

The password is **not checked** — any value signs you in, empty included.
The field is still on screen because the demo is partly about showing a
host app authenticating a user, but only the comparison is stubbed.

1. `POST /api/login` with `{ email, password }`. A wrong password and an
   unknown email return the same 401, so the endpoint cannot be used to
   discover which accounts exist.
2. On success it returns a session token signed with
   `SHELFOPTIX_SESSION_SECRET`, valid 8 hours.
3. `POST /api/embed-token` requires that token in an `Authorization:
   Bearer` header and reads the identity **out of the token**, ignoring
   the request body entirely.

Step 3 is the part that matters. A password screen alone would change
nothing, because anyone could still POST to the token endpoint and name
whichever persona they liked. Deriving the identity from something the
server signed is what makes the scope real.

**It is still demo-grade.** One shared password, no per-user credentials,
no lockout, no rate limiting, and no revocation beyond rotating
`SHELFOPTIX_SESSION_SECRET`. It is enough that a link to the site is not
a link to the data, and no more than that.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
HOLISTICS_SHELFOPTIX_PORTAL_KEY=your_embed_key_here
HOLISTICS_SHELFOPTIX_PORTAL_SECRET=your_embed_secret_here
HOLISTICS_HOST=https://us.holistics.io

# Shared sign-in password for the four accounts, and the key that signs
# session tokens. Both are required; the app refuses to mint an embed
# token without them.
SHELFOPTIX_DEMO_PASSWORD='...'
SHELFOPTIX_SESSION_SECRET=...
```

One key/secret covers both portals: embed credentials are per-tenant, not
per-portal, so the token only swaps `object_name` between them.

To get them: publish the portal from the `shelfoptix-poc-aml` project, then
**Tools → Embedded Analytics**, find `retailfocus_portal`, click **Enable**,
and copy the Key ID and Secret. These live in `.env` on the machine running
the demo and nowhere else.

Quote the password. `.env` treats an unquoted `#` as the start of a
comment, which silently truncates the value and produces a password that
looks right in the file and fails at the login screen.

Generate the session secret with `openssl rand -hex 48`. Changing it
signs everyone out, which is the only revocation this demo has.

### 3. Start the backend server

```bash
npm run server
# → http://localhost:3001
```

### 4. Start the frontend (in a separate terminal)

```bash
npm run dev
# → https://localhost:5173
```

Open <https://localhost:5173> in your browser. Accept the self-signed certificate warning.

## Running it for a demo

Two terminals. Nothing is deployed and nothing needs to be.

```bash
npm install                 # once
npm run server              # terminal 1 — API on :3001, reads .env
npm run dev                 # terminal 2 — app on https://localhost:5173
```

Open <https://localhost:5173> and accept the self-signed certificate warning.
The Vite dev server proxies `/api/*` to the Express server, so the login and
the embed token work exactly as they would if this were hosted.

### If the certificate warning gets in the way

Some browser extensions block interaction on a self-signed origin. Build and
serve over plain HTTP instead:

```bash
npm run build
npx serve dist -l 4173      # plus `npm run server` for the API
```

You will need a proxy for `/api/*`, or point the app at `http://localhost:3001`
directly.

### Presenting it

Share your screen rather than a link. There is no URL to send: that is
deliberate, because the shared password gives access to customer data and a
link would outlive the meeting.

### If it ever does need hosting

Do not reuse the `shelfoptix-embed-demo` Netlify site — it serves the demo4
demo. Create a separate site, set the five variables from `.env` in that
site's own environment, and read the security notes below first: one shared
password across four accounts is not a control that survives being on the
open internet.
