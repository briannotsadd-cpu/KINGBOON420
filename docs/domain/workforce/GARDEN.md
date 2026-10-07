# GARDEN — Gardener (คนสวน) workflow, quests and home

Owner: Agent 17 · Wave 1a, revised in Wave 1 fix round · Readiness: **DESIGNED** (content HYPOTHESIS; see §9)
Master refs: matrix §2.2, §4, §5 · features F-25, F-20, F-22 · Legend: `CLEANING.md` §0

HYPOTHESIS notice: no source was used. Grounds care duties below come from general groundskeeping practice. The master
UX table (`UX_INFORMATION_ARCHITECTURE.md` §5) has **no north-star question for the gardener**; one is proposed in §6.

## 1. Role goals
Grounds look cared-for before rites and visits; plants are watered on schedule; equipment is usable and safe; hazards
(fallen branches, dead trees) are reported fast.

## 2. Workflow (HYPOTHESIS)

| Cadence | Work |
|---|---|
| Daily | Watering round by zone; sweep fallen leaves in assigned zones; equipment put back |
| Weekly | Mowing/trimming rotating zones; fertilising/pest check (as manager decides); equipment check and fuel |
| Event-driven | Pre-event grounds preparation; post-event pick-up |
| Seasonal | Heavy pruning, tree care — scheduled by the manager as one-off quests |

Assignment: `gardener` has no `quest.create/assign` (YAML). Quests are created, assigned and verified by a
`department_lead` with department `garden` or by a `facility_manager` (D). A gardener may raise `quest.request` (T).

## 3. Quest templates
All: `quest_type = garden`, `department = garden`, `points = 0`, `required_role = gardener`.

| ID | Title (TH / EN) | Recurrence · window | Location | Claimable | Evidence | Verification |
|---|---|---|---|---|---|---|
| QT-GAR-01 | รดน้ำต้นไม้ / Watering round | Daily, morning and/or evening slot | zone | No | `photo_optional` | `none` |
| QT-GAR-02 | กวาดใบไม้และเก็บกวาดลานวัด / Sweep leaves and grounds | Daily | zone | No | `photo_after` for `high_visibility` zones else `checklist_only` | `photo_evidence` (high_visibility) else `none` |
| QT-GAR-03 | ตัดหญ้า/ตัดแต่งกิ่ง / Mow and trim | Weekly rotating | zone | No | `photo_before_after` | `staff_verification` |
| QT-GAR-04 | ตรวจและเติมน้ำมันอุปกรณ์ / Equipment check and refuel | Weekly | equipment (assets, Agent 18) | No | `checklist_only` | `none` (faults → `maintenance.report` on the asset) |
| QT-GAR-05 | จัดสวนก่อนงาน / Pre-event grounds prep | Event-triggered, child of `event_root` (Agent 19) | event zone | No | `photo_before_after` | `staff_verification` by event board owner |
| QT-GAR-06 | ดูแลต้นไม้พิเศษ / Special plant care (e.g. sacred or heritage trees — HYPOTHESIS that such trees need named care) | Per manager | zone or asset | No | `photo_optional` | `staff_verification` |
| QT-GAR-07 | เก็บกวาดหลังงาน / Post-event grounds pick-up | Event-triggered | event zone | Yes | `photo_after` | `staff_verification` |

Checklist content (TH/EN): QT-GAR-01 น้ำพอ/ฝนตกแล้วข้าม (enough water; skip if rained — manual tick, no weather API) ·
QT-GAR-02 กวาด · เก็บขยะ · ตรวจกิ่งอันตราย (hazard branches) · QT-GAR-03 ตรวจสิ่งกีดขวางก่อนตัด (check obstacles) ·
สวมอุปกรณ์ป้องกัน (protective gear) · เก็บเศษ (clear debris) · QT-GAR-04 ใบมีด/น้ำมัน/สายไฟ (blade, fuel, cord) ·
เก็บเข้าที่ล็อก (stored and locked).

Safety: power tools near public areas — QT-GAR-03 shows a Thai safety reminder before start; no safety certification
claims are made (HYPOTHESIS: temples may have no formal safety rules; FQ-GAR-03).

## 4. Data needed

| Datum | Source |
|---|---|
| Today's assignments | Quest engine |
| Zones (name, type, `high_visibility`) | Agent 18 |
| Equipment list, status, location | Agent 18 assets (`asset.view` D) |
| Upcoming events by zone | Agent 19 |
| Consumables (fuel, fertiliser) | Agent 18 inventory (`inventory.view` D, no manage) |

## 5. Home modules (matrix §5 order)

| # | Module id | Title TH / EN | Visible when |
|---|---|---|---|
| 1 | `wf.garden_zones_watering` | โซนและการรดน้ำ / Zones and watering | has garden assignment today |
| 2 | `wf.equipment` | อุปกรณ์ / Equipment | `asset.view` D |
| 3 | `wf.my_quests_today` | ภารกิจของฉัน / Quests | `quest.view` A |

Report problem remains reachable from every staff home (`wf.report_problem`, `maintenance.report`).

## 6. North-star question (PROPOSED — not in master)
**"วันนี้ต้องดูแลโซนไหน รดน้ำที่ไหน?"** Data: assignments where `quest_type = garden`, status ∈ {ASSIGNED, IN_PROGRESS, BLOCKED},
local date today, joined to zone name and (for event-adjacent zones) the event start time; ordered OVERDUE → due_at →
priority. Zero rows is shown as zero.

## 7. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Gardener absent | Watering quests become UNASSIGNED-by-leave on the manager's list; reassign to FREE general staff or temple boy (human). Missed watering is not auto-backfilled. |
| E2 | Handover | Optional note: equipment left out, area half-done. |
| E3 | Shortage | Manager drops or defers QT-GAR-03/04 first; coverage flag displayed. |
| E4 | Rain | Gardener may mark a quest BLOCKED with reason "ฝนตก"; unblock next day; no penalty. |
| E5 | Hazard (leaning tree, wasps nest) | Report problem with severity; facility manager notified (Agent 18). |
| E6 | Tool damaged | Report on the asset via QR (Agent 18); quest QT-GAR-04 can be submitted with "blocked: equipment". |

## 8. Permission check (v0.2 / YAML)

| Need | YAML grant | Result |
|---|---|---|
| Own quests | `quest.view` A / `quest.complete` S | OK |
| Equipment | `asset.view` A | OK |
| Zones | no zone code | Open (Agent 18); interim via assigned-quest location |
| Consumables | `inventory.view` D, `inventory.record` D | OK |
| Request extra work | `quest.request` T | OK |
| Verify | `quest.verify` D (`department_lead`, `facility_manager`) | OK |
| Check-in | `presence.set_self` S | OK |

## 9. Field-research questions
- FQ-GAR-01: How big are the grounds, how many gardeners, and is watering manual or automated?
- FQ-GAR-02: Are there trees/plants with religious significance that need specific handling or a monk's approval?
- FQ-GAR-03: What tools are used; any safety rules or incidents?
- FQ-GAR-04: Who decides what the gardener does day to day?
