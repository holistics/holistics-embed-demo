const PORTAL_NAME = "scsi_portal";
const INITIAL_OBJECT = "scsi_client_portal";
const TOKEN_TTL_SECONDS = 60 * 60;

const IDENTITIES = Object.freeze({
  riverside: Object.freeze({
    id: "riverside",
    name: "Riverside Regional Medical Center",
    embedUserId: "scsi-riverside-demo-user",
    embedOrgId: "scsi-riverside-demo-org",
    clientId: 3,
    piiAccess: 1,
  }),
  harborline: Object.freeze({
    id: "harborline",
    name: "Harborline Auto Finance",
    embedUserId: "scsi-harborline-demo-user",
    embedOrgId: "scsi-harborline-demo-org",
    clientId: 4,
    piiAccess: 0,
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
  return Object.values(IDENTITIES).map(({ id, name, clientId, piiAccess }) => ({
    id,
    name,
    clientId,
    piiAccess: piiAccess === 1,
  }));
}

export function getIdentity(identityId) {
  const identity = IDENTITIES[identityId];

  if (!identity) {
    throw new Error("Unknown identity");
  }

  return identity;
}

export function buildPayload(identity, issuedAt = Math.floor(Date.now() / 1000)) {
  return {
    object_name: PORTAL_NAME,
    object_type: "EmbedPortal",
    embed_user_id: identity.embedUserId,
    embed_org_id: identity.embedOrgId,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: false,
      allow_raw_data_export: false,
      allow_data_subscribe: false,
    },
    permissions: {
      enable_personal_workspace: false,
      org_workspace_role: "no_access",
    },
    user_attributes: {
      scsi_client_id: [identity.clientId],
      pii_access: [identity.piiAccess],
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

export async function createEmbedSession({ identityId, embedKey, embedSecret, issuedAt }) {
  const identity = getIdentity(identityId);

  if (!embedKey || !embedSecret) {
    throw new Error("Embed credentials are not configured");
  }

  const payload = buildPayload(identity, issuedAt);
  const token = await signPayload(payload, embedSecret);
  const url = new URL(
    `/embed/${encodeURIComponent(embedKey)}/objects/${INITIAL_OBJECT}`,
    "https://demo4.holistics.io",
  );
  url.searchParams.set("_token", token);
  url.searchParams.set("left_panel_state", "collapsed");

  return {
    embedUrl: url.toString(),
    expiresAt: new Date(payload.exp * 1000).toISOString(),
    payloadPreview: getPayloadPreview(payload),
  };
}
