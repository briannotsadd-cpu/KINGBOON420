# SCHEDULE, INVITATION & SMART MONK ASSIGNMENT SPEC

Owner: Agent 02. Status: **DESIGNED**. Refines `docs/master/TEMPLE_DOMAIN_MODEL.md` §6 and features F-12, F-13,
F-14. Agent 19 owns ceremony/event semantics; Agent 02 owns off-site invitations (กิจนิมนต์). Agent 18 owns
vehicles/trips; this spec defines only the interface to them. **[EXT]** = extends a master doc; **HYPOTHESIS** =
default without real-world evidence.

## 1. Scope

(1) The `schedule_entries` calendar table, (2) the invitation entity and lifecycle with guards, (3) Smart Monk
Assignment (SMA): deterministic ranking with explanations, (4) the human-confirm rule and what confirmation creates.
SMA is **rule-based, not AI**. AI may only create invitation drafts (`ai_drafts`); it never proposes teams as a
decision, never confirms, and never writes to these tables.

## 2. Schedule entries

### 2.1 Fields

| Field | Type | Rule |
|---|---|---|
| `id`, `temple_id` | id | Tenant key. |
| `person_id` | id | Must hold an ACTIVE membership in `temple_id` (monastic for availability purposes). |
| `kind` | enum `invitation \| ceremony \| teaching \| class \| duty \| personal \| travel` | `travel` is [EXT]; master lists the first six. |
| `status` | enum `PROPOSED \| CONFIRMED \| CANCELLED` | Only CONFIRMED is read by the availability resolver. |
| `starts_at`, `ends_at` | instants | Half-open `[starts_at, ends_at)`. |
| `venue_kind` | `IN_TEMPLE \| OFF_SITE \| UNKNOWN` | Derived from venue; `invitation` and `travel` are always OFF_SITE. |
| `venue_ref` | building/zone id or free text | |
| `source_type`, `source_id` | enum, id | `invitation`, `event` (Agent 19), `class_timetable`, `trip` (Agent 18), `manual`. |
| `leg` | `OUT \| BACK \| null` | For `travel` only. |
| `cancel_reason`, `cancelled_at` | text, instant | Entries are never deleted. |

### 2.2 Invariants

- SE-1 `ends_at > starts_at`; maximum length 14 days (HYPOTHESIS), longer is rejected `ENTRY_TOO_LONG`.
- SE-2 Uniqueness: `(source_type, source_id, person_id, kind, leg)` — replays are idempotent.
- SE-3 Overlaps are **allowed**; the resolver reports conflicts. Entries are never auto-moved or auto-cancelled.
- SE-4 Entries whose `source_type <> manual` are changed only through their source's commands
  (`SOURCE_OWNED`), so an invitation cannot be bypassed by editing its calendar rows.
- SE-5 When a membership ENDS or a visiting membership expires, future entries are CANCELLED with reason
  `MEMBERSHIP_ENDED` and the secretary is notified.

### 2.3 Kinds, ownership, authority

| Kind | Created by | Command authority |
|---|---|---|
| `invitation`, `travel` | `confirm_invitation` / `replace_monk` / `reschedule_invitation` (this spec) | `invitation.confirm` (T) |
| `ceremony` | Agent 19 event/ceremony staffing | `event.manage` (D/T) via Agent 19 |
| `teaching`, `class` | class timetable (samanera learning, F-11) | `schedule.manage` — **gap G-S2** (see §10) |
| `duty` | routine duties (for example morning chanting roster) | `schedule.manage` — gap G-S2 |
| `personal` | secretary records an appointment on behalf of a monk | `schedule.manage` — gap G-S2. Monks plan their own personal time as future-dated manual status (`availability.set_self`), so UI should rarely need this kind. |
| `travel` for a `trip` | Agent 18 may add legs for trips it creates | `vehicle.manage` (T) — interface only |

View: `schedule.view` (S, or T¹ for public/temple-wide items, or T).

## 3. Invitation

### 3.1 Entity

| Field | Type | Notes |
|---|---|---|
| `invitation_id`, `temple_id`, `version` | | `version` is incremented on every change (optimistic concurrency). |
| `status` | enum | §3.2. |
| `host` | `{name, phone?, relation?}` | Third-party personal data; visible to `invitation.view`; a monk with scope A sees it only for invitations he is on. Retention policy: open question OQ-S4. |
| `rite_type_id` | ref to temple-configurable list | Carries `is_routine` (drives who may confirm), `requires_lead`, `default_duration_min`. |
| `venue` | `{text, geo?, road_distance_km?}` | `geo` optional. |
| `starts_at` | instant | Rite start at the venue. |
| `expected_duration_min` | int > 0 | |
| `monks_required` | int ≥ 1 | |
| `required_skills[]`, `skills_mode` | tags, `HARD \| SOFT` | Default SOFT. |
| `transport` | `HOST_PROVIDES \| TEMPLE_VEHICLE \| OTHER` | Vehicle details belong to Agent 18. |
| `travel_out_min`, `travel_back_min` | int, optional | Manual override; else §5.2. |
| `received_via` | `phone \| line \| walk_in \| web_form \| ai_draft` | |
| `team[]` | `{person_id, role ∈ {LEAD, MEMBER}, monk_response ∈ {PENDING, ACKNOWLEDGED, RELEASE_REQUESTED}}` | |
| `confirmed_by`, `confirmed_at`, `decline_reason`, `cancel_reason` | | |

### 3.2 Lifecycle

```
RECEIVED ─start_review─▶ REVIEWING ─propose_team─▶ TEAM_PROPOSED ─confirm (human)─▶ CONFIRMED ─(system)─▶ IN_PROGRESS ─complete─▶ COMPLETED
    │                       ▲  │                        │  │                          │  ▲ replace_monk / reschedule   │
    │                       │  └──────decline───────────┤  └──revise_team─────────────┘  │ (stay CONFIRMED)               │
    └───────decline─────────┴─────────▶ DECLINED ◀──────┘                        cancel ─┴────────────▶ CANCELLED ◀──────┘
```

| From | Command | To | Permission (scope) | Guards |
|---|---|---|---|---|
| — | `receive_invitation` | RECEIVED | `invitation.manage` (T) | Creates the row from phone/line/walk-in/web/AI-draft accept. Incomplete fields allowed. |
| RECEIVED | `start_review` | REVIEWING | `invitation.manage` (T) | Required fields present: host name, rite type, `starts_at`, venue text, `monks_required`. Else `INCOMPLETE_FIELDS[...]` and stays RECEIVED. |
| RECEIVED, REVIEWING, TEAM_PROPOSED | `decline` | DECLINED | `invitation.manage` (T); **or** `invitation.confirm` (T) if setting `decline_requires_confirm = true` (default true, HYPOTHESIS) | Reason code mandatory (`DATE_CONFLICT, NOT_ENOUGH_MONKS, OUT_OF_AREA, RITE_NOT_SUITABLE, OTHER`). |
| REVIEWING | `propose_team` | TEAM_PROPOSED | `invitation.manage` (T) | Human actor. Each team member passes hard constraints HC-1..HC-7 (§5.3) now; team size = `monks_required` unless `allow_partial` (then flagged PARTIAL and unconfirmable); `role LEAD` present if rite type `requires_lead`; travel estimate known (§5.2). Records `source ∈ {SMART, MANUAL}`. |
| TEAM_PROPOSED | `revise_team` | REVIEWING | `invitation.manage` (T) | [EXT] Missing in master: a way back when the proposal is rejected. Team cleared (history kept). |
| TEAM_PROPOSED | `confirm_invitation` | CONFIRMED | `invitation.confirm` (T). `monk_secretary` only if the abbot delegated it **and** the rite type `is_routine` (matrix note 2) | §3.3. |
| CONFIRMED | system | IN_PROGRESS | system | At the earliest team `travel/OUT` start, else `starts_at`. |
| IN_PROGRESS | `complete_invitation` | COMPLETED | `invitation.manage` (T) records attendance; **or** system auto-complete at `rite_end + 12 h` (HYPOTHESIS) flagged `AUTO_COMPLETED` | Attendance list ⊆ team. |
| CONFIRMED, IN_PROGRESS | `cancel_invitation` | CANCELLED | `invitation.confirm` (T) | Reason mandatory. [EXT] master draws cancel only from CONFIRMED; IN_PROGRESS added for rites called off in progress. |
| CONFIRMED | `replace_monk` | CONFIRMED | `invitation.confirm` (T) | [EXT] New member passes HC and acknowledgements; removed member's entries CANCELLED; new member's created; `invitation.team_changed`. |
| CONFIRMED | `reschedule_invitation` | CONFIRMED | `invitation.confirm` (T) | [EXT] Atomic: all members' hard constraints hold for the new time, else rejected with violations and nothing changes. |
| REVIEWING, TEAM_PROPOSED | `edit_details` | same, or REVIEWING if time/venue/duration/monks_required changed | `invitation.manage` (T) | A material edit in TEAM_PROPOSED clears the team and returns to REVIEWING. After CONFIRMED use `reschedule_invitation`. |
| CONFIRMED, IN_PROGRESS | `acknowledge` / `request_release(reason)` | same | team member, scope A of `invitation.view` | **Gap G-S1**: matrix gives monks view only. `request_release` changes nothing automatically; it raises a flag and a notification to the secretary. |

Terminal states: COMPLETED, DECLINED, CANCELLED. Any other transition -> `ILLEGAL_TRANSITION`.
Every transition writes an audit row (actor, from, to, reason) and a domain event (DOMAIN_EVENTS §5).

### 3.3 Confirmation guards (all must hold, evaluated inside one transaction)

1. Actor is a **human** with `invitation.confirm` (T) (or delegated secretary for routine rite). Service/AI actors ->
   `HUMAN_CONFIRM_REQUIRED`.
2. The request references the proposal `version` that the human reviewed; otherwise `STALE_PROPOSAL`.
3. Team size = `monks_required`, not PARTIAL (`TEAM_INCOMPLETE`).
4. Hard constraints HC-1..HC-6 are **re-evaluated now** for every member (`CONFIRM_BLOCKED[violations]`).
   Hard constraints cannot be overridden by anyone; the human must first resolve the other commitment.
5. If `transport = TEMPLE_VEHICLE`: a vehicle and driver are held for the window with enough seats (`NO_VEHICLE`).
6. Every warning flagged `requires_ack` is listed in `acknowledged_warnings` (`ACK_REQUIRED[...]`). Currently:
   `NO_AVAILABILITY_SIGNAL` (monk is UNKNOWN: he has not opted in, and calendars may be incomplete),
   `LATE_NOTICE` (start within 60 minutes), `UNKNOWN_VASSA` when `requires_lead`.
7. `starts_at > now`.

### 3.4 Effects of confirmation (§6)

For each team member create three CONFIRMED entries, idempotent on `(invitation_id, person_id, kind, leg)`:

| Entry | Interval |
|---|---|
| `travel`, leg OUT | `[starts_at - travel_out_min, starts_at)` |
| `invitation` | `[starts_at, starts_at + expected_duration_min)` |
| `travel`, leg BACK | `[rite_end, rite_end + travel_back_min)` |

All `OFF_SITE`. The return buffer is **not** an entry (it only constrains assignment). Emit events (all-or-nothing):
`invitation.confirmed`, one `schedule.entry_created` per row, `trip.requested` (to Agent 18, when
TEMPLE_VEHICLE), notifications to monks and the driver. On `cancel`, entries are CANCELLED with the same reason and
`trip.cancel_requested` is emitted.

## 4. Commands and authority summary

| Command | Permission (scope) | Gap? |
|---|---|---|
| `receive_invitation`, `start_review`, `propose_team`, `revise_team`, `edit_details`, `complete_invitation`, `run_assignment` | `invitation.manage` (T) | none |
| `confirm_invitation`, `replace_monk`, `reschedule_invitation`, `cancel_invitation`, `decline` (default) | `invitation.confirm` (T; secretary by delegation for routine) | none |
| `acknowledge`, `request_release` | `invitation.view` (A) is view only | **G-S1** |
| `view_invitation` | `invitation.view` (T or A) | none |
| `manage_schedule_entry` (teaching, class, duty, personal) | `schedule.manage` | **G-S2** code exists, no matrix row |

## 5. Smart Monk Assignment (`sma-v1`)

### 5.1 Inputs

`invitation` (as §3.1), `now`, `temple config` (`return_buffer_min` default 30, `max_invitations_per_day` 2,
`eligible_kinds` default `{bhikkhu}`, `include_visiting` false, weights), candidate pool = ACTIVE memberships with
`monastic_kind ∈ eligible_kinds`, their `schedule_entries`, `manual_statuses`, check-ins, invitation history, skills.
It does **not** read `monastic_activity_score`, `community_boon_points` or manual-status reason codes (privacy and
SCORING_SPEC forbidden uses).

### 5.2 Derived window

- Travel minutes (each direction, unless `travel_out_min`/`travel_back_min` override):
  `ceil_to_5( road_distance_km / 30 km/h × 60 ) + 10`; `road_distance_km` is the entered value, else straight-line
  geo distance × 1.3 (HYPOTHESIS: speed, detour factor, fixed 10 min).
  No distance and no override -> error `TRAVEL_ESTIMATE_REQUIRED`. The system never invents a travel time.
- `block_start = starts_at - travel_out`; `rite_end = starts_at + duration`; `travel_back_end = rite_end + travel_back`;
  `block_end = travel_back_end + return_buffer_min`.

### 5.3 Hard constraints (exclude and say why)

| ID | Constraint | Violation code |
|---|---|---|
| HC-1 | ACTIVE membership; `monastic_kind ∈ eligible_kinds`; not `visiting` unless `include_visiting` | `NOT_ELIGIBLE` |
| HC-2 | No manual `UNAVAILABLE`, `PERSONAL` or `REST` row (self or admin) overlaps `[block_start, block_end)`; `AVAILABLE` rows are fine | `MANUAL_BLOCK` (reason code never exposed) |
| HC-3 | No CONFIRMED entry overlaps `[block_start, block_end)`; existing `invitation` and `travel` entries are extended by `return_buffer_min` on their end | `COMMITMENT_OVERLAP{entry_id}` |
| HC-4 | Monk's CONFIRMED invitations with rite start on the same local date < `max_invitations_per_day` | `DAILY_LIMIT` |
| HC-5 | Rite type is not in the monk's optional `not_available_for` list (empty by default) | `RITE_DECLINED_BY_MONK` |
| HC-6 | If `skills_mode = HARD`, monk has all `required_skills` | `MISSING_SKILL{tag}` |
| HC-7 | If `TEMPLE_VEHICLE`: team-level — a vehicle+driver with seats ≥ team size is free for `[block_start, travel_back_end]` (interface `find_vehicle(window, seats)` to Agent 18) | team blocker `NO_VEHICLE` |

A monk with **no** signal (UNKNOWN) is **not** excluded; he is eligible with warning `NO_AVAILABILITY_SIGNAL`.

### 5.4 Soft score (0-100, deterministic)

Weights are configuration (HYPOTHESIS defaults, sum 100). Scores use two decimals, half-up.

| Part | Max | Formula |
|---|---|---|
| Fairness `F` | 30 | `30 × (1 − min(n30, 6)/6)` where `n30` = invitations in the previous 30 days (status CONFIRMED, IN_PROGRESS or COMPLETED) the monk was on. n30 = 0,1,2,3,4,5,≥6 -> 30, 25, 20, 15, 10, 5, 0 |
| Skill fit `S` | 25 | `25 × matched/total` of `required_skills`; 25 for everyone if none required |
| Availability certainty `C` | 15 | 15 if an `AVAILABLE` row covers the entire `[block_start, block_end)`; else 8 if `block_start - now <= check-in TTL` and a fresh IN_TEMPLE check-in exists now; else 0 |
| Workload `W` | 15 | `15 × (1 − min(h, 8)/8)`; `h` = hours of CONFIRMED entries (any kind) on the rite's local date, other than this invitation |
| Slack `L` | 10 | `g` = smallest gap in minutes between `[block_start, block_end)` and any other CONFIRMED entry on that date (∞ if none): `g >= 60` -> 10; `30 <= g < 60` -> 5; else 0 |
| Continuity `K` | 5 | 5 if the monk was on a COMPLETED invitation from the same host (same normalised phone, else same name) in the previous 365 days; else 0 |

Ordering: total desc; then older `last_invited_at` first (never invited = oldest); then smaller `person_id`.
Fairness is a rotation aid, **not a merit judgment**; SMA never uses scores from the ledgers.

### 5.5 Team selection

1. Walk the ordered eligible list, taking monks until `monks_required` is reached.
2. If `requires_lead`: team suggests as `LEAD` the member with the highest known `ordination_date`-based vassa; if no
   member has it, `LEAD` is unset and warning `UNKNOWN_VASSA` is raised (human chooses). No seniority ranking is
   invented.
3. Fewer eligible than required -> `team_blockers: INSUFFICIENT_CANDIDATES{shortfall}`. No padding with excluded monks.
4. `HC-7` evaluated for the final team size.

### 5.6 Output `AssignmentProposal`

```
{ proposal_id, invitation_id, invitation_version, algorithm: "sma-v1", generated_at,
  window: {block_start, rite_end, travel_back_end, block_end},
  ranked: [ {rank, person_id, score, breakdown:{F,S,C,W,L,K},
             reasons:[{code, params}], warnings:[{code, requires_ack}] } ],
  team_suggestion: [person_id...], alternates: [person_id...],
  excluded: [ {person_id, violations:[{code, ref?}]} ],
  team_blockers: [ {code, detail} ] }
```
- `reasons` are codes with parameters (for example `FAIRNESS{n30:1}`, `AVAILABLE_COVERS_WINDOW`); the UI renders
  Thai/English from templates. A natural-language summary, if ever added, is an `ai_draft` labelled AI-generated.
- Input facts are stored with the proposal (`inputs_digest`) so the same inputs reproduce the same output.
- `excluded[].violations` expose the constraint code only, never private reason codes (a monk blocked for `SICK`
  appears as `MANUAL_BLOCK`).
- Running SMA is read-only: it does not change the invitation; the human decides whether to copy the suggestion in
  `propose_team`, and later confirms separately.

## 6. Cases (`INV`)

Fixture F-INV: temple T1, date of the rite `2026-10-12`. Invitation `I1`: host "คุณสมชาย" (phone 081-000-0000 as
test data), rite type `R-HOUSE` (`is_routine = true`, `requires_lead = false`), `starts_at = 10-12 09:00`,
`expected_duration_min = 120`, `monks_required = 2`, `road_distance_km = 12`, `transport = HOST_PROVIDES`,
`skills_mode = SOFT`, no required skills. Derived (rule §5.2): travel each way `ceil_to_5(12/30×60 = 24) + 10 = 34 -> 35`
minutes; `block_start = 08:25`, `rite_end = 11:00`, `travel_back_end = 11:35`, `block_end = 12:05` (buffer 30).
Actors: `office1` (`office_staff`: invitation.manage T), `sec1` (`monk_secretary`, delegation on), `abbot1`,
`M1` (`bhikkhu`, invitation.view A, no manage).

Candidate facts at proposal time `now = 10-08 10:00`:

| Monk | Facts | Expected |
|---|---|---|
| A | bhikkhu; n30 = 1; manual AVAILABLE 10-12 08:00-13:00; no entries on 10-12; served same host last year | F25 S25 C15 W15 L10 K5 = **95.00** |
| B | n30 = 0; no AVAILABLE; `duty` 13:00-15:00 on 10-12 (h = 2; gap to block_end = 55 min) | F30 S25 C0 W11.25 L5 K0 = **71.25** |
| C | n30 = 3; AVAILABLE covering window; `teaching` 14:00-18:00 (h = 4; gap 115 min) | F15 S25 C15 W7.50 L10 K0 = **72.50** |
| D | n30 = 0; no signal at all; no entries | F30 S25 C0 W15 L10 K0 = **80.00**, warning `NO_AVAILABILITY_SIGNAL` |
| E | `ceremony` 10-12 11:30-12:30 | excluded HC-3 `COMMITMENT_OVERLAP` (overlaps 11:00-12:05) |
| F | samanera | excluded HC-1 `NOT_ELIGIBLE` |
| G | manual UNAVAILABLE (RETREAT) 10-10 00:00 to 10-20 00:00 | excluded HC-2 `MANUAL_BLOCK` |
| H | visiting bhikkhu ACTIVE | excluded HC-1 `NOT_ELIGIBLE` |
| I | two CONFIRMED invitations already starting 10-12 (15:00, 17:00), not overlapping the block | excluded HC-4 `DAILY_LIMIT` |

| ID | Given | When | Then |
|---|---|---|---|
| INV-01 | none | `office1.receive_invitation(I1 data)` | I1 RECEIVED, version 1, event `invitation.received`, audit row |
| INV-02 | I1 RECEIVED without `rite_type_id` | `office1.start_review` | rejected `INCOMPLETE_FIELDS[rite_type_id]`; status RECEIVED |
| INV-03 | I1 RECEIVED complete | `office1.start_review` | REVIEWING, version 2 |
| INV-04 | I1 RECEIVED | `M1.start_review` (invitation.view A only) | `FORBIDDEN`; status unchanged |
| INV-05 | I1 REVIEWING, candidates A-I | `run_assignment` | ranked order A 95.00, D 80.00, C 72.50, B 71.25; `team_suggestion [A, D]`; `alternates [C, B]`; excluded E (HC-3), F (HC-1), G (HC-2), H (HC-1), I (HC-4); breakdowns as table; I1 status still REVIEWING |
| INV-06 | as INV-05 plus D2 with the same facts as D but `last_invited_at` older than D's | `run_assignment` | D2 (80.00) ranks before D (80.00); if both never invited, smaller `person_id` first |
| INV-07 | `monks_required = 3`, only A, D eligible | `run_assignment` | ranked has 2; `team_blockers [INSUFFICIENT_CANDIDATES{shortfall: 1}]`; no excluded monk appears in the suggestion |
| INV-08 | I1 with no `road_distance_km`, no geo, no override | `run_assignment` | error `TRAVEL_ESTIMATE_REQUIRED`; no proposal |
| INV-09 | I1 REVIEWING | `sec1.propose_team([A, E])`; then `propose_team([A, D])` | first: rejected `HC_VIOLATION[E: COMMITMENT_OVERLAP]`; second: TEAM_PROPOSED, `source = SMART` if equal to suggestion else `MANUAL`, version 3 |
| INV-10 | I1 REVIEWING, `monks_required = 2` | `propose_team([A])` without `allow_partial` | rejected `TEAM_SIZE_MISMATCH`; with `allow_partial` -> TEAM_PROPOSED flagged PARTIAL |
| INV-11 | I1 TEAM_PROPOSED team [A, D], rite routine, delegation on | `sec1.confirm_invitation(version 3, acknowledged_warnings [NO_AVAILABILITY_SIGNAL:D])` | CONFIRMED; 6 entries all CONFIRMED, OFF_SITE: for A and for D `travel OUT 10-12 08:25-09:00`, `invitation 09:00-11:00`, `travel BACK 11:00-11:35`; events `invitation.confirmed`, 6 `schedule.entry_created`; AV resolve(A) at 10-12 09:30 = ON_INVITATION |
| INV-12 | I1 TEAM_PROPOSED; rite type `is_routine = false` | `sec1.confirm_invitation`; then `abbot1.confirm_invitation` | `FORBIDDEN_NOT_DELEGATED`; CONFIRMED |
| INV-13 | I1 TEAM_PROPOSED | `office1.confirm_invitation`; then service actor `sma-bot` confirms | `FORBIDDEN` (manage without confirm); `HUMAN_CONFIRM_REQUIRED` |
| INV-14 | I1 TEAM_PROPOSED [A, D]; between propose and confirm D sets self UNAVAILABLE 10-12 00:00-24:00 | `sec1.confirm_invitation` | `CONFIRM_BLOCKED[D: MANUAL_BLOCK]`; status TEAM_PROPOSED; no entries created |
| INV-15 | I1 TEAM_PROPOSED [A, D] | `confirm` without acknowledgements; then with `[NO_AVAILABILITY_SIGNAL:D]` | `ACK_REQUIRED[NO_AVAILABILITY_SIGNAL:D]`; CONFIRMED |
| INV-16 | INV-11 completed | same request replayed (same request id) | same response; entry count remains 6; `invitation.confirmed` emitted once |
| INV-17 | I1 TEAM_PROPOSED at version 3; `revise_team` then new proposal -> version 5 | `confirm(version 3)` | `STALE_PROPOSAL` |
| INV-18 | I1 REVIEWING; `decline_requires_confirm = true` | `office1.decline(DATE_CONFLICT)`; `abbot1.decline(DATE_CONFLICT)`; then `abbot1.decline` on a CONFIRMED invitation | `FORBIDDEN`; DECLINED; `ILLEGAL_TRANSITION` (use cancel) |
| INV-19 | I1 RECEIVED | `abbot1.confirm_invitation` | `ILLEGAL_TRANSITION` (RECEIVED to CONFIRMED) |
| INV-20 | I1 CONFIRMED with 6 entries | `abbot1.cancel_invitation(reason HOST_CANCELLED)` | CANCELLED; 6 entries CANCELLED with reason; AV resolve(A) at 10-12 09:30 = UNKNOWN; `invitation.cancelled`; `trip.cancel_requested` only if TEMPLE_VEHICLE |
| INV-21 | I1 CONFIRMED [A, D]; D falls sick | `abbot1.replace_monk(out D, in C, ack [])` | C passes HC (C has teaching 14:00 > block_end) and has AVAILABLE so no ack needed; D's 3 entries CANCELLED; C's 3 CREATED; version +1; `invitation.team_changed` |
| INV-22 | `transport = TEMPLE_VEHICLE`; vehicle V1 with 4 seats and driver free 08:25-11:35 | propose and confirm; then repeat with no vehicle free | OK with `trip.requested`; `team_blockers [NO_VEHICLE]` and confirm rejected `NO_VEHICLE` |
| INV-23 | session temple T1; monk `X` belongs only to T2; invitation `I9` belongs to T2 | `propose_team([X])`; read I9 | `NOT_A_MEMBER` for X (indistinguishable from unknown id); `NOT_FOUND` for I9 |
| INV-24 | I1 CONFIRMED [A, D] | clock reaches 10-12 08:25; then `office1.complete_invitation(attendance [A, D])` | IN_PROGRESS (system) at 08:25; COMPLETED with attendance recorded; if no manual completion by 10-12 23:00 -> auto COMPLETED flagged `AUTO_COMPLETED` |
| INV-25 | I1 CONFIRMED | D calls `request_release(reason)` | D's `monk_response = RELEASE_REQUESTED`; status and entries unchanged; notification to secretary; event `invitation.release_requested` |
| INV-26 | I1 TEAM_PROPOSED | `office1.edit_details(starts_at = 10-12 14:00)` | status REVIEWING, team cleared (history kept), version +1 |
| INV-27 | I1 CONFIRMED [A, D]; new start 10-12 14:00 where A has no conflict and D has `duty` 13:30-14:30 | `abbot1.reschedule_invitation` | rejected `CONFIRM_BLOCKED[D: COMMITMENT_OVERLAP]`; nothing changed |

### 6.1 Schedule entry cases (`SE`)

| ID | Given | When | Then |
|---|---|---|---|
| SE-01 | entry E from invitation I1 | `schedule.manage` user edits E manually | `SOURCE_OWNED` |
| SE-02 | new `teaching` entry 10:00-10:00 or 11:00-10:00 | create | `INVALID_INTERVAL` |
| SE-03 | confirm replay (see INV-16) | | unique `(source, person, kind, leg)` prevents duplicates |
| SE-04 | person with ENDED membership | create entry | `NOT_A_MEMBER` |
| SE-05 | entry 10-12 08:25-09:00 overlapping an existing `teaching` entry | create | accepted; availability reports DOUBLE_BOOKED during the overlap |
| SE-06 | monk's membership ends 10-10 | system | future entries CANCELLED `MEMBERSHIP_ENDED`; secretary notified; past entries untouched |

Case counts: INV **27** (minimum 15), SE 6.

## 7. Master open questions answered or carried

| Master §11 | Position in this spec | Owner |
|---|---|---|
| Q2 Who confirms invitations? | Configurable: abbot, deputy, assistant always; secretary only by delegation for routine rites; lay office never (they propose). Real-world practice still to validate. | Agent 01 (validate) |
| Q3 Check-in acceptable? | Supported as optional per temple and per monk; the system works without it (calendar + opt-in). | Agent 01 |
| Q4 Vehicle ownership | Interface only (`find_vehicle`); ownership and liability are Agent 18's. | Agent 18 |

## 8. Traceability

| Section | Master source |
|---|---|
| §2 | TEMPLE_DOMAIN_MODEL §6.2 |
| §3 | §6.1 and matrix `invitation.*` |
| §5 | §6.1 (Smart Monk Assignment), F-14 |
| §3.4 | §6.1 (on CONFIRMED create entries) |

## 9. Open questions (owner)

| ID | Question | Owner |
|---|---|---|
| OQ-S1 | Are the SMA weights and travel-time constants (30 km/h, +10 min, buffer 30 min) acceptable to secretaries? | Agent 01, pilot |
| OQ-S2 | May samanera accompany rites (`eligible_kinds`)? Default bhikkhu only. | Agent 01 |
| OQ-S3 | Should time-of-day policies (for example no evening travel) be temple-configurable hard constraints? Not coded; no Vinaya claim is made here. | Agent 01 |
| OQ-S4 | Retention of host personal data on completed invitations (PDPA). | Agent 13 |

## 10. Gaps against the permission matrix

| ID | Gap |
|---|---|
| G-S1 | No command permission for a monk to acknowledge or request release. Recommend `invitation.view` (A) implies `acknowledge`/`request_release` on own assignments. |
| G-S2 | `schedule.manage` is in the catalog (§3) but has no row in the matrix (§4). Recommend: abbot, deputy, assistant, secretary `T`; office_staff `T`; ceremony_lead `D` (ceremony kind only); samanera class timetable via a teacher role `D`. |
