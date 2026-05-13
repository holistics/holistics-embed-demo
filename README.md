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
HOLISTICS_EMBED_CODE=your_embed_key_here
HOLISTICS_EMBED_SECRET=your_embed_secret_here
HOLISTICS_BASE_URL=https://demo4.holistics.io
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

## Customization

To use your own backend or customize the embed token payload, replace the handler in [`backend/server.js` line 26](./backend/server.js#L26). This is where the JWT is constructed — adjust the payload fields, or settings to match your integration.

Read more in the [Holistics Embedded Analytics docs](https://docs.holistics.io/embedded/single-dashboard/).

