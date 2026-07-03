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

// kind: 'dashboard' -> single-dashboard embed (row_based RLS)
// kind: 'portal'    -> embed portal (all-tenants explore + AI)
const PORTALS = [
  { id: "shelfoptix_osa", kind: "dashboard" },
  { id: "shelfoptix_portal", kind: "portal" },
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

// Embed portal payload: internal all-tenants explore + AI (no row-level restriction).
function buildPortalPayload(portalId, user) {
  return {
    object_name: portalId,
    object_type: "EmbedPortal",
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    user_attributes: {},
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

export async function onRequestPost(context) {
  const { portal, user } = await context.request.json();
  const def = PORTALS.find((p) => p.id === portal) || PORTALS[0];

  if (def.kind === "portal") {
    const token = await signJwt(buildPortalPayload(def.id, user), context.env.HOLISTICS_PORTAL_EMBED_SECRET);
    const embedUrl = `https://demo4.holistics.io/embed/${context.env.HOLISTICS_PORTAL_EMBED_KEY}?_token=${token}&left_panel_state=expanded`;
    return Response.json({ embedUrl });
  }

  const token = await signJwt(buildDashboardPayload(user), context.env.HOLISTICS_EMBED_SECRET);
  const embedUrl = `https://demo4.holistics.io/embed/${context.env.HOLISTICS_EMBED_KEY}?_token=${token}`;
  return Response.json({ embedUrl });
}
