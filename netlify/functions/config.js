// The account reference list. REQUIRES A SESSION.
//
// This used to be open, and it undid the care taken in login.js: that
// handler deliberately returns the same message for a bad email as for a
// bad password so accounts cannot be enumerated, while this endpoint
// published all four real customer email addresses and each account's
// exact state and department scope to anyone who asked.
//
// The login screen no longer needs it either -- email is typed now, not
// picked from a dropdown -- so nothing reads this before sign-in.
//
// No secrets here regardless: portal keys and secrets are env vars read
// only by embed-token.js.
import { publicUsers } from "./_users.js";
import { userIdFromRequest } from "./_auth.js";

export const handler = async (event) => {
  if (!userIdFromRequest(event.headers || {})) {
    return {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Not signed in." }),
    };
  }
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ users: publicUsers() }),
  };
};
