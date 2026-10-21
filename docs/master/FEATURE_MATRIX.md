# FEATURE MATRIX — BOON SYSTEM

Revision 2 — Wave 1 gate (2026-10-07). "spec:" in the Evidence column points to a Wave 1 domain spec under
`docs/domain/`; a spec is **not** evidence of DESIGNED (UX + visual design required) or anything higher.

Readiness vocabulary: `PLANNED → RESEARCHED → DESIGNED → IMPLEMENTED → TESTED → VERIFIED → PILOT_READY`, or
`BLOCKED`. A status changes only with evidence linked in the Evidence column. As of 2026-10-07 nothing was implemented. **Updated 2026-10-21:** statuses below reflect the code on branch
`claude/boon-system-master-prompt-m0pxns` (local tests only — nothing is deployed; see docs/v1/DECISIONS.md and docs/v1/deploy/README.md).

Priority: **P0** = one of the 10 protected core features (spec §42) or a prerequisite; P1 = needed for pilot; P2 =
post-pilot.

| ID | Feature | Mode | Pri | Core# | Wave | Owner agent | Depends on | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | Auth (OTP/email), session | both | P0 | 7 | 3 | 07, 13 | ADR-0002 | **TESTED (local)** — not deployed | DB 06_registration; E2E registration.e2e.mjs |
| F-02 | Temple tenancy + temple switcher | both | P0 | 7 | 3 | 08, 06 | F-01 | **TESTED (local)** — not deployed | DB 01_schema, 02_isolation; temple menu /temple/[id] |
| F-03 | Roles, permissions, scopes, departments | both | P0 | 7 | 3 | 08, 02 | F-02 | **TESTED (local)** — not deployed | seed 001_roles_permissions.sql; DB 01_schema |
| F-04 | RLS + tenant isolation test matrix | — | P0 | 7 | 3 | 08, 13 | F-02 | **TESTED (local)** — not deployed | DB 02_isolation (31 tables × 28 roles × read/write = 1,736 cells) |
| F-05 | Audit log | — | P0 | 7 | 3 | 08 | F-02 | **TESTED (local)** — not deployed (append-only audit_logs, written by functions) | DB 01_schema |
| F-06 | People directory & membership admin | both | P0 | 7 | 3 | 07, 06 | F-03 | PLANNED | — |
| F-07 | Quest engine (lifecycle, assignment, checklist) | both | P0 | 3 | 3 | 11, 07 | F-03 | **PARTIAL** — quest lifecycle in DB; event tasks + team-day UI only | DB 0002, 09_monastic_events; E2E events.e2e.mjs |
| F-08 | Quest evidence & verification | both | P0 | 3 | 3–4 | 11, 13 | F-07 | **PARTIAL** — verifier ≠ assignee enforced; no evidence-upload UI | DB 0002 quest_assignment_guard |
| F-09 | Monk availability resolver + board | monastic | P0 | 4 | 4 | 02, 07, 06 | F-03, F-12 | **TESTED (local)** — not deployed | DB 09_monastic_events; E2E monastic.e2e.mjs |
| F-10 | My Day | monastic | P0 | 4 | 4 | 06 | F-07, F-12 | **TESTED (local)** — not deployed | E2E monastic.e2e.mjs (My Day); team-day for lay staff (unit tests only) |
| F-11 | Novice learning quests, class schedule, attendance | monastic | P1 | 3 | 4 | 02, 06 | F-07 | PLANNED | — |
| F-12 | Schedule / calendar (`schedule_entries`) | both | P0 | 5 | 4 | 07 | F-03 | **TESTED (local)** — not deployed | DB 0009 schedule_entries; E2E monastic.e2e.mjs |
| F-13 | Invitation intake & lifecycle | monastic mgmt | P0 | 5 | 4 | 02, 07 | F-12 | **TESTED (local)** — not deployed | DB 09_monastic_events; E2E monastic.e2e.mjs |
| F-14 | Smart Monk Assignment (suggest, human confirm) | monastic mgmt | P0 | 5 | 4 | 07 (rule-based, not AI) | F-09, F-13, F-24 (reads availability, schedule, history — never a score ledger) | **TESTED (local)** — not deployed (rule-based suggestions, human confirm) | DB 09_monastic_events (HC-1..4); E2E monastic.e2e.mjs |
| F-15 | Temple Command Center | mgmt | P0 | 1 | 5 | 06, 07 | F-09, F-07, F-20, F-27 | **TESTED (local)** — not deployed | DB 10_map_points_command; E2E points.e2e.mjs (cc-*) |
| F-16 | Event / Boss Quest + readiness | both | P0 | 6 | 5 | 19, 11 | F-07 | **TESTED (local)** — not deployed | DB 09_monastic_events; E2E events.e2e.mjs |
| F-17 | Temple Memory (duplicate event; `temple_memory_notes`; snapshot never copies people/evidence) | mgmt | P1 | 6 | 5 | 19 | F-16 | PLANNED | spec: TEMPLE_MEMORY_SPEC |
| F-18 | 2D interactive map (LITE) | both | P0 | 2 | 5 | 06, 05 | F-20 | **TESTED (local)** — not deployed | DB 10_map_points_command; E2E map.e2e.mjs |
| F-19 | 3D Wat Arun vertical slice | both | P0 | 2 | 2 (feasibility) / 5 | 05, 15 | F-18, asset license | **SHOWCASE ONLY** — procedural placeholder model, labelled; not a survey; not tested on real mobile GPUs | app/showcase/3d; E2E map.e2e.mjs (mp-12); docs/3d/REPORT.md |
| F-20 | Buildings & zones registry | — | P0 | 2 | 3 | 18, 08 | F-02 | **TESTED (local)** — not deployed | DB 0011 buildings/zones; E2E map.e2e.mjs |
| F-21 | Maintenance / work orders | staff | P1 | — | 5 | 18 | F-07, F-20 | PLANNED | spec: MAINTENANCE_SPEC |
| F-22 | Assets + QR | staff | P1 | — | 5 | 18 | F-20 | PLANNED | spec: ASSET_INVENTORY_SPEC |
| F-23 | Inventory | staff | P1 | — | 5 | 18, 17 | F-20 | PLANNED | spec: ASSET_INVENTORY_SPEC |
| F-24 | Vehicles & trips (driver home; drivers are lay) | staff | P1 | 5 | 5 | 18, 17 | F-13 | PLANNED | spec: VEHICLE_TRIP_SPEC |
| F-25 | Cleaning / kitchen / garden role homes | staff | P1 | — | 5 | 17, 06 | F-07, F-20 | PLANNED | spec: CLEANING / KITCHEN / GARDEN |
| F-26 | Ceremony team & undertaker views | staff | P1 | 6 | 5 | 19 | F-16, F-03, F-12, F-13 (conflict flag) | PLANNED | spec: CEREMONY_OPERATIONS_SPEC, FUNERAL_OPERATIONS_SPEC |
| F-27 | Staff presence/shift (working/free/leave) | staff | P1 | 1 | 5 | 17 | F-03 | PLANNED | spec: STAFF_PRESENCE_SPEC |
| F-28 | Community profile + field visibility | community | P1 | 8 | 6 | 12, 13 | F-01 | **TESTED (local)** — not deployed | DB 08_community; E2E community.e2e.mjs |
| F-29 | Volunteer / Community Quest | community | P0 | 8 | 6 | 12, 11 | F-07 | PLANNED | — |
| F-30 | Community boon points ledger | community | P0 | 9 | 6 | 11, 08 | F-29 | **TESTED (local)** — not deployed | DB 03_ledgers, 10_map_points_command; E2E points.e2e.mjs |
| F-31 | Monastic activity score ("แต้มกิจวัตร") + practice days + achievements — no ranking, no comparison, no loss mechanics | monastic | P0 | 9 | 4 | 11, 08 | F-07 | **PARTIAL** — score + practice days; achievements not in v1 | DB 09_monastic_events; E2E monastic.e2e.mjs |
| F-32 | Reward catalog & redemption | community | P0 | 9 | 6 | 11, 07 | F-30 | **TESTED (local)** — not deployed | DB 10_map_points_command; E2E points.e2e.mjs |
| F-33 | Anti-cheat signals & review queue | community | P1 | 9 | 6 | 11, 13 | F-30 | **PARTIAL** — VERIFIER_CONCENTRATION hold + review only | DB 10_map_points_command; E2E points.e2e.mjs |
| F-34 | Connections, block, mute, report | community | P1 | — | 6 | 12, 13 | F-28 | **TESTED (local)** — not deployed | DB 08_community; E2E community.e2e.mjs |
| F-35 | Chat & groups (realtime) | community | P1 | — | 6 | 09 | F-34, ADR-0004 | **TESTED (local)** — not deployed (polling, not realtime) | DB 08_community; E2E chat.e2e.mjs |
| F-36 | Voice / video calls | community | P2 | — | 6 | 09 | F-35, ADR-0004 | **TESTED (local)** — not deployed (1:1 WebRTC, STUN only) | DB 08_community; E2E chat.e2e.mjs |
| F-37 | Temple Contact inbox & routing | both | P1 | — | 6 | 09, 12 | F-03 | **TESTED (local)** — not deployed | DB 08_community; E2E contact.e2e.mjs |
| F-38 | Notifications (in-app, push) | both | P1 | — | 4 | 07 | F-01 | PLANNED | — |
| F-39 | AI: voice → quest/event/invitation/maintenance drafts | both | P0 | 10 | 7 | 10 | F-07, F-13, ADR-0005 | PLANNED | — |
| F-40 | AI: daily summary, conflict detection, knowledge search | mgmt | P0 | 10 | 7 | 10 | F-15, F-17 | **PARTIAL** — rule-based daily summary, conflicts, event checklist; no AI model (owner decision) | DB 10_map_points_command; docs/v1/DECISIONS.md D-H1 |
| F-41 | Temple discovery & follow | community | P1 | — | 6 | 12 | F-02 | **TESTED (local)** — not deployed | DB 0008/0010 join_temple_community; E2E contact.e2e.mjs |
| F-42 | Office: documents, bookings, meetings, PDF export | staff | P2 | — | 6 | 17 | F-03 | PLANNED | spec: OFFICE |
| F-43 | Finance (view/approve) | staff | P2 | — | post-pilot | 07, 13 | F-03, legal review | PLANNED | — |
| F-44 | BOON UI design system (TH/EN, dark, large text, high contrast, reduced motion, Simple Mode) | both | P0 | — | 2 | 04, 06 | design direction approval | PLANNED | — |
| F-45 | Analytics (PostHog) & error monitoring (Sentry) | — | P1 | — | 7 | 16 | ADR | PLANNED | — |
| F-46 | CI/CD, preview deploys | — | P0 | — | 2–3 | 16 | ADR-0001 | PLANNED | — |
| F-47 | Parking: pick a temple → see if parking is available (visitor, no login) | both | P1 | 2 | 2 | Opus | F-02, F-20 | **TESTED** (DB + app, local) — not VERIFIED: no real device, no deployed environment | DB `supabase/tests/05_parking.sql` + mutation; app unit `apps/web/lib/parking.test.ts` (6); visitor page covered by E2E `apps/web/e2e/registration.e2e.mjs` |
| F-47b | Parking staff: report lot status at the gate, add/edit lots, temple confirms before public, reconfirm after edit | web | P1 | 2 | 2 | Opus | F-47 | **TESTED** (DB + app, local) — not VERIFIED: no real device, no deployed environment | DB `supabase/tests/12_parking_staff.sql`; app unit `apps/web/lib/parking-staff.test.ts` (15); E2E `apps/web/e2e/parking.e2e.mjs` (25 checks); migration `0016_parking_staff.sql` |
| F-48 | Login with email + 6-digit code; temple registration; platform approval; public temple search/profile | both | P0 | 7 | — | Opus | F-01, F-02 | **TESTED** (local) — not VERIFIED: real email delivery not configured, not deployed | DB `supabase/tests/06_registration.sql`; E2E `registration.e2e.mjs`; screenshots `docs/app/v-*` |
| F-49 | Verified real temple data: provenance, 11-state verification, temple confirmation, conflict/expiry, double verification for critical fields, admin drill-down | both | P0 | 7 | — | Opus | F-48 | **TESTED** (local, fictional fixtures only) — no real temple data: BLOCKED (target temple not named; official sources unreachable) | DB `supabase/tests/07_verification.sql`; E2E 17/17 × 4 runs; `docs/data/TEMPLE_DATA_AUDIT.md` |
