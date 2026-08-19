// Account reference list. Signed-in callers only.
//
// It carries real customer email addresses and each account's exact state
// and department scope, which is precisely what /api/login refuses to leak.
// The login screen takes a typed address and does not read this.
import { publicUsers } from "../netlify/functions/_users.js";
import { userIdFromRequest } from "../netlify/functions/_auth.js";
import { applyCors, send } from "./_vercel.js";

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "GET") return send(res, 405, { error: "GET only." });
  if (!userIdFromRequest(req.headers)) return send(res, 401, { error: "Not signed in." });
  return send(res, 200, { users: publicUsers() });
}
