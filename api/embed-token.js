// POST -> { embedUrl, payload }
//
// No user id in the body on purpose: identity is read out of the signed
// session, so the browser cannot ask for another account's scope.
import jwt from "jsonwebtoken";
import { findUser, buildPayload, portalFor } from "../netlify/functions/_users.js";
import { authConfigError, userIdFromRequest } from "../netlify/functions/_auth.js";
import { applyCors, send } from "./_vercel.js";

const HOST = process.env.HOLISTICS_HOST || "https://us.holistics.io";

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return send(res, 405, { error: "POST only." });

  const configError = authConfigError();
  if (configError) return send(res, 500, { error: configError });

  const userId = userIdFromRequest(req.headers);
  if (!userId) {
    return send(res, 401, { error: "Not signed in, or the session has expired. Sign in again." });
  }
  const user = findUser(userId);
  if (!user) return send(res, 401, { error: "This session no longer matches a known account." });

  // Credentials are per PORTAL, not per tenant: explorers go to the portal
  // that lists the dataset, viewers to the dashboard-only one.
  const { name: portalName, envPrefix } = portalFor(user);
  const key = process.env[`${envPrefix}_KEY`];
  const secret = process.env[`${envPrefix}_SECRET`];
  if (!key || !secret) {
    return send(res, 500, {
      error:
        `Missing ${envPrefix}_KEY / _SECRET for portal '${portalName}'. ` +
        "Publish that portal, then Tools > Embedded Analytics > Enable to copy the Key ID and Secret. " +
        "Every portal has its own pair.",
    });
  }

  const payload = buildPayload(user);
  const token = jwt.sign(payload, secret, { algorithm: "HS256" });
  const params = new URLSearchParams({ _token: token, left_panel_state: "collapsed" });

  return send(res, 200, { embedUrl: `${HOST}/embed/${key}?${params}`, payload });
}
