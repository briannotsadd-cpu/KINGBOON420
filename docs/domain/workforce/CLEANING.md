# CLEANING — Housekeeper (แม่บ้าน) workflow, quests and home

Owner: Agent 17 · Wave 1a · Readiness: **DESIGNED** (content is HYPOTHESIS until field-validated; see §10)
Master refs: `ROLE_PERMISSION_MATRIX.md` §2.2, §4, §5 · `TEMPLE_DOMAIN_MODEL.md` §5 · features F-25, F-20 (zones from Agent 18)

Convention: every real-world duty below that is not sourced is a **HYPOTHESIS** written from general knowledge of
shift-based facility cleaning, not from observation of a Thai temple. No web or field source was used in this file.

## 0. Quest template legend (used by all workforce files)

Quest fields follow `TEMPLE_DOMAIN_MODEL.md` §5.1. A *template* adds:

| Field | Meaning |
|---|---|
| `template_id` | Stable id, `QT-<DEPT>-<nn>` |
| `recurrence` | Concept only (daily / weekly / event-triggered). Generated as `source = recurring` or `template` |
| `window` | `starts_at` / `due_at` relative to the day (Asia/Bangkok) |
| `location` | A zone concept (`zone_ref`) supplied by Agent 18; never a free-typed building name when a zone exists |
| `claimable` | If true, any eligible person may self-claim (OPEN → ASSIGNED) |
| `evidence_policy` | `none` · `checklist_only` · `photo_optional` · `photo_required` · `photo_before_after` · `voice_optional` |
| `verification_policy` | One of the master list: `none · organizer_approval · staff_verification · qr_checkin · photo_evidence · location · attendance` |
| `points` | `0` for all workforce templates (see REPORT open question OQ-03: paid staff duties do not earn community points by default) |

A verifier is never the assignee (master §5.2). Who holds `quest.verify` for cleaning is a matrix gap (M-02, §9).

## 1. Role goals

| Goal | Measure (from data, never estimated) |
|---|---|
| Every assigned zone is cleaned at the planned time | quests of `quest_type = cleaning` COMPLETED before `due_at` / assigned |
| Visitors and monks never find a zone unprepared before a rite | cleaning child-quests of an event are COMPLETED before the event's start (Agent 19 readiness gate) |
| Supplies never run out unnoticed | supply check quests submitted; low-stock items flagged (Agent 18 inventory) |
| Problems are reported, not silently worked around | `maintenance.report` raised from the checklist |

## 2. Workflow

### 2.1 Daily (HYPOTHESIS — hours are temple-specific; configurable, not hard-coded)

| Step | Time (example, configurable) | System behaviour |
|---|---|---|
| Start of shift | per shift (`STAFF_PRESENCE_SPEC.md`) | One-tap check-in; home shows "My zones today" |
| Zone round 1 | early morning | QT-CLN-01 per assigned zone |
| Restroom rounds | 2–3 times / day | QT-CLN-02 |
| Pre-rite preparation | event-driven | QT-CLN-03 created as child of event (Agent 19) |
| Supplies check | end of day | QT-CLN-06 |
| End of shift | per shift | Handover note (optional for cleaning), check-out |

### 2.2 Weekly
Deep clean of rotating zones (QT-CLN-04); weekly supplies summary to the facility manager (view only here).

### 2.3 Who creates and assigns work
`housekeeper` has no `quest.create` / `quest.assign` (matrix §4). Recurring cleaning quests are generated from
templates by a **department-scoped manager**. The matrix defines no cleaning lead (M-02). Interim rule recommended
in REPORT: place `facility_manager` (and `office_staff` for assignment intake) in the `cleaning` department through
`membership_departments` so department scope **D** applies; no new role needed.

## 3. Quest templates

All templates: `quest_type = cleaning`, `department = cleaning`, `points = 0`, `required_role = housekeeper`,
`source = recurring` unless noted.

| ID | Title (TH / EN) | Recurrence · window | Location | Claimable | Assignee rule |
|---|---|---|---|---|---|
| QT-CLN-01 | ทำความสะอาดโซน / Zone clean | Daily · start 1 h before first scheduled rite or shift start, due per zone setting | one `zone_ref` | No | Rota assigns a person per zone per day |
| QT-CLN-02 | ตรวจและทำความสะอาดห้องน้ำ / Restroom round | 2–3× daily at fixed slots | restroom zone | Yes (any housekeeper on shift) | First claimant in the slot |
| QT-CLN-03 | เตรียมสถานที่ก่อนพิธี / Pre-rite preparation | Event-triggered; due 60 min before rite start (configurable) | event venue zone | No | Event department board (child of `event_root`; Agent 19 owns the parent) |
| QT-CLN-04 | ทำความสะอาดใหญ่ประจำสัปดาห์ / Weekly deep clean | Weekly rotating | rotating zone | No | Manager |
| QT-CLN-05 | เก็บกวาดหลังงาน / Post-event cleanup | Event-triggered; starts at event end, due +3 h (configurable) | event venue zone | Yes | Event board |
| QT-CLN-06 | ตรวจวัสดุทำความสะอาด / Supplies check | Daily at end of shift | store (concept) | No | Shift housekeeper |
| QT-CLN-07 | จัดการขยะ / Waste handling | Daily slots | bins (concept) | Yes | First claimant |

### 3.1 Checklists, evidence, verification

| ID | Checklist items (TH, EN gloss) | Evidence | Verification | Verifier |
|---|---|---|---|---|
| QT-CLN-01 | กวาด/ถูพื้น (sweep, mop) · เช็ดฝุ่นพื้นผิว (dust surfaces) · เก็บขยะ (empty bins) · จัดของเข้าที่ (reset items) · แจ้งปัญหา (report issue, optional) | `photo_after` for zones flagged `high_visibility`; otherwise `checklist_only` | `photo_evidence` for high_visibility zones, `none` otherwise | `quest.verify` D holder ≠ assignee |
| QT-CLN-02 | ตรวจกระดาษ/สบู่ (paper, soap) · ล้างสุขภัณฑ์ (clean fixtures) · ถูพื้น (mop) · ตรวจน้ำไหล (water works; fault → report) | `photo_optional` | `qr_checkin` (scan QR at restroom door at start and end) | System (QR scan pair) |
| QT-CLN-03 | ปัดกวาดถูพื้น (sweep/mop) · จัดเสื่อ/อาสนะตามผังที่ผู้จัดกำหนด (arrange mats/seats per plan from event board) · ตรวจแสง/พัดลมเบื้องต้น (basic lights/fans; fault → report) · เก็บของไม่เกี่ยวข้อง (clear unrelated items) | `photo_before_after` | `staff_verification` (event department lead confirms ready) | Event board owner (`quest.verify` D) |
| QT-CLN-04 | list per zone type defined by manager (free-form checklist, max 20 items) | `photo_before_after` | `staff_verification` | `quest.verify` D |
| QT-CLN-05 | เก็บขยะ (collect waste) · เก็บอุปกรณ์ (collect equipment, hand back via inventory) · ถูพื้น (mop) · ตรวจของหาย/ตกค้าง (lost-and-found items → general staff) | `photo_after` | `staff_verification` | Event board owner |
| QT-CLN-06 | นับ/ตรวจสบู่ น้ำยา ถุงขยะ ไม้ถู (count soap, cleaner, bags, mops) with level per item: พอ/ใกล้หมด/หมด (ok/low/out) | `checklist_only` | `none` | — (low/out levels create an inventory alert, Agent 18) |
| QT-CLN-07 | รวบรวมขยะ (gather) · แยกประเภท (separate, if temple practises it) · นำไปจุดทิ้ง (deliver to disposal point) | `checklist_only` | `none` | — |

Notes:
- Photos: before/after photos must not include people's faces by default; capture guidance text in Thai is shown on
  first use ("ถ่ายเฉพาะพื้นที่ ไม่ถ่ายหน้าคน"). Exif stripped on upload (`SECURITY_MODEL.md` §4).
- Restricted zones: some zones may only be entered at set times or with an escort (**HYPOTHESIS**: e.g. monastic
  living quarters, กุฏิ). The template does not assume; a zone carries an optional `access_note` (Agent 18) that is
  displayed at the top of the quest. See field question FQ-CLN-02.

## 4. Data needed

| Datum | Source | Notes |
|---|---|---|
| Today's cleaning assignments for the person | Quest engine (`quest_assignments`) | Core of home |
| Zone name, building, `access_note`, `high_visibility` | Agent 18 zones | Referenced by concept `zone_ref` |
| Upcoming events per zone | Agent 19 events (read via `event.view` T) | To raise priority before a rite |
| Supplies levels | Agent 18 inventory (`inventory.view` D) | Read-only for housekeeper |
| Problems reported | `maintenance.report` → Agent 18 | Housekeeper may create, not triage |
| Shift and check-in | `STAFF_PRESENCE_SPEC.md` | |

## 5. Home modules (order from matrix §5)

| # | Module id | Title TH / EN | Visible when |
|---|---|---|---|
| 1 | `wf.my_zones_today` | พื้นที่ของฉันวันนี้ / My zones today | has any cleaning assignment today (else shows "วันนี้ไม่มีงานที่มอบหมาย" with claimable quests) |
| 2 | `wf.cleaning_checklist` | เช็กลิสต์ทำความสะอาด / Cleaning checklist | an assignment is ASSIGNED or IN_PROGRESS |
| 3 | `wf.supplies` | วัสดุทำความสะอาด / Supplies | `inventory.view` D |
| 4 | `wf.report_problem` | แจ้งปัญหา / Report a problem | `maintenance.report` |

Pinned (not a module, proposal to Agent 03): a one-tap **check-in/out** control (`wf.check_in`) available from every
staff home. Rationale in `STAFF_PRESENCE_SPEC.md` §6. Simple Mode: modules 1 and 4 only, targets ≥ 56 px.

## 6. North-star question

**แม่บ้าน: "พื้นที่ไหนต้องทำ?"** (UX IA §5). Exact data that answers it, computed in one read:

```
assignments where person = me, quest_type = cleaning,
  status ∈ {ASSIGNED, IN_PROGRESS, BLOCKED}, local_date(starts_at or due_at) = today (Asia/Bangkok)
ordered by: derived OVERDUE first → due_at asc → priority desc
row = { zone name, building name, due_at, status, access_note?, event_in_zone_today? }
plus: claimable OPEN cleaning quests for my department (secondary list)
```
If there are zero assignments the screen says so explicitly; it never invents a "default zone".

## 7. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Housekeeper absent (sick/leave) | `STAFF_PRESENCE_SPEC.md` marks ON_LEAVE; their open quests are listed to the department manager with a **suggested** reassign to FREE housekeepers; a human confirms (no auto-assign). |
| E2 | Shift handover | Outgoing may leave a note per zone ("ห้องน้ำชั้น 2 ก๊อกน้ำรั่ว"). Open quests carry over only through human reassign. Handover optional for cleaning (required only for security). |
| E3 | Shortage (fewer housekeepers than zones) | Coverage flag from presence spec; manager sees unassigned zones as UNASSIGNED (derived); lowest-priority zones are dropped by manager decision, not by the system. |
| E4 | Event with short notice | Event board inserts QT-CLN-03; it outranks QT-CLN-01 of the same zone (same zone: the pre-rite quest subsumes the daily zone clean — CLN-01 for that zone is auto-marked "covered by CLN-03" only after human confirm). |
| E5 | Low-end phone / no signal | Checklist ticks and photos are queued offline with idempotency key = `quest_assignment_id` + item; submit happens on reconnect. |
| E6 | Wet hands / gloves | Large tick targets, photo via volume key or one tap, voice note instead of typing. |
| E7 | Hazard found (broken glass, wet floor) | Report problem → `maintenance.report` with severity; high severity surfaces to facility manager (Agent 18). |
| E8 | Quest rejected on verify | Returns to IN_PROGRESS with reason in Thai; counts nowhere against the person (no ranking of staff). |

## 8. What this role never sees
Finance, monastic availability, other temples, personal data beyond team-level directory (see §9).

## 9. Permission check against `ROLE_PERMISSION_MATRIX.md`

| Need | Matrix | Result |
|---|---|---|
| See own assignments | `quest.view` A | OK |
| Start/submit | `quest.complete` S | OK |
| Supplies levels | `inventory.view` D, `.manage` — | OK read-only; cannot record consumption (M-11) |
| Report problem | `maintenance.report` T | OK |
| Equipment/zone data | `asset.view` A | Partial: zones are not assets; see M-10 |
| Team directory | `member.view` Tm | OK (team-level) |
| Calendar | `schedule.view` S | OK |
| Check-in / shift | no permission code | **Mismatch M-03** |
| Verify cleaning quests | no cleaning role has `quest.verify` D | **Mismatch M-02** |

Mismatch ids are defined in `REPORT.md` §Evidence (M-01…M-18).

## 10. Field-research questions (replace HYPOTHESES)
- FQ-CLN-01: How many zones does one housekeeper cover per shift, and how are zones divided today (paper, LINE group, verbal)?
- FQ-CLN-02: Which zones have timing or access restrictions for lay staff (e.g. monastic quarters, ubosot)? Who decides?
- FQ-CLN-03: Who inspects the work today (abbot, a senior staff, nobody)?
- FQ-CLN-04: Do housekeepers have personal smartphones, shared devices, or none? Data plan? Literacy/reading comfort in Thai script and small text?
- FQ-CLN-05: Is cleaning done by lay supporters (volunteers, โยม) on weekends? If so they use `volunteer`, not `housekeeper`.
