// Mints the embed token for the signed-in RetailFocus user.
//
// The identity comes from the session token, never from the request body.
// That is the whole point of the login: without it, a POST to this
// endpoint could name any persona and get that persona's data back.
//
// One portal for all four users. What differs per user is inside the
// token: Ask AI, workspace permissions, and the row-level attributes.
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

  // Collapsed for everyone: the portal opens on the dashboard rather than
  // a nav tree. Explorers still expand it to reach the dataset and Ask AI.
  const params = new URLSearchParams({ _token: token, left_panel_state: "collapsed" });

  return json(200, {
    embedUrl: `${HOST}/embed/${key}?${params}`,
    // Echoed so the dev panel shows what was actually signed rather than
    // a hand-written guess at it.
    payload,
  });
};
