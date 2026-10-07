# FEATURE MATRIX — BOON SYSTEM

Readiness vocabulary: `PLANNED → RESEARCHED → DESIGNED → IMPLEMENTED → TESTED → VERIFIED → PILOT_READY`, or
`BLOCKED`. A status changes only with evidence linked in the Evidence column. As of 2026-10-07 **nothing is
implemented**.

Priority: **P0** = one of the 10 protected core features (spec §42) or a prerequisite; P1 = needed for pilot; P2 =
post-pilot.

| ID | Feature | Mode | Pri | Core# | Wave | Owner agent | Depends on | Status | Evidence |
|---|---|---|---|---|---|---|---|---|---|
| F-01 | Auth (OTP/email), session | both | P0 | 7 | 3 | 07, 13 | ADR-0002 | PLANNED | — |
| F-02 | Temple tenancy + temple switcher | both | P0 | 7 | 3 | 08, 06 | F-01 | PLANNED | — |
| F-03 | Roles, permissions, scopes, departments | both | P0 | 7 | 3 | 08, 02 | F-02 | PLANNED | — |
| F-04 | RLS + tenant isolation test matrix | — | P0 | 7 | 3 | 08, 13 | F-02 | PLANNED | — |
| F-05 | Audit log | — | P0 | 7 | 3 | 08 | F-02 | PLANNED | — |
| F-06 | People directory & membership admin | both | P0 | 7 | 3 | 07, 06 | F-03 | PLANNED | — |
| F-07 | Quest engine (lifecycle, assignment, checklist) | both | P0 | 3 | 3 | 11, 07 | F-03 | PLANNED | — |
| F-08 | Quest evidence & verification | both | P0 | 3 | 3–4 | 11, 13 | F-07 | PLANNED | — |
| F-09 | Monk availability resolver + board | monastic | P0 | 4 | 4 | 02, 07, 06 | F-03, F-12 | PLANNED | — |
| F-10 | My Day | monastic | P0 | 4 | 4 | 06 | F-07, F-12 | PLANNED | — |
| F-11 | Novice learning quests, class schedule, attendance | monastic | P1 | 3 | 4 | 02, 06 | F-07 | PLANNED | — |
| F-12 | Schedule / calendar (`schedule_entries`) | both | P0 | 5 | 4 | 07 | F-03 | PLANNED | — |
| F-13 | Invitation intake & lifecycle | monastic mgmt | P0 | 5 | 4 | 19, 07 | F-12 | PLANNED | — |
| F-14 | Smart Monk Assignment (suggest, human confirm) | monastic mgmt | P0 | 5 | 4 | 07, 10 | F-09, F-13, F-31 | PLANNED | — |
| F-15 | Temple Command Center | mgmt | P0 | 1 | 5 | 06, 07 | F-09, F-07, F-20, F-27 | PLANNED | — |
| F-16 | Event / Boss Quest + readiness | both | P0 | 6 | 5 | 19, 11 | F-07 | PLANNED | — |
| F-17 | Temple Memory (duplicate event) | mgmt | P1 | 6 | 5 | 19 | F-16 | PLANNED | — |
| F-18 | 2D interactive map (LITE) | both | P0 | 2 | 5 | 06, 05 | F-20 | PLANNED | — |
| F-19 | 3D Wat Arun vertical slice | both | P0 | 2 | 2 (feasibility) / 5 | 05, 15 | F-18, asset license | **BLOCKED** (no licensed model) | `3D_STRATEGY.md` §8 |
| F-20 | Buildings & zones registry | — | P0 | 2 | 3 | 18, 08 | F-02 | PLANNED | — |
| F-21 | Maintenance / work orders | staff | P1 | — | 5 | 18 | F-07, F-20 | PLANNED | — |
| F-22 | Assets + QR | staff | P1 | — | 5 | 18 | F-20 | PLANNED | — |
| F-23 | Inventory | staff | P1 | — | 5 | 18, 17 | F-20 | PLANNED | — |
| F-24 | Vehicles & trips (driver home) | staff | P1 | 5 | 5 | 18, 17 | F-13 | PLANNED | — |
| F-25 | Cleaning / kitchen / garden role homes | staff | P1 | — | 5 | 17, 06 | F-07, F-20 | PLANNED | — |
| F-26 | Ceremony team & undertaker views | staff | P1 | 6 | 5 | 19 | F-16, F-03 | PLANNED | — |
| F-27 | Staff presence/shift (working/free/leave) | staff | P1 | 1 | 5 | 17 | F-03 | PLANNED | — |
| F-28 | Community profile + field visibility | community | P1 | 8 | 6 | 12, 13 | F-01 | PLANNED | — |
| F-29 | Volunteer / Community Quest | community | P0 | 8 | 6 | 12, 11 | F-07 | PLANNED | — |
| F-30 | Community boon points ledger | community | P0 | 9 | 6 | 11, 08 | F-29 | PLANNED | — |
| F-31 | Monastic activity score + streak + achievements | monastic | P0 | 9 | 4 | 11, 08 | F-07 | PLANNED | — |
| F-32 | Reward catalog & redemption | community | P0 | 9 | 6 | 11, 07 | F-30 | PLANNED | — |
| F-33 | Anti-cheat signals & review queue | community | P1 | 9 | 6 | 11, 13 | F-30 | PLANNED | — |
| F-34 | Connections, block, mute, report | community | P1 | — | 6 | 12, 13 | F-28 | PLANNED | — |
| F-35 | Chat & groups (realtime) | community | P1 | — | 6 | 09 | F-34, ADR-0004 | PLANNED | — |
| F-36 | Voice / video calls | community | P2 | — | 6 | 09 | F-35, ADR-0004 | PLANNED | — |
| F-37 | Temple Contact inbox & routing | both | P1 | — | 6 | 09, 12 | F-03 | PLANNED | — |
| F-38 | Notifications (in-app, push) | both | P1 | — | 4 | 07 | F-01 | PLANNED | — |
| F-39 | AI: voice → quest/event/invitation/maintenance drafts | both | P0 | 10 | 7 | 10 | F-07, F-13, ADR-0005 | PLANNED | — |
| F-40 | AI: daily summary, conflict detection, knowledge search | mgmt | P0 | 10 | 7 | 10 | F-15, F-17 | PLANNED | — |
| F-41 | Temple discovery & follow | community | P1 | — | 6 | 12 | F-02 | PLANNED | — |
| F-42 | Office: documents, bookings, meetings, PDF export | staff | P2 | — | 6 | 17 | F-03 | PLANNED | — |
| F-43 | Finance (view/approve) | staff | P2 | — | post-pilot | 07, 13 | F-03, legal review | PLANNED | — |
| F-44 | BOON UI design system (TH/EN, dark, large text, high contrast, reduced motion, Simple Mode) | both | P0 | — | 2 | 04, 06 | design direction approval | PLANNED | — |
| F-45 | Analytics (PostHog) & error monitoring (Sentry) | — | P1 | — | 7 | 16 | ADR | PLANNED | — |
| F-46 | CI/CD, preview deploys | — | P0 | — | 2–3 | 16 | ADR-0001 | PLANNED | — |
