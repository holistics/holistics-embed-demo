// Local dev server. Mirrors netlify/functions/{config,embed-token}.js so
// `npm run dev` behaves the same as the deployed site; the persona list and
// the payload builder are imported from the functions folder rather than
// copied, so the two cannot drift.
//
// The previous retailer/manufacturer demo (demo4 tenant, scoped by `schema`
// and `manufacturer_id`) lived here. It is preserved in git history at
// ef1aecb if that story needs to come back.
import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

import { USERS, findUser, buildPayload, publicUsers } from "../netlify/functions/_users.js";

const app = express();
app.use(cors());
app.use(express.json());

// One key/secret for both portals: embed credentials are per-tenant, and the
// Explorer/Viewer split is expressed by object_name inside the token.
const PORTAL_KEY = process.env.HOLISTICS_RETAILFOCUS_PORTAL_KEY;
const PORTAL_SECRET = process.env.HOLISTICS_RETAILFOCUS_PORTAL_SECRET;
const HOLISTICS_HOST = process.env.HOLISTICS_HOST || "https://us.holistics.io";

app.get("/api/config", (req, res) => {
  res.json({ users: publicUsers() });
});

app.post("/api/embed-token", (req, res) => {
  // No silent fallback to the first persona: showing one user's rows under
  // another user's name is the exact failure this page exists to prevent.
  const user = findUser(req.body?.user);
  if (!user) {
    return res.status(404).json({
      error: `Unknown user '${req.body?.user}'. Known users: ${USERS.map((u) => u.id).join(", ")}.`,
    });
  }

  if (!PORTAL_KEY || !PORTAL_SECRET) {
    return res.status(500).json({
      error:
        "Missing HOLISTICS_RETAILFOCUS_PORTAL_KEY / _SECRET. Publish the portals, then Tools > Embedded Analytics > Enable to copy the Key ID and Secret.",
    });
  }

  const payload = buildPayload(user);
  const token = jwt.sign(payload, PORTAL_SECRET, { algorithm: "HS256" });

  const params = new URLSearchParams({ _token: token });
  if (user.capability === "viewer") params.set("left_panel_state", "collapsed");

  res.json({ embedUrl: `${HOLISTICS_HOST}/embed/${PORTAL_KEY}?${params}`, payload });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
