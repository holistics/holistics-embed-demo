// Personas for the embed switcher — mirrors backend/server.js.
//   retailer     → schema:        own BigQuery dataset (dynamic schema)
//   manufacturer → manufacturer_id: cross-retailer union scoped by RLP (product ownership)
const USERS = [
  { id: "cascade",     type: "retailer",     name: "Cascade Foods Co.",   email: "analytics@cascadefoods.com", schema: "shelfoptix_retailer_101" },
  { id: "marketfresh", type: "retailer",     name: "MarketFresh Grocery", email: "insights@marketfresh.com",   schema: "shelfoptix_retailer_102" },
  { id: "pureharvest", type: "retailer",     name: "PureHarvest Brands",  email: "analytics@pureharvest.com",  schema: "shelfoptix_retailer_103" },
  { id: "pg",          type: "manufacturer", name: "Procter & Gamble",    email: "analytics@pg.com",           manufacturer_id: 1 },
  { id: "unilever",    type: "manufacturer", name: "Unilever",            email: "analytics@unilever.com",     manufacturer_id: 2 },
  { id: "nestle",      type: "manufacturer", name: "Nestlé",              email: "analytics@nestle.com",       manufacturer_id: 3 },
  { id: "pepsico",     type: "manufacturer", name: "PepsiCo",             email: "analytics@pepsico.com",      manufacturer_id: 4 },
];

export const handler = async () => ({
  statusCode: 200,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ users: USERS }),
});
