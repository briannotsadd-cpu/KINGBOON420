# REPORT — Agent 02 (Temple Domain), Wave 1a

Date: 2026-10-07. Pack revision W1-r2. Documentation only; no code, SQL, git operations or edits outside
`docs/domain/GLOSSARY.md` and `docs/domain/core/**`.

## 1. Summary

Eight files turn the core of `TEMPLE_DOMAIN_MODEL.md` into test-ready specs: tenancy and identity, the availability
resolver with Command Center counters, the calendar and invitation lifecycle with a deterministic Smart Monk
Assignment (`sma-v1`), the quest engine, the two scoring ledgers, a 69-row domain event catalogue and a glossary.
Case tables use exact inputs and outputs and are numbered for direct translation into unit tests.
The work surfaced **seven master-doc inconsistencies or gaps** (section 6) and **eleven permission-matrix gaps**
(section 7). Nothing is implemented; every artifact is DESIGNED at most.

## 2. Files written

| File | Content | Cases |
|---|---|---|
| `docs/domain/GLOSSARY.md` | Thai / English / code glossary; workforce, facility, event terms marked owned by Agents 17/18/19 | n/a |
| `docs/domain/core/TENANCY_IDENTITY_SPEC.md` | person vs membership, monastic attestation flow, Brian example, visiting monk, temple switch, states, 12 invariants | 12 invariants + 12 scenarios (TI-01..12, TI-S01..S12) |
| `docs/domain/core/AVAILABILITY_SPEC.md` | resolver contract, priority, location, conflicts, expiry, TTL, who may set what, visibility tiers, counters and sum invariants | **AV 48** (min 30) |
| `docs/domain/core/SCHEDULE_INVITATION_SPEC.md` | `schedule_entries`, invitation lifecycle and guards, SMA inputs / hard constraints / scoring / output / human confirm | **INV 27** (min 15) + SE 6 |
| `docs/domain/core/QUEST_LIFECYCLE_SPEC.md` | types, transition table, derived states, checklist, evidence, verification, dependencies, recurring, boss interface, extension pattern, audit | **Q 40** (min 25) |
| `docs/domain/core/SCORING_SPEC.md` | ledgers, earning, idempotency, reversal, streak, achievements, forbidden uses, anti-cheat | **SC 24** (min 15) |
| `docs/domain/core/DOMAIN_EVENTS.md` | envelope, delivery rules, catalogue with producer / payload / consumers | n/a |
| `docs/domain/core/REPORT.md` | this file | n/a |

## 3. Evidence

### 3.1 Sources

No external source was consulted (no web access used). Every real-world claim is labelled **HYPOTHESIS** in the
specs: ordination certificate (ใบสุทธิ) as proof of monastic status; พรรษา as years of rains retreat; 120-day visiting
span; all numeric defaults (check-in TTL 12 h is from master; travel 30 km/h, +10 min, buffer 30 min, caps, SMA weights,
thresholds are mine). Agent 01 should validate them (section 8).

### 3.2 Cross-reference: spec section to master section

| Spec section | Master section |
|---|---|
| TENANCY §2-3, §7-9 | TEMPLE_DOMAIN_MODEL §3; ROLE_PERMISSION_MATRIX §1-2 |
| TENANCY §5 | TEMPLE_DOMAIN_MODEL §3 ("verified by a temple admin") |
| TENANCY §12 | ROLE_PERMISSION_MATRIX §6 verification list |
| AVAILABILITY §2-7 | TEMPLE_DOMAIN_MODEL §4.1-4.2; RISK_REGISTER R-13 |
| AVAILABILITY §8-9 | ROLE_PERMISSION_MATRIX §3-4 and notes 3-4 |
| AVAILABILITY §10 | TEMPLE_DOMAIN_MODEL §4.3 |
| SCHEDULE §2 | TEMPLE_DOMAIN_MODEL §6.2 |
| SCHEDULE §3, §5 | TEMPLE_DOMAIN_MODEL §6.1; FEATURE_MATRIX F-13, F-14 |
| QUEST §2, §5 | TEMPLE_DOMAIN_MODEL §5.1-5.2; F-07, F-08 |
| QUEST §11 | TEMPLE_DOMAIN_MODEL §5.3 |
| SCORING §2-9 | TEMPLE_DOMAIN_MODEL §8; F-30..F-33 |
| DOMAIN_EVENTS | TEMPLE_DOMAIN_MODEL §2 (Notification, Audit, Command Center) |

### 3.3 Self-review checklist

| Check | Result |
|---|---|
| 8 files exist, only inside owned paths | Pass |
| Case minimums: AV 48/30, INV 27/15, Q 40/25, SC 24/15 | Pass (counted by script on `^| AV-nn |` rows) |
| Cases have exact inputs and outputs (times with offset, ids, numbers) | Pass; SMA example scores computed by hand and re-checked (95.00, 80.00, 72.50, 71.25) |
| Every command lists permission code and scope or flags a gap | Pass (TENANCY §11, AVAILABILITY §8, SCHEDULE §4, QUEST §6, SCORING §11) |
| Master §11 questions answered or carried with an owner | Pass (section 5) |
| Two ledgers never merged; monastic score not redeemable, ranked, or used in SMA | Pass (SCORING §9, SCHEDULE §5.1) |
| AI drafts only; humans approve | Pass (SMA is rule-based; `HUMAN_CONFIRM_REQUIRED`) |
| Unknown shown as Unknown, never invented | Pass (UNKNOWN status, `TRAVEL_ESTIMATE_REQUIRED`, `UNKNOWN_VASSA`) |
| Every tenant row has `temple_id`; cross-temple leakage rules | Pass (TENANCY TI-02..04, cases AV-30, AV-43, INV-23, Q-26, Q-30, SC-21) |
| Readiness vocabulary only | Pass |
| No SQL or code | Pass (pseudo-notation only) |
| Real-world claims sourced or marked HYPOTHESIS | Pass |
| Not independently verified: spec self-consistency was not machine-checked beyond counts; case arithmetic for streaks and SMA scores was checked by hand | Disclosed |

## 4. Stop conditions: contradictions found, both readings and recommendation

| # | Contradiction | Reading A | Reading B (adopted in specs) | Recommendation |
|---|---|---|---|---|
| S-1 | Master §4.2 pure priority vs usability: a monk sets REST until 15:00, then AVAILABLE at 14:00; priority keeps REST (rank 7 over 8). | Strict priority; the monk must clear REST first. | New SELF manual rows truncate overlapping SELF rows; ADMIN rows are never truncated. | B. Cases AV-34, AV-35 flip to REST if A is chosen. |
| S-2 | Master §4.3 "อยู่ในวัด" counts by `location_state`, which overlaps the status counters; no tile exists for `effective_status = IN_TEMPLE`; the stated sum invariant cannot hold. | Make "อยู่ในวัด" a status. | Two independent partitions (status sums to total; location sums to total). | B, invariants CC-1..CC-6. |
| S-3 | Master §4.1 says manual states have **mandatory** end time; §4.2 says **default** `valid_until` is end of local day. | Mandatory, no default. | Stored row always has an end; the command fills the default. | B. |
| S-4 | Master §5.2 stores status per quest but credits points per `quest_assignment_id` (implies several assignees). | One status per quest, one assignee. | Transition table on the assignment; quest status mirrors or aggregates (`capacity`). | B (identical when capacity 1). |
| S-5 | Master §5.2 lists `VERIFIED → COMPLETED` as two steps. | `VERIFIED` is a resting status. | Transient audit event within one transaction. | B. |
| S-6 | Master §5.3 uses quest type `event_root`, absent from the §5.1 enum. | Not a type. | Add `event_root` (created only by Agent 19). | B. |
| S-7 | Master §3 "monastic status verified by a temple admin" vs the cross-temple blast radius of `monastic_kind`. | Single temple admin suffices, status global once verified. | Attestation by a temple; two-person rule for temple_admin; effective only while the person has an ACTIVE membership at an attesting temple. | B pending Agent 01 evidence (open question O-2). |

## 5. Master §11 open questions

| # | Position | Owner |
|---|---|---|
| 1 Samanera schedule: external curriculum or temple-defined? | Carried. Spec treats the class timetable as temple-defined `class` entries and `novice_learning` quests; an external curriculum would be an import source only. | Agent 01 |
| 2 Who confirms invitations? | Answered as configuration: abbot, deputy, assistant always; secretary by delegation for routine rites (matrix note 2); lay office proposes only. Practice to validate. | Agent 01 validates |
| 3 Check-in acceptable? | Answered by design: optional per temple and per monk; the resolver works with check-in disabled (AV-47). | Agent 01 validates |
| 4 Vehicle ownership | Carried: interface `find_vehicle(window, seats)` only. | Agent 18 |
| 5 Kitchen headcount | Carried; counters expose `location.in_temple` to the kitchen department_lead via `headcount.view`. | Agent 17 |
| 6 Undertaker visibility and deceased privacy | Carried; extension pattern (QUEST §12) composes visibility by AND so Agent 19 can mask. | Agent 19, Agent 13 |

## 6. Open questions raised by this work

| ID | Question | Owner |
|---|---|---|
| O-1 | Duplicate person accounts: merge policy | Agent 13 / Opus |
| O-2 | Is monastic attestation global once verified, or tied to an ACTIVE membership of an attesting temple | Agent 01, Opus |
| O-3 | Boon points per temple (assumed) or per person | Opus, Agent 12 |
| O-4 | PDPA erasure vs append-only ledger and audit | Agent 13 |
| OQ-A3 | Cross-temple busy signal for a monk active in two temples (invisible today) | Opus, Agent 13 |
| OQ-A4 | Operational visibility tier for office_staff and ceremony_lead | Opus |
| OQ-SC1 | May the abbot see an individual activity score (spec: no) | Opus, Agent 01 |
| OQ-SC2 | Negative balance after reversal vs forbidding reversal after spending | Opus |
| OQ-SC4 | Numeric defaults: caps, milestone amounts, thresholds | Agent 01 pilot |
| OQ-Q2 | Do lay staff earn community points for staff quests (default none) | Opus, Agent 17 |
| OQ-S1..S4 | SMA constants, samanera on rites, time-of-day policy, host data retention | Agent 01, Agent 13 |

## 7. Permission-matrix gaps

Closed by `role_permissions.yaml` v0.3 (fix round): G-1 (baseline self capabilities), G-2 (two-person rule), G-3 (break-glass is
platform-level), G-4 (`visiting_monastic` exists), G-A1 (check-in = `availability.set_self`), G-A2/G-S2 (`schedule.manage`),
G-A3 (office_staff and ceremony_lead are scope C), G-S1 (`invitation.view` A), G-Q1..Q4, G-SC1 (`community.participate`),
G-SC2 (`points.award_community`). No open permission gap remains in the core specs.

## 8. Proposed changes to master docs (exact text; Opus applies)

1. `docs/master/TEMPLE_DOMAIN_MODEL.md` §5.1 — replace the `quest_type` enum sentence with:
   "`quest_type ∈ {monastic_daily, novice_learning, cleaning, kitchen, garden, maintenance, volunteer, event_task, ceremony_task, vehicle_task, office, general, event_root}`; `event_root` is created only by the event API."
2. §5.2 — append under the table: "The table applies to the quest assignment; quest status mirrors it when `capacity = 1` and aggregates otherwise. `VERIFIED` is a transient audit event, not a resting status. Added commands: `unassign`, `reassign`, `withdraw`, `expire` (system), `revoke_completion` (triggers the compensating ledger row)."
3. §4.1 — add to the `TEACHING` row: "(also `class` and `duty` entries)". §6.2 — replace the kind list with `{invitation, ceremony, teaching, class, duty, personal, travel}`.
4. §4.3 — replace the counters table and invariant with the two-partition definition in `AVAILABILITY_SPEC.md` §10 (status partition sums to total; location partition sums to total; `status.IN_TEMPLE` tile added).
5. §4.2 — add after the conflict bullet: "`DOUBLE_BOOKED` is also a conflict type. A new manual status of the same actor class supersedes overlapping ones; admin-set UNAVAILABLE is never superseded by self-set rows."
6. §6.1 — add transitions `TEAM_PROPOSED → REVIEWING (revise_team)`, `IN_PROGRESS → CANCELLED`, and the CONFIRMED self-loops `replace_monk`, `reschedule`.
7. §3 — replace the monastic-status bullet with: "Monastic status is attested by a temple (two-person rule if the attester is a temple admin without the abbot or deputy role); `person.monastic_kind` is derived from attestations of temples where the person holds an ACTIVE membership."
8. `docs/master/ROLE_PERMISSION_MATRIX.md` §4 — add a `schedule.manage` row (see G-A2) and the gaps in section 7 above; §2 add role `visiting_monastic`.
9. `docs/master/TEMPLE_DOMAIN_MODEL.md` §8 — add: "Balances are per `(temple_id, person_id)`; points are not transferable between persons or temples. Monastic ledger rows are written only by the system."

## 9. Blockers

None for Wave 1b. Items that need an Opus decision before Wave 3: S-1, S-4, S-7 and O-3. Items that need real-world
validation by Agent 01 before the numeric defaults harden: SMA weights and travel constants, check-in acceptance,
who confirms invitations, attestation evidence.

## 10. Self-assessed readiness

| Artifact | Readiness | Why not higher |
|---|---|---|
| GLOSSARY | DESIGNED | Other agents' terms are basic; owners may refine |
| TENANCY_IDENTITY_SPEC | DESIGNED | Attestation flow rests on HYPOTHESIS pending Agent 01 |
| AVAILABILITY_SPEC | DESIGNED | Reading A vs B (S-1) and visibility tiers need Opus decision |
| SCHEDULE_INVITATION_SPEC | DESIGNED | Constants and confirm authority unvalidated |
| QUEST_LIFECYCLE_SPEC | DESIGNED | Two-level assignment reading (S-4) pending |
| SCORING_SPEC | DESIGNED | Caps, thresholds and score visibility unvalidated |
| DOMAIN_EVENTS | DESIGNED | Awaits Agents 17/18/19 event names for sections 8 interfaces |

## 11. Fix round (Opus decisions F-01, F-03, F-04, S-3 and others)

Applied in the specs: monastic label "แต้มกิจวัตร"; monastic practice days without loss mechanics, lay streak with grace
(SCORING §7); monastic status per membership, optional presentation of a prior attestation (TENANCY §5); every manual
status has `valid_until`, admin UNAVAILABLE explicit (AVAILABILITY §7-8); SMA `needs_confirmation` list, single travel
rule with Unknown handling (SCHEDULE §5); ten schedule kinds and source types; v0.3 permission codes and scopes;
`unresolved_monk_conflicts` (AVAILABILITY §6, cases AV-49, AV-50). Case counts now AV 50, INV 27, Q 40, SC 25.
Section 8 item 7 above (global attestation wording) is superseded by F-04.
