# GOVERNANCE AUDIT — Wave 1 (Agent 20)

Auditor: Agent 20, Governance Auditor · Prompt pack revision W1-r3 · Audit date: 2026-10-07
Baseline: `HEAD` = `d60483f` (commits `10febdc` … `d60483f`). Working tree at audit time: `docs/ux/**` modified or untracked (Agent 03, **out of scope, not audited**).
Scope: `docs/master/**` (v0.2 as applied by Opus), `docs/research/**`, `docs/domain/**`, `FILE_OWNERSHIP.md`, `README.md`.
Method: read all in-scope files; diffed against `10febdc`; ran an ad-hoc script (not committed; scratchpad only) that expands `docs/master/role_permissions.yaml` (groups, overrides, `-` removals) and compares every cell of `ROLE_PERMISSION_MATRIX.md` §4 (55 permissions x 28 roles = 1,540 cells); grepped every backticked `x.y` code in `docs/domain/**` against the YAML; counted case rows by regex.
Limits: the master specification (§0–§43) is not in the repository (see F-05); I did not open any web source (all research sources are search-summary only, per R-18); I did not audit `docs/ux/**`.

## 0. Summary counts

| Severity | Count | Meaning used |
|---|---|---|
| **P0** | **0** | Cross-temple leakage or a non-negotiable product rule broken by an authoritative document |
| **P1** | **5** | Policy contradiction or governance gap that would mislead Wave 2/3 work if left |
| **P2** | **21** | Contradiction, stale master doc, or dropped proposal that needs a decision or edit before Wave 2 |
| **P3** | **15** | Wording, stale annotation, weak-source or hygiene item |
| **Total** | **41** | |

Headline results:
- **Role grants: YAML and `ROLE_PERMISSION_MATRIX.md` §4 agree on all 1,540 cells; restricted markers (🔒) agree with the YAML `restricted` list; catalog §3 and YAML list the same 55 codes.** The prose around the table is not fully in sync (F-19, F-20).
- **Every permission code used in `docs/domain/**` exists in the YAML**, with two non-codes mentioned only as gaps (`presence.checkin`, `conflict.view`; F-31). Several domain docs still describe grants that differ from the YAML (F-18).
- **File ownership: no violation found** in any tracked file (section 5).
- **Proposal disposition (section 7):** 39 numbered "Proposed changes" items across the five reports: 30 applied or applied in equivalent form (1 partially), **9 silently dropped**, 0 rejected with a reason; plus 1 unnumbered stop-condition decision (Agent 02 S-3) silently dropped. Break-glass (G-3) is carried to Agent 13.
- The five P1 findings: monastic score label "แต้มบุญ" still in two domain docs (F-01); monastic finance/reward grants contradict Agent 01's "lay-only" finding (F-02); master says monastic streaks have no loss mechanics but SCORING implements reset-to-zero (F-03); `monastic_kind` is propagated across temples by design (F-04); the master spec is not in the repo so coverage cannot be verified (F-05).

---

## 1. Spec coverage table

The §0–§43 text is not in the repo (F-05). The only section references in the repo are §25 (quest fields), §29 (multi-temple example), §30 (RBAC), §42 (protected core), §43 (cited by the prompt pack). I therefore map the sections the repo itself summarises: the 10 protected-core features, the 46 features of `FEATURE_MATRIX.md`, and the 12 "pilot-ready" questions of `EXECUTIVE_PRODUCT_PLAN.md` §6. "Covered" means a normative or design document exists; no feature is above PLANNED and none should be.

### 1.1 Protected core (spec §42)

| # | Core feature | Where covered (Wave 0 + 1a) | Gap |
|---|---|---|---|
| 1 | Command Center | TEMPLE_DOMAIN_MODEL §2, §4.3; AVAILABILITY_SPEC §10 (CC-1..6); STAFF_PRESENCE_SPEC §5; EVENT_BOSS_QUEST_SPEC §6; MAINTENANCE_SPEC / SPATIAL §7 (building problem) | No single Command Center read-model spec (panel list, refresh, drill-down, Unknown explainer); owned by nobody in Wave 1. Facility, event, staff panels each define their own counters. |
| 2 | Map / 3D | 3D_STRATEGY; SPATIAL_REGISTRY_SPEC; WAT_ARUN_REGISTRY_DRAFT | Wat Arun registry unconfirmed by the temple (by design); licensed model absent (R-02, BLOCKED). |
| 3 | Quest | QUEST_LIFECYCLE_SPEC (40 cases); workforce templates (47) | Evidence storage and `attendance` verification have no owner (F-26). |
| 4 | Monk Availability | AVAILABILITY_SPEC (48 cases) | Cross-temple busy signal open (OQ-A3). Stale gap annotations (F-31). |
| 5 | Smart Schedule & Invitation | SCHEDULE_INVITATION_SPEC (27 + 6 cases); VEHICLE_TRIP_SPEC; CEREMONY_OPERATIONS_SPEC | Enum and estimate conflicts (F-12, F-13, F-14, F-15). |
| 6 | Event / Boss Quest | EVENT_BOSS_QUEST_SPEC (28 cases); EVENT_CATALOG; TEMPLE_MEMORY_SPEC | Skill vocabulary missing (F-25); per-event lead grant undefined (F-41). |
| 7 | People + Role/Permission | ROLE_PERMISSION_MATRIX + YAML; TENANCY_IDENTITY_SPEC | Scope `Tm` undefined (F-21); no validator (F-22). |
| 8 | Community Quest | QUEST_LIFECYCLE_SPEC (`volunteer` type); EVENT spec §7 public signup | No community/volunteer spec (Agent 12, Wave 6): expected. |
| 9 | Boon Point + Reward | SCORING_SPEC (24 cases) | Label and streak conflicts (F-01, F-03); reward grant to a monastic role (F-02). |
| 10 | AI Temple Secretary | Constraints only (drafts-only rules across specs; TEMPLE_MEMORY_SPEC §6) | No spec until Wave 7: expected. |

### 1.2 Feature matrix F-01..F-46

| Feature | Covered by | Gap |
|---|---|---|
| F-01 Auth | TENANCY_IDENTITY_SPEC (identity, session claim); SECURITY_MODEL §4 | OTP/email flow not specified (Wave 3). |
| F-02 Tenancy | TENANCY_IDENTITY_SPEC | Child-table `temple_id` omissions in other specs (F-23). |
| F-03 Roles/permissions | Matrix, YAML | See F-18..F-22. |
| F-04 RLS isolation matrix | TENANCY TI-01..12, matrix §6, DATABASE_PLAN §2, §5 | Test matrix not yet generated; YAML qualifiers not machine-parseable (F-35). |
| F-05 Audit log | DOMAIN_EVENTS (audit consumer), QUEST §13 | No audit-log spec (shape, retention vs PDPA erasure O-4). |
| F-06 People directory | TENANCY §11 | Partial. |
| F-07, F-08 Quest, evidence | QUEST_LIFECYCLE_SPEC | Evidence storage details only in SECURITY_MODEL. |
| F-09 Resolver + board | AVAILABILITY_SPEC | OK. |
| F-10 My Day | MODULE_REGISTRY_INPUT (workforce); `docs/ux` (not audited) | No domain doc. |
| F-11 Novice learning, class, attendance | QUEST type `novice_learning`, schedule kind `class` | **Attendance record and class timetable have no spec** (F-26). |
| F-12 Schedule | SCHEDULE_INVITATION_SPEC §2 | Enum conflicts (F-12, F-13). |
| F-13, F-14 Invitation, SMA | SCHEDULE_INVITATION_SPEC | F-14 dependency on F-31 contradicts spec (F-10). |
| F-15 Command Center | see core #1 | |
| F-16, F-17 Event, Memory | EVENT_BOSS_QUEST_SPEC, TEMPLE_MEMORY_SPEC | OK. |
| F-18, F-19, F-20 Map, 3D, registry | SPATIAL_REGISTRY_SPEC, 3D_STRATEGY | F-19 BLOCKED, correct. |
| F-21, F-22, F-23 Maintenance, assets, inventory | MAINTENANCE_SPEC, ASSET_INVENTORY_SPEC | OK. |
| F-24 Vehicles/trips | VEHICLE_TRIP_SPEC | Estimate conflict (F-14). |
| F-25 Cleaning/kitchen/garden homes | CLEANING, KITCHEN, GARDEN | OK (HYPOTHESIS content). |
| F-26 Ceremony team, undertaker | CEREMONY_OPERATIONS_SPEC, FUNERAL_OPERATIONS_SPEC | Funeral visibility needs codes (F-18). |
| F-27 Staff presence | STAFF_PRESENCE_SPEC | Five vs six states (F-16). |
| F-28..F-37 Community, ledgers, chat, calls, contact | SCORING_SPEC (F-30..F-33); rest Wave 6 | Expected gaps. |
| F-38 Notifications | DOMAIN_EVENTS consumer rows only | No notification spec (Wave 4). |
| F-39, F-40 AI | constraints only | Wave 7. |
| F-41 Discovery | none | Wave 6. |
| F-42 Office | OFFICE.md | P2 feature, OK. |
| F-43 Finance | OFFICE.md placeholder | Monastic grants unresolved (F-02). |
| F-44 UI system | master UX IA | Wave 2. |
| F-45, F-46 Analytics, CI | none | Wave 2/7. |

### 1.3 Pilot-ready questions (`EXECUTIVE_PRODUCT_PLAN.md` §6) mapped to data sources

| # | Question | Source spec | Gap |
|---|---|---|---|
| 1 | Temple state today | Command Center (see core #1) | No consolidated spec |
| 2 | How many monks free | AVAILABILITY_SPEC §10 | OK |
| 3 | How many out on invitations | AVAILABILITY_SPEC §10 | OK |
| 4 | Who must do what | QUEST_LIFECYCLE_SPEC, MODULE_REGISTRY_INPUT | OK |
| 5 | Which events are not ready | EVENT_BOSS_QUEST_SPEC §5 | OK |
| 6 | Which buildings have problems | MAINTENANCE_SPEC §6, SPATIAL §7 | OK |
| 7 | Which vehicles are free | VEHICLE_TRIP_SPEC §6 | Driver availability depends on F-27 |
| 8 | Volunteers still needed | EVENT_BOSS_QUEST_SPEC §2.4 | Sign-up flow Wave 6 |
| 9 | Community quests | QUEST (`volunteer`) | Wave 6 |
| 10 | Are scores correct | SCORING_SPEC cases | F-01, F-03 |
| 11 | Who may view each item | Matrix + YAML | F-18 |
| 12 | Does temple A leak to B | TENANCY, matrix §6 | F-04, F-23 |

---

## 2. Policy compliance checklist (COMMON RULES)

PASS = no contradiction found. PASS* = holds with logged findings. FAIL = an authoritative or governing document contradicts the rule.

| Rule | Verdict | Evidence (file:line) |
|---|---|---|
| Two separate ledgers, never summed | PASS | `TEMPLE_DOMAIN_MODEL.md:227-239`; `SCORING_SPEC.md:10, 224` (SC-18 refuses a combined total); `DOMAIN_EVENTS.md:148` ("No event ever carries both ledgers"); `DATABASE_PLAN.md:80-87` |
| Monastic score never redeemable or ranked | PASS* | Redeem/rank forbidden: `SCORING_SPEC.md:146-152` (F-1, F-2, F-3), `TEMPLE_DOMAIN_MODEL.md:233-234`. Conflicts logged: label F-01, streak loss F-03, ranking wording F-40. |
| AI drafts only; humans approve | PASS* | `SCHEDULE_INVITATION_SPEC.md:11-13, 106`; `EVENT_BOSS_QUEST_SPEC.md:136`; `CEREMONY_OPERATIONS_SPEC.md:85-90`; `DOMAIN_EVENTS.md:17`; `SCORING_SPEC.md:16`; `FUNERAL_OPERATIONS_SPEC.md:94`. Residual: `FEATURE_MATRIX.md:25` lists Agent 10 (AI) as an owner of the rule-based SMA (F-28). |
| Public reaches monastics only via Temple Contact | PASS | `TEMPLE_DOMAIN_MODEL.md:248-250`; `GLOSSARY.md:144`; `07_PERSONAS.md:71`; `RISK_REGISTER.md:12`. No chat spec exists yet (Wave 6); the rule is a verification item (matrix §6, line 215). |
| Optional sensitive profile fields never required; PUBLIC/CONNECTIONS/PRIVATE | PASS (design level) | `TEMPLE_DOMAIN_MODEL.md:244-245`; `TENANCY_IDENTITY_SPEC.md:29`; `SECURITY_MODEL.md:53`. No community-profile spec yet (Wave 6). |
| Unknown shown as Unknown, never invented | PASS* | Strong: `AVAILABILITY_SPEC.md` (UNKNOWN fallback), `VEHICLE_TRIP_SPEC.md:90-91`, `KITCHEN.md` headcount range, `WAT_ARUN_REGISTRY_DRAFT.md:56` (no height recorded). Exceptions: computed travel time `SCHEDULE_INVITATION_SPEC.md:157` (F-14); SMA ranks a no-signal monk above an opted-in one `:236-237` (F-15). |
| Every tenant row has `temple_id`; cross-temple leakage = P0 | PASS* | `DATABASE_PLAN.md:17-23`; `TENANCY_IDENTITY_SPEC.md` TI-02; cross-temple cases AV-43, INV-23, Q-26, SC-21, EV-23, FN-11. Findings: child-table field lists omit `temple_id` (F-23); deliberate cross-temple propagation of `monastic_kind` (F-04). |
| Readiness vocabulary only | PASS* | All status words are in the allowed set; row labels SOURCED/CANDIDATE (`WAT_ARUN_REGISTRY_DRAFT.md:30`) are evidence labels, not readiness. Evidence problem for RESEARCHED: F-06. |
| Documentation only: no code, SQL, package or config | PASS* | No SQL/code found except one pseudo-WHERE phrase (`FUNERAL_OPERATIONS_SPEC.md:86`). Config-like artifacts: `role_permissions.yaml` (Opus, master) and a JSON manifest example (`SPATIAL_REGISTRY_SPEC.md:60`): F-36. |
| Write only inside owned paths; no git write commands | PASS | Section 5. |
| Real-world claims sourced (URL + date) or HYPOTHESIS | PASS* | Section 4: 24 claims sampled, 20 compliant, 4 weak or unlabelled (F-37, F-38, F-39). |
| English with Thai in parentheses; Thai for quotes and UI copy | PASS (spot check) | Specs use "Thai / English" table columns rather than "English (Thai)"; acceptable. |
| REPORT.md per agent with required sections | PASS | All five REPORT.md exist with Summary, Files, Evidence, Open questions, Proposed changes, Blockers, Readiness. Agent 18 and 19 reports admit no cross-check with 02/17 (`facility/REPORT.md:27`, `events/REPORT.md:241`); this audit did that cross-check (F-10..F-26). |

---

## 3. Contradictions and findings (P0–P3)

Format: ID · severity · title · locations · recommended resolution.

### P0 (0)

None. No authoritative document defines an unintended cross-temple read path. F-04 is the nearest case and is rated P1 because it is a documented design choice, not an accident; Opus may elevate it to P0 if the legal review (D-5) says religion-linked status must not cross tenants.

### P1 (5)

**F-01 · P1 · Monastic score is still labelled "แต้มบุญ" in two domain docs.**
`docs/domain/GLOSSARY.md:86` (`monastic_activity_score | แต้มบุญ (UI)`) and `docs/domain/core/SCORING_SPEC.md:49` ("Label in UI: 'แต้มบุญ' per master…") contradict `docs/master/TEMPLE_DOMAIN_MODEL.md:22` ("แต้มบุญ is not used for monastics"), `docs/master/AGENT_PROMPT_PACK.md:306`, and `docs/research/REPORT.md:25-27`. Risk R-04 (`RISK_REGISTER.md:10`) names this exact label. The domain files predate the master edit and Agent 02 is released, so nobody owns the fix.
Resolution: Opus edits GLOSSARY.md and SCORING_SPEC.md (or reopens Agent 02's lock for a one-line change) to "แต้มกิจวัตร (working label; monk advisor decides)"; tell Agent 03 (`docs/ux`) to use the master label.

**F-02 · P1 · Default grants give monastic roles finance and reward authority, contradicting Agent 01's "lay-only" finding.**
`role_permissions.yaml:106` (`finance.view`: abbot, deputy_abbot), `:107` (`finance.approve`: abbot T), `:110` (`reward.manage`: abbot T); matrix `ROLE_PERMISSION_MATRIX.md:160-161, 163`. Agent 01: `research/REPORT.md:22-24` ("keeps finance and rewards lay-only"), `02_VINAYA…md:129` (C1 money) and `:167` (F-43 "Lay-only, post-pilot"), and the question to monk advisors at `:173` (may the abbot approve finance?) is still OPEN (`research/REPORT.md:81-83`). Matrix rule 2 (`:179`) only gates the *waiyawatchakon* grant. Opus applied Agent 01's role split (proposal 3) but not the lay-only conclusion, and recorded no decision.
Resolution: Opus decides explicitly. Recommended: remove monastic holders from `finance.view/approve` and `reward.manage` in the YAML until a monk advisor answers (finance stays with `waiyawatchakon`/`accountant`, reward fulfilment with `office_staff`), or mark them "disabled by default; enable per temple after abbot opt-in" in the YAML and matrix. Record the decision in `TEMPLE_DOMAIN_MODEL.md` §8.

**F-03 · P1 · Master says monastic streaks have no loss mechanics; SCORING_SPEC resets the streak to zero and awards monastic points for streak milestones.**
`TEMPLE_DOMAIN_MODEL.md:240` ("Monastic streaks have no loss mechanics (Agent 01)") vs `SCORING_SPEC.md:119-123` (a second miss in 7 days sets `L = 0`), `:54` (ME-2: +5/+20/+50 monastic points at 7/30/100 days), `:129-130` (90-day suppression of re-earned milestones, a punitive anti-farming rule). Agent 01: `04_COMPETITOR_ANALYSIS.md:146` ("Avoid [streaks] for monastics entirely"), `05_COMMUNITY_VOLUNTEER_REWARDS.md:217`, `research/REPORT.md:72` (proposal 6, never applied to `FEATURE_MATRIX.md:42`, F-31). The master sentence is therefore false against the committed spec, and the spec contradicts the research recommendation.
Resolution: Opus decides one of (a) no streak for monastics (drop ME-2 and §7 for monastics, keep a calm "days practised" count with no reset), or (b) accept the grace-based streak and amend `TEMPLE_DOMAIN_MODEL.md:240` and `FEATURE_MATRIX.md` F-31 to say so, with a monk-advisor question. Either way apply Agent 01's F-31 note.

**F-04 · P1 · `monastic_kind` (religion-linked, PDPA s.26) propagates across temples by design.**
`TENANCY_IDENTITY_SPEC.md:144-147` ("A temple A attestation is never readable by temple B beyond the derived `monastic_kind`"), `:166-168` (M-4: verification by temple B switches Brian to Monastic Mode "at B **and at A and C**", and flags his lay roles at A and C `ROLE_INELIGIBLE`), `:123-125, 128`; `DOMAIN_EVENTS.md:50` (`person.monastic_kind_changed` consumed by AV, CC, S, quest engine). Temple A and C admins learn a person became a monk because of an attestation by an unrelated temple B. `RISK_REGISTER.md:26` (R-20) covers only *false* attestation, not disclosure. The common rule says cross-temple leakage is P0 and `research/03_LEGAL_PDPA_MINORS.md:22-30` says religion-linked status is probably sensitive.
Resolution: Opus/Agent 13 record an explicit decision: either (a) mode derived per membership (a person is monastic in a temple only where that temple holds an attestation, no cross-temple event), or (b) keep global derivation with legal sign-off (D-5), limit the event payload to a boolean "ROLE_INELIGIBLE" without the reason, and add the disclosure to R-20 and `SECURITY_MODEL.md`. Add a cross-temple disclosure test to the Wave 3 gate list.

**F-05 · P1 · The master specification (§0–§43) is not in the repository.**
`CURRENT_STATE_AUDIT.md` §3 row 1 ("Yes — in the session prompt only. Not yet in the repo"). The prompt pack asks for coverage "§0–§43 as summarised in EXECUTIVE_PRODUCT_PLAN.md and FEATURE_MATRIX.md", but only §25, §29, §30, §42 are cited anywhere (`TEMPLE_DOMAIN_MODEL.md:133, 58`, `ROLE_PERMISSION_MATRIX.md:3`, `FEATURE_MATRIX.md:7`). Coverage against the authoritative text cannot be verified, and every agent works from a paraphrase.
Resolution: Opus commits the spec verbatim as `docs/master/SPEC.md` (owner Opus), then Agent 20 re-runs section 1 of this audit against real section numbers.

### P2 (21)

**F-06 · P2 · Documents claim RESEARCHED although R-18 says unverified sources block it.**
`RISK_REGISTER.md:24` (R-18: "No feature advances to RESEARCHED on unverified sources"). Self-labels: `research/01_TEMPLE_OPERATIONS.md:3`, `02…:3`, `03…:3`, `04…:3`, `05…:3`, `06…:3`, `07_PERSONAS.md:3`, `research/REPORT.md:88`, `facility/WAT_ARUN_REGISTRY_DRAFT.md:3`, `events/EVENT_CATALOG.md:3`, `events/REPORT.md:214`, `facility/REPORT.md:193`. Every source was seen only as a search summary (`01…:7-9`; `facility/REPORT.md:152`; `EVENT_CATALOG.md:13-17`).
Resolution: change those labels to PLANNED with "desk summary, sources unopened" (or DESIGNED for registry/catalog structure), or amend R-18 to define RESEARCHED-PARTIAL. Re-verify with a human reader before any RESEARCHED claim.

**F-07 · P2 · `SECURITY_MODEL.md` is stale against decision S-7 and lacks the funeral class.**
`SECURITY_MODEL.md:32` ("`monastic_kind` set only by temple admin verification") vs `TEMPLE_DOMAIN_MODEL.md:60-63` (attestation, two-person rule, derived kind). Events proposal 7 (funeral data class: restricted, assignment-scoped, 7-day contact purge, AI exclusion; `events/REPORT.md:78`) was not applied; `RISK_REGISTER.md:25` (R-19) cites controls that exist only in `FUNERAL_OPERATIONS_SPEC.md:91-100`. Also missing: minor-account rule detail from Agent 01 (`03_LEGAL…:37-41`) and the cross-border item R-17.
Resolution: Opus revises SECURITY_MODEL to v0.2 (spoofing control, funeral/minor data classes, AI exclusions, R-17 cross-border), or hands it to Agent 13 with these inputs.

**F-08 · P2 · `DATABASE_PLAN.md` is stale and Events proposal 5 was dropped.**
`DATABASE_PLAN.md:38` (`persons.monastic_kind`, `monastic_verified_by`) vs the attestation model (`TENANCY_IDENTITY_SPEC.md` §5). Missing tables that Wave 1 specs require: `monastic_attestations`, staff presence/shift/handover (`STAFF_PRESENCE_SPEC.md:52-72`), `meal_service`, `event_departments`, `event_staffing_targets` (only mentioned at `DATABASE_PLAN.md:50`), `ceremony_assignments`, funeral tables, `memory_event_snapshot`, `asset_events`, `asset_custody`, `trip_passengers/legs` (listed), `recurrence_template`, `teams` (F-21).
Resolution: Opus adds a v0.2 table inventory before Agent 08 starts (Wave 2).

**F-09 · P2 · GAP_ANALYSIS not updated; Research proposal 4 dropped; prompt pack points to notes that do not exist.**
`GAP_ANALYSIS.md:3, 79-86` still rev 1: Q-04, Q-07, Q-08, Q-11 carry the Wave 0 defaults, not Agent 01's recommendations (`research/REPORT.md:38-45`). `AGENT_PROMPT_PACK.md:309-311` tells Agent 03 to read "Opus's Wave 1a review notes in GAP_ANALYSIS.md": none exist. `AGENT_PLAN.md:23` makes "Gap analysis rev 2" part of the Wave 1 gate.
Resolution: publish GAP_ANALYSIS rev 2 (Q-04 P1 not P0; Q-07 use "แต้มกิจวัตร"; Q-08 optional/expiring/no GPS; Q-11 abbot's written consent, never claim "Sangha-approved") and add the review notes, or correct the prompt pack reference.

**F-10 · P2 · `FEATURE_MATRIX.md` makes Smart Monk Assignment depend on the monastic score.**
`FEATURE_MATRIX.md:25` (F-14 depends on F-09, F-13, **F-31**) vs `TEMPLE_DOMAIN_MODEL.md:193` and `SCHEDULE_INVITATION_SPEC.md:150-151, 183-185` (SMA never reads either ledger). F-31 is Wave 4 like F-14, so the dependency could also reorder work.
Resolution: remove F-31 from F-14's Depends-on; note "reads availability, schedule, history only".

**F-11 · P2 · Master still states both "mandatory end time" and "default end of day" for manual states (decision S-3 not recorded).**
`TEMPLE_DOMAIN_MODEL.md:81` (UNAVAILABLE "with mandatory end time") vs `:105` ("Every manual state carries `valid_until` (default: end of the local day)"). Agent 02 recommended reading B (`core/REPORT.md:73`, S-3: the stored row always has an end; the command fills the default). S-1, S-2, S-4..S-7 were applied; S-3 was not.
Resolution: add to §4.2: "a manual status is stored only with an end time; the set command fills the default if the user gives none".

**F-12 · P2 · Schedule entry `kind` enum differs between master and the core spec.**
`TEMPLE_DOMAIN_MODEL.md:205-206` (10 kinds including `meal`, `leave`, `meeting`) vs `SCHEDULE_INVITATION_SPEC.md:23` (7 kinds, "master lists the first six"). `STAFF_PRESENCE_SPEC.md:58` and `KITCHEN.md:145` depend on `leave` and `meal`; no spec defines their semantics in the resolver (staff presence is separate from the monastic resolver).
Resolution: Opus asks Agent 02 (or edits) to state which kinds the monastic resolver reads and add `meal/leave/meeting` rows, or move staff-only kinds to a separate table.

**F-13 · P2 · `schedule_entries.source_type` enumerations do not agree.**
`SCHEDULE_INVITATION_SPEC.md:28` (`invitation`, `event`, `class_timetable`, `trip`, `manual`) vs `CEREMONY_OPERATIONS_SPEC.md:104-108` (`ceremony_assignment`) vs `STAFF_PRESENCE_SPEC.md:54` (`shift`); uniqueness key at `SCHEDULE_INVITATION_SPEC.md:35` is `(source_type, source_id, person_id, kind, leg)`.
Resolution: one enum owned by the core spec, with the other agents' values added.

**F-14 · P2 · Travel time: computed from constants in one spec, "manual or Unknown, never invented" in another; buffers differ.**
`SCHEDULE_INVITATION_SPEC.md:155-158` (`ceil_to_5(km / 30 km/h × 60) + 10`, straight-line × 1.3; HYPOTHESIS) vs `VEHICLE_TRIP_SPEC.md:90-91` (estimate only from provider, manual entry, or unknown; "the system never invents a travel time") and `facility/REPORT.md:169`. Buffers: arrival 30 / return 30 (`SCHEDULE_INVITATION_SPEC.md:223-230`) vs arrival 30 / return 15 / turnaround 20 (`VEHICLE_TRIP_SPEC.md:93, 100`). Master: `TEMPLE_DOMAIN_MODEL.md:219-220` and `GAP_ANALYSIS.md:84` (Q-09: manual estimate + optional API).
Resolution: choose one source of truth. Recommended: SMA uses a labelled estimate ("ประมาณการ") only when no provider or manual value exists, never silently, and both specs share one buffer configuration table.

**F-15 · P2 · SMA ranks a monk with no availability signal above a monk who opted in.**
`SCHEDULE_INVITATION_SPEC.md:236-237`: monk D (no signal) scores 80.00 and ranks above monk C (AVAILABLE covers the window) at 72.50; only a warning is attached. Master: `TEMPLE_DOMAIN_MODEL.md:104` ("Never default to AVAILABLE").
Resolution: cap UNKNOWN-availability candidates below all candidates with an AVAILABLE cover, or make `NO_AVAILABILITY_SIGNAL` a soft exclusion the secretary must acknowledge. Arithmetic of the example was re-checked and is correct (95.00, 71.25, 72.50, 80.00).

**F-16 · P2 · Staff presence spec still defines five states; master decided six.**
`TEMPLE_DOMAIN_MODEL.md:221-223` (decision: add `OFF_SHIFT`) vs `STAFF_PRESENCE_SPEC.md:41-47, 96, 130, 192-193, 206` (five states; OFF_SHIFT is an UNKNOWN reason; WF-13, WF-14 encode that). `AGENT_PROMPT_PACK.md:307` tells Agent 03 there are six. The spec states only §2, §4, counters change (`:47`).
Resolution: reopen Agent 17's lock for a targeted revision (WF-13, WF-14, counters), or Opus patches those sections.

**F-17 · P2 · Domain docs use roles that do not exist in the YAML.**
`kitchen_lead` appears 13 times (`GLOSSARY.md:105`, `KITCHEN.md:15, 115-122, 155, 160`, `ASSET_INVENTORY_SPEC.md:66, 73, 105`, `STAFF_PRESENCE_SPEC.md:16`, `MODULE_REGISTRY_INPUT.md:51`); `staff_supervisor` (`workforce/REPORT.md:31, 79`); `event_department_lead` (`EVENT_BOSS_QUEST_SPEC.md:79`). Master: `ROLE_PERMISSION_MATRIX.md:51` ("`kitchen_lead` is `department_lead` in kitchen"). Home registry must be keyed by permission (`ROLE_PERMISSION_MATRIX.md:207`), not role.
Resolution: GLOSSARY entry "kitchen_lead = department_lead in department kitchen"; mark `staff_supervisor` as rejected in the matrix change log; give Agent 03 the mapping.

**F-18 · P2 · Several domain docs describe grants that the YAML does not provide.**
- `STAFF_PRESENCE_SPEC.md:158-166`: "every staff role: view Tm", `set_others` T for abbot/office; YAML `presence.view` has no Tm (`role_permissions.yaml:77`) and `presence.set_others` only department_lead, facility_manager, temple_admin (`:80`).
- `SECURITY_TRAFFIC.md:55-56`: gate log readable by "author, security shift lead and abbot-level"; YAML has only `security.log` S for guards/traffic (`:114`) and no read code for the log; `security.incident.view` includes facility_manager T (`ROLE_PERMISSION_MATRIX.md:168`), which the spec does not list.
- `FUNERAL_OPERATIONS_SPEC.md:72-84`: abbot, deputy, assistant, secretary see "all" rites; rostered bhikkhu/samanera see own sessions; YAML has `funeral.assigned.view` only for undertaker, ceremony_team, ceremony_lead (`:66`) and `funeral.register.view` abbot + office (`:67`). No code covers the rite list for monastics.
Resolution: Opus decides each, then either amends the YAML (add `security.log.view` / widen `presence.view` / add a rite-list code) or tells Agents 17/19 to correct the spec text. Re-render §4.

**F-19 · P2 · Matrix §1 lists four restricted permissions; the YAML and §3/§4 mark ten.**
`ROLE_PERMISSION_MATRIX.md:17-18` (`finance.approve`, `member.manage`, `temple.settings`, `audit.view`) vs `role_permissions.yaml:23-24` and §4 🔒 markers (adds `invitation.confirm`, `ceremony.confirm_monks`, `event.approve`, `finance.view`, `security.incident.view`, `funeral.register.view`). The sentence governs temple-level extension of roles, so the gap is operative.
Resolution: replace the parenthetical list with "any permission marked 🔒 (YAML `restricted`)".

**F-20 · P2 · `minor_overrides` sub-codes are not in the catalog.**
`role_permissions.yaml:37` (`community.participate.p2p_chat`, `.calls`, `community.public_profile`); catalog §3 has only `community.participate` (`ROLE_PERMISSION_MATRIX.md:94`). A generated test cannot resolve the sub-codes.
Resolution: add the three codes to §3 and to the YAML grants (or state they are sub-capabilities of `community.participate` with a defined list).

**F-21 · P2 · Scope `Tm` (team) has no definition or data model.**
Used in `role_permissions.yaml:3, 85` (`member.view: "@staff": Tm`) and matrix §1 line 13 (`self ⊂ team ⊂ department ⊂ temple`); `DATABASE_PLAN.md:44, 28` has `departments` and `in_scope(temple, owner, department)` but no `teams` table or team parameter. Also scopes `A`, `P`, `C` sit outside the stated chain (`ROLE_PERMISSION_MATRIX.md:13` vs `:113-115`).
Resolution: define "team" (a department sub-group? a shift?) or replace `Tm` with `D`; extend the scope definition to state the partial order or that A/P/C are orthogonal.

**F-22 · P2 · The "validator" and "generated" claims have no artifact.**
`RISK_REGISTER.md:27` (R-21 mitigation: "YAML source of truth with validator") and `ROLE_PERMISSION_MATRIX.md:117` ("GENERATED from role_permissions.yaml") but the repo contains no generator, validator or CI check (only `FILE_OWNERSHIP.md`, `README.md`, `docs/`). My ad-hoc comparison found full agreement today, which shows the process works, but nothing keeps it so.
Resolution: either state "rendered manually in Wave 1; validator is a Wave 2 deliverable of Agent 08/16" in R-21 and the matrix header, or add the script under an owned path in Wave 2 and make it a CI job.

**F-23 · P2 · Child-table field lists omit `temple_id`.**
`ASSET_INVENTORY_SPEC.md:25, 51` (`asset_events`, `asset_custody`), `VEHICLE_TRIP_SPEC.md:36-37` (`trip_passengers`, `trip_legs`), `EVENT_BOSS_QUEST_SPEC.md:74` (`event_departments`), `CEREMONY_OPERATIONS_SPEC.md:69` (`ceremony_equipment`), `STAFF_PRESENCE_SPEC.md:54, 72` (`shift_assignment`, `handover_note`) define rows without `temple_id`; only some specs add a blanket statement (`QUEST_LIFECYCLE_SPEC.md:20`, `FUNERAL_OPERATIONS_SPEC.md:91`). COMMON RULES and `DATABASE_PLAN.md:19-22` require `temple_id` on every tenant row with composite foreign keys.
Resolution: add a one-line "every table in this spec carries `temple_id` and composite FKs" to each spec, or have Agent 08 derive the rule from DATABASE_PLAN §2 and add a schema test that fails on any tenant table without it.

**F-24 · P2 · Domain-event names and producers do not line up.**
`DOMAIN_EVENTS.md:150-159` (§8) expects `ceremony.staffed/cancelled`, `event.created/cancelled/readiness_changed`, `attendance.recorded`, `trip.vehicle_held/unavailable`, `maintenance.request_created`, `staff.shift_changed`. Agents 18 and 19 define no event lists at all (no matches in `facility/**`, `events/**`); Agent 17 uses PascalCase names (`STAFF_PRESENCE_SPEC.md:168-172`: `StaffCheckedIn`, `ShiftChanged`…) that differ from the dotted convention at `DOMAIN_EVENTS.md:15-17`.
Resolution: Agent 02's catalogue becomes the convention; Opus lists the expected producer events as requirements for the 18/19/17 revision pass, or marks §8 as "expected, unowned" until then.

**F-25 · P2 · Skill vocabulary assumed by Agent 19 does not exist; Agent 02 uses free tags.**
`EVENT_BOSS_QUEST_SPEC.md:88, 304` (`skill_code` from "Agent 17 skill vocabulary… free text not allowed"; A17-1) vs `SCHEDULE_INVITATION_SPEC.md:69, 171, 183` (`required_skills[]` tags) and no skill vocabulary anywhere in `workforce/**`.
Resolution: assign a single owner (Agent 17 or 02) for one skill vocabulary used by SMA, event staffing targets and volunteer matching.

**F-26 · P2 · `attendance` verification and novice class attendance have no owner or spec.**
`QUEST_LIFECYCLE_SPEC.md:196` (verification `attendance`: "source: Agent 19/17"), `DOMAIN_EVENTS.md:154` (`attendance.recorded`, "Agent 19 / 17"), `FEATURE_MATRIX.md:19` (F-11 novice classes, attendance); neither `events/**` nor `workforce/**` defines an attendance record, and the `novice_learning` extension `learning_progress` (`QUEST_LIFECYCLE_SPEC.md:50`) is undefined. QT-TRF-02 and QT-GEN-03 (`SECURITY_TRAFFIC.md:42`, `GENERAL_STAFF_AND_TEMPLE_BOY.md:46`) rely on the same method.
Resolution: assign an owner in the Wave 2/4 plan (suggest Agent 02, F-11) and add an attendance record spec before any quest template uses `attendance`.

### P3 (15)

**F-27 · P3 · Samanera (often minors) can create quest requests to staff, including minors.** `role_permissions.yaml:47` (`quest.request: samanera T`) vs R-22 (`RISK_REGISTER.md:28`, "errands") and the Wave 3 check "samanera has zero management permissions" (`ROLE_PERMISSION_MATRIX.md:214`). Resolution: decide whether `quest.request` is a management permission; if not, say so in §6; consider routing samanera requests through a teacher.

**F-28 · P3 · FEATURE_MATRIX content not updated from Wave 1a.** Dropped: Research proposals 6 (F-31 no ranking, no loss mechanics) and 7 (F-24 drivers are lay), Workforce proposal 7 (evidence links F-25, F-27, F-42), Events proposal 6 (F-26 depends on F-12/F-13; F-17 `temple_memory_notes`). Also `FEATURE_MATRIX.md:24` (F-13 owner 19, 07) contradicts `AGENT_PROMPT_PACK.md` review-log row 1 (invitations owned by Agent 02) and `FEATURE_MATRIX.md:25` lists Agent 10 (AI) for the rule-based SMA. Statuses stay PLANNED, which is correct. Resolution: fill the Evidence column with links without changing status; fix owners.

**F-29 · P3 · UX IA north-star rows not added.** Workforce proposal 8 (garden, security, office, general-staff rows) absent from `UX_INFORMATION_ARCHITECTURE.md:219-232`. Agent 03 may supersede; confirm in the Wave 1 gate.

**F-30 · P3 · Events proposal 4 dropped:** terms `staffing target`, `gate`, `funeral rite` are not in `TEMPLE_DOMAIN_MODEL.md` §1 (lines 8-26); GLOSSARY covers them partly. Resolution: add three rows.

**F-31 · P3 · Stale gap annotations in domain docs for gaps the YAML now closes.** `AVAILABILITY_SPEC.md:158-161` (G-A1 `presence.checkin`, G-A2 `schedule.manage` "no row", `conflict.view`), `SCHEDULE_INVITATION_SPEC.md:50, 99, 318` (G-S1, G-S2), `QUEST_LIFECYCLE_SPEC.md:150-157` (G-Q1..Q4), `SCORING_SPEC.md:192-193` (G-SC1/2), `TENANCY_IDENTITY_SPEC.md:81, 237-241` (G-1..G-3), `core/REPORT.md:115-124`. Resolution: add a "gap closure" table in the master matrix change log (gap ID to YAML line), so Wave 3 does not re-open them.

**F-32 · P3 · 17 stale superscript scope references (T¹, T³, T⁴, T⁶, D⁵) to footnotes that existed only in matrix v0.1.** Examples: `AVAILABILITY_SPEC.md:160, 178-179, 268`, `KITCHEN.md:186, 192`, `EVENT_BOSS_QUEST_SPEC.md:114`, `TENANCY_IDENTITY_SPEC.md:240`. v0.2 uses scope `C` and named qualifiers. Resolution: note the mapping (T³ = C, T⁴ = C counts only, D⁵ = D with panel filter) in the matrix.

**F-33 · P3 · Prompt pack says "27 roles"; the YAML/matrix define 28** (7 monastic + 21 community/staff). `AGENT_PROMPT_PACK.md:305` vs `role_permissions.yaml:12-17` and the 28 columns of `ROLE_PERMISSION_MATRIX.md:118`. Correct to 28 (Agent 03 may already be using the wrong count).

**F-34 · P3 · `deputy_abbot` described as "abbot minus temple.settings".** `ROLE_PERMISSION_MATRIX.md:31`; the YAML also withholds `asset.manage`, `vehicle.manage`, `finance.approve`, `audit.view`, `reward.manage`, `security.incident.view` (and `funeral.register.view`) from the deputy. Reword to "see YAML".

**F-35 · P3 · YAML scope values carry free-text qualifiers.** `T(delegated)`, `T(create/edit)`, `D(ceremony kind)`, `D(security)`, `D(staff panel)`, `T(non-restricted only)`, `T(explicit grant)`, `T(monastics)` (`role_permissions.yaml:59, 64, 65, 67, 72, 86, 87, 107, 115, 123`). The header promises test-matrix generation (`:2`); these need a defined grammar (scope + optional condition key).

**F-36 · P3 · Config-like artifacts in a documentation-only wave.** COMMON RULES forbid config in Wave 1: `docs/master/role_permissions.yaml` (Opus-owned, justified as a master artifact) and a JSON scene-manifest example (`SPATIAL_REGISTRY_SPEC.md:60`, Agent 18). Both are specification data, not runtime config. Resolution: note the exception in `FILE_OWNERSHIP.md` or the prompt pack.

**F-37 · P3 · "A monk is never assigned as a driver" is stated as fact without source or label.** `TEMPLE_DOMAIN_MODEL.md:201`; basis is one search-summary report of an MCT committee resolution of 20 Mar 2563 (`02_VINAYA…md:134`, "as stated by search summary"; `research/REPORT.md:74-75`: "verify"). As a product rule it is safe, as a factual claim it needs the HYPOTHESIS/verify label.

**F-38 · P3 · พรรษา definition unlabelled in the glossary.** `GLOSSARY.md:67` ("Years of monastic seniority counted in rains retreats") while `core/REPORT.md:129-131` and `TENANCY_IDENTITY_SPEC.md:22` label it HYPOTHESIS.

**F-39 · P3 · Weak sources carry policy weight.** Kathina prerequisites (≥5 bhikkhus) rest on one Malaysian temple blog (`EVENT_CATALOG.md:23, 71-73`; a non-blocking warning, acceptable); "no streaks for monastics" rests on blog posts rated "low authority" (`05_COMMUNITY…md:217, 232`; `04_COMPETITOR…md:166`). Resolution: keep the recommendations, mark the evidence grade, and ask the monk advisor.

**F-40 · P3 · Ranking wording is weaker in the master than in the spec.** `TEMPLE_DOMAIN_MODEL.md:234` ("No public ranking") vs `SCORING_SPEC.md:151` (F-2: no ranking or comparison at all, internal or public) and `UX_INFORMATION_ARCHITECTURE.md:51`. Align the master to "no ranking, no comparison".

**F-41 · P3 · Event readiness detail visible to all non-community roles; per-event department lead grant undefined.** `EVENT_BOSS_QUEST_SPEC.md:255-257` (readiness gates and gaps for any membership other than `community_member`, so volunteers and `lay_resident` too) and `:79` (per-event `event_department_lead`; Events proposal 2 only partly applied via `event.manage` D for `department_lead` and `facility_manager`, YAML `event.manage`). Decide the audience for gates and monk counts, and whether per-event leads exist.

---

## 4. Unsourced or weakly sourced factual claims (sample of 24)

Result: 20 compliant (sourced with URL + access date, or labelled HYPOTHESIS), 4 logged as findings. Note that "sourced" here means a search-summary citation (R-18).

| # | Claim | Location | Verdict |
|---|---|---|---|
| 1 | Sangha Act B.E. 2505 amended B.E. 2535; ไวยาวัจกร provisions | `research/01…md:54-55` | OK [S2], summary only |
| 2 | Abbot appoints ไวยาวัจกร in practice | `01…md:56-57` | OK [S2]; s.31 flagged "verify" |
| 3 | Sangha Council Rule 18/2536 | `01…md:63` | OK [S5] |
| 4 | ETDA hours online by generation; LINE 96.9% (2020) | `01…md:81-85` | OK [S7], dated, flagged |
| 5 | Nissaggiya Pācittiya 18 (money) | `02…md:129` | OK [S1] |
| 6 | MCT committee resolution 20 Mar 2563 bans monks driving | `02…md:134` | Sourced via summary; propagated unqualified to master (F-37) |
| 7 | 227 rules / 75 Sekhiyavatta | `02…md:182` | OK [S3][S7], "confirm" |
| 8 | PDPA s.20 minors 10 to under 20; s.26; s.28; s.37(4) 72 h | `03…md:13-18` | OK [S1]-[S4]; high-risk data-subject notice labelled HYPOTHESIS |
| 9 | Competitor prices (USD 15/month, USD 150/month) | `04…md:95, 100` | OK [S1][S3], flagged volatile |
| 10 | Better Impact 4.7/5, 141 reviews | `04…md:101` | OK [S3] |
| 11 | Habitica XP/HP; Duolingo streak anxiety | `04…md:108-109`; `05…md:217` | Blogs "low authority" (F-39) |
| 12 | Wat Arun first-class royal temple; Tentative List | `06…md:243-244` | OK [S1][S2] |
| 13 | NBTC + CAAT drone registration; 90 m rule | `06…md:252-254` | OK [S3] |
| 14 | Sketchfab model "sukritact", licence not visible | `06…md:260` | OK [S4] |
| 15 | Thai volunteer motivation studies | `05…md:177-179` | OK [S1] |
| 16 | Economic crowding-out literature | `05…md:188` | OK [S4], effect sizes unverified, flagged |
| 17 | Kathina: ≥5 bhikkhus, one month after vassa | `domain/events/EVENT_CATALOG.md:23, 71-72` | Sourced [S1] single blog (F-39) |
| 18 | Makha: 1,250 monks | `EVENT_CATALOG.md:95` | OK [S3] |
| 19 | Upasampada quorum 10 / 5 | `EVENT_CATALOG.md:27` | OK [S5] |
| 20 | Central prang height 66.8–86 m, "82 m" | `facility/WAT_ARUN_REGISTRY_DRAFT.md:56`; `3D_STRATEGY.md:176` | OK, conflict recorded, no height stored |
| 21 | Yaksha figure felled by lightning 24 Aug B.E. 2473 | `WAT_ARUN_REGISTRY_DRAFT.md:51` (row 10) | OK [S6], Thai-language search summary |
| 22 | Thai funeral rites (bathing, Abhidhamma chanting) | `events/FUNERAL_OPERATIONS_SPEC.md:10-14` | OK [S6]; rest labelled HYPOTHESIS |
| 23 | พรรษา = years of rains retreats | `domain/GLOSSARY.md:67` | **Unlabelled** (F-38) |
| 24 | Supabase Singapore is "closest to TH" | `master/DATABASE_PLAN.md:10` | Unsourced engineering assertion, low risk; fold into the PDPA transfer review (R-17) |

Also checked and compliant: numeric defaults in SCORING (caps, milestones), SMA weights, travel constants, check-in TTL, retention periods, readiness weights (0.6/0.4) are all labelled HYPOTHESIS in their specs; the 10-template event catalogue labels every staffing ratio HYPOTHESIS (`EVENT_CATALOG.md:37-40`); persona content is labelled HYPOTHESIS (`07_PERSONAS.md:5-9`).

---

## 5. File-ownership check

| Check | Result |
|---|---|
| Tracked files outside `docs/` and the two root files | None (`git ls-files`: `FILE_OWNERSHIP.md`, `README.md`, `docs/**`). No code, SQL, package or workflow files. |
| `docs/research/**` written only by Agent 01 path | PASS: 9 files (01–08 + REPORT), commit 88595f4. |
| `docs/domain/core/**` + `GLOSSARY.md` | PASS: 8 files, commits 4178d57, 3e96bb9, 516f564. |
| `docs/domain/workforce/**` | PASS: 9 files, commits 4178d57, d05602f. |
| `docs/domain/facility/**` | PASS: 6 files, commits 78b4293, 3e96bb9. |
| `docs/domain/events/**` | PASS: 6 files, commit 88595f4. |
| Stray paths under `docs/domain/` | None. |
| `docs/master/**`, `FILE_OWNERSHIP.md` modified by anyone but Opus | Cannot be distinguished by author (all commits by one git identity); the diff since `10febdc` touches master only in the Opus commits `21797bd`, `516f564`, `d4fe4ce`, `d60483f`, and the content matches the Agent proposals. No evidence of agent edits. |
| `docs/ux/**` | Out of scope. Note for Opus: `docs/ux/NAVIGATION.md` was committed inside Opus commit `516f564`, and further `docs/ux` changes are uncommitted (`M NAVIGATION.md`, `?? FLOWS.md`, `?? HOME_MODULE_REGISTRY.md`). |
| Lock table accuracy | `FILE_OWNERSHIP.md:12-21` matches reality; the "released (complete)" wording is accurate for 1a. |
| `RISK_REGISTER.md:35` claim "no ownership violations seen" | Confirmed by this audit. |

---

## 6. Readiness claims check

| Item | Claim | Evidence | Verdict |
|---|---|---|---|
| `FEATURE_MATRIX.md` F-01..F-46 | PLANNED (F-19 BLOCKED) | `GAP_ANALYSIS.md:55`, F-19 evidence `3D_STRATEGY.md` §8 | PASS; Evidence column still "—" for features that now have specs (F-28) |
| Research 01–07 headers, `research/REPORT.md:88` | RESEARCHED | sources unopened | **Over-claim vs R-18** (F-06) |
| `WAT_ARUN_REGISTRY_DRAFT.md:3`, `EVENT_CATALOG.md:3` | RESEARCHED | search excerpts only | **Over-claim** (F-06) |
| Domain specs (core, workforce, facility, events) | DESIGNED | spec text + case tables; counts verified: AV 48, INV 27 (+SE 6), Q 40, SC 24 (incl. SC-13b), EV 28, WF 22 + 10, VT 18, FM 20, AS 10, IV 8, SR 10, DOMAIN_EVENTS 69 rows | Acceptable as DESIGNED (document-level); not cross-reconciled until this audit; several now conflict with master (F-16, F-12, F-13) |
| `FUNERAL_OPERATIONS_SPEC.md:3` | DESIGNED (paper), blocked on legal review | consistent | PASS |
| Master docs | "v0.2", "DRAFT v0.1" | document versions, not readiness | PASS |
| Anything IMPLEMENTED/TESTED/VERIFIED/PILOT_READY | none found | grep over all in-scope docs | PASS |

---

## 7. Disposition of "Proposed changes to master docs"

Legend: **A** applied (exact or equivalent) · **D** deferred with an owner and visible in a master doc · **X** silently dropped (no application, no rejection reason) · **R** rejected with a reason (none found).

### 7.1 `docs/research/REPORT.md` (8 items)

| # | Proposal | Status | Evidence |
|---|---|---|---|
| 1 | Activity-score label "แต้มกิจวัตร" | A | `TEMPLE_DOMAIN_MODEL.md:22` (but see F-01) |
| 2 | Boon-points label test | A | `TEMPLE_DOMAIN_MODEL.md:23` |
| 3 | Split `waiyawatchakon` / `facility_manager` | A | matrix `:49-50`; YAML |
| 4 | GAP_ANALYSIS Q-04, Q-07, Q-08, Q-11 | **X** | `GAP_ANALYSIS.md` still rev 1 (F-09) |
| 5 | 3D_STRATEGY §5 permission + FAD + drone + CC BY-SA | A | `3D_STRATEGY.md:159-163` |
| 6 | F-31 no ranking, no comparison, no streak loss | **X** | `FEATURE_MATRIX.md:42` unchanged; conflicts with SCORING (F-03) |
| 7 | F-24 drivers are lay; monk never driver | **X** (partly in prose) | `FEATURE_MATRIX.md:35` unchanged; prose only at `TEMPLE_DOMAIN_MODEL.md:201` (F-37) |
| 8 | RISK_REGISTER R-17, R-18 | A | `RISK_REGISTER.md:23-24` |

### 7.2 `docs/domain/core/REPORT.md` (9 items + gap list)

| # | Proposal | Status | Evidence |
|---|---|---|---|
| 1 | `quest_type` enum with `event_root` | A | `TEMPLE_DOMAIN_MODEL.md:139-140` |
| 2 | §5.2 assignment-level table, transient VERIFIED, added commands | A | `:158-161` |
| 3 | TEACHING row; schedule kinds (7) | A (superset) | `:80, 205-206`; enum conflict F-12 |
| 4 | Two-partition counters | A | `:118-129` |
| 5 | DOUBLE_BOOKED; supersession | A | `:107-110` |
| 6 | Invitation transitions | A | `:190-191` |
| 7 | Monastic attestation, two-person rule | A | `:60-63` (F-04 on its effects) |
| 8 | Matrix: `schedule.manage` row, `visiting_monastic`, gaps G-1..G-SC2 | A | matrix `:36, 138`; YAML header `:9-18`. G-3 (break-glass) D to Agent 13 (`:64`, `TEMPLE_DOMAIN_MODEL.md:68`) |
| 9 | §8 balances per (temple, person); system-written monastic rows | A | `:238-239` |
| Stop-condition S-1, S-2, S-4, S-5, S-6, S-7, O-3 | decided | A | `TEMPLE_DOMAIN_MODEL.md` as above |
| Stop-condition **S-3** (mandatory vs default end time) | **X** | `:81` vs `:105` (F-11) |

### 7.3 `docs/domain/workforce/REPORT.md` (9 items)

| # | Proposal | Status | Evidence |
|---|---|---|---|
| 1 | Catalog rows (presence, shift, headcount, security, inventory.record, quest.request, document, booking) | A | matrix `:95, 101-106` |
| 2 | Columns `staff_general`, `traffic_staff`; `schedule.manage` row; `quest.view` A for accountant and temple_admin; guard `asset.view` A; note 3 extension | A | YAML `:44, 69-70, 126` etc.; note 3 folded into legend `:113-115` |
| 3 | Minor-flag note | A | matrix `:177-178`; YAML `:36-37` (F-20) |
| 4 | `quest_type` list with `security` | A | `TEMPLE_DOMAIN_MODEL.md:139-141` |
| 5 | Schedule kinds incl. meal, leave, meeting | A | `:205-206` (F-12) |
| 6 | §11 Q5 headcount answer | A | `:266-267`, `:224-225` |
| 7 | FEATURE_MATRIX evidence F-27, F-25, F-42 | **X** | `FEATURE_MATRIX.md:34, 38, 49` Evidence "—" (F-28) |
| 8 | UX IA north-star rows | **X** | `UX_INFORMATION_ARCHITECTURE.md:219-232` (F-29) |
| 9 | RISK_REGISTER matrix-gap risk | A | R-21 `RISK_REGISTER.md:27` (validator claim F-22) |
| Decisions OQ-01 (sixth state), OQ-02 (M-02), OQ-03, OQ-04, M-13, M-14, M-18 | decided | A | `TEMPLE_DOMAIN_MODEL.md:221-223, 141`; matrix `:51, 49, 61, 148`; spec not updated (F-16) |

### 7.4 `docs/domain/facility/REPORT.md` (5 items)

| # | Proposal | Status | Evidence |
|---|---|---|---|
| 1 | Vehicle note: trip creation system action; secretary view only | A | matrix `:180-181` |
| 2 | Building code regex; S2 threshold | A | `TEMPLE_DOMAIN_MODEL.md:211-218` |
| 3 | Invitation cancel/hold to trip | A | `:200-201` |
| 4 | 3D_STRATEGY §6 satellite prang codes, height Unknown | A | `3D_STRATEGY.md:174-178` |
| 5 | Driver sees passenger names only for own trips | A | matrix `:181` |

### 7.5 `docs/domain/events/REPORT.md` (8 items)

| # | Proposal | Status | Evidence |
|---|---|---|---|
| 1 | Catalog rows `event.approve`, `event.volunteer_approve`, `ceremony.confirm_monks`, funeral codes | A | matrix `:96-100`; YAML `:58-67` (F-18 for rite-list code) |
| 2 | `event.manage` D for kitchen lead, facility_manager, per-event lead | A partial | YAML `event.manage` (department_lead, facility_manager D); per-event lead not decided (F-41) |
| 3 | §5.3 readiness function | A | `TEMPLE_DOMAIN_MODEL.md:173-177` |
| 4 | §1 terms (staffing target, gate, funeral rite) | **X** | `TEMPLE_DOMAIN_MODEL.md:8-26` (F-30) |
| 5 | DATABASE_PLAN tables | **X** | `DATABASE_PLAN.md` v0.1 (F-08) |
| 6 | FEATURE_MATRIX F-26 and F-17 notes | **X** | `FEATURE_MATRIX.md:37, 28` (F-28) |
| 7 | SECURITY_MODEL funeral class + AI exclusion | **X** | `SECURITY_MODEL.md` v0.1 (F-07) |
| 8 | RISK_REGISTER new risks | A | R-19 `RISK_REGISTER.md:25`; secondary-source risk folded into R-18 |

Totals: 39 numbered proposals (research 8, core 9, workforce 9, facility 5, events 8). Applied 30 (events #2 only partially; core #8 carries G-3 break-glass to Agent 13), **silently dropped 9** (research 4, 6, 7; workforce 7, 8; events 4, 5, 6, 7), rejected with a reason 0. One unnumbered stop-condition decision (core S-3) was also dropped, so the dropped total is 10.

---

## 8. Role grants: YAML vs matrix §4 (method and result)

- Expansion rule used: group keys (`@all`, `@lay`, `@staff`, `@monastic`) apply first; an explicit role key overrides; value `-` removes the grant; unlisted roles have no grant.
- Result: 0 differences in 1,540 cells; 55 permission rows in both; restricted lock icons agree with the YAML `restricted` list in all 55 rows; catalog §3 code list equals YAML grant keys; the 28 matrix columns equal the YAML `modes` role list.
- Permission codes in `docs/domain/**` not in YAML: only `presence.checkin` (`AVAILABILITY_SPEC.md:158`, `core/REPORT.md:119`) and `conflict.view` (`AVAILABILITY_SPEC.md:161`), both mentioned as non-existent (F-31). Event names (`quest.completed`, `invitation.confirmed` …) match the `x.y` pattern but are domain events, not permissions.
- Remaining sync gaps are prose-level: F-19, F-20, F-34, F-35.
