// POST { email, password } -> { user, session }
//
// Both a wrong email and a wrong password return the same 401 with the
// same wording. Distinguishing them would turn this endpoint into a way
// to enumerate which accounts exist.
import { USERS, publicUsers } from "./_users.js";
import { authConfigError, passwordMatches, issueSession, SESSION_TTL_SECONDS } from "./_auth.js";

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  const configError = authConfigError();
  if (configError) return json(500, { error: configError });

  let email, password;
  try {
    ({ email, password } = JSON.parse(event.body || "{}"));
  } catch {
    return json(400, { error: "Body must be JSON: { email, password }" });
  }

  const user = USERS.find((u) => u.email.toLowerCase() === String(email ?? "").trim().toLowerCase());
  const ok = passwordMatches(password);

  // Run the password check even when the email is unknown, so a bad email
  // does not answer faster than a bad password.
  if (!user || !ok) return json(401, { error: "That email and password do not match." });

  return json(200, {
    user: publicUsers().find((u) => u.id === user.id),
    session: issueSession(user),
    expires_in: SESSION_TTL_SECONDS,
  });
};
