// =====================================================================
// RetailFocus embed users — the single source of truth.
//
// Both functions import this: config.js serves it to the login screen,
// embed-token.js signs a token from it. Previously the persona list was
// copied into three files and drifted; it now lives here only.
//
// Nothing secret is in this file. Portal keys and secrets are env vars,
// which is why config.js can hand the whole list to the browser.
//
// THE SCOPE COLUMNS
//   states  -> `store_state` user attribute -> row-level permission on
//              the store dimension, so it reaches every fact through the
//              join.
//   depts   -> `dept` user attribute -> row-level permission on each
//              fact view (no conformed product dimension yet).
//   ALL     -> '__ALL__', the documented bypass for one attribute. It is
//              how Masterview sees everything without a special case.
//
// AGENTIC CAPABILITY
// Self-serve exploration is a property of the PORTAL, not of the token:
// a portal that lists the dataset allows it, one that lists only the
// dashboard does not. So capability picks which portal the token names.
// Both portals sign with the same key/secret.
// =====================================================================

export const ALL = "__ALL__";

// The five departments the field team covers. Named once so Amit and
// Randy cannot drift apart.
const FIELD_DEPTS = [
  "HOME CLEANING",
  "PAPER PRODUCTS",
  "HOUSEWARE",
  "HARDWARE",
  "SUMMER/SPECIAL EVENTS",
];

const CARE_DEPTS = ["BEAUTY CARE", "HEALTH CARE", "INF/TODD/GIRLS"];

export const USERS = [
  {
    id: "amit",
    name: "Amit",
    email: "amarty@shelfoptix.com",
    org: "ShelfOptix",
    states: ["GA"],
    depts: FIELD_DEPTS,
    capability: "explorer",
  },
  {
    id: "randy",
    name: "Randy",
    email: "rwilson@retailgis.com",
    org: "RetailGIS",
    states: ["TN", "KY"],
    depts: FIELD_DEPTS,
    capability: "explorer",
  },
  {
    id: "myri",
    name: "Myri",
    email: "mdiazmartinez@shelfoptix.com",
    org: "ShelfOptix",
    states: ["GA", "TN", "KY"],
    depts: CARE_DEPTS,
    capability: "viewer",
  },
  {
    id: "masterview",
    name: "Masterview",
    email: "mv@shelfoptix.com",
    org: "ShelfOptix",
    states: ALL,
    depts: ALL,
    capability: "explorer",
  },
];

export const PORTALS = {
  explorer: "retailfocus_explorer",
  viewer: "retailfocus_viewer",
};

export const CAPABILITY_LABEL = {
  explorer: "Self-Serve (Explorer)",
  viewer: "Standard/Traditional Dashboard View",
};

export function findUser(id) {
  return USERS.find((u) => u.id === id);
}

// Scope as the token will carry it. '__ALL__' is passed as a bare string,
// not wrapped in an array — that is what marks it as a bypass rather than
// a literal value to match.
export function userAttributesOf(user) {
  return {
    store_state: user.states === ALL ? ALL : user.states,
    dept: user.depts === ALL ? ALL : user.depts,
  };
}

export function buildPayload(user) {
  const isExplorer = user.capability === "explorer";
  const now = Math.floor(Date.now() / 1000);

  return {
    object_name: PORTALS[user.capability],
    object_type: "EmbedPortal",

    // Identity. embed_user_id keys the user's saved work, so it has to be
    // stable per person — the login dropdown sends this id, never the name.
    embed_user_id: user.id,
    embed_user_email: user.email,

    user_attributes: userAttributesOf(user),

    // Explorers can keep what they build; viewers get a read-only seat.
    permissions: isExplorer
      ? { enable_personal_workspace: true, org_workspace_role: "viewer" }
      : { enable_personal_workspace: false, org_workspace_role: "no_access" },

    settings: {
      ai: { enabled: isExplorer },
      allow_dashboard_export: true,
      allow_raw_data_export: false,
      default_timezone: null,
      allow_dashboard_timezone_change: false,
      hide_dashboard_filters_controls_panel: false,
      dashboard_autorun_on_changes: false,
      allow_public_user_bust_cache: true,
    },

    iat: now,
    exp: now + 3600,
  };
}

// The list the browser is allowed to see: no payload, no portal names,
// just enough for the login screen and the reference table.
export function publicUsers() {
  return USERS.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    org: u.org,
    states: u.states,
    depts: u.depts,
    capability: u.capability,
    capability_label: CAPABILITY_LABEL[u.capability],
  }));
}
