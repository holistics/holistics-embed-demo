import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

// Single-dashboard embed (customer-facing, tenant-scoped)
const EMBED_KEY = process.env.HOLISTICS_EMBED_KEY;
const EMBED_SECRET = process.env.HOLISTICS_EMBED_SECRET;
// Embed portal (internal explore + Ask AI, all tenants)
const PORTAL_EMBED_KEY = process.env.HOLISTICS_PORTAL_EMBED_KEY;
const PORTAL_EMBED_SECRET = process.env.HOLISTICS_PORTAL_EMBED_SECRET;

// kind: 'dashboard' -> single-dashboard embed (row_based RLS)
// kind: 'portal'    -> embed portal (all-tenants explore + AI)
const PORTALS = [
  { id: "shelfoptix_osa",    title: "Single Dashboard", icon: "Activity",     kind: "dashboard" },
  { id: "shelfoptix_portal", title: "Embed Portal",     icon: "ShoppingCart", kind: "portal" },
];

// Tenant switcher. `tenant` = project_id_no filtered via row_based (dashboard embed only).
// null tenant = ShelfOptix corporate / all-tenants (unrestricted).
const USERS = [
  { id: "corp",        name: "ShelfOptix Corporate",  email: "analytics@shelfoptix.com",  tenant: null,  scope: "All tenants" },
  { id: "cascade",     name: "Cascade Foods Co.",     email: "reports@cascadefoods.com",  tenant: "101", scope: "Tenant 101" },
  { id: "marketfresh", name: "MarketFresh Grocery",   email: "insights@marketfresh.com",  tenant: "102", scope: "Tenant 102" },
  { id: "pureharvest", name: "PureHarvest Brands",    email: "analytics@pureharvest.com", tenant: "103", scope: "Tenant 103" },
];

// Single-dashboard embed payload: RLS via server-signed row_based on project_id_no.
function buildDashboardPayload(user) {
  const row_based = user?.tenant
    ? [
        {
          path: { dataset: "shelfoptix_osa", model: "shelfoptix_store_scan_sample", field: "project_id_no" },
          operator: "is",
          modifier: null,
          values: [user.tenant],
        },
      ]
    : [];

  return {
    settings: {
      allow_dashboard_export: true,
      allow_raw_data_export: false,
      hide_header_panel: true,
      hide_dashboard_filters_controls_panel: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
    },
    permissions: { row_based },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

// Embed portal payload: tenant-scoped explore + AI. RLS is enforced by the dataset's
// `matches_user_attribute` permission on project_id_no, fed by the user_attributes below.
// Corporate/all-tenants user (no tenant) sends `__ALL__` to bypass the row filter.
function buildPortalPayload(portalId, user) {
  return {
    object_name: portalId,
    object_type: "EmbedPortal",
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    user_attributes: { project_id_no: user?.tenant ? [user.tenant] : "__ALL__" },
    permissions: {},
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
      hide_dashboard_filters_controls_panel: false,
      dashboard_autorun_on_changes: false,
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

app.get("/api/config", (req, res) => {
  res.json({ portals: PORTALS, users: USERS });
});

app.post("/api/embed-token", (req, res) => {
  const { portal, user } = req.body;
  const def = PORTALS.find((p) => p.id === portal) || PORTALS[0];

  if (def.kind === "portal") {
    const token = jwt.sign(buildPortalPayload(def.id, user), PORTAL_EMBED_SECRET, { algorithm: "HS256" });
    const embedUrl = `https://demo4.holistics.io/embed/${PORTAL_EMBED_KEY}?_token=${token}&left_panel_state=collapsed`;
    return res.json({ embedUrl });
  }

  const token = jwt.sign(buildDashboardPayload(user), EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${EMBED_KEY}?_token=${token}`;
  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
