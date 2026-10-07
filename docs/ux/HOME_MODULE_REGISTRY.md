# HOME MODULE REGISTRY — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 · Wave 1b · Readiness: **DESIGNED**
Merges: `docs/domain/workforce/MODULE_REGISTRY_INPUT.md` (Agent 17, 25 modules), facility and event homes
(Agents 18, 19; no separate module file was delivered, so their modules are derived from `VEHICLE_TRIP_SPEC.md` §4,
`MAINTENANCE_SPEC.md`, `SPATIAL_REGISTRY_SPEC.md` §5-7, `EVENT_BOSS_QUEST_SPEC.md` §6-7, `CEREMONY_OPERATIONS_SPEC.md`,
`FUNERAL_OPERATIONS_SPEC.md` §4), core homes (Agent 02 specs), and `ROLE_PERMISSION_MATRIX.md` §5.
Grants come from `docs/master/role_permissions.yaml`; every "Permission" cell below uses codes that exist there.
Where no code exists the cell says **none** and the gap is listed in section 7.

## 1. How the registry works

Home is assembled from modules keyed by **permission**, not by role (matrix §5). For one membership in the active
temple the client asks: *for each module in the role's composition (section 5), does the effective permission set
contain `required_permission` at an acceptable scope, and is the visibility condition true?* Then it renders the
module. Rules (all binding on Agent 04 and Wave 3+):

| # | Rule |
|---|---|
| R-1 | A module whose permission is absent is **not rendered** (no greyed card, no teaser). |
| R-2 | A visible module with no data renders its **empty state** (copy below); nothing is invented. |
| R-3 | Counts shown to roles without person-level rights come from aggregate functions; the payload holds no person ids (workforce rule 3). |
| R-4 | Unknown is rendered as "ไม่ทราบ" with a reason on tap, never 0, never blank, never grey-without-words. |
| R-5 | Modules that might render to a possible minor (`temple_boy`, samanera, any `minor`-flagged membership) contain no chat, call, DM, profile-visibility or location entry point. |
| R-6 | Temple custom roles (copies of templates) use the same engine: the composition for an unknown role is built by sorting the visible modules by the **default priority** column (P rank, then module id). |
| R-7 | The order in a role's composition is a default; a temple may reorder (settings), but cannot add a module the role lacks permission for. |
| R-8 | Simple Mode (ACCESSIBILITY_SIMPLE_MODE §5) shows only modules marked **S**, at most five, in composition order, plus the pinned controls. |
| R-9 | Every module that shows a number or state carries its source and age ("ข้อมูลเมื่อ hh:mm") reachable by tap. |
| R-10 | Monastic modules never show the other ledger and never show money (research doc 02 C1, C4). |

**Scope notation:** T temple, D department, Tm team, S self, A assigned-only, P public-only, C counts/coarse only, as in
the matrix. A module lists the *minimum* grant that makes it meaningful; a broader grant renders the same module with a
wider data scope.

**Pinned controls** (not modules; always available where the permission exists, outside the Simple-Mode cap):
`gl.checkin` check-in/out (`presence.set_self` S), `gl.report_problem` "แจ้งปัญหา" (`maintenance.report` T),
`gl.voice` voice note -> AI draft (P0 F-39, **hidden until Wave 7**), `gl.notifications` bell (none).

## 2. Module table — Monastic (id prefix `mo.`)

Columns: **Pri** = feature priority (FEATURE_MATRIX). **S** = shown in Simple Mode. **Default rank** = position per role
in the composition of section 5 ("-" = not in that role's composition).

| Module id | Title TH / EN | Required permission (scope) | Data source | Empty state (TH) | Unknown state (TH) | Pri | S | Default rank |
|---|---|---|---|---|---|---|---|---|
| `mo.my_day` | วันนี้ของฉัน / My Day | `schedule.view` (S+P bhikkhu; S+P samanera; T abbots) **and** `quest.view` (S) | CONFIRMED `schedule_entries` for me today (SCHEDULE §2) + my quest assignments due/started today (QUEST §3), ordered by start time; derived OVERDUE flagged | "วันนี้ยังไม่มีกิจที่กำหนด" + [ดูพรุ่งนี้] | Not applicable (empty is empty). If sources failed to load: "ยังโหลดตารางไม่ได้" (error state, STATE_PATTERNS §4), never "ไม่มีกิจ" | P0 | S | bhikkhu 1; samanera 4; abbot 5; deputy 5; assistant 5; secretary 5 |
| `mo.availability_toggle` | สถานะของฉัน / My availability | `availability.set_self` (S) | My `AvailabilityResult` (AVAILABILITY §2.2): effective_status, location_state, reason, valid_until; actions `set_status`, `clear_status`, optional `check_in` | Not applicable | Status "ไม่ทราบ" + reason line "ไม่มีการเช็กอินหรือตารางวันนี้" + button [ตั้งสถานะ] | P0 | S | bhikkhu 2; abbot/deputy/assistant/secretary via My Day tab |
| `mo.pending_ack` | รอรับทราบ / Awaiting acknowledgement | `invitation.view` (A) or `schedule.view` (S) | Team assignments with `monk_response = PENDING` (SCHEDULE §3.1) and ceremony assignments `PROPOSED/CONFIRMED` not acknowledged (CEREMONY §6.1) | (module hidden when none) | - | P0 | S | bhikkhu: banner above rank 1 when present |
| `mo.progress` | ความก้าวหน้ากิจวัตร / Daily duties progress | `quest.complete` (S) — carrier only, see G-UX-2 | Today's `monastic_daily` / `novice_learning` completion ratio; "ปฏิบัติแล้ว N วันในเดือนนี้" (`practice_days_this_month`, SCORING §7.1); the current run only as a plain number when it is 2 or more; **แต้มกิจวัตร** (`monastic_activity_score`) only if the monk turned numbers on. No grace-day display, no "streak broken" state (SCORING §7.1: nothing is lost) | "ยังไม่มีกิจวัตรวันนี้" | Source missing: "ไม่ทราบ" not 0 | P0 | | bhikkhu 3; samanera 3 |
| `mo.novice_today` | เรียนและหน้าที่วันนี้ / Today's class and duties | `quest.view` (S) **and** `schedule.view` (S+P) | `class` entries + `novice_learning` quests today (F-11) | "วันนี้ไม่มีคาบเรียน" | If attendance not recorded yet: "ยังไม่ลงเวลาเรียน" | P1 | S | samanera 1 |
| `mo.attendance` | การเข้าเรียน / Attendance | `quest.complete` (S) | Attendance records linking to `attendance` verification | "ยังไม่มีบันทึกการเข้าเรียน" | "ไม่ทราบ" for sessions without a record | P1 | | samanera 2 |
| `mo.map_shortcut` | แผนที่วัด / Temple map | none (any ACTIVE membership) — G-UX-1 | Buildings registry + layers by viewer scope (SPATIAL §5) | "ยังไม่มีข้อมูลอาคาร" | Layer unavailable: grey marker **with text** "ไม่ทราบ" (never zero) | P0 | | bhikkhu 4 |
| `mo.temple_contact_note` | ติดต่อวัด / Temple Contact | none (public channel) | Link to the public Temple Contact explainer: public cannot message monks directly | - | - | P1 | | not on home; reachable from ฉัน for explanation only |

## 3. Module table — Management and Command Center (prefix `cc.`, `mg.`)

| Module id | Title TH / EN | Required permission (scope) | Data source | Empty state (TH) | Unknown state (TH) | Pri | S | Default rank |
|---|---|---|---|---|---|---|---|---|
| `cc.summary` | ภาพรวมวัดวันนี้ / Temple today | `command_center.view` (T; D for fac/dept/ceremony leads; D(staff panel) temple_admin) | Six panels (COMMAND_CENTER_UX §3): snapshot counters with `computed_at` | Panel-level: "ยังไม่มีข้อมูลสำหรับแผงนี้" | Per counter "ไม่ทราบ" always displayed; panel stale chip | P0 | | abbot 1; deputy 1; assistant 1 |
| `mg.approvals` | รออนุมัติ / Approvals | any of `invitation.confirm`, `ceremony.confirm_monks`, `event.approve`, `event.volunteer_approve`, `quest.verify`, `points.award_community` | Queue of items the viewer may act on, by type, oldest first | "ไม่มีรายการรออนุมัติ" | - | P0 | | abbot 2; deputy 2; assistant 2; secretary 6 |
| `mg.today_events` | กิจกรรมวันนี้ / Today's events | `event.view` (T) | Events and ceremonies with window covering today, readiness state chip (EVENT §5.7) | "วันนี้ไม่มีกิจกรรม" | Readiness "ไม่ทราบ" + "ยังไม่มีแผนงาน" | P0 | | abbot 3; deputy 3; assistant 3 |
| `mg.invitations_awaiting` | กิจนิมนต์รอตัดสินใจ / Invitations awaiting decision | `invitation.confirm` (T; secretary only if delegated) | Invitations in TEAM_PROPOSED | "ไม่มีกิจนิมนต์รอยืนยัน" | - | P0 | | abbot 4; deputy 4; assistant 4 |
| `mg.invitations_inbox` (alias `wf.invitation_intake`) | กล่องกิจนิมนต์ / Invitation inbox | `invitation.manage` (T) | Invitations RECEIVED, REVIEWING, TEAM_PROPOSED; intake form | "ยังไม่มีกิจนิมนต์ใหม่" | Missing fields shown as "ไม่ทราบ" (distance, duration) with [กรอก] | P0 | | secretary 1; office_staff 3 |
| `mg.availability_board` | กระดานสถานะพระ / Availability board | `availability.view` (T full; C for ceremony_lead, office_staff) | `snapshot(temple_id, at)` counters + per-person status by tier (AVAILABILITY §9-10) | "ยังไม่มีพระในทะเบียน" | **ไม่ทราบ** bucket always shown with count | P0 | | secretary 2; ceremony_lead via event pages only |
| `mg.smart_assignment` | ข้อเสนอรายชื่อพระ / Assignment proposals | `invitation.manage` (T) | `AssignmentProposal` (SCHEDULE §5.6): ranked, reasons, excluded, blockers | "ไม่มีกิจนิมนต์ที่ต้องเสนอรายชื่อ" | Travel time Unknown: "ยังไม่ทราบเวลาเดินทาง — กรอกเอง" | P0 | | secretary 3 |
| `mg.schedule_today` | ตารางวันนี้ทั้งวัด / Today's schedule | `schedule.view` (T) | CONFIRMED entries for all, by hour; conflicts flagged | "วันนี้ไม่มีรายการในตาราง" | - | P0 | | secretary 4 |
| `mg.conflicts` | ความขัดแย้งตาราง / Schedule conflicts | `availability.set_others` (T) | `detect_conflicts` (AVAILABILITY §6): MANUAL_BLOCK_OVER_COMMITMENT, DOUBLE_BOOKED, G-CONFLICT | "ไม่พบความขัดแย้ง" | Unknown resolution error: person counted ไม่ทราบ and `data_quality.errors` shown | P0 | | secretary 7; abbot via cc panel |
| `mg.verify_queue` | คิวตรวจรับ / Verify queue | `quest.verify` (D or T) | Assignments in SUBMITTED within scope; overdue owner = VERIFIER shown as "รอตรวจรับ" | "ไม่มีงานรอตรวจรับ" | - | P0 | S | department_lead 1; facility_manager 5; ceremony_lead 5; abbots via approvals |
| `mg.contact_inbox` | กล่องข้อความวัด / Temple Contact inbox | `contact_inbox.manage` (T) | Public Temple Contact threads, routing state | "ยังไม่มีข้อความใหม่" | - | P1 | | secretary 8; office_staff 4 |
| `mg.points_awards` | คำขอแต้มอาสา / Community point awards | `points.award_community` (D or T) | Held/queued community-point awards for review (anti-cheat holds F-33) | "ไม่มีรายการรอพิจารณา" | - | P0 | | department_lead; facility_manager; ceremony_lead (inside approvals) |
| `mg.reports_summary` | รายงาน / Reports | `report.view` (T or D) | Temple reports index | "ยังไม่มีรายงาน" | - | P1 | | waiyawatchakon 2 |
| `wf.member_admin` | สมาชิกและบทบาท / Members and roles | `member.manage` (T) | Membership requests, invites, monastic attestation reviews | "ไม่มีคำขอใหม่" | - | P0 | | temple_admin 1 |
| `wf.moderation_queue` | คิวรายงาน / Moderation queue | `moderation.manage` (T) | Reports and blocks review | "ไม่มีรายงานค้างอยู่" | - | P1 | | temple_admin 2 |
| `wf.staff_presence_panel` | เจ้าหน้าที่วันนี้ (ภาพรวม) / Staff today | `command_center.view` (T / D(staff panel)) **and** `presence.view` | Six-state counters (STAFF_PRESENCE §5 + OFF_SHIFT per master) | "ยังไม่มีเวรวันนี้" | **ไม่ทราบ** with breakdown NO_SIGNAL / STALE / OFF_SHIFT | P1 | | inside `cc.summary` panel 2 |
| `mg.audit_shortcut` | บันทึกตรวจสอบ / Audit log | `audit.view` (T, abbot) | Audit log search | - | - | P1 | | abbot: in วัด nav only, not on landing |

## 4. Module table — Workforce (Agent 17, ids kept) and shared staff modules

Interim permissions in the input file (`PROPOSED`) are now real codes in the YAML; they are used here.

| Module id | Title TH / EN | Required permission (scope) | Data source | Empty state (TH) | Unknown state (TH) | Pri | S | Default rank |
|---|---|---|---|---|---|---|---|---|
| `wf.my_zones_today` | พื้นที่ของฉันวันนี้ / My zones today | `quest.view` (A) | Cleaning assignments today + zone info (CLEANING §6) | "วันนี้ไม่มีงานที่มอบหมาย" + claimable list | Zone location missing: "ไม่ทราบพื้นที่ — ถามหัวหน้า" | P1 | S | housekeeper 1 |
| `wf.cleaning_checklist` | เช็กลิสต์ทำความสะอาด / Cleaning checklist | `quest.complete` (S) | Active cleaning assignment checklist; before/after photo | (hidden if no active assignment) | - | P1 | S | housekeeper 2 |
| `wf.supplies` | วัสดุทำความสะอาด / Supplies | `inventory.view` (D) | Inventory levels | "ยังไม่มีรายการวัสดุ" | Level not counted: "ไม่ทราบ" (never 0) | P1 | | housekeeper 3 |
| `wf.meals_today_headcount` | มื้ออาหารวันนี้และจำนวนคน / Meals today + headcount | `headcount.view` (D; T for the four monastic managers) | Aggregate headcount function (KITCHEN §3): lower, upper, confirmed/known-away/unknown parts, planned (human) | "ยังไม่มีมื้อที่ต้องเตรียม" | Range plus "ไม่ทราบ N"; event guests Unknown -> upper "ไม่ทราบ"; "ยังไม่มีข้อมูลสถานะพระ" | P1 | S | kitchen_staff 1; department_lead (kitchen) 1 |
| `wf.kitchen_prep_quests` | งานเตรียมอาหาร / Prep quests | `quest.view` (A; D for lead) | Kitchen assignments | "วันนี้ยังไม่มีงานเตรียม" | - | P1 | S | kitchen_staff 2; kitchen lead 2 |
| `wf.stock_alerts` | สต็อกใกล้หมด / Stock alerts | `inventory.view` (D; T for fac_mgr, waiya) | Low-stock rule (ASSET_INVENTORY §4.1) | "สต็อกปกติ" only when counts exist | Items never counted: "ยังไม่ได้นับสต็อก" | P1 | | kitchen_staff 3; facility_manager 5; waiyawatchakon 4 |
| `wf.shopping_list` | รายการซื้อ / Shopping list | `inventory.view` (D) | QT-KIT-06 output | "ยังไม่มีรายการซื้อ" | - | P1 | | kitchen_staff 4; kitchen lead 4 |
| `wf.garden_zones_watering` | โซนและการรดน้ำ / Zones and watering | `quest.view` (A) | Garden assignments + zones | "วันนี้ไม่มีงานสวนที่มอบหมาย" | - | P1 | S | gardener 1 |
| `wf.equipment` | อุปกรณ์ / Equipment | `asset.view` (A for gardener; D for leads) | Assets assigned/custodian | "ยังไม่มีอุปกรณ์ที่ดูแล" | - | P1 | | gardener 2 |
| `wf.my_quests_today` | ภารกิจของฉันวันนี้ / My quests today | `quest.view` (A) | My assignments + claimable department quests; first row large "งานถัดไป" | "ยังไม่มีงาน" | - | P1 | S | gardener 3; staff_general 1; temple_boy 1; volunteer 1; ceremony_team 3; lay_resident 3; temple_admin 3 |
| `wf.team_roster` | ทีมวันนี้ / Team today | `presence.view` (D or T) | Coarse presence of own team, six states | "ยังไม่มีสมาชิกในทีมวันนี้" | "ไม่ทราบ" with reason; no late counts shown to peers | P1 | | kitchen lead 5; department_lead 3 |
| `wf.shift_handover` | เวรและส่งมอบ / Shift and handover | `presence.set_self` (S) | Shift entries + handover notes | "วันนี้ไม่มีเวร" | - | P1 | S | security_guard 1 |
| `wf.patrol_rounds` | เดินตรวจ / Patrol rounds | `quest.view` (A) | QT-SEC-02 + checkpoint scans | "วันนี้ไม่มีรอบเดินตรวจ" | - | P1 | S | security_guard 2 |
| `wf.gate_log` | บันทึกเข้า-ออก / Gate log | `security.log` (S) | Gate log entries (restricted retention) | "ยังไม่มีบันทึกในเวรนี้" | - | P1 | S | security_guard 3 |
| `wf.incident_report` | แจ้งเหตุ / Incident report | `security.log` (S) | Create incident; viewing others' incidents needs `security.incident.view` (restricted) | - (action only) | - | P1 | S | security_guard 4 |
| `wf.event_traffic_quests` | ภารกิจจราจรงาน / Event traffic quests | `quest.view` (A) | TRF assignments, event info | "ยังไม่มีงานจราจร" | Event parking info missing: "ไม่ทราบ" | P1 | S | traffic_staff 1 |
| `wf.documents_bookings` | เอกสารและการจอง / Documents and bookings | `document.view` (T) | F-42 | "ยังไม่มีเอกสาร" | - | **P2** | | office_staff 1; accountant 1 (hidden until F-42) |
| `wf.meetings` | การประชุม / Meetings | `schedule.view` (T for office_staff; S for others) | Schedule entries kind `meeting` (master §6.2; core SCHEDULE spec lacks the kind, see G-UX-9) | "ไม่มีการประชุม" | - | P2 | | office_staff 2; accountant 2 |
| `wf.finance_view` | การเงิน / Finance | `finance.view` (T) | F-43 | - | - | **P2 / post-pilot** | | accountant 3; waiyawatchakon 1 (hidden until F-43; never rendered for monastics as their own balance) |
| `wf.dept_board` (**new**) | กระดานงานฝ่าย / Department board | `quest.assign` (D) | Unassigned, claimable, overdue quests of the department; assign action | "ไม่มีงานค้างในฝ่าย" | - | P1 | | department_lead 2; facility_manager 6 |

## 5. Module table — Facility, vehicles, events, ceremony (prefix `fac.`, `ev.`)

| Module id | Title TH / EN | Required permission (scope) | Data source | Empty state (TH) | Unknown state (TH) | Pri | S | Default rank |
|---|---|---|---|---|---|---|---|---|
| `fac.workorders_open` | ใบสั่งซ่อมที่เปิดอยู่ / Open work orders | `maintenance.manage` (T; A for technician) | Requests not CLOSED/REJECTED/DUPLICATE/CANCELLED by severity S1..S4, SLA state (MAINTENANCE §3-4) | "ไม่มีใบสั่งซ่อมที่เปิดอยู่" | Untriaged severity: "ยังไม่คัดแยก (นับเป็น S2)" | P1 | S | technician 1; facility_manager 1; abbot_assistant via cc |
| `fac.map_maintenance_layer` | จุดที่มีปัญหาบนแผนที่ / Maintenance on map | `asset.view` (T) | Marker layer `maintenance` per building with problem flag (SPATIAL §5; threshold S2) | "ไม่มีอาคารที่มีปัญหา" | Layer source down: "ไม่ทราบสถานะอาคาร" (grey with words) | P1 | | technician 2; facility_manager 2 |
| `fac.pm_due` | ทรัพย์สินถึงรอบบำรุงรักษา / Assets due for PM | `asset.view` (T) | PM schedule + `last_serviced_at` | "ไม่มีรายการถึงรอบ" | Never serviced: "ไม่ทราบวันซ่อมล่าสุด" | P1 | | technician 3; facility_manager 3 |
| `fac.assets_scan` | สแกน QR ทรัพย์สิน / Scan asset QR | `asset.view` (A, D or T) | Scan -> asset card | - | Foreign/unknown token: "ไม่พบรายการ" | P1 | | pinned scan button for technician, facility_manager, housekeeper |
| `fac.vehicles_free` | รถคันไหนว่าง / Vehicles free | `vehicle.view` (T) | `vehicle_availability` (VEHICLE §6): FREE, BUSY, BLOCKED, UNKNOWN per window | "ยังไม่มีรถในทะเบียน" | Vehicle without affirmative status or driver: **"ไม่ทราบ"** never "ว่าง" | P1 | | facility_manager 4; secretary via invitation proposal; office_staff via intake |
| `fac.trips_unassigned` | เที่ยวรถที่ยังไม่มีรถ-คนขับ / Trips needing assignment | `vehicle.manage` (T) | Trips PLANNED / ON_HOLD | "ทุกเที่ยวมีรถและคนขับแล้ว" | Departure Unknown: "ยังไม่กำหนด" | P1 | | facility_manager 4 |
| `fac.today_trips` | เที่ยวรถวันนี้ / Today's trips | `vehicle.view` (A) | Driver's trips ordered by departure; card fields in VEHICLE §4 | "วันนี้ไม่มีเที่ยวรถ" | `planned_departure_at` null: "ยังไม่กำหนด" | P1 | S | driver 1 |
| `fac.vehicle_status` | สถานะรถของฉัน / My vehicle status | `vehicle.view` (A) | Vehicle state of assigned vehicle (+ EXPIRED DOCS flag) | "ยังไม่มีรถที่ได้รับมอบหมาย" | State UNKNOWN: "ไม่ทราบ" | P1 | S | driver 2 |
| `fac.report_vehicle_issue` | แจ้งปัญหารถ / Report vehicle issue | `maintenance.report` (T) | Creates request `source = trip_issue`, vehicle prefilled | - (action) | - | P1 | S | driver 3 |
| `ev.next_ceremony_readiness` | พิธีพร้อมหรือยัง / Next ceremony readiness | `event.view` (T) and `event.manage` (D) for detail | `readiness(event)` state, percent, failed_gates, gaps (EVENT §5-6) | "ไม่มีพิธีที่กำลังจะมาถึง" | State UNKNOWN: "ไม่ทราบ — ยังไม่มีแผนงาน" | P0 | S | ceremony_lead 1 |
| `ev.timeline` | กำหนดการพิธี / Ceremony timeline | `event.view` (T; A for undertaker) | Timeline offsets from `starts_at` (CEREMONY §2) | "ยังไม่มีกำหนดการ" | Offsets missing: "ยังไม่กำหนดเวลา" | P1 | S | ceremony_lead 2; ceremony_team 2 |
| `ev.checklist` | เช็กลิสต์พิธี / Ceremony checklist | `quest.view` (D for lead; A for team) | Leaf quests `ceremony_task` | "ยังไม่มีรายการตรวจ" | - | P1 | S | ceremony_lead 3; ceremony_team 1; undertaker 2 |
| `ev.monk_count` | จำนวนพระที่ยืนยัน / Confirmed monks | `event.manage` (D) | Monk target `f` vs `r`, pending `p` shown beside (EVENT §2.4); roster names for lead | "ยังไม่ได้กำหนดจำนวนพระ" | "ไม่ทราบ" if `monks_required` not entered (never inferred) | P1 | | ceremony_lead 4 |
| `ev.not_ready_events` | งานที่ยังไม่พร้อม / Events not ready | `event.view` (T) | PLANNING/APPROVED events in horizon (default 60 d) with NOT_READY or UNKNOWN | "ไม่มีงานที่ไม่พร้อม" | - | P0 | | inside cc Events panel |
| `ev.volunteer_gap` | อาสายังขาดกี่คน / Volunteers still needed | `event.manage` (D) or `event.view` (T) | Σ gap over volunteer targets per event/department (EVENT §2.4) | "ไม่มีตำแหน่งอาสาที่เปิด" | Targets not set: "ไม่ทราบ — ยังไม่ตั้งเป้าหมายกำลังคน" | P0 | | department_lead 4; ceremony_lead 6; cc Events panel |
| `ev.department_board` | กระดานฝ่ายในงาน / Event department board | `event.manage` (D) | Department sub-tree, tasks, targets | "ยังไม่มีงานในฝ่าย" | - | P1 | | department_lead; ceremony_lead (inside event detail) |
| `ev.volunteer_approvals` | อนุมัติอาสาสมัคร / Volunteer approvals | `event.volunteer_approve` (D) | Sign-ups awaiting department approval | "ไม่มีคำขอรออนุมัติ" | - | P1 | | inside `mg.approvals` |
| `ev.event_approvals` | อนุมัติงาน / Event approvals | `event.approve` (T) | Events in PLANNING needing approval | "ไม่มีงานรออนุมัติ" | - | P0 | | inside `mg.approvals` |
| `ev.funeral_assigned` | พิธีฌาปนกิจที่ได้รับมอบหมาย / My assigned funeral rites | `funeral.assigned.view` (A; D for lead) | Funeral rites with `assignment.person_id = me` and `valid_until >= now` (FUNERAL §4) | "ไม่มีพิธีที่ได้รับมอบหมาย" | - | P1 | S | undertaker 1; ceremony_team (when assigned) |
| `ev.funeral_intake` | ลงทะเบียนพิธีฌาปนกิจ / Funeral intake | `funeral.register.view` (T create/edit, office_staff) | Rites in ARRANGING; names masked per role | "ไม่มีพิธีที่กำลังจัดเตรียม" | - | P1 | | office_staff 5 |
| `ev.funeral_count` | พิธีฌาปนกิจวันนี้ (จำนวน) / Funerals today (count) | `command_center.view` | Count only, no names | "วันนี้ไม่มี" | - | P1 | | inside cc Events panel |
| `ev.temple_memory` | ความรู้ของวัด / Temple memory | `event.manage` (T or D) | Archived event snapshots, lessons; duplicate action | "ยังไม่มีงานที่เก็บไว้" | - | P1 | | inside Events admin; not home |

## 6. Module table — Community and Me (prefix `cm.`)

| Module id | Title TH / EN | Required permission (scope) | Data source | Empty state (TH) | Unknown state (TH) | Pri | S | Default rank |
|---|---|---|---|---|---|---|---|---|
| `cm.today_at_temple` | วันนี้ที่วัด / Today at this temple | `event.view` (T; P for community_member) | Today's events and public ceremonies: title, time, venue (public items for community_member) | "วันนี้วัดยังไม่มีกิจกรรมสาธารณะ" | - | P0 | S | community_member 1; lay_resident 1; volunteer 4 |
| `cm.volunteer_quests` | มีอะไรให้ช่วย / Ways to help | `quest.view` (P for community_member; A+P for volunteer, lay_resident) | `quest_type = volunteer`, `visibility = PUBLIC`, claimable, capacity not full; "ต้องการอาสา N คน (ฝ่าย X)" | "ตอนนี้ยังไม่มีงานอาสา" + [ติดตามวัด] | - | P0 | S | community_member 2; volunteer 5; lay_resident 2 |
| `cm.my_shifts` | งานอาสาของฉัน / My volunteer shifts | `quest.complete` (S) | My volunteer assignments + check-in (QR) | "ยังไม่ได้สมัครงานอาสา" | - | P0 | S | volunteer 1 (as `wf.my_quests_today`); community_member after signing up |
| `cm.events_upcoming` | กิจกรรมที่จะมาถึง / Upcoming events | `event.view` | Public (P) or all (T) events in next 30 days | "ยังไม่มีกิจกรรมที่จะมาถึง" | - | P1 | | community_member 3 |
| `cm.community_hub` | ชุมชน / Community | `community.participate` (S), not minor, community enabled | Connections, groups, chat entry | "ยังไม่มีการเชื่อมต่อ" | - | P1 | | community_member 4 |
| `cm.my_points` | แต้มร่วมกิจกรรมของฉัน / My boon points | `community.participate` (S) — lay only; carrier only (G-UX-2) | `community_boon_points` `available_balance` and history for this temple (label under test: แต้มร่วมกิจกรรม vs แต้มบุญชุมชน); optional private lay participation streak with one grace day per 7 days (SCORING §7.2), reset wording "เริ่มใหม่ได้เสมอ" | "ยังไม่มีแต้ม — ร่วมกิจกรรมแรกได้เลย" | Balance load error: "ไม่ทราบยอด" not 0 | P0 | | community_member 5; volunteer (inside ฉัน) |
| `cm.rewards` | ของที่ระลึกจากการร่วมกิจกรรม / Participation keepsakes | `community.participate` (S) | Catalog with stock and caps; redemption | "ยังไม่มีรายการ" | - | P0 | | via cm.my_points |
| `cm.temple_contact` | ติดต่อวัด / Temple Contact | none (public) | Compose, thread status | - | - | P1 | | link in every community home footer |

## 7. Permission cross-check and gaps (for Wave 3 and Opus)

Cross-check method: every composition in section 8 was walked against `role_permissions.yaml`. Result: each module in a
role's list is backed by a grant that role holds (or is conditional and hidden otherwise). Exceptions and gaps:

| ID | Finding | Resolution used here | Proposed owner/fix |
|---|---|---|---|
| G-UX-1 | **Map/building sheet access has no permission code.** Sections inside are gated by `asset.view`, `maintenance.report`, `event.view`, `quest.view`, `member.view`; the map itself would be reachable by any ACTIVE member. | Map open to every ACTIVE membership; each sheet section hidden by its own code; public map only shows public items. | Opus: add a `map.view` code or state "any active membership" in the matrix. |
| G-UX-2 | **Own score/balance has no code.** `monastic_activity_score` and `community_boon_points` views are self-scope facts. | `mo.progress` carried by `quest.complete` (S); `cm.my_points`, `cm.rewards` by `community.participate` (S). Neither is shown to the other mode. | Opus/Agent 11: add `score.view_self` or declare self-reads implicit (TENANCY G-1). |
| G-UX-3 | Monk **check-in** has no permission (AVAILABILITY G-A1). | Check-in appears inside `mo.availability_toggle` under `availability.set_self` (S), off by default (research doc 02 §5). | Agent 02 / Opus. |
| G-UX-4 | **Volunteer sign-up / quest claim** has no own code (QUEST G-Q1). | Uses `quest.view` + `quest.complete`. A `community_member` has `quest.view` P and `quest.complete` S, so can claim public quests; it must be verified that RLS does not let `P` read non-public quests via a claim. | Wave 3 test; Agent 02. |
| G-UX-5 | Monk **acknowledge / แจ้งติดขัด** has no code (SCHEDULE G-S1). | Appears for anyone with `invitation.view` (A) or `schedule.view` (S) as an assignee. | Agent 02. |
| G-UX-6 | `wf.equipment`: Agent 17 assumed `asset.view` D for gardener, YAML grants **A**. | Gardener sees assigned equipment only. | Agent 17 / Opus (acceptable). |
| G-UX-7 | `wf.team_roster`: no `presence.view` for non-lead staff (Agent 17 fallback was `member.view` Tm). | Roster hidden for staff without `presence.view`; they still see team names via `member.view` (Tm) in the directory. | Agent 17. |
| G-UX-8 | `waiyawatchakon`, `lay_resident`, `temple_admin` have **no matrix §5 home row**. | Compositions marked PROPOSED in section 8. | Opus: add rows to matrix §5. |
| G-UX-9 | Core `SCHEDULE_INVITATION_SPEC.md` lists kinds `invitation, ceremony, teaching, class, duty, personal, travel` and omits `meal`, `leave`, `meeting` that master `TEMPLE_DOMAIN_MODEL.md` §6.2 v0.2 adds. | Follow master: UI supports the three extra kinds. | Agent 02 (reconcile). |
| G-UX-10 | Priority vocabulary: core quests use `LOW/NORMAL/HIGH/URGENT`; Agent 19 and master use `critical`. | UI shows four levels "ต่ำ/ปกติ/สูง/เร่งด่วน"; "critical" gates in readiness use "เร่งด่วน". | Agent 02 / 19. |
| G-UX-11 | `minor_overrides` denies chat, calls and public profile but **not** `community.participate` itself; `temple_boy` may be a minor. | C5 hidden for minors (NAVIGATION §4.2); R-5 applies to all minor-capable accounts. | Matrix note. |

## 8. Home composition per role (default order = rank)

"Pinned" lines are controls, not modules. `+` marks a conditional module (shown only when its condition holds).
`(PROPOSED)` = matrix §5 has no row; order is Agent 03's recommendation. Source of order: matrix §5 unless noted.

### 8.1 Monastic Mode

| Role | Landing | Composition |
|---|---|---|
| `abbot` | วัด (overview) | `cc.summary` -> `mg.approvals` -> `mg.today_events` -> `mg.invitations_awaiting` -> `mo.my_day` ; pinned: `gl.report_problem`, `gl.voice`* |
| `deputy_abbot` | วัด | same as abbot (`temple.settings` restricted items hidden unless delegated) |
| `abbot_assistant` | วัด | same as abbot; plus `fac.workorders_open` inside `cc.summary` Facility panel (holds `maintenance.manage` T) |
| `monk_secretary` | วัด | `mg.invitations_inbox` -> `mg.availability_board` -> `mg.smart_assignment` -> `mg.schedule_today` -> `mo.my_day` -> `mg.approvals` (delegated items only) -> `mg.conflicts` -> `mg.contact_inbox` |
| `bhikkhu` | วันนี้ | `+mo.pending_ack` -> `mo.my_day` -> `mo.availability_toggle` -> `mo.progress` -> `mo.map_shortcut` |
| `samanera` | วันนี้ | `+mo.pending_ack` -> `mo.novice_today` -> `mo.attendance` -> `mo.progress` -> `mo.my_day` ; no management, no community ; minor-capable rules R-5 |

\* `gl.voice` appears only after Wave 7 and only produces AI drafts that a human accepts.

### 8.2 Community & Staff Mode

| Role | Composition (landing = หน้าหลัก unless noted) |
|---|---|
| `housekeeper` | `wf.my_zones_today` -> `wf.cleaning_checklist` -> `wf.supplies` -> (`gl.report_problem`) ; pinned: `gl.checkin`, scan |
| `kitchen_staff` | `wf.meals_today_headcount` -> `wf.kitchen_prep_quests` -> `wf.stock_alerts` -> `wf.shopping_list` ; pinned: `gl.checkin`, `gl.report_problem` |
| `department_lead` (kitchen) | `wf.meals_today_headcount` -> `wf.kitchen_prep_quests` -> `wf.stock_alerts` -> `wf.shopping_list` -> `wf.team_roster` -> `wf.dept_board` -> `mg.verify_queue` ; วัด tab (scope D) |
| `department_lead` (other departments) | `mg.verify_queue` -> `wf.dept_board` -> `wf.team_roster` -> `ev.volunteer_gap` -> `wf.my_quests_today` (PROPOSED) |
| `gardener` | `wf.garden_zones_watering` -> `wf.equipment` -> `wf.my_quests_today` |
| `technician` | `fac.workorders_open` -> `fac.map_maintenance_layer` -> `fac.pm_due` -> `wf.my_quests_today` ; pinned: scan |
| `facility_manager` | `fac.workorders_open` -> `fac.map_maintenance_layer` -> `fac.pm_due` -> `fac.vehicles_free` / `fac.trips_unassigned` -> `wf.stock_alerts` -> `wf.dept_board` -> `mg.verify_queue` ; วัด tab (scope D); no finance |
| `driver` | `fac.today_trips` -> `fac.vehicle_status` -> `fac.report_vehicle_issue` ; pinned: `gl.checkin`, call secretary |
| `ceremony_lead` | `ev.next_ceremony_readiness` -> `ev.timeline` -> `ev.checklist` -> `ev.monk_count` -> `mg.verify_queue` -> `ev.volunteer_gap` ; วัด tab (scope D) |
| `ceremony_team` | `ev.checklist` -> `ev.timeline` -> `wf.my_quests_today` ; pinned: `gl.checkin` |
| `undertaker` | `ev.funeral_assigned` -> `ev.checklist` ; pinned: `gl.checkin` ; no other event or people lists (assignment-scoped) |
| `security_guard` | `wf.shift_handover` -> `wf.patrol_rounds` -> `wf.gate_log` -> `wf.incident_report` (PROPOSED order) |
| `traffic_staff` | `wf.event_traffic_quests` -> `wf.my_quests_today` ; pinned: `gl.checkin`, `gl.report_problem` (PROPOSED) |
| `office_staff` | `wf.documents_bookings` (P2, hidden) -> `wf.meetings` -> `mg.invitations_inbox` -> `mg.contact_inbox` -> `ev.funeral_intake` ; finance hidden |
| `accountant` | `wf.documents_bookings` (P2) -> `wf.meetings` -> `wf.finance_view` (P2) ; pilot home therefore shows `wf.my_quests_today` only (`quest.view` A) |
| `waiyawatchakon` (PROPOSED) | `wf.finance_view` (P2, hidden at pilot) -> `mg.reports_summary` -> `wf.stock_alerts` -> `fac.pm_due` ; pinned: `gl.checkin`, `gl.report_problem` |
| `temple_admin` | `wf.member_admin` -> `wf.moderation_queue` -> `wf.my_quests_today` ; วัด tab (D staff panel, settings non-restricted) |
| `staff_general` | `wf.my_quests_today` -> (`gl.checkin`) -> (`gl.report_problem`) |
| `temple_boy` | `wf.my_quests_today` -> (`gl.checkin`) -> (`gl.report_problem`) ; Simple Mode default ; minor-safe |
| `lay_resident` (PROPOSED, HYPOTHESIS M-14) | `cm.today_at_temple` -> `cm.volunteer_quests` -> `wf.my_quests_today` ; pinned: `gl.checkin`, `gl.report_problem` |
| `volunteer` | `cm.my_shifts` (= `wf.my_quests_today`) -> (`gl.checkin`) -> (`gl.report_problem`) -> `cm.volunteer_quests` -> `cm.today_at_temple` |
| `community_member` | `cm.today_at_temple` -> `cm.volunteer_quests` -> `cm.events_upcoming` -> `cm.community_hub` -> `cm.my_points` ; footer: `cm.temple_contact` ; no `gl.report_problem` (`maintenance.report` is "-") |

Aggregate cap: a phone home shows at most **6 modules** before a "ดูเพิ่มเติม" fold, and Simple Mode at most 5.

### 8.3 Cross-role rules

1. A person with several roles in one temple gets the **union** of modules, ordered by the highest-ranked role's
   composition, de-duplicated; pinned controls are unioned. A monk holding a lay staff role stays in Monastic Mode
   (TENANCY §3, class E).
2. A person whose membership is flagged `minor` loses `cm.community_hub` and every module that exposes person-to-person
   features, whatever the role.
3. A person with no membership in the temple (public visitor) receives only the discovery surface (NAVIGATION §7), not
   a module home.
4. Temples may add a `department` to a role (e.g. a `department_lead` in cleaning); department-specific modules in
   section 8.2 are added when `membership_departments` matches.

## 9. Traceability

| Source | Used for |
|---|---|
| matrix §5 | Default orders (8.1, 8.2) |
| `MODULE_REGISTRY_INPUT.md` §2-3 | `wf.*` ids, titles, sources, Simple flags |
| `VEHICLE_TRIP_SPEC.md` §4-6 | driver and fleet modules |
| `SPATIAL_REGISTRY_SPEC.md` §5-7 | map layer, building sheet, north-star fields |
| `EVENT_BOSS_QUEST_SPEC.md` §5-7; `CEREMONY_OPERATIONS_SPEC.md` §6; `FUNERAL_OPERATIONS_SPEC.md` §4 | `ev.*` |
| `AVAILABILITY_SPEC.md` §2, 9, 10 | `mo.availability_toggle`, `mg.availability_board`, `cc.summary` |
| `QUEST_LIFECYCLE_SPEC.md` §2-8 | quest modules, claim, verify |
| `SCHEDULE_INVITATION_SPEC.md` §3, 5 | invitation modules |
