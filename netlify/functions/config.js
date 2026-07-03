// kind: 'dashboard' -> single-dashboard embed (row_based RLS)
// kind: 'portal'    -> embed portal (all-tenants explore + AI)
const PORTALS = [
  { id: "shelfoptix_osa",    title: "Single Dashboard", icon: "Activity",     kind: "dashboard" },
  { id: "shelfoptix_portal", title: "Embed Portal",     icon: "ShoppingCart", kind: "portal" },
];

// Tenant switcher. `tenant` = project_id_no filtered via row_based (dashboard embed only).
// null tenant = ShelfOptix corporate / all-tenants (unrestricted).
const USERS = [
  { id: "corp",        name: "ShelfOptix Corporate",  email: "analytics@shelfoptix.com",  tenant: null,  scope: "All tenants" },
  { id: "cascade",     name: "Cascade Foods Co.",     email: "reports@cascadefoods.com",  tenant: "101", scope: "Tenant 101" },
  { id: "marketfresh", name: "MarketFresh Grocery",   email: "insights@marketfresh.com",  tenant: "102", scope: "Tenant 102" },
  { id: "pureharvest", name: "PureHarvest Brands",    email: "analytics@pureharvest.com", tenant: "103", scope: "Tenant 103" },
];

export const handler = async () => ({
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ portals: PORTALS, users: USERS }),
});
