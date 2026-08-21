import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPayload,
  createEmbedSession,
  getIdentity,
  getPublicIdentities,
} from "../functions/_lib/laasie.js";
import { onRequestGet } from "../functions/api/config.js";
import { onRequestPost } from "../functions/api/embed-token.js";

const COMPLETE_ENV = {
  HOLISTICS_EMBED_KEY: "test-key",
  HOLISTICS_EMBED_SECRET: "test-secret",
  HOLISTICS_CARDINAL_PEAK_SUBSCRIPTION_EMAIL: "cardinal@example.test",
  HOLISTICS_SABLE_POINT_SUBSCRIPTION_EMAIL: "sable@example.test",
};

function decodePayload(embedUrl) {
  const token = new URL(embedUrl).searchParams.get("_token");
  const encodedPayload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(encodedPayload, "base64").toString("utf8"));
}

test("publishes exactly the two requested display identities and approved scopes", () => {
  assert.deepEqual(getPublicIdentities(), [
    {
      id: "cardinal_peak",
      name: "Cardinal Peak Hospitality",
      companyIds: [1, 2, 3, 4, 5, 6],
    },
    {
      id: "sable_point",
      name: "Sable Point Collection",
      companyIds: [5],
    },
  ]);
});

test("builds a tenant-scoped, subscription-enabled payload", () => {
  const payload = buildPayload(
    getIdentity("sable_point"),
    COMPLETE_ENV.HOLISTICS_SABLE_POINT_SUBSCRIPTION_EMAIL,
    1_700_000_000,
  );

  assert.equal(payload.object_name, "laasie_portal");
  assert.equal(payload.object_type, "EmbedPortal");
  assert.equal(payload.embed_user_id, "laasie-sable-point-demo-user");
  assert.equal(payload.embed_org_id, "laasie-sable-point-demo-org");
  assert.equal(payload.embed_user_email, COMPLETE_ENV.HOLISTICS_SABLE_POINT_SUBSCRIPTION_EMAIL);
  assert.deepEqual(payload.user_attributes, { company_id: [5] });
  assert.deepEqual(payload.settings.ai, { enabled: true });
  assert.equal(payload.settings.allow_dashboard_export, true);
  assert.equal(payload.settings.allow_data_subscribe, true);
  assert.equal(payload.settings.allow_raw_data_export, true);
  assert.equal(payload.settings.dashboard_autorun_on_changes, true);
  assert.deepEqual(payload.permissions, {
    enable_personal_workspace: true,
    org_workspace_role: "editor",
  });
  assert.equal(payload.exp - payload.iat, 3600);
});

test("creates a deep link without exposing the signing secret or subscription email", async () => {
  const session = await createEmbedSession({
    identityId: "cardinal_peak",
    env: COMPLETE_ENV,
    embedKey: COMPLETE_ENV.HOLISTICS_EMBED_KEY,
    embedSecret: COMPLETE_ENV.HOLISTICS_EMBED_SECRET,
    issuedAt: 1_700_000_000,
  });
  const url = new URL(session.embedUrl);
  const aiUrl = new URL(session.aiUrl);
  const payload = decodePayload(session.embedUrl);

  assert.equal(url.pathname, "/embed/test-key/objects/laasie_owner_portal");
  assert.equal(url.searchParams.get("left_panel_state"), "collapsed");
  assert.equal(aiUrl.pathname, "/embed/test-key/ai");
  assert.equal(aiUrl.searchParams.get("_token"), url.searchParams.get("_token"));
  assert.equal(aiUrl.searchParams.get("left_panel_state"), "collapsed");
  assert.deepEqual(payload.user_attributes, { company_id: [1, 2, 3, 4, 5, 6] });
  assert.deepEqual(session.payloadPreview, {
    object_name: "laasie_portal",
    object_type: "EmbedPortal",
    embed_user_id: "laasie-cardinal-peak-demo-user",
    embed_org_id: "laasie-cardinal-peak-demo-org",
    settings: payload.settings,
    permissions: payload.permissions,
    user_attributes: payload.user_attributes,
  });
  assert.equal(
    JSON.stringify(session.payloadPreview).includes(COMPLETE_ENV.HOLISTICS_CARDINAL_PEAK_SUBSCRIPTION_EMAIL),
    false,
  );
  assert.equal(JSON.stringify(session).includes(COMPLETE_ENV.HOLISTICS_EMBED_SECRET), false);
  assert.equal(JSON.stringify(session).includes(COMPLETE_ENV.HOLISTICS_CARDINAL_PEAK_SUBSCRIPTION_EMAIL), false);
});

test("config endpoint does not expose the subscription recipient", async () => {
  const response = await onRequestGet({ env: COMPLETE_ENV });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(JSON.stringify(body).includes(COMPLETE_ENV.HOLISTICS_CARDINAL_PEAK_SUBSCRIPTION_EMAIL), false);
  assert.equal(JSON.stringify(body).includes(COMPLETE_ENV.HOLISTICS_SABLE_POINT_SUBSCRIPTION_EMAIL), false);
  assert.equal(body.identities.length, 2);
});

test("token endpoint rejects browser-supplied permission attributes", async () => {
  const request = new Request("https://example.test/api/embed-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: "sable_point", company_id: [5] }),
  });
  const response = await onRequestPost({ request, env: COMPLETE_ENV });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "identity_id is the only accepted field" });
});

test("token endpoint rejects unknown identities without issuing a token", async () => {
  for (const identityId of ["forged-client", "__proto__"]) {
    const request = new Request("https://example.test/api/embed-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identity_id: identityId }),
    });
    const response = await onRequestPost({ request, env: COMPLETE_ENV });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Unknown identity" });
  }
});

test("token endpoint fails safely when runtime bindings are missing", async () => {
  const request = new Request("https://example.test/api/embed-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: "sable_point" }),
  });
  const response = await onRequestPost({ request, env: {} });

  assert.equal(response.status, 500);
  assert.deepEqual(await response.json(), { error: "Embed session is unavailable" });
});
