# GAP ANALYSIS — BOON SYSTEM

Revision 1 — 2026-10-07 (after Wave 0 audit). Baseline: repository empty (`CURRENT_STATE_AUDIT.md`).

## 1. Summary

| Dimension | Spec | Current | Gap size |
|---|---|---|---|
| Product definition | Detailed master spec | Spec now captured in `docs/master/` | Closed at document level; open questions remain (§3) |
| Domain model | Implied | Draft model in `TEMPLE_DOMAIN_MODEL.md` | Needs Wave 1 validation (Agent 02, 17, 18, 19) |
| Roles & permissions | RBAC + scope | Draft matrix | Needs domain validation + DB implementation |
| UX | 2 modes, role-aware home | IA skeleton | Flows, wireframes, states missing (Agent 03) |
| Visual design | 3 directions → BOON UI | Nothing | Full (Wave 2) |
| Data | ~35 tables | Plan only | Full (Waves 2–3) |
| Security | Tenant isolation P0 | Model only | Full; executable tests needed from first migration |
| 3D | Wat Arun slice | Nothing; **no legal asset** | Full + external blocker |
| AI | Copilot | Nothing | Full (Wave 7) |
| Ops/DevOps | CI, deploy, monitoring | Nothing | Full (Wave 2–3) |

Every one of the 46 features in `FEATURE_MATRIX.md` is at `PLANNED` (F-19 `BLOCKED`).

## 2. Gaps by protected core feature

| # | Core feature | Missing to reach VERIFIED |
|---|---|---|
| 1 | Temple Command Center | All data sources (people, availability, quests, events, facility, community); read-model RPCs; UI; Unknown semantics tests |
| 2 | Interactive map / 3D | Building registry, scene manifest, 2D map, licensed 3D asset, perf gate |
| 3 | Quest | Schema, state machine functions, evidence storage, verification, UI |
| 4 | Monk Availability | Resolver function + tests for priority table, check-in, manual statuses with expiry, board UI |
| 5 | Smart Schedule & Invitation | `schedule_entries`, invitation lifecycle, travel estimate source (maps API? ADR), suggestion algorithm, human confirm |
| 6 | Event / Boss Quest | Event model, readiness formula + hard gates, department boards |
| 7 | People + Role/Permission | Membership, roles, scopes, RLS helpers, admin UI |
| 8 | Community Quest | Volunteer signup, public quests, verification by staff/QR |
| 9 | Boon Point + Reward | Two ledgers with DB-enforced separation, redemption, catalog, anti-cheat |
| 10 | AI Temple Secretary | Provider ADR, Thai speech-to-text quality check, draft pipeline, guardrails |

## 3. Specification gaps & ambiguities (need decisions)

| ID | Question | Why it matters | Proposed default | Decider |
|---|---|---|---|---|
| Q-01 | Which real temple is the pilot? Is Wat Arun a partner or only a 3D showcase? | Research access, data, 3D permission | Pilot with a willing temple; Wat Arun only as 3D slice if permission obtained | Owner |
| Q-02 | Web/PWA vs native mobile? | Push, voice, offline, store presence | PWA first (ADR-0001) | Opus → owner ack |
| Q-03 | Supabase acceptable (hosting region, cost, PDPA transfer)? | DB/auth/realtime foundation | Supabase ap-southeast-1 | Owner |
| Q-04 | LINE Login / LINE OA integration? | Thai users live on LINE | Evaluate in research; not P0 | Agent 01 |
| Q-05 | Finance scope | Legal/accounting risk, ไวยาวัจกร duties | Out of pilot; view-only design | Owner |
| Q-06 | Minors policy (samanera, temple boys) | PDPA + child safety | Minor accounts, no P2P chat/calls | Opus + legal |
| Q-07 | Is "แต้มบุญ" acceptable as a UI label for monastics, given doctrinal sensitivity? | Religious appropriateness | Research with monks; alternative "แต้มกิจวัตร" | Agent 01 + monk advisors |
| Q-08 | Check-in for monks acceptable? | Availability signal quality | Optional; calendar + opt-in is primary | Research |
| Q-09 | Travel time source (Google Maps / Longdo Map / manual) | Smart assignment accuracy | Manual estimate + optional API (ADR) | Wave 4 |
| Q-10 | Calls: is voice/video in pilot? | Cost, safety | P2, post-pilot unless research shows need | Owner |
| Q-11 | Sangha governance approval needed for the product to be used inside temples? | Adoption, legitimacy | Ask pilot abbot; research | Agent 01 |

## 4. Change log

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-10-07 | Initial gap analysis from empty-repo audit |
