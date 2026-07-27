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

function getTestIdentities(env) {
  const companyAId = Number(env.BRAINSTORM_COMPANY_A_ID);
  const companyBId = Number(env.BRAINSTORM_COMPANY_B_ID);

  if (!Number.isSafeInteger(companyAId) || companyAId <= 0 || !Number.isSafeInteger(companyBId) || companyBId <= 0) {
    throw new Error("BRAINSTORM_COMPANY_A_ID and BRAINSTORM_COMPANY_B_ID must be positive integers");
  }

  if (companyAId === companyBId) {
    throw new Error("BRAINSTORM_COMPANY_A_ID and BRAINSTORM_COMPANY_B_ID must identify different companies");
  }

  return [
    { id: "brainstorm_company_a_viewer", orgId: "brainstorm_company_a_org", companyId: companyAId },
    { id: "brainstorm_company_b_viewer", orgId: "brainstorm_company_b_org", companyId: companyBId },
  ];
}

export async function onRequestPost(context) {
  const EMBED_KEY = context.env.HOLISTICS_EMBED_KEY;
  const EMBED_SECRET = context.env.HOLISTICS_EMBED_SECRET;

  const { portal, identity_id } = await context.request.json();

  if (portal !== "brainstorm_apac_embed_portal") {
    return Response.json({ error: "A valid embed portal is required" }, { status: 400 });
  }

  if (!EMBED_KEY || !EMBED_SECRET) {
    return Response.json({ error: "HOLISTICS_EMBED_KEY and HOLISTICS_EMBED_SECRET must be configured" }, { status: 500 });
  }

  let identity;
  try {
    identity = getTestIdentities(context.env).find(({ id }) => id === identity_id);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!identity) {
    return Response.json({ error: "A valid test identity is required" }, { status: 400 });
  }

  const payload = {
    object_name: portal,
    object_type: "EmbedPortal",
    embed_user_id: identity.id,
    embed_org_id: identity.orgId,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: true,
      allow_data_subscribe: true,
    },
    user_attributes: {
      company_id: [identity.companyId],
    },
    permissions: {
      enable_personal_workspace: true,
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = await signJwt(payload, EMBED_SECRET);
  const embedUrl = `https://demo4.holistics.io/embed/${encodeURIComponent(EMBED_KEY)}?_token=${token}&left_panel_state=collapsed`;

  return Response.json({ embedUrl });
}
