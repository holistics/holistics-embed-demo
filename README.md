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

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
HOLISTICS_EMBED_KEY=your_embed_key_here
HOLISTICS_EMBED_SECRET=your_embed_secret_here
```

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
