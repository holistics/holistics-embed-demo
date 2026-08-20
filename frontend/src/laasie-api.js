async function readJson(response, fallbackMessage) {
  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error(fallbackMessage);
  }

  if (!response.ok) {
    throw new Error(data.error || fallbackMessage);
  }

  return data;
}

export async function fetchIdentities(signal) {
  const response = await fetch("/api/config", { signal });
  const data = await readJson(response, "The portfolio identities could not be loaded.");

  if (
    !Array.isArray(data.identities) ||
    data.identities.length !== 2 ||
    data.identities.some((identity) => !Array.isArray(identity.companyIds))
  ) {
    throw new Error("The approved portfolio identities are unavailable.");
  }

  return data.identities;
}

export async function fetchEmbedSession(identityId, signal) {
  const response = await fetch("/api/embed-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identity_id: identityId }),
    signal,
  });
  const data = await readJson(response, "The secure portfolio session could not be created.");

  if (typeof data.embedUrl !== "string" || typeof data.aiUrl !== "string" || !data.payloadPreview) {
    throw new Error("The secure portfolio session could not be created.");
  }

  return data;
}
