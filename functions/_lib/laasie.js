const PORTAL_NAME = "laasie_portal";
const INITIAL_OBJECT = "laasie_owner_portal";
const TOKEN_TTL_SECONDS = 60 * 60;

const IDENTITIES = Object.freeze({
  cardinal_peak: Object.freeze({
    id: "cardinal_peak",
    name: "Cardinal Peak Hospitality",
    embedUserId: "laasie-cardinal-peak-demo-user",
    embedOrgId: "laasie-cardinal-peak-demo-org",
    companyIds: Object.freeze([1, 2, 3, 4, 5, 6]),
    subscriptionEmailEnv: "HOLISTICS_CARDINAL_PEAK_SUBSCRIPTION_EMAIL",
  }),
  sable_point: Object.freeze({
    id: "sable_point",
    name: "Sable Point Collection",
    embedUserId: "laasie-sable-point-demo-user",
    embedOrgId: "laasie-sable-point-demo-org",
    companyIds: Object.freeze([5]),
    subscriptionEmailEnv: "HOLISTICS_SABLE_POINT_SUBSCRIPTION_EMAIL",
  }),
});

function encodeBase64Url(value) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : new Uint8Array(value);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function getPublicIdentities() {
  return Object.values(IDENTITIES).map(({ id, name, companyIds }) => ({
    id,
    name,
    companyIds: [...companyIds],
  }));
}

export function getIdentity(identityId) {
  const identity = Object.hasOwn(IDENTITIES, identityId) ? IDENTITIES[identityId] : undefined;

  if (!identity) {
    throw new Error("Unknown identity");
  }

  return identity;
}

export function buildPayload(identity, subscriptionEmail, issuedAt = Math.floor(Date.now() / 1000)) {
  if (!subscriptionEmail) {
    throw new Error("Subscription email is not configured");
  }

  return {
    object_name: PORTAL_NAME,
    object_type: "EmbedPortal",
    embed_user_id: identity.embedUserId,
    embed_org_id: identity.embedOrgId,
    embed_user_email: subscriptionEmail,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: true,
      allow_data_subscribe: true,
      allow_dashboard_timezone_change: false,
      dashboard_autorun_on_changes: false,
      hide_dashboard_filters_controls_panel: false,
    },
    permissions: {
      enable_personal_workspace: false,
      org_workspace_role: "no_access",
    },
    user_attributes: {
      company_id: [...identity.companyIds],
    },
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };
}

function getPayloadPreview(payload) {
  const { object_name, object_type, settings, permissions, user_attributes } = payload;

  return { object_name, object_type, settings, permissions, user_attributes };
}

export async function signPayload(payload, secret) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signingInput));

  return `${signingInput}.${encodeBase64Url(signature)}`;
}

export async function createEmbedSession({
  identityId,
  env,
  embedKey,
  embedSecret,
  issuedAt,
}) {
  const identity = getIdentity(identityId);

  if (!embedKey || !embedSecret) {
    throw new Error("Embed credentials are not configured");
  }

  const subscriptionEmail = env[identity.subscriptionEmailEnv];
  const payload = buildPayload(identity, subscriptionEmail, issuedAt);
  const token = await signPayload(payload, embedSecret);
  const url = new URL(
    `/embed/${encodeURIComponent(embedKey)}/objects/${INITIAL_OBJECT}`,
    "https://demo4.holistics.io",
  );
  url.searchParams.set("_token", token);
  url.searchParams.set("left_panel_state", "collapsed");
  const aiUrl = new URL(
    `/embed/${encodeURIComponent(embedKey)}/ai`,
    "https://demo4.holistics.io",
  );
  aiUrl.searchParams.set("_token", token);
  aiUrl.searchParams.set("left_panel_state", "collapsed");

  return {
    embedUrl: url.toString(),
    aiUrl: aiUrl.toString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    payloadPreview: getPayloadPreview(payload),
  };
}
