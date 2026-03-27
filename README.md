# Holistics Embed Demo

A demo app showing how to securely embed [Holistics](https://www.holistics.io/) analytics portals into a React application using JWT-based authentication.

![](./holistics-embed-demo.png)

## Features

- **Secure JWT signing** — backend signs tokens so your embed secret is never exposed to the browser
- **Multi-user simulation** — switch between mock users to test row-level security
- **Multiple embed types** — supports both dashboard embeds and portal embeds with separate credentials and permissions
- **Embed debugger** — inspect the JWT payload and generated iframe URL
- **HTTPS dev server** — satisfies Holistics CSP requirements for framing

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Node.js, Express, `jsonwebtoken`

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Dashboard embed credentials
HOLISTICS_EMBED_KEY=your_embed_key_here
HOLISTICS_EMBED_SECRET=your_embed_secret_here

# Portal embed credentials
HOLISTICS_PORTAL_EMBED_KEY=your_portal_embed_key_here
HOLISTICS_PORTAL_EMBED_SECRET=your_portal_embed_secret_here
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
