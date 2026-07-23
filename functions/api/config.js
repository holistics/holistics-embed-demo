// Mercateam embed demo — portals + demo user profiles.
// Each user carries the site_id(s) they're allowed to see; the embed token puts them in
// user_attributes.site_id, and every dataset's `site_access` RLS clips rows to those sites.
// site_id values are real Mercateam sites (verified) so the RLS demo shows live scoping.
const PORTALS = [
  { id: "mercateam_portal", title: "Mercateam Analytics", icon: "Activity" },
  { id: "ask_ai", title: "Ask AI", icon: "Sparkles", portal: "mercateam_portal", urlSuffix: "/ai" },
];

const USERS = [
  {
    id: "rue_perche",
    name: "Rue du Perche — Site Manager",
    email: "manager@rueduperche.demo",
    siteLabel: "Rue du Perche",
    site_ids: ["Ce6amNfeKmH9XssxVCwT"],
  },
  {
    id: "gerson",
    name: "Gerson — Site Manager",
    email: "manager@gerson.demo",
    siteLabel: "Gerson",
    site_ids: ["3BD7SuGKJknq9C4cpwmR"],
  },
  {
    id: "regional",
    name: "Regional Lead — 2 sites",
    email: "regional@mercateam.demo",
    siteLabel: "Rue du Perche + Gerson",
    site_ids: ["Ce6amNfeKmH9XssxVCwT", "3BD7SuGKJknq9C4cpwmR"],
  },
  {
    id: "genouillac",
    name: "Eurocoustic Genouillac — Site Manager",
    email: "manager@eurocoustic-genouillac.demo",
    siteLabel: "Saint Gobain - Eurocoustic - Genouillac",
    site_ids: ["cm3hd7avk0x1o6mfbkkfswzit"],
  },
];

export async function onRequestGet() {
  return Response.json({ portals: PORTALS, users: USERS });
}
