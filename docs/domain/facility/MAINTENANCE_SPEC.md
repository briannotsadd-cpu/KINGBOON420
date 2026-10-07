# MAINTENANCE SPEC — Requests, Work Orders, Preventive Maintenance

Owner: Agent 18 · Status: **DESIGNED (documentation only)** · F-21 PLANNED · Date: 2026-10-07
Builds on the shared quest engine (`TEMPLE_DOMAIN_MODEL.md` §5): a work order **is a quest** of `quest_type = maintenance`;
facility detail lives in `maintenance_requests` (extension row, `quest_id` FK). No separate task system.

## 1. Concepts

| Term | Meaning |
|---|---|
| Maintenance request (แจ้งซ่อม) | A report of a problem by any member with `maintenance.report`. Becomes a work order once accepted. |
| Work order (ใบสั่งซ่อม) | The quest created from an accepted request; assigned to a technician or vendor contact. |
| Preventive maintenance (PM) schedule | A recurring template that generates requests with `source = preventive`. |
| Repair history | Closed requests per building/zone/asset, append-only. |

AI may draft a request from voice/photo (`ai_drafts.kind = maintenance`); only a human submission creates the row.

## 2. Data (proposal for Agent 08)

`maintenance_requests(id, temple_id, quest_id null until accepted, building_id, zone_id null, asset_id null, title,
description, severity S1..S4, category, reported_by, reported_at, source ∈ {manual, qr_scan, ai_draft, preventive,
trip_issue}, status, heritage_flag, safety_flag, photos[] (evidence refs), sla_ack_due_at, sla_resolve_due_at,
accepted_at, resolved_at, closed_at, resolution_note, cost_estimate (restricted), cost_actual (restricted),
duplicate_of null)`.
Location is mandatory at **building** level (zone/asset optional). Cost fields are visible only to
`asset.manage` / `finance.view`.

## 3. Lifecycle

Request status (stored) and the linked quest status (Quest Engine) move together; the request status is the facility view.

```
REPORTED ──triage──▶ TRIAGED ──accept (creates quest)──▶ ACCEPTED ──assign──▶ ASSIGNED ──start──▶ IN_PROGRESS
   │                    │                                                          │               │
   │                    └──reject(reason)──▶ REJECTED                  block(reason)▶ ON_HOLD ◀────┤
   └──mark duplicate──▶ DUPLICATE(of)                                                              │
                                                IN_PROGRESS ──submit(+evidence)──▶ RESOLVED_PENDING_VERIFY
                         RESOLVED_PENDING_VERIFY ──verify ok──▶ CLOSED     ──reject(reason)──▶ IN_PROGRESS
                         any non-terminal ──cancel(reason)──▶ CANCELLED
```

| Transition | Who | Rule |
|---|---|---|
| submit → REPORTED | `maintenance.report` (any member except community) | needs building; severity proposed by reporter, may be unknown ("ไม่แน่ใจ") |
| REPORTED → TRIAGED | `maintenance.manage` | sets final severity, category, SLA clock |
| TRIAGED → ACCEPTED | `maintenance.manage` | creates the maintenance quest (`quest.create` implied for this path), copying location, due time from SLA |
| ACCEPTED → ASSIGNED | `maintenance.manage` / `quest.assign` | technician or external contact; assignee must hold `maintenance.manage` scope A or be a vendor record |
| ASSIGNED → IN_PROGRESS → submit | assignee | evidence (photo) required for S1/S2; optional S3/S4 |
| verify | verifier ≠ assignee; facility_manager (default) or the reporter for S4 | per quest verification policy `staff_verification` |
| CLOSED | system | writes repair-history entry, updates asset `last_serviced_at` |
| REJECTED / DUPLICATE | `maintenance.manage` | reason mandatory; reporter notified |
| cancel | `maintenance.manage` | reason mandatory |

Every transition writes `audit_logs` (actor, from, to, reason). `OVERDUE` is derived (SLA due < now and not terminal), as for quests.
A reporter always sees the status of their own report (scope S) even without `maintenance.manage`.
Points: maintenance quests may award `monastic_activity_score` only if the assignee is a monastic and a template says so;
otherwise nothing. Lay technicians get `community_boon_points` only if the temple configures it (HYPOTHESIS: usually off for paid staff).
The two ledgers are never combined.

## 4. Severity and SLA

| Severity | Thai | Definition | Default ack SLA | Default resolve SLA |
|---|---|---|---|---|
| S1 Critical | วิกฤต | Danger to people or structure (collapse risk, exposed wiring, flooding, fire hazard) or blocks an event today | 30 min | 24 h (temporary make-safe sooner) |
| S2 High | สูง | Major function lost (toilet block, water, power in a hall, vehicle unusable) | 4 h | 3 days |
| S3 Medium | กลาง | Degraded but usable (leaking tap, broken light) | 1 day | 14 days |
| S4 Low | ต่ำ | Cosmetic / minor | 3 days | 45 days |

- SLA values are **defaults, HYPOTHESIS**; configured per temple by `temple.settings` (non-restricted). No temple data supported them.
- Clock runs in Asia/Bangkok wall time. `ON_HOLD` pauses the resolve clock only when the reason is "waiting for parts/approval" and is logged.
- Severity can only be lowered by `maintenance.manage` with a reason; a reporter can raise to S1 via "ฉุกเฉิน" which immediately notifies facility_manager and abbot_assistant.
- `safety_flag = true` forces minimum severity S2.

## 5. Heritage and permission flags

`heritage_flag`: set when the building/asset is marked as a registered or historic structure in the registry. **HYPOTHESIS:** works on
listed structures may need authority approval (see `WAT_ARUN_REGISTRY_DRAFT.md` §4); legal confirmation needed. Behaviour: a
heritage request cannot move to `IN_PROGRESS` unless `approval_ref` is filled by `maintenance.manage` (free text/doc reference,
"อนุมัติแล้ว"), except S1 make-safe actions, which are recorded as such. The system does not interpret law; it records the reference.

## 6. "Building has a problem" rule

A building (or zone) is flagged **problem = true** when it has at least one request satisfying all of:
1. status ∈ {REPORTED, TRIAGED, ACCEPTED, ASSIGNED, IN_PROGRESS, ON_HOLD, RESOLVED_PENDING_VERIFY} (i.e. not CLOSED/REJECTED/DUPLICATE/CANCELLED), and
2. `severity_rank <= problem_threshold` (S1=1 … S4=4; default threshold **S2**, configurable per temple), and
3. not a duplicate.

Display: red when any S1; amber when only S2 (threshold level); otherwise no problem flag (lower severities still counted and shown in the sheet).
`REPORTED` but un-triaged requests count with the **reporter-proposed** severity; unknown severity counts as S2 until triaged (conservative).
Rollup: zone problems roll up to the building. Readiness gate for events (Agent 19): venue `problem = false` is a hard gate (master model §5.3: "venue maintenance issues = 0"). The count in the Command Center Facility panel equals the number of buildings with problem = true; a test asserts that the list equals the marker count.

## 7. Preventive maintenance

`pm_schedules(id, temple_id, asset_id | building_id, title, frequency ∈ {days(n), weeks(n), months(n), meter(km/hours)},
anchor_date, lead_days, default_severity, checklist, assignee_role, active)`.
- A daily job (idempotent: key = `schedule_id + due_date`) creates a request with `source = preventive` `lead_days` before due, status ACCEPTED.
- Next due is computed from **completion date** if `rebase_on_completion` else from the calendar anchor (default: calendar anchor, to avoid drift).
- Vehicle PM can use the odometer (meter) from the last recorded reading; if no reading exists the schedule shows Unknown, falls back to calendar if present.
- Overdue PM (not done after due date) shows as `asset_alert`; after `grace_days` it escalates one severity level once.
- Pausing a schedule needs a reason; deleting is soft (history kept).
- Temple-season rules (e.g. before Kathin) can be added as an "event-linked" schedule created by Agent 19's event template: **HYPOTHESIS** (needs temple input).

## 8. Repair history

Closed requests form the history, filterable by building, zone, asset, category, date. Fields shown: date, title, severity, who fixed, resolution note, photos.
Costs only for `asset.manage`/`finance.view`. History is append-only; corrections add a note row, not an edit. Cross-temple queries are impossible (RLS, `temple_id`).
Recurrence hint (non-AI, deterministic): same asset or zone with ≥3 closed requests in 90 days shows "เกิดซ้ำ" on the sheet. The 3/90 numbers are **HYPOTHESIS** defaults, configurable.

## 9. Permissions summary

| Action | Permission |
|---|---|
| Report | `maintenance.report` (all roles except `community_member`) |
| Triage, accept, assign, close, reject | `maintenance.manage` (T for facility_manager/abbot/deputy/assistant; A for technician = own assigned only) |
| See costs | `asset.manage` or `finance.view` |
| See buildings/history | `asset.view` |
| Define PM, thresholds | `asset.manage`; thresholds under `temple.settings` non-restricted |

## 10. Test cases

| ID | Scenario | Steps | Expected |
|---|---|---|---|
| FM-01 | Normal report to close | temple_boy reports leaking tap (S3) → triage → accept → assign → start → submit → verify | Request CLOSED, quest COMPLETED, history row, asset `last_serviced_at` updated |
| FM-02 | Unknown severity | reporter picks "ไม่แน่ใจ" | Stored severity null; counts as S2 for problem flag until triaged |
| FM-03 | S1 emergency | reporter taps ฉุกเฉิน on prang walkway | Notifications to facility_manager and abbot_assistant; ack SLA 30 min; building red |
| FM-04 | Problem threshold | Threshold S2; building has only S3 open | problem = false; S3 shown in sheet; threshold changed to S3 → problem = true |
| FM-05 | Duplicate | Two reports of same broken light | Second marked DUPLICATE(of); no extra problem count; reporter notified |
| FM-06 | Self-verification blocked | Technician submits own work and tries to verify | Rejected; needs another verifier |
| FM-07 | Reject verification | Verifier rejects with reason | Status IN_PROGRESS, assignee notified, SLA not reset |
| FM-08 | SLA breach | S2 not acked in 4 h | Derived OVERDUE, escalation notice to facility_manager; no automatic status change |
| FM-09 | On hold for parts | Technician sets ON_HOLD "waiting for parts" | Resolve clock paused; reason in audit; hold without reason rejected |
| FM-10 | Heritage guard | Request on heritage-flagged building to IN_PROGRESS without `approval_ref` | Blocked with message; S1 make-safe allowed and logged |
| FM-11 | Preventive generation | Weekly cleaning of water filter, lead 2 days | One request created per due date; rerun of job creates no duplicate |
| FM-12 | Overdue PM escalation | PM overdue past grace | `asset_alert` marker; severity raised one level once |
| FM-13 | Event gate | Venue has an open S2 request, event readiness evaluated | Hard gate fails, readiness shown "ไม่พร้อม" regardless of percentage |
| FM-14 | Tenant isolation | Technician of temple A queries building of temple B by guessed id | No rows / 404; audit if repeated |
| FM-15 | Cost visibility | Technician opens closed request with cost | Cost fields hidden; facility_manager sees them |
| FM-16 | AI draft | Voice note → `ai_drafts` maintenance | Draft only; request created when a human submits; labelled AI-generated |
| FM-17 | Reporter sees own | community member cannot report; volunteer reports then views | Volunteer sees own report status only, not others' |
| FM-18 | Cancel | Manager cancels with reason after work no longer needed | Quest CANCELLED, request CANCELLED, problem count drops |
| FM-19 | Recurrence hint | Same pump has 3 closed requests in 90 days | Sheet shows "เกิดซ้ำ"; no automatic action |
| FM-20 | Trip issue | Driver reports vehicle fault at trip end | Request created with `source = trip_issue`, vehicle asset linked, vehicle status → NEEDS_REPAIR if severity ≤ S2 (see VT-09) |

Readiness: **DESIGNED**. Not implemented or tested.
