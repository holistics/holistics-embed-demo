import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

// New, Mercateam-specific env vars so existing tokens (e.g. ShelfOptix) stay untouched.
const EMBED_KEY = process.env.HOLISTICS_MERCATEAM_PORTAL_KEY;
const EMBED_SECRET = process.env.HOLISTICS_MERCATEAM_PORTAL_SECRET;

const PORTALS = [
  { id: "mercateam_portal", title: "Mercateam Analytics", icon: "Activity" },
  { id: "ask_ai", title: "Ask AI", icon: "Sparkles", portal: "mercateam_portal", urlSuffix: "/ai" },
];

// Demo user profiles — each carries the site_id(s) they may see (real Mercateam sites)
// and an `orgId` that becomes embed_org_id: the SHARED workspace boundary (same orgId => share
// dashboards; different orgId => isolated). Keep in sync with functions/api/config.js.
const USERS = [
  // Rue du Perche + Gerson + Regional Lead share orgId "org-region-nord" -> shared workspace
  // (a dashboard built by one appears for the others). Genouillac is its own org -> isolated.
  { id: "rue_perche", name: "Rue du Perche — Site Manager", email: "manager@rueduperche.demo", siteLabel: "Rue du Perche", site_ids: ["Ce6amNfeKmH9XssxVCwT"], orgId: "org-region-nord" },
  { id: "gerson", name: "Gerson — Site Manager", email: "manager@gerson.demo", siteLabel: "Gerson", site_ids: ["3BD7SuGKJknq9C4cpwmR"], orgId: "org-region-nord" },
  { id: "regional", name: "Regional Lead — 2 sites", email: "regional@mercateam.demo", siteLabel: "Rue du Perche + Gerson", site_ids: ["Ce6amNfeKmH9XssxVCwT", "3BD7SuGKJknq9C4cpwmR"], orgId: "org-region-nord" },
  { id: "genouillac", name: "Eurocoustic Genouillac — Site Manager", email: "manager@eurocoustic-genouillac.demo", siteLabel: "Saint Gobain - Eurocoustic - Genouillac", site_ids: ["cm3hd7avk0x1o6mfbkkfswzit"], orgId: "org-eurocoustic-genouillac" },
];

app.get("/api/config", (req, res) => {
  res.json({ portals: PORTALS, users: USERS });
});

app.post("/api/embed-token", (req, res) => {
  const { portal, user, url_suffix } = req.body;

  if (!portal) {
    return res.status(400).json({ error: "portal is required" });
  }
  if (!EMBED_KEY || !EMBED_SECRET) {
    return res.status(500).json({
      error: "Missing HOLISTICS_MERCATEAM_PORTAL_KEY / HOLISTICS_MERCATEAM_PORTAL_SECRET in .env",
    });
  }

  const payload = {
    object_name: portal,
    object_type: "EmbedPortal",
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: false,
    },
    // Row-level scope: the site(s) this user is allowed to see.
    user_attributes: {
      site_id: user?.site_ids || [],
    },
    // Shared-workspace boundary: users with the same embed_org_id can share dashboards
    // with each other; different orgs are isolated. Required for org_workspace_role to work.
    embed_org_id: user?.orgId,
    // User-built dashboards (https://docs.holistics.io/embedded/user-built-dashboards):
    //  - enable_personal_workspace: build/save PRIVATE dashboards (only the user sees them)
    //  - org_workspace_role 'editor': build/save SHARED dashboards in their org workspace
    //    (set 'viewer' for read-only shared, or omit to disable shared entirely).
    permissions: {
      enable_personal_workspace: true,
      org_workspace_role: "editor",
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://eu.holistics.io/embed/${EMBED_KEY}${url_suffix || ""}?_token=${token}&left_panel_state=collapsed`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Mercateam embed backend running on http://localhost:3001");
});
