import { createEmbedSession } from "../_lib/laasie.js";

const RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

export async function onRequestPost(context) {
  let body;

  try {
    body = await context.request.json();
  } catch {
    return Response.json(
      { error: "Request body must be valid JSON" },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    Object.keys(body).length !== 1 ||
    typeof body.identity_id !== "string"
  ) {
    return Response.json(
      { error: "identity_id is the only accepted field" },
      { status: 400, headers: RESPONSE_HEADERS },
    );
  }

  try {
    const session = await createEmbedSession({
      identityId: body.identity_id,
      env: context.env,
      embedKey: context.env.HOLISTICS_EMBED_KEY,
      embedSecret: context.env.HOLISTICS_EMBED_SECRET,
    });

    return Response.json(session, { headers: RESPONSE_HEADERS });
  } catch (error) {
    const isUnknownIdentity = error.message === "Unknown identity";

    return Response.json(
      { error: isUnknownIdentity ? "Unknown identity" : "Embed session is unavailable" },
      {
        status: isUnknownIdentity ? 400 : 500,
        headers: RESPONSE_HEADERS,
      },
    );
  }
}
