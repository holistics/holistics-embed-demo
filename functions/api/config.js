const PORTALS = [
  { id: "shelfoptix_osa", title: "OSA / OOS Command Center", icon: "Activity" },
];

// Tenant switcher. `tenant` = project_id_no filtered via row_based.
// null tenant = ShelfOptix corporate / all-tenants (unrestricted).
const USERS = [
  { id: "corp",        name: "ShelfOptix Corporate",  email: "analytics@shelfoptix.com",  tenant: null,  scope: "All tenants" },
  { id: "cascade",     name: "Cascade Foods Co.",     email: "reports@cascadefoods.com",  tenant: "101", scope: "Tenant 101" },
  { id: "marketfresh", name: "MarketFresh Grocery",   email: "insights@marketfresh.com",  tenant: "102", scope: "Tenant 102" },
  { id: "pureharvest", name: "PureHarvest Brands",    email: "analytics@pureharvest.com", tenant: "103", scope: "Tenant 103" },
];

export async function onRequestGet() {
  return Response.json({ portals: PORTALS, users: USERS });
}
