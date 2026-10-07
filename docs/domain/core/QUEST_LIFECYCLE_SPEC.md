# QUEST LIFECYCLE SPEC

Owner: Agent 02. Status: **DESIGNED**. Refines `docs/master/TEMPLE_DOMAIN_MODEL.md` §5 and features F-07, F-08.
The quest engine is the shared work primitive; Agents 17, 18, 19 attach domain detail through the extension pattern
in §12. Agent 19 owns event semantics; §11 is a contract only. **[EXT]** = extends a master doc; **HYPOTHESIS** =
default without real-world evidence. No SQL, no code.

## 1. Scope

Quest types, fields, assignment, the transition table (commands, actors, guards), derived states, checklist,
evidence and verification, dependencies, recurring quests, the boss-quest interface, audit events, test cases.
Scoring consequences live in SCORING_SPEC; this spec only states when `quest.completed` is emitted.

## 2. Quest

### 2.1 Fields

| Field | Type | Rule |
|---|---|---|
| `id`, `temple_id` | id | Tenant key; every related row shares it. |
| `quest_type` | enum | §2.2. |
| `title` | text 1-120, `description` text | Thai or English. |
| `department_id`, `required_role_id` | optional refs | `required_role_id`: assignee must hold the role in this temple. |
| `location` | `{building_id? , zone_id? , text?}` + optional `geo` | |
| `starts_at`, `due_at` | instants, optional | `due_at >= starts_at` when both exist. |
| `priority` | `LOW \| NORMAL \| HIGH \| URGENT` | |
| `points` | `{amount int >= 0, ledger ∈ {NONE, MONASTIC_ACTIVITY, COMMUNITY_BOON}}` | `amount > 0` iff `ledger <> NONE`. |
| `checklist[]`, `evidence_policy`, `verification_policy` | §7, §8 | |
| `status` | enum | `DRAFT, OPEN, ASSIGNED, IN_PROGRESS, BLOCKED, SUBMITTED, COMPLETED, CANCELLED` |
| `parent_quest_id`, `depends_on[]` | refs | §9, §11. |
| `capacity` [EXT] | int >= 1 (default 1) | Number of assignees required (volunteer shifts). |
| `claimable` | bool | Self-claim allowed (§4). |
| `visibility` | `INTERNAL \| PUBLIC` | `PUBLIC` = public volunteer quest (matrix note 1). |
| `weight` [EXT] | number >= 0, default 1 | For Agent 19 readiness. |
| `gate_key` [EXT] | text, optional | Marks a quest as input to an Agent 19 hard gate. |
| `created_by`, `source` | id, `manual \| template \| ai_draft \| recurring` | `ai_draft` means a human accepted a draft; creator is that human. |
| `recurrence_template_id`, `local_date` | optional | §10. |
| `version` | int | Optimistic concurrency. |

### 2.2 Quest types (published interface for Agents 17/18/19)

Master lists twelve types; `event_root` appears in master §5.3 but not in the §5.1 enum (inconsistency; this spec
adds it [EXT]).

| `quest_type` | Thai | Detail owner | Typical ledger | Typical verification | Extension kind |
|---|---|---|---|---|---|
| `monastic_daily` | ภารกิจประจำวันพระ | Agent 02 | MONASTIC_ACTIVITY | `none` | — |
| `novice_learning` | ภารกิจเรียนรู้สามเณร | Agent 02 (F-11) | MONASTIC_ACTIVITY | `attendance` | `learning_progress` |
| `cleaning` | ทำความสะอาด | Agent 17 | NONE | `photo_evidence`, `staff_verification` | `zone_cleaning` |
| `kitchen` | ครัว | Agent 17 | NONE | `staff_verification` | `kitchen_task` |
| `garden` | สวน | Agent 17 | NONE | `photo_evidence` | `garden_task` |
| `maintenance` | ซ่อมบำรุง | Agent 18 | NONE | `staff_verification` | `maintenance_request` |
| `volunteer` | อาสา | Agent 19 / Agent 12 | COMMUNITY_BOON | `organizer_approval`, `qr_checkin`, `attendance` | `volunteer_shift` |
| `event_task` | งานในกิจกรรม | Agent 19 | per event | per event | `event_task` |
| `ceremony_task` | งานพิธี | Agent 19 | NONE | per ceremony | `ceremony_task` |
| `vehicle_task` | งานยานพาหนะ | Agent 18 | NONE | `staff_verification` | `trip_task` |
| `office` | งานสำนักงาน | Agent 17 | NONE | `none`, `staff_verification` | — |
| `general` | ทั่วไป | any | NONE | any | — |
| `event_root` [EXT] | ภารกิจใหญ่ (ราก) | Agent 19 | NONE | none | `event` |

Staff quests default to ledger NONE: whether lay employees earn community points is an open question (OQ-Q2).

## 3. Assignment

`quest_assignment(id, quest_id, person_id, status, assigned_by, assigned_at, started_at, submitted_at,
completed_at, blocked_from, block_reason, rejection_count, completion_revoked_at?, verification_basis?)`.

- Assignment status: `ASSIGNED, IN_PROGRESS, BLOCKED, SUBMITTED, COMPLETED, CANCELLED`.
- "Active" = `ASSIGNED, IN_PROGRESS, BLOCKED, SUBMITTED`. One active assignment per `(quest, person)`.
- **The transition table (§5) applies to the assignment.** The quest's `status` is derived/mirrored:

| Quest `capacity` | Quest `status` rule |
|---|---|
| 1 | Mirrors its single active-or-completed assignment; `OPEN` when none. |
| > 1 [EXT] | `OPEN` while `active + completed < capacity`; `ASSIGNED` when filled and all `ASSIGNED`; `IN_PROGRESS` when filled, not every assignment is still `ASSIGNED`, and not every assignment is complete; `COMPLETED` when every non-cancelled assignment is `COMPLETED` and the quest is filled or `claims_closed`; `BLOCKED` and `SUBMITTED` stay at assignment level. |

`DRAFT` and `CANCELLED` are quest-level commands. Master §5.2 speaks only of quest status; the two-level reading is
adopted because master §5.2 also credits points per `quest_assignment_id`. Reading A (one status per quest, one
assignee) would forbid multi-volunteer quests; reading B (this spec) generalises it and is identical when
`capacity = 1`.

## 4. Claim

A quest is claimable when `claimable = true`, status `OPEN` (or capacity not yet filled), the person is an ACTIVE
member with `quest.view` and `quest.complete`, holds `required_role_id` if set, and the ledger is compatible with the
person (§6, G-LEDGER). Per-person open-claim limit 5 (HYPOTHESIS, `CLAIM_LIMIT`).

## 5. Lifecycle

### 5.1 Transition table

Actors: "assignee" = holder of the active assignment (`quest.complete`, scope S). Permission scopes follow
`docs/master/ROLE_PERMISSION_MATRIX.md` (T temple, D department, S self).

| # | From | Command | To | Actor and permission (scope) | Guards (errors) |
|---|---|---|---|---|---|
| T1 | DRAFT | `publish` | OPEN | `quest.create` (S/D/T) | G-PUB |
| T2 | OPEN | `assign` | ASSIGNED | `quest.assign` (D/T) | G-ASSIGN, G-LEDGER |
| T3 | OPEN | `claim` | ASSIGNED | self: `quest.view` + `quest.complete` (S) | §4 |
| T4 | ASSIGNED | `unassign` / `release_claim` | OPEN if no active assignment remains | `quest.assign` (D/T) or the assignee | [EXT] absent from master |
| T4b | ASSIGNED, IN_PROGRESS, BLOCKED | `reassign` | ASSIGNED (new assignee) | `quest.assign` (D/T) | [EXT] atomic cancel + assign; checklist progress is kept, evidence stays attached to the quest |
| T5 | ASSIGNED | `start` | IN_PROGRESS | assignee | G-DEP |
| T6 | ASSIGNED, IN_PROGRESS | `block(reason)` | BLOCKED | assignee, or `quest.manage` (D/T) | reason code in `WAITING_MATERIAL, WAITING_PERSON, SAFETY, OTHER` + text; stores `blocked_from` |
| T7 | BLOCKED | `unblock` | `blocked_from` | assignee or `quest.manage` | |
| T8 | IN_PROGRESS | `submit(evidence)` | SUBMITTED | assignee | G-DEP, G-CHECK, G-EVID, auto-method check (§8) |
| T9 | SUBMITTED | `verify_ok` | VERIFIED then COMPLETED | `quest.verify` (D/T) | verifier is not the assignee; method is human type; `VERIFIED` is a transient audit event, not a resting state [EXT reading] |
| T10 | SUBMITTED | `verify_reject(reason)` | IN_PROGRESS | `quest.verify` (D/T) | reason mandatory; `rejection_count += 1`; at 3 raises `NEEDS_MANAGER` flag, no state change |
| T11 | SUBMITTED | system completion | COMPLETED | system | method `none`, or an auto method satisfied (§8) |
| T12 | any non-terminal | `cancel(reason)` | CANCELLED (quest and all active assignments) | `quest.manage` (D/T); creator may `discard_draft` own DRAFT with `quest.create` (S) | reason mandatory; terminal states reject |
| T13 | ASSIGNED, IN_PROGRESS, BLOCKED | `withdraw(reason)` | assignment CANCELLED, quest OPEN if none active | assignee | [EXT]; not after SUBMITTED |
| T14 | OPEN, ASSIGNED, IN_PROGRESS, BLOCKED | `expire` | CANCELLED, reason `EXPIRED` | system | [EXT]; only when `auto_cancel_after_hours` is set (§10) |
| T15 | COMPLETED | `revoke_completion(reason)` | stays COMPLETED, `completion_revoked_at` set | `quest.manage` (D/T) | [EXT]; the master requires a compensating ledger row on reversal but names no trigger. Emits `quest.completion_revoked`; idempotent |

Any other (from, command) pair -> `ILLEGAL_TRANSITION`. COMPLETED and CANCELLED are terminal.

### 5.2 Guards

- **G-PUB** `title` non-empty; `quest_type` valid and not `event_root` (`USE_EVENT_API`); `due_at >= starts_at`;
  `points.amount > 0` iff ledger set; **ledger `COMMUNITY_BOON` requires `verification_policy <> none`**
  (`VERIFICATION_REQUIRED_FOR_COMMUNITY_POINTS`); a creator may not set `points.amount > 0` on a quest they will
  themselves be assigned (`SELF_CREATED_NO_POINTS`); acyclic dependencies; checklist size <= 50; parent rules (§11).
- **G-ASSIGN** assignee has an ACTIVE membership in the temple, holds `required_role_id`, capacity not full, no
  active assignment for the same person, assigner's `quest.assign` scope covers the quest's department.
- **G-LEDGER** `MONASTIC_ACTIVITY` quests may be assigned only to persons with `monastic_kind <> none`;
  `COMMUNITY_BOON` only to `monastic_kind = none` (`LEDGER_ASSIGNEE_MISMATCH`). Mirrors the database constraints in
  master §8.
- **G-DEP** all `depends_on` quests are `COMPLETED` (`DEPENDENCY_UNMET[ids]`, `DEPENDENCY_CANCELLED`).
- **G-CHECK** every `required` checklist item is checked (`CHECKLIST_INCOMPLETE[item ids]`).
- **G-EVID** evidence satisfies `evidence_policy` (`EVIDENCE_REQUIRED[...]`).
- Every command takes `command_id` (idempotency) and `expected_version`; a repeat of the same `command_id` returns
  the first result; a different command on a stale version -> `VERSION_CONFLICT`.
- Extension guards (§12) are ANDed and can only deny.

### 5.3 Derived states (never stored)

- `OVERDUE(q, now)` = `due_at` present and `due_at < now` (strict) and status not in `COMPLETED, CANCELLED` and
  status not `DRAFT` [EXT clarification]. Applies to the quest and to each assignment. At `now == due_at` it is not
  overdue.
- For `SUBMITTED`, `overdue_owner = VERIFIER` (the delay is the verifier's); otherwise `ASSIGNEE`. UI should say
  "รอตรวจรับ" rather than blame the assignee [EXT presentation rule].
- `UNASSIGNED(q)` = status `OPEN` and zero active assignments. With capacity > 1 and some filled: not UNASSIGNED;
  `unfilled = capacity - active - completed`, label PARTIALLY_FILLED.
- `blocked_by_dependency(q)` = any dependency not COMPLETED; `DEPENDENCY_CANCELLED` if any is CANCELLED.

## 6. Commands and security

Every command also requires an ACTIVE membership in the quest's temple and a `quest.view`-visible quest
(cross-temple -> `NOT_FOUND`). Permissions from the matrix; **flag** = not covered.

| Command | Permission (scope) | Flag |
|---|---|---|
| `create_draft`, `publish`, `discard_draft` | `quest.create` (S/D/T) | none |
| `assign`, `reassign`, `unassign`, `close_claims` | `quest.assign` (D/T) | none |
| `claim`, `release_claim`, `withdraw`, `start`, `submit`, `block` (own), `unblock` (own), `check_item` | `quest.complete` (S) | `claim` needs `quest.view` too; self-claim has no own code (G-Q1) |
| `verify_ok`, `verify_reject` | `quest.verify` (D/T) | none |
| `cancel`, `block`/`unblock` (any), `edit` (any), `revoke_completion`, `cancel_subtree` | `quest.manage` (D/T); `cancel_subtree` additionally `event.manage` | `revoke_completion` has no explicit code (G-Q2) |
| `manage_recurrence_template` | `quest.create` + `quest.manage` (same scope) | no code of its own (G-Q3) |
| `expire`, recurring generation | system actor | system actors are not in the matrix (G-Q4) |
| `view_quest` | `quest.view` (S/A/D/T, T¹ for public) | none |

Samanera have `quest.create` none and `quest.assign` none (matrix): a samanera cannot create or assign quests, only
start and submit his own (`quest.complete`).

## 7. Checklist

`item {id, text, required, order, checked, checked_by, checked_at}`.
- Edited by `quest.create` owner or `quest.manage` while status is DRAFT/OPEN/ASSIGNED; later additions only by
  `quest.manage` (`checklist_version` +1, `CHECKLIST_CHANGED_AFTER_START` event).
- `check_item` / uncheck: assignee only, while ASSIGNED/IN_PROGRESS/BLOCKED; locked at SUBMITTED. Items are
  per assignment in multi-assignee quests.
- Progress = checked / total; `required` items gate `submit` (G-CHECK). Maximum 50 items; templates copy items.

## 8. Evidence and verification

### 8.1 Evidence policy

`evidence_policy = [ {type ∈ {photo, note, file}, min, max} ]`, for example one to five photos ("ก่อน/หลัง" for
housekeeping), a note of at least 10 characters. Evidence rows: `{id, assignment_id, type, storage_ref,
uploaded_at, uploader, sha256, size}`; immutable after `submit`; `uploaded_at` is server time (device/EXIF time is
untrusted). The same `sha256` already used on another quest in the temple within 30 days raises anti-cheat signal
`DUPLICATE_EVIDENCE_HASH` (SCORING §10), without blocking. Photos are never public; retention is an open question
(OQ-Q3).

### 8.2 Verification policy

`verification_policy = {method, fallback_to_staff: bool, params}`.

| Method | Who or what verifies | Rule |
|---|---|---|
| `none` | system at submit | Allowed for self-reported work; **forbidden with ledger COMMUNITY_BOON**. |
| `organizer_approval` | human: quest creator, the parent quest's owner, or any `quest.verify` holder in scope | Never the assignee. |
| `staff_verification` | human with `quest.verify` (D/T) covering the department | Never the assignee. |
| `qr_checkin` | system | A signed QR bound to the quest `location` (building/zone/asset) of the **same temple** scanned by the assignee within `[starts_at - 30 min, due_at + 30 min]` (default grace 30 min, HYPOTHESIS). `verification_basis = QR_SCAN`. |
| `photo_evidence` | human, with at least `min` photos required | Evidence plus a `quest.verify` holder; never the assignee. |
| `location` | system | Server compares reported coordinates at submit with `location.geo` within radius 100 m (HYPOTHESIS). Only the boolean and a distance bucket are stored, never a track (privacy; Agent 13 to review). |
| `attendance` | system | An attendance record for the related class/event marks the assignee present (source: Agent 19/17). |

Auto methods that fail -> `AUTO_VERIFICATION_FAILED{method}` and the quest stays IN_PROGRESS; if
`fallback_to_staff = true` the submission instead stays SUBMITTED for a human verifier.
**A verifier can never verify their own submission**, even when they hold `quest.verify` at temple scope (for
example the abbot): another holder verifies, or the creator chooses `none` for that quest. There is no override.

## 9. Dependencies

- `depends_on` lists quest ids of the same temple, maximum 20. Cycles are rejected `DEPENDENCY_CYCLE`; a quest may not
  depend on its own ancestor or descendant (`DEP_ON_ANCESTOR`).
- Dependencies do not block assign or claim; they block `start` and `submit` (G-DEP).
- A CANCELLED dependency never counts as satisfied: dependents are flagged `DEPENDENCY_CANCELLED` until a manager
  edits `depends_on` (audited).
- Changing dependencies after IN_PROGRESS requires `quest.manage`.

## 10. Recurring quests

`recurrence_template`: `{id, temple_id, quest fields..., assignee_rule ∈ {PERSON, ROLE_ROTATION, OPEN}, frequency
(DAILY | WEEKLY(days) | MONTHLY(day-of-month)), local_start_time, duration_min, active_from, active_until,
generate_ahead_days (default 7), auto_cancel_after_hours (null; default 36 for monastic_daily, HYPOTHESIS),
skip_if_unavailable (default true for monastic_daily and novice_learning)}`.

- Time zone is Asia/Bangkok; no DST. `starts_at = local date + local_start_time`; `due_at = starts_at + duration`
  (may cross midnight; `local_date` is the date of `starts_at`).
- MONTHLY day 29-31 falls back to the last day of shorter months.
- Generation is idempotent on `(template_id, local_date, person_id)`: repeated runs create nothing new. Missing past
  dates are not backfilled; the window is `[local today, local today + generate_ahead_days - 1]`.
- `source = recurring`. Editing a template affects only future un-generated dates (optional `propagate` by a
  manager to unstarted OPEN/ASSIGNED future instances); started instances are never changed.
- `skip_if_unavailable`: when the person's effective status is `UNAVAILABLE` for the **entire** local day at
  generation time, no instance is created; `quest.recurring_skipped{EXCUSED}` is emitted. Later UNAVAILABLE settings
  do not delete existing instances; streak excusal handles them (SCORING §7).
- `expire` (T14) cancels an instance `auto_cancel_after_hours` after `due_at`.

## 11. Boss quest interface (contract only; Agent 19 owns semantics)

Published by the engine:
- `event_root` quest type, created only by Agent 19's `create_event` (requires `event.manage`); generic `publish` of
  that type -> `USE_EVENT_API`.
- Fields `parent_quest_id`, `weight`, `gate_key`; read API `children(parent_id)`, `descendants(root_id)`.
- Guarantees: **BQ-1** child and parent share `temple_id`; **BQ-2** depth <= 3 (root, group, task) else
  `DEPTH_EXCEEDED`; **BQ-3** no cycles; **BQ-4** no new child under a COMPLETED/CANCELLED parent
  (`CHILD_UNDER_TERMINAL_PARENT`); **BQ-5** `event_root` has no assignments, ledger NONE, verification `none`;
  **BQ-6** completing or cancelling a parent never cascades by itself; **BQ-7** `cancel_subtree(root, reason)` is an
  explicit command that cancels every non-terminal descendant and its assignments in one transaction, never touching
  COMPLETED ones and creating no ledger rows; requires `quest.manage` and `event.manage`; **BQ-8**
  `clone_quest_tree(source_root, {include_people: false, include_evidence: false})` creates DRAFT copies of structure,
  checklists, weights and staffing targets (`capacity`) only: never assignments, evidence, points or status.
- Agent 19 computes readiness from `weight`, `status`, `gate_key` and consumes `quest.*` events (DOMAIN_EVENTS §6).

## 12. Extension pattern (for Agents 17, 18, 19)

- An extension is a 1:1 record keyed by `quest_id`, carrying `extension_kind` and domain fields, with the same
  `temple_id`, created in the same transaction as the quest.
- Extensions never hold status; status changes only through engine commands.
- An extension may register guards `(quest, command, actor) -> allow | deny(code)`; guards are ANDed with engine
  guards and can only **narrow**. An extension may require an additional permission for a command (for example
  `maintenance.manage` to verify a maintenance quest), never remove one.
- Row visibility composes by AND: the engine's `quest.view` filter and the extension's filter (for example the
  undertaker's "assigned funeral rites only"; deceased and family data masked outside the assignment).
- Extensions subscribe to `quest.*` events; they do not poll.
- Registry: `extension_kind` values are declared in this spec's §2.2; a new kind needs a note to Agent 02.

## 13. Audit events

Every successful transition writes one `audit_log` row: `{temple_id, actor_type, actor_id, entity ∈ {quest,
assignment}, entity_id, command, from, to, reason, command_id, occurred_at}`. Rejected commands write no audit row
but permission denials are written to the security event stream (Agent 13). Required audit commands: `publish,
assign, claim, unassign, reassign, start, block, unblock, submit, verify_ok, verify_reject, system_complete,
cancel, withdraw, expire, revoke_completion, cancel_subtree, edit, dependency_changed, checklist_changed`.

## 14. Cases (`Q`)

Fixture: temple T1; `now = 2026-10-07 09:00` (+07:00). Actors: `kl` kitchen_lead (kitchen dept; quest.create/assign/
verify/manage D), `ks1`, `ks2` kitchen_staff, `hk1` housekeeper (cleaning dept), `cl1` ceremony_lead, `abbot1`,
`deputy1`, `vol1`, `vol2`, `vol3`, `vol4` volunteers, `M1` bhikkhu, `N1` samanera, `office1`. Unless stated,
quests have `capacity = 1` and `verification_policy = staff_verification`.

| ID | Given | When | Then |
|---|---|---|---|
| Q-01 | Q1 DRAFT, type `kitchen`, dept kitchen, title "เตรียมผักสำหรับเพล", due 10:30 | `kl.publish(Q1)` | OPEN; audit `publish`; event `quest.published` |
| Q-02 | Q2 DRAFT with title "" | `kl.publish` | `INVALID[title]`; still DRAFT |
| Q-03 | Q1 DRAFT | `ks1.publish(Q1)` (kitchen_staff has no `quest.create`) | `FORBIDDEN`; no audit row |
| Q-04 | Q1 OPEN | `kl.assign(Q1, ks1)` | assignment A1 ASSIGNED; Q1 ASSIGNED; `UNASSIGNED(Q1)` false |
| Q-05 | Q2 OPEN, dept cleaning | `kl.assign(Q2, hk1)` | `FORBIDDEN_SCOPE` (scope D kitchen) |
| Q-06 | Q3 OPEN claimable volunteer quest; Q3b not claimable | `vol1.claim(Q3)`; `vol1.claim(Q3b)` | ASSIGNED; `NOT_CLAIMABLE` |
| Q-07 | Q4 ledger COMMUNITY_BOON 10, verification `organizer_approval` | `abbot1.assign(Q4, M1)`; then `assign(Q4, vol1)` | `LEDGER_ASSIGNEE_MISMATCH`; ASSIGNED |
| Q-08 | Q5 ledger COMMUNITY_BOON 10, verification `none` | `publish` | `VERIFICATION_REQUIRED_FOR_COMMUNITY_POINTS` |
| Q-09 | A1 ASSIGNED | `hk1.start`; `ks1.start` | `FORBIDDEN`; IN_PROGRESS, `started_at` set |
| Q-10 | Q6 `depends_on [Q1]`, ASSIGNED to ks2; Q1 not COMPLETED | `ks2.start(Q6)`; later Q1 COMPLETED and `ks2.start(Q6)` | `DEPENDENCY_UNMET[Q1]`; IN_PROGRESS |
| Q-11 | A1 IN_PROGRESS | `ks1.block` without reason; `block(WAITING_MATERIAL)`; `unblock`; then block on an OPEN quest | `INVALID[reason]`; BLOCKED with `blocked_from = IN_PROGRESS`; back to IN_PROGRESS; `ILLEGAL_TRANSITION` |
| Q-12 | Q1 `evidence_policy photo min 1`, A1 IN_PROGRESS | `ks1.submit` with no photo; then with 1 photo | `EVIDENCE_REQUIRED[photo:1]`; SUBMITTED, `submitted_at` set |
| Q-13 | Q1 checklist: 3 required items, 2 checked | `ks1.submit` | `CHECKLIST_INCOMPLETE[item3]` |
| Q-14 | Q7 `monastic_daily`, 5 points MONASTIC_ACTIVITY, verification `none`, assigned to M1 | `M1.start`; `M1.submit` | COMPLETED by system, `verification_basis = NONE`; event `quest.completed` emitted exactly once (scoring: SC-01) |
| Q-15 | A1 SUBMITTED, `staff_verification` | `kl.verify_ok` | audit `verify_ok` (verifier kl, assignee ks1); COMPLETED; `quest.completed` once |
| Q-16 | Q8 assigned to `abbot1`, `organizer_approval` (abbot1 holds `quest.verify` T), SUBMITTED | `abbot1.verify_ok`; then `deputy1.verify_ok` | `SELF_VERIFY_FORBIDDEN`; COMPLETED |
| Q-17 | A1 SUBMITTED | `kl.verify_reject` without reason; with reason "รูปไม่ชัด" | `INVALID[reason]`; IN_PROGRESS, `rejection_count = 1`, no `quest.completed` |
| Q-18 | Q9 IN_PROGRESS; Q10 COMPLETED | `ks1.cancel(Q9)`; `kl.cancel(Q9, "งานซ้ำ")`; `kl.cancel(Q10)` | `FORBIDDEN`; CANCELLED with active assignments CANCELLED; `ILLEGAL_TRANSITION` |
| Q-19 | Q11 due 10:00, assigned; Q12 SUBMITTED due 10:00; Q13 COMPLETED; Q14 DRAFT | evaluate `OVERDUE` at 10:00:00 then 10:00:01 | Q11: false then true (`overdue_owner = ASSIGNEE`); Q12 true with `overdue_owner = VERIFIER`; Q13 false; Q14 false |
| Q-20 | Q15 OPEN, no assignment; Q16 DRAFT; Q17 `capacity = 3` OPEN with 1 active | evaluate `UNASSIGNED` | Q15 true; after assign false; Q16 false; Q17 false, `unfilled = 2`, PARTIALLY_FILLED |
| Q-21 | Q18 `depends_on [Q19]` | set Q19 `depends_on [Q18]`; set a child quest to depend on its own parent | `DEPENDENCY_CYCLE`; `DEP_ON_ANCESTOR` |
| Q-22 | recurring template R1: DAILY 05:00, 120 min, PERSON M1, `monastic_daily`, 5 points MONASTIC_ACTIVITY | run generation for local date 10-08 twice | exactly one instance: `starts_at 2026-10-08T05:00+07:00`, `due_at 07:00`, `local_date 10-08`, `source = recurring`; second run creates none |
| Q-23 | R1 as above, `generate_ahead_days = 7` | generator runs at `2026-10-07T22:00:00Z` (= 10-08 05:00 local) | instances for local dates 10-08 through 10-14 (7 instances), none for 10-07 (no backfill) |
| Q-24 | R1 with `skip_if_unavailable`; M1 has UNAVAILABLE `10-09 00:00` to `10-10 00:00` | generate 10-08 to 10-14 | no instance for 10-09; event `quest.recurring_skipped{date 10-09, EXCUSED}`; 10-08 and 10-10 generated |
| Q-25 | instance I 10-08 05:00-07:00 ASSIGNED, never started; `auto_cancel_after_hours = 36` | evaluate at `10-09 18:59:59`; at `10-09 19:00:00` | ASSIGNED and OVERDUE; CANCELLED by system, reason `EXPIRED` |
| Q-26 | root E1 (`event_root`) in T1; parent `P2` belongs to T2 | create child under P2 from T1; a depth-4 child; a child under a COMPLETED parent; generic `publish` of an `event_root` | `PARENT_NOT_FOUND` (no cross-temple leak); `DEPTH_EXCEEDED`; `CHILD_UNDER_TERMINAL_PARENT`; `USE_EVENT_API` |
| Q-27 | E1 with 4 descendants: 3 non-terminal, 1 COMPLETED (points already credited) | `cancel_subtree(E1)` by actor with `quest.manage` + `event.manage`; same by actor without `event.manage` | 3 CANCELLED with assignments cancelled; COMPLETED untouched; no ledger rows; `FORBIDDEN` for the second actor |
| Q-28 | A1 IN_PROGRESS, verification `none` | `ks1.submit` twice with the same `command_id`; then a new `command_id` | one SUBMITTED/COMPLETED transition; same response; `ALREADY_SUBMITTED`; `quest.completed` once |
| Q-29 | N1 samanera with a `novice_learning` quest Q20 assigned | `N1.assign(Q20, M1)`; `N1.publish` own quest; `N1.start`, `N1.submit` Q20 | `FORBIDDEN` (no `quest.assign`); `FORBIDDEN` (no `quest.create`); both allowed (`quest.complete` S) |
| Q-30 | user U only in T2; Q1 belongs to T1 | `U.view(Q1)` with active temple T2; with active temple T1 | `NOT_FOUND`; `NOT_A_MEMBER` |
| Q-31 | Q21 volunteer shift `capacity = 3`, claimable, COMMUNITY_BOON 10, `organizer_approval` | vol1, vol2, vol3 claim; vol4 claims; vol1 and vol2 complete; vol3 completes | Q21 `OPEN` after vol1, `ASSIGNED` when full; vol4 gets `CAPACITY_FULL`; Q21 stays `IN_PROGRESS` after two completions; `COMPLETED` after the third; three separate `quest.completed` (one per assignment) |
| Q-32 | A1 ASSIGNED; later another quest assignment SUBMITTED | `ks1.withdraw(A1)`; withdraw the SUBMITTED one | A1 CANCELLED, Q1 OPEN, `UNASSIGNED` true; `ILLEGAL_TRANSITION` |
| Q-33 | A1 COMPLETED (points credited) | `ks1.revoke_completion`; `kl.revoke_completion("ตรวจผิด")`; repeat | `FORBIDDEN`; `completion_revoked_at` set, status stays COMPLETED, event `quest.completion_revoked` (scoring reversal SC-06); repeat -> `ALREADY_REVOKED`, no second event |
| Q-34 | Q22 `qr_checkin`, window 08:30-10:30 (starts 09:00 due 10:00, grace 30 min) | submit with valid QR of T1 building at 09:10; QR of T2; valid QR at 10:31 | COMPLETED, `verification_basis = QR_SCAN`; `QR_FOREIGN_TEMPLE`; `AUTO_VERIFICATION_FAILED{qr_checkin}` |
| Q-35 | Q23 `location`, geo radius 100 m | submit with coordinates 250 m away, `fallback_to_staff = false`; then with `true` | `AUTO_VERIFICATION_FAILED{location}` (stays IN_PROGRESS); SUBMITTED awaiting human; only boolean and distance bucket stored |
| Q-36 | Q24 `depends_on [Q25]`; Q25 CANCELLED | `start(Q24)` | `DEPENDENCY_CANCELLED[Q25]`; manager edits `depends_on` (audited) then start works |
| Q-37 | A1 IN_PROGRESS with 2 of 3 items checked | `kl.reassign(Q1, ks1 -> ks2)` | A1 CANCELLED; new assignment ASSIGNED for ks2; checklist ticks kept; audit `reassign` |
| Q-38 | M1 creates own quest (`quest.create` S) with 10 points MONASTIC_ACTIVITY | `publish` | `SELF_CREATED_NO_POINTS`; the same quest with 0 points publishes |
| Q-39 | Q26 `ledger MONASTIC_ACTIVITY` | assign to a lay `ks1` | `LEDGER_ASSIGNEE_MISMATCH` |
| Q-40 | Q27 attendance-verified class quest, N1 present in the attendance record | `N1.submit` | COMPLETED, `verification_basis = ATTENDANCE`; if absent -> `AUTO_VERIFICATION_FAILED{attendance}` |

Case count: **40** (minimum 25).

## 15. Traceability and open questions

| Spec | Master source |
|---|---|
| §2 | TEMPLE_DOMAIN_MODEL §5.1 |
| §5 | §5.2 transition table and notes |
| §8 | §5.2 verification methods; §5.2 "verifier cannot verify own" |
| §10 | §5.1 `source = recurring` |
| §11 | §5.3 Boss Quest |

| ID | Question | Owner |
|---|---|---|
| OQ-Q1 | Is the two-level assignment/quest status reading (§3) accepted? | Opus |
| OQ-Q2 | Do lay staff earn community points for staff quests? Default NONE. | Opus, Agent 17 |
| OQ-Q3 | Evidence retention and who may view photos. | Agent 13 |
| OQ-Q4 | Is `VERIFIED` a stored state or an audit event? Spec: event. | Opus |
