import { getPublicIdentities } from "../_lib/laasie.js";

export async function onRequestGet(context) {
  return Response.json(
    { identities: getPublicIdentities(context.env) },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
