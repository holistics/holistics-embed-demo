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

// Single-dashboard embed JWT payload (docs.holistics.io/embedded/single-dashboard).
// RLS is enforced here (server-signed): scoped users get a row_based rule on
// project_id_no; the corporate user (no tenant) gets an empty rule set -> all tenants.
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

export async function onRequestPost(context) {
  const EMBED_KEY = context.env.HOLISTICS_EMBED_KEY;
  const EMBED_SECRET = context.env.HOLISTICS_EMBED_SECRET;

  const { user } = await context.request.json();

  const token = await signJwt(buildPayload(user), EMBED_SECRET);
  const embedUrl = `https://demo4.holistics.io/embed/${EMBED_KEY}?_token=${token}`;

  return Response.json({ embedUrl });
}
