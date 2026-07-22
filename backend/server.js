import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

// Two embed portals, one per user type — kept SEPARATE so retailers can never reach
// the cross-retailer union dataset:
//   • Retailer portal (shelfoptix_portal): dynamic-schema isolation. Token carries a
//     `schema` user attribute → routes each retailer to its own BigQuery dataset.
//   • Manufacturer portal (shelfoptix_manufacturer_portal): cross-retailer union +
//     grants + RLP. Token carries a `manufacturer` user attribute → scopes to that
//     manufacturer's own products across its assigned retailers.
//
// Each portal has its own embed key + secret (from the Holistics UI → embed settings).
const RETAILER_PORTAL_KEY = process.env.HOLISTICS_RETAILER_PORTAL_KEY || process.env.HOLISTICS_PORTAL_EMBED_KEY;
const RETAILER_PORTAL_SECRET = process.env.HOLISTICS_RETAILER_PORTAL_SECRET || process.env.HOLISTICS_PORTAL_EMBED_SECRET;
const MANUFACTURER_PORTAL_KEY = process.env.HOLISTICS_MANUFACTURER_PORTAL_KEY;
const MANUFACTURER_PORTAL_SECRET = process.env.HOLISTICS_MANUFACTURER_PORTAL_SECRET;

const HOLISTICS_HOST = "https://demo4.holistics.io";

// The app decides retailer-vs-manufacturer by the logged-in user's `type`, then picks
// the portal + the matching user attribute. Holistics does not infer the type.
//   - retailer     → schema:       BigQuery dataset name (dynamic schema)
//   - manufacturer → manufacturer: brand/manufacturer value (must match dim_product.brand
//                                   and the grants table; note "Nestle" has no accent)
const USERS = [
  // --- Retailers (each sees only their own dataset) ---
  { id: "cascade",     type: "retailer",     name: "Cascade Foods Co.",   email: "analytics@cascadefoods.com", schema: "shelfoptix_retailer_101" },
  { id: "marketfresh", type: "retailer",     name: "MarketFresh Grocery", email: "insights@marketfresh.com",   schema: "shelfoptix_retailer_102" },
  { id: "pureharvest", type: "retailer",     name: "PureHarvest Brands",  email: "analytics@pureharvest.com",  schema: "shelfoptix_retailer_103" },
  // --- Manufacturers (each sees its own products across assigned retailers) ---
  { id: "pg",          type: "manufacturer", name: "Procter & Gamble",    email: "analytics@pg.com",           manufacturer_id: 1 },
  { id: "unilever",    type: "manufacturer", name: "Unilever",            email: "analytics@unilever.com",     manufacturer_id: 2 },
  { id: "nestle",      type: "manufacturer", name: "Nestlé",              email: "analytics@nestle.com",       manufacturer_id: 3 },
  { id: "pepsico",     type: "manufacturer", name: "PepsiCo",             email: "analytics@pepsico.com",      manufacturer_id: 4 },
];

function portalFor(user) {
  return user.type === "manufacturer"
    ? { object: "shelfoptix_manufacturer_portal", key: MANUFACTURER_PORTAL_KEY, secret: MANUFACTURER_PORTAL_SECRET }
    : { object: "shelfoptix_portal",              key: RETAILER_PORTAL_KEY,     secret: RETAILER_PORTAL_SECRET };
}

// Embed-portal payload. Row scope comes entirely from the user attribute below,
// enforced server-side by each dataset (dynamic schema for retailers; RLP + grants
// for manufacturers). The app only asserts identity.
function buildPortalPayload(user) {
  const user_attributes =
    user.type === "manufacturer"
      ? { manufacturer_id: [user.manufacturer_id] }
      : { schema: [user.schema] };

  return {
    object_name: portalFor(user).object,
    object_type: "EmbedPortal",
    embed_user_id: user.id,
    embed_user_email: user.email,
    user_attributes,
    permissions: {},
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
      hide_dashboard_filters_controls_panel: false,
      dashboard_autorun_on_changes: false,
      // Let embedded users force-refresh past the 10-min query cache (near real-time).
      allow_public_user_bust_cache: true,
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

app.get("/api/config", (req, res) => {
  // USERS carry no secrets (portal keys/secrets live in env), so it's safe to expose
  // them for the persona switcher + reference table.
  res.json({ users: USERS });
});

app.post("/api/embed-token", (req, res) => {
  const user = USERS.find((u) => u.id === req.body.user) || USERS[0];
  const portal = portalFor(user);

  if (!portal.key || !portal.secret) {
    return res.status(500).json({
      error: `Missing embed key/secret for ${user.type} portal. Set the HOLISTICS_${user.type === "manufacturer" ? "MANUFACTURER" : "RETAILER"}_PORTAL_KEY/SECRET env vars.`,
    });
  }

  const token = jwt.sign(buildPortalPayload(user), portal.secret, { algorithm: "HS256" });
  const embedUrl = `${HOLISTICS_HOST}/embed/${portal.key}?_token=${token}&left_panel_state=collapsed`;
  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
