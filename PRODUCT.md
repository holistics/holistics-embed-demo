# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Holistics presales teammates use this prototype during prospect calls. They switch between two synthetic creditor clients to demonstrate tenant isolation and PII masking.

## Product purpose

The site embeds the SCSI Collections dashboard in a focused client-facing shell. Success means a viewer can see that Riverside and Harborline receive different rows and different access to `Debtor State` from the same portal.

## Positioning

One embedded portal distributes governed analytics to multiple clients. Signed user attributes independently enforce row-level scope and column-level redaction.

## Operating context

This is a controlled presales demo hosted on Proto. Its container API issues short-lived Holistics embed sessions at runtime.

## Capabilities and constraints

- exactly two synthetic identities
- Riverside maps to `scsi_client_id: [3]` and `pii_access: [1]`
- Harborline maps to `scsi_client_id: [4]` and `pii_access: [0]`
- the browser selects only an identity ID; the server owns all permission attributes
- the published `scsi_client_portal` object opens inside the `scsi_portal` embed portal
- dashboard export, raw-data export, and subscriptions remain disabled
- personal and organization workspace access remain disabled
- RLS Test Identities and Custom Embed support guided comparison during demos
- the signed access preview is hidden by default and reflects the server-created session when opened

## Evidence on hand

- Nam's `SCSI Client Portal` dashboard, ID 116769
- dashboard screenshot at `../.amp/in/artifacts/scsi-client-portal/evidence/phase-1/dashboard.png`
- approved implementation plan at `../.amp/in/artifacts/scsi-client-portal/planning/implementation-plan.md`

## Product principles

- make the active identity and access level obvious
- keep access rules server-owned and fail closed
- keep the dashboard, not host-site decoration, as the primary content
- use State Collection Service's blue and cyan identity without copying its marketing-site layout
- explain failures with a direct recovery action
