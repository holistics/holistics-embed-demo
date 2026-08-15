// Mints the embed token for the signed-in RetailFocus user.
//
// The identity comes from the session token, never from the request body.
// That is the whole point of the login: without it, a POST to this
// endpoint could name any persona and get that persona's data back.
//
// Both portals share one key/secret. Embed credentials are per-tenant, so
// only object_name changes between an Explorer and a Viewer token.
import jwt from "jsonwebtoken";
import { findUser, buildPayload } from "./_users.js";
import { authConfigError, userIdFromRequest } from "./_auth.js";

const HOST = process.env.HOLISTICS_HOST || "https://us.holistics.io";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const configError = authConfigError();
  if (configError) return json(500, { error: configError });

  const userId = userIdFromRequest(event.headers);
  if (!userId) return json(401, { error: "Not signed in, or the session has expired. Sign in again." });

  // A session that names a user who no longer exists (removed from the
  // list, secret reused) is not a session worth honouring.
  const user = findUser(userId);
  if (!user) return json(401, { error: "This session no longer matches a known account." });

  const key = process.env.HOLISTICS_SHELFOPTIX_PORTAL_KEY;
  const secret = process.env.HOLISTICS_SHELFOPTIX_PORTAL_SECRET;
  if (!key || !secret) {
    return json(500, {
      error:
        "Missing HOLISTICS_SHELFOPTIX_PORTAL_KEY / _SECRET. Publish the portals, then Tools > Embedded Analytics > Enable to copy the Key ID and Secret.",
    });
  }

  const payload = buildPayload(user);
  const token = jwt.sign(payload, secret, { algorithm: "HS256" });

  // Viewers open on the dashboard with the nav collapsed; explorers get
  // the panel so they can reach the dataset.
  const params = new URLSearchParams({ _token: token });
  if (user.capability === "viewer") params.set("left_panel_state", "collapsed");

  return json(200, {
    embedUrl: `${HOST}/embed/${key}?${params}`,
    // Echoed so the dev panel shows what was actually signed rather than
    // a hand-written guess at it.
    payload,
  });
};
