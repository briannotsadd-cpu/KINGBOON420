# WIREFRAMES — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 · Wave 1b · Readiness: **DESIGNED** (low-fidelity structure only; no colour, type or motion)
21 screens (required minimum 12). All sample data is invented demo text (a fictional temple "วัดศรีสุข", fictional
people) and is not real; demo values show structure only. Date in samples: พุธ 7 ต.ค. 2569 (Wednesday 2026-10-07).

How to read:
- Boxes are phone width (about 36 columns) unless marked tablet/desktop. Thai combining marks make ASCII alignment
  approximate; proportions matter, not exact columns.
- `[ปุ่ม]` button · `( )` radio · `[x]` check · `▾` dropdown · `›` drill-down · `?` Unknown marker (icon shape + words).
- **Data:** lines name the fields (spec names) behind each region. **Perm:** exact permission codes.
  **States:** which patterns from `STATE_PATTERNS.md` apply. Flow links are in `FLOWS.md`.
- Wireframes fix structure for Agent 04; they do not prescribe visual style.

Index: W01 Command Center · W02 My Day · W03 Availability board · W04 Invitation proposal · W05 Quest detail ·
W06 Verify queue · W07 Event readiness · W08 Map and building sheet · W09 Housekeeper home · W10 Kitchen home ·
W11 Driver home · W12 Community home · W13 Volunteer quests · W14 Consent (PDPA/guardian) · W15 Temple switcher ·
W16 Report problem and work order · W17 Set my status · W18 Temple Contact · W19 Ceremony lead home and roster ·
W20 Approvals (abbot) · W21 Undertaker home.

---

## W01 Command Center (วัด > ภาพรวม)

Flow N-03 (and N-02, N-15..18). Route `/manage/command-center`. **Perm:** `command_center.view` (T / D); each panel by its own code (COMMAND_CENTER_UX §3-4).

### W01a Phone (abbot view)

```
┌────────────────────────────────────┐
│ [วัดศรีสุข ▾] [โหมดพระภิกษุ]  🔔 👤 │
├────────────────────────────────────┤
│ ภาพรวมวัด · พุธ 7 ต.ค. 2569         │
│ ข้อมูลเมื่อ 10:42 น.   [รีเฟรช]      │
├────────────────────────────────────┤
│ รออนุมัติ 3                    [ดู ›]│
│  • กิจนิมนต์ 12 ต.ค. (รอยืนยันทีม)   │
│  • งานกฐิน (รออนุมัติวันและสถานที่)  │
│  • ตรวจรับงาน 1                      │
├────────────────────────────────────┤
│ ▼ พระและสามเณร  รวม 14              │
│  ว่าง 3     │ ออกกิจนิมนต์ 2        │
│  กำลังสอน 2 │ ทำพิธี 1              │
│  ไม่พร้อม 1 │ เดินทาง 0             │
│  อยู่ในวัด-ยังไม่มีสถานะ 2          │
│  ┌──────────────────────────────┐  │
│  │ ?  ไม่ทราบ 3  [ทำไม ›]        │  │
│  └──────────────────────────────┘  │
│  ที่อยู่: ในวัด 8 · นอกวัด 2 · ไม่ทราบ 4│
│  ⚠ ความขัดแย้งตาราง 1  [ดู ›]       │
│  รวมสถานะ 14=14 · รวมที่อยู่ 14=14   │
│  [แหล่งที่มา / วิธีนับ]              │
├────────────────────────────────────┤
│ ▼ งานและพิธี   [ไม่พร้อม 2][ไม่ทราบ 1]│
│  กฐิน 2569 · อีก 21 วัน · ไม่พร้อม   │
│   พระยังขาด 2 รูป · อาสายังขาด 5 คน  │
│  อาสายังขาดรวม 18 คน   [แยกฝ่าย ›]   │
│  พิธีฌาปนกิจวันนี้ 2 (จำนวนเท่านั้น) │
├────────────────────────────────────┤
│ ▶ อาคาร รถ ของใช้ (มีปัญหา 1)       │
│ ▶ เจ้าหน้าที่ (ไม่ทราบ 2)           │
│ ▶ ภารกิจ (รอตรวจรับ 4)              │
│ ▶ ชุมชน                             │
├────────────────────────────────────┤
│ วัด │ วันนี้ │ ภารกิจ │ ตาราง │ ⋯    │
└────────────────────────────────────┘
```
**Data:** approvals queue (items the viewer may act on); `snapshot(temple_id, at)` counters; `conflicts[]` count; event `state`, `failed_gates`, gaps; panel source and `computed_at`.
**Notes:** only two panels open at start; unknown tile always present; counts for ceremony_lead show 3 coarse tiles; tiles are buttons >= 56 px.
**States:** SP-01 skeleton tiles; SP-06 Unknown tile; SP-07 age chip; per-panel SP-03 error "ไม่ทราบ — ลองอีกครั้ง"; SP-05 P-1 for panels without permission; SP-04 cached snapshot.

### W01b Desktop (abbot view, three regions)

```
┌─────────┬──────────────────────────────────────────────────────────────┬────────────────┐
│ วัด     │ ภาพรวมวัด · พุธ 7 ต.ค. 2569   ข้อมูลเมื่อ 10:42 [รีเฟรช]        │ รายละเอียด      │
│ ·ภาพรวม │ ถามช่วงเวลา: [ตอนนี้ ▾]                                       │ (drill-down)   │
│ ·อนุมัติ├──────────────────────────────────────────────────────────────┤                │
│ ·กิจนิมนต์│ รออนุมัติ 3  [กิจนิมนต์ 1][งาน 1][ตรวจรับ 1]        [ดูทั้งหมด›]│ ว่าง · 3 รูป    │
│ ·พระ    ├───────────────────────┬──────────────────┬───────────────────┤ ──────────────│
│ ·เจ้าหน้าที่│ พระและสามเณร  14      │ งานและพิธี         │ อาคาร รถ ของใช้     │ พระ…  ว่าง→17:00│
│ ·งาน/พิธี│ ว่าง 3 ออกกิจ 2 สอน 2 │ ไม่พร้อม 2 ไม่ทราบ 1│ อาคารมีปัญหา 1     │ พระ…  ว่าง→ 12:00│
│ ·อาคาร  │ ทำพิธี 1 ไม่พร้อม 1   │ กฐิน อีก 21 วัน…   │ ใบสั่งซ่อม S1:0 S2:1│ พระ…  ว่าง→ สิ้นวัน│
│ ·ชุมชน  │ ? ไม่ทราบ 3            │ อาสายังขาด 18 คน   │ รถ ว่าง 1 ไม่ทราบ 1 │                │
│ ·ตั้งค่า├───────────────────────┼──────────────────┴───────────────────┤ [ปิด Esc]      │
│         │ เจ้าหน้าที่ (6 สถานะ)   │ ภารกิจ · รอตรวจรับ 4 · เลยกำหนด 2        │                │
│         │ ทำงาน 5 ว่าง 2 ลา 1     │ ชุมชน · คำขอแต้ม 3 · รายงาน 0           │                │
│         │ นอกวัด 1 ออกเวร 4 ?2    │                                        │                │
└─────────┴───────────────────────┴────────────────────────────────────────┴────────────────┘
```
**Notes:** panel order from COMMAND_CENTER_UX §4.2; keyboard: Tab through panels, Enter opens detail, Esc closes; tablet uses two columns with a right pane in landscape.

---

## W02 My Day (วันนี้)

Flow N-01. Route `/day`. **Perm:** `schedule.view` (S+P), `quest.view` (S), `availability.set_self` (S).

```
┌────────────────────────────────────┐
│ [วัดศรีสุข ▾] [โหมดพระภิกษุ]  🔔 👤 │
├────────────────────────────────────┤
│ วันนี้ พุธ 7 ต.ค. 2569              │
│ ┌ รอรับทราบ 1 ────────────[ดู ›]──┐ │
│ └──────────────────────────────────┘ │
│ สถานะของฉัน                         │
│ ? ไม่ทราบ · ไม่มีเช็กอินหรือตารางวันนี้│
│ [ตั้งสถานะ]  [เช็กอิน]*  (*ถ้าวัดเปิดใช้)│
├────────────────────────────────────┤
│ 04:30  สวดมนต์ทำวัตรเช้า     ในวัด    │
│        พระอุโบสถ · ✓ รับทราบแล้ว     │
│ 08:25  เดินทาง (ไป)          นอกวัด   │
│ 09:00  กิจนิมนต์ บ้านคุณสมชาย         │
│        ทำบุญบ้าน · หัวหน้าคณะ         │
│        รถวัด: ตู้ 3 · คนขับ นายสมชัย   │
│        [รับทราบ]  [แจ้งติดขัด]        │
│ 11:35  เดินทาง (กลับ)        นอกวัด   │
│ 13:00  เรียน/สอน วิชาธรรม     ในวัด    │
│ ภารกิจ                              │
│ ☐ ตรวจเครื่องบริขาร   ก่อน 15:00 2/3 │
├────────────────────────────────────┤
│ กิจวัตรวันนี้  ✓✓✓✓☐☐  4/6           │
│ ปฏิบัติแล้ว 12 วันในเดือนนี้          │
│ (ไม่แสดงแต้ม — เปิดดูได้ใน ฉัน)       │
├────────────────────────────────────┤
│ วัน นี้ │ ภารกิจ │ ตาราง │ แผนที่ │ ฉัน│
└────────────────────────────────────┘
```
**Data:** `AvailabilityResult` (effective_status, location_state, valid_until, next_change_at, own conflicts); `schedule_entries` today (kind, status CONFIRMED, starts_at/ends_at, venue, leg, source); `team[].role`, `monk_response`; trip driver name and plate; quest assignments (title, due_at, checklist n/m, derived OVERDUE); `mo.progress` ticks and `practice_days_this_month`. Monastic score numbers hidden unless the monk enabled them; nothing is shown when a day had no practice.
**Notes:** "ไม่ทราบ" is the honest status when nothing is set; the monk is never shown as "ว่าง" by default. "แจ้งติดขัด" never cancels. Reason of own status visible to the monk only.
**States:** SP-02 empty "วันนี้ยังไม่มีกิจที่กำหนด [ดูพรุ่งนี้]"; SP-06; SP-04 cached; SP-09 own conflict badge; samanera variant puts คาบเรียน and หน้าที่ first and hides ภารกิจ creation.

---

## W03 Availability board (กระดานสถานะพระ)

Flow N-02. Route `/manage/availability`. **Perm:** `availability.view` (T; C coarse), `availability.set_others` (T) for conflicts and on-behalf.

```
┌────────────────────────────────────┐
│ กระดานสถานะพระ · ตอนนี้ [เปลี่ยน ▾] │
│ ข้อมูลเมื่อ 10:42   [รีเฟรช]         │
├────────────────────────────────────┤
│ พร้อมออกกิจ (ว่างที่ยืนยันเอง)  3 รูป │
│ แต่ไม่ทราบสถานะ                 3 รูป │
│ [ ว่าง 3 ][ไม่ทราบ 3][ออกกิจ 2][สอน 2]│
│ [ทำพิธี 1][เดินทาง 0][ไม่พร้อม 1]     │
│ [อยู่ในวัด-ยังไม่มีสถานะ 2]           │
│ ที่อยู่: ในวัด 8 · นอกวัด 2 · ไม่ทราบ 4│
│ ⚠ ความขัดแย้ง 1  [ดู ›]             │
├────────────────────────────────────┤
│ ว่าง (3)                            │
│  พระ… ในวัด · ถึง 17:00               │
│  พระ… ในวัด · ถึง 12:00               │
│  พระ… ในวัด · ถึง สิ้นวัน               │
│ ? ไม่ทราบ (3)  ← กลุ่มของตัวเอง        │
│  พระ… ไม่มีสัญญาณ        [ขอให้ลงสถานะ]│
│  พระ… เช็กอินเกิน 12 ชม. [ขอให้ลงสถานะ]│
│  พระ… สถานะหมดเวลา 10:00 [ขอให้ลงสถานะ]│
│ ออกกิจนิมนต์ (2)   สอน (2)   …        │
│ รวม 14 = 14                          │
└────────────────────────────────────┘
```
**Data:** `snapshot` counters (AVAILABILITY §10); per person: name, `effective_status`, `location_state`, `valid_until`, `next_change_at`, `conflicts[]`, `reason.code` (full tier shows SICK; operational tier "ไม่พร้อม"), the list is ordered by name (Thai collation) or by `next_change_at` and **never by พรรษา, activity score or any comparison of persons** (no ranking of monastics); พรรษา is not shown on this screen; `of_which_visiting`; `data_quality.errors`.
**Notes:** "ถามช่วงเวลา" for the future shows confirmed counts and "ไม่ทราบ N" prominently; [ขอให้ลงสถานะ] sends a quiet reminder only. Tiers: office_staff/ceremony_lead see 3 coarse tiles and no names' reasons or conflicts; bhikkhu with `availability.view` C sees only ว่าง/ไม่ว่าง/ไม่ทราบ coarse per person (IN_TEMPLE shows as ไม่ทราบ).
**States:** SP-06; SP-07; SP-05 P-5 masked reason; SP-02 "ยังไม่มีพระในทะเบียน".

---

## W04 Invitation proposal (Smart Assignment)

Flow J-01. Route `/manage/invitations/{id}/proposal`. **Perm:** `invitation.manage` (T) to propose; confirmation is W20 (`invitation.confirm`).

```
┌────────────────────────────────────┐
│ ← กิจนิมนต์ · ทำบุญบ้าน             │
│ สถานะ: กำลังตรวจสอบ                  │
│ เจ้าภาพ คุณสมชาย · 081-xxx-xxxx      │
│ 12 ต.ค. 2569 09:00 · 2 ชม. · ต้องการ 2 รูป│
│ บ้านเจ้าภาพ ต.… · 12 กม. · ขนส่ง: รถวัด │
├────────────────────────────────────┤
│ ช่วงเวลาที่ต้องว่าง                  │
│ ออก 08:25 → พิธี 09:00–11:00 →       │
│ ถึงวัด 11:35 → เผื่อกลับ → 12:05     │
│ เวลาเดินทางต่อเที่ยว 35 นาที          │
│ ที่มา: (●)กรอกเอง ( )บันทึกของสถานที่นี้│
│       ( )ระบบเส้นทาง  [บันทึกไว้สำหรับสถานที่นี้]│
│ ถ้าไม่ทราบ: "ไม่ทราบเวลาเดินทาง —     │
│  ยังเสนอทีมได้ แต่เวลาเผื่อกลับ = ไม่ทราบ│
│  (ต้องรับทราบก่อนยืนยัน)"             │
├────────────────────────────────────┤
│ ว่างตามที่แจ้งไว้ตลอดช่วง (ระบบแนะนำ)  │
│ ☑ พระ…   [เหตุผล ›]                  │
│   ว่างตลอดช่วง · ไปไม่บ่อยในเดือนนี้    │
│ ☑ พระ…   [เหตุผล ›]                  │
│ ───────────────────────────────────│
│ ต้องโทรถามก่อน (ยังไม่ได้ลงสถานะ)      │  ← needs_confirmation, separate list,
│ ☑ พระ…  ⚠ ยังไม่ได้ลงสถานะ            │    always below the first list
│ ☐ พระ…  (สำรอง)                      │
│ ไม่รวมในรายชื่อ (3)  [ดูเหตุผล ›]    │
│  พระ… ติดกิจอื่นในช่วงนี้              │
│  พระ… ไม่ว่างในช่วงนี้                 │
│ [รายละเอียดการคำนวณ ▾] (เฉพาะผู้เสนอ)  │
├────────────────────────────────────┤
│ หัวหน้าคณะ: [เลือก] (ยังไม่ทราบพรรษา)  │
│ รถและคนขับ: ยังไม่ได้จอง ⚠ NO_VEHICLE │
│ สร้างโดย: เลือกเอง/ระบบแนะนำ (SMART)  │
│ [เสนอทีมให้ตัดสินใจ]                 │
│ ผู้เสนอ: พระเลขานุการ…                │
└────────────────────────────────────┘
```
**Data (AssignmentProposal, SCHEDULE §5.6):** `window{block_start, rite_end, travel_back_end, block_end}`, `ranked[]` {person, reasons[], warnings[{code, requires_ack}]} shown as an ordered suggestion **in words**; `rank`, numeric `score` and the F/S/C/W/L/K `breakdown` live only inside the collapsed "รายละเอียดการคำนวณ" (audit view for the proposer and confirmer), `team_suggestion`, `alternates`, `excluded[]{violations: code only}`, `needs_confirmation[]`, `travel{source, return_buffer_check PASS/FAIL/UNKNOWN}`, `team_blockers[]`, `invitation_version`, `source` SMART/MANUAL.
**Notes:** the page is labelled "ข้อเสนอจากกติกาของระบบ (ไม่ใช่ AI ตัดสิน)"; the order is a **rotation and availability aid, not a merit judgment** (visible caption); no numeric score, medal, "อันดับ 1" label or comparison between monks appears on the main screen (core spec `ranked[]` vs the no-ranking rule: REPORT conflict C-6); activity score and boon points are never used or shown; excluded monks show the constraint only (a sick monk reads "ไม่ว่างในช่วงนี้"); no auto-assign button exists; if travel time is Unknown the proposal **can** still be submitted (SMA runs; return buffer shows UNKNOWN, warning `RETURN_BUFFER_UNKNOWN` needs acknowledgement at confirm; no travel entries are created); no speed or distance constant is ever applied. Monks without an opted-in status sit in the separate `needs_confirmation` list, never merged into the first list; the team fills from the first list and only then from the second, each such monk marked "ต้องโทรยืนยัน" and needing acknowledgement.
**States:** SP-06 for Unknown travel/vassa (`travel{source: manual|saved_venue|provider|unknown}`); SP-03 `STALE_PROPOSAL`; SP-08 if the invitation came from an AI draft (banner at top "สร้างจากร่างโดย AI — ตรวจสอบแล้วโดย <ชื่อ>").

---

## W05 Quest detail

Flows J-02, N-04. Route `/quests/{id}`. **Perm:** `quest.view`; actions `quest.complete` (S), `quest.verify`/`quest.manage` (D/T).

```
┌────────────────────────────────────┐
│ ← ภารกิจ                            │
│ ทำความสะอาดศาลาการเปรียญ             │
│ [กำลังทำ]  สำคัญ: สูง  ฝ่าย: แม่บ้าน  │
│ สถานที่: ศาลาการเปรียญ › โซน ก.      │
│ ถึง 10:00 น.        (เหลือ 1 ชม. 18 น.)│
│ มอบหมายโดย: หัวหน้าฝ่าย… · ผู้ทำ: คุณ…  │
│ ต้องทำก่อน: (ไม่มี)                  │
├────────────────────────────────────┤
│ เช็กลิสต์  3/5                       │
│ ☑ กวาดพื้น                          │
│ ☑ ถูพื้น                            │
│ ☑ เช็ดแท่น                          │
│ ☐ เก็บขยะ (จำเป็น)                  │
│ ☐ จัดเสื่อ (จำเป็น)                 │
├────────────────────────────────────┤
│ หลักฐาน (รูป 1–5, ไม่ถ่ายหน้าคน)      │
│ ก่อน [📷 ถ่ายรูป]   หลัง [📷 ถ่ายรูป]  │
│ หลักฐาน 1/2                          │
├────────────────────────────────────┤
│ [ ส่งงาน ]            ติดขัด? [แจ้ง]  │
│ วิธีตรวจรับ: หัวหน้าฝ่ายตรวจรูป       │
├────────────────────────────────────┤
│ ประวัติ ▾ (ใคร/เมื่อไร)               │
└────────────────────────────────────┘
```
**Data (QUEST §2-8):** `title`, `status` (ASSIGNED / IN_PROGRESS / BLOCKED / SUBMITTED / COMPLETED), derived `OVERDUE` + `overdue_owner`, `priority` (ต่ำ/ปกติ/สูง/เร่งด่วน), `department`, `location{building, zone, text}`, `starts_at`, `due_at`, `assigned_by`, assignee, `depends_on`, `checklist[]` (required flag, checked_by/at), `evidence_policy`, evidence thumbnails (private), `verification_policy` in words, `points{amount, ledger}` (label by ledger, or hidden for staff NONE), audit history.
**Variants:** SUBMITTED -> status line "รอตรวจรับโดย หัวหน้าฝ่าย…" and the submit button disappears; BLOCKED -> reason chip and who can unblock; COMPLETED -> "ตรวจรับโดย … 10:42" (accountable line) and for managers a link "ยกเลิกผลการตรวจรับ"; verifier view shows [ตรวจรับ] [ส่งกลับแก้ไข] and no buttons if the viewer is the assignee.
**States:** SP-03 domain errors (§4.1); SP-04 offline queue for ticks/submit; SP-05 P-2; SP-06 for unknown location.

---

## W06 Verify queue (คิวตรวจรับ)

Flow J-02. Route `/manage/verify`. **Perm:** `quest.verify` (D / T).

```
┌────────────────────────────────────┐
│ คิวตรวจรับ · 4 รายการ                │
│ [ทั้งหมด][ครัว 2][แม่บ้าน 1][ซ่อม 1]  │
│ เรียง: รอนานที่สุดก่อน               │
├────────────────────────────────────┤
│ ● ทำความสะอาดศาลา        รอ 2 ชม.    │
│   ผู้ส่ง: คุณ… · รูป 2 · เช็กลิสต์ 5/5│
│   [เปิด ›]                           │
│ ● เตรียมผักสำหรับเพล      รอ 40 น.   │
│   ผู้ส่ง: คุณ… · เช็กลิสต์ 3/3        │
│ ● ล้างห้องน้ำหลัง        รอ 20 น.    │
│   ⚠ ผู้ตรวจต้องไม่ใช่ผู้ส่ง (ของท่าน)  │ ← own submission: row without action
├────────────────────────────────────┤
│ รายการที่เปิด:                       │
│ ┌ รูปก่อน │ รูปหลัง ┐                │
│ │ [thumb]  │ [thumb] │               │
│ └──────────────────────┘             │
│ เช็กลิสต์ ☑☑☑☑☑   หมายเหตุผู้ส่ง: —   │
│ [ ตรวจรับ ]  [ ส่งกลับแก้ไข… ]        │
│ เหตุผลที่ส่งกลับ: [รูปไม่ชัด][ขาดจุด…]  │
│ ท่านกำลังตรวจรับในนาม: หัวหน้าฝ่าย…    │
└────────────────────────────────────┘
```
**Data:** assignments SUBMITTED in scope: quest title, type, department, assignee (scope), `submitted_at` (wait time), evidence (photo thumbnails, sha-duplicate signal `DUPLICATE_EVIDENCE_HASH` shown to verifier as a quiet note "รูปนี้เคยใช้แล้ว"), checklist state, `rejection_count` (>= 3 shows "ควรให้ผู้จัดการดู"), accountable line.
**Notes:** overdue here is the **verifier's** time ("รอตรวจรับ"), never blame on the assignee; the verifier's own submissions appear greyed with words and no action; reject reason mandatory.
**States:** SP-02 "ไม่มีงานรอตรวจรับ"; SP-05 P-2; SP-03 `SELF_VERIFY_FORBIDDEN`.

---

## W07 Event readiness (ความพร้อมงาน / พิธี)

Flows N-07, J-08, J-09. Route `/events/{id}/readiness`. **Perm:** `event.view` (T; detail not for `community_member`), `event.manage` (D) for actions.

```
┌────────────────────────────────────┐
│ ← กฐิน 2569                         │
│ 18 ต.ค. 2569 06:00–15:00 · ศาลาการเปรียญ│
│ ผู้รับผิดชอบ: คุณ… (หัวหน้างาน)        │
│ ┌ ไม่พร้อม                           ┐│
│ │ ความคืบหน้า 62% · อีก 21 วัน        ││
│ │ ไม่พร้อมเพราะ: พระยังขาด 2 รูป ·    ││
│ │ อาสายังขาด 5 คน                    ││
│ └────────────────────────────────────┘│
│ เงื่อนไขบังคับ                       │
│  ✔ ผู้รับผิดชอบ  ✔ สถานที่            │
│  ✖ กำลังคน (พระ 3/5)                 │
│  ?  ซ่อมบำรุง (ไม่ทราบ)              │
│  ✔ งานด่วน   ✔ งานบังคับ   ✔ ตาราง    │
│ ข้อจำกัด: บางเงื่อนไขยังไม่ทราบ ความพร้อม │
│           แสดงสูงสุดที่ ใกล้พร้อม       │
├────────────────────────────────────┤
│ กำลังคน   ต้องการ / ยืนยัน / รอ / ขาด │
│ พระ        5  /  3  /  1  /  2        │
│ อาสา       20 /  15 /  4  /  5        │
│ เจ้าหน้าที่ 6  /  6  /  0  /  0        │
│ งาน: เสร็จ 18/29 · งานบังคับค้าง 1    │
├────────────────────────────────────┤
│ ฝ่าย: พิธีการ 80% · โรงครัว 40% …   [›]│
│ [เสนอรายชื่อพระ] [เปิดงานอาสา] [บทเรียนปีที่แล้ว]│
└────────────────────────────────────┘
```
**Data (EVENT §5-6):** `state` chip (พร้อม / ใกล้พร้อม / กำลังเตรียม / ไม่พร้อม / ไม่ทราบ), `percent`, `failed_gates[]` (G-OWNER, G-VENUE, G-STAFF, G-MAINT, G-CRIT, G-CHECK, G-CONFLICT with PASS/FAIL/UNKNOWN), `caps`, `reason`, monk `f/r` with pending `p`, volunteer gap, staff gap, `T` share, `starts_at` and hours remaining, `lead_person`, department percentages, `readiness_snapshot_at_start` after LIVE.
**Notes:** the state word leads and the percent is secondary; the chip is never green unless READY; monk, volunteer and staff gaps are separate; a freshly duplicated event reads "ไม่พร้อม — เพิ่งคัดลอก ยังไม่มีผู้รับผิดชอบ"; ceremony PREPARED needs a human tap [พร้อมแล้ว] shown only when state = READY.
**States:** SP-06 `UNKNOWN`/`NO_PLAN`; SP-07 age near start; SP-05 P-1 (community members get public volunteers/community members see at most the state chip and percent for events they participate in, EVENT §7).

---

## W08 Map and building sheet

Flows N-08, N-04 (zones). Routes `/map`, `/facility/buildings/{code}`. **Perm:** any ACTIVE membership for the map (G-UX-1); sheet sections by `asset.view`, `maintenance.report`, `event.view`, `quest.view`, `member.view`/`command_center.view`.

### W08a Map (LITE 2D shown; 3D/2D toggle; list tab)

```
┌────────────────────────────────────┐
│ แผนที่วัด   [2D ●][3D ○] [รายการ]    │
│ ชั้น: [x]ปัญหา [x]งาน [ ]ภารกิจ       │
│  ┌──────────────────────────────┐  │
│  │      ▲ พระปรางค์ (⚠ 1)       │  │
│  │   ▭ โบสถ์    ▭ ศาลา (2 งาน)   │  │
│  │      ▭ โรงครัว  ? กุฏิ        │  │ ? = ไม่ทราบสถานะ (มีข้อความกำกับ)
│  └──────────────────────────────┘  │
│ แผนที่แบบเรียบง่าย [ลองสามมิติ]        │
└────────────────────────────────────┘
```

### W08b Building sheet (bottom sheet on phone, side sheet on desktop)

```
┌────────────────────────────────────┐
│ พระปรางค์ประธาน · WAT-ARUN.PRANG.MAIN│
│ สถานะ: ใช้งาน   [รอวัดยืนยัน]         │
├────────────────────────────────────┤
│ มีปัญหา: ● วิกฤต 0 ● สูง 1           │
│  ใบสั่งซ่อม: รั้วชั้น 2 ชำรุด · สูง   │
│  แจ้ง 3 วัน · SLA เลย 1 วัน · [เปิด ›] │
│ กิจกรรม: ไม่มีวันนี้ · 18 ต.ค. กฐิน(ไม่พร้อม)│
│ ภารกิจที่นี่: 2 (ตามสิทธิ์ของท่าน)     │
│ คนที่เช็กอินตอนนี้: ไม่ทราบ ⓘ         │
│   (ยังไม่มีข้อมูลเช็กอินในอาคารนี้)    │
│ ทรัพย์สิน: 6 รายการ (ไม่แสดงมูลค่า)    │
│ โซน: ลานหน้า · ชั้น 1 · ชั้น 2         │
│ ความพร้อมสำหรับงานถัดไป: S1/S2 เปิด 1  │
│ ประวัติซ่อม 10 รายการล่าสุด ▾          │
│ [แจ้งปัญหาที่นี่]                     │
└────────────────────────────────────┘
```
**Data (SPATIAL §5-6):** marker row `{building_code, zone_code?, layer, count, top_severity, top_label, deeplink}`; sheet: name_th/en, `code`, `kind`, `status`, unconfirmed badge, maintenance requests (severity, age, SLA, problem flag), events window, quests count (viewer scope), checked-in people **count only** (Unknown without data), assets by category/status (no value fields), readiness, zones, history.
**Notes:** the same sheet opens from 3D, 2D polygon, list row or deep link; marker positions are never in UI code; sections hidden by permission (P-1); public map shows only public items.
**States:** SP-01 LITE first; SP-06 grey marker with text; SP-04 cached; the 3D canvas has a list equivalent.

---

## W09 Housekeeper home (แม่บ้าน)

Flow N-04. Route `/` . **Perm:** `quest.view` (A), `quest.complete` (S), `inventory.view` (D), `maintenance.report` (T), `presence.set_self` (S).

```
┌────────────────────────────────────┐
│ [วัดศรีสุข ▾]            🔔 👤       │
│ วันนี้ต้องทำ 3 ที่                   │
├────────────────────────────────────┤
│ พื้นที่ของฉันวันนี้                  │
│ ┌────────────────────────────────┐ │
│ │ 🏛 ศาลาการเปรียญ › โซน ก.        │ │
│ │ ถึง 10:00 · กำลังทำ · มีงานบุญวันนี้│ │
│ │ [ เปิดเช็กลิสต์ ]               │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ 🚻 ห้องน้ำหลัง · ถึง 11:30        │ │
│ │ ยังไม่เริ่ม  (เกินเวลาจะขึ้น "เลยกำหนด")│ │
│ └────────────────────────────────┘ │
│ งานที่รับเพิ่มได้ (2)  [ดู ›]        │
├────────────────────────────────────┤
│ วัสดุทำความสะอาด                    │
│ น้ำยาถูพื้น ใกล้หมด · ถุงขยะ ไม่ทราบ  │
├────────────────────────────────────┤
│ [ แจ้งปัญหา ]          [ เช็กอิน ]    │
├────────────────────────────────────┤
│ หน้าหลัก │ ภารกิจ │ กิจกรรม │ ⋯       │
└────────────────────────────────────┘
```
**Data (CLEANING §6):** per row `zone`, `building`, `due_at`, `status`, `access_note?`, `event_in_zone_today?`, derived OVERDUE; ordering OVERDUE first, then `due_at`, then `priority`; claimable OPEN cleaning quests; inventory levels (never counted -> "ยังไม่ได้นับ", not 0).
**Notes:** Simple Mode keeps cards + report + check-in; no invented default zone; "ถึง" uses 24 h clock.
**States:** SP-02 "วันนี้ไม่มีงานที่มอบหมาย" + claimable list; SP-04; SP-06 for unknown stock.

---

## W10 Kitchen home (หัวหน้าครัว / คนครัว)

Flow N-05. **Perm:** `headcount.view` (D), `headcount.adjust` (D lead), `quest.view` (A/D), `inventory.view` (D), `presence.view` (D, roster).

```
┌────────────────────────────────────┐
│ มื้อเพล วันนี้ 10:30                │
│ เตรียมได้ 14–17 ที่                 │
│ ┌────────────────────────────────┐ │
│ │ พระ  ยืนยันอยู่วัด 9 · ไม่อยู่ 3 · ?3 │ │
│ │ สามเณร ยืนยันอยู่วัด 5 · ไม่อยู่ 0 · ?0│ │
│ │ แขกกิจกรรม: ไม่ทราบ ⓘ            │ │ ← no registration => upper bound unknown
│ │ ผู้ถวายเพิ่ม +5 (เหตุผล: ผู้ถวายเพล)│ │
│ └────────────────────────────────┘ │
│ ตัวเลขนี้เป็นช่วง ไม่ใช่การเดา          │
│ จำนวนที่หัวหน้าตัดสินใจ: 16           │
│  ตัดสินใจโดย คุณ… 08:15  [แก้ไข]*     │ (*lead only)
│ ตัดยอดเวลา 08:30 · เปลี่ยนหลังตัดยอด −2│
│ ย้อนหลัง 7 วัน เสิร์ฟจริง 31 34 29 (อ้างอิง)│
├────────────────────────────────────┤
│ งานเตรียมอาหาร  ☐ ล้างผัก 3/3 ☐ หุงข้าว│
│ สต็อกใกล้หมด: ข้าวสาร · น้ำมัน         │
│ รายการซื้อ (4) [ดู ›]                │
│ ทีมวันนี้: ทำงาน 3 · ว่าง 1 · ไม่ทราบ 1 │
├────────────────────────────────────┤
│ [ แจ้งปัญหา ]          [ เช็กอิน ]    │
└────────────────────────────────────┘
```
**Data (KITCHEN §3):** `lower`, `upper` (or "ไม่ทราบ"), monk and novice `confirmed_here / known_away / unknown`, event guests C3 (registered with `meal_required`) or Unknown, `staff_confirmed/unknown` if enabled, adjustments (actor, time, reason), `planned` + who/when, `prep_cutoff`, snapshot delta, `actual_served` history (reference only). Kitchen staff receive **counts only** (no names, no per-monk states); groups of <= 2 show "น้อยกว่า 3".
**Notes:** the planned number is the lead's own decision; the app never fills it in; monk meal noon cutoff note is configurable ("ฉันเพลก่อนเที่ยง" per temple, HYPOTHESIS); dietary counts are optional aggregates.
**States:** SP-06 "ยังไม่มีข้อมูลสถานะพระ" with the planned field highlighted; SP-07 snapshot; SP-05 P-6.

---

## W11 Driver home (คนขับรถ)

Flow N-06. **Perm:** `vehicle.view` (A), `invitation.view` (A), `maintenance.report` (T), `presence.set_self` (S).

```
┌────────────────────────────────────┐
│ เที่ยววันนี้ 2                       │
├────────────────────────────────────┤
│ ออก 08:25 น.            (ระบบคำนวณ)  │
│ ┌────────────────────────────────┐ │
│ │ กิจนิมนต์ บ้านคุณสมชาย · 09:00    │ │
│ │ ผู้โดยสาร 2: พระ… , พระ…          │ │
│ │ รับที่: กุฏิ 3 (จุดรับ 1)          │ │
│ │ กลับถึงวัดประมาณ 11:35            │ │
│ │ เจ้าภาพ: ติดต่อผ่านวัด · โทรเลขา   │ │
│ │ รถ: ตู้ 3 (กท 1234) · ว่าง/จอง    │ │
│ │ สถานะเที่ยว: มอบหมายแล้ว           │ │
│ │ [ รับทราบ ]                      │ │
│ └────────────────────────────────┘ │
│ ออก ยังไม่กำหนด  ← เวลาเดินทางไม่ทราบ  │
│ ┌ งานบ้านคุณ… · 14:00 · ผู้โดยสาร 1  ┐│
│ │ ติดต่อพระเลขานุการเพื่อกำหนดเวลาออก ││
│ └────────────────────────────────────┘│
├────────────────────────────────────┤
│ รถของฉัน: ตู้ 3 · สถานะ ว่าง           │
│ ⚠ ประกันหมดอายุ (EXPIRED DOCS)        │
│ [ แจ้งปัญหารถ ]      [ โทรหาเลขา ]     │
│ ออกเดินทาง ถึงแล้ว กำลังกลับ เสร็จสิ้น  │ (buttons appear in order)
└────────────────────────────────────┘
```
**Data (VEHICLE §4):** `planned_departure_at` (null -> "ยังไม่กำหนด") + `departure_source`, purpose, venue, passengers (names only for own trips), pickup stops, `planned_return_at` (or "ไม่ทราบ"), host contact owner (via temple), notes, vehicle nickname/plate/state, doc flags, trip `status`, legal next transitions. Passenger availability reasons never shown.
**Notes:** departure time is the first and biggest element; no monk driver ever; unacknowledged T-2 h raises an alert to the manager; actions queue offline with `client_at`.
**States:** SP-02 "วันนี้ไม่มีเที่ยวรถ"; SP-04; SP-06.

---

## W12 Community home (ญาติโยม / อาสา)

Flows N-10, N-09. **Perm:** `event.view` (P), `quest.view` (P or A+P), `community.participate` (S) unless minor; `maintenance.report` hidden for community_member.

```
┌────────────────────────────────────┐
│ [วัดศรีสุข ▾]            🔔 👤       │
│ สวัสดี                              │
├────────────────────────────────────┤
│ วันนี้ที่วัด                        │
│ ┌────────────────────────────────┐ │
│ │ 17:00 สวดมนต์เย็น · พระอุโบสถ    │ │
│ │ เปิดให้ร่วมได้ทุกคน               │ │
│ ├────────────────────────────────┤ │
│ │ 09:00–12:00 ถวายภัตตาหารเพล      │ │
│ │ ต้องการอาสา 3 คน (ฝ่ายโรงครัว) [สมัคร]│ │
│ └────────────────────────────────┘ │
│ ว่างงาน? ดูกิจกรรมที่จะมาถึง [ดู ›]    │
├────────────────────────────────────┤
│ มีอะไรให้ช่วย                       │
│ • ช่วยเตรียมงานกฐิน · 18 ต.ค. · อีก 5 คน│
│ • ดูแลที่จอดรถ · 18 ต.ค. · อีก 2 คน    │
├────────────────────────────────────┤
│ กิจกรรมที่จะมาถึง                    │
│ 18 ต.ค. กฐิน 2569 (สาธารณะ)          │
├────────────────────────────────────┤
│ ชุมชน (ถ้าเปิดใช้และไม่ใช่ผู้เยาว์)  [ ›]│
│ แต้มร่วมกิจกรรมของฉัน: 120  [ประวัติ ›]│
├────────────────────────────────────┤
│ ติดต่อวัด  [เขียนข้อความถึงวัด]       │
├────────────────────────────────────┤
│ หน้าหลัก │ ภารกิจ │ กิจกรรม │ ชุมชน │ ⋯│
└────────────────────────────────────┘
```
**Data:** public events today (`title_th`, time, venue, `lunar_ref` label, volunteer need "N คน (ฝ่าย X)"); public volunteer quests (capacity, unfilled); `community_boon_points` balance (lay only; label under test); Temple Contact link. No readiness, no monk names or counts, no maintenance.
**Notes:** monastics never see this home; minors have no ชุมชน row and no chat entry; the points row hides entirely if the temple disables rewards; points never framed as buying merit.
**States:** SP-02 "วันนี้วัดยังไม่มีกิจกรรมสาธารณะ [ติดตามวัด]"; SP-06 "ไม่ทราบยอด" on load failure.

---

## W13 Volunteer quests: list, detail, check-in

Flows N-09, J-03. Routes `/quests?type=volunteer`, `/quests/{id}`. **Perm:** `quest.view` (P / A+P), `quest.complete` (S).

```
LIST                                  DETAIL / SIGN-UP
┌────────────────────────────────┐   ┌────────────────────────────────┐
│ งานอาสา · กรอง: [ทั้งหมด ▾][วันที่]│   │ ← ช่วยเตรียมงานกฐิน              │
│ ┌────────────────────────────┐ │   │ 18 ต.ค. 2569 06:00–10:00         │
│ │ ช่วยเตรียมงานกฐิน   อีก 5 คน │ │   │ ศาลาการเปรียญ · ฝ่ายพิธีการ        │
│ │ 18 ต.ค. 06:00 · ศาลา        │ │   │ ต้องการ 20 คน · ลงชื่อแล้ว 15      │
│ │ [ดู ›]                      │ │   │ ต้องการอีก 5 คน                   │
│ ├────────────────────────────┤ │   │ ผู้ดูแล: คุณ… (ผู้จัด)             │
│ │ ดูแลที่จอดรถ       อีก 2 คน  │ │   │ วิธียืนยัน: เจ้าหน้าที่สแกน QR ตอนมาถึง│
│ └────────────────────────────┘ │   │ แต้มร่วมกิจกรรม: 10 หลังตรวจรับ      │
│ ไม่พบ? [ล้างตัวกรอง]            │   │ ข้อควรรู้ (จากวัด): แต่งกายสุภาพ… ⓘ    │
└────────────────────────────────┘   │ ต้องรออนุมัติจากหัวหน้าฝ่าย           │
                                      │ [ สมัคร ]                        │
CHECK-IN (day of event)               └────────────────────────────────┘
┌────────────────────────────────┐
│ งานอาสาของฉัน · วันนี้            │
│ ช่วยเตรียมงานกฐิน 06:00          │
│ [ สแกน QR เช็กอิน ]  [พิมพ์รหัส]   │
│ หรือให้เจ้าหน้าที่สแกนให้          │
│ เช็กอินแล้ว 05:48  [ เช็กเอาต์ ]   │
└────────────────────────────────┘
```
**Data:** `title`, department, window, venue, `capacity`, filled, `unfilled`, `claimable`, `verification_policy` plain words, `points{amount, ledger}`, etiquette note (suggested description convention), organiser, approval requirement (`event.volunteer_approve`), my assignment status, check-in time. Public view shows only "ต้องการอาสา N คน (ฝ่าย X)" before sign-in.
**Notes:** no countdown, scarcity or guilt copy; waitlist only if the temple enabled it; visitors are routed to "ขอเข้าร่วมวัดก่อน"; minors see only adult-supervised daytime on-site quests (HYPOTHESIS).
**States:** SP-03 `CAPACITY_FULL`, `QR_FOREIGN_TEMPLE`; SP-02; SP-04 (check-in queued).

---

## W14 Consent (PDPA and guardian)

Flow F-01. Route `/me/consent` (also first-run). **Perm:** none (self).

```
┌────────────────────────────────────┐
│ ความยินยอมในการใช้ข้อมูล              │
│ [ข้อความร่าง — รอทนายและผู้รู้ตรวจ]    │
├────────────────────────────────────┤
│ ☐ ใช้ข้อมูลสมาชิกวัดของท่าน          │
│   การเป็นสมาชิกวัดอาจเปิดเผยความเชื่อ  │
│   ทางศาสนา ต้องได้รับความยินยอมชัดเจน  │
│   [อ่านรายละเอียด]                   │
│ ☐ แสดงสถานะสุขภาพ/การลา (ถ้ามี)        │
│ ☐ ประมวลผลบนระบบคลาวด์นอกประเทศไทย    │
│   ที่เก็บข้อมูล: สิงคโปร์ (ap-southeast-1)│
│ ☐ การแจ้งเตือน   ☐ สถิติแบบไม่ระบุตัวตน │
│ ข้อมูลเสริม (ส่วนสูง น้ำหนัก ฯลฯ):      │
│  ไม่บังคับ · ตั้งการมองเห็นได้ทีละช่อง   │
│  ○ สาธารณะ ○ เฉพาะเพื่อน ● ส่วนตัว     │
├────────────────────────────────────┤
│ ถอนความยินยอมได้เสมอ: ฉัน › ความยินยอม │
│ [ บันทึกความยินยอม ]  [ ไม่ยินยอม—ดูวัดอย่างเดียว ]│
└────────────────────────────────────┘

MINOR VARIANT (ต่ำกว่า 20 ปี)
┌────────────────────────────────────┐
│ ต้องให้ผู้ปกครองยินยอม               │
│ ผู้ปกครอง: ชื่อ [      ] ความสัมพันธ์ [ ▾]│
│ เบอร์โทรผู้ปกครอง [          ]       │
│ วิธียืนยัน: (●) ส่งลิงก์ให้ผู้ปกครอง  │
│            ( ) ผู้ดูแลระบบวัดบันทึกแบบฟอร์มกระดาษ │
│ ผู้ใหญ่ที่ดูแล: [ท่านเจ้าอาวาส/ครู ▾]  │
│ สถานะ: รอผู้ปกครองยืนยัน               │
│ ไม่มีแชต การโทร หรือโปรไฟล์สาธารณะ      │
└────────────────────────────────────┘
```
**Data:** consent items with version and timestamp; optional field visibility (PUBLIC / CONNECTIONS / PRIVATE, default PRIVATE for height, weight, body information, income range); hosting region disclosure; guardian name/relationship/phone; recorder of consent; sponsor; withdrawal.
**Notes:** nothing pre-ticked; each item separately withdrawable; declining item 1 leaves a usable visitor mode; sensitive optional fields are never required; text is a draft awaiting D-5 review.
**States:** SP-12 pending guardian; SP-03 OTP errors; SP-05 P-7 after withdrawal.

---

## W15 Temple switcher

Flow F-03. **Perm:** none (self). Shown also in NAVIGATION §3.

```
┌ เลือกวัด ─────────────────────────────┐
│ ● วัดศรีสุข           ใช้งานอยู่        │
│   พระภิกษุ · โหมดพระภิกษุ               │
│ ○ วัดบ้านสวน          อาสาสมัคร        │
│ ○ วัดท่าน้ำ  พระอาคันตุกะ ถึง 12 ธ.ค. 2569│
│ ◌ วัดป่าใหญ่          ถูกระงับ          │
│ ✉ คำเชิญจาก วัดโพธิ์   [ดู]            │
│ ⏳ วัดกลาง            รออนุมัติ [ถอน]    │
│ ＋ ค้นหาวัด / ติดตามวัด                 │
└───────────────────────────────────────┘
```
**Data:** `list_my_temples()` memberships (status, roles label, mode, `valid_until` for visiting), invitations, pending requests. Switching clears client caches.
**States:** SP-12 suspended; SP-05 P-7.

---

## W16 Report a problem and work order

Flow J-04. Routes `/facility/report`, `/facility/work-orders/{id}`. **Perm:** `maintenance.report` (T) (not community_member); triage `maintenance.manage` (T / A).

```
REPORT FORM                           WORK ORDER (technician)
┌────────────────────────────────┐   ┌────────────────────────────────┐
│ แจ้งปัญหา                        │   │ ← ใบสั่งซ่อม #… · สูง · กำลังทำ    │
│ อาคาร: [โบสถ์ ▾] (จำเป็น)        │   │ โบสถ์ › ห้องน้ำหลัง › ก๊อก 2        │
│ โซน: [ไม่ระบุ ▾]                 │   │ แจ้งโดย คุณ… 3 วันที่แล้ว          │
│ ปัญหาคืออะไร: [พิมพ์หรือพูด 🎤]    │   │ ความรุนแรง: สูง (คัดแยกโดย …)       │
│ รูป: [📷] (ไม่ถ่ายหน้าคน)          │   │ SLA แก้ภายใน 3 วัน · เหลือ 0 วัน     │
│ ความรุนแรง:                     │   │ ⚠ อาคารอนุรักษ์ ต้องมีเลขอนุมัติก่อน  │
│ [ฉุกเฉิน][สูง][กลาง][ต่ำ][ไม่แน่ใจ]│   │ เลขอ้างอิงอนุมัติ: [          ]      │
│ [ ส่ง ]                         │   │ หลักฐาน (สูง/วิกฤต ต้องมีรูป) [📷]   │
│ ฉุกเฉิน = แจ้งผู้ดูแลทันที         │   │ [เริ่มงาน] [ส่งงาน] [ติดขัด: รอวัสดุ]│
└────────────────────────────────┘   │ ไทม์ไลน์: แจ้ง › คัดแยก › มอบหมาย…  │
                                      │ (ไม่แสดงค่าใช้จ่าย)               │
SCAN QR ENTRY                         └────────────────────────────────┘
สแกนสินทรัพย์ → การ์ดทรัพย์สิน (ชื่อ ที่ตั้ง สถานะ ผู้ดูแล ซ่อมล่าสุด)
→ [แจ้งซ่อม] เติมอาคาร/ทรัพย์สินให้แล้ว
```
**Data (MAINTENANCE §2-4):** `building_id` (required), `zone_id?`, `asset_id?`, `title/description`, `severity` S1-S4 + "ไม่แน่ใจ", `photos[]`, `source` (manual / qr_scan / ai_draft / trip_issue), `status`, `sla_ack_due_at`, `sla_resolve_due_at`, `heritage_flag`, `safety_flag` (forces min S2), `approval_ref`, timeline with accountable humans. Cost fields hidden here.
**Notes:** reporter always sees own request status; "ไม่แน่ใจ" counts as S2 until triaged and the form says so; foreign/unknown QR -> generic not found.
**States:** SP-04 draft + photo queued; SP-08 voice -> AI draft card; SP-05 P-1 for community_member (no report button).

---

## W17 Set my status (monk)

Flow J-07. Bottom sheet from My Day. **Perm:** `availability.set_self` (S).

```
┌ สถานะของฉัน ──────────────────────────┐
│ ตอนนี้: ? ไม่ทราบ                      │
│ ตั้งสถานะ                              │
│ ( ) พร้อมรับกิจ   ( ) พักผ่อน           │
│ ( ) กิจส่วนตัว    ( ) ไม่พร้อม          │
│ ถึงเวลา: [+1 ชม.][+3 ชม.][สิ้นวัน][เลือก]│
│ ที่อยู่: ( ) ในวัด ( ) นอกวัด (●) ไม่ระบุ │
│ จากตาราง (แก้ที่ตารางกิจ): ออกกิจนิมนต์… │
│ ⓘ ซ้อนกับกิจ 09:00 — เลขาจะเห็นความขัดแย้ง│
│ [ บันทึก ]    [ ยกเลิกสถานะที่ตั้งไว้ ]  │
└───────────────────────────────────────┘
```
**Data:** manual status `{state, valid_until, location_hint}`; read-only calendar-driven states; own `conflicts[]`; admin-set rows ("ตั้งโดย พระเลขานุการ ถึง …").
**Notes:** end time required (default end of day; max 24 h for ว่าง/พักผ่อน/กิจส่วนตัว, 120 days for ไม่พร้อม); "พร้อมรับกิจ" is the only way to become "ว่าง".
**States:** SP-03 `VALID_UNTIL_*`, `CALENDAR_STATE_NOT_SETTABLE`, `FORBIDDEN_STATE_FOR_ACTOR`.

---

## W18 Temple Contact (public compose and temple inbox)

Flow J-05. Routes `/{temple-slug}/contact`, `/manage/contact`. **Perm:** compose none (public); inbox `contact_inbox.manage` (T).

```
COMPOSE (public, works logged-out)    INBOX (staff)
┌────────────────────────────────┐   ┌────────────────────────────────┐
│ ติดต่อ วัดศรีสุข                  │   │ กล่องข้อความวัด · ใหม่ 3          │
│ ข้อความส่งถึงเจ้าหน้าที่ของวัด    │   │ [ใหม่][มอบหมายแล้ว][ตอบแล้ว][ปิด]   │
│ ไม่ได้ส่งถึงพระโดยตรง              │   │ ● ขอนิมนต์พระ — ทำบุญบ้าน 12 ต.ค.  │
│ เรื่อง: [ขอนิมนต์พระ ▾]           │   │   จากคุณสมชาย · 2 ชม.ที่แล้ว       │
│ ข้อความ: [                    ]   │   │   ผู้รับผิดชอบ: —  [มอบหมาย ▾]     │
│ ชื่อ (ไม่บังคับ): [   ]           │   │ [แปลงเป็นกิจนิมนต์ (ร่าง)] [ตอบ]    │
│ เบอร์โทร (ถ้าต้องการให้ติดต่อกลับ)  │   │ ตอบโดย: เจ้าหน้าที่วัด (ชื่อ)        │
│ [ ส่ง ]                         │   │ ไม่มีช่องส่งตรงถึงพระ                │
│ รหัสอ้างอิงจะแสดงหลังส่ง           │   └────────────────────────────────┘
└────────────────────────────────┘
```
**Data:** topic, message, optional name/phone, rate-limit state, thread status NEW / ASSIGNED / REPLIED / CLOSED, owner, linked invitation draft.
**Notes:** no direct message to any monastic at P0; minors cannot be contacted by public senders; phone/name are optional unless a reply is requested; sender copy makes no promise of reply time.
**States:** SP-03 rate limit; SP-02 "ยังไม่มีข้อความใหม่".

---

## W19 Ceremony lead home and roster

Flows N-07, J-08. **Perm:** `event.view` (T), `event.manage` (D), `quest.view` (D); confirmation elsewhere (`ceremony.confirm_monks`).

```
┌────────────────────────────────────┐
│ พิธีถัดไป                           │
│ สวดมนต์เย็น · วันนี้ 17:00 · อุโบสถ   │
│ ┌ ไม่พร้อม · ใกล้เวลาเริ่ม           ┐│
│ │ ความคืบหน้า 78% · พระยืนยัน 4/5     ││
│ │ รอยืนยัน 1 · เหลืองานบังคับ 1       ││
│ └────────────────────────────────────┘│
│ กำหนดการ  16:15 ตั้งแท่น · 16:45 ซ้อม  │
│ เช็กลิสต์ 6/9   [เปิด ›]              │
│ รายชื่อพระ (เห็นชื่อ ไม่เห็นเหตุผล)    │
│  พระ… ✔ ยืนยัน   พระ… ✔ ยืนยัน         │
│  พระ… ⏳ รอเลขายืนยัน                  │
│  ขาดอีก 1 รูป [เสนอรายชื่อ]           │
│ ⚠ พระ… มีความขัดแย้งตาราง              │
│ [ พร้อมแล้ว ]  (เมื่อสถานะ = พร้อม)    │
└────────────────────────────────────┘
```
**Data:** next ceremony by `starts_at >= now`; readiness (W07 fields); roster names with assignment status (PROPOSED / CONFIRMED / NEEDS_RECONFIRM), `monks_required` (temple-entered or "ไม่ทราบ"), `samanera_allowed`, timeline offsets, checklist leaf quests. The lead can propose but **cannot confirm** monks.
**States:** SP-06 `monks_required` not entered; SP-09 conflict.

---

## W20 Approvals (abbot / secretary)

Flows J-01, J-08, J-09, J-02. Route `/manage/approvals`. **Perm:** per row type: `invitation.confirm`, `ceremony.confirm_monks`, `event.approve`, `event.volunteer_approve`, `quest.verify`, `points.award_community`.

```
┌────────────────────────────────────┐
│ รออนุมัติ 3                          │
│ [ทั้งหมด][กิจนิมนต์ 1][พิธี 0][งาน 1][อื่น ๆ 1]│
├────────────────────────────────────┤
│ กิจนิมนต์ · ทำบุญบ้านคุณสมชาย        │
│ 12 ต.ค. 09:00 · ต้องการ 2 รูป         │
│ ทีมที่เสนอ: พระ… (หัวหน้าคณะ) · พระ…   │
│ เสนอโดย: พระเลขานุการ… · 10:30        │
│ ข้อควรระวัง (ต้องรับทราบ):            │
│ ☐ พระ… ยังไม่ได้ลงสถานะ               │
│ ☐ แจ้งกระชั้นชิด (ไม่ถึง 60 นาที)       │
│ รถ: ✔ จองแล้ว · ตู้ 3                 │
│ ข้อเสนอเวอร์ชัน 4                     │
│ ┌ ท่านกำลังยืนยันในนาม พระครู… (เจ้าอาวาส)┐│
│ └───────────────────────────────────────┘│
│ [ ยืนยันกิจนิมนต์ ]   [ ส่งกลับแก้ไข ]  [ ปฏิเสธรับกิจ… ]│
│ ยืนยันแล้วยกเลิกหรือเปลี่ยนตัวได้ (ต้องระบุเหตุผล)│
└────────────────────────────────────┘
```
**Data:** invitation (host name, rite, window, venue, monks_required), proposal `version`, `team[]` with roles, warnings with `requires_ack`, vehicle/driver hold, proposer, `decline_reason` list (DATE_CONFLICT, NOT_ENOUGH_MONKS, OUT_OF_AREA, RITE_NOT_SUITABLE, OTHER). Event approval rows show title, date, venue, scope and **current readiness**; volunteer rows show person (name), department, shift.
**Notes:** delegated secretary sees only routine rites; "ปฏิเสธ" here is the human decision to decline a *request from outside* (DECLINED), distinct from a monk's "แจ้งติดขัด"; buttons carry words; accountable line always shown; undo route listed.
**States:** SP-03 `STALE_PROPOSAL`, `CONFIRM_BLOCKED`, `ACK_REQUIRED`; SP-02 "ไม่มีรายการรออนุมัติ"; SP-05 P-2.

---

## W21 Undertaker home (สัปเหร่อ)

Flow (N-assigned). **Perm:** `funeral.assigned.view` (A), `quest.view` (A), `presence.set_self` (S).

```
┌────────────────────────────────────┐
│ พิธีที่ได้รับมอบหมาย 1               │
│ ┌────────────────────────────────┐ │
│ │ พิธีฌาปนกิจ · อ้างอิง F-0123     │ │
│ │ ผู้ล่วงลับ: (ชื่อตามสิทธิ์)       │ │
│ │ ติดต่อครอบครัว: คุณ… (ชื่อแรก)    │ │
│ │ ช่วงเวลา: สวด 15:00 · เผา 17:00   │ │
│ │ สถานที่: เมรุ                     │ │
│ │ พระ: 4 รูป (เวลาเท่านั้น)         │ │
│ └────────────────────────────────┘ │
│ เช็กลิสต์ของฉัน  ☐ ตรวจเมรุ ☐ เตรียมฟืน…│
├────────────────────────────────────┤
│ [ เช็กอิน ]                         │
└────────────────────────────────────┘
```
**Data (FUNERAL §3-4):** assigned rites only (`assignment.person_id = me AND valid_until >= now`), `display_ref`, deceased display name per role rule, one family contact (first name + phone, from CONFIRMED until closed), sessions (kind, start/end, venue), monk count and times without names, own tasks. No lists of other rites, no register, no counts of others.
**Notes:** the permission rule is also a test: an undertaker cannot list non-assigned funerals (matrix §6).
**States:** SP-02 "ไม่มีพิธีที่ได้รับมอบหมาย"; SP-05 P-4 for any non-assigned id; SP-05 P-5 masked fields.

---

## Coverage table (required screens)

| Required (pack) | Wireframe |
|---|---|
| Command Center | W01 |
| My Day | W02 |
| Availability board | W03 |
| Invitation proposal | W04 |
| Quest detail | W05 |
| Verify queue | W06 |
| Event readiness | W07 |
| Map building sheet | W08 |
| Housekeeper home | W09 |
| Kitchen home | W10 |
| Driver home | W11 |
| Community home | W12 |
| (extra) volunteer, consent, switcher, report/work order, status, Temple Contact, ceremony lead, approvals, undertaker | W13-W21 |
