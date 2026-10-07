# KITCHEN — Kitchen department lead (หัวหน้าครัว) and kitchen staff (คนครัว)

Owner: Agent 17 · Wave 1a, revised in Wave 1 fix round · Readiness: **DESIGNED** (content HYPOTHESIS until field-validated; see §11)
Master refs: matrix §2.2, §4, §5 · `TEMPLE_DOMAIN_MODEL.md` §4 (availability), §11 Q5 · features F-25, F-23 (inventory, Agent 18)
Role note: there is no `kitchen_lead` role. The kitchen lead is a `department_lead` (หัวหน้าฝ่าย) whose department is `kitchen` (matrix §2.2); the abbreviation "lead" below always means that. Legend for quest templates: `CLEANING.md` §0. All numbers in examples are illustrative, not data.

HYPOTHESIS notice: the duties, meal times and the rule that monastics take their meals only at certain hours are
general-knowledge assumptions that Agent 01 must source (Vinaya constraint and daily routine, RQ-01/RQ-03). This file
makes **meal services configurable** (`meal_service` concept: name, time, audience) and hard-codes no times.

## 1. Role goals

| Role | Goals |
|---|---|
| `department_lead` (kitchen) | Know how many to cook for before prep starts; plan menu; keep stock and shopping list current; assign kitchen quests; hand work over cleanly |
| `kitchen_staff` | Know what to prepare and for how many, do the prep, keep the kitchen clean, flag stock shortages |

## 2. Daily and weekly workflow (HYPOTHESIS)

| Step | When | System behaviour |
|---|---|---|
| Check-in | shift start | one tap |
| See headcount | before each meal service, before `prep_cutoff` | `wf.meals_today_headcount` (§3) |
| Prep and cook | per service | QT-KIT-01/02 |
| Serve / pack | per service | step inside checklist |
| Record served count (optional) | after service | one-tap number, feeds Temple Memory history |
| Close-down and clean | after last service | QT-KIT-03 |
| Stock check | daily | QT-KIT-04 |
| Menu plan, shopping list | weekly (lead) | QT-KIT-05, QT-KIT-06 |

## 3. Headcount (required definition)

### 3.1 Purpose and non-goals
Answer **"ต้องเตรียมอาหารกี่คน?"** for one *meal service* on one date. Non-goals: portion/recipe maths, procurement,
cost (finance is out of pilot, Q-05), per-person tracking of who eats.

### 3.2 Inputs (all derived from existing domain data, plus one manual input)

| # | Component | Source | Possible values |
|---|---|---|---|
| C1 | Monks (พระภิกษุ) in temple at service time | Availability resolver (`TEMPLE_DOMAIN_MODEL.md` §4.2) evaluated **at the service time** for each active `bhikkhu` membership | three counts: `monks_confirmed_here`, `monks_known_away`, `monks_unknown` |
| C2 | Novices (สามเณร) in temple | Same, for `samanera` | `nov_confirmed_here`, `nov_known_away`, `nov_unknown` |
| C3 | Registered event guests | Agent 19 events: confirmed registrations (and event volunteers) with `meal_required = true` for events whose time window covers the service | integer ≥ 0, or **Unknown** if an overlapping event has no registration mechanism |
| C4 | Staff meals | Optional temple setting `staff_meals_provided` (default **off**, HYPOTHESIS that this varies). If on: staff whose shift covers the service, counted from `STAFF_PRESENCE_SPEC.md` | `staff_confirmed`, `staff_unknown` |
| C5 | Manual adjustment | Kitchen `department_lead` (`headcount.adjust` D); signed integer with a mandatory reason (e.g. "+5 ผู้มาถวายเพลล่วงหน้า") | any integer; list of entries |

Classification of a monk at service time `t` (uses the resolver output, no new rules):
- **known_away**: `location_state = OFF_SITE` at `t` from a calendar-driven or valid manual state (ON_INVITATION, TRAVELING, CEREMONY off-site, a manual state with stated off-site location).
- **confirmed_here**: `location_state = IN_TEMPLE` at `t` from a calendar-driven state or a manual state whose `valid_until` covers `t`. Check-in-derived IN_TEMPLE counts only when `t` is within the check-in TTL (so it applies to a service in the next hours, not tomorrow).
- **unknown**: everything else (resolver `UNKNOWN`, or location unknown).
- Invariant: `confirmed_here + known_away + unknown = active members of that kind` (reuses the Command Center sum invariant).

Because most future meals will have many monks in `unknown` (monks are not required to opt in), the headcount is
shown as a **range**, never as one invented number.

### 3.3 Formula

```
lower = monks_confirmed_here + nov_confirmed_here + C3 + staff_confirmed + adjustment
upper = (monks_total − monks_known_away) + (nov_total − nov_known_away) + C3 + (staff_confirmed + staff_unknown) + adjustment
        → upper is **Unknown** if C3 is Unknown (event with no registration)
planned = optional integer chosen by the lead (the decision), stored with who/when; never auto-filled from lower/upper
```
`lower` and `upper` are bounds, not estimates: `lower` counts only people known to be present; `upper` counts everyone
not known to be away. Adjustments are included in both and listed separately so they are visible.

### 3.4 What is shown when an input is Unknown

| Situation | Display (Thai) | Rule |
|---|---|---|
| All inputs known | "พระ 12 · สามเณร 3 · แขกลงทะเบียน 20 · รวม 35 รูป/คน" | single total (lower = upper) |
| Monks/novices partly unknown | "ยืนยันอยู่วัด 12 · ไม่ทราบ 6 · ไม่อยู่ 2 → เตรียมได้ 12–18" | range plus the three parts; **ไม่ทราบ always shown** |
| Event overlaps with no registration | "แขกกิจกรรม: ไม่ทราบ" and `upper = ไม่ทราบ`; `lower` still shown | never estimated from history |
| Registered guests known, walk-ins unknown | "ลงทะเบียน 20 + ผู้มาเพิ่ม: ไม่ทราบ" | walk-in count is not part of C3 unless the lead adds an adjustment |
| No availability data at all | "ยังไม่มีข้อมูลสถานะพระ" with total roster and the **manual planned** field highlighted | roster size is still shown |
| Lead has set `planned` | planned shown as "ตัดสินใจโดย <ชื่อ> เวลา hh:mm" next to the bounds | bounds remain visible |
| History | "ย้อนหลัง 7 วัน เสิร์ฟจริง: 31, 34, 29 …" (only if `actual_served` was entered) | reference only, **never** fed into the formula |

### 3.5 Cut-off and change notices
`prep_cutoff` is a temple setting per service (concept; HYPOTHESIS default 120 min before service). At the cut-off
the system stores a **snapshot** (bounds, components, planned). A material change after cut-off (|Δ upper| ≥ configurable,
default 3) sends a push to the kitchen `department_lead` and shows "เปลี่ยนหลังตัดยอด" on the kitchen home. No automatic
re-planning.

### 3.6 Privacy of headcount
Kitchen roles receive **counts only** (matrix note 4), delivered by an aggregate function so that no individual
monastic's status, location or reason is exposed. Dietary categories (vegetarian, allergy) are religion-/health-adjacent
(PDPA s.26): they are optional on guest registration, shown to the kitchen **only as aggregate counts**, never per person.
Very small groups (≤ 2 people in a category) are shown as "น้อยกว่า 3" to prevent identification — **HYPOTHESIS** control, to confirm with Agent 13.

### 3.7 Headcount cases (WF-31…WF-40)

Given a temple with 15 active bhikkhu and 5 samanera unless stated; service S at 10:30 Asia/Bangkok.

| ID | Given | When | Then |
|---|---|---|---|
| WF-31 | At 07:00 monks: 9 confirmed here (check-in fresh), 3 known away (invitation 09:00–13:00), 3 unknown. Novices: 5 confirmed here. No events. No staff meals. | Lead opens headcount for S | lower = 9+5 = 14; upper = (15−3)+(5−0) = 17; display "เตรียมได้ 14–17", unknown monks 3 shown. |
| WF-32 | Same as WF-31, lead sets planned = 16 | Opens again | planned 16 shown with name and time; bounds unchanged. |
| WF-33 | Meal is tomorrow; no calendar items; no manual states; check-ins from today are stale at tomorrow's `t` | Open headcount | monks: confirmed 0, known away 0, unknown 15; novices unknown 5; lower = 0, upper = 20 = roster; displayed "ไม่ทราบ 20" with banner "ยังไม่มีข้อมูล" and planned field highlighted. System does not suggest a number. |
| WF-34 | Event E (merit-making, registration on) overlaps S with 20 confirmed registrants `meal_required` | Open headcount | C3 = 20 added to both bounds. |
| WF-35 | Event E overlaps S but has no registration mechanism | Open headcount | C3 = Unknown; `upper` = Unknown; `lower` computed without C3; banner "แขกกิจกรรม: ไม่ทราบ". |
| WF-36 | Lead adds adjustment +5 with reason "ผู้ถวายเพล" | Save | adjustment entry stored (actor, time, reason); lower and upper both +5; shown as separate line. |
| WF-37 | `staff_meals_provided = on`; 6 staff on shift covering S: 4 checked in, 2 no signal | Open headcount | staff_confirmed = 4, staff_unknown = 2; lower +4; upper +6. |
| WF-38 | Cut-off passed with upper = 17; at 09:00 two monks confirm an invitation covering S | Recompute | snapshot keeps 17; live upper = 15; |Δ| = 2 < 3 so no push; kitchen home shows "เปลี่ยนหลังตัดยอด: −2" (display always; push only at threshold). |
| WF-39 | `kitchen_staff` (has `headcount.view` D, no `availability.view`) opens headcount | Read | succeeds through the aggregate function with counts only; no monk names or reasons are returned (verified by checking the payload has no person ids). Requires `headcount.view` D (YAML grants it to `kitchen_staff`). |
| WF-40 | A user from temple B calls the headcount function with temple A's id | Read | denied; no counts returned (tenant isolation P0). |

## 4. Quest templates

All: `quest_type = kitchen`, `department = kitchen`, `points = 0`.

| ID | Title (TH / EN) | Recurrence · window | Claimable | Assigner |
|---|---|---|---|---|
| QT-KIT-01 | เตรียมอาหารมื้อเช้า / Prepare morning meal (name from `meal_service`) | Daily · starts at `prep_start`, due at `serve_time − 15 min` | No | kitchen `department_lead` (`quest.assign` D) |
| QT-KIT-02 | เตรียมอาหารมื้อเพล / Prepare midday meal | Daily | No | kitchen `department_lead` |
| QT-KIT-03 | ปิดครัวและทำความสะอาด / Close-down and clean | Daily after last service | Yes | kitchen `department_lead` |
| QT-KIT-04 | ตรวจสต็อกครัว / Kitchen stock check | Daily | No | kitchen `department_lead` |
| QT-KIT-05 | วางแผนเมนูประจำสัปดาห์ / Weekly menu plan | Weekly, lead only | No | self (`quest.create` D) |
| QT-KIT-06 | จัดทำรายการซื้อ / Compile shopping list | Weekly or on low-stock alert, lead only | No | self |
| QT-KIT-07 | เตรียมอาหารงาน / Event meal prep | Event-triggered child of `event_root` (Agent 19 owns parent) | No | Event board + kitchen lead |
| QT-KIT-08 | ตรวจความสะอาด/ความปลอดภัยอาหาร / Food-safety check (fridge, expiry, pests) | Daily or weekly (HYPOTHESIS; temple may decline) | Yes | kitchen `department_lead` |
| QT-KIT-09 | รับของถวายอาหาร / Receive food offerings (record items received) | Event/ad hoc | Yes | kitchen `department_lead` |

### 4.1 Checklists, evidence, verification

| ID | Checklist (TH, EN) | Evidence | Verification | Verifier |
|---|---|---|---|---|
| QT-KIT-01/02 | ดูยอดจำนวนคน (read headcount, shown inside checklist) · ตรวจวัตถุดิบ (ingredients) · เตรียม/ปรุง (prep/cook) · จัดภาชนะ (arrange) · เสร็จตรงเวลา (ready by serve time) · บันทึกจำนวนที่เสิร์ฟ (served count, optional) | `photo_optional` (one photo of the prepared meal) | `none` | — (department lead sees status) |
| QT-KIT-03 | เก็บล้างภาชนะ · เช็ดพื้นที่ · เก็บเศษอาหาร · ปิดแก๊ส/ไฟ (gas/electric off) · ล็อกห้อง (lock) | `photo_after` | `staff_verification` | kitchen `department_lead` (≠ assignee) |
| QT-KIT-04 | ระดับสต็อกต่อรายการ พอ/ใกล้หมด/หมด; วันหมดอายุที่ใกล้ถึง | `checklist_only` | `none` | — (low/out → inventory alert, Agent 18) |
| QT-KIT-05 | เลือกเมนูต่อมื้อ · ตรวจสต็อกที่มี · หมายเหตุอาหารพิเศษ (aggregate, optional) | `none` | `none` | — |
| QT-KIT-06 | รายการ + จำนวน ที่ต้องซื้อ; รวมจากสต็อกต่ำ | `none` | `organizer_approval` | Person with approval authority per temple setting (abbot or delegate); **no money handled in app** (finance out of pilot, Q-05) |
| QT-KIT-07 | like 01/02 but headcount comes from event guests (C3) | `photo_optional` | `staff_verification` | event board owner |
| QT-KIT-08 | อุณหภูมิตู้เย็น (temp, number field, optional) · วันหมดอายุ · สัตว์รบกวน | `photo_optional` | `none` | — |
| QT-KIT-09 | รายการ จำนวน ผู้ถวาย (donor name optional) | `photo_optional` | `none` | — |

Evidence note: voice note available on every kitchen quest (wet-hand case). Donor names are personal data: optional,
team-visible only.

## 5. Data needed

| Datum | Source |
|---|---|
| Headcount components | Availability resolver (Agent 02), event registrations (Agent 19), presence (this spec) |
| Meal services (name, time, audience, `prep_cutoff`) | `meal_service` concept; master `TEMPLE_DOMAIN_MODEL.md` §6.2 now lists schedule kind `meal` (semantics for the staff side defined here; the monastic resolver does not read it — Agent 02 to confirm) |
| Menu | Weekly menu quest output (plain text list in quest payload for pilot) |
| Stock and low-stock thresholds | Agent 18 inventory |
| Shopping list | Output of QT-KIT-06 (list in quest payload; becomes an inventory request if Agent 18 defines one) |
| Shifts, check-in | `STAFF_PRESENCE_SPEC.md` |

## 6. Home modules (matrix §5 order)

| # | Module id | Title TH / EN | Visible when |
|---|---|---|---|
| 1 | `wf.meals_today_headcount` | มื้ออาหารวันนี้และจำนวนคน / Meals today + headcount | `headcount.view` (YAML: `department_lead` D, `kitchen_staff` D, abbot/deputy/assistant/secretary T) |
| 2 | `wf.kitchen_prep_quests` | งานเตรียมอาหาร / Prep quests | has kitchen assignments |
| 3 | `wf.stock_alerts` | สต็อกใกล้หมด / Stock alerts | `inventory.view` D |
| 4 | `wf.shopping_list` | รายการซื้อ / Shopping list | `inventory.view` D (lead edits via QT-KIT-06) |

`wf.team_roster` is shown to the kitchen `department_lead` with full detail (`presence.view` D) and to `kitchen_staff` in coarse form only (`presence.view` C: state label, no reason, no flags).

## 7. North-star question
**คนครัว: "ต้องเตรียมอาหารกี่คน?"** Answered by §3: the next meal service for today with
`{ service name, serve_time, prep_cutoff, components C1–C5, lower, upper, planned, snapshot, as_of }`, with every
Unknown labelled. No other number is shown as "the" headcount.

## 8. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Cook absent | Presence marks ON_LEAVE; lead sees open QT-KIT-01/02 as UNASSIGNED if assignee on leave; human reassigns to FREE kitchen staff. |
| E2 | Handover between shifts | Handover note recommended (not required): items in oven, what remains to prepare, stock issues; incoming acknowledges (spec §7). |
| E3 | Staff shortage | Coverage gap flag (min staff per service, setting). Lead may reduce menu; system does not. |
| E4 | Headcount changes after cut-off | §3.5. |
| E5 | Large event day | QT-KIT-07 child quests; headcount sums C3 over all events overlapping the service. |
| E6 | Gas/electric left on at close-down | Checklist item is mandatory for submit; verifier ≠ assignee checks. |
| E7 | Elderly cook with no smartphone | Lead proxy-checks-in and proxy-ticks (audited, flagged "proxy"). |
| E8 | Allergy request from a guest | Only aggregate count shown to kitchen, plus an on-event note authored by event owner (Agent 19). |

## 9. Permission check against the matrix (v0.2 / `role_permissions.yaml`)

| Need | YAML grant | Result |
|---|---|---|
| Own kitchen quests | `quest.view` A (`kitchen_staff`), D (`department_lead`) | OK |
| Lead creates/assigns/verifies | `quest.create/assign/verify` D (`department_lead`) | OK |
| Headcount counts | `headcount.view` D (`department_lead`, `kitchen_staff`); counts only via aggregate function | OK (was M-05) |
| Manual adjustment | `headcount.adjust` D (`department_lead` only) | OK |
| Meal schedule | `schedule.view` S; schedule kind `meal` in master §6.2 | OK; semantics to be confirmed by Agent 02 |
| Event guest counts | `event.view` T | OK (counts only) |
| Stock view | `inventory.view` D | OK |
| Stock movement | `inventory.record` D (`kitchen_staff`), `inventory.manage` D (`department_lead`) | OK (was M-11) |
| Command center panel | `command_center.view` D, kitchen panel only (`department_lead`) | OK; `kitchen_staff` has none |
| Team roster | `presence.view` D (`department_lead`); `presence.view` C (`kitchen_staff`); `member.view` D | Staff see coarse colleague states, never reasons |
| Check-in | `presence.set_self` S | OK |

## 10. Cross-agent notes
- Agent 02: confirm that the resolver can be evaluated for a **future** instant and returns `location_state`; this file depends on it (C1/C2). If it cannot, headcount for future meals is entirely Unknown.
- Agent 19: provide `meal_required` and confirmed-registration counts per event window.
- Agent 18: inventory low-stock event and an optional shopping-request entity.

## 11. Field-research questions
- FQ-KIT-01: Is there one meal or several for monastics, at what times, and for whom do kitchens cook (monks, novices, nuns, residents, staff, visitors, volunteers)?
- FQ-KIT-02: How do cooks learn the number today (verbal, LINE message, assumption)? What is the typical error and its cost (waste or shortage)?
- FQ-KIT-03: Are monks willing to indicate meal attendance in the app, or should an attendant do it? (links Q-08)
- FQ-KIT-04: Do nuns (แม่ชี) and lay residents eat from the temple kitchen? They map to the YAML role `lay_resident` (HYPOTHESIS in the matrix); the `meal_audience` setting must say whether they are counted.
- FQ-KIT-05: How are food donations received and recorded now?
- FQ-KIT-06: Dietary and allergy needs: how do they reach the kitchen today?
