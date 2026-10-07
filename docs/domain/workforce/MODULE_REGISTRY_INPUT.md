# MODULE REGISTRY INPUT — workforce home modules for Agent 03

Owner: Agent 17 · Wave 1a, revised in Wave 1 fix round · Readiness: **DESIGNED**
Master refs: `ROLE_PERMISSION_MATRIX.md` §5 ("Home is assembled from a module registry keyed by permission, not by
hard-coded role checks"), §3 permission catalog · `UX_INFORMATION_ARCHITECTURE.md`.

## 1. How to read
- A module is shown when the viewer holds `required_permission` at the stated scope **and** the module's visibility
  condition is true. Default role order is only a default; a temple may reorder.
- Every permission code is a code in `docs/master/role_permissions.yaml`; scope is the minimum scope at which the module is meaningful (the YAML decides who holds it at which scope).
- Order in §3 follows matrix §5 where it defines one; otherwise marked "proposed order".
- Simple Mode (UX IA §4.4): shows modules flagged **S** only.
- Data source references concepts of other agents (zones, assets, events); no table names are promised.

## 2. Modules owned by Agent 17

| Module id | Title TH | Title EN | Required permission (scope) | Data source | Simple Mode | Spec |
| --- | --- | --- | --- | --- | --- | --- |
| `wf.my_zones_today` | พื้นที่ของฉันวันนี้ | My zones today | `quest.view` (A) | cleaning assignments today + zone info (Agent 18) | S | CLEANING §5–6 |
| `wf.cleaning_checklist` | เช็กลิสต์ทำความสะอาด | Cleaning checklist | `quest.complete` (S) | active cleaning assignment checklist | S | CLEANING §3.1 |
| `wf.supplies` | วัสดุทำความสะอาด | Supplies | `inventory.view` (D) | inventory levels (Agent 18) |  | CLEANING §4 |
| `wf.report_problem` | แจ้งปัญหา | Report a problem | `maintenance.report` (T) | creates maintenance request (Agent 18) | S | all |
| `wf.meals_today_headcount` | มื้ออาหารวันนี้และจำนวนคน | Meals today + headcount | `headcount.view` (D; T for monastic office roles) | availability resolver + event registrations + presence + manual adjustment | S | KITCHEN §3 |
| `wf.kitchen_prep_quests` | งานเตรียมอาหาร | Prep quests | `quest.view` (A / D) | kitchen assignments | S | KITCHEN §4 |
| `wf.stock_alerts` | สต็อกใกล้หมด | Stock alerts | `inventory.view` (D) | inventory low-stock (Agent 18) |  | KITCHEN §6 |
| `wf.shopping_list` | รายการซื้อ | Shopping list | `inventory.view` (D) | QT-KIT-06 output |  | KITCHEN §4 |
| `wf.garden_zones_watering` | โซนและการรดน้ำ | Zones and watering | `quest.view` (A) | garden assignments + zones | S | GARDEN §5 |
| `wf.equipment` | อุปกรณ์ | Equipment | `asset.view` (D) | assets (Agent 18) |  | GARDEN §4 |
| `wf.my_quests_today` | ภารกิจของฉันวันนี้ | My quests today | `quest.view` (A) | my assignments + claimable department quests | S | GENERAL §6 |
| `wf.check_in` | เช็กอิน/เช็กเอาต์ | Check-in / out | `presence.set_self` (S) | presence signals | S (pinned) | PRESENCE §3.2 |
| `wf.team_roster` | ทีมวันนี้ | Team today | `presence.view` (D full; C coarse for other staff) | presence resolver, coarse states |  | PRESENCE §5 |
| `wf.shift_handover` | เวรและส่งมอบ | Shift and handover | `presence.set_self` (S) | shift entries + handover notes | S | PRESENCE §3.3 |
| `wf.patrol_rounds` | เดินตรวจ | Patrol rounds | `security.log` (S) | QT-SEC-02 + checkpoint scans | S | SECURITY §3 |
| `wf.gate_log` | บันทึกเข้า-ออก | Gate log | `security.log` (S) to write, `security.log.view` (D / T) to read | gate log entries (restricted) | S | SECURITY §4.2 |
| `wf.incident_report` | แจ้งเหตุ | Incident report | `security.log` (S) | incident records (restricted) | S | SECURITY §4.3 |
| `wf.event_traffic_quests` | ภารกิจจราจรงาน | Event traffic quests | `quest.view` (A) | TRF assignments, event info | S | SECURITY §3 |
| `wf.documents_bookings` | เอกสารและการจอง | Documents and bookings | `document.view` (T), **P2** | F-42 |  | OFFICE §5 |
| `wf.meetings` | การประชุม | Meetings | `schedule.view` (T) | schedule entries kind meeting (not in master kinds — see REPORT M-07) |  | OFFICE §5 |
| `wf.invitation_intake` | รับกิจนิมนต์ | Invitation intake | `invitation.manage` (T) | invitations RECEIVED/REVIEWING (Agent 02/19) |  | OFFICE §5 |
| `wf.finance_view` | การเงิน | Finance | `finance.view` (T) | F-43 (**P2, post-pilot**) |  | OFFICE §5 |
| `wf.member_admin` | สมาชิกและบทบาท | Members and roles | `member.manage` (T) | F-06 |  | OFFICE §5 (proposed order) |
| `wf.moderation_queue` | คิวรายงาน | Moderation queue | `moderation.manage` (T) | moderation reports |  | OFFICE §5 |
| `wf.staff_presence_panel` | เจ้าหน้าที่วันนี้ (ภาพรวม) | Staff today (overview) | `command_center.view` (T / D, `panel_staff` for temple_admin) | presence counters (§5 spec) |  | PRESENCE §5 (Command Center panel, owned by Agent 03/06) |

## 3. Default home composition for roles in Agent 17's scope

| Role | Default order | Source of order |
|---|---|---|
| housekeeper | `wf.my_zones_today` → `wf.cleaning_checklist` → `wf.supplies` → `wf.report_problem` | matrix §5 |
| department_lead (kitchen) — formerly "kitchen_lead" | `wf.meals_today_headcount` → `wf.kitchen_prep_quests` → `wf.stock_alerts` → `wf.shopping_list` → `wf.team_roster` | matrix §5 (+ roster proposed); keyed by permissions, not by a role name |
| kitchen_staff | `wf.meals_today_headcount` → `wf.kitchen_prep_quests` → `wf.stock_alerts` → `wf.shopping_list` | matrix §5 |
| gardener | `wf.garden_zones_watering` → `wf.equipment` → `wf.my_quests_today` | matrix §5 |
| staff_general, temple_boy | `wf.my_quests_today` → `wf.check_in` → `wf.report_problem` | matrix §5 (volunteer / temple_boy / staff) |
| security_guard | `wf.shift_handover` → `wf.patrol_rounds` → `wf.gate_log` → `wf.incident_report` | proposed |
| traffic_staff | `wf.event_traffic_quests` → `wf.check_in` → `wf.report_problem` | proposed |
| office_staff | `wf.documents_bookings` → `wf.meetings` → `wf.invitation_intake` (finance hidden) | matrix §5 |
| accountant | `wf.documents_bookings` → `wf.meetings` → `wf.finance_view` | matrix §5 (modules hidden if permission absent) |
| temple_admin | `wf.member_admin` → `wf.moderation_queue` → `wf.my_quests_today` | proposed |

Pinned controls (not modules, proposal): `wf.check_in` is pinned on every staff home so matrix §5 orders remain valid.
For `temple_boy`, Simple Mode is the default (see GENERAL §6).

## 4. Rules for Agent 03
1. Hide a module whose permission is absent; never show a disabled, greyed module.
2. A module whose data is empty still renders with an explicit empty state ("วันนี้ไม่มีงาน"); never fabricate content.
3. Counts displayed to roles without person-level rights must come from aggregate functions (no person ids in payload).
4. Unknown values are labelled "ไม่ทราบ" (headcount ranges, presence).
5. Modules shown to `temple_boy` (possible minor) must not expose chat entry points (see GENERAL §2).

## 5. Modules owned by other agents (referenced only)
Driver trips, work orders, assets maintenance layer, vehicle (Agent 18); ceremony readiness, timeline, undertaker
rites (Agent 19); My Day, availability, Command Center shell, Temple Contact inbox (Agents 02/03/06/09).
