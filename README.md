# Holistics Embed Demo

A demo app showing how to securely embed [Holistics](https://www.holistics.io/) analytics portals into a React application using JWT-based authentication.

**Live URL**: https://holistics-embed-demo.pages.dev

![](./holistics-embed-demo.png)

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, `jsonwebtoken`
- **Deployment**: Cloudflare Pages + Pages Functions

## Project Structure

```
├── backend/
│   └── server.js            # Express API server (local dev)
├── frontend/
│   ├── functions/api/        # Cloudflare Pages Functions (production)
│   ├── src/                  # React app source
│   ├── public/               # Static assets
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── eslint.config.js
├── functions/                # Cloudflare Pages Functions (deploy copy)
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

**The sign-in is not authentication.** The browser posts a user id and the
server trusts it, which is fine for a demo and not fine for real data.
Anything real needs a session in front of `/api/embed-token`, with the
user derived from the session rather than the request body.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
HOLISTICS_RETAILFOCUS_PORTAL_KEY=your_embed_key_here
HOLISTICS_RETAILFOCUS_PORTAL_SECRET=your_embed_secret_here
HOLISTICS_HOST=https://us.holistics.io
```

One key/secret covers both portals: embed credentials are per-tenant, not
per-portal, so the token only swaps `object_name` between them.

To get them: publish `embed/retailfocus.embed.aml` from the
`shelfoptix-poc-aml` project, then **Tools → Embedded Analytics**, find
`retailfocus_explorer`, click **Enable**, and copy the Key ID and Secret.

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

## Deployment (Cloudflare Pages)

The app is deployed to Cloudflare Pages with serverless functions handling the API.

**Live URL**: https://holistics-embed-demo.pages.dev

### Deploy manually

```bash
# Build the frontend
npm run build

# Copy functions to root (Cloudflare expects functions/ as sibling to output dir)
cp -r frontend/functions functions

# Deploy
CLOUDFLARE_ACCOUNT_ID=<your_account_id> wrangler pages deploy dist \
  --project-name holistics-embed-demo \
  --branch main \
  --commit-dirty=true
```

### Set secrets

```bash
echo -n 'your_key' | CLOUDFLARE_ACCOUNT_ID=<your_account_id> \
  wrangler pages secret put HOLISTICS_EMBED_KEY --project-name holistics-embed-demo

echo -n 'your_secret' | CLOUDFLARE_ACCOUNT_ID=<your_account_id> \
  wrangler pages secret put HOLISTICS_EMBED_SECRET --project-name holistics-embed-demo
```
