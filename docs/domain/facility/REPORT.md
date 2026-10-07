# REPORT — Agent 18 Facility / Asset (Wave 1a)

Saved by the Lead Orchestrator from Agent 18's hand-back on 2026-10-07 (the harness blocked sub-agent report files).

## Summary

Specified the spatial registry and scene manifest contract, a sourced but unconfirmed Wat Arun registry draft,
maintenance and work orders (20 cases), assets/QR/inventory (18 cases), and vehicles/trips/driver workflow
(18 cases). All four facility north-star questions map to exact fields in `SPATIAL_REGISTRY_SPEC.md` §7.

## Files written

`SPATIAL_REGISTRY_SPEC.md` (SR-01..10), `WAT_ARUN_REGISTRY_DRAFT.md`, `MAINTENANCE_SPEC.md` (FM-01..20),
`ASSET_INVENTORY_SPEC.md` (AS-01..10, IV-01..08), `VEHICLE_TRIP_SPEC.md` (VT-01..18).

## Evidence

Sources accessed 2026-10-07 via **search excerpts only** (direct fetch blocked by the egress proxy):
- https://en.wikipedia.org/wiki/Wat_Arun
- https://structurae.net/en/structures/wat-arun
- https://www.lonelyplanet.com/points-of-interest/wat-arun/407510
- https://thailand.prd.go.th/en/content/category/detail/id/2874/iid/381165
- https://www.timeout.com/bangkok/news/thailands-wat-arun-phra-prang-nominated-for-unescos-tentative-world-heritage-list-071725
- https://travel.trueid.net/detail/97V35Awoyk40 · https://www.silpa-mag.com/?p=129292 · https://mgronline.com/travel/detail/9660000012697
- https://whc.unesco.org/en/tentativelists/6821/ (surfaced in search, not fetched)

Self-review: two ledgers not merged ✔ · AI drafts only ✔ · Unknown shown as Unknown ✔ · `temple_id` on all rows,
QR token carries no ids and is stored hashed ✔ · asset values restricted ✔ · no invented Wat Arun dimensions ✔ ·
invitation lifecycle referenced not redefined ✔ · **not cross-checked with Agents 02/17/19** ✘.

## Open questions

1. Which structures does Wat Arun itself list; satellite prang orientation; heritage approval for repairs?
2. Vehicle ownership/insurance; lent vehicles; does expired insurance block assignment?
3. Routing/ETA provider (no ADR) — estimates are manual or Unknown until then.
4. Default SLAs, buffers and threshold S2 are HYPOTHESIS.
5. Should religious objects be in the asset register at all?
6. Driver availability source before F-27 exists?

## Proposed changes to master docs

1. `ROLE_PERMISSION_MATRIX.md` §4 vehicle row note: trip creation from a CONFIRMED invitation is a system action on
   behalf of the confirming human; `facility_manager` assigns vehicle and driver; `monk_secretary` view only.
2. `TEMPLE_DOMAIN_MODEL.md` §7: building code regex `^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$`,
   immutable, never reused; building-problem default threshold S2 (configurable).
3. `TEMPLE_DOMAIN_MODEL.md` §6.1: invitation CANCELLED → linked trip cancelled; back to REVIEWING/TEAM_PROPOSED →
   trip ON_HOLD.
4. `3D_STRATEGY.md` §6: satellite prang placement/heights Unknown until temple confirms; ordinal codes
   `WAT-ARUN.PRANG.SAT-01..04`; no single height figure (sources conflict 66.8–86 m).
5. `ROLE_PERMISSION_MATRIX.md` §3: a driver sees passenger names only for own trips.

## Blockers

None for Wave 1. Wat Arun registry needs temple confirmation; sources need human re-verification; routing provider
ADR needed before departure computation uses real travel times.

## Self-assessed readiness

SPATIAL_REGISTRY_SPEC DESIGNED · WAT_ARUN_REGISTRY_DRAFT RESEARCHED (partial, unconfirmed) · MAINTENANCE_SPEC
DESIGNED · ASSET_INVENTORY_SPEC DESIGNED · VEHICLE_TRIP_SPEC DESIGNED (depends on routing provider and F-27).
