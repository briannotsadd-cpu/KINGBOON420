# SECURITY AND TRAFFIC — รปภ. (`security_guard`) and เจ้าหน้าที่จราจร (`traffic_staff`)

Owner: Agent 17 · Wave 1a · Readiness: **DESIGNED** (content HYPOTHESIS; see §11)
Master refs: matrix §2.2, §4 (`security` column), §5 · `SECURITY_MODEL.md` · features F-25, F-27 · Legend: `CLEANING.md` §0

HYPOTHESIS notice: no source used. Gate hours, patrol practice and whether a temple employs guards at all are unknown.
Out of scope: CCTV, face/plate recognition, access-control hardware, any location tracking of guards. These need legal
review (PDPA) and are **not designed here**.

## 1. Roles and goals

| Role | Goals |
|---|---|
| `security_guard` | Cover posts for the whole shift; open/close the premises; keep an accurate gate/visitor log; report incidents with the right people seeing them; hand over cleanly |
| `traffic_staff` | Event parking and traffic flow; know their post, time and who to call; (HYPOTHESIS: often volunteers or part-time) |

## 2. Daily workflow (HYPOTHESIS; times configurable)

| Step | Behaviour |
|---|---|
| Check-in at post | One tap or QR at post; shift has `availability_policy = fixed_post` so checked-in = WORKING |
| Open gate (SEC-01) | QR scan at gate with time |
| Rounds (SEC-02) | Patrol checkpoints (QR scan at each point) at set intervals |
| Gate/visitor log | Quick entries (§4.2), not quests |
| Incident | Incident form (§4.3), not a quest |
| Lock-up (SEC-04) | Checkpoint scans and lock checklist |
| Handover (SEC-05) | **Required**; incoming acknowledges; unacknowledged flag escalates |

Night shifts cross midnight; the shift belongs to the date it starts (`STAFF_PRESENCE_SPEC.md` WF-10).

## 3. Quest templates
`quest_type = general` for now, `department = security`, `points = 0`. **Proposal:** new quest type `security`
(propose in REPORT) so Command Center and audit can separate it; until accepted use `general` + department filter.

| ID | Title (TH / EN) | Recurrence · window | Location | Claimable | Evidence | Verification |
|---|---|---|---|---|---|---|
| QT-SEC-01 | เปิดประตู/เปิดวัด / Open gates | Daily at configured time | gate points | No | `none` | `qr_checkin` (scan at each gate) |
| QT-SEC-02 | เดินตรวจรอบวัด / Patrol round | Every N hours (config; HYPOTHESIS 2–4 h at night) | checkpoint list | No | `none` (scans are evidence) | `qr_checkin`: all checkpoints scanned in order-agnostic window, else round = partial with list of missed points |
| QT-SEC-03 | ปิดประตู/ล็อกวัด / Lock-up | Daily at configured time | gates, key points | No | `checklist_only` | `qr_checkin` |
| QT-SEC-04 | ส่งมอบเวร / Shift handover | Each shift end | — | No | handover note (§ spec 7) | acknowledged by incoming (not `quest.verify`) |
| QT-TRF-01 | จัดที่จอดรถงาน / Event parking setup | Event-triggered, child of `event_root` (Agent 19 owns; `quest_type = event_task`) | parking zones | No | `photo_before_after` | `staff_verification` by event board owner |
| QT-TRF-02 | ควบคุมจราจรช่วงงาน / Event traffic duty | Event window | post | No | `none` | `attendance` (check-in at post by QR/lead) |
| QT-TRF-03 | เก็บที่จอดหลังงาน / Parking clear-down | After event | parking zones | Yes | `photo_after` | `staff_verification` |

Checklist examples: SEC-01 ปลดล็อก · ตรวจรอบประตู · ตรวจไฟ; SEC-03 ตรวจประตูทุกบาน · ปิดไฟสาธารณะตามที่กำหนด · ล็อก ·
แจ้งผู้ที่ต้องรับทราบ; TRF-01 วางกรวย/ป้าย · แบ่งโซน · ตรวจทางเข้าออก · ทางฉุกเฉินโล่ง.

## 4. Non-quest records (restricted)

### 4.1 Principle
Two records are **not** quests because their visibility differs from quest visibility. Proposed permissions (M-04):
`security.log` (create own entries) and `security.incident.view` (**restricted**, like `audit.view`).

### 4.2 Gate / visitor log
Fields (concept): `occurred_at`, `direction (in/out)`, `kind (pedestrian / vehicle / delivery / other)`, optional
`plate`, optional `visitor_label`, optional `purpose`, `recorded_by`. All identifying fields optional; **plate and
visitor name are personal data** → retained only for a configurable period (HYPOTHESIS default 30 days; Agent 13 to set)
and visible only to the author, security shift lead and abbot-level roles. No photos of visitors by default.

### 4.3 Incident report
Fields: `occurred_at`, `location (zone/building concept)`, `category (theft, injury, dispute, fire/hazard, lost child,
suspicious, other)`, `severity`, free text, optional photos (no faces by default), `recorded_by`, `status`.
Visibility: reporter (own), temple-level roles with `security.incident.view` (proposed: abbot, deputy, assistant, and a
named temple-designated person), **never** peers in team view, never exposed in Command Center beyond count by
category/severity and "open" flag. Injuries or health content is sensitive (PDPA s.26) — minimise text.
Escalation: severity high → push to abbot-level; the app does **not** contact police/emergency services; it shows
local emergency numbers as a static help card (HYPOTHESIS that this is desired; FQ-SEC-04).

## 5. Data needed

| Datum | Source |
|---|---|
| Shift, post, `fixed_post` flag, minimum staff | `STAFF_PRESENCE_SPEC.md` |
| Checkpoints (QR codes per point, concept) | Agent 18 assets or zones (a checkpoint = a QR-tagged point) |
| Event parking zones and times | Agent 19 + Agent 18 |
| Contact numbers of abbot-level on-call | temple settings |

## 6. Home modules
Master §5 gives only the focus "Shifts, incidents, gate log" (security) and "Event parking/traffic quests" (traffic).
Order below is **PROPOSED**.

| Role | # | Module id | Title TH / EN | Visible when |
|---|---|---|---|---|
| security_guard | 1 | `wf.shift_handover` | เวรและส่งมอบ / Shift and handover | has shift today |
| | 2 | `wf.patrol_rounds` | เดินตรวจ / Patrol rounds | has QT-SEC-02 today |
| | 3 | `wf.gate_log` | บันทึกเข้า-ออก / Gate log | `security.log` (proposed) |
| | 4 | `wf.incident_report` | แจ้งเหตุ / Incident report | `security.log` (proposed) |
| traffic_staff | 1 | `wf.event_traffic_quests` | ภารกิจจราจรงาน / Event traffic quests | has TRF assignment |
| | 2 | `wf.check_in` | เช็กอิน / Check-in | `presence.set_self` |
| | 3 | `wf.report_problem` | แจ้งปัญหา / Report problem | `maintenance.report` |

## 7. North-star questions (PROPOSED — none in master)
- security_guard: **"เวรนี้ผมต้องประจำจุดไหน เดินตรวจรอบไหน?"** Data: today's shift (post, start/end), QT-SEC assignments with next due round, checkpoints scanned/missed in the current round, handover note from the previous shift (acknowledge button).
- traffic_staff: **"งานนี้ผมยืนจุดไหน กี่โมง?"** Data: TRF assignments for events today (post/zone, start, end, event name, lead contact if team-visible).

## 8. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Guard absent / no-show | Shift started, no check-in beyond grace → UNKNOWN + LATE flag; coverage gap flag if `min_staff` not met; supervisor (department D) sees; **no automatic call-out**. |
| E2 | Single guard leaves post for an incident | Guard marks "ออกจากจุด" (OFF_SITE_DUTY manual) → coverage gap flag; returns by marking back. |
| E3 | Shortage for an event | Traffic quests UNASSIGNED shown on event readiness (Agent 19); volunteers may fill. |
| E4 | Handover missing | Check-out is allowed (never trap a person on shift); flag `HANDOVER_MISSING` to supervisor. |
| E5 | Missed checkpoint | Round recorded partial with missed list; no punitive scoring. |
| E6 | Guard has no smartphone / low-end device | Supervisor proxy check-in; QR scans can be replaced by NFC/phone shared at the post (HYPOTHESIS). |
| E7 | Incident involves a monastic or a minor | Visible only at temple-level incident role; no peer visibility; flagged for Agent 13 policy. |
| E8 | Guard asked to share visitor data with outsiders | Not supported; no export of gate log beyond temple-level roles. |

## 9. Permission check

| Need | Matrix | Result |
|---|---|---|
| `traffic_staff` entire column | absent | **M-01** (propose copy of `security` column) |
| Gate log, incident | none | **M-04** |
| Quests | `quest.view` A, `quest.complete` S | OK |
| Assets view | `asset.view` **T** for security | **M-12** broader than needed (checkpoints and gates only); propose A or D |
| Vehicle view | none | OK (visitor vehicles are not temple vehicles) |
| Team directory | `member.view` Tm | OK |
| Verify security quests | none | **M-02** (QR scans provide automated verification) |
| Check-in / shift | none | **M-03** |
| Command Center | none | OK (guard does not see) |

## 10. Security of this module itself
Incident and gate-log rows carry `temple_id` and are protected by RLS; read policy is narrower than quest policy
(restricted permission). Audit event on every read of an incident by someone other than the reporter. Raw rows
subject to retention (Agent 13).

## 11. Field-research questions
- FQ-SEC-01: Does the temple employ guards or use volunteers? Shifts, posts, hours, night coverage?
- FQ-SEC-02: What is logged today (gate book, plates)? Who reads it?
- FQ-SEC-03: What incidents occur most often; who is told and how?
- FQ-SEC-04: Do guards have an on-call chain of command and emergency contacts?
- FQ-SEC-05: Event traffic: who runs it (police, volunteers, hired company)?
