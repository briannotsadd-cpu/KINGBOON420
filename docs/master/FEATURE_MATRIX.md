# FEATURE MATRIX — BOON SYSTEM

Revision 2 — Wave 1 gate (2026-10-07). "spec:" in the Evidence column points to a Wave 1 domain spec under
`docs/domain/`; a spec is **not** evidence of DESIGNED (UX + visual design required) or anything higher.

Readiness vocabulary: `PLANNED → RESEARCHED → DESIGNED → IMPLEMENTED → TESTED → VERIFIED → PILOT_READY`, or
`BLOCKED`. A status changes only with evidence linked in the Evidence column. As of 2026-10-07 **nothing is
implemented**.

Priority: **P0** = one of the 10 protected core features (spec §42) or a prerequisite; P1 = needed for pilot; P2 =
post-pilot.

| ID | Feature | Mode | Pri | Core# | Wave | Owner agent | Depends on | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | Auth (OTP/email), session | both | P0 | 7 | 3 | 07, 13 | ADR-0002 | PLANNED | spec: TENANCY_IDENTITY_SPEC |
| F-02 | Temple tenancy + temple switcher | both | P0 | 7 | 3 | 08, 06 | F-01 | PLANNED | spec: TENANCY_IDENTITY_SPEC |
| F-03 | Roles, permissions, scopes, departments | both | P0 | 7 | 3 | 08, 02 | F-02 | PLANNED | spec: role_permissions.yaml |
| F-04 | RLS + tenant isolation test matrix | — | P0 | 7 | 3 | 08, 13 | F-02 | PLANNED | — |
| F-05 | Audit log | — | P0 | 7 | 3 | 08 | F-02 | PLANNED | — |
| F-06 | People directory & membership admin | both | P0 | 7 | 3 | 07, 06 | F-03 | PLANNED | — |
| F-07 | Quest engine (lifecycle, assignment, checklist) | both | P0 | 3 | 3 | 11, 07 | F-03 | PLANNED | spec: QUEST_LIFECYCLE_SPEC |
| F-08 | Quest evidence & verification | both | P0 | 3 | 3–4 | 11, 13 | F-07 | PLANNED | spec: QUEST_LIFECYCLE_SPEC |
| F-09 | Monk availability resolver + board | monastic | P0 | 4 | 4 | 02, 07, 06 | F-03, F-12 | PLANNED | spec: AVAILABILITY_SPEC |
| F-10 | My Day | monastic | P0 | 4 | 4 | 06 | F-07, F-12 | PLANNED | — |
| F-11 | Novice learning quests, class schedule, attendance | monastic | P1 | 3 | 4 | 02, 06 | F-07 | PLANNED | — |
| F-12 | Schedule / calendar (`schedule_entries`) | both | P0 | 5 | 4 | 07 | F-03 | PLANNED | spec: SCHEDULE_INVITATION_SPEC |
| F-13 | Invitation intake & lifecycle | monastic mgmt | P0 | 5 | 4 | 02, 07 | F-12 | PLANNED | spec: SCHEDULE_INVITATION_SPEC |
| F-14 | Smart Monk Assignment (suggest, human confirm) | monastic mgmt | P0 | 5 | 4 | 07 (rule-based, not AI) | F-09, F-13, F-24 (reads availability, schedule, history — never a score ledger) | PLANNED | spec: SCHEDULE_INVITATION_SPEC |
| F-15 | Temple Command Center | mgmt | P0 | 1 | 5 | 06, 07 | F-09, F-07, F-20, F-27 | PLANNED | — |
| F-16 | Event / Boss Quest + readiness | both | P0 | 6 | 5 | 19, 11 | F-07 | PLANNED | spec: EVENT_BOSS_QUEST_SPEC |
| F-17 | Temple Memory (duplicate event; `temple_memory_notes`; snapshot never copies people/evidence) | mgmt | P1 | 6 | 5 | 19 | F-16 | PLANNED | spec: TEMPLE_MEMORY_SPEC |
| F-18 | 2D interactive map (LITE) | both | P0 | 2 | 5 | 06, 05 | F-20 | PLANNED | — |
| F-19 | 3D Wat Arun vertical slice | both | P0 | 2 | 2 (feasibility) / 5 | 05, 15 | F-18, asset license | **BLOCKED** (no licensed model) | `3D_STRATEGY.md` §8 |
| F-20 | Buildings & zones registry | — | P0 | 2 | 3 | 18, 08 | F-02 | PLANNED | spec: SPATIAL_REGISTRY_SPEC |
| F-21 | Maintenance / work orders | staff | P1 | — | 5 | 18 | F-07, F-20 | PLANNED | spec: MAINTENANCE_SPEC |
| F-22 | Assets + QR | staff | P1 | — | 5 | 18 | F-20 | PLANNED | spec: ASSET_INVENTORY_SPEC |
| F-23 | Inventory | staff | P1 | — | 5 | 18, 17 | F-20 | PLANNED | spec: ASSET_INVENTORY_SPEC |
| F-24 | Vehicles & trips (driver home; drivers are lay) | staff | P1 | 5 | 5 | 18, 17 | F-13 | PLANNED | spec: VEHICLE_TRIP_SPEC |
| F-25 | Cleaning / kitchen / garden role homes | staff | P1 | — | 5 | 17, 06 | F-07, F-20 | PLANNED | spec: CLEANING / KITCHEN / GARDEN |
| F-26 | Ceremony team & undertaker views | staff | P1 | 6 | 5 | 19 | F-16, F-03, F-12, F-13 (conflict flag) | PLANNED | spec: CEREMONY_OPERATIONS_SPEC, FUNERAL_OPERATIONS_SPEC |
| F-27 | Staff presence/shift (working/free/leave) | staff | P1 | 1 | 5 | 17 | F-03 | PLANNED | spec: STAFF_PRESENCE_SPEC |
| F-28 | Community profile + field visibility | community | P1 | 8 | 6 | 12, 13 | F-01 | PLANNED | — |
| F-29 | Volunteer / Community Quest | community | P0 | 8 | 6 | 12, 11 | F-07 | PLANNED | — |
| F-30 | Community boon points ledger | community | P0 | 9 | 6 | 11, 08 | F-29 | PLANNED | spec: SCORING_SPEC |
| F-31 | Monastic activity score ("แต้มกิจวัตร") + practice days + achievements — no ranking, no comparison, no loss mechanics | monastic | P0 | 9 | 4 | 11, 08 | F-07 | PLANNED | spec: SCORING_SPEC |
| F-32 | Reward catalog & redemption | community | P0 | 9 | 6 | 11, 07 | F-30 | PLANNED | — |
| F-33 | Anti-cheat signals & review queue | community | P1 | 9 | 6 | 11, 13 | F-30 | PLANNED | spec: SCORING_SPEC |
| F-34 | Connections, block, mute, report | community | P1 | — | 6 | 12, 13 | F-28 | PLANNED | — |
| F-35 | Chat & groups (realtime) | community | P1 | — | 6 | 09 | F-34, ADR-0004 | PLANNED | — |
| F-36 | Voice / video calls | community | P2 | — | 6 | 09 | F-35, ADR-0004 | PLANNED | — |
| F-37 | Temple Contact inbox & routing | both | P1 | — | 6 | 09, 12 | F-03 | PLANNED | — |
| F-38 | Notifications (in-app, push) | both | P1 | — | 4 | 07 | F-01 | PLANNED | — |
| F-39 | AI: voice → quest/event/invitation/maintenance drafts | both | P0 | 10 | 7 | 10 | F-07, F-13, ADR-0005 | PLANNED | — |
| F-40 | AI: daily summary, conflict detection, knowledge search | mgmt | P0 | 10 | 7 | 10 | F-15, F-17 | PLANNED | — |
| F-41 | Temple discovery & follow | community | P1 | — | 6 | 12 | F-02 | PLANNED | — |
| F-42 | Office: documents, bookings, meetings, PDF export | staff | P2 | — | 6 | 17 | F-03 | PLANNED | spec: OFFICE |
| F-43 | Finance (view/approve) | staff | P2 | — | post-pilot | 07, 13 | F-03, legal review | PLANNED | — |
| F-44 | BOON UI design system (TH/EN, dark, large text, high contrast, reduced motion, Simple Mode) | both | P0 | — | 2 | 04, 06 | design direction approval | PLANNED | — |
| F-45 | Analytics (PostHog) & error monitoring (Sentry) | — | P1 | — | 7 | 16 | ADR | PLANNED | — |
| F-46 | CI/CD, preview deploys | — | P0 | — | 2–3 | 16 | ADR-0001 | PLANNED | — |
| F-47 | Parking: pick a temple → see if parking is available (visitor, no login) | both | P1 | 2 | 2 | Opus | F-02, F-20 | **TESTED** (DB + app, local) — not VERIFIED: no real device, no deployed environment | DB `supabase/tests/05_parking.sql` + mutation; app unit `apps/web/lib/parking.test.ts` (6); visitor page covered by E2E `apps/web/e2e/registration.e2e.mjs` |
| F-48 | Login with email + 6-digit code; temple registration; platform approval; public temple search/profile | both | P0 | 7 | — | Opus | F-01, F-02 | **TESTED** (local) — not VERIFIED: real email delivery not configured, not deployed | DB `supabase/tests/06_registration.sql`; E2E `registration.e2e.mjs`; screenshots `docs/app/v-*` |
| F-49 | Verified real temple data: provenance, 11-state verification, temple confirmation, conflict/expiry, double verification for critical fields, admin drill-down | both | P0 | 7 | — | Opus | F-48 | **TESTED** (local, fictional fixtures only) — no real temple data: BLOCKED (target temple not named; official sources unreachable) | DB `supabase/tests/07_verification.sql`; E2E 17/17 × 4 runs; `docs/data/TEMPLE_DATA_AUDIT.md` |
