# GAP ANALYSIS — BOON SYSTEM

Revision 2 — 2026-10-07 (Wave 1 gate). Baseline: repository empty at Wave 0 (`CURRENT_STATE_AUDIT.md`); Wave 1 added
documentation only — **still no code, schema, design or 3D asset.**

## 1. Summary

| Dimension | Spec | Current | Gap size |
|---|---|---|---|
| Product definition | Detailed master spec | Spec now captured in `docs/master/` | Closed at document level; open questions remain (§3) |
| Domain model | Implied | Master v0.3 + 21 domain specs with ~330 numbered test cases (`docs/domain/`) | Closed at spec level; field validation BLOCKED (R-03) |
| Roles & permissions | RBAC + scope | 59 permissions × 28 roles in `role_permissions.yaml`, validated by `tools/role_matrix.py` | DB implementation + generated isolation tests (Wave 3) |
| UX | 2 modes, role-aware home | `docs/ux/` — navigation, module registry, flows for all north-star questions, state patterns, Command Center UX, accessibility, 12+ low-fi wireframes | Visual design (Wave 2); user testing BLOCKED (R-03) |
| Visual design | 3 directions → BOON UI | Nothing | Full (Wave 2) |
| Data | ~35 tables | Plan only | Full (Waves 2–3) |
| Security | Tenant isolation P0 | Model only | Full; executable tests needed from first migration |
| 3D | Wat Arun slice | Nothing; **no legal asset** | Full + external blocker |
| AI | Copilot | Nothing | Full (Wave 7) |
| Ops/DevOps | CI, deploy, monitoring | Nothing | Full (Wave 2–3) |

Every one of the 46 features in `FEATURE_MATRIX.md` remains `PLANNED` (F-19 `BLOCKED`). Wave 1 specs do not raise
readiness: `RESEARCHED` is blocked by unopened sources (R-18) and `DESIGNED` needs visual design (Wave 2).

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
| Q-04 | LINE Login / LINE OA integration? | Thai users live on LINE | **Wave 1 rec:** P1 — LINE OA/LIFF for lay notifications and sharing; LINE Login never the only identity; no monastic-targeted messaging by default | Owner ack |
| Q-05 | Finance scope | Legal/accounting risk, ไวยาวัจกร duties | Out of pilot; view-only design | Owner |
| Q-06 | Minors policy (samanera, temple boys) | PDPA + child safety | Minor accounts, no P2P chat/calls | Opus + legal |
| Q-07 | Is "แต้มบุญ" acceptable as a UI label for monastics? | Religious appropriateness | **Decided (working):** "แต้มกิจวัตร"; "แต้มบุญ" never used for monastics. Lay label under test (แต้มบุญชุมชน vs แต้มร่วมกิจกรรม) | Monk advisor confirms |
| Q-08 | Check-in for monks acceptable? | Availability signal quality | **Wave 1 rec:** optional, opt-in, expiring, no GPS; secretary may set status on a monk's behalf (audited); calendar + opt-in primary | Field research |
| Q-09 | Travel time source (Google Maps / Longdo Map / manual) | Smart assignment accuracy | Manual estimate + optional API (ADR) | Wave 4 |
| Q-10 | Calls: is voice/video in pilot? | Cost, safety | P2, post-pilot unless research shows need | Owner |
| Q-11 | Sangha governance approval needed? | Adoption, legitimacy | **Wave 1 rec:** no legal requirement found (not proof of absence); obtain pilot abbot's written consent, ask about informing เจ้าคณะ, never claim "Sangha-approved" | Owner |


## 4. Wave 1 review notes (Opus)

Process: 7 agents (01, 02, 17, 18, 19 → 03, 20), governance audit (0 P0, 5 P1, 21 P2, 15 P3), one targeted fix round
by the original authors, master docs to v0.2–v0.3. All 39 numbered master-change proposals are now applied or
superseded; none silently dropped.

### 4.1 Decisions taken at the gate

| ID | Decision | Where |
|---|---|---|
| S-1 | Newer self-set status supersedes older overlapping ones; admin UNAVAILABLE never superseded | Domain §4.2 |
| S-3 | Manual status always stored with `valid_until`; UI pre-fills end of day; admin UNAVAILABLE needs explicit end | Domain §4.2 |
| S-4 | Quest state machine runs per assignment; quest status derived | Domain §5.2 |
| S-7 + F-04 | Monastic status attested **per membership**; no global flag, no cross-temple propagation | Domain §3 |
| O-3 | Point balances per (temple, person); non-transferable | Domain §8 |
| F-02 | Money and rewards lay-only (`finance.approve`, `reward.manage`); abbot keeps `finance.view` | Matrix rule 2 |
| F-03 | Monastic practice days have no loss mechanics; lay streaks have grace days | SCORING_SPEC §7 |
| C-6 | Smart Assignment shows suggestions with reasons; scores/order audit-only | Domain §6.1 |
| C-8 | 5-slot bottom bar + "เพิ่มเติม" | UX IA §2 |
| G-UX-1/2 | Self-reads and map access implicit for active memberships | YAML header |
| M-02 | Generic `department_lead` role instead of per-department lead roles | Matrix §2 |
| — | Presence has 6 states incl. OFF_SHIFT; counters use two partitions (status, location) | Domain §4.3, §7 |
| — | Team scope removed; scopes S ⊂ D ⊂ T with modifiers A/P/C and closed condition keys | Matrix §1 |

### 4.2 Open items carried into Wave 2 (owner)

| Item | Owner | Wave |
|---|---|---|
| Single skill vocabulary (SMA, staffing targets, volunteer matching) — audit F-25 | Agent 02 | 2 |
| Attendance record spec (novice classes, `attendance` verification) — F-26 | Agent 02 | 2 |
| Zone read rule for housekeepers/gardeners (M-10) | Agent 18 + 08 | 2 |
| Asset reservation for events (A18-2) | Agent 18 | 5 |
| Routing/ETA provider ADR (departure times, SMA return buffer) | Opus ADR | 4 |
| Staff earning community points for paid work? (OQ-03) | Owner | 6 |
| Schema test: every tenant table has `temple_id` + forced RLS (F-23) | Agent 08 | 2 |
| CI job for `tools/role_matrix.py --check` (F-22) | Agent 16 | 2 |
| Source verification pass when fetch is allowed or a human reads primary texts (R-18) | Agent 01 / human | any |

## 5. Change log

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-10-07 | Initial gap analysis from empty-repo audit |
| 2 | 2026-10-07 | Wave 1 gate: Q-04/07/08/11 recommendations, decisions log, carried items |
