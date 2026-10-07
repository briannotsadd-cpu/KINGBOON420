# Architecture Decision Records — BOON SYSTEM

Owner: Opus (Lead Orchestrator). Format: context → decision → consequences → status. Status values: Proposed ·
Accepted · Superseded. A vendor-committing ADR stays **Proposed** until the owner acknowledges it (decisions D-3/D-6 in
`docs/master/EXECUTIVE_PRODUCT_PLAN.md`); work that does not depend on the vendor may proceed under a Proposed ADR.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-monorepo-and-web-platform.md) | Monorepo layout and web platform | Accepted (vendor-neutral parts) / Proposed (Vercel hosting) |
| [0002](0002-database-auth-host.md) | Database, auth and realtime host | Proposed — owner ack pending (D-3, R-17) |
| [0003](0003-tenancy-enforcement.md) | Tenancy enforcement pattern | Accepted |
