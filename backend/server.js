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
  { id: "hotels_embed_portal", title: "Hotel Analytics", icon: "Activity" },
  { id: "ask_ai", title: "Ask AI", icon: "Activity", portal: "hotels_embed_portal", urlSuffix: "/ai" },
  { id: "ecommerce_portal", title: "Ecommerce Dashboard", icon: "ShoppingCart" },
];

const USERS = [
  { id: "user_1", name: "Alice Johnson", email: "alice.johnson@acmehospitality.com", dataSource: "customer_acme" },
  { id: "user_2", name: "Erik Lindgren", email: "erik.lindgren@acmehospitality.com", dataSource: "customer_acme" },
  { id: "user_3", name: "Bob Smith", email: "bob.smith@globexhotels.com", dataSource: "customer_globex" },
  { id: "user_4", name: "Sofia Nilsen", email: "sofia.nilsen@globexhotels.com", dataSource: "customer_globex" },
  { id: "chinh.dm", name: "Chinh DM", email: "chinh.dm@holistics.io", dataSource: "customer_holistics" },
];

app.get("/api/config", (req, res) => {
  res.json({ portals: PORTALS, users: USERS });
});

app.post("/api/embed-token", (req, res) => {
  const { portal, user, data_source, url_suffix } = req.body;

  if (!portal) {
    return res.status(400).json({ error: "portal is required" });
  }

  const payload = {
    object_name: portal,
    object_type: "EmbedPortal",
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
  const embedUrl = `https://demo4.holistics.io/embed/${EMBED_KEY}${url_suffix || ""}?_token=${token}&left_panel_state=collapsed`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
