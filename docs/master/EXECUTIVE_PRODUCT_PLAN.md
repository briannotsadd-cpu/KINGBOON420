# EXECUTIVE PRODUCT PLAN — BOON SYSTEM (ระบบบุญ)

Revision 1 — 2026-10-07.

## 1. What we are building

A **Temple Operating System + Monastic Life System + Temple Workforce + Community Network**. Daily temple work is
shown in the shape of a premium game's quest system, but every quest, score and status is **real data**.
It is not a donation app, not a dharma-content app and not a game.

Two experiences on one core:
- **Monastic Mode** — monks, novices, abbot, assistants, secretary monk.
- **Community & Staff Mode** — everyone else, with a home that adapts to role, department and temple.

One account, many temples. Each temple is an isolated tenant.

## 2. Where we are

The repository was empty on 2026-10-07 (`CURRENT_STATE_AUDIT.md`). This revision turns the master specification
into plans. **No feature is implemented.** All 46 features are `PLANNED`; the 3D slice is `BLOCKED` on a
licensed model.

## 3. Protected core (never cut)

1 Temple Command Center · 2 Interactive Map / 3D · 3 Quest · 4 Monk Availability · 5 Smart Schedule & Invitation ·
6 Event / Boss Quest · 7 People + Role/Permission · 8 Community Quest · 9 Boon Point + Reward · 10 AI Temple
Secretary.

## 4. Architecture in one paragraph (to be ratified by ADRs in Wave 2)

Mobile-first PWA (Next.js + TypeScript) on Vercel; PostgreSQL with Supabase Auth/RLS/Realtime/Storage in
ap-southeast-1; all tenant tables carry `temple_id` with composite foreign keys and forced RLS; privileged writes
in SECURITY DEFINER SQL functions; pure domain logic (availability resolver, quest state machine, readiness) in a
shared TypeScript package with exhaustive unit tests; Three.js/R3F scene loaded lazily over a data-driven
building registry with a 2D fallback; AI produces drafts only; Sentry + PostHog for observability.

## 5. Execution waves

| Wave | Outcome | Key gate |
|---|---|---|
| 1 | Research, domain, roles, UX architecture | Domain validated, UX flows for all north-star questions |
| 2 | Design directions → BOON UI; 3D feasibility; DB + security architecture; ADRs; repo + CI | Design direction chosen; schema v1 + isolation tests pass locally |
| 3 | Auth, tenancy, RLS, people, permissions, quest foundation | Tenant isolation matrix green |
| 4 | Monastic Mode (My Day, availability, schedule, invitation, activity score) | Resolver + invitation E2E |
| 5 | Command Center, events, facility, map, 3D | North-star 1–8 answered from DB |
| 6 | Community, volunteer, rewards, communication | Ledger separation, safety tests |
| 7 | AI secretary, analytics | Drafts-only enforced |
| 8 | QA, security, performance, accessibility, pilot readiness | FINAL STANDARD answered with evidence |

## 6. Pilot readiness definition

BOON SYSTEM is pilot-ready only when the real system answers, with evidence: what is the temple's state today;
how many monks are free; how many are out on invitations; who must do what; which events are not ready; which
buildings have problems; which vehicles are free; how many volunteers are still needed; what quests the
community has; whether scores are correct; who may view each item; and whether temple A's data leaks to temple B.

## 7a. Owner answers (2026-10-07)

| # | Answer | Consequence |
|---|---|---|
| D-1 | Pilot temple: owner is preparing a questionnaire | Field kit `docs/research/08_FIELD_RESEARCH_KIT.md` available; R-03 still open |
| D-3 | Use Supabase | ADR-0002 Accepted; real pilot personal data still needs a PDPA transfer basis (R-17) |
| B3 | No monk advisor | Working decisions ("แต้มกิจวัตร", money lay-only, no monastic ranking) become owner-accepted defaults; R-04 accepted |
| D-6 | Use Figma | Agent 04 designs in Figma |
| D-2/D-4 | Owner builds the 3D model → **revised: Agent 05 designs a procedural stylized model** (project-owned, no downloads) | Brief: `docs/3d/ASSET_BRIEF.md`; F-19 stays BLOCKED until the model passes the brief's budgets with evidence |
| — | Minimise token use | Wave 2 runs 2 agents (08, 04); 13 and 16 move to Wave 3; no separate audit agent per wave — Opus reviews |

## 7. Decisions needed from the owner

| # | Decision | Recommendation |
|---|---|---|
| D-1 | Pilot temple and contact for field research | Highest priority — research is desk-only until then (R-03) |
| D-2 | Wat Arun: partner or showcase? Permission for 3D capture/model? | Commission a stylized model; LITE map until then |
| D-3 | Accept Supabase (Singapore) + Vercel as platform | Yes, pending ADR-0002 |
| D-4 | Budget for 3D artist and device lab | Needed by Wave 5 |
| D-5 | Thai legal review (PDPA, minors) before pilot | Required |
| D-6 | Figma workspace for Agent 04 | Provide team/file, or Agent 04 works from code-based design tokens and HTML prototypes |
