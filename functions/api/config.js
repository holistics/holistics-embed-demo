const PORTALS = [
  { id: "brainstorm_apac_embed_portal", title: "Brainstorm APAC POC", icon: "Activity" },
];

function getTestIdentities(env) {
  const companyAId = Number(env.BRAINSTORM_COMPANY_A_ID);
  const companyBId = Number(env.BRAINSTORM_COMPANY_B_ID);

  if (!Number.isSafeInteger(companyAId) || companyAId <= 0 || !Number.isSafeInteger(companyBId) || companyBId <= 0) {
    throw new Error("BRAINSTORM_COMPANY_A_ID and BRAINSTORM_COMPANY_B_ID must be positive integers");
  }

  if (companyAId === companyBId) {
    throw new Error("BRAINSTORM_COMPANY_A_ID and BRAINSTORM_COMPANY_B_ID must identify different companies");
  }

  return [
    { id: "brainstorm_company_a_viewer", orgId: "brainstorm_company_a_org", name: "Synthetic non-admin — Company A", role: "Non-admin RLS test identity", companyId: companyAId },
    { id: "brainstorm_company_b_viewer", orgId: "brainstorm_company_b_org", name: "Synthetic non-admin — Company B", role: "Non-admin RLS test identity", companyId: companyBId },
  ];
}

export async function onRequestGet(context) {
  try {
    return Response.json({ portals: PORTALS, users: getTestIdentities(context.env) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
