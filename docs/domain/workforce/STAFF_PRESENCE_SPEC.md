# STAFF PRESENCE SPEC — states, shifts, check-in, handover, counters

Owner: Agent 17 · Wave 1a, revised in Wave 1 fix round (six states; YAML permission codes) · Readiness: **DESIGNED** · Feature F-27 (PLANNED, P1)
Master refs: `TEMPLE_DOMAIN_MODEL.md` §4 (monk availability — this spec mirrors its shape; Opus decision: six staff states), §6.2 (`schedule_entries`);
`ROLE_PERMISSION_MATRIX.md` v0.2 and `docs/master/role_permissions.yaml` (source of truth for every permission code below); `SECURITY_MODEL.md`. Time zone: **Asia/Bangkok (UTC+7)** everywhere; no DST.

Staff presence is **separate from monk availability** (matrix §1: lay staff never enter Monastic Mode). It is
informational for coordination; it is **not** time-and-attendance or payroll (explicit non-goal; HYPOTHESIS that Thai
labour rules apply to some temple staff; out of scope and needs legal review).

## 1. Population ("staff")

`staff_population(temple, t)` = active memberships (status active at `t`) with `monastic_kind = none` whose roles
include at least one **staff role**:

Population = membership with any role in the YAML group `@staff`:

`@staff = {waiyawatchakon, facility_manager, technician, department_lead, housekeeper, kitchen_staff, gardener,
driver, ceremony_lead, ceremony_team, undertaker, office_staff, accountant, temple_admin, security_guard,
traffic_staff, staff_general, temple_boy}`

(`kitchen_lead` is not a role: it is `department_lead` in the kitchen department.)

Excluded: monastics, `community_member`, `volunteer` and `lay_resident` (they hold `presence.set_self` in the YAML but are not staff; volunteers are counted by events, Agent 19), suspended or ended
memberships, `platform_admin`. A membership with both a staff role and `monastic_kind <> none` is a data error: excluded
and reported as data-quality flag `STAFF_ROLE_ON_MONASTIC` (case WF-17).

Roles of Agent 18 (driver, technician, facility_manager) and Agent 19 (ceremony_lead, ceremony_team, undertaker) are
in the population so the sum invariant holds across the whole temple. Their workflow is outside this spec. Whether
ceremony roles are paid staff or volunteers in practice is unknown (HYPOTHESIS; FQ-PRE-04).

Each staff membership has exactly one **primary department** (for counting) and optionally secondary departments
(`membership_departments`). Dept views at scope D include secondary members as an overlay.

## 2. States (six — Opus decision, `TEMPLE_DOMAIN_MODEL.md` §4 note)

| State | Thai (UI) | Meaning | Source | Location implied |
|---|---|---|---|---|
| `WORKING` | กำลังทำงาน | Checked in and doing assigned work | Derived (R3) | IN_TEMPLE |
| `FREE` | ว่าง | Checked in, no assigned work in progress, can take a task | Derived (R3) | IN_TEMPLE |
| `ON_LEAVE` | ลา | Leave covers now | Manual: self-report (immediate) or planned leave (once approved) | UNKNOWN unless a fresh check-in exists (conflict) |
| `OFF_SITE_DUTY` | ปฏิบัติหน้าที่นอกวัด | On duty outside the temple (trip, errand, off-site event) | Calendar/assignment-driven (duty entry with off-site venue, Agent 18 trip) or manual by a lead | OFF_SITE |
| `OFF_SHIFT` | ออกเวร | Positively known **not** expected on duty now | Derived (R4) | UNKNOWN (never claimed) |
| `UNKNOWN` | ไม่ทราบ | **Genuinely missing signal**: the person is expected on duty (or has no schedule) and nothing valid says where they are | Derived fallback (R5) | UNKNOWN |

`OFF_SHIFT` is established only by positive evidence: (a) an explicit check-out later than the latest check-in
(effective until the end of that local day), or (b) the person has shift assignments on record and none covers `t`,
with no fresh check-in. It is not a default.
`UNKNOWN` carries a mandatory `reason`: `NO_SIGNAL` (shift covers `t` or no schedule exists, and no fresh check-in) or
`STALE_CHECK_IN` (a check-in exists but is past its TTL while a shift still covers `t`). Dashboards show UNKNOWN with this
breakdown and **never hide it**. Staff are never defaulted to FREE, WORKING or OFF_SHIFT.

## 3. Shift model

### 3.1 Concepts
**Tenancy:** every row of `shift_template`, `shift_assignment`, `presence_signal`, `leave_record` and `handover_note` carries `temple_id` with composite foreign keys to its parent rows (cross-temple leakage is P0). Table names are conceptual; Agent 08 owns the schema.

- `shift_template(temple_id, name, department, start_local, end_local, days, availability_policy, min_staff, grace_minutes)`.
  `availability_policy ∈ {task_based, fixed_post}`: `fixed_post` (e.g. gate guard) means a checked-in person is WORKING by definition.
- `shift_assignment`: a person on a template for a date range. Materialises as `schedule_entries(kind = duty, source_type = shift)` in the shared calendar (master §6.2) so nothing new is invented for calendar reading.
- A shift belongs to the **local date on which it starts**. A shift crossing midnight (22:00–06:00) is one shift (WF-10).
- `grace_minutes` default 15 (HYPOTHESIS, setting). `min_staff` per department and shift (setting; none = no coverage check).
- Staff with no shift (flexible lay staff, e.g. HYPOTHESIS: `staff_general`) may check in unscheduled; state resolves normally and carries flag `UNSCHEDULED_PRESENCE`.
- Leave uses `schedule_entries` with kind `leave` (in master `TEMPLE_DOMAIN_MODEL.md` §6.2; staff-only, not read by the monastic resolver — Agent 02 to confirm); the leave reason type is stored in a separate leave record, not in the calendar row.

### 3.2 Check-in / check-out
| Item | Rule |
|---|---|
| Methods | `one_tap` (default; button in app), `qr` (staff QR at a post), `proxy` (by a lead with `presence.set_others` in the person's scope; flagged and audited) |
| Location | Not required, **no GPS tracking, no background location**. Optional single-shot geofence is out of scope unless the temple asks and Agent 13 approves (proportionality, PDPA) |
| Offline | Check-ins can be queued on device; server stores `device_time` and `received_at`; accepted if `received_at − device_time ≤ 12 h` and device time not in the future by > 5 min; flagged `OFFLINE_QUEUED` (case WF-21) |
| TTL | A check-in is **fresh** until the first of: explicit check-out; `shift_end + 60 min`; end of local day if no shift; hard cap 16 h. After that it is stale and contributes nothing (case WF-05) |
| Idempotency | Same person + method + minute → one signal |
| Tenancy | QR/links carry a signed temple id; a signal for another temple is rejected (case WF-20) |
| Late | Shift start + grace passed with no check-in → state stays UNKNOWN (NO_SIGNAL) and flag `LATE_CHECK_IN`; **no state is assumed** |

### 3.3 Handover
- `handover_note(shift, from_person, to_person|next shift, items[], created_at, ack_by, ack_at)`; `items` = free text lines plus references to open quests/assets/problems (references, not copies).
- **Required** for `security` department shifts; **recommended** for kitchen; **optional** elsewhere (department setting).
- Check-out is never blocked by a missing note (do not trap people); missing required note → flag `HANDOVER_MISSING` to the department lead.
- Incoming person must acknowledge within 30 min of their check-in (setting); else `HANDOVER_UNACKED`.
- Security handover content is restricted (incident references only visible to those with the incident permission).
- Open quests of the outgoing person are **not** reassigned automatically; the system lists them and **suggests** reassignment to FREE people; a human (`quest.assign`) confirms.

## 4. Resolver

### 4.1 Inputs at instant `t` (per staff membership)
1. membership active (else excluded)
2. leave entries covering `t`: self-reported (`reported`) or planned+`approved`
3. duty entries covering `t` with `venue_kind = off_site`, or an active trip assignment (Agent 18)
4. shift entries covering `t` (with `availability_policy`)
5. latest presence signal ≤ `t` (`check_in`/`check_out`), with freshness (§3.2)
6. quest assignments with status `IN_PROGRESS` at `t`; on-site duty entries covering `t`

### 4.2 Rules (priority, highest first)

```
R1 ON_LEAVE        leave covers t (reported, or planned and approved)
R2 OFF_SITE_DUTY   off-site duty/trip covers t, or manual off-site mark by a lead
R3 WORKING         fresh check-in AND (IN_PROGRESS assignment OR fixed_post shift covers t OR on-site duty entry covers t)
R3 FREE            fresh check-in AND none of the above
R4 OFF_SHIFT       no fresh check-in AND ( explicit check-out later than latest check-in, same local day
                                           OR (person has shift assignments on record AND none covers t) )
R5 UNKNOWN         otherwise (reason: NO_SIGNAL | STALE_CHECK_IN)
```

Rules:
- Planned leave not yet approved has **no effect** on state; it raises flag `LEAVE_PENDING` (case WF-08).
- Manual blocks never silently cancel assigned work. Overlaps produce **conflicts**, shown to the lead.
- A stale check-in outside any shift resolves to OFF_SHIFT with flag `STALE_CHECK_IN` (forgot to check out); a stale check-in while a shift still covers `t` resolves to UNKNOWN/`STALE_CHECK_IN`.
- A flexible person (no shift assignments on record) with no fresh check-in and no check-out today is UNKNOWN/`NO_SIGNAL`.
- `location_state`: ON_LEAVE → from a fresh check-in if present (conflict) else UNKNOWN; OFF_SITE_DUTY → OFF_SITE; WORKING/FREE → IN_TEMPLE; OFF_SHIFT and UNKNOWN → UNKNOWN.
- Output: `{ effective_status, unknown_reason?, location_state, conflicts[], flags[], reason_code, as_of }`.

### 4.3 Conflicts and flags

| Code | Kind | Raised when | Who sees |
|---|---|---|---|
| `CHECKED_IN_WHILE_ON_LEAVE` | conflict | R1 and a fresh check-in exist | dept lead |
| `LEAVE_OVERLAPS_ASSIGNMENT` | conflict | leave window intersects an assignment due or in progress | dept lead |
| `OFF_SITE_OVERLAPS_POST` | conflict | R2 while a `fixed_post` shift covers `t` | dept lead |
| `SHIFT_OVERLAP` | conflict (data) | two shifts overlap for one person | admin/lead |
| `LATE_CHECK_IN` | flag | no check-in after start + grace | dept lead |
| `STALE_CHECK_IN` | flag | check-in older than TTL (state per §4.2) | dept lead |
| `PROXY_CHECK_IN` / `OFFLINE_QUEUED` | flag | method | lead, audit |
| `UNSCHEDULED_PRESENCE` | flag | check-in with no shift | lead |
| `COVERAGE_GAP` | flag (dept) | confirmed WORKING+FREE < `min_staff` for the shift now | dept lead, Command Center |
| `HANDOVER_MISSING` / `HANDOVER_UNACKED` | flag | §3.3 | dept lead |
| `STAFF_ROLE_ON_MONASTIC` | data-quality | §1 | admin |

## 5. Command Center staff counters

| Counter (TH) | Definition at `t` |
|---|---|
| เจ้าหน้าที่ทั้งหมด | `|staff_population(t)|` |
| กำลังทำงาน | `effective_status = WORKING` |
| ว่าง | `FREE` |
| ลา | `ON_LEAVE` |
| ปฏิบัติหน้าที่นอกวัด | `OFF_SITE_DUTY` |
| ออกเวร | `OFF_SHIFT` (not "needs attention") |
| **ไม่ทราบ** | `UNKNOWN` (always shown; tap for breakdown NO_SIGNAL / STALE_CHECK_IN) |
| อยู่ในวัด (separate) | `location_state = IN_TEMPLE` (can include ON_LEAVE with a check-in conflict) |

**Sum invariant:** `WORKING + FREE + ON_LEAVE + OFF_SITE_DUTY + OFF_SHIFT + UNKNOWN = เจ้าหน้าที่ทั้งหมด`, evaluated per
instant on the same population snapshot. Per department the invariant holds using **primary** departments. A dashboard
test enforces it (mirrors availability invariant). Dept views at scope D that include secondary members may show a
larger total; they say so ("รวมผู้ช่วยแผนกอื่น"). The panel is available to `command_center.view` holders (YAML: temple
roles T; `facility_manager`, `department_lead`, `ceremony_lead` D; `temple_admin` D with staff-panel filter).

**Visibility:** counts are non-personal and may be shown at the scope of the viewer's `command_center.view`
(T: all; D: own department). Detailed lists (with flags and conflicts) require `presence.view` T or D; other staff hold `presence.view` C (coarse: state label and department counts only, no leave reason, no flags, no conflicts). Leave **reason** (sick/personal/other) is
visible only to the person and to those with `presence.set_others` over them; everyone else sees "ลา". Leave of type
"sick" is health data (PDPA s.26): minimise, never in counters, never exported.

## 6. UX requirements
- Check-in/out is a **pinned one-tap control** on every staff home (proposal to Agent 03: not a home module, so matrix §5 order is untouched). Target ≥ 56 px, works on low-end Android, one-handed, wet hands.
- Confirmation is shown as text plus icon plus (optional) haptic; undo within 2 minutes.
- Staff without smartphones: lead proxy check-in list (one screen, tick people).
- No ranking, no "late counts" per person on screens visible to peers. Late and handover flags are for the lead only.
- UNKNOWN is shown as "ไม่ทราบ", never as grey blank.

## 7. Commands and permissions (YAML codes, `role_permissions.yaml`)

| Command | Permission | Scope per YAML |
|---|---|---|
| CheckIn / CheckOut / ReportLeave / RequestLeave / WriteHandover / AckHandover (self) | `presence.set_self` | S — `@staff`, `lay_resident`, `volunteer` |
| ApproveLeave / ProxyCheckIn / ManualOffSiteMark | `presence.set_others` | abbot / deputy / assistant T, `department_lead` D, `facility_manager` D, `temple_admin` T (not `office_staff`) |
| AssignShift / EditShiftTemplate | `shift.manage` | `department_lead` D, `facility_manager` D, `temple_admin` T |
| ViewPresence | `presence.view` | T: abbot / deputy / assistant / `temple_admin`; D: `department_lead`, `facility_manager`, `ceremony_lead`; **C** (coarse states and counts only): every other `@staff` role |
| ViewCounters | `command_center.view` | per §5 |

Consequences of the YAML (changes from the Wave 1a draft, which had proposed more):
- YAML v0.3 has no team scope. `presence.view` C gives ordinary staff the coarse state of colleagues (state label only; **never** leave reason, flags, conflicts, check-in method or location). `wf.team_roster` therefore appears for all staff, in coarse form for scope C. A staff member always sees their own full state and shift.
- Abbot, deputy and assistant (T) join `department_lead`, `facility_manager` (D) and `temple_admin` (T) as holders of `presence.set_others`. `office_staff` does not.
- Monastic roles use `availability.*`, not these codes.

## 8. Domain events (input to Agent 02 `DOMAIN_EVENTS.md`; naming `context.past_tense_fact`, dot-case)
`staff.checked_in`, `staff.checked_out`, `staff.leave_reported`, `staff.leave_requested`, `staff.leave_approved`,
`staff.proxy_checked_in`, `staff.shift_assigned`, `staff.shift_changed` (already in `DOMAIN_EVENTS.md`), `staff.handover_written`,
`staff.handover_acknowledged`, `staff.coverage_gap_raised`, `staff.coverage_gap_cleared`. Every event carries `temple_id`. Consumers: Command Center, notifications (leads), audit
(proxy, leave approval, handover read).

## 9. Test cases (WF-01…WF-22)

Fixture: temple T1; people A–J; today = Mon 2026-10-12 Asia/Bangkok unless stated. "Now" = `t`.

| ID | Given | When | Then |
|---|---|---|---|
| WF-01 | A (housekeeper, shift 08:00–16:00 `task_based`) checked in 08:02; no IN_PROGRESS assignment | `t` = 10:00 | `FREE`, location IN_TEMPLE, no flags |
| WF-02 | A as WF-01, with assignment QT-CLN-01 IN_PROGRESS | `t` = 10:00 | `WORKING` |
| WF-03 | B (security_guard, shift 18:00–06:00 `fixed_post`) checked in 17:58, no quests | `t` = 20:00 | `WORKING` (fixed post) |
| WF-04 | C (kitchen_staff, shift 06:00–14:00, grace 15) no signal | `t` = 06:20 | `UNKNOWN` reason NO_SIGNAL; flag `LATE_CHECK_IN`; counted in "ไม่ทราบ" not "ลา" |
| WF-05 | C checked in 06:03, no check-out, shift 06:00–14:00 | `t` = 21:00 | check-in fresh until 15:00 (shift_end + 60 min); at 21:00 no shift covers `t` and C has shifts on record → `OFF_SHIFT` (R4), flag `STALE_CHECK_IN`; **not** UNKNOWN |
| WF-06 | D has approved leave 2026-10-12 all day and also taps check-in at 09:00 | `t` = 09:30 | `ON_LEAVE` (R1), location IN_TEMPLE (from check-in), conflict `CHECKED_IN_WHILE_ON_LEAVE` to lead |
| WF-07 | E self-reports sick at 07:10 (shift 08:00–16:00); has QT-GAR-01 due 09:00 | `t` = 07:11 | `ON_LEAVE` immediately, reason type visible only to E and lead; conflict `LEAVE_OVERLAPS_ASSIGNMENT`; lead sees suggested reassign to FREE staff (not applied) |
| WF-08 | F requested planned leave for 2026-10-13, status pending | `t` = 2026-10-13 10:00, F checked in | state `FREE`/`WORKING` per R3 (leave has no effect); flag `LEAVE_PENDING` visible to lead |
| WF-09 | G (driver) has trip duty 09:00–12:00 off-site (Agent 18 entry), checked in 08:30 | `t` = 10:00 | `OFF_SITE_DUTY` (R2 over R3), location OFF_SITE |
| WF-10 | B night shift Sun 22:00–Mon 06:00, checked in Sun 21:55 | `t` = Mon 01:00 | `WORKING`; shift belongs to Sunday; check-in fresh (TTL runs to 07:00); at `t` = Mon 07:30 → `OFF_SHIFT` with flag `STALE_CHECK_IN` (TTL passed, no shift covers `t`) |
| WF-11 | H (no smartphone); lead L (`department_lead` with `presence.set_others` D over H's department) proxy-checks-in H at 08:05 | `t` = 08:06 | H is `FREE`; flags `PROXY_CHECK_IN`; audit row (actor L); H sees it in own history if they log in |
| WF-12 | User X without `presence.set_others` over H's department (e.g. an office_staff, a monk_secretary, or a lead of another department) attempts proxy check-in for H | submit | rejected (403, out of scope); no signal stored; audit of denial |
| WF-13 | A checks out at 16:02 (shift ended 16:00) | `t` = 16:05 | `OFF_SHIFT` (explicit check-out, R4a); counted in "ออกเวร", not in "ไม่ทราบ" |
| WF-14 | Staff population 10 at 10:00: 3 WORKING, 2 FREE, 1 ON_LEAVE, 1 OFF_SITE_DUTY, 1 OFF_SHIFT, 2 UNKNOWN (1 NO_SIGNAL, 1 STALE_CHECK_IN with shift still covering) | Compute counters | total 10 = 3+2+1+1+1+2; UNKNOWN breakdown 1/1 shown; any other result fails the build |
| WF-15 | I belongs to kitchen (primary) and garden (secondary) | Count at T and at dept views | T total counts I once (primary kitchen); garden D view shows I as overlay with note; kitchen D sum invariant holds |
| WF-16 | J's membership is suspended at 09:00; J had a check-in at 08:00 | `t` = 09:30 | J not in population; no state; not counted; stale signal ignored |
| WF-17 | K has role `housekeeper` and person `monastic_kind = samanera` | any | K excluded from staff counters; data-quality flag `STAFF_ROLE_ON_MONASTIC` to temple_admin; K still handled by monastic availability |
| WF-18 | Security shift ends 18:00, outgoing B writes no handover and checks out 18:01 | check-out | allowed; flag `HANDOVER_MISSING` to security supervisor; incoming M checks in 18:00 and sees "no handover" banner and can ack only after note exists or "no note" is acknowledged |
| WF-19 | Gate night shift `min_staff = 2`, only B WORKING, second guard on leave | `t` = 23:00 | `COVERAGE_GAP` for department; Command Center panel shows gap; individual states unchanged |
| WF-20 | Staff of T1 scans a QR belonging to T2 | submit | rejected; no signal in T1 or T2; denial logged (tenant isolation, P0) |
| WF-21 | A has no signal in a cellar; taps check-in 07:58 offline; device syncs 08:30 | server receives | accepted with flag `OFFLINE_QUEUED`; at `t` = 08:30 state `FREE`; signal time 07:58; if device time > received_at + 5 min → rejected |
| WF-22 | Leave approved for L covering a shift; coverage computed | `t` inside shift | L `ON_LEAVE`; shift remains assigned (never silently deleted); if `min_staff` unmet, `COVERAGE_GAP` |

| WF-23 | M is flexible staff (`staff_general`, no shift assignments on record), no check-in today, no check-out | `t` = 10:00 | `UNKNOWN` reason NO_SIGNAL (no schedule exists to establish OFF_SHIFT) |
| WF-24 | M checks in 08:00 and checks out 17:00 | `t` = 18:00 same day → then next day 06:00 with no signal | 18:00: `OFF_SHIFT` (explicit check-out, effective to end of local day); next day 06:00: `UNKNOWN` NO_SIGNAL (no schedule, no new signal) |
| WF-25 | N works a 17 h shift 06:00–23:00 (HYPOTHESIS), checked in 06:00, never checks out | `t` = 22:30 (hard cap 16 h passed at 22:00) | shift still covers `t` → `UNKNOWN` reason STALE_CHECK_IN; flag `STALE_CHECK_IN` to lead |
| WF-26 | Person with shifts on record, no shift today, no signal | `t` = 11:00 | `OFF_SHIFT` (R4b); not counted as UNKNOWN |

Case count: **26** (minimum 12). Kitchen headcount cases WF-31…WF-40 are in `KITCHEN.md` §3.7.

## 10. Open questions
- OQ-P1: (closed) six states adopted per Opus decision.
- OQ-P2: Retention for raw presence signals (proposed ≤ 90 days; Agent 13/legal).
- OQ-P3: Who approves planned leave in a temple — abbot, assistant, or department lead? (FQ-PRE-01)
- OQ-P4: Are staff comfortable with check-in at all (parallels Q-08 for monks)? Alternative: lead-confirmed daily roll (proxy only).
- OQ-P6: (closed) ordinary staff see a coarse roster via `presence.view` C (YAML v0.3).
- OQ-P5: Should self-reported sick leave require lead acknowledgement to remain in counters? Design: no — explicit self-report is information; lead may mark reviewed.

## 11. Field-research questions
- FQ-PRE-01: How is attendance and leave handled today (paper, LINE, verbal)? Who is told?
- FQ-PRE-02: Are there fixed shifts and posts (guards) or flexible days?
- FQ-PRE-03: What happens when someone is absent — who covers?
- FQ-PRE-04: Are ceremony and traffic helpers paid staff or volunteers?
- FQ-PRE-05: Smartphone ownership and shared-device acceptability among lay staff.
