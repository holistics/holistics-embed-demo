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

import { USERS, findUser, buildPayload, publicUsers } from "../netlify/functions/_users.js";
import {
  authConfigError,
  passwordMatches,
  issueSession,
  userIdFromRequest,
  SESSION_TTL_SECONDS,
} from "../netlify/functions/_auth.js";

const app = express();
app.use(cors());
app.use(express.json());

// One key/secret for both portals: embed credentials are per-tenant, and the
// Explorer/Viewer split is expressed by object_name inside the token.
const PORTAL_KEY = process.env.HOLISTICS_SHELFOPTIX_PORTAL_KEY;
const PORTAL_SECRET = process.env.HOLISTICS_SHELFOPTIX_PORTAL_SECRET;
const HOLISTICS_HOST = process.env.HOLISTICS_HOST || "https://us.holistics.io";

// The login screen needs the account list to render its dropdown. Emails and
// scope only — no password, no portal names, no keys.
app.get("/api/config", (req, res) => {
  res.json({ users: publicUsers() });
});

app.post("/api/login", (req, res) => {
  const configError = authConfigError();
  if (configError) return res.status(500).json({ error: configError });

  const { email, password } = req.body || {};
  const user = USERS.find((u) => u.email.toLowerCase() === String(email ?? "").trim().toLowerCase());
  const ok = passwordMatches(password);

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

  if (!PORTAL_KEY || !PORTAL_SECRET) {
    return res.status(500).json({
      error:
        "Missing HOLISTICS_SHELFOPTIX_PORTAL_KEY / _SECRET. Publish the portals, then Tools > Embedded Analytics > Enable to copy the Key ID and Secret.",
    });
  }

  const payload = buildPayload(user);
  const token = jwt.sign(payload, PORTAL_SECRET, { algorithm: "HS256" });

  const params = new URLSearchParams({ _token: token, left_panel_state: "collapsed" });

  res.json({ embedUrl: `${HOLISTICS_HOST}/embed/${PORTAL_KEY}?${params}`, payload });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
