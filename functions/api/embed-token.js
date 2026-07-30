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

// Mercateam Embed Portal token. RLS = row-level, per site: user_attributes.site_id is the
// array of sites this user may see; each dataset's `site_access` permission clips rows to it.
export async function onRequestPost(context) {
  const EMBED_KEY = context.env.HOLISTICS_MERCATEAM_PORTAL_KEY;
  const EMBED_SECRET = context.env.HOLISTICS_MERCATEAM_PORTAL_SECRET;

  if (!EMBED_KEY || !EMBED_SECRET) {
    return Response.json(
      { error: "Missing HOLISTICS_MERCATEAM_PORTAL_KEY / HOLISTICS_MERCATEAM_PORTAL_SECRET env vars." },
      { status: 500 },
    );
  }

  const { portal, user, url_suffix } = await context.request.json();
  if (!portal) {
    return Response.json({ error: "portal is required" }, { status: 400 });
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
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = await signJwt(payload, EMBED_SECRET);
  const embedUrl = `https://eu.holistics.io/embed/${EMBED_KEY}${url_suffix || ""}?_token=${token}&left_panel_state=collapsed`;

  return Response.json({ embedUrl });
}
