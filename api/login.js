// POST { email, password } -> { user, session }
//
// Both a wrong email and a wrong password return the same 401 with the same
// wording. Distinguishing them would turn this endpoint into a way to
// enumerate which accounts exist.
import { USERS, publicUsers } from "../netlify/functions/_users.js";
import {
  authConfigError,
  passwordMatches,
  issueSession,
  SESSION_TTL_SECONDS,
} from "../netlify/functions/_auth.js";
import { applyCors, send, readBody } from "./_vercel.js";

export default function handler(req, res) {
  if (applyCors(req, res)) return;
  if (req.method !== "POST") return send(res, 405, { error: "POST only." });

  const configError = authConfigError();
  if (configError) return send(res, 500, { error: configError });

  const body = readBody(req);
  if (body === null) return send(res, 400, { error: "Body must be JSON: { email, password }" });

  const { email, password } = body;
  const user = USERS.find(
    (u) => u.email.toLowerCase() === String(email ?? "").trim().toLowerCase()
  );
  // Pass the user in: each account has its own password. An unknown email
  // still burns a full scrypt verification against a dummy hash, so a bad
  // email does not answer faster than a bad password.
  const ok = passwordMatches(user, password);
  if (!user || !ok) return send(res, 401, { error: "That email and password do not match." });

  return send(res, 200, {
    user: publicUsers().find((u) => u.id === user.id),
    session: issueSession(user),
    expires_in: SESSION_TTL_SECONDS,
  });
}
