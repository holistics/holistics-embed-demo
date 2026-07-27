import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const EMBED_KEY = process.env.HOLISTICS_EMBED_KEY;
const EMBED_SECRET = process.env.HOLISTICS_EMBED_SECRET;

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

app.get("/api/config", (req, res) => {
  try {
    res.json({ portals: PORTALS, users: getTestIdentities(process.env) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/embed-token", (req, res) => {
  const { portal, identity_id } = req.body;

  if (!PORTALS.some(({ id }) => id === portal)) {
    return res.status(400).json({ error: "A valid embed portal is required" });
  }

  if (!EMBED_KEY || !EMBED_SECRET) {
    return res.status(500).json({ error: "HOLISTICS_EMBED_KEY and HOLISTICS_EMBED_SECRET must be configured" });
  }

  let identity;
  try {
    identity = getTestIdentities(process.env).find(({ id }) => id === identity_id);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!identity) {
    return res.status(400).json({ error: "A valid test identity is required" });
  }

  const payload = {
    object_name: portal,
    object_type: "EmbedPortal",
    embed_user_id: identity.id,
    embed_org_id: identity.orgId,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: true,
      allow_data_subscribe: true,
    },
    user_attributes: {
      company_id: [identity.companyId],
    },
    permissions: {
      enable_personal_workspace: true,
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${encodeURIComponent(EMBED_KEY)}?_token=${token}&left_panel_state=collapsed`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
