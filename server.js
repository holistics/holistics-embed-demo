import "dotenv/config";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";

const app = express();
app.use(cors());
app.use(express.json());

const EMBED_KEY = process.env.HOLISTICS_EMBED_KEY;
const EMBED_SECRET = process.env.HOLISTICS_EMBED_SECRET;
const PORTAL_EMBED_KEY = process.env.HOLISTICS_PORTAL_EMBED_KEY;
const PORTAL_EMBED_SECRET = process.env.HOLISTICS_PORTAL_EMBED_SECRET;

console.log("EMBED_KEY:", EMBED_KEY ? "loaded" : "MISSING");
console.log("PORTAL_EMBED_KEY:", PORTAL_EMBED_KEY ? "loaded" : "MISSING");

// Existing dashboard embed endpoint
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
    permissions: {},
    exp: Math.floor(Date.now() / 1000) + 3600,
  };

  const token = jwt.sign(payload, EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${EMBED_KEY}?_token=${token}`;

  res.json({ embedUrl });
});

// New portal embed endpoint with restricted permissions
app.post("/api/portal-embed-token", (req, res) => {
  const { portal, user } = req.body;

  if (!portal) {
    return res.status(400).json({ error: "portal is required" });
  }

  const payload = {
    object_name: portal,
    object_type: "EmbedPortal",
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    user_attributes: {
      vendor_id: "__ALL__",
      city: "__ALL__",
      country: ["Vietnam"],
    },
    permissions: {},
    exp: Math.floor(Date.now() / 1000) + 60 * 15,
    settings: {
      allow_raw_data_export: false,
      allow_dashboard_export: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
      hide_dashboard_filters_controls_panel: false,
      ai: { enabled: false },
    },
  };

  const token = jwt.sign(payload, PORTAL_EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${PORTAL_EMBED_KEY}?_token=${token}`;

  res.json({ embedUrl });
});

app.listen(3001, () => {
  console.log("Backend running on http://localhost:3001");
});
