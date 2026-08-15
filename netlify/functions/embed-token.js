// Mints the embed token for a signed-in RetailFocus user.
//
// The login is a demo login: the browser posts a user id and the server
// trusts it. That is fine for a sales demo and is NOT an auth system —
// anyone who can reach this endpoint can request any persona's token. If
// this ever fronts real data, put a real session in front of it and
// derive the user from the session rather than the request body.
//
// Both portals share one key/secret. Embed credentials are per-tenant,
// so only object_name changes between an Explorer and a Viewer token.
import jwt from "jsonwebtoken";
import { findUser, buildPayload, USERS } from "./_users.js";

const HOST = process.env.HOLISTICS_HOST || "https://us.holistics.io";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  let userId;
  try {
    ({ user: userId } = JSON.parse(event.body || "{}"));
  } catch {
    return json(400, { error: "Body must be JSON: { user: '<id>' }" });
  }

  // Unknown id is an error rather than a silent fallback to the first
  // persona. Falling back would show one user's data under another's
  // name, which is the one failure this whole page is about.
  const user = findUser(userId);
  if (!user) {
    return json(404, {
      error: `Unknown user '${userId}'. Known users: ${USERS.map((u) => u.id).join(", ")}.`,
    });
  }

  const key = process.env.HOLISTICS_RETAILFOCUS_PORTAL_KEY;
  const secret = process.env.HOLISTICS_RETAILFOCUS_PORTAL_SECRET;
  if (!key || !secret) {
    return json(500, {
      error:
        "Missing HOLISTICS_RETAILFOCUS_PORTAL_KEY / _SECRET. Publish the portals, then Tools > Embedded Analytics > Enable to copy the Key ID and Secret.",
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
