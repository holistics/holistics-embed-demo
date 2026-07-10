import jwt from "jsonwebtoken";

// kind: 'dashboard' -> single-dashboard embed (row_based RLS)
// kind: 'portal'    -> embed portal (all-tenants explore + AI)
const PORTALS = [
  { id: "shelfoptix_osa", kind: "dashboard" },
  { id: "shelfoptix_portal", kind: "portal" },
];

// Single-dashboard embed payload: RLS via server-signed row_based on project_id_no.
function buildDashboardPayload(user) {
  const row_based = user?.tenant
    ? [
        {
          path: { dataset: "shelfoptix_osa", model: "shelfoptix_store_scan_sample", field: "project_id_no" },
          operator: "is",
          modifier: null,
          values: [user.tenant],
        },
      ]
    : [];

  return {
    settings: {
      allow_dashboard_export: true,
      allow_raw_data_export: false,
      hide_header_panel: true,
      hide_dashboard_filters_controls_panel: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
    },
    permissions: { row_based },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

// Embed portal payload: tenant-scoped explore + AI. RLS is enforced by the dataset's
// `matches_user_attribute` permission on project_id_no, fed by the user_attributes below.
// Corporate/all-tenants user (no tenant) sends `__ALL__` to bypass the row filter.
function buildPortalPayload(portalId, user) {
  return {
    object_name: portalId,
    object_type: "EmbedPortal",
    embed_user_id: user?.id,
    embed_user_email: user?.email,
    user_attributes: { project_id_no: user?.tenant ? [Number(user.tenant)] : "__ALL__" },
    permissions: {},
    settings: {
      ai: { enabled: true },
      allow_dashboard_export: true,
      allow_raw_data_export: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
      hide_dashboard_filters_controls_panel: false,
      dashboard_autorun_on_changes: false,
    },
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

export const handler = async (event) => {
  const { portal, user } = JSON.parse(event.body || "{}");
  const def = PORTALS.find((p) => p.id === portal) || PORTALS[0];

  if (def.kind === "portal") {
    const token = jwt.sign(buildPortalPayload(def.id, user), process.env.HOLISTICS_PORTAL_EMBED_SECRET, { algorithm: "HS256" });
    const embedUrl = `https://demo4.holistics.io/embed/${process.env.HOLISTICS_PORTAL_EMBED_KEY}?_token=${token}&left_panel_state=collapsed`;
    return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ embedUrl }) };
  }

  const token = jwt.sign(buildDashboardPayload(user), process.env.HOLISTICS_EMBED_SECRET, { algorithm: "HS256" });
  const embedUrl = `https://demo4.holistics.io/embed/${process.env.HOLISTICS_EMBED_KEY}?_token=${token}`;
  return { statusCode: 200, headers: { "content-type": "application/json" }, body: JSON.stringify({ embedUrl }) };
};
