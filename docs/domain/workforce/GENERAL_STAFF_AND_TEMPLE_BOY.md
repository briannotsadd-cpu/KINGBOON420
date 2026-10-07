# GENERAL STAFF AND TEMPLE BOY — เจ้าหน้าที่วัด (`staff_general`) and เด็กวัด (`temple_boy`)

Owner: Agent 17 · Wave 1a · Readiness: **DESIGNED** (content HYPOTHESIS; see §10)
Master refs: matrix §2.2, §4 (`temple_boy` column only), §5 ("volunteer / temple_boy / staff") · Legend: `CLEANING.md` §0

HYPOTHESIS notice: these are the least-specified roles. Real-world duties of a เด็กวัด and a general temple staff
member are unsourced. The design therefore makes both roles **generalist**: they execute whatever quests they are
assigned and do not own a fixed template set, apart from the few templates below.

## 1. Roles and goals

| Role | Who (HYPOTHESIS) | Goals |
|---|---|---|
| `staff_general` เจ้าหน้าที่วัด | Lay worker, any department, flexible tasks | Always know "what do I do now"; get pulled to where help is needed; report problems |
| `temple_boy` เด็กวัด | Often a young person (possibly a minor) living at or attached to the temple, helping with chores and errands | Clear simple tasks; stay safe; have a way to ask for help |

Both use the shared home (matrix §5): **My quests today → check-in → report problem**.

## 2. MINOR SAFEGUARDING rules (design requirements, not legal advice)
`temple_boy` may be under 18 (HYPOTHESIS; age is a field-research question FQ-GEN-01). Until Agent 13 / legal review
(risk R-07, gap Q-06) says otherwise, treat every `temple_boy` as a **minor-capable account**:

1. No person-to-person chat/calls (matrix gives `community.participate` S to every staff role; for minors it must be
   restricted — **M-09**).
2. Quest assignment, evidence and photos never include the minor's face by default; photo guidance shown.
3. Quests are never created that send a minor alone to an off-site location or out of daylight hours (soft rule,
   manager sees a warning when `location` is outside the temple or `due_at` is outside configured daylight window — **HYPOTHESIS**).
4. Contact details of a minor are not visible to anyone except the person, guardian contact held by temple admin,
   and the abbot. Team view shows display name and presence only.
5. Guardian consent is captured at membership creation by `temple_admin` (flow owned by Agent 13/07).
6. Check-in is non-location-based; no location tracking.

## 3. How work reaches these roles
`staff_general` and `temple_boy` have no `quest.create` (matrix). A monk who needs a small errand done has only
`quest.create` S (self) — there is no path (**M-16**). Proposed: a **task request** (a DRAFT quest carrying a target
department, created with `quest.request`, proposed permission) which a department lead (or `office_staff`) publishes
and assigns. Until then, requests go through office/lead out-of-band.

## 4. Quest templates
`quest_type = general` unless noted, `department = general`, `points = 0`, `source = manual` or `template`.

| ID | Title (TH / EN) | Recurrence · window | Claimable | Evidence | Verification | Notes |
|---|---|---|---|---|---|---|
| QT-GEN-01 | งานทั่วไป / General task | ad hoc | Yes | `photo_optional` | `staff_verification` (requester or lead) | Free text title, up to 10-item checklist |
| QT-GEN-02 | ช่วยจัดสถานที่งาน / Event setup and teardown help | Event-triggered; child of `event_root` (`quest_type = event_task`, Agent 19 owns) | Yes | `photo_before_after` | `staff_verification` by event board owner | Listed here as a consumer only |
| QT-GEN-03 | นำทาง/ต้อนรับผู้มาวัด / Visitor guidance | Event/day-driven | Yes | `none` | `attendance` | HYPOTHESIS that general staff do this |
| QT-GEN-04 | เก็บของหาย/ของตกค้าง / Lost-and-found logging | ad hoc | Yes | `photo_optional` | `none` | Items logged; owner contact held only by office |
| QT-GEN-05 | ช่วยงานครัว/แม่บ้าน/สวน (cross-department help) | ad hoc, created by dept lead | Yes | per source template | per source template | Uses the **same** template of the requesting department; `required_role` is relaxed to `staff_general` or `temple_boy` |
| QT-TBY-01 | งานเล็กประจำวัน / Daily small chore | Daily slot, assigned by a lead | No | `photo_optional` | `none` | Checklist ≤ 5 items, one sentence each, Simple Mode language |
| QT-TBY-02 | ธุระใกล้ในวัด / Short errand inside the temple | ad hoc | No | `none` | `staff_verification` (requester confirms) | On-site only (§2 rule 3) |

Checklists are short by design (≤ 10 items staff, ≤ 5 temple boy), written in plain Thai, with icon per item for
low-literacy users (HYPOTHESIS about literacy; FQ-GEN-03).

## 5. Data needed
Assignments and claimable quests for `general` and cross-department help; team roster presence (to find who is FREE,
`STAFF_PRESENCE_SPEC.md`); `access_note` on locations; event schedule (read-only).

## 6. Home modules (matrix §5)

| # | Module id | Title TH / EN | Visible when |
|---|---|---|---|
| 1 | `wf.my_quests_today` | ภารกิจของฉันวันนี้ / My quests today | always (assignments + claimable) |
| 2 | `wf.check_in` | เช็กอิน / Check-in | `presence.set_self` (proposed) |
| 3 | `wf.report_problem` | แจ้งปัญหา / Report a problem | `maintenance.report` |

Simple Mode is the **default** for `temple_boy` (can be changed by the person): modules shown as three big buttons,
text ≥ 18 px (Agent 03 sets exact values).

## 7. North-star question (PROPOSED)
Master has none for these roles. Proposed: **"ตอนนี้ผมต้องทำอะไร?"** Data: my assignments with
status ∈ {ASSIGNED, IN_PROGRESS}, today, ordered by start time; the first row is shown large as "งานถัดไป"; below it,
claimable OPEN quests in my department, as read; if none, the screen says "ยังไม่มีงาน" (not a made-up suggestion).

## 8. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Staff absent | Presence ON_LEAVE; lead reassigns; floating helpers are found through FREE count. |
| E2 | Two leads want the same helper | Assignments conflict flag (both quests due overlapping); the person sees both, and either lead can see the other's quest title only (team-level). |
| E3 | Shortage of general staff for event | Event board shows unfilled child quests (Agent 19 readiness); volunteers (`volunteer` role) may claim public ones. |
| E4 | Temple boy at school/study | **HYPOTHESIS** that a school timetable exists. Not modelled as a presence state: outside a defined shift the person resolves to UNKNOWN with reason OFF_SHIFT (spec §3). Lead may enter the timetable as `schedule_entries` kind `class`. FQ-GEN-02. |
| E5 | Request from a monk for a private errand | Not supported (M-16). |
| E6 | Temple boy reports a problem involving a person | Report goes to `moderation.manage` and abbot, not to peers. Content ≈ safeguarding; Agent 13 defines flow. |

## 9. Permission check

| Need | Matrix | Result |
|---|---|---|
| Both roles' columns | `staff_general` absent from §4 table | **M-01** (no column at all); proposed to copy `volunteer` + `temple_boy` rows |
| Own quests | `quest.view` A, `quest.complete` S | OK for `temple_boy`; `staff_general` unknown (M-01) |
| Directory | `member.view` Tm | OK; for minors see §2 rule 4 |
| Chat | `community.participate` S | **M-09** conflicts with minor policy |
| Request tasks | none | **M-16** |
| Check-in | none | **M-03** |

## 10. Field-research questions
- FQ-GEN-01: Who are temple boys today (age, schooling, living arrangement)? Do guardians exist and consent?
- FQ-GEN-02: What does a typical day of a เด็กวัด look like; which monks direct them?
- FQ-GEN-03: Reading ability, phone ownership and comfort with icons vs text.
- FQ-GEN-04: What does "เจ้าหน้าที่วัด" actually do at a typical temple; are they paid, residents, or volunteers?
