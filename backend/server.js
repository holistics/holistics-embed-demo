import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const EMBED_KEY = process.env.HOLISTICS_EMBED_CODE;
const EMBED_SECRET = process.env.HOLISTICS_EMBED_SECRET;
const HOLISTICS_BASE_URL = process.env.HOLISTICS_BASE_URL || "https://demo4.holistics.io";

const USERS = [
  { id: "user_1", name: "Alice Johnson", email: "alice.johnson@acmehospitality.com", dataSource: "customer_acme" },
  { id: "user_2", name: "Erik Lindgren", email: "erik.lindgren@acmehospitality.com", dataSource: "customer_acme" },
  { id: "user_3", name: "Bob Smith", email: "bob.smith@globexhotels.com", dataSource: "customer_globex" },
  { id: "user_4", name: "Sofia Nilsen", email: "sofia.nilsen@globexhotels.com", dataSource: "customer_globex" },
  { id: "chinh.dm", name: "Chinh DM", email: "chinh.dm@holistics.io", dataSource: "customer_holistics" },
];

app.get("/api/config", (req, res) => {
  res.json({ users: USERS });
});

app.post("/api/embed-token", (req, res) => {
  const { user, data_source } = req.body;

  const payload = {
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: true,
      allow_data_subscribe: true,
    },
    user_attributes: {
      vendor_id: "__ALL__",
      country: "__ALL__",
      city: "__ALL__",
      ...(data_source && { data_source: [data_source] }),
    },
    permissions: {
      "enable_personal_workspace": true
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `${HOLISTICS_BASE_URL}/embed/${EMBED_KEY}?_token=${token}&left_panel_state=collapsed`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
