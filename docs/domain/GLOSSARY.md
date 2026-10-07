# GLOSSARY — BOON SYSTEM (ระบบบุญ)

Owner: Agent 02 (Temple Domain). Status: **DESIGNED** (documentation only, Wave 1a, 2026-10-07).
Readers: all agents. Terms owned by other agents are marked `owned by Agent 17/18/19` and are defined here only at
a basic level; the owning agent's spec prevails if it is more precise. Where this glossary extends the master
docs, the extension is flagged **[EXT]** and listed in `docs/domain/core/REPORT.md` under proposed master changes.

Conventions: `code_name` is the identifier used in code, database and API (snake_case for fields, UPPER_SNAKE
for enum values, dot.case for permissions and events). Thai appears first in parentheses on first use in each
section; the Thai column is the UI label. Time zone for every business rule is **Asia/Bangkok (UTC+07:00, no DST)**.

## 1. Tenancy and identity (owned by Agent 02)

| English / code | Thai | Definition | Spec |
|---|---|---|---|
| `temple` | วัด | Tenant. Every operational row carries `temple_id`. | TENANCY §2 |
| `person` | บุคคล | One human, one login, global across temples. | TENANCY §2 |
| `membership` | สมาชิกวัด | A person's relationship with one temple: kind, status, roles, departments. Unit of access. | TENANCY §3 |
| `membership_status` | สถานะสมาชิก | `INVITED, PENDING_APPROVAL, ACTIVE, SUSPENDED, ENDED`. | TENANCY §4 |
| `membership_kind` [EXT] | ประเภทสมาชิก | `resident, staff, volunteer, community, visiting`. | TENANCY §3 |
| `active_temple` | วัดที่กำลังใช้งาน | Temple context of the current session, chosen by the temple switcher and validated on every request. | TENANCY §7 |
| `temple switcher` | ตัวสลับวัด | UI + command that changes `active_temple`. | TENANCY §7 |
| `monastic` / `monastic_kind` | บรรพชิต | `none, bhikkhu, samanera`. Property of the **membership** (per temple), set only by that temple's attestation; no global person status. | TENANCY §5 |
| `bhikkhu` | พระภิกษุ | Fully ordained monk. | TENANCY §5 |
| `samanera` | สามเณร | Novice monk. Never holds management permissions. | TENANCY §5 |
| `lay` | ฆราวาส | `membership.monastic_kind = none` in that temple. | TENANCY §5 |
| `monastic attestation` [EXT] | การยืนยันสถานะบรรพชิต | Record by one temple that the person of one of its memberships is bhikkhu/samanera; affects that membership only. A person may choose to present it to another temple, which accepts or re-attests. | TENANCY §5 |
| `visiting monk` | พระอาคันตุกะ | Monastic with a time-bounded `visiting` membership at a host temple. | TENANCY §6 |
| `Monastic Mode` | โหมดบรรพชิต | UI/permission mode derived per membership from `membership.monastic_kind <> none`. | TENANCY §8 |
| `Community & Staff Mode` | โหมดชุมชนและเจ้าหน้าที่ | Mode for lay people. | TENANCY §8 |
| `role` / `permission` / `scope` | บทบาท / สิทธิ์ / ขอบเขต | See `docs/master/ROLE_PERMISSION_MATRIX.md`. Scope order `self < team < department < temple`. | master |
| `department` | ฝ่าย | Organisational unit of a temple (kitchen, cleaning, ceremony, office...). | master |
| `platform_admin` | ผู้ดูแลแพลตฟอร์ม | Operates the platform; no default read of temple data. | master |
| `break-glass` | การเข้าถึงฉุกเฉิน | Audited, time-boxed platform access to a temple. | TENANCY §9 |

## 2. Availability and schedule (owned by Agent 02)

| English / code | Thai | Definition | Spec |
|---|---|---|---|
| `availability` | สถานะพระ | Effective status of a monastic at an instant. | AVAILABILITY §3 |
| `effective_status` | สถานะที่มีผล | Output of the resolver: one of ten states. | AVAILABILITY §3 |
| `AVAILABLE` | ว่าง | Manual opt-in "พร้อมรับกิจ" with end time. Never a default. | AVAILABILITY §4 |
| `IN_TEMPLE` | อยู่ในวัด | Derived from a fresh check-in, nothing higher-priority. | AVAILABILITY §4 |
| `CEREMONY` | ทำพิธี | Calendar-driven, ceremony window covers now. | AVAILABILITY §4 |
| `ON_INVITATION` | ออกกิจนิมนต์ | Calendar-driven, confirmed off-site invitation window. | AVAILABILITY §4 |
| `TRAVELING` | เดินทาง | Calendar-driven travel leg. | AVAILABILITY §4 |
| `TEACHING` | สอน | Calendar-driven teaching (and, [EXT], class/duty) entry. | AVAILABILITY §4 |
| `UNAVAILABLE` | ไม่พร้อม | Manual hard block (sick, retreat) with end time. | AVAILABILITY §4 |
| `PERSONAL` | กิจส่วนตัว | Manual, with end time. | AVAILABILITY §4 |
| `REST` | พักผ่อน | Manual, with end time. | AVAILABILITY §4 |
| `UNKNOWN` | ไม่ทราบ | No valid signal. Always shown, never hidden. | AVAILABILITY §4 |
| `location_state` | ตำแหน่ง | `IN_TEMPLE, OFF_SITE, UNKNOWN`; independent of status. | AVAILABILITY §5 |
| `conflict` | ความขัดแย้ง | Overlap the system shows but never silently resolves. | AVAILABILITY §6 |
| `check-in` | เช็กอิน | QR/NFC/manual presence signal; stale after TTL (default 12 h). | AVAILABILITY §7 |
| `valid_until` | ใช้ได้ถึง | End of a manual status; default end of local day. | AVAILABILITY §7 |
| `coarse status` | สถานะแบบหยาบ | ว่าง / ไม่ว่าง / ไม่ทราบ shown to monk colleagues. | AVAILABILITY §9 |
| `Command Center` | ศูนย์บัญชาการวัด | Read model over all contexts; owns no data. | AVAILABILITY §10 |
| `schedule_entry` | รายการในปฏิทิน | Row of the single calendar table read by the resolver. | SCHEDULE §2 |
| `schedule entry kind` | ประเภทรายการ | `invitation, ceremony, teaching, class, duty, personal, travel, meal, leave, meeting` [EXT]. | SCHEDULE §2 |
| `invitation` | กิจนิมนต์ | External request for monks to attend a rite off-site. Owned by Agent 02. | SCHEDULE §3 |
| `invitation status` | สถานะกิจนิมนต์ | `RECEIVED, REVIEWING, TEAM_PROPOSED, CONFIRMED, IN_PROGRESS, COMPLETED, DECLINED, CANCELLED`. | SCHEDULE §3 |
| `host` | เจ้าภาพ | The person/family/organisation inviting. | SCHEDULE §3 |
| `rite type` | ประเภทพิธี | e.g. house blessing, merit-making, funeral chanting. Temple-configurable list. | SCHEDULE §3 |
| `Smart Monk Assignment` | ระบบแนะนำพระ | Deterministic rules that rank candidate monks with reasons. Not AI. A human confirms. | SCHEDULE §5 |
| `assignment proposal` | ข้อเสนอรายชื่อพระ | Ranked suggestion stored for review; not an entity commitment. | SCHEDULE §5 |
| `return buffer` | เวลาเผื่อกลับ | Minutes reserved after travel back (default 30). | SCHEDULE §5 |
| `vassa` / `พรรษา` | พรรษา | **HYPOTHESIS (no source consulted; Agent 01 to verify):** years of monastic seniority counted in rains retreats. Optional field; Unknown if not given. | TENANCY §2 |

## 3. Quest and scoring (owned by Agent 02)

| English / code | Thai | Definition | Spec |
|---|---|---|---|
| `quest` | ภารกิจ | Any unit of work with owner, due time, status, optional verification. | QUEST §2 |
| `quest_type` | ประเภทภารกิจ | 12 master types plus `event_root` [EXT]. | QUEST §2 |
| `quest assignment` | การมอบหมาย | Link of one person to one quest; key for scoring idempotency. | QUEST §3 |
| `claimable` | รับเองได้ | Quest a qualified person may self-assign. | QUEST §4 |
| `checklist` | รายการตรวจ | Ordered items, some required. | QUEST §7 |
| `evidence_policy` | นโยบายหลักฐาน | What must accompany a submission. | QUEST §8 |
| `verification_policy` | นโยบายการตรวจรับ | `none, organizer_approval, staff_verification, qr_checkin, photo_evidence, location, attendance`. | QUEST §8 |
| `verifier` | ผู้ตรวจรับ | Human or system that confirms; never the assignee. | QUEST §8 |
| `OVERDUE` | เลยกำหนด | Derived: due passed, not COMPLETED/CANCELLED. Not stored. | QUEST §5 |
| `UNASSIGNED` | ยังไม่มีผู้รับ | Derived: OPEN with zero active assignments. | QUEST §5 |
| `depends_on` | ต้องทำก่อน | Dependency list; start is blocked until all complete. | QUEST §9 |
| `recurring quest` | ภารกิจประจำ | Instances generated from a template per local date. | QUEST §10 |
| `boss quest` / `event_root` | ภารกิจใหญ่ | Parent quest of an event; semantics owned by Agent 19. | QUEST §11 |
| `monastic_activity_score` | แต้มกิจวัตร (UI; "แต้มบุญ" is never used for monastics) | Progress indicator for monastics. Not merit, not currency, never redeemable; **no ranking and no comparison, internal or public**. | SCORING §3 |
| `community_boon_points` | แต้มบุญชุมชน | Participation points for lay members, redeemable for participation rewards. | SCORING §4 |
| `ledger` | บัญชีแต้ม | Append-only signed rows; two ledgers never merged. | SCORING §2 |
| `idempotency key` | คีย์กันซ้ำ | Unique key making an award/reversal happen at most once. | SCORING §5 |
| `reversal` | รายการกลับรายการ | Compensating ledger row; originals never edited. | SCORING §6 |
| `practice days` / `current run` | วันที่ปฏิบัติ / ความต่อเนื่อง | Monastic: cumulative practice days (e.g. this month) and a silent current run; no loss mechanics, no reset message. | SCORING §7.1 |
| `lay streak` | ความต่อเนื่อง (ฆราวาส) | Lay participation streak with 1 grace day per 7. Achievements only. | SCORING §7.2 |
| `grace day` | วันผ่อนผัน | Lay streaks only: one missed day tolerated per 7-day window. | SCORING §7.2 |
| `excused day` | วันยกเว้น | Whole-day UNAVAILABLE; skipped in the monastic run. | SCORING §7.1 |
| `achievement` | เหรียญความสำเร็จ | Declarative badge, private for monastics. | SCORING §8 |
| `participation reward` | ของที่ระลึกจากการร่วมกิจกรรม | Reward exchanged for boon points. Never "buying merit". | SCORING §4 |
| `anti-cheat signal` | สัญญาณผิดปกติ | Event that raises review, caps or holds. | SCORING §10 |

## 4. Workforce terms (owned by Agent 17; basic level only)

| English / code | Thai | Basic definition |
|---|---|---|
| `staff presence` | สถานะเจ้าหน้าที่ | Working / free / leave of lay staff. Separate from monastic availability. |
| `shift` | เวร / กะ | Scheduled work period of a staff member. |
| `housekeeper` | แม่บ้าน | Cleaning staff role (zones, checklists). |
| `kitchen_staff` | คนครัว | Kitchen staff role. |
| `kitchen_lead` | หัวหน้าครัว | **Rejected as a role; = `department_lead` in the kitchen department** (assigns kitchen quests, sees headcount via `headcount.view`). |
| `gardener` | คนสวน | Garden role. |
| `temple_boy` | เด็กวัด | General helper role. |
| `volunteer` | อาสาสมัคร | Event or standing volunteer; earns community boon points. |
| `headcount` | จำนวนคนทาน | Number of meals to prepare; derivation is an open question owned by Agent 17. |

## 5. Facility and asset terms (owned by Agent 18; basic level only)

| English / code | Thai | Basic definition |
|---|---|---|
| `building` | อาคาร | Registry row with stable `code` shared by data, 2D map and 3D scene. |
| `zone` | โซน | Subdivision of a building or grounds; unit of cleaning/garden assignment. |
| `asset` | ทรัพย์สิน | Tracked item with QR, location, custodian, status. |
| `maintenance request` | แจ้งซ่อม | Problem report; produces a quest of type `maintenance`. |
| `work order` | ใบสั่งงานซ่อม | The quest view of a maintenance request. |
| `inventory item` / `movement` | วัสดุ / การเคลื่อนไหว | Stock item and its in/out record. |
| `vehicle` / `trip` | ยานพาหนะ / เที่ยวรถ | Temple (or lent) vehicle and a driver run with legs and passengers. |
| `facility_manager` | ไวยาวัจกร / ผู้ดูแลทรัพย์สิน | Manages assets, maintenance, inventory, vehicles. |

## 6. Event and ceremony terms (owned by Agent 19; basic level only)

| English / code | Thai | Basic definition |
|---|---|---|
| `event` | งาน / กิจกรรม | Boss quest with child quests (กฐิน, ผ้าป่า, วันสำคัญ, course). |
| `ceremony` | พิธี | Rite performed by monks inside or outside the temple. |
| `readiness` | ความพร้อม | Weighted completion plus hard gates; failing gate caps display at "ไม่พร้อม". |
| `hard gate` / `gate` | เงื่อนไขบังคับ | Condition (monks confirmed, volunteers filled, venue issues = 0, no unresolved monk conflicts) that caps readiness. Quests link to a gate through `gate_key`. |
| `staffing target` | เป้าหมายกำลังคน | Required headcount per role/department for an event or quest (`capacity`); copied by Temple Memory, never the people. |
| `funeral rite` | พิธีฌาปนกิจ | Funeral ceremony sessions (`ceremony` entries, `source_type = funeral_rite_session`). **Restricted**: register and family data need `funeral.register.view`; the undertaker sees only assigned rites. |
| `temple memory` | ความรู้ของวัด | Archived events and checklists reused next year. |
| `ceremony_lead` | มัคนายก | Leads ceremony timeline and readiness. |
| `undertaker` | สัปเหร่อ | Sees only funeral rites assigned to them. |

## 7. Cross-cutting terms (shared)

| English / code | Thai | Definition |
|---|---|---|
| `audit_log` | บันทึกตรวจสอบ | Append-only record of every state change: actor, from, to, reason. |
| `domain event` | เหตุการณ์ในโดเมน | Immutable fact emitted by a command; catalogue in `core/DOMAIN_EVENTS.md`. |
| `ai_draft` | ร่างจาก AI | AI output awaiting human action; AI never decides. |
| `Unknown` | ไม่ทราบ | Value shown when data is absent. Never estimated or invented. |
| `Temple Contact` | ช่องทางติดต่อวัด | Only default channel from the public to monastics. |
| `readiness vocabulary` | ระดับความพร้อมของงานพัฒนา | `PLANNED, RESEARCHED, DESIGNED, IMPLEMENTED, TESTED, VERIFIED, PILOT_READY, BLOCKED`. |
| `P0 leak` | การรั่วข้ามวัด | Any cross-temple data exposure; severity P0. |
