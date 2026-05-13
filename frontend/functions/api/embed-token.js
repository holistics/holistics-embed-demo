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

export async function onRequestPost(context) {
  const EMBED_KEY = context.env.HOLISTICS_EMBED_CODE;
  const EMBED_SECRET = context.env.HOLISTICS_EMBED_SECRET;
  const HOLISTICS_BASE_URL = context.env.HOLISTICS_BASE_URL || "https://demo4.holistics.io";

  const { user, data_source } = await context.request.json();

  const payload = {
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: true,
      allow_data_subscribe: true,
    },
    user_attributes: {
      ...(data_source && { data_source: [data_source] }),
    },
    permissions: {
      enable_personal_workspace: true,
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = await signJwt(payload, EMBED_SECRET);
  const embedUrl = `${HOLISTICS_BASE_URL}/embed/${EMBED_KEY}?_token=${token}&left_panel_state=collapsed`;

  return Response.json({ embedUrl });
}
