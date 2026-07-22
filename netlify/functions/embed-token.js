import jwt from "jsonwebtoken";

// Personas — mirrors backend/server.js.
const USERS = [
  { id: "cascade",     type: "retailer",     name: "Cascade Foods Co.",   email: "analytics@cascadefoods.com", schema: "shelfoptix_retailer_101" },
  { id: "marketfresh", type: "retailer",     name: "MarketFresh Grocery", email: "insights@marketfresh.com",   schema: "shelfoptix_retailer_102" },
  { id: "pureharvest", type: "retailer",     name: "PureHarvest Brands",  email: "analytics@pureharvest.com",  schema: "shelfoptix_retailer_103" },
  { id: "pg",          type: "manufacturer", name: "Procter & Gamble",    email: "analytics@pg.com",           manufacturer_id: 1 },
  { id: "unilever",    type: "manufacturer", name: "Unilever",            email: "analytics@unilever.com",     manufacturer_id: 2 },
  { id: "nestle",      type: "manufacturer", name: "Nestlé",              email: "analytics@nestle.com",       manufacturer_id: 3 },
  { id: "pepsico",     type: "manufacturer", name: "PepsiCo",             email: "analytics@pepsico.com",      manufacturer_id: 4 },
];

// Retailer + manufacturer portals are separate embed objects; the token's object_name
// selects which. Each has its own key/secret from the Holistics UI embed settings.
function portalFor(user) {
  return user.type === "manufacturer"
    ? {
        object: "shelfoptix_manufacturer_portal",
        key: process.env.HOLISTICS_MANUFACTURER_PORTAL_KEY,
        secret: process.env.HOLISTICS_MANUFACTURER_PORTAL_SECRET,
      }
    : {
        object: "shelfoptix_portal",
        key: process.env.HOLISTICS_RETAILER_PORTAL_KEY || process.env.HOLISTICS_PORTAL_EMBED_KEY,
        secret: process.env.HOLISTICS_RETAILER_PORTAL_SECRET || process.env.HOLISTICS_PORTAL_EMBED_SECRET,
      };
}

function buildPortalPayload(user, objectName) {
  const user_attributes =
    user.type === "manufacturer"
      ? { manufacturer_id: [user.manufacturer_id] }
      : { schema: [user.schema] };

  return {
    object_name: objectName,
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

export const handler = async (event) => {
  const { user: userId } = JSON.parse(event.body || "{}");
  const user = USERS.find((u) => u.id === userId) || USERS[0];
  const portal = portalFor(user);

  if (!portal.key || !portal.secret) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: `Missing embed key/secret for ${user.type} portal.` }),
    };
  }

  const token = jwt.sign(buildPortalPayload(user, portal.object), portal.secret, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${portal.key}?_token=${token}&left_panel_state=collapsed`;
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ embedUrl }) };
};
