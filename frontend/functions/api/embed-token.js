function base64url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlEncode(str) {
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));

  return `${signingInput}.${base64url(signature)}`;
}

// Personas — must mirror backend/server.js.
const USERS = [
  { id: "cascade",     type: "retailer",     name: "Cascade Foods Co.",   email: "analytics@cascadefoods.com", schema: "shelfoptix_retailer_101" },
  { id: "marketfresh", type: "retailer",     name: "MarketFresh Grocery", email: "insights@marketfresh.com",   schema: "shelfoptix_retailer_102" },
  { id: "pureharvest", type: "retailer",     name: "PureHarvest Brands",  email: "analytics@pureharvest.com",  schema: "shelfoptix_retailer_103" },
  { id: "pg",          type: "manufacturer", name: "Procter & Gamble",    email: "analytics@pg.com",           manufacturer_id: 1 },
  { id: "unilever",    type: "manufacturer", name: "Unilever",            email: "analytics@unilever.com",     manufacturer_id: 2 },
  { id: "nestle",      type: "manufacturer", name: "Nestlé",              email: "analytics@nestle.com",       manufacturer_id: 3 },
  { id: "pepsico",     type: "manufacturer", name: "PepsiCo",             email: "analytics@pepsico.com",      manufacturer_id: 4 },
];

// Retailer + manufacturer portals are separate embed objects (keeps the union out of
// retailers' reach). Each has its own key/secret; the token's object_name selects it.
function portalFor(user, env) {
  return user.type === "manufacturer"
    ? {
        object: "shelfoptix_manufacturer_portal",
        key: env.HOLISTICS_MANUFACTURER_PORTAL_KEY,
        secret: env.HOLISTICS_MANUFACTURER_PORTAL_SECRET,
      }
    : {
        object: "shelfoptix_portal",
        key: env.HOLISTICS_RETAILER_PORTAL_KEY || env.HOLISTICS_PORTAL_EMBED_KEY,
        secret: env.HOLISTICS_RETAILER_PORTAL_SECRET || env.HOLISTICS_PORTAL_EMBED_SECRET,
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

export async function onRequestPost(context) {
  const { user: userId } = await context.request.json();
  const user = USERS.find((u) => u.id === userId) || USERS[0];
  const portal = portalFor(user, context.env);

  if (!portal.key || !portal.secret) {
    return Response.json(
      { error: `Missing embed key/secret for ${user.type} portal.` },
      { status: 500 },
    );
  }

  const token = await signJwt(buildPortalPayload(user, portal.object), portal.secret);
  const embedUrl = `https://demo4.holistics.io/embed/${portal.key}?_token=${token}&left_panel_state=collapsed`;
  return Response.json({ embedUrl });
}
