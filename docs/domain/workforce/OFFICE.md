# OFFICE — ธุรการ (`office_staff`), บัญชี (`accountant`), ผู้ดูแลระบบของวัด (`temple_admin`)

Owner: Agent 17 · Wave 1a · Readiness: **DESIGNED** (content HYPOTHESIS; see §10)
Master refs: matrix §2.2, §4, §5 · features F-42 (P2), F-43 (P2, post-pilot), F-06, F-13, F-37 · Legend: `CLEANING.md` §0

HYPOTHESIS notice: no source used. Office duties are general administration assumptions. **Finance is out of pilot**
(gap Q-05, F-43 P2): this file designs a *view-only* accountant home as a placeholder and takes no position on
accounting rules. The matrix maps ไวยาวัจกร to `facility_manager`, while a ไวยาวัจกร in practice may be the person who
handles money and property on behalf of monks (**HYPOTHESIS**; Agent 01 to source) — open item M-13.

## 1. Roles and goals

| Role | Goals |
|---|---|
| `office_staff` | Intake invitations and requests accurately; keep documents/bookings/meetings in order; route Temple Contact messages; see monastic availability to answer callers |
| `accountant` | See finance data to the extent permitted (view only by default); approve only if the abbot explicitly grants `finance.approve` (matrix note 7) |
| `temple_admin` | Keep memberships and roles correct (lay-side admin), verify new members, review moderation reports; has **no finance** and no restricted settings |

## 2. Workflow (HYPOTHESIS)

### office_staff
| Cadence | Work |
|---|---|
| Daily | Review intake: invitations (กิจนิมนต์) received by phone/LINE/walk-in → create `RECEIVED` invitation; route Temple Contact threads; check today's bookings and meetings; documents in/out |
| Weekly | Prepare meeting agenda and minutes (PDF export, F-42); review bookings |
| Event-driven | Support event registration desks (with Agent 19) |

### accountant (post-pilot placeholder)
| Cadence | Work |
|---|---|
| Monthly | Open finance view (when F-43 exists); no template is invented here |

### temple_admin
| Cadence | Work |
|---|---|
| On request | Invite members, assign roles, deactivate leavers, verify monastic status request (verification itself is admin-with-audit per `TEMPLE_DOMAIN_MODEL.md` §3) |
| Monthly | Role review: list of people with elevated permissions; remove stale |
| Daily | Moderation queue triage (`moderation.manage` T) |

## 3. Quest templates
`quest_type = office`, `department = office`, `points = 0`. Priority tags: **P1** = pilot, **P2** = deferred (F-42/F-43).

| ID | Title (TH / EN) | Recurrence · window | Pri | Claimable | Evidence | Verification | Verifier |
|---|---|---|---|---|---|---|---|
| QT-OFF-01 | รับกิจนิมนต์ใหม่ / Intake new invitation | Event: each new request; due within configurable SLA (HYPOTHESIS default 4 h) | P1 | Yes | `none` (the invitation record is the output) | `none` | — Invitation lifecycle owned by Agent 02/19 (RECEIVED → REVIEWING by `invitation.manage`) |
| QT-OFF-02 | ตอบข้อความช่องทางติดต่อวัด / Triage Temple Contact thread | Event | P1 | Yes | `none` | `none` | — (F-37, `contact_inbox.manage`) |
| QT-OFF-03 | จัดการเอกสารเข้า-ออก / Document handling | Ad hoc | P2 | Yes | `photo_optional` (scan) | `none` | — |
| QT-OFF-04 | จองสถานที่/ห้อง / Booking management | Ad hoc | P2 | Yes | `none` | `staff_verification` | `office_staff` other than creator or lead |
| QT-OFF-05 | เตรียมประชุมและรายงานการประชุม / Meeting prep and minutes | Weekly/ad hoc | P2 | No | minutes document (PDF) | `organizer_approval` | meeting chair |
| QT-OFF-06 | ตรวจสอบสถานะพระก่อนตอบผู้ติดต่อ / Check monastic availability before replying | Inside QT-OFF-01 | P1 | — | — | — | uses coarse availability only (M-15) |
| QT-ADM-01 | ยืนยันตัวตนสมาชิกใหม่ / Verify new member | Event | P1 | Yes | `none` | `organizer_approval` for monastic status | abbot-level (restricted, audited) |
| QT-ADM-02 | ทบทวนสิทธิ์รายเดือน / Monthly role review | Monthly | P1 | No | `checklist_only` | `organizer_approval` | abbot-level |
| QT-ADM-03 | ตรวจรายงานในคิวดูแลชุมชน / Moderation queue triage | Daily | P1 | Yes | `none` | `none` | — |
| QT-ACC-01 | ดูสรุปการเงิน / Finance summary review | Monthly | P2 (post-pilot) | No | `none` | `none` | — |

Checklists (examples): QT-OFF-01 ชื่อผู้ติดต่อ · พิธี · สถานที่ · วันเวลา · จำนวนพระ · การเดินทาง · หมายเหตุ ·
ผู้ติดต่อกลับ (host contact, rite, venue, date/time, number of monks, transport, notes, callback) — exactly the capture
fields of master §6.1; QT-ADM-01 เช็กชื่อ-บทบาท · ขอความยินยอม · ตรวจอายุ/ผู้ปกครองหากเป็นผู้เยาว์ · กำหนดแผนก (check identity, consent, age/guardian, department).

## 4. Data needed

| Datum | Source |
|---|---|
| Invitations (read/write intake) | Agent 02/19 (`invitation.*`) |
| Monastic availability (coarse) | Agent 02 resolver (`availability.view` T) |
| Temple Contact threads | F-37 (Agent 09/12) |
| Documents, bookings, meetings | **new concepts** (F-42, P2) — no master permission codes (M-07) |
| Members and roles | F-06 (`member.view/manage`) |
| Finance | F-43 post-pilot, legal review required |
| Moderation reports | `moderation.manage` |

## 5. Home modules (matrix §5)

| Role | # | Module id | Title TH / EN | Visible when |
|---|---|---|---|---|
| office_staff / accountant | 1 | `wf.documents_bookings` | เอกสารและการจอง / Documents and bookings | `document.view` (proposed) — **P2, hidden in pilot** |
| | 2 | `wf.meetings` | การประชุม / Meetings | `schedule.view` T |
| | 3 | `wf.invitation_intake` | รับกิจนิมนต์ / Invitation intake | `invitation.manage` T |
| | 4 | `wf.finance_view` | การเงิน / Finance | `finance.view` T (hidden unless granted; **P2**) |
| temple_admin | 1 | `wf.member_admin` | สมาชิกและบทบาท / Members and roles | `member.manage` T — PROPOSED order |
| | 2 | `wf.moderation_queue` | คิวรายงาน / Moderation queue | `moderation.manage` T |
| | 3 | `wf.my_quests_today` | ภารกิจของฉัน / My quests | `quest.view` A |

In the pilot (P2 modules hidden) `office_staff` effectively sees: meetings → invitation intake (+ Temple Contact via
the shared inbox module owned by Agent 03/09). Accountant sees nothing until F-43; the home then shows `wf.my_quests_today` only.

## 6. North-star questions
Master has none for these roles. Proposed:
- office_staff: **"วันนี้มีกิจนิมนต์/นัดหมายอะไรเข้ามาที่ต้องจัดการ?"** Data: invitations in `RECEIVED` or `REVIEWING` for the temple ordered by age (with SLA clock), today's meetings/bookings, unread Temple Contact threads count.
- temple_admin: **"ใครรอการยืนยัน และสิทธิ์ใครต้องทบทวน?"** Data: pending membership/monastic verification requests with age; accounts with restricted permissions and last review date; open moderation reports count.
- accountant: **"มีอะไรรอให้ผมดู?"** deferred (F-43) — no data defined.

## 7. Edge cases

| # | Case | Behaviour |
|---|---|---|
| E1 | Office staff absent | Intake quests QT-OFF-01 remain claimable by any `office_staff`; if none present, the invitation list is also visible to secretary monk (`invitation.manage` T) — no gap in access. |
| E2 | Caller wants to know if a monk is available | Office sees coarse state only; reasons (sick, personal) never shown (M-15). |
| E3 | Handover | Optional note: pending callbacks. |
| E4 | Shortage | Invitations age beyond SLA → flagged to secretary monk and abbot's approvals; no auto-decline. |
| E5 | Temple admin tries to grant self a restricted permission | Blocked per matrix §1 (abbot approval, audited). |
| E6 | Admin verifies someone as monastic | Restricted, audited; visible only inside membership (PDPA s.26 note in `SECURITY_MODEL.md` §2). |
| E7 | Accountant asked to approve spending | Only with explicit abbot grant of `finance.approve`; default off; whole flow post-pilot. |
| E8 | Phone/LINE intake while offline | Quick-capture form saves locally; syncs later (idempotent). |

## 8. Permission check

| Need | Matrix | Result |
|---|---|---|
| Invitations | `invitation.view/manage` T (office) | OK; `confirm` correctly absent |
| Contact inbox | `contact_inbox.manage` T | OK |
| Documents, bookings, meetings, PDF | no codes; `schedule.manage` is in catalog but has no matrix row | **M-07** |
| Availability | `availability.view` T (office) | OK, but reason visibility unspecified for lay readers **M-15** |
| Quests | `quest.view` D, `quest.create` D, no assign/verify for office | **M-02** for office dept; accountant and temple_admin have `quest.view` — while `quest.complete` S: **M-08** |
| temple_admin has no `schedule.view` and no `quest.view` | | **M-08** |
| Finance | `finance.view` T / approve —⁷ | OK (accountant) |
| Reports | `report.view` T (office, accountant) | OK |
| Command Center | none for office/admin | **M-18** (temple_admin administers staff but cannot see staff counters) |
| Member admin | `member.view` T, `member.manage` T (admin only) | OK |
| Moderation | `moderation.manage` T (admin) | OK |
| Reward catalog | `reward.manage` T (office) | OK; out of scope here |
| ไวยาวัจกร vs finance | facility_manager only | **M-13** |
| Check-in | none | **M-03** |

## 9. Safety note on this file
Office tools hold the widest personal-data surface among lay staff (contacts of hosts, visitors, members). Every export
(PDF minutes, lists) must exclude optional sensitive fields; exports are audited.

## 10. Field-research questions
- FQ-OFF-01: Who receives invitations today, through what channel (phone, LINE, in person), and who decides?
- FQ-OFF-02: What documents and bookings does the temple handle; is there any form that must be physical?
- FQ-OFF-03: Who keeps minutes and records decisions? Is a PDF useful?
- FQ-OFF-04: Who keeps the temple's money and how (ไวยาวัจกร, committee, accountant)? Which duties may software never touch?
- FQ-OFF-05: Who administers membership today (does a lay admin exist)?
