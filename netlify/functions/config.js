// Serves the login screen its user list. No secrets: portal keys and
// secrets are env vars read only by embed-token.js.
import { publicUsers } from "./_users.js";

export const handler = async () => ({
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ users: publicUsers() }),
});
