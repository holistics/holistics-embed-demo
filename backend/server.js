import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const EMBED_CODE = process.env.DASHBOARD_EMBED_CODE;
const EMBED_SECRET = process.env.DASHBOARD_EMBED_SECRET;

const PORTALS = [
  { id: "brainstorm_apac_dashboard", title: "Brainstorm APAC POC", icon: "Activity" },
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
    { id: "brainstorm_company_a_viewer", name: "Synthetic non-admin — Company A", role: "Non-admin RLS test identity", companyId: companyAId },
    { id: "brainstorm_company_b_viewer", name: "Synthetic non-admin — Company B", role: "Non-admin RLS test identity", companyId: companyBId },
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
    return res.status(400).json({ error: "A valid dashboard is required" });
  }

  if (!EMBED_CODE || !EMBED_SECRET) {
    return res.status(500).json({ error: "DASHBOARD_EMBED_CODE and DASHBOARD_EMBED_SECRET must be configured" });
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
    settings: {
      enable_export_data: true,
    },
    permissions: { row_based: [] },
    filters: {},
    user_attributes: {
      company_id: [identity.companyId],
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${encodeURIComponent(EMBED_CODE)}?_token=${token}`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
