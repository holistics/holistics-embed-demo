const USERS = [
  { id: "user_1", name: "Alice Johnson", email: "alice.johnson@acmehospitality.com", dataSource: "customer_acme" },
  { id: "user_2", name: "Erik Lindgren", email: "erik.lindgren@acmehospitality.com", dataSource: "customer_acme" },
  { id: "user_3", name: "Bob Smith", email: "bob.smith@globexhotels.com", dataSource: "customer_globex" },
  { id: "user_4", name: "Sofia Nilsen", email: "sofia.nilsen@globexhotels.com", dataSource: "customer_globex" },
  { id: "chinh.dm", name: "Chinh DM", email: "chinh.dm@holistics.io", dataSource: "customer_holistics" },
];

export async function onRequestGet() {
  return Response.json({ users: USERS });
}
