import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const EMBED_KEY = process.env.HOLISTICS_EMBED_KEY;      // ShelfOptix dashboard embed_code
const EMBED_SECRET = process.env.HOLISTICS_EMBED_SECRET; // ShelfOptix dashboard embed secret

// Single ShelfOptix dashboard (the embed_code lives in EMBED_KEY).
const PORTALS = [
  { id: "shelfoptix_osa", title: "OSA / OOS Command Center", icon: "Activity" },
];

// Tenant switcher. `tenant` = project_id_no filtered via row_based.
// null tenant = ShelfOptix corporate / all-tenants (unrestricted).
const USERS = [
  { id: "corp",        name: "ShelfOptix Corporate",  email: "analytics@shelfoptix.com",  tenant: null,  scope: "All tenants" },
  { id: "cascade",     name: "Cascade Foods Co.",     email: "reports@cascadefoods.com",  tenant: "101", scope: "Tenant 101" },
  { id: "marketfresh", name: "MarketFresh Grocery",   email: "insights@marketfresh.com",  tenant: "102", scope: "Tenant 102" },
  { id: "pureharvest", name: "PureHarvest Brands",    email: "analytics@pureharvest.com", tenant: "103", scope: "Tenant 103" },
];

// Single-dashboard embed JWT payload (see docs.holistics.io/embedded/single-dashboard).
// RLS is enforced here (server-signed): scoped users get a row_based rule on
// project_id_no; the corporate user gets an empty rule set (sees all tenants).
function buildPayload(user) {
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

app.get("/api/config", (req, res) => {
  res.json({ portals: PORTALS, users: USERS });
});

app.post("/api/embed-token", (req, res) => {
  const { user } = req.body;
  const token = jwt.sign(buildPayload(user), EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${EMBED_KEY}?_token=${token}`;
  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
