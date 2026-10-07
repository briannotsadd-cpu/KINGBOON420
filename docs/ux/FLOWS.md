# FLOWS — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 · Wave 1b · Readiness: **DESIGNED**
Every flow lists: actor and exact permission codes, steps (user action -> system response -> screen), the **accountable
human** shown on consequential actions, failure and edge states, and the specification it relies on. Screen ids `W01-W21`
are the low-fi wireframes in `WIREFRAMES.md`; state patterns `SP-xx` are in `STATE_PATTERNS.md`; module ids are in
`HOME_MODULE_REGISTRY.md`.

Flow ids: **F-** onboarding and access · **N-** north-star questions · **J-** journeys.
Definition of done (pack): each north-star question ends on a screen with named data fields (section 2).

Standing rules applied in every flow (not repeated):
- Unknown is "ไม่ทราบ" with a reason, never 0 (STATE_PATTERNS §6).
- A consequential action shows the **accountable human** (name + role + time) before and after, and offers undo where the
  domain allows (STATE_PATTERNS §11).
- AI produces **drafts only**, labelled "ร่างโดย AI", needing an explicit accept by a named human (J-10).
- Monastic score label is **แต้มกิจวัตร**; lay points label is under test (แต้มร่วมกิจกรรม / แต้มบุญชุมชน). No ranking of
  monastics. No random rewards, countdown pressure, confetti or casino patterns.
- Quest wording: "ภารกิจ" for quests, "งาน"/"กิจกรรม" for events. The word "boss" never appears in UI (research doc 05 §5).

---

## 1. Onboarding and access (F-)

### F-01 First sign-in -> PDPA consent -> guardian consent -> monastic claim -> temple pick

Actor: any new person. No permission code is needed for pure self actions (TENANCY G-1). Screens: W14 (consent),
W15 (switcher), Discovery (NAVIGATION §7).

| # | User action | System response | Screen / state |
|---|---|---|---|
| 1 | Opens app or a temple link | Welcome: language TH (default) / EN; **text size slider** (A- A A+) and Simple Mode toggle offered before any form so older users can start large | Welcome |
| 2 | Chooses phone OTP or email | Sends code; rate-limited; LINE Login is not offered at P0 (Q-04) | Sign in |
| 3 | Enters OTP | Creates the global `person` (one login, one person). Link target (if any) is remembered | OTP |
| 4 | Enters birth year (พ.ศ. dropdown) and name | Computes `minor` (< 20 years; PDPA s.20 as reported, HYPOTHESIS pending lawyer D-5). Name shown as typed, Thai first; no national ID asked | Profile basics |
| 5a | **Adult:** reads the privacy notice | Consent screen with **separate, unticked** choices (W14): (1) ใช้ข้อมูลสมาชิกวัด — explicit consent because membership can reveal religious belief (s.26); (2) สถานะสุขภาพ/การลา (only shown if the person's role can set such statuses); (3) ประมวลผลบนระบบคลาวด์นอกประเทศไทย (hosting region disclosed, acknowledgement); (4) แจ้งเตือน; (5) วิเคราะห์การใช้งานแบบไม่ระบุตัวตน. Optional profile fields are **never required** | Consent |
| 5b | **Minor (< 20):** sees "ต้องให้ผู้ปกครองยินยอม" | Limited account: browse public temple pages only. Guardian consent path (below). No chat, no profile, no photos with faces by default | Consent (minor) |
| 6 | Declines item (1) | Account continues as **visitor**: Discovery and Temple Contact only; copy: "ท่านยังค้นหาวัดและติดต่อวัดได้ โดยไม่ต้องให้ข้อมูลสมาชิก" | Visitor |
| 7 | After picking a temple (step 8), optionally taps "ขอให้วัดนี้ยืนยันว่าเป็นพระภิกษุ / สามเณร" | Attestation is **per temple membership** (TENANCY §5, Opus F-04): evidence attached, state `PENDING_REVIEW`; "รอวัดนี้ยืนยัน"; **until this temple verifies, the person behaves as lay here**. Optional, off by default: "นำเสนอการรับรองจากวัดอื่น" shares only kind, attesting temple name and date (and evidence only if ticked); the other temple is not told; the new temple accepts, re-attests or declines | Monastic claim |
| 8 | Picks a temple | Options: scan temple QR / enter invite code, search, accept a pending invitation, "ขอเข้าร่วม" (PENDING_APPROVAL, default role `community_member`), or stay visitor. Role is never self-selected | Temple picker |
| 9 | After approval | Membership ACTIVE; short first-run guide (3 cards, skippable) shows the role's home, where "ฉัน" and "ความยินยอม" live; lands on the landing tab (NAVIGATION §9) | Home |

**Guardian consent sub-flow (minors, incl. samanera and temple_boy):**

| # | Step | Detail |
|---|---|---|
| G1 | Minor enters guardian name, relationship, guardian phone | Stored as restricted contact: visible only to the person, `member.manage` holders and the abbot (GENERAL §2.4) |
| G2 | Guardian consents by OTP link on the guardian's phone **or** the temple admin records a signed paper form (photo uploaded to restricted storage) | Both paths write consent version, time, who recorded (audited). The paper path shows "บันทึกโดย (ชื่อผู้ดูแลระบบของวัด)" |
| G3 | An **adult sponsor** (abbot or teacher) is named | Shown to the minor as "ผู้ใหญ่ที่ดูแล" (research doc 03 §3) |
| G4 | Until G2 completes | Account stays at "รอผู้ปกครองยืนยัน"; membership cannot be approved to ACTIVE; no data about the minor is visible to staff beyond the pending request |
| G5 | Ongoing | Guardian can withdraw consent at any time (OTP link); withdrawal suspends the membership and notifies the sponsor |

Failure/edge: OTP never arrives -> "ส่งรหัสอีกครั้ง" after 60 s, email fallback; no guardian phone -> admin paper path;
person under 10 -> guardian is the "holder of parental authority" (copy changes), HYPOTHESIS; visiting monk -> invited
by host (INVITED), consent screen unchanged; consent withdrawn later -> W14 in ฉัน, effects listed in plain words
("ปิดการแสดงสถานะสุขภาพของท่าน; ข้อมูลเดิมจะถูกลบตามนโยบายวัด"). The consent copy in W14 is a **draft template**
and must pass Thai native, monk-advisor and lawyer review before pilot (D-5, research doc 08 header).
Accountable human: the temple approver ("อนุมัติโดย ...") and, for minors, the guardian (named) and sponsor.

### F-02 Shared or proxy device (monks and novices without personal phones)

Research doc 07 P1-P4: devices may be shared; a secretary may operate for the abbot.

| # | Step | Detail |
|---|---|---|
| 1 | Person signs in on a temple-owned device | "อุปกรณ์ร่วม" toggle at sign-in: short session (default 30 min idle), no "remember me", biometric lock off |
| 2 | Abbot asks secretary to operate | Secretary acts **as himself** (his own login). Anything he does for the abbot is recorded under his name; there is no "act as abbot" button. For availability the only proxy action is `set_status(other, UNAVAILABLE)` with `availability.set_others` (AVAILABILITY §8) |
| 3 | Monk sees his own status and schedule on the shared device | After sign-out, no personal data remains on the device (cache cleared, STATE_PATTERNS §8) |

### F-03 Switch temple and join a temple

Switch: W15 -> select -> cache cleared -> landing tab (NAVIGATION §3). Join: Discovery -> temple page -> [ขอเข้าร่วม]
-> reason optional -> status "รออนุมัติ" in the switcher -> admin (`member.manage`) approves or rejects (reason mandatory,
shown to the requester). The requester can withdraw. Accountable human on approval: the approving admin.

---

## 2. North-star question flows (N-)

Format per flow: question -> entry -> steps -> **end screen and named data fields** (field names are the spec fields so
that Wave 3 can wire them) -> unknown/empty handling.

### N-01 พระ: "วันนี้ผมต้องทำอะไร?" (What must I do today?)

Actor: `bhikkhu` / `samanera` (also abbots via My Day). Permissions: `schedule.view` (S+P), `quest.view` (S),
`availability.set_self` (S).
Entry: app opens on **วันนี้** (landing for bhikkhu, samanera).

1. Opens app -> My Day loads from cache instantly (age chip), then refreshes.
2. If `monk_response = PENDING` items exist, a calm banner "รอรับทราบ 1 รายการ" is on top (`mo.pending_ack`).
3. Reads the timeline; taps an entry for detail (invitation, ceremony, class, quest).
4. Taps "รับทราบ" or "แจ้งติดขัด" (never "ปฏิเสธ"): "แจ้งติดขัด" flags the assignment, notifies the secretary, **does not
   cancel anything** (CEREMONY §6.1).
5. Optionally sets own status (W17) or checks in (if the temple enabled it).

**End screen W02 — fields:** header: `effective_status` (Thai label), `location_state`, `valid_until`, `next_change_at`,
own `conflicts[]` (monk sees his own conflicts only), `as_of`. Timeline rows: `kind` (invitation / ceremony / teaching /
class / duty / personal / travel / meal / leave / meeting), `title`, `starts_at` / `ends_at` (24 h clock + พ.ศ. date),
`venue_kind` + venue name, `leg` (OUT/BACK for travel), my `role` (LEAD/MEMBER), `monk_response`, for invitations:
`transport` and, if temple vehicle, driver name + vehicle plate (VEHICLE §3), `host` display name only when `invitation.view`
(A) allows; for quests: `title`, `due_at`, derived `OVERDUE`, checklist progress `n/m`, `priority`. Footer: `mo.progress`
(ticks, optional แต้มกิจวัตร).
Unknown/empty: no entries -> "วันนี้ยังไม่มีกิจที่กำหนด" + [ดูพรุ่งนี้]; status Unknown -> "ไม่ทราบ — ไม่มีการเช็กอินหรือตารางวันนี้".
Accountable human on assignments: "มอบหมายโดย (พระเลขานุการ ...)" in the detail.

### N-02 พระเลขานุการ: "ตอนนี้มีพระกี่รูปพร้อมออกกิจ?" (How many monks are ready to go out now?)

Actor: `monk_secretary` (also abbot, deputy, assistant; `ceremony_lead`/`office_staff` see counts and coarse states only).
Permissions: `availability.view` (T), `availability.set_others` (T) for conflicts.
Entry: วัด -> พระและสามเณร -> กระดานสถานะ, or Command Center Monastic panel (drill-down).

1. Opens board (W03); reads headline "ว่าง N รูป" **beside** "ไม่ทราบ M รูป".
2. Taps the "ไม่ทราบ" tile -> list of persons with reason (no signal / expired / stale check-in) -> [ขอให้ลงสถานะ] sends a
   quiet reminder (does not set any status).
3. Optionally sets the time question: "ช่วงเวลา" picker (default now). For a future time the board shows
   "ข้อมูลล่วงหน้า: ว่างที่ยืนยันแล้ว N · ไม่ทราบ M" — it never implies the unknowns are free.
4. Taps a person -> status detail (tier per AVAILABILITY §9).
5. From a conflict badge -> conflict detail -> resolves by editing the entry or the block (system never edits either).

**End screen W03 — fields:** `snapshot(temple_id, at)`: `total`, `bhikkhu_total`, `samanera_total`,
`status.AVAILABLE` (ว่าง), `status.ON_INVITATION`, `status.TEACHING`, `status.CEREMONY`, `status.TRAVELING`,
`status.not_ready` (with breakdown UNAVAILABLE + PERSONAL + REST), `status.IN_TEMPLE` (อยู่ในวัด-ยังไม่มีสถานะ),
`status.UNKNOWN`; `location.in_temple`, `location.off_site`, `location.unknown`; `of_which_visiting`; `computed_at`
(stale chip over 60 s); `data_quality.errors`; per person: name, `effective_status`, `location_state`, `valid_until`,
`next_change_at`, `conflicts[]` (type, severity, overlap window), `reason.code` (secretary tier shows SICK etc.;
operational tier masks to "ไม่พร้อม").
Invariants visible to testers: sums CC-1..CC-3 (shown as "รวมครบ N" footer, hidden when equal; shown red text + words if not).
Accountable human: board shows who set each manual status ("ตั้งโดย ตนเอง / พระเลขานุการ ...").

### N-03 เจ้าอาวาส: "วันนี้ทั้งวัดเป็นอย่างไร?" (What is the temple like today?)

Actor: `abbot` (and deputy, assistant). Permission: `command_center.view` (T).
Entry: landing tab วัด.

1. Opens Command Center (W01): top strip with date (พ.ศ.), temple name, `computed_at` age.
2. Reads six panels (Monastic, Staff, Quests, Events, Facility, Community); every counter has a source tap.
3. Taps a number -> drill-down list (COMMAND_CENTER_UX §5) -> item detail.
4. Taps "รออนุมัติ" (panel head) -> approvals queue (J-01 step, J-09).
5. Taps "ไม่ทราบ" anywhere -> Unknown explainer sheet (what is missing, who can fill it).

**End screen W01 — fields:** see COMMAND_CENTER_UX §3 (all panel fields). Minimum: Monastic `total`, `status.*`,
`location.*`; Staff six-state counters (WORKING, FREE, ON_LEAVE, OFF_SITE_DUTY, OFF_SHIFT, UNKNOWN) with the sum invariant;
Quests counts by status and derived `OVERDUE`, `UNASSIGNED`, "รอตรวจรับ"; Events `state` chips for events within horizon
(default 60 days), `volunteer_gap` Σ; Facility buildings with `problem = true`, vehicles `FREE/BUSY/BLOCKED/UNKNOWN`;
Community pending point awards, open reports, Temple Contact unread. Approvals count = items this viewer may act on.
Unknown: any panel whose source fails shows "ไม่ทราบ" with a retry (never zero).

### N-04 แม่บ้าน: "พื้นที่ไหนต้องทำ?" (Which areas must I clean?)

Actor: `housekeeper`. Permissions: `quest.view` (A), `quest.complete` (S), `inventory.view` (D), `maintenance.report` (T).
Entry: หน้าหลัก (W09).

1. Opens Home; first card **พื้นที่ของฉันวันนี้** lists assignments, overdue first.
2. Taps a zone card -> quest detail with checklist (W05 variant) -> start -> tick items -> before/after photos (no faces) -> submit.
3. If nothing assigned: "วันนี้ไม่มีงานที่มอบหมาย" and a secondary list of claimable cleaning quests.
4. Taps "แจ้งปัญหา" at any time (J-04).

**End screen W09 — fields (CLEANING §6):** per row: `zone name`, `building name`, `due_at`, `status`, `access_note`
(optional), `event_in_zone_today` (optional chip), derived `OVERDUE` flag. Ordering: OVERDUE first -> `due_at` asc ->
`priority` desc. Secondary: claimable OPEN cleaning quests. Never an invented default zone.

### N-05 คนครัว: "ต้องเตรียมอาหารกี่คน?" (How many must the kitchen prepare for?)

Actor: `kitchen_staff`, `department_lead` (kitchen). Permissions: `headcount.view` (D), `inventory.view` (D),
`headcount.adjust` (D, lead only).
Entry: หน้าหลัก (W10).

1. Opens Home; first card shows the next meal service and the **range**.
2. Taps the card -> breakdown (confirmed here, known away, unknown, event guests, staff meals, adjustments).
3. Lead only: enters **planned number** (own decision, shown with name and time) and optional adjustments (+/- with
   mandatory reason).
4. After `prep_cutoff` the card freezes a snapshot; later change shows "เปลี่ยนหลังตัดยอด: −2" (push only at |Δ| >= 3).

**End screen W10 — fields (KITCHEN §3.4):** meal service name + time (monk meal noon cutoff note, configurable),
`lower`, `upper` (or "ไม่ทราบ" when event guests Unknown), `monks_confirmed_here`, `monks_known_away`, `monks_unknown`,
`nov_confirmed_here`, `nov_known_away`, `nov_unknown`, event guests C3 (registered with `meal_required`) or
"แขกกิจกรรม: ไม่ทราบ", `staff_confirmed`, `staff_unknown` (only if `staff_meals_provided`), adjustment entries (actor, time,
reason), `planned` ("ตัดสินใจโดย <ชื่อ> เวลา hh:mm"), `prep_cutoff`, snapshot delta flag, reference line
"ย้อนหลัง 7 วัน เสิร์ฟจริง: ..." (reference only). Kitchen roles receive **counts only**; categories with <= 2 people show
"น้อยกว่า 3".
Unknown: never a single invented number; no data -> "ยังไม่มีข้อมูลสถานะพระ" and the planned field is highlighted.

### N-06 คนขับ: "ต้องออกกี่โมง?" (What time must I leave?)

Actor: `driver`. Permissions: `vehicle.view` (A), `invitation.view` (A), `maintenance.report` (T).
Entry: หน้าหลัก (W11).

1. Opens Home; trips ordered by departure time, time in large bold.
2. Taps a trip -> detail: passengers (names for own trips only), pickup stops, venue, return window, notes.
3. Taps **รับทราบ** (ACKNOWLEDGED) -> later **ออกเดินทาง** -> **ถึงแล้ว** -> **กำลังกลับ** -> **เสร็จสิ้น**; each is one tap with
   timestamp; offline taps queue (SP-04).
4. "แจ้งปัญหารถ" opens a maintenance request prefilled with the vehicle (`source = trip_issue`).
5. "โทรหาพระเลขานุการ" is a plain tel link.

**End screen W11 — fields (VEHICLE §4):** `planned_departure_at` (or **"ยังไม่กำหนด"**) + `departure_source`
(computed / manual), `purpose`/rite, venue, passenger count and names, pickup stops, `planned_return_at` (or "ไม่ทราบ"),
host contact owner (via temple, not private details), notes, vehicle nickname + plate + state, EXPIRED DOCS flag (if any),
trip `status`, available transition buttons. A monk is never listed as driver.

### N-07 มัคนายก: "พิธีพร้อมหรือยัง?" (Is the ceremony ready?)

Actor: `ceremony_lead`. Permissions: `event.view` (T), `event.manage` (D), `quest.view` (D).
Entry: หน้าหลัก first module `ev.next_ceremony_readiness` -> W07.

1. Home card shows state chip (พร้อม / ใกล้พร้อม / กำลังเตรียม / ไม่พร้อม / ไม่ทราบ), percent, and top gaps.
2. Taps -> readiness screen: failed gates first, then gaps, then outstanding gate tasks.
3. Taps a gap -> opens the relevant board (monk roster to propose; volunteers; maintenance; checklist item).
4. When state is READY, taps **พร้อมแล้ว** (human attestation: ceremony PREPARED is not auto-derived) with the name shown.

**End screen W07 — fields (EVENT §5-6):** `state`, `percent`, `failed_gates[]` (G-OWNER, G-VENUE, G-STAFF, G-MAINT,
G-CRIT, G-CHECK, G-CONFLICT, each PASS/FAIL/UNKNOWN in Thai), `caps` (GATE_UNKNOWN, OUTSTANDING_GATE, NO_STAFFING_TARGETS,
NO_TASKS) in words, `reason` (OVERDUE_START, TIME_PRESSURE), monk `f/r` + pending `p`, volunteer gap, staff gap,
`starts_at` and hours remaining, venue + building problem flag, `T` and `S` shares, `lead_person`, PREPARED attestation.
The chip is never green unless READY, and colour is never the only cue.

### N-08 ช่าง: "จุดไหนมีปัญหา?" (Where is the problem?)

Actor: `technician` (A), `facility_manager` (T). Permissions: `maintenance.manage`, `asset.view`.
Entry: หน้าหลัก `fac.workorders_open` -> list, or map layer.

1. Opens work orders by severity (S1 first); each row shows building, zone, age and SLA state.
2. Switches to the map layer (maintenance): markers with count and top severity; tapping a building opens W08.
3. Opens a work order -> accept/start/submit evidence (S1/S2 need a photo) (J-04).

**End screens: work order list + W08 building sheet — fields (SPATIAL §5-6, MAINTENANCE §3-6):** list row:
`title`, `building` (name + code), `zone`, `asset`, `severity` (S1-S4, Thai names วิกฤต/สูง/กลาง/ต่ำ, or "ยังไม่คัดแยก (นับเป็น S2)"),
`status`, `age`, `sla_resolve_due_at` + OVERDUE flag, `heritage_flag`, `safety_flag`. Marker: `building_code`, `layer`,
`count`, `top_severity`, `top_label`, `deeplink`. Building sheet: header (name, code, status, "รอวัดยืนยัน" if unconfirmed),
Event, Quest, People count (checked-in only, **Unknown** without check-in data), Maintenance, Assets (no values),
Readiness, Zones, History.

### N-09 อาสา: "มีอะไรให้ผมช่วย?" (What can I help with?)

Actor: `volunteer`, `community_member`, `lay_resident`. Permissions: `quest.view` (P or A+P), `quest.complete` (S).
Entry: หน้าหลัก `cm.volunteer_quests` or ภารกิจ tab -> W13.

1. Opens list of public volunteer quests; filter by date, department, near me (temple only; no GPS).
2. Taps one -> detail: what to do, when, where, how many needed, how it is verified, what is recognised.
3. Taps **สมัคร** (J-03).

**End screen W13 — fields:** `title`, department, `starts_at`/`due_at`, venue (building name), `capacity`, `unfilled`
("ต้องการอีก N คน") and filled count, `claimable`, `verification_policy` in plain words ("เจ้าหน้าที่สแกน QR ตอนมาถึง"),
points `{amount, ledger}` shown as the lay label or "ไม่มีแต้ม", **etiquette note** (what to wear/bring; a free-text
section of the description — suggested convention, see REPORT), organiser name (accountable), "ต้องรออนุมัติจากหัวหน้าฝ่าย"
if `event.volunteer_approve` applies.
Public view limits: "ต้องการอาสา N คน (ฝ่าย X)" only; no monk counts, no gates, no maintenance (EVENT §7).

### N-10 ญาติโยม: "วันนี้วัดมีกิจกรรมอะไร?" (What is on at the temple today?)

Actor: `community_member` (also visitors via the public temple page). Permission: `event.view` (P).
Entry: หน้าหลัก (W12) or public temple page.

1. Opens Home -> "วันนี้ที่วัด" card.
2. Taps an item -> public event detail: title, time, venue, volunteer needs, **[ติดต่อวัด]**, **[สมัครอาสา]**.
3. If empty: "วันนี้วัดยังไม่มีกิจกรรมสาธารณะ" + [ดูกิจกรรมที่จะมาถึง] + [ติดตามวัด].

**End screen W12 — fields:** per event: `title_th`, `starts_at`/`ends_at` (พ.ศ.), venue (building name), `lunar_ref` label if
the temple entered it (display only), "ต้องการอาสา N คน (ฝ่าย X)", `visibility = public`. Never readiness, never monk names.

### N-11 คนสวน (PROPOSED): "วันนี้ต้องดูแลโซนไหน รดน้ำที่ไหน?"
Actor `gardener`; permission `quest.view` (A). Entry: หน้าหลัก `wf.garden_zones_watering`. End screen: list rows `zone`,
`task` (e.g. watering), `due_at`, `status`, `equipment` needed (from `wf.equipment`, `asset.view` A). Empty: "วันนี้ไม่มีงานสวนที่มอบหมาย".

### N-12 รปภ. (PROPOSED): "เวรนี้ประจำจุดไหน เดินตรวจรอบไหน?"
Actor `security_guard`; permissions `presence.set_self`, `quest.view` (A), `security.log` (S). Entry: `wf.shift_handover`.
End screen: shift `post`, shift window, **handover note from the previous shift** with acknowledge button (required for
security), patrol rounds (time, checkpoints, scanned/not scanned), gate log entry button, incident button. Incident
contents of others are not shown (restricted `security.incident.view`).

### N-13 ธุรการ (PROPOSED): "วันนี้มีกิจนิมนต์/นัดหมายอะไรเข้ามา?"
Actor `office_staff`; permissions `invitation.manage` (T), `schedule.view` (T). Entry: `mg.invitations_inbox`.
End screen: counts and list by status (RECEIVED, REVIEWING, TEAM_PROPOSED), each with `host` name, `rite_type`,
`starts_at`, venue, `monks_required`, missing-field chips (ไม่ทราบ), `received_via`; "นัดหมายวันนี้" list.

### N-14 เจ้าหน้าที่/เด็กวัด (PROPOSED): "ตอนนี้ผมต้องทำอะไร?"
Actor `staff_general`, `temple_boy`, `volunteer`; permission `quest.view` (A). Entry: `wf.my_quests_today` (Simple Mode default for
temple_boy). End screen: first row large "งานถัดไป" (title, start time, place), claimable department quests below,
pinned check-in and "แจ้งปัญหา". Empty: "ยังไม่มีงาน" (never a made-up suggestion).

### N-15 to N-18 Command Center questions (EXECUTIVE_PRODUCT_PLAN §6)

| Question | Path | End screen and fields |
|---|---|---|
| มีพระกี่รูปว่าง / ออกกิจนิมนต์กี่รูป | CC Monastic panel -> board | W03 as N-02 (`status.AVAILABLE`, `status.ON_INVITATION`) |
| งานไหนยังไม่พร้อม | CC Events panel tab "ไม่พร้อม" | Event list: `title`, `starts_at`, `state`, `failed_gates`, gaps; then W07 |
| อาคารไหนมีปัญหา | CC Facility panel -> buildings with `problem = true` | List by severity, then W08 |
| รถคันไหนว่าง | CC Facility panel -> vehicles | `vehicle_availability`: state FREE/BUSY/BLOCKED/**UNKNOWN**, `free_from`, `free_until`, `seats_usable`, `driver_available` |
| อาสายังขาดกี่คน | CC Events panel -> volunteer gap | Per event: Σ gap, per department, pending `p`; monk and staff gaps separate |
| แต้มถูกต้องไหม / ใครดูอะไรได้ | Admin screens (Wave 6/8) | Out of scope for this wave; the UX hooks are the ledger separation rule and the permission-denied pattern |

---

## 3. Journeys (J-)

### J-01 Invitation intake -> Smart Assignment -> human confirm

Actors and codes: intake `invitation.manage` (T) (office_staff, monk_secretary, abbot-level); propose `invitation.manage`;
**confirm `invitation.confirm` (T; secretary only if the abbot delegated and the rite type is routine)**; monks acknowledge
(`invitation.view` A); driver and vehicle `vehicle.manage` (facility_manager). Lifecycle per SCHEDULE §3.2.
Screens: W04 (proposal), W20 (abbot approvals), inbox.

| # | Actor | Step | Screen / state |
|---|---|---|---|
| 1 | office or secretary | Taps **+ รับกิจนิมนต์**. Fields: host name (required), phone, rite type (list), start (date/time), venue text, expected duration, monks required, transport (host provides / temple vehicle / other), notes, `received_via` (phone / LINE / walk-in / web form). Incomplete is allowed. | Intake form -> RECEIVED |
| 1a | secretary | Alternative: pastes a LINE message or dictates -> **ร่างโดย AI** draft pre-fills the form; the person edits and accepts (J-10). The invitation exists only after the human saves | AI draft banner |
| 2 | office/secretary | Taps **เริ่มตรวจสอบ** | Required fields check; missing ones listed ("ขาด: สถานที่") -> REVIEWING |
| 3 | secretary | Taps **เสนอรายชื่อพระ** (runs `sma-v1`, read-only) | W04 proposal |
| 4 | secretary | Reads the suggested list **in words** (reasons such as "ว่างตลอดช่วง", "ไปไม่บ่อยในเดือนนี้", "เคยไปบ้านนี้"; no numeric score or "อันดับ" on the main screen; the F/S/C/W/L/K breakdown is in a collapsed audit section), warnings, **excluded** monks with constraint codes (a sick monk appears only as "ติดกิจ/ไม่ว่างในช่วงนี้", never "ป่วย"), team blockers (INSUFFICIENT_CANDIDATES, NO_VEHICLE, TRAVEL_ESTIMATE_REQUIRED) | W04 |
| 5 | secretary | Adjusts team manually (SMART or MANUAL recorded), sets LEAD if required. Monks with no opted-in status appear in a **separate list "ต้องโทรถามก่อน"** below the first list, never mixed in. Travel time: enter manually, reuse the saved estimate for this venue, or leave Unknown; Unknown does **not** block the proposal but the return buffer reads "ไม่ทราบ" and needs acknowledgement later (`RETURN_BUFFER_UNKNOWN`) | W04 |
| 6 | secretary | Taps **เสนอทีมให้ตัดสินใจ** | TEAM_PROPOSED; approvals queue of the confirmer |
| 7 | abbot (or delegated secretary) | Opens request: sees the proposal version he reviews, team, warnings needing acknowledgement (NO_AVAILABILITY_SIGNAL for each needs-confirmation monk, RETURN_BUFFER_UNKNOWN, LATE_NOTICE, UNKNOWN_VASSA), vehicle/driver held or not. Ticks each required acknowledgement. | W20 |
| 8 | abbot | Taps **ยืนยันกิจนิมนต์** | Shows accountable line: "ยืนยันโดย พระครู… (เจ้าอาวาส) เวลา hh:mm". Blocked states are explained in words (`CONFIRM_BLOCKED`, `STALE_PROPOSAL` -> "ข้อมูลเปลี่ยนแล้ว ตรวจใหม่", `TEAM_INCOMPLETE`, `NO_VEHICLE`) |
| 9 | system | CONFIRMED: three entries per monk (travel OUT, invitation, travel BACK), `trip.requested` when temple vehicle, notifications | Confirmation toast (calm) + undo-by-cancel link |
| 10 | monks | See entries in My Day; **รับทราบ** or **แจ้งติดขัด** (flags to the secretary; nothing auto-cancels) | W02 |
| 11 | facility_manager | Assigns vehicle + driver (`vehicle.manage`); driver acknowledges | W11 |
| 12 | later | Replace monk / reschedule / cancel via `invitation.confirm` with mandatory reason; each shows the change impact list (who is notified) before confirming | Change sheet |

Never allowed in the UI: AI confirming; a one-tap "auto assign"; hiding a hard-constraint violation; showing manual-status
reasons in proposal output; assigning a monk as driver. Edge: a proposal older than its `version` shows "ข้อเสนอนี้หมดอายุ".
Accountable humans: proposer (secretary), confirmer (abbot-level), assigner of vehicle (facility_manager).

### J-02 Quest claim -> evidence -> verify

Actors: assignee (`quest.complete` S; claim also needs `quest.view`), verifier (`quest.verify` D/T, never the assignee).
Screens: W05 (detail), W06 (verify queue).

| # | Actor | Step | Result / copy |
|---|---|---|---|
| 1 | assignee | Browses ภารกิจ -> **รับงานนี้** (claimable) or sees an assigned one | ASSIGNED; "รับโดย ... เวลา ..."; limit message at 5 open claims ("รับได้พร้อมกัน 5 งาน") |
| 2 | assignee | **เริ่มทำ** | IN_PROGRESS; blocked if dependency unmet: "ต้องทำ <งาน> ให้เสร็จก่อน" (`DEPENDENCY_UNMET`) |
| 3 | assignee | Ticks checklist; optional **ติดขัด** with reason code (รอวัสดุ / รอคน / ความปลอดภัย / อื่น ๆ) + text | BLOCKED, visible to manager |
| 4 | assignee | Adds evidence per policy: photos (before/after, no faces; guidance text), note >= 10 chars; server time is used | Progress meter "หลักฐาน 1/1" |
| 5 | assignee | **ส่งงาน** | Guards: required checklist items, evidence. Errors list the missing item ("ยังไม่ได้ติ๊ก: ล้างห้องน้ำ") |
| 6a | system | Method `none`/auto verified (QR within window, attendance) -> COMPLETED immediately | "เสร็จแล้ว" quiet confirmation |
| 6b | system | Human method -> SUBMITTED, status text "รอตรวจรับโดย <หัวหน้าฝ่าย>" (**not** "เลยกำหนด" blame on the assignee; `overdue_owner = VERIFIER`) | W05 |
| 7 | verifier | Opens W06 queue (oldest first, overdue-by-verifier first), views evidence and checklist | W06 |
| 8 | verifier | **ตรวจรับ** or **ส่งกลับแก้ไข** (reason mandatory, e.g. "รูปไม่ชัด") | Shows accountable line "ตรวจรับโดย ... เวลา ..."; reject count 3 raises "ควรให้ผู้จัดการดู" |
| 9 | system | COMPLETED; points credited exactly once only if the quest has a ledger (monastic: แต้มกิจวัตร private; lay: community points, possibly held) | No fanfare |
| 10 | manager | Mistake found later: **ยกเลิกผลการตรวจรับ** (`quest.manage`, reason) -> stays COMPLETED with a revoked mark and a compensating ledger row | Audit visible |

Self-verify attempt: button absent; if reached by link, SP-05 with "ผู้ตรวจรับต้องไม่ใช่ผู้ส่งงาน — ขอให้ผู้อื่นตรวจ"
(applies to the abbot too). Offline: submit queues with `client_at` and shows "รอส่ง (ออฟไลน์)".

### J-03 Volunteer sign-up -> check-in -> points

Actors: volunteer (`quest.view` P/A+P, `quest.complete` S), department lead (`event.volunteer_approve` D), staff at the
event (`quest.verify` D or QR scanner), points reviewer (`points.award_community` D/T). Lay only.

| # | Actor | Step | Result |
|---|---|---|---|
| 1 | person | From W13 taps **สมัคร** (needs membership; visitors are routed to F-03 "ขอเข้าร่วมก่อน") | Sign-up screen: shift, place, what to wear/bring, who is the organiser, **no guilt or countdown copy** |
| 2 | person | Confirms; if target requires approval -> "รออนุมัติจากหัวหน้าฝ่าย" | Counted in pending `p`, not in confirmed `f` |
| 3 | lead | Approves in queue (W20 type "อาสา") | "ยืนยันแล้ว"; person notified |
| 4 | person | Day of event: Home shows `cm.my_shifts`; at the venue taps **เช็กอิน** (scan the event QR; same temple only) or staff scans the volunteer | Window rule: from 30 min before start; success text "เช็กอินแล้ว 08:42" |
| 5 | person | Works; may tick tasks; **เช็กเอาต์** at the end | |
| 6 | verifier | Organiser approval or QR attendance confirms | COMPLETED |
| 7 | system | Boon points credited once. High-value quests or anti-cheat signals **hold** the award for review ("รอตรวจสอบ ไม่เกิน 48 ชม." HYPOTHESIS), never auto-punish; appeal names a human | Points history W-ฉัน |
| 8 | person | Sees "ขอบคุณจากวัด" + impact line ("ช่วยเตรียมอาหาร 120 ที่") and private hours; **no public leaderboard** by default; public thanks only with consent | |

Edge states: capacity full -> "เต็มแล้ว" with [เข้าคิวสำรอง] only if the temple enabled waitlist (otherwise [ดูงานอื่น]);
event rescheduled -> assignments NEEDS_RECONFIRM, banner "วันเวลาเปลี่ยน — กรุณายืนยันอีกครั้ง"; wrong-temple QR ->
"QR นี้ไม่ใช่ของวัดนี้"; minors: allowed to volunteer for adult-supervised, daytime, on-site quests only (HYPOTHESIS; GENERAL §2.3).
Donations never produce points; copy never mentions merit as the thing exchanged.

### J-04 Report a problem -> work order

Actor: any member with `maintenance.report` (T) except `community_member`; triage `maintenance.manage`; technician A.
Screens: W16.

| # | Actor | Step | Result |
|---|---|---|---|
| 1 | reporter | Taps **แจ้งปัญหา** (pinned, or scan an asset QR -> prefilled asset + building) | Form: building (required; picker or map tap), zone (optional), what is wrong (text; voice -> AI draft optional), photo (optional, face-free guidance), severity chips **ฉุกเฉิน / สูง / กลาง / ต่ำ / ไม่แน่ใจ** |
| 2 | reporter | **ส่ง** | REPORTED; reporter always sees status of own report (S scope) |
| 2a | reporter | "ฉุกเฉิน" immediately notifies facility_manager and abbot_assistant; copy: "แจ้งผู้ดูแลแล้ว ถ้าอันตรายให้ออกห่างจุดนั้นก่อน" | Exception to quiet hours |
| 3 | facility_manager | Triage: set final severity, category, SLA; mark duplicate (reporter notified); reject with reason | TRIAGED / DUPLICATE / REJECTED |
| 4 | facility_manager | **รับเรื่อง** -> creates the maintenance quest; assign to technician or vendor | ACCEPTED -> ASSIGNED |
| 5 | technician | Start; S1/S2 require photo evidence; heritage-flagged requests need "อนุมัติแล้ว" reference before IN_PROGRESS (S1 make-safe recorded as such) | IN_PROGRESS -> RESOLVED_PENDING_VERIFY |
| 6 | verifier | facility_manager (or reporter for S4) verifies | CLOSED; repair history written |
| 7 | reporter | Gets "แก้ไขเสร็จแล้ว" with technician name | |

Unknown severity counts as S2 for the problem flag until triaged and the UI says so. Cost fields are never shown to the
reporter or technician (`asset.manage` / `finance.view` only). Accountable humans: triager, assignee, verifier shown in
the request timeline.

### J-05 Temple Contact (the only default public route to monastics)

Actors: anyone (visitor, community member, volunteer) composes; `contact_inbox.manage` (T) routes and replies (abbot,
deputy, assistant, secretary, office_staff).

| # | Actor | Step | Result |
|---|---|---|---|
| 1 | sender | Opens **ติดต่อวัด** from temple page, Home footer, or event page | Compose screen W18: topic (ขอนิมนต์พระ / สอบถามกิจกรรม / ขอบริจาคสิ่งของ / อื่น ๆ), message, name and phone (**optional unless a reply is wanted**), explanation line "ข้อความส่งถึงเจ้าหน้าที่ของวัด ไม่ได้ส่งถึงพระโดยตรง" |
| 2 | sender | Sends (rate limited; spam controls) | "ส่งแล้ว วัดจะติดต่อกลับ" + reference code; no promise of time |
| 3 | inbox staff | Reads thread, picks owner (routing), may convert to **invitation draft** ("ขอนิมนต์พระ" -> J-01 step 1) | Thread states NEW -> ASSIGNED -> REPLIED -> CLOSED |
| 4 | inbox staff | Replies as the **temple** ("ตอบโดย เจ้าหน้าที่วัด (ชื่อ)") | Sender sees reply in thread or by phone/LINE |
Monastics have no direct-message UI at P0. A monk who opts in to direct contact (per temple and per relationship) is a
later setting and is not designed here. Minors cannot be contacted by public senders at all.

### J-06 Block / mute / report

Actor: any lay person with `community.participate` (S), not minor; reviewers `moderation.manage` (T; abbot, deputy,
temple_admin).

| # | Step | Detail |
|---|---|---|
| 1 | On any person, message or profile: **⋯ -> บล็อก / ปิดเสียง / รายงาน** | Same menu everywhere (chat, group, connection card, comment) |
| 2 | บล็อก | Confirm sheet: "คนนี้จะส่งข้อความหรือโทรหาท่านไม่ได้" ; instant; undo in ฉัน > คนที่บล็อก |
| 3 | รายงาน | Reason list (ข้อความไม่เหมาะสม / ก่อกวน / แอบอ้าง / เกี่ยวกับผู้เยาว์ / อื่น ๆ), optional note; the message is attached; reporter identity hidden from the reported person |
| 4 | Moderator | Queue `wf.moderation_queue`: item, context, history, actions (warn, mute, remove, suspend membership via `member.manage` path); decision reason mandatory and shown to the reporter as outcome without details |
| 5 | Child-safety category | Reports "เกี่ยวกับผู้เยาว์" are pinned at top and notify the abbot-level reviewer (HYPOTHESIS routing) |
Monastics: no chat, therefore no block surface; reports about a monastic come via Temple Contact.

### J-07 Set availability (monk) and secretary on-behalf status

Actors: `availability.set_self` (S) for own; `availability.set_others` (T) for UNAVAILABLE on behalf. Screen W17.

| # | Step | Detail |
|---|---|---|
| 1 | Monk taps status control on My Day | Sheet: [พร้อมรับกิจ] [พักผ่อน] [กิจส่วนตัว] [ไม่พร้อม] with **end time required** (default end of day; chips +1 ชม., +3 ชม., สิ้นวัน, เลือกเวลา); optional location hint (ในวัด / นอกวัด / ไม่ระบุ). Calendar-driven states (ทำพิธี, ออกกิจนิมนต์, เดินทาง, สอน) are shown read-only, not selectable (`CALENDAR_STATE_NOT_SETTABLE`) |
| 2 | Monk confirms | New own row truncates his overlapping own rows (reading B of AVAILABILITY §8); an admin-set UNAVAILABLE is not overridden: "ผู้ดูแลตั้งสถานะไม่พร้อมไว้ถึง ..." |
| 3 | Overlap with a commitment | Calm line: "ซ้อนกับกิจ 09:00 — พระเลขานุการจะเห็นความขัดแย้ง" (nothing is cancelled) |
| 4 | Clear | **ยกเลิกสถานะ** any time (row truncated, history kept) |
| 5 | Secretary on behalf | From a monk's detail: **ตั้งว่าไม่พร้อม** only (reason SICK / RETREAT / OTHER, end time required); the monk sees "ตั้งโดย พระเลขานุการ" and can ask to change; the secretary can never set ว่าง/พักผ่อน/กิจส่วนตัวแทนเขา |
Health reason is visible to the monk and to `availability.set_others` holders only; elsewhere "ไม่พร้อม".

### J-08 In-temple ceremony roster: propose -> confirm monks -> acknowledge

Actors: `ceremony_lead` (propose, `event.manage` D), confirm `ceremony.confirm_monks` (T; secretary by default
allowed for routine rites), monks acknowledge. Lifecycle SCHEDULED -> ROSTER_PROPOSED -> ROSTER_CONFIRMED -> PREPARED.

1. Lead sets `monks_required` (temple-entered; the app never suggests a number from the rite type) and opens "เสนอรายชื่อ".
2. Manual pick or ranked suggestion with reasons; **samanera appear only when `samanera_allowed`**; ordination-quorum rites
   show an informational prompt, never a ruling.
3. Lead submits -> assignments PROPOSED; lead sees "รอพระเลขานุการ/เจ้าอาวาสยืนยัน" (lead cannot confirm).
4. Confirmer reviews in W20 (conflict flags, DOUBLE_BOOKED) and confirms each monk; accountable line shown.
5. Entries appear in monks' My Day with "ได้รับมอบหมาย: <พิธี> <เวลา> <สถานที่>" and acknowledge/แจ้งติดขัด.
6. Reschedule -> all assignments NEEDS_RECONFIRM with banner; cancellation notifies everyone.

### J-09 Event: create -> approve -> readiness -> duplicate from Temple Memory

Actors: `event.manage` (D/T) create and plan; `event.approve` (restricted) approves; `event.volunteer_approve` (D);
duplicate from memory `event.manage`. Screens: event list, W07, W20.

1. Create (DRAFT) from template or **คัดลอกจากความรู้ของวัด**: pick a past event -> new dates -> preview of what is copied
   (structure, checklist, targets, weights) and what is **not** (people, evidence, points, status). Lessons appear as
   "บทเรียนปีที่แล้ว" beside the new event; a human may turn a lesson into a checklist item.
2. Plan (PLANNING): title, dates, venue(s), lead (accountable), departments with leads, staffing targets.
3. Approve: the approver sees title, date, venue, scope and **current readiness** (approval does not require READY);
   accountable line "อนุมัติโดย ...".
4. Prepare: the duplicate shows **ไม่พร้อม** by construction ("เพิ่งคัดลอก — ยังไม่มีผู้รับผิดชอบ"), so nobody mistakes a copy for
   a ready event.
5. LIVE: readiness frozen as snapshot; live gaps still shown; COMPLETED -> closing checklist (actual attendance, incidents)
   -> retro prompt -> ARCHIVED to Temple Memory.

### J-10 AI draft -> human accept (voice or text -> quest / event / invitation / maintenance)

Hidden until Wave 7 (F-39, ADR-0005). Design rule now so earlier screens leave room.

1. Person taps the mic (or pastes text) in a form that supports drafts.
2. System shows **ร่างโดย AI** card: fields filled, with uncertain fields marked "ตรวจสอบ" and unfilled fields blank
   (never guessed values; no fabricated times).
3. The person edits and presses **ใช้ร่างนี้** (accept) or **ทิ้ง**. Only accept calls the normal create API as that person;
   the record carries `source = ai_draft` and the accepting human as creator.
4. AI never confirms invitations, verifies quests, approves events, assigns monks or awards points; those buttons do not
   exist inside a draft.
5. Funeral data, health reasons and minors' data are excluded from AI input (FUNERAL §5; research doc 03 §4) and the UI
   hides the mic on those forms.

### J-11 Staff check-in / check-out and handover

Actor: `presence.set_self` (S) staff; lead proxy `presence.set_others` (D/T).

1. Pinned one-tap **เช็กอิน** (>= 56 px). Confirmation = text + icon + optional haptic; **undo within 2 minutes**.
2. No GPS, no background location. QR post check-in is an alternative (separate `/c/` family).
3. Check-out: **เช็กเอาต์** (never blocked by a missing handover note; lead gets a flag).
4. Handover (required for security, recommended for kitchen): note lines + references to open quests/problems; incoming
   person must acknowledge within the configured time.
5. Staff without smartphones: lead opens "เช็กอินแทน" list (one screen, tick people) — flagged "เช็กอินโดย (ชื่อหัวหน้า)".
6. States shown to peers are coarse; late counts and handover flags are for the lead only.

### J-12 Reward redemption (lay only; calm)

Actor: `community.participate` (S); admin `reward.manage`.

1. Points history first (`cm.my_points`), then the catalog "ของที่ระลึกจากการร่วมกิจกรรม" with stock and monthly cap shown honestly.
2. Item detail: what it is, points required, remaining stock, **no timers, no "only 2 left!" pressure copy**, no random
   rewards, no bundles of chance.
3. Confirm sheet: item, cost, new balance, "เปลี่ยนใจได้จนกว่าเจ้าหน้าที่จะจัดของ" (if the temple allows cancellation).
4. Fulfilment status by the reward admin (pickup place and time). Balance cannot go below zero; failures say
   "แต้มไม่พอ" with the exact gap.
Sacred objects are not catalog items (research doc 05 §3, HYPOTHESIS). Monastics never see this module.

---

## 4. Flow-to-wireframe-to-spec index

| Flow | Wireframes | Main specs |
|---|---|---|
| F-01 | W14, W15 | TENANCY §3-5, §7; research docs 03, 08 |
| N-01, J-07 | W02, W17 | AVAILABILITY §2-9; QUEST §3 |
| N-02 | W03 | AVAILABILITY §6, 9, 10 |
| N-03, N-15..18 | W01 | AVAILABILITY §10; STAFF_PRESENCE §5; EVENT §6; MAINTENANCE §6; VEHICLE §6 |
| N-04 | W09, W05 | CLEANING §6; QUEST §7-8 |
| N-05 | W10 | KITCHEN §3 |
| N-06 | W11 | VEHICLE §4-5 |
| N-07, J-08, J-09 | W07, W19, W20 | EVENT §4-7; CEREMONY §6 |
| N-08, J-04 | W08, W16 | SPATIAL §5-7; MAINTENANCE §3-6 |
| N-09, J-03 | W13 | QUEST §4, §8; research doc 05 |
| N-10, J-05 | W12, W18 | EVENT §7; domain model §9 |
| J-01 | W04, W20 | SCHEDULE §3, §5 |
| J-02 | W05, W06 | QUEST §5-8 |
