# SCSI Collections client portal

A focused React prototype that embeds the Holistics `scsi_portal` for two synthetic creditor clients.

The portal opens the published `scsi_client_portal` object. The React app owns navigation and display state; the container API owns the identity mapping, permission payload, JWT signing, and embed URL.

## Access model

The browser submits only an identity ID to `/api/embed-token`. The server owns the permission mapping and signs a one-hour Holistics embed JWT.

| Identity | Signed user attributes | Debtor State |
| --- | --- | --- |
| Riverside Regional Medical Center | `scsi_client_id: [3]`, `pii_access: [1]` | visible |
| Harborline Auto Finance | `scsi_client_id: [4]`, `pii_access: [0]` | redacted |

Dashboard export, raw-data export, subscriptions, and workspace access remain disabled for every signed session.

## Project structure

```text
frontend/src/App.jsx         App shell and session lifecycle
frontend/src/PortalPages.jsx Portal, identity guide, and custom embed views
frontend/src/scsi-api.js     Browser-to-server API contract
functions/_lib/scsi.js       Approved identities and signed payload policy
functions/api/               Runtime-independent API handlers
container-server.mjs         Proto HTTP and static-file server
Dockerfile                   Production image definition
tests/                       Server permission and endpoint tests
```

## Development

Install dependencies and run all automated checks:

```sh
npm install
npm run check
```

`npm run dev` runs the Vite frontend only. To exercise the production server, run:

```sh
npm run preview
```

The server expects `HOLISTICS_EMBED_KEY` and `HOLISTICS_EMBED_SECRET` in its runtime environment. Keep local references in an ignored environment file as `op://` references and resolve them only at execution time.

## Deployment

Proto serves the frontend and API from one `linux/amd64` container. Deployments use the `holistics-embed-demo` application and its matching item in the `kubernetes-internal-prototypes` 1Password vault.

Build and push an immutable image, then create or update the Proto preview PR with its digest:

```sh
proto deploy \
  --image ghcr.io/holistics/holistics-embed-demo@sha256:<digest> \
  --name holistics-embed-demo \
  --port 8080 \
  --secret HOLISTICS_EMBED_KEY \
  --secret HOLISTICS_EMBED_SECRET
```

`proto deploy` does not publish production immediately. Verify the preview at <https://holistics-embed-demo.pages.holistics.dev> and merge its deployment PR only after explicit approval.
