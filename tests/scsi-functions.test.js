import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPayload,
  createEmbedSession,
  getIdentity,
  getPublicIdentities,
} from "../functions/_lib/scsi.js";
import { onRequestPost } from "../functions/api/embed-token.js";

function decodePayload(embedUrl) {
  const token = new URL(embedUrl).searchParams.get("_token");
  const encodedPayload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
}

test("publishes exactly the two approved display identities", () => {
  assert.deepEqual(getPublicIdentities(), [
    {
      id: "riverside",
      name: "Riverside Regional Medical Center",
      clientId: 3,
      piiAccess: true,
    },
    {
      id: "harborline",
      name: "Harborline Auto Finance",
      clientId: 4,
      piiAccess: false,
    },
  ]);
});

test("builds the approved Riverside permission payload", () => {
  const payload = buildPayload(getIdentity("riverside"), 1_700_000_000);

  assert.deepEqual(payload.user_attributes, {
    scsi_client_id: [3],
    pii_access: [1],
  });
  assert.equal(payload.object_name, "scsi_portal");
  assert.equal(payload.settings.allow_dashboard_export, false);
  assert.equal(payload.settings.allow_raw_data_export, false);
  assert.equal(payload.settings.allow_data_subscribe, false);
  assert.deepEqual(payload.permissions, {
    enable_personal_workspace: false,
    org_workspace_role: "no_access",
  });
  assert.equal(payload.exp - payload.iat, 3600);
});

test("builds the approved Harborline permission payload", () => {
  const payload = buildPayload(getIdentity("harborline"), 1_700_000_000);

  assert.deepEqual(payload.user_attributes, {
    scsi_client_id: [4],
    pii_access: [0],
  });
});

test("rejects an unknown identity", () => {
  assert.throws(() => getIdentity("forged-client"), /Unknown identity/);
});

test("creates a deep link without exposing the signing secret", async () => {
  const embedSecret = "unit-test-secret-that-must-not-leak";
  const session = await createEmbedSession({
    identityId: "riverside",
    embedKey: "test-key",
    embedSecret,
    issuedAt: 1_700_000_000,
  });
  const url = new URL(session.embedUrl);
  const payload = decodePayload(session.embedUrl);

  assert.equal(url.pathname, "/embed/test-key/objects/scsi_client_portal");
  assert.equal(url.searchParams.get("left_panel_state"), "collapsed");
  assert.deepEqual(payload.user_attributes, { scsi_client_id: [3], pii_access: [1] });
  assert.deepEqual(session.payloadPreview, {
    object_name: "scsi_portal",
    object_type: "EmbedPortal",
    settings: payload.settings,
    permissions: payload.permissions,
    user_attributes: payload.user_attributes,
  });
  assert.equal(JSON.stringify(session).includes(embedSecret), false);
});

test("token endpoint rejects browser-supplied permission attributes", async () => {
  const request = new Request("https://example.test/api/embed-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: "riverside", pii_access: [1] }),
  });
  const response = await onRequestPost({ request, env: {} });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "identity_id is the only accepted field" });
});

test("token endpoint rejects unknown identities without issuing a token", async () => {
  const request = new Request("https://example.test/api/embed-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: "forged-client" }),
  });
  const response = await onRequestPost({
    request,
    env: { HOLISTICS_EMBED_KEY: "test-key", HOLISTICS_EMBED_SECRET: "test-secret" },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "Unknown identity" });
});

test("token endpoint fails safely when runtime credentials are missing", async () => {
  const request = new Request("https://example.test/api/embed-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: "riverside" }),
  });
  const response = await onRequestPost({ request, env: {} });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Embed session is unavailable" });
});
