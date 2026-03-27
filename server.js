import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const EMBED_KEY = process.env.HOLISTICS_EMBED_KEY;
const EMBED_SECRET = process.env.HOLISTICS_EMBED_SECRET;

app.post("/api/embed-token", (req, res) => {
  const { portal, user } = req.body;

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
    },
    permissions: {
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${EMBED_KEY}?_token=${token}`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
