import { getPublicIdentities } from "../_lib/scsi.js";

export async function onRequestGet() {
  return Response.json(
    { identities: getPublicIdentities() },
    { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } },
  );
}
