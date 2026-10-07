# COMMAND CENTER UX — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 · Wave 1b · Readiness: **DESIGNED**
Feature F-15 (protected core #1). Layout for phone, tablet and desktop; panels; drill-downs; how Unknown and conflicts
appear. Detailed low-fi screens: `WIREFRAMES.md` W01 (phone and desktop), W03, W07, W08. Counter definitions are those of
`docs/domain/core/AVAILABILITY_SPEC.md` §10 (two independent partitions, replacing the single list in master §4.3, see
REPORT conflict C-3), `docs/domain/workforce/STAFF_PRESENCE_SPEC.md` §5 (with the sixth state `OFF_SHIFT` per master v0.2),
`EVENT_BOSS_QUEST_SPEC.md` §5-6, `MAINTENANCE_SPEC.md` §6, `VEHICLE_TRIP_SPEC.md` §6, `SPATIAL_REGISTRY_SPEC.md` §5.

## 1. Principles

| # | Principle |
|---|---|
| CC-P1 | **Owns no data.** Every number is traceable to source rows by tapping it ("แหล่งที่มา"); nothing is estimated (master model §2). |
| CC-P2 | **Unknown is always visible.** The "ไม่ทราบ" tile is present in every panel that can have it; it is never merged, hidden or zero-filled. |
| CC-P3 | **Counts first, names second.** Names appear only for viewers whose scope allows, and only after a deliberate drill-down. |
| CC-P4 | **No ranking, no scorecards.** No panel compares monastics, lists "most/least active", or shows `monastic_activity_score` for anyone but the person (research doc 02 C4). Staff late counts per person are not shown to peers. |
| CC-P5 | **Decisions before statistics.** The first thing under the header is what this viewer must decide (approvals), because the abbot's question is "what must I decide?" (research P1). |
| CC-P6 | **Conflicts are shown, never resolved by the system.** |
| CC-P7 | Each panel is independently loaded and gated; one failing source degrades one panel, not the page. |
| CC-P8 | Only permitted panels render; a panel that the viewer may not see has no placeholder. |

## 2. Layouts

### 2.1 Phone (≤ 599 px): single column, panel cards

```
┌ [วัดศรีสุข ▾][โหมดพระภิกษุ] 🔔 👤 ┐
│ วันนี้ พุธ 7 ต.ค. 2569           │
│ ข้อมูลเมื่อ 10:42  [รีเฟรช]       │  age chip (§7)
├──────────────────────────────────┤
│ ① รออนุมัติ (3)            [ดู ›] │  decisions strip: only what THIS viewer can act on
├──────────────────────────────────┤
│ ② พระและสามเณร                    │  panel card: headline + 2×N tiles
│   ว่าง 3 │ ไม่ทราบ 2 │ ออกกิจ 4   │
│   [ดูทั้งหมด ›]                   │
├──────────────────────────────────┤
│ ③ เจ้าหน้าที่ ④ ภารกิจ ⑤ งาน/พิธี │  collapsed cards: headline only,
│ ⑥ อาคาร/รถ ⑦ ชุมชน               │  expand in place, one open at a time
└──────────────────────────────────┘
```
Behaviour: panel order = permission-driven priority (section 4.2); only the first two panels start expanded;
tiles are 2-up with >= 56 px height; tapping a tile opens the drill-down as a full-screen page with back to the same
scroll position; a sticky mini-header shows `computed_at` age after scrolling.

### 2.2 Tablet (600-1023 px): two columns

```
┌ top bar ───────────────────────────────────────────────┐
│ รออนุมัติ (3) ▸ (full-width strip)                      │
├───────────────────────────┬────────────────────────────┤
│ พระและสามเณร              │ งานและพิธี (ไม่พร้อม 2)     │
│ เจ้าหน้าที่               │ อาคารและรถ                  │
│ ภารกิจ                    │ ชุมชน                      │
└───────────────────────────┴────────────────────────────┘
 landscape: drill-down opens as a right-hand pane (master/detail), list stays visible on the left
```

### 2.3 Desktop (≥ 1024 px): three regions

```
┌ side nav ┬ header: date · computed_at · [รีเฟรช] · ถามช่วงเวลา: [ตอนนี้ ▾] ┬ detail pane ┐
│ วัด      ├────────────────────────────────────────────────────────────────┤ (opens on   │
│  ภาพรวม  │ รออนุมัติ strip                                                 │  drill-down;│
│  อนุมัติ │ ┌ พระและสามเณร ┐ ┌ เจ้าหน้าที่ ┐ ┌ ภารกิจ ┐                      │  closes with│
│  …       │ ├ งานและพิธี ┬ อาคารและรถ ┬ ชุมชน ┤                                │  Esc)       │
└──────────┴────────────────────────────────────────────────────────────────┴─────────────┘
 Content max width 1200; keyboard: Tab order = panel order; Enter opens drill-down; Esc closes pane; "g c" style shortcuts are not used (screen reader safe).
```
Print/export: none in Wave 1 (reports are `report.view`, separate).

## 3. Panels

Every panel has: header (Thai title, headline number, age chip), tiles, "ไม่ทราบ" tile where applicable, footer link
"แหล่งที่มา / วิธีนับ", and the gating permission. Tiles are buttons with an accessible name such as
"ว่าง 3 รูป จากทั้งหมด 12 รูป แตะเพื่อดูรายชื่อ".

### 3.1 Panel 1 — พระและสามเณร (Monastic)

Gate: `availability.view` (T full; **C coarse** for `ceremony_lead` (a department-scoped command_center holder) renders only three tiles ว่าง / ไม่ว่าง / ไม่ทราบ).
Source: `snapshot(temple_id, at)` (AVAILABILITY §10); every person resolved with the same `at`.

```
┌ พระและสามเณร · รวม 14 (พระ 11 · สามเณร 3)   ข้อมูลเมื่อ 10:42 ┐
│ สถานะ                                                        │
│ ว่าง 3 │ ออกกิจนิมนต์ 2 │ กำลังสอน 2 │ ทำพิธี 1 │ เดินทาง 0     │
│ ไม่พร้อม 1 ▸(ไม่พร้อม/กิจส่วนตัว/พักผ่อน) │ อยู่ในวัด-ยังไม่มีสถานะ 2 │
│ ┌─────────────────────────────────────────────┐             │
│ │ ? ไม่ทราบ 3   [ทำไมจึงไม่ทราบ ›]             │  ← never hidden
│ └─────────────────────────────────────────────┘             │
│ ที่อยู่ (นับแยก)  อยู่ในวัด 8 │ นอกวัด 2 │ ไม่ทราบ 4            │
│ ⚠ ความขัดแย้งตาราง 1 (สูง 1)            [ดู ›]   (เฉพาะผู้มีสิทธิ์)│
│ รวมสถานะ 14 = 14 · รวมที่อยู่ 14 = 14                        │
│ ของพระอาคันตุกะ 1 รูป (รวมอยู่ในตัวเลขข้างบน)                  │
└──────────────────────────────────────────────────────────────┘
```
Rules: two partitions (status, location) are visually separate bars each with its own sum line (CC-1, CC-2); the tile
"อยู่ในวัด-ยังไม่มีสถานะ" (resolved `IN_TEMPLE`) is separate from the location count "อยู่ในวัด" because a monk teaching
in the temple is in the temple but not free; "ว่าง" is only the explicit opt-in; "ไม่พร้อม" shows the three-way
breakdown on tap (reason **codes** such as SICK appear only for `availability.set_others` holders; others see counts);
persons whose resolution failed are counted Unknown and `data_quality.errors` is displayed as "ประมวลผลไม่สำเร็จ N คน
(นับเป็นไม่ทราบ)". Drill-down: tile -> W03 filtered list.

### 3.2 Panel 2 — เจ้าหน้าที่ (Staff)

Gate: `command_center.view` **and** `presence.view` (T: abbot, deputy, assistant, temple_admin; D: facility_manager,
department_lead, ceremony_lead); `temple_admin` is limited to this panel (`D(staff panel)` in the matrix).
Counters (six states, sum invariant): กำลังทำงาน, ว่าง, ลา, ปฏิบัติหน้าที่นอกวัด, ออกเวร, **ไม่ทราบ** (tap -> breakdown
NO_SIGNAL / STALE_CHECK_IN), plus separate "อยู่ในวัด". Footer: `WORKING+FREE+ON_LEAVE+OFF_SITE_DUTY+OFF_SHIFT+UNKNOWN = ทั้งหมด`.
Scope D: own department counts; the line "รวมผู้ช่วยแผนกอื่น" appears when secondary members enlarge the total.
Never shown: leave reason (sick/personal) in counters; per-person late counts; names without `presence.view` in scope.
Note: STAFF_PRESENCE_SPEC still lists five states with `UNKNOWN/OFF_SHIFT`; this UX follows master v0.2 (six) — see REPORT C-2.

### 3.3 Panel 3 — ภารกิจ (Quests)

Gate: `quest.view` (T for abbots and monk_secretary; D for leads, facility_manager, ceremony_lead).
Tiles: เปิดอยู่ (OPEN), กำลังทำ (ASSIGNED+IN_PROGRESS), ติดขัด (BLOCKED), **รอตรวจรับ** (SUBMITTED), เลยกำหนด (derived `OVERDUE`,
split "เลยกำหนด ผู้ทำ" vs "รอตรวจรับ เกินเวลา" using `overdue_owner`), ยังไม่มีผู้รับ (`UNASSIGNED`), ครบ/เสร็จวันนี้ (COMPLETED today).
By type chips (cleaning, kitchen, garden, maintenance, volunteer, event_task...) filter the drill-down. Unknown: none
expected; if the read model fails: tile error "ไม่ทราบ".
Drill-down: tile -> quest list (filters: department, type, priority "เร่งด่วน/สูง/ปกติ/ต่ำ") -> W05; "รอตรวจรับ" -> W06.

### 3.4 Panel 4 — งานและพิธี (Events)

Gate: `event.view` (T); detail of readiness needs a role other than `community_member` (EVENT §7).
Content (north-star "งานไหนยังไม่พร้อม", "อาสายังขาดกี่คน"):
```
┌ งานและพิธี ────────────────────────────────┐
│ วันนี้: พิธีสวดมนต์เย็น 17:00  [พร้อม 96%]   │
│ [ไม่พร้อม 2] [ไม่ทราบ 1] [กำลังเตรียม 3] [ใกล้พร้อม 1] │  tabs: default = ไม่พร้อม+ไม่ทราบ
│  • กฐิน 2569 · อีก 21 วัน · ไม่พร้อม · พระยังขาด 2 รูป │
│  • ผ้าป่า · อีก 9 วัน · ไม่ทราบ · ยังไม่มีแผนงาน       │
│ อาสายังขาด รวม 18 คน (3 งาน)   [ดูแยกฝ่าย ›]        │
│ พิธีฌาปนกิจวันนี้ 2 (จำนวนเท่านั้น)                  │
└──────────────────────────────────────────────────┘
```
Rules: horizon default 60 days; `NOT_READY` and `UNKNOWN` tab first, `IN_PROGRESS` and `ALMOST_READY` second tab; state chip
never green unless `READY`; each row shows the single most important gap in words (failed gate first); volunteer, monk
and staff gaps are separate numbers and never summed together; funerals show **counts only**. Drill-down: row -> W07.

### 3.5 Panel 5 — อาคาร รถ และของใช้ (Facility)

Gate: any of `asset.view`, `maintenance.manage`, `vehicle.view`, `inventory.view`; sub-tiles render per code held
(monk_secretary: vehicles only; facility_manager and abbots: all).
Tiles: อาคารที่มีปัญหา N (buildings with `problem = true`; threshold default S2; count equals the map markers, enforced
by test per MAINTENANCE §6), ใบสั่งซ่อมเปิด by severity (S1 วิกฤต, S2 สูง, S3 กลาง, S4 ต่ำ, ยังไม่คัดแยก), SLA เกินกำหนด,
รถ: ว่าง / จอง / ออกเดินทาง / ซ่อม / **ไม่ทราบ** (FREE needs an affirmative state and a known driver), เที่ยวรถที่ยังไม่มีรถ-คนขับ,
เที่ยววันนี้ (with departure Unknown count), วัสดุใกล้หมด N (items never counted listed as "ยังไม่ได้นับ", not zero).
Drill-down: อาคารที่มีปัญหา -> list by severity -> W08; รถ -> fleet list with window picker.

### 3.6 Panel 6 — ชุมชน (Community)

Gate: any of `points.award_community`, `moderation.manage`, `contact_inbox.manage`, `reward.manage`.
Tiles (counts only): คำขอแต้มรอพิจารณา (held awards), รายงานรอตรวจสอบ, ข้อความถึงวัดที่ยังไม่ตอบ, อาสาลงชื่อวันนี้, คำขอเข้าร่วมรออนุมัติ
(if `member.manage`). **Never** a ranking of volunteers, never monastic data. Drill-down opens the relevant queue.

## 4. Role-based composition

### 4.1 Which panels each role sees

| Panel | abbot, deputy, assistant (T) | monk_secretary (T) | facility_manager (D) | department_lead (D) | ceremony_lead (D) | temple_admin (D staff panel) |
|---|---|---|---|---|---|---|
| Approvals strip | invitation.confirm, ceremony.confirm_monks, event.approve, quest.verify, points.award_community as held | invitation.confirm (delegated), ceremony.confirm_monks (delegated), quest.verify | quest.verify (D), points (D) | quest.verify (D), event.volunteer_approve (D), points (D) | quest.verify (D), event.volunteer_approve (D), points (D) | none |
| 1 Monastic | full | full | hidden (no `availability.view`) | hidden | **coarse** (ว่าง / ไม่ว่าง / ไม่ทราบ) | hidden |
| 2 Staff | full | hidden (no `presence.view`) | D | D | D | **full for staff scope** |
| 3 Quests | T | T | D | D | D | hidden (A only) |
| 4 Events | T | T | T view, D manage | T view, D manage | T view, D manage | T view (counts) |
| 5 Facility | full | vehicles only | full | asset/inventory D | asset D | hidden |
| 6 Community | per codes | contact inbox, points | points D | points D | points D | moderation |

(`department_lead` is shown with the scope of its own department; kitchen lead also gets the headcount module on Home,
not here.) A role not listed with `command_center.view` (bhikkhu, housekeeper, ...) has no Command Center at all.

### 4.2 Panel order (default)

| Viewer | Order |
|---|---|
| abbot, deputy, assistant | Approvals -> Events (decisions) -> Monastic -> Facility -> Quests -> Staff -> Community |
| monk_secretary | Approvals -> Monastic -> Events -> Quests -> Facility (vehicles) -> Community |
| facility_manager | Facility -> Quests -> Staff -> Events -> Community |
| department_lead | Quests -> Staff -> Events -> Facility |
| ceremony_lead | Events -> Quests -> Staff -> Monastic (coarse) |
| temple_admin | Staff -> (Members and Moderation live in management nav) |

## 5. Drill-downs

Pattern: **tile -> filtered list -> item -> action**, always reachable by back; the list header repeats the tile number
and the filter ("ว่าง · 3 รูป") and flags if the list count differs from the tile (it must not; a mismatch shows
"ตัวเลขเปลี่ยนระหว่างโหลด [รีเฟรช]").

| Tile | List screen | Row fields | Item / action | Permission |
|---|---|---|---|---|
| ว่าง / ออกกิจนิมนต์ / สอน / ทำพิธี / เดินทาง / ไม่พร้อม / อยู่ในวัด-ยังไม่มีสถานะ | W03 filtered | name, `effective_status`, `location_state`, `valid_until`, `next_change_at`, conflict badge | person status detail (tier by role) | `availability.view` |
| ไม่ทราบ (monastic) | W03 group "ไม่ทราบ" | name, reason (ไม่มีสัญญาณ / หมดเวลา / เช็กอินเก่า) | [ขอให้ลงสถานะ] (quiet reminder; no status is set) | `availability.view` T |
| ความขัดแย้ง | conflict list | person, type, severity, overlap window, both sources | open each source entry; resolve by editing (human) | `availability.view` (T) |
| เจ้าหน้าที่ states | staff list | name, state, department, shift, flags (lead only) | presence detail | `presence.view` |
| ภารกิจ tiles | quest list | title, type, department, assignee (scope), due, status chip, OVERDUE owner | W05 / W06 | `quest.view` |
| Event row | event list | title, `starts_at`, `state`, top failed gate, gaps | W07 | `event.view` |
| อาสายังขาด | gap list | event, department, target, `r`, `f`, `p`, gap | department board | `event.manage` D or `event.view` T |
| อาคารที่มีปัญหา | building list by severity | name + code, top severity, open count, age, SLA | W08 | `asset.view` / `maintenance.manage` |
| รถ states | fleet list | nickname, plate, state, `free_from`, `free_until`, seats, `driver_available` | vehicle/trip detail | `vehicle.view` |
| ชุมชน tiles | queues | item, age, owner | queue item | per code |

"แหล่งที่มา / วิธีนับ" sheet on every panel: plain-language definition of each counter (for example "ว่าง = พระที่ตั้งสถานะ
พร้อมรับกิจเองและยังไม่หมดเวลา"), population rule (ACTIVE members; visiting included and reported separately), the computed
time, and the invariant lines.

## 6. How Unknown appears (decisions)

| Situation | Treatment |
|---|---|
| Counter with unresolved people | Separate "ไม่ทราบ N" tile in the same panel, same size as the others, with `?` icon and words. |
| Panel source fails | Whole panel body replaced by "ไม่ทราบ — โหลดข้อมูลไม่สำเร็จ [ลองอีกครั้ง]"; the rest of the page is unaffected. |
| Single metric not derivable (for example building people count without check-in data) | That metric reads "ไม่ทราบ" with its reason; neighbours show their values. |
| Event readiness `UNKNOWN` | Chip "ไม่ทราบ" + "ยังไม่มีแผนงาน"; counted in the "ไม่พร้อม+ไม่ทราบ" tab. |
| Vehicle free-ness | `UNKNOWN` bucket in fleet counts; never counted as ว่าง. |
| Future time question | Header control "ถามช่วงเวลา": for a future instant the panel shows confirmed numbers and a large "ไม่ทราบ" (most monks will be unknown); banner "ข้อมูลล่วงหน้า — ผู้ที่ยังไม่ลงสถานะไม่ถือว่าว่าง". The resolver must support evaluation at a future instant (OQ-06, carried to REPORT). |
| Totals | Always displayed even when parts are Unknown ("รวม 14"), so the viewer knows the denominator. |

Charts: if any chart is used (bars, stacked bars), Unknown has a hatched pattern and a text label; a table alternative is
always available (ACCESSIBILITY §4); donut charts are not used for partitions that include Unknown.

## 7. How conflicts appear

| Conflict | Where | Visible to | Presentation |
|---|---|---|---|
| `MANUAL_BLOCK_OVER_COMMITMENT` (HIGH/MEDIUM) | Panel 1 strip "ความขัดแย้งตาราง", W03 row badge, My Day (own only) | `availability.view` (T) holders; the monk himself | Count + severity word; drill-down shows both sources and "ระบบไม่ได้ยกเลิกรายการใดให้"; action owner = พระเลขานุการ |
| `DOUBLE_BOOKED` | same | same | same |
| Event gate `G-CONFLICT` | Panel 4 row, W07 failed-gates list | `event.view` with readiness detail | "พระ N รูปมีความขัดแย้งตาราง" -> opens the conflict list filtered to the event |
| Hard constraints in proposals | W04 | `invitation.manage` | Exclusion list with codes translated (never private reasons) |
| Data conflicts (version) | any form | editor | SP-09 |
Coarse-tier viewers (ceremony_lead, office_staff, bhikkhu) never see conflicts or reason codes.

## 8. Freshness and refresh

| Item | Rule |
|---|---|
| `computed_at` | Shown in the header and per panel; stale >60 s -> text+icon chip (STATE_PATTERNS §7) |
| Updates | Pull-to-refresh and [รีเฟรช]; realtime push may update tiles but never reorders or shifts content under the user's finger; a non-moving banner offers refresh |
| Event readiness | Recomputed on change; 15-minute tick near start |
| Offline | Shows last snapshot with absolute time; drill-downs available from cache; nothing is written |
| Performance target | First tiles from cache immediately; core UI interactive in < 2.5 s on 4G (3D_STRATEGY §3); Command Center never waits for 3D |

## 9. Privacy and safety decisions

1. Counts come from aggregate functions; payloads for roles without person-level rights contain no person ids (workforce rule 3, kitchen rule).
2. Names appear only inside drill-downs and only within the viewer's scope (`availability.view` T, `presence.view` D/T).
3. Health-related reasons (SICK) never appear in panel counters or broken-down views for broad roles; "ไม่พร้อม" only (research doc 03 §2).
4. Funeral data: counts only, no names (FUNERAL §4).
5. Minors (samanera, temple_boy): appear in counts like anyone; no photo, no contact detail in any panel.
6. Monastic activity score and community points never appear in the Command Center.
7. Demo tenants show the persistent demo strip (R-10).
8. The Command Center is read-only: every action (approve, assign, confirm) happens in the destination screen, which re-checks permission in the database.

## 10. AI summary placeholder (Wave 7, F-40)

A collapsed card at the top: "สรุปโดย AI วันนี้ (ตรวจกับตัวเลขต้นทาง)". Text is generated from the same snapshot; each
sentence links to its tile; if any number in the text differs from the tile, the text is hidden and replaced by
"สรุปไม่ตรงกับข้อมูล". It never contains monk-level or health detail, never recommends assigning a named monk, and the
abbot can hide it permanently. Until Wave 7 the card does not render.

## 11. Open questions

| ID | Question |
|---|---|
| CC-Q1 | Should the abbot-level strip include an explicit "ต้องตัดสินใจวันนี้" count (items due within 24 h) in addition to the total? Default: yes, as a sub-label. |
| CC-Q2 | Is the future-instant question ("ถามช่วงเวลา") a P0 control or a later add-on? It depends on OQ-06 (resolver future evaluation). |
| CC-Q3 | *Closed*: AVAILABILITY §9 gives `ceremony_lead` and `office_staff` the coarse tier (FREE/BUSY/UNKNOWN), matching the three tiles. |
| CC-Q4 | Should deputy_abbot see the Community panel's moderation tile (`moderation.manage` T: yes per matrix)? Default: yes. |
