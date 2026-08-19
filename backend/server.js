// Local dev server. Mirrors netlify/functions/{config,login,embed-token}.js so
// `npm run dev` behaves the same as the deployed site; the persona list, the
// payload builder and the auth helpers are imported from the functions folder
// rather than copied, so the two cannot drift.
//
// The previous retailer/manufacturer demo (demo4 tenant, scoped by `schema`
// and `manufacturer_id`) lived here. It is preserved in git history at
// ef1aecb if that story needs to come back.
import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

import { USERS, findUser, buildPayload, publicUsers, portalFor } from "../netlify/functions/_users.js";
import {
  assertDeployable,
  authConfigError,
  passwordMatches,
  issueSession,
  userIdFromRequest,
  SESSION_TTL_SECONDS,
} from "../netlify/functions/_auth.js";

// Refuse to start rather than serve real customer data without a password.
assertDeployable();

const app = express();

// Locked to a configured origin. `cors()` with no options is
// Access-Control-Allow-Origin: *, which lets any site call these endpoints
// from a visitor's browser. Set ALLOWED_ORIGIN in the deployed environment;
// left unset it falls back to the local vite dev server.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || "https://localhost:5173";
app.use(cors({ origin: ALLOWED_ORIGIN, credentials: false }));

app.use(express.json());

// This used to read one key/secret for both portals, on the reading that
// embed credentials are per tenant. They are not: they are per PORTAL. Now
// that viewers go to a dashboard-only portal, each user's token has to be
// signed with the secret belonging to the portal they are being sent to, so
// the pair is resolved per request rather than once at boot.
function portalCredentials(user) {
  const { name, envPrefix } = portalFor(user);
  return {
    name,
    envPrefix,
    key: process.env[`${envPrefix}_KEY`],
    secret: process.env[`${envPrefix}_SECRET`],
  };
}
const HOLISTICS_HOST = process.env.HOLISTICS_HOST || "https://us.holistics.io";

// The login screen needs the account list to render its dropdown. Emails and
// scope only — no password, no portal names, no keys.
// Account reference list. Signed-in callers only: it carries real customer
// email addresses and each account's exact scope, which is precisely what
// /api/login refuses to leak. The login screen does not need it now that
// email is typed rather than picked.
app.get("/api/config", (req, res) => {
  if (!userIdFromRequest(req.headers)) {
    return res.status(401).json({ error: "Not signed in." });
  }
  res.json({ users: publicUsers() });
});

app.post("/api/login", (req, res) => {
  const configError = authConfigError();
  if (configError) return res.status(500).json({ error: configError });

  const { email, password } = req.body || {};
  const user = USERS.find((u) => u.email.toLowerCase() === String(email ?? "").trim().toLowerCase());
  const ok = passwordMatches(user, password);

  // Same message either way: a different answer for a bad email would let
  // someone enumerate the accounts.
  if (!user || !ok) return res.status(401).json({ error: "That email and password do not match." });

  res.json({
    user: publicUsers().find((u) => u.id === user.id),
    session: issueSession(user),
    expires_in: SESSION_TTL_SECONDS,
  });
});

app.post("/api/embed-token", (req, res) => {
  const configError = authConfigError();
  if (configError) return res.status(500).json({ error: configError });

  // Identity comes from the signed session, never from the request body.
  const userId = userIdFromRequest(req.headers);
  if (!userId) {
    return res.status(401).json({ error: "Not signed in, or the session has expired. Sign in again." });
  }

  const user = findUser(userId);
  if (!user) return res.status(401).json({ error: "This session no longer matches a known account." });

  const portal = portalCredentials(user);
  if (!portal.key || !portal.secret) {
    return res.status(500).json({
      error:
        `Missing ${portal.envPrefix}_KEY / _SECRET for portal '${portal.name}'. ` +
        "Publish that portal, then Tools > Embedded Analytics > Enable to copy the Key ID and Secret. " +
        "Every portal has its own pair.",
    });
  }

  const payload = buildPayload(user);
  const token = jwt.sign(payload, portal.secret, { algorithm: "HS256" });

  const params = new URLSearchParams({ _token: token, left_panel_state: "collapsed" });

  res.json({ embedUrl: `${HOLISTICS_HOST}/embed/${portal.key}?${params}`, payload });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
