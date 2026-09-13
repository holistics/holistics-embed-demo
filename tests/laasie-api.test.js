import assert from "node:assert/strict";
import test from "node:test";

import { getSessionRefreshDelay } from "../frontend/src/laasie-api.js";

test("renews an embed session one minute before expiry", () => {
  const now = Date.parse("2026-08-21T10:00:00.000Z");

  assert.equal(
    getSessionRefreshDelay("2026-08-21T11:00:00.000Z", now),
    59 * 60 * 1000,
  );
});

test("renews immediately when a session is expired or close to expiry", () => {
  const now = Date.parse("2026-08-21T10:00:00.000Z");

  assert.equal(getSessionRefreshDelay("2026-08-21T09:59:00.000Z", now), 0);
  assert.equal(getSessionRefreshDelay("2026-08-21T10:00:30.000Z", now), 0);
});

test("does not schedule renewal without a valid expiry", () => {
  assert.equal(getSessionRefreshDelay(undefined), null);
  assert.equal(getSessionRefreshDelay("not-a-date"), null);
});
