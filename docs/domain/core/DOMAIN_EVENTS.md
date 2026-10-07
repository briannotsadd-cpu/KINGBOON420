# DOMAIN EVENTS CATALOGUE

Owner: Agent 02. Status: **DESIGNED**. Events emitted by the core specs (tenancy, availability, schedule/invitation,
quest, scoring) plus the interface to events owned by Agents 17/18/19. No code, no SQL.

## 1. Envelope and delivery rules

Every event has:

| Field | Meaning |
|---|---|
| `event_id` | Unique id; consumers deduplicate on it. |
| `name` | `context.past_tense_fact`, lower dot-case (for example `quest.completed`). |
| `version` | Integer; additive changes keep the version, breaking changes bump it. |
| `occurred_at` | Instant (UTC). |
| `temple_id` | **Always present** except no events (there are no `person.*` monastic events; membership events carry `membership_id` and go to that temple only). |
| `actor` | `{type: person \| system \| platform_admin, id}`. AI never appears as an actor on state-changing events; AI output is an `ai_draft.*` event. |
| `correlation_id`, `causation_id` | Trace of the originating command and the event that triggered this one. |
| `payload` | Event-specific; see tables. |

Rules:
- E-1 Events are written to an outbox in the **same transaction** as the state change; no event without the change, no
  change without the event.
- E-2 Delivery is **at-least-once**; ordering is guaranteed per aggregate id (for example one quest assignment), not
  globally. Consumers must be idempotent on `event_id` (the ledger additionally uses idempotency keys, SCORING §5).
- E-3 Payloads carry **ids and enums, not personal data** (no names, phones, host details, reason text, evidence
  content, deceased or family data). Consumers fetch details through permission-checked reads.
- E-4 A consumer in one temple never receives another temple's events (`temple_id` filter is mandatory).
- E-5 Events are immutable facts; corrections are new events (for example `quest.completion_revoked`).
- E-6 Replays (for rebuilding read models) must be possible from the outbox history.

Consumer legend: **N** notification service · **A** audit log (every event with an `actor` and a state change also
writes the audit row defined in the owning spec) · **CC** Command Center read model · **S** scoring · **SCH** schedule
service · **AV** availability read model · **EXT** other agents (named).

## 2. Tenancy and identity

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| `membership.invited` | `invite_member` | membership_id, person_id?, kind, roles[] | N (invitee), A |
| `membership.join_requested` | `request_to_join` | membership_id, person_id | N (member.manage holders), A |
| `membership.activated` | accept / approve / reinstate | membership_id, person_id, kind, roles[] | N, A, CC (people counts), AV, EXT 17 |
| `membership.suspended` | `suspend_member` | membership_id, reason_code | N, A, CC, AV, SCH (flag future entries), S (stop earning) |
| `membership.ended` | `end_membership` / expiry | membership_id, reason_code ∈ {LEFT, REMOVED, EXPIRED, REJECTED} | N, A, CC, AV, SCH (cancel future entries), quest engine (release assignments) |
| `membership.role_changed` | `assign_role` / `remove_role` | membership_id, added[], removed[] | A, N (affected person), CC |
| `membership.role_ineligible` | monastic status change | membership_id, role_id | N (member.manage holders), A |
| `membership.monastic_attestation_requested` | `request_attestation` (optionally presenting a prior attestation, by the person's choice) | attestation_id, membership_id, presented (bool) | N (member.manage holders of that temple), A |
| `membership.monastic_attested` | verify | attestation_id, membership_id, kind, presented_from? (flag only) | A |
| `membership.monastic_attestation_revoked` | revoke | attestation_id, membership_id | A, N (this temple's member.manage holders) |
| `membership.monastic_kind_set` | attestation verify / revoke, in one temple | membership_id, from_kind, to_kind | A, S (ledger guards), AV, CC, quest engine (ledger compatibility flags), EXT 12 (that temple's profile); **delivered to this temple only, never to other temples of the person** |
| `session.temple_switched` | `switch_temple` | person_id, from_temple_id, to_temple_id | A (security stream) |
| `platform.break_glass_opened` / `_closed` | platform admin | ticket_ref, expires_at | A, N (abbot, audit.view holders), security stream |

## 3. Availability

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| `availability.status_set` | `set_status` | row_id, person_id, state, valid_from, valid_until, set_by_kind, location_hint?, reason_code? | A, AV, CC, N (secretary when ADMIN-set or UNAVAILABLE) |
| `availability.status_cleared` | `clear_status` | row_id, person_id, truncated_at | A, AV, CC |
| `availability.status_superseded` | supersession rule (reading B) | row_id, by_row_id | A, AV |
| `availability.checked_in` | `check_in` | checkin_id, person_id, method | AV, CC |
| `availability.checked_out` | `check_out` | checkin_id, person_id | AV, CC |
| `availability.conflict_detected` | conflict detector after any entry/status change | person_id, type, severity, refs[], overlap_from, overlap_to | N (secretary, abbot), CC (conflict tile) |
| `availability.conflict_cleared` | detector | person_id, refs[] | CC |
| `availability.snapshot_computed` (optional, not persisted) | Command Center refresh | computed_at, counters, data_quality | CC only |

Availability is computed on read from rows; `status_set` etc. are inputs to cache invalidation, not copies of the
result. Expiry of a manual status or check-in TTL emits **no** event (a pure function of time); consumers use
`reason.next_change_at` to refresh.

## 4. Schedule

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| `schedule.entry_created` | any entry source | entry_id, person_id, kind, status, starts_at, ends_at, source_type, source_id, leg? | AV, CC, N (person), EXT 18 (trips) |
| `schedule.entry_updated` | owning source | entry_id, changed_fields[] | AV, CC, N |
| `schedule.entry_cancelled` | owning source | entry_id, reason_code | AV, CC, N |
| `schedule.entries_flagged` | membership ended / expired | person_id, count, reason_code | N (secretary) |

## 5. Invitation and Smart Monk Assignment

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| `invitation.received` | `receive_invitation` | invitation_id, received_via | N (invitation.manage holders), A, CC (inbox count) |
| `invitation.review_started` | `start_review` | invitation_id | A |
| `invitation.assignment_suggested` | `run_assignment` | proposal_id, invitation_id, algorithm, version | A (inputs digest stored) |
| `invitation.team_proposed` | `propose_team` | invitation_id, version, team[person_id, role], source ∈ {SMART, MANUAL}, partial | N (invitation.confirm holders), A, CC |
| `invitation.team_revised` | `revise_team` | invitation_id, version | A |
| `invitation.confirmed` | `confirm_invitation` | invitation_id, version, team[], confirmed_by, acknowledged_warnings[] | N (monks, driver, secretary), A, CC, SCH (entries created in same transaction), EXT 18 (`trip.requested`) |
| `invitation.team_changed` | `replace_monk` | invitation_id, removed_person_id, added_person_id | N, A, SCH, EXT 18 |
| `invitation.rescheduled` | `reschedule_invitation` | invitation_id, old_starts_at, new_starts_at | N, A, SCH, EXT 18 |
| `invitation.release_requested` | `request_release` | invitation_id, person_id | N (secretary), A, CC |
| `invitation.acknowledged` | `acknowledge` | invitation_id, person_id | A |
| `invitation.started` | system | invitation_id | A, CC |
| `invitation.completed` | `complete_invitation` / auto | invitation_id, attendance[], auto | A, CC, EXT 19 (temple memory) |
| `invitation.declined` | `decline` | invitation_id, reason_code | N (office), A, CC |
| `invitation.cancelled` | `cancel_invitation` | invitation_id, reason_code | N (monks, driver), A, CC, SCH, EXT 18 (`trip.cancel_requested`) |

Interface events owed to Agent 18: `trip.requested {invitation_id, window, seats, pickup/venue refs}` and
`trip.cancel_requested {invitation_id}`; Agent 18 answers with `trip.vehicle_held` / `trip.vehicle_unavailable`
(consumed by the confirm guard through the synchronous `find_vehicle` interface, SCHEDULE §5.3 HC-7).
Invitation events never carry host name or phone.

## 6. Quest

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| `quest.drafted` | `create_draft` | quest_id, quest_type, source | A |
| `quest.published` | `publish` | quest_id, quest_type, department_id?, claimable, visibility | N (eligible claimers if public), A, CC |
| `quest.assigned` | `assign` / `claim` / `reassign` | quest_id, assignment_id, person_id, assigned_by, via ∈ {ASSIGN, CLAIM, REASSIGN} | N (assignee), A, CC, EXT (17/18/19 extensions) |
| `quest.unassigned` | `unassign` / `release_claim` / `withdraw` | quest_id, assignment_id, reason_code | N (manager), A, CC |
| `quest.started` | `start` | quest_id, assignment_id | A, CC |
| `quest.blocked` | `block` | quest_id, assignment_id, reason_code | N (manager), A, CC |
| `quest.unblocked` | `unblock` | quest_id, assignment_id | A, CC |
| `quest.submitted` | `submit` | quest_id, assignment_id, verification_method, evidence_count | N (verifier pool), A, CC |
| `quest.verified` | `verify_ok` | quest_id, assignment_id, verifier_id | A |
| `quest.verification_rejected` | `verify_reject` | quest_id, assignment_id, verifier_id, reason_code, rejection_count | N (assignee), A |
| `quest.completed` | `verify_ok` / system | quest_id, assignment_id, person_id, quest_type, points{amount, ledger}, verification_basis, completed_at, submitted_at | **S** (credits ledger, idempotent), N, A, CC, EXT 19 (readiness), EXT (extensions) |
| `quest.completion_revoked` | `revoke_completion` | quest_id, assignment_id, reason_code | **S** (reversal), A, N |
| `quest.cancelled` | `cancel` / `expire` / `cancel_subtree` | quest_id, reason_code, actor_type | N (assignees), A, CC, EXT 19 |
| `quest.overdue_detected` | scheduled scan (derived, emitted once per quest per status entry) | quest_id, due_at, overdue_owner | N (assignee or verifier, manager), CC |
| `quest.dependency_changed` | `edit` | quest_id, added[], removed[] | A |
| `quest.checklist_changed` | `edit` after start | quest_id, checklist_version | A, N (assignee) |
| `quest.recurring_generated` | generator | template_id, local_date, quest_id | A (summary), CC |
| `quest.recurring_skipped` | generator | template_id, local_date, person_id, reason_code ∈ {EXCUSED} | A |

`quest.completed` is the **only** trigger of score ledger writes for quests. `quest.overdue_detected` is a notification
helper only: OVERDUE itself is derived and never stored.

## 7. Scoring

| Event | Producer | Payload | Consumers |
|---|---|---|---|
| `scoring.activity_awarded` | ledger writer | entry_id, person_id, amount, reason_code, capped | monastic person's own notification only (N, self), A |
| `scoring.activity_reversed` | reversal | entry_id, reverses_entry_id | A |
| `scoring.points_earned` | ledger writer | txn_id, person_id, amount, txn_type | N (self), A, EXT 12 (profile) |
| `scoring.points_reversed` | reversal | txn_id, reverses_txn_id | A, N (reward.manage if negative balance) |
| `scoring.award_capped` | cap rule | person_id, ledger, requested, awarded | A |
| `scoring.award_held` | anti-cheat HOLD | hold_id, person_id, assignment_id, signal | N (reviewers), A |
| `scoring.award_rejected` | guard | assignment_id, reason_code | A |
| `scoring.signal_raised` | anti-cheat hooks | signal, person_id, ref | A, N (reviewers, community only) |
| `scoring.achievement_granted` | achievement evaluator | person_id, code | N (self), A |
| `scoring.redemption_requested` | `redeem` | redemption_id, reward_id, cost | N (reward.manage), A |
| `scoring.redemption_fulfilled` / `_cancelled` | reward.manage | redemption_id | N (self), A |

Ordering note: no event of the monastic ledger reaches any consumer other than the monk's own notification and the
audit log (no Command Center tile, no report), enforcing SCORING F-2 and F-3. No event ever carries both ledgers.

## 8. Expected producer requirements (events this domain needs from Agents 17, 18, 19)

The dot.case convention of this catalogue (`context.past_tense_fact`) is the convention for all agents. The events
below are **requirements on future producers**, not agreed contracts: the producing agents will be assigned in
Wave 2/3, and names may be adjusted then if payload semantics are kept. Until then the specs that depend on them use
the synchronous interfaces named in the last column.

| Expected event | Expected producer | Needed by | Requirement |
|---|---|---|---|
| `ceremony.staffed`, `ceremony.cancelled` | Agent 19 (ceremony assignment, `source_type = ceremony_assignment`; funerals `funeral_rite_session`) | schedule, availability | Entries are written through the `schedule.manage` / `ceremony.confirm_monks` path; payload: assignment_id, person_ids, window, venue_kind |
| `event.created`, `event.cancelled`, `event.readiness_changed` | Agent 19 | quest engine (`event_root`), Command Center | Payload ids only; cancellation triggers `cancel_subtree` |
| `attendance.recorded` | Agent 19 / 17 | quest verification `attendance`, `novice_learning` practice days | person_id, source ref, present flag |
| `trip.vehicle_held`, `trip.vehicle_unavailable` | Agent 18 | invitation confirm guard (HC-7) | Also available synchronously as `find_vehicle(window, seats)` |
| `maintenance.request_created` | Agent 18 | quest engine (`maintenance` quest + extension) | request_id, severity, location refs |
| `shift.assigned`, `shift.changed` (kind `duty`, `source_type = shift`), `leave.recorded` (kind `leave`), `meal_service.scheduled` (kind `meal`) | Agent 17 | schedule, staff presence | Staff-only kinds; not read by the monastic resolver |
| `ai_draft.accepted` | Agent 10 | quest/invitation commands (`source = ai_draft`) | A human accepts; AI never an actor |
| `unresolved_monk_conflicts` (function, not event) | Agent 02 (this domain) | Agent 19 gate G-CONFLICT | AVAILABILITY_SPEC §6 |

## 9. Consumer matrix

| Consumer | Events it must handle (summary) |
|---|---|
| Notification | assignment, submission, verification, overdue, conflict, invitation lifecycle, membership, achievements, redemptions; recipients derived from permissions at send time; never includes sensitive reasons |
| Audit | every state-changing event above; see the audit row shape in QUEST §13 |
| Command Center | membership, availability, schedule, invitation (inbox, awaiting decision), quest counts (open, overdue, unassigned), conflicts; **never** scoring |
| Scoring | `quest.completed`, `quest.completion_revoked`, `membership.monastic_kind_set`, `availability.*` (excused-day computation reads availability history), `membership.*` |
| Schedule / Availability read models | `schedule.*`, `availability.*`, `membership.*` |

## 10. Count

Catalogue size: **69** rows (a few rows name two events) across 7 contexts (§2 to §7).
