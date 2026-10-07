# EVENT / BOSS QUEST SPEC — BOON SYSTEM

Owner: Agent 19 (Ceremony / Event Operations). Wave 1a. Status: **DESIGNED (paper only; nothing implemented)**. Revision W1-fix (2026-10-07): permission codes aligned to `docs/master/role_permissions.yaml` v0.2; interface assumptions reconciled with the final core/facility/workforce specs (§9).
Feature IDs: F-16 (Event / Boss Quest + readiness), part of F-15 (Command Center Events panel).
Master references: `TEMPLE_DOMAIN_MODEL.md` §5.3, `ROLE_PERMISSION_MATRIX.md`, `DATABASE_PLAN.md` (events, event_tasks).
Boundary: Agent 02 owns the quest lifecycle (§5.2) and off-site invitations (กิจนิมนต์). This file owns *events*
(Boss Quests) and how they use that lifecycle. In-temple rites: `CEREMONY_OPERATIONS_SPEC.md`. Funerals:
`FUNERAL_OPERATIONS_SPEC.md`. Archive/duplication: `TEMPLE_MEMORY_SPEC.md`.

Labels: **SOURCED** = has a URL in `EVENT_CATALOG.md` §0. **HYPOTHESIS** = my design default or unsourced belief;
to be validated with the pilot temple (decision D-1) or a Thai legal/ritual authority. All numeric defaults in
this file (weights, thresholds, 48 h, 80 %) are HYPOTHESIS defaults, stored as per-temple configuration.

---

## 1. Concepts

| Term | Thai | Definition |
|---|---|---|
| Event (Boss Quest) | งาน / ภารกิจใหญ่ | A planned temple occasion with date range, venue(s), departments, staffing targets and a **derived readiness**. Exactly one root quest of type `event_root`. |
| Root quest | ภารกิจราก | `quest_type = event_root`; carries no work itself; owns the tree. |
| Department group | ฝ่าย | A child quest of type `event_task` that is a *container* for one `department_id`. |
| Task (leaf quest) | งานย่อย | A quest with no non-cancelled children; the only quests that carry weight. |
| Team | ทีม | Optional named subgroup inside a department (e.g. "จุดรับบริจาค"), a label on staffing targets and quests. |
| Staffing target | เป้าหมายกำลังคน | Required head-count of one category (monk / volunteer / staff), optionally by skill and shift. |
| Readiness | ความพร้อม | **Derived, never stored as authority**: percent + state + failed gates + gaps (§5). |
| Gate | เงื่อนไขบังคับ | A boolean condition that, if failed, forces state NOT_READY whatever the percent. |

## 2. Event model (conceptual fields — not a schema)

### 2.1 `event`

| Field | Type / values | Notes |
|---|---|---|
| id, temple_id | ids | `temple_id` mandatory (tenant rule). |
| kind | `festival_day`, `merit_offering` (กฐิน/ผ้าป่า), `ceremony`, `ordination`, `course`, `community`, `other` | Drives template choice only. Funerals are **not** events (see Funeral spec). |
| title_th, title_en | text | |
| template_code | text nullable | e.g. `KATHINA` from catalogue or `memory:<event_id>`. |
| memory_source_event_id | id nullable | Set when duplicated from Temple Memory. |
| starts_at, ends_at | timestamptz (Asia/Bangkok display) | Gregorian instants. |
| lunar_ref | text nullable | Display label only (e.g. "ขึ้น 15 ค่ำ เดือน 6"). The system never derives the date from it (HYPOTHESIS: lunar computation is error-prone; use the official calendar entered by a human). |
| venue_building_ids[] | building codes (Agent 18) | ≥ 1 required for APPROVED. |
| expected_attendance | int nullable | Used by templates to *suggest* targets; never by readiness directly. |
| visibility | `internal`, `temple_members`, `public` | Public shows title, time, venue, and public volunteer needs only. |
| lead_person_id | person | Event owner (one accountable person). |
| status | §4 | Stored lifecycle state. |
| root_quest_id | id | |
| registration_mode | `none`, `headcount_only`, `registration` | `none` = the temple collects no sign-ups for this event (guest/meal counts are then **Unknown**, never estimated). Default `none`. Registration UI itself is Wave 6 (Agent 12). |
| meal_windows[] | list of `{ref_meal_service \| starts_at/ends_at, planned_meal_guests (optional integer, labelled estimate)}` | Windows during which the event needs food; see §2.5. |
| escalation_hours | int, default 48 | Per-event override of §5.6; 0 disables. |
| readiness_snapshot_at_start | json nullable | Frozen at LIVE (§5.8). |

### 2.2 Structure

```
event
 └─ root quest (event_root)
     ├─ department group quest (event_task, department_id = ceremony)       [container]
     │    ├─ leaf quest  (ceremony_task)  "จัดแท่นพิธีสงฆ์"      w=3
     │    └─ leaf quest  "ตรวจเครื่องเสียง"                     w=2   is_gate
     ├─ department group quest (kitchen)
     │    └─ leaf quests …
     └─ …
```
- Depth limit 3 (root → department group → leaf). A leaf may carry a checklist (checklist items are *inside* a
  quest, unweighted; quest completion rules follow Agent 02's verification policy).
- A leaf quest may `depends_on[]` other quests (Agent 02 field). A leaf whose dependency is not COMPLETED may not
  be started; readiness is unaffected by dependency except through completion.
- Quest weight `w` ∈ integers 1..5. Default from priority: low 1, normal 2, high 3, critical 4 (HYPOTHESIS);
  manual override allowed by `event.manage`.
- `is_gate` (boolean on a leaf): a task that must be COMPLETED before the event can reach READY (§5.5 G-CHECK).

### 2.3 Departments and teams

Departments come from `departments` (temple-level, Agent 17/02). An event enables a subset via
`event_departments(event_id, department_id, lead_person_id)`. Default catalogue departments (HYPOTHESIS, see
catalogue): ceremony (พิธีการ), reception/registration (ต้อนรับ-ลงทะเบียน), kitchen & food (โรงครัว), cleaning
(รักษาความสะอาด), traffic & parking (จราจร-ที่จอดรถ), security & first aid (รักษาความปลอดภัย-พยาบาล), publicity
(ประชาสัมพันธ์), finance & donation (การเงิน-รับบริจาค), sound/stage/lighting (เสียง-เวที), facility (สถานที่).
A department lead manages their own sub-tree with `event.manage` at scope **D**, which the YAML grants to
`ceremony_lead`, `department_lead` and `facility_manager` (a kitchen lead is a `department_lead` whose department is
kitchen; there is no `kitchen_lead` role). A per-event lead role (`event_department_lead`) does not exist and is **not** used: the
per-event `lead_person` of each department (`event_departments.lead_person_id`) is a pointer for accountability
and notifications only and grants nothing; authority always comes from role + department scope. Open: if a
temple wants a volunteer to lead a department for one event only, that needs a new grant decided by Opus.
Every table in this spec (`event`, `event_departments`, `event_staffing_targets`, `event_assignments`,
`event_meal_windows`, memory tables) carries `temple_id` with composite foreign keys (tenant rule; audit F-23).

### 2.4 Staffing targets (`event_staffing_targets`)

| Field | Notes |
|---|---|
| event_id, department_id, team_label | |
| category | `monk`, `volunteer`, `staff` (monk = bhikkhu/samanera counted separately in `monk_subkind` if required) |
| skill_tags[] | nullable; **free tags**, the same tag type Agent 02 uses for `required_skills[]` on invitations (`SCHEDULE_INVITATION_SPEC.md`). No controlled vocabulary exists in Wave 1 (audit F-25); suggested tags from templates (e.g. `cook`, `sound`, `first_aid`). A target matches a person who holds **all** its tags. Single owner of one shared vocabulary: **open** (Opus). |
| shift_starts_at, shift_ends_at | nullable (whole event if null); one row per shift |
| required `r` | integer ≥ 0; rows with 0 are ignored |
| min_required `m` | integer 0..r; default: monk → `r`; volunteer/staff → `ceil(0.8·r)` (HYPOTHESIS) |
| weight `u` | integer 1..5; default monk 3, volunteer 2, staff 2 (HYPOTHESIS) |
| hard_gate | boolean, default true |
| source | `template`, `manual`, `memory`, `ai_draft` (AI draft only until a human accepts) |

Counting rules for confirmed head-count `f` of a target:
1. Count **distinct persons** with an assignment to that target whose status is `CONFIRMED`
   (monks: confirmed by an authorised human, producing a `schedule_entries` row — Ceremony spec §6;
   volunteers: accepted by the person *and* approved by the department lead if the target requires approval).
2. Exclude: `INVITED`, `PENDING`, `DECLINED`, `CANCELLED`, `NEEDS_RECONFIRM` (after reschedule), assignments with
   an **unresolved availability conflict** (Agent 02 conflict flag), and persons whose membership in this temple
   is not ACTIVE.
3. A person assigned to two targets with **overlapping time windows** counts for one only: the target with the
   lower `created_at` (tie: lower id); the other receives a `DOUBLE_BOOKED` flag (shown to the lead, never silent).
4. `f` is bounded for fill by `r` (over-staffing earns no extra credit) but the raw `f` is still stored/displayed.
5. Pending counts `p_k` (invited, not yet confirmed) are *displayed* beside gaps, never added to `f`.

Gap: `gap_k = max(0, r − f)`. **Volunteer gap (north-star "อาสายังขาดกี่คน?")** = Σ `gap_k` over targets with
`category = volunteer`. Monk gap and staff gap are reported the same way, never merged into the volunteer figure.

### 2.5 Meal-required guest count (kitchen headcount input; Agent 17 OQ-07)

Agent 17's kitchen headcount (`KITCHEN.md` §3, component C3) needs, per meal service, the number of event
guests who must be fed. The event model exposes it as **aggregate numbers only**:

| Field | Meaning |
|---|---|
| `meal_required` (boolean, on each event registration and each volunteer/staff event assignment) | Person needs a meal during the event. Default **unset**; unset is *not* counted and makes the window's count Unknown only when registration is the source and unset rows exist (see rule 3). |
| `event_meal_windows(event_id, temple_id, ref_meal_service or starts_at/ends_at, planned_meal_guests?)` | One row per window to be fed. `planned_meal_guests` is an optional human-entered estimate. |
| Derived `meal_guests_confirmed(window)` | Count of distinct persons with a CONFIRMED registration or CONFIRMED volunteer/staff assignment, `meal_required = true`, whose time window overlaps the meal window. **Monks and samanera are excluded** (the kitchen counts them from the availability resolver, component C1/C2; including them would double count). |

Function contract (SECURITY DEFINER, aggregate only, no person ids or names; requires `headcount.view` D or
`event.manage` D/T):

```
event_meal_headcount(temple_id, window_start, window_end) ->
  [ { event_id, event_title, window, count: int | UNKNOWN, basis: registration|none,
      planned_estimate: int | null, unset_meal_flags: int } ]
```
Rules: (1) `registration_mode = none` -> `count = UNKNOWN`, `basis = none`; `planned_estimate` is returned
**separately** and never merged into `count` (Unknown is shown as Unknown; the kitchen lead may add the estimate as a
signed manual adjustment `headcount.adjust`, which is audited). (2) `registration_mode` in {headcount_only,
registration} -> `count = meal_guests_confirmed`, `basis = registration`. (3) If any in-scope registration or
assignment has `meal_required` unset, the count is still the confirmed-true number but `unset_meal_flags > 0` is
returned so the kitchen shows "มีผู้ลงทะเบียนที่ยังไม่ระบุอาหาร N คน". (4) Sum over overlapping events is done by the
kitchen, per window. (5) Pending/declined/cancelled/`NEEDS_RECONFIRM` persons are never counted. (6) Tenant scoped.
Cases EV-29..EV-31. Wave 1 delivers the contract; sign-up capture is Wave 6.

## 3. Roles and permissions used

Exactly the codes in `docs/master/role_permissions.yaml` v0.2 (no others):

| Action | Code (scope per YAML) |
|---|---|
| See events (public items only for community) | `event.view` (`@all` T; `community_member` P; `undertaker` A) |
| Create/edit events, tree, targets | `event.manage` (abbot, deputy, assistant, secretary T; `ceremony_lead`, `department_lead`, `facility_manager` D) |
| Approve PLANNING -> APPROVED, cancel an APPROVED event | `event.approve` (restricted; abbot, deputy, assistant T; secretary T only when delegated) |
| Approve volunteer sign-ups for a department | `event.volunteer_approve` (`ceremony_lead`, `department_lead`, `facility_manager` D) |
| Confirm monk roster | `ceremony.confirm_monks` (restricted; same holders as `invitation.confirm`) |
| Quest tree actions | `quest.create`, `quest.assign`, `quest.verify`, `quest.manage` (D for `ceremony_lead`, `department_lead`, `facility_manager`; T for abbot-level and, except `quest.manage`, secretary) |
| Command Center Events panel | `command_center.view` (T abbot-level/secretary; D for `ceremony_lead`, `department_lead`, `facility_manager`) |
| Calendar rows | `schedule.view`; ceremony rows written under `schedule.manage` D (ceremony kind) |
| Kitchen headcount input | `headcount.view` (D `department_lead`, `kitchen_staff`; T abbot-level/secretary) |
Public/`community_member` sees only `visibility = public` events (matrix footnote 1) and never readiness detail
(§7).

## 4. Event states (stored) — distinct from derived readiness

| State | Thai | Meaning |
|---|---|---|
| DRAFT | ร่าง | Being sketched (maybe AI draft accepted by a human). No readiness shown. |
| PLANNING | วางแผน | Date/venue set; tree and targets being built; volunteers may be recruited if `public`. Readiness computed. |
| APPROVED | อนุมัติแล้ว | An authorised human approved date, venue and scope. Readiness computed. |
| LIVE | กำลังจัด | `starts_at ≤ now < ends_at` or started manually. Readiness frozen as snapshot; live gaps still shown. |
| COMPLETED | เสร็จสิ้น | Closed after closing checklist; retro prompt created. |
| ARCHIVED | เก็บเข้าความรู้วัด | Snapshot sent to Temple Memory (people stripped). |
| CANCELLED | ยกเลิก | Terminal; reason mandatory; child quests cancelled; assigned people notified. |

| From | Event | To | Who | Rule |
|---|---|---|---|---|
| (none) | create | DRAFT | `event.manage` | |
| DRAFT | plan | PLANNING | `event.manage` | needs title, starts_at, ends_at, lead_person |
| PLANNING | approve | APPROVED | `event.approve` | Human only; AI never. Requires ≥ 1 venue and ≥ 1 department. Approval does **not** require READY (approval precedes preparation). |
| APPROVED | reschedule | APPROVED | `event.manage` | Changes dates; all assignments → `NEEDS_RECONFIRM`; audit row; notifications. |
| APPROVED | start | LIVE | system at `starts_at`, or `event.manage` | Writes readiness snapshot. |
| LIVE | close | COMPLETED | `event.manage` | Requires closing checklist (actual attendance, incident none/some). |
| COMPLETED | archive | ARCHIVED | system 7 days after completion or on retro submit (HYPOTHESIS) | |
| DRAFT/PLANNING/APPROVED | cancel | CANCELLED | `event.manage` (APPROVED needs `event.approve`) | |
Every transition writes `audit_logs(actor, from, to, reason)`.
Readiness is `null` for DRAFT, and absent for LIVE+ (snapshot only) and terminal states.

## 5. Readiness — normative definition (unit-testable)

All arithmetic is exact (rational or decimal). Floating-point implementations MUST add ε = 1e-9 before `floor`.
Time evaluation instant `t` is an explicit input (never `now()` inside the function).

### 5.1 Inputs (pure function signature)

```
readiness(
  t,                        // evaluation instant
  event:   { state, starts_at, escalation_hours, lead_person_active: bool, venue_ids[] },
  leaves:  [ { id, status, weight w, priority, due_at, is_gate } ],   // non-container quests only, cancelled INCLUDED (filtered inside)
  targets: [ { id, category, required r, min_required m, weight u, hard_gate, confirmed f } ],
  facts:   { venue_overlap: bool|UNKNOWN,            // another APPROVED/LIVE event on a shared venue in the window
             venue_problem: bool|UNKNOWN,   // Agent 18 building `problem` flag for any venue building (MAINTENANCE_SPEC §6: open request with severity <= S2 by default; un-triaged unknown severity counts as S2)
             unresolved_monk_conflicts: int|UNKNOWN }          // Agent 02 conflict flag among event monks
) -> { percent: int|null, state, T, S, failed_gates[], unknown_gates[], caps[], gaps{category->int}, volunteer_gap: int }
```
`UNKNOWN` is a first-class input value. A fact that cannot be read is UNKNOWN, never defaulted to "ok".

### 5.2 Task score T

- `L` = leaves with status ≠ CANCELLED. `W = Σ w` over `L`. `Wd = Σ w` over `L` with status = COMPLETED.
- `T = Wd / W` if `W > 0`; else `T = undefined`.
- Only COMPLETED earns credit (SUBMITTED, VERIFIED-pending and IN_PROGRESS earn 0: no partial credit — keeps the
  metric auditable. VERIFIED→COMPLETED is atomic per Agent 02). A reopened quest lowers T at next evaluation.

### 5.3 Staffing score S

- `K` = targets with `r > 0`. `fill_k = min(f_k, r_k) / r_k`.
- `S = (Σ u_k · fill_k) / (Σ u_k)` over `K`; if `K` is empty, `S = undefined`.

### 5.4 Percent

| T | S | x |
|---|---|---|
| defined | defined | `0.6·T + 0.4·S` |
| defined | undefined | `T` |
| undefined | defined | `S` |
| undefined | undefined | percent = null |

`percent = floor(100 · x)` (floor, so display never overstates). Range 0..100. Weights 0.6/0.4 are a per-temple
config (HYPOTHESIS), must sum to 1.

### 5.5 Gates (each returns PASS / FAIL / UNKNOWN)

| Code | PASS when | FAIL when | UNKNOWN when |
|---|---|---|---|
| G-OWNER | `lead_person_active` | no lead or lead membership inactive | — |
| G-VENUE | `venue_ids` non-empty and `venue_overlap = false` | empty, or overlap = true | `venue_overlap = UNKNOWN` |
| G-STAFF | for every target with `hard_gate`: `f ≥ m` | any such target `f < m` (list target ids) | — |
| G-MAINT | no venue building has `problem = true` | any venue building has `problem = true` | feed unavailable |
| G-CRIT | no leaf with priority = critical, `due_at < t`, status ∉ {COMPLETED, CANCELLED} | at least one | — |
| G-CHECK | every `is_gate` leaf (non-cancelled) with `due_at < t` is COMPLETED | an `is_gate` leaf is overdue and not COMPLETED | — |
| G-CONFLICT | `unresolved_monk_conflicts = 0` (aggregate count from the availability conflict detector; the event manager sees only the count and which assignment, never the monk's reason; detail needs `availability.set_others`) | > 0 | UNKNOWN |

Additionally an **outstanding gate quest** (an `is_gate` leaf, not COMPLETED, not yet overdue) is not a failure,
but triggers the cap `OUTSTANDING_GATE` (§5.6 step 4).

### 5.6 State function (evaluate strictly in this order)

States: `UNKNOWN` (ไม่ทราบ), `NOT_READY` (ไม่พร้อม), `IN_PROGRESS` (กำลังเตรียม), `ALMOST_READY` (ใกล้พร้อม),
`READY` (พร้อม). Order for capping: `IN_PROGRESS < ALMOST_READY < READY`.

1. If `T` and `S` are both undefined → `UNKNOWN`, reason `NO_PLAN`. Stop.
2. If `event.state = APPROVED` and `t ≥ starts_at` (and not LIVE) → `NOT_READY`, reason `OVERDUE_START`. Stop.
3. If any gate = FAIL → `NOT_READY`, `failed_gates` listed. Stop. (Hard gates override the percentage: this
   implements master §5.3 "caps readiness display at ไม่พร้อม".)
4. `band`: `percent ≥ 90` → READY; `75 ≤ percent ≤ 89` → ALMOST_READY; `< 75` → IN_PROGRESS. Then apply caps:
   - any gate UNKNOWN → `band = min(band, ALMOST_READY)`, cap `GATE_UNKNOWN`;
   - an outstanding gate quest → `min(band, ALMOST_READY)`, cap `OUTSTANDING_GATE`;
   - `S` undefined → `min(band, ALMOST_READY)`, cap `NO_STAFFING_TARGETS`;
   - `T` undefined → `min(band, IN_PROGRESS)`, cap `NO_TASKS`.
5. Time escalation: let `h = (starts_at − t)` in hours. If `escalation_hours > 0` and `0 ≤ h ≤ escalation_hours`
   and `band ≠ READY` → `NOT_READY`, reason `TIME_PRESSURE`. (Default 48 h, HYPOTHESIS.)
6. Result = `band`.

### 5.7 UI mapping (Thai copy examples)

| State | Chip | Sub-line example |
|---|---|---|
| READY | พร้อม | "พร้อม 97% · ครบทุกเงื่อนไข" |
| ALMOST_READY | ใกล้พร้อม | "ใกล้พร้อม 82% · เหลือ 2 งานสำคัญ" |
| IN_PROGRESS | กำลังเตรียม | "กำลังเตรียม 40% · อีก 21 วัน" |
| NOT_READY | ไม่พร้อม | "ไม่พร้อม · พระยังขาด 2 รูป · อาสายังขาด 5 คน" |
| UNKNOWN | ไม่ทราบ | "ยังไม่มีแผนงาน — เพิ่มงานหรือเป้าหมายกำลังคน" |

The chip is never green when state ≠ READY; colour is not the only cue (accessibility, Agent 04).

### 5.8 Snapshot, determinism, performance

- At LIVE transition store `readiness_snapshot_at_start` (full output + inputs hash). Post-event analytics and
  Temple Memory use the snapshot.
- Function is pure and deterministic given inputs; the Command Center read model recomputes on quest/assignment
  change and on a 15-minute tick near `starts_at` (HYPOTHESIS) so TIME_PRESSURE can fire without data change.
- Property tests: percent ∈ [0,100]; monotone (completing a non-cancelled leaf never lowers percent; confirming a
  person never lowers percent); cancelling a not-done leaf never lowers T; permutation-invariant; result
  independent of tenant ids; `volunteer_gap` ≥ 0; state = UNKNOWN iff both T,S undefined.

## 6. North-star mapping

| Question | Field(s) / query | Surface |
|---|---|---|
| "มัคนายก: พิธีพร้อมหรือยัง?" | `readiness(event).state, percent, failed_gates, gaps` for the next event/ceremony with `starts_at ≥ now` | ceremony_lead Home "Next ceremony readiness" |
| "Event ไหนยังไม่พร้อม?" | events in PLANNING/APPROVED with `starts_at` within horizon (default 60 d) and `state ∈ {NOT_READY, UNKNOWN}` ordered by `starts_at`; plus `IN_PROGRESS`/`ALMOST_READY` on a second tab | Command Center Events panel |
| "อาสายังขาดกี่คน?" | `volunteer_gap` per event and Σ across upcoming events; per department via `gaps` | Events panel, department board |
| Not in the question but required | monk gap, staff gap, pending counts | readiness view |

## 7. Visibility of readiness

- Audience rule (coordinator decision, audit F-41, YAML groups `@monastic` and `@staff`):
  1. **Management and staff roles** (every `@monastic` role and every `@staff` role with `event.view`, e.g. abbot-level,
     secretary, `ceremony_lead`, `department_lead`, `facility_manager`, `kitchen_staff`, `driver`, ...): full readiness detail:
     percent, state, failed/unknown gates, monk/staff/volunteer gaps, pending counts. Authority to *change* anything
     still needs `event.manage` at scope.
  2. **`volunteer`, `lay_resident`, `community_member`**: at most the percent and state chip, and only for events
     in which they **participate** (a CONFIRMED assignment or sign-up). No gates, no gap breakdown, no maintenance
     information, no monk counts. For events they do not participate in: public items only (below), no readiness.
- There is no per-event `event_department_lead` role. Department leadership is `department_lead` at scope D, linked to the
  event through `event_departments` (a department lead sees and manages only the departments enabled for that event).
- Public volunteer needs: for `public` events show only "ต้องการอาสา N คน (ฝ่าย X)" where N = volunteer gap of
  targets flagged `public_signup`. No monk counts, no gate names, no maintenance info.

## 8. Cases (`EV-xx`) — each is a test-vector scenario

Defaults assumed unless stated: owner active, venue present, no overlap, no open maintenance, no conflicts,
`escalation_hours = 48`, `h` (hours to start) = 200, weights T 0.6 / S 0.4, `u` monk 3 / volunteer 2 / staff 2.

| ID | Scenario | Inputs | Expected |
|---|---|---|---|
| EV-01 | Empty plan | no leaves, no targets | state UNKNOWN, percent null, reason NO_PLAN |
| EV-02 | Gates fail despite high-ish percent | leaves W=8 Wd=5 (T=0.625); targets: monk r=9 f=9; volunteer r=20 f=15 (m=16); staff(cook) r=4 f=2 (m=4) | S=5.5/7≈0.7857; x≈0.6893; **percent 68**; G-STAFF FAIL (volunteer, staff); state NOT_READY; volunteer_gap=5, staff gap=2 |
| EV-03 | Gates pass, band boundary | as EV-02 but volunteer f=16, staff f=4 | fills 1, 0.8, 1; S=6.6/7; x=0.375+0.377142…=0.752142…; **percent 75**; ALMOST_READY; volunteer_gap=4 (r−f, though gate passes) |
| EV-04 | Fully done | T=1 (all leaves COMPLETED), targets as EV-03 | x=0.6+0.37714=0.97714; **percent 97**; READY |
| EV-05 | Outstanding gate quest caps | W=10 Wd=9, the one open leaf is `is_gate`, not overdue; S=1 (all fills 1) | x=0.54+0.4=0.94 → percent 94; band READY; cap OUTSTANDING_GATE; state **ALMOST_READY** |
| EV-06 | Time pressure | EV-05 with h=30 | band after cap ALMOST_READY, `0 ≤ 30 ≤ 48` → state **NOT_READY**, reason TIME_PRESSURE |
| EV-07 | No staffing targets | T=1, targets empty | x=T → percent 100; cap NO_STAFFING_TARGETS; state **ALMOST_READY** (never READY) |
| EV-08 | No tasks but staffing | leaves empty, S=1 | percent 100; cap NO_TASKS; state **IN_PROGRESS** |
| EV-09 | Float boundary | W=10 Wd=9; single monk target r=10, m=9 (override), f=9 | T=0.9, S=0.9, x=0.9 exactly; **percent 90**; READY (guards `0.6·0.9+0.4·0.9` float error) |
| EV-10 | Overdue critical quest | percent 95, one critical leaf due yesterday not COMPLETED | G-CRIT FAIL → NOT_READY |
| EV-11 | Cancelled leaves ignored | leaves: A w2 COMPLETED, B w2 CANCELLED, C w2 IN_PROGRESS | W=4, Wd=2, T=0.5 |
| EV-12 | Monk with availability conflict not counted | monk target r=5, 5 assigned, 1 flagged conflict by Agent 02 | f=4 < m=5 → G-STAFF FAIL; G-CONFLICT FAIL; NOT_READY; monk gap=1 |
| EV-13 | Same person on two overlapping targets | volunteer P in "ต้อนรับ" 08–12 and "จราจร" 09–11 | counted once (earlier-created target); other target gets DOUBLE_BOOKED flag; f for it excludes P |
| EV-14 | Over-staffing | target r=10, f=14 | fill=1 (capped); gap=0; raw f=14 displayed |
| EV-15 | Maintenance feed unavailable | percent 92, `venue_problem = UNKNOWN` | unknown_gates [G-MAINT]; cap GATE_UNKNOWN; state ALMOST_READY, never READY |
| EV-16 | Open S2-or-worse maintenance at venue | `venue_problem = true` (open request severity S1 or S2 at default threshold S2; FM-13) | G-MAINT FAIL → NOT_READY (matches master "venue maintenance issues = 0") |
| EV-17 | Venue double-booked | another APPROVED event on same building overlapping | G-VENUE FAIL → NOT_READY unless event flagged `allow_shared_venue` (then overlap fact = false) |
| EV-18 | Approved event passes start without going LIVE | state APPROVED, t ≥ starts_at | NOT_READY, reason OVERDUE_START; UI prompts "เริ่มงาน หรือ เลื่อนวัน" |
| EV-19 | Reschedule | APPROVED event moved by 7 days | all assignments → NEEDS_RECONFIRM, excluded from f; readiness drops; audit row; notifications sent; leaf `due_at` of template-sourced quests shift by 7 d, manual ones do not |
| EV-20 | Duplicate from Temple Memory | copy of last year's กฐิน | structure, weights, gates, checklists, targets copied; **no** people/assignments/evidence/points; all leaves OPEN, f=0 → T=0, S=0, percent 0; G-STAFF FAIL → NOT_READY (correct: nothing is ready yet) |
| EV-21 | Draft event | state DRAFT | readiness null; not counted in Command Center Events panel |
| EV-22 | Event goes LIVE | transition at `starts_at` | snapshot frozen; later task changes do not alter `readiness_snapshot_at_start`; gaps still live |
| EV-23 | Cross-temple assignment attempt | assign a person without ACTIVE membership in this temple | rejected server-side; no row; audit; (P0 tenant rule) |
| EV-24 | Public view | `community_member` opens a public event | sees title/time/venue and "ต้องการอาสา N คน"; no readiness chip, no gates, no monk counts |
| EV-25 | Weight override | leaf w=5 COMPLETED among leaves with default weights | W and Wd use 5; verifies override respected, `w` bounds 1..5 enforced (w=0 or 6 rejected) |
| EV-26 | Target with r=0 | volunteer target r=0 | ignored by S, no gap, no gate |
| EV-27 | Event cancelled | cancel with reason | all open leaves CANCELLED, assignments CANCELLED, notifications; readiness absent; Command Center excludes |
| EV-28 | Lead leaves temple | `lead_person` membership becomes inactive | G-OWNER FAIL → NOT_READY, "ไม่มีผู้รับผิดชอบงาน" |
| EV-29 | Meal count with registration | event `registration`, 20 CONFIRMED registrants `meal_required`, 3 `meal_required` unset, 5 monks rostered | `count = 20`, `unset_meal_flags = 3`; monks excluded; `basis = registration` |
| EV-30 | Meal count without registration | `registration_mode = none`, `planned_estimate = 40` | `count = UNKNOWN`, `basis = none`, `planned_estimate = 40` returned separately; never summed into count |
| EV-31 | Meal function tenant/PII check | caller from temple B; and a caller with `headcount.view` D | temple B: denied, zero rows; D holder: payload has no person ids (assert by schema) |

## 9. Interface reconciliation with Agent 02 / 17 / 18 (re-checked 2026-10-07 against the final specs)

Status key: CONFIRMED = found in the final spec; ADJUSTED = my text changed to match; OPEN = still undecided.

| Id | Assumption | Result |
|---|---|---|
| A02-1 | Quest lifecycle, `parent_quest_id`, `depends_on`, COMPLETED semantics | CONFIRMED (`QUEST_LIFECYCLE_SPEC.md`; `event_root`, `volunteer` quest type with `organizer_approval`/`qr_checkin`/`attendance` verification) |
| A02-2a | Write `schedule_entries kind=ceremony` | CONFIRMED with ADJUSTMENT: `source_type` must be from core's enum `invitation \| event \| class_timetable \| trip \| manual` (+ `shift` from Agent 17); I now use `source_type = 'event'`, `source_id` = ceremony/event id (see Ceremony spec §6.1). Uniqueness `(source_type, source_id, person_id, kind, leg)` honoured. Authority: `ceremony.confirm_monks`; ceremony_lead writes under `schedule.manage` D (ceremony kind) per YAML. |
| A02-2b | Conflict flag per person | ADJUSTED: core exposes `conflicts[]` only to `availability.set_others` (T) holders and the monk (AVAILABILITY_SPEC §6, §9). Event readiness therefore consumes an **aggregate count via a SECURITY DEFINER function** (`unresolved_monk_conflicts`); managers see count and assignment ref, not reasons. Status: function itself OPEN (Agent 02 to expose). |
| A02-3 | Schedule kinds | ADJUSTED to the master set `{invitation, ceremony, teaching, class, duty, personal, travel, meal, leave, meeting}`. This domain writes only `ceremony` (and reads `meal` windows from Agent 17). Note: `SCHEDULE_INVITATION_SPEC.md` line 23 still lists 7 kinds; Agent 02 to align (OPEN, not my file). |
| A02-4 | Domain events | OPEN: `DOMAIN_EVENTS.md` §8 expects `event.created`, `event.cancelled`, `event.readiness_changed`, `ceremony.staffed`, `ceremony.cancelled`, `attendance.recorded` from this domain. Section 11 below now defines them (A02-4 closed on my side) (dotted convention). |
| A17-1 | Skill vocabulary | NOT CONFIRMED: none exists; Agent 02 uses free `required_skills[]` tags. ADJUSTED to `skill_tags[]` (free tags). Single vocabulary owner OPEN. |
| A17-2 | Kitchen headcount needs event meal counts (Agent 17 OQ-07, `KITCHEN.md` C3) | CONFIRMED and DELIVERED as contract in §2.5. Open: Agent 17 to use `headcount.view` D as the permission; meal windows reference `meal_service` / schedule kind `meal`. |
| A17-3 | Volunteer/staff availability for assignment | PARTIAL: staff presence (`STAFF_PRESENCE_SPEC.md`) covers *staff*, not volunteers; volunteer availability is Wave 6. Staff counted in targets only if membership ACTIVE; shift overlap check optional. OPEN |
| A18-1 | Maintenance feed with severity/threshold | CONFIRMED and ADJUSTED: use building `problem` flag (`MAINTENANCE_SPEC.md` §6: threshold default **S2**, configurable; un-triaged unknown severity counts as S2; FM-13 states the event hard gate). |
| A18-2 | Asset reservation API | NOT CONFIRMED (`ASSET_INVENTORY_SPEC.md` has no reservation operation): ceremony equipment stays a checklist; reservation OPEN. |
| A12-1 | Volunteer sign-up (Wave 6) | OPEN by design |
| A-att | `attendance` verification & `attendance.recorded` (QUEST_LIFECYCLE_SPEC lists "source: Agent 19/17") | OPEN: this domain records only an optional `actual_attendance` count and `meal_required`; **a per-person attendance record is not specified** (audit F-26). Needs an owner before any quest template uses `attendance`. |


## 10. Out of scope / open questions

1. Multi-temple joint events (e.g. a district กฐิน). HYPOTHESIS: one organising temple owns the event; other
   temples' people are not auto-added (tenant rule). Needs a design decision.
2. Donation/finance tracking for กฐิน/ผ้าป่า (F-43, post-pilot, legal review). Readiness has no money gate.
3. Whether temples want a visible score at all; pilot interviews must confirm the percent is useful versus just
   gates + gaps (R-03).
4. Weights/thresholds tuning requires real event data from the pilot; defaults are HYPOTHESIS.

## 11. Domain events produced (dotted convention of `DOMAIN_EVENTS.md`; audit F-24)

| Event | Producer | Payload (no sensitive data) | Consumers |
|---|---|---|---|
| `event.created` / `event.cancelled` (DOMAIN_EVENTS §8 names) and additionally `event.approved` / `event.started` / `event.completed` | event commands | event_id, kind, starts_at, actor | Command Center, notifications, audit |
| `event.readiness_changed` | readiness recompute, when state or percent bucket changes | event_id, from_state, to_state, percent, failed_gates[] | Command Center (manager audience only), notifications to lead |
| `event.rescheduled` | reschedule command | event_id, old/new window, assignments_flagged | notifications, Agent 02 schedule rows |
| `ceremony.roster_proposed` / `ceremony.staffed` / `ceremony.cancelled` | ceremony commands (`ceremony.staffed` fires when all confirmed >= monks_required) | ceremony_id, counts | Agent 02 (`schedule_entries`), Command Center |
| `event.meal_headcount_changed` | registration/assignment change affecting a meal window | event_id, window | Agent 17 kitchen headcount |
| `attendance.recorded` | **defined here only minimally**: emitted when the closing step records the aggregate `actual_attendance` of an event/ceremony (payload: event_id, count). Per-person attendance (needed by the `attendance` verification method) is **not defined** and has no owner (audit F-26); the event is reserved for it | quest verification `attendance` (future), Temple Memory |
| `memory.snapshot_created` | archive | event_id | Temple Memory index |
| `funeral.*` | **not published to the shared bus**; only an anonymised counter `funeral.rite_scheduled{count}` | counts only | Command Center counter |
Each event carries `temple_id`; delivery is tenant-scoped.
