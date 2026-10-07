# AGENT PLAN — BOON SYSTEM

Status: **v0.1 (Wave 0)**. Master: Opus (Lead Orchestrator). Sub-agents: Sonnet 5.5.

## 1. Operating rules

1. Agents are launched **per wave, by dependency**, never all at once.
2. Each agent has an exclusive write path (`FILE_OWNERSHIP.md`). Agents never edit `docs/master/**`; they
   propose master changes in a "Proposed changes to master docs" section of their own output.
3. Agents **do not run git commit/push.** Opus inspects diffs, reviews, and commits.
4. Flow per task: Agent work → Agent self-review → Evidence → Peer review (Agent 20 or a sibling) → Opus review →
   QA (from Wave 3 on) → merge.
5. Prompts are rewritten every wave from the then-current repo state (`AGENT_PROMPT_PACK.md` keeps history).
6. Readiness vocabulary only: PLANNED, RESEARCHED, DESIGNED, IMPLEMENTED, TESTED, VERIFIED, PILOT_READY, BLOCKED.

## 2. Wave map

| Wave | Goal | Agents | Gate (exit criteria) |
|---|---|---|---|
| 0 | Audit + master plans | Opus | All master docs exist; prompt pack reviewed — **done in this session** |
| 1a | Research + domain | 01, 02, 17, 18, 19 (parallel; disjoint paths) | Each output exists, cites sources or labels HYPOTHESIS, lists open questions |
| 1b | UX architecture + governance review | 03, 20 (parallel) | IA, flows for 10 north-star questions, state patterns; consistency audit with findings triaged by Opus |
| 1 gate | Opus review | Opus | Gap analysis rev 2, risk register rev 2, master docs updated, Wave 2 prompts written |
| 2 | Design system & directions, 3D feasibility, DB architecture, security architecture, ADRs, repo scaffold + CI | 04, 05, 08, 13, 16 | 3 directions reviewed & one chosen by Opus (+ owner ack); ADR-0001..0003 accepted; schema v1 SQL with RLS tests passing on local PG16; CI green |
| 3 | Auth, tenant, RLS, people, permission, quest foundation | 07, 08, 06, 11, 14 | Tenant isolation matrix green; quest lifecycle tests green; E2E sign-in → temple pick → quest complete |
| 4 | Monastic Mode: availability, schedule, invitation, My Day, activity score | 02, 07, 06, 11, 19 | Availability resolver tests; invitation E2E with human confirm; Thai UI screenshots |
| 5 | Command Center, events, facility, 2D map, 3D integration | 06, 07, 18, 19, 05, 15 | North-star questions 1–8 answerable from real DB queries on demo tenant; 3D perf gate or BLOCKED w/ evidence |
| 6 | Community, volunteer, rewards, communication | 12, 11, 09, 13 | Ledger separation tests; block/report tests; Temple Contact routing E2E |
| 7 | AI secretary, analytics, optimisation | 10, 16, 15 | Drafts-only enforced by DB; Thai STT benchmark |
| 8 | QA, security audit, performance, accessibility, pilot readiness | 14, 13, 15, 20 | All 12 FINAL STANDARD questions answerable with evidence |

## 3. Agent roster

| # | Agent | First wave | Model |
|---|---|---|---|
| 01 | Product Research | 1a | Sonnet 5.5 |
| 02 | Temple Domain | 1a | Sonnet 5.5 |
| 03 | UX Architecture | 1b | Sonnet 5.5 |
| 04 | Visual Design / Figma | 2 | Sonnet 5.5 |
| 05 | 3D Technical Art | 2 | Sonnet 5.5 |
| 06 | Frontend | 3 | Sonnet 5.5 |
| 07 | Backend | 3 | Sonnet 5.5 |
| 08 | Database + RLS | 2 | Sonnet 5.5 |
| 09 | Realtime / Chat / Call | 6 | Sonnet 5.5 |
| 10 | AI Temple Secretary | 7 | Sonnet 5.5 |
| 11 | Quest / Gamification / Reward | 3 | Sonnet 5.5 |
| 12 | Community | 6 | Sonnet 5.5 |
| 13 | Security / Privacy | 2 | Sonnet 5.5 |
| 14 | QA | 3 | Sonnet 5.5 |
| 15 | Performance | 5 | Sonnet 5.5 |
| 16 | DevOps | 2 | Sonnet 5.5 |
| 17 | Temple Workforce | 1a | Sonnet 5.5 |
| 18 | Facility / Asset | 1a | Sonnet 5.5 |
| 19 | Ceremony / Event Operations | 1a | Sonnet 5.5 |
| 20 | Governance Auditor | 1b | Sonnet 5.5 |

Why 17/18/19 start in Wave 1: the spec makes "Roles" a Wave 1 item, and the role-aware home of 15+ lay roles
cannot be designed (Agent 03) without their workflows.

## 4. Continuous loop after each wave

1 collect reports → 2 inspect diffs → 3 run tests → 4 compare to spec → 5 update `GAP_ANALYSIS.md` → 6 update
`RISK_REGISTER.md` → 7 update `FEATURE_MATRIX.md` readiness → 8 decide next wave → 9 rewrite prompts → 10 continue.
