# STATE PATTERNS — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 · Wave 1b · Readiness: **DESIGNED**
Scope: the reusable states every list, card and form must design: loading, empty, error, offline, permission-denied,
Unknown, stale data, AI draft, plus conflict, accountability/undo, success and banners. Thai copy is **draft** and needs
review by a Thai native speaker and a monk advisor (tone for monastic screens) before pilot. Visual treatment belongs to
Agent 04; this file fixes anatomy, wording rules and behaviour.

## 1. Principles

| # | Principle | Source |
|---|---|---|
| S-1 | **Unknown is a value, not a failure.** It is shown, explained and counted; never replaced by 0, blank or a default such as "ว่าง". | master UX §4.1, R-13 |
| S-2 | Every list and module has its own designed empty, loading, error and permission state. | master UX §4.2 |
| S-3 | A state is **never conveyed by colour alone**: icon shape + words always. | ACCESSIBILITY §4 |
| S-4 | No blame copy. A late verifier is "รอตรวจรับ", not "เลยกำหนด" on the assignee (QUEST §5.3). | QUEST |
| S-5 | Calm tone: no exclamation marks in system text, no urgency timers, no loss framing, no confetti. | research doc 05 §5; doc 02 C3 |
| S-6 | Do not reveal what the viewer may not know exists (same-answer rule, NAVIGATION N-5). | TENANCY §7 |
| S-7 | Consequential actions show the accountable human and the undo route (section 11). | pack UX REQUIREMENTS |
| S-8 | State changes are announced to screen readers once, politely, in Thai (`lang="th"`), without moving focus. | ACCESSIBILITY §6 |

Pattern index: SP-01 Loading (§3) · SP-02 Empty (§9) · SP-03 Error (§4) · SP-04 Offline (§8) · SP-05 Permission-denied (§5) ·
SP-06 Unknown (§6) · SP-07 Stale (§7) · SP-08 AI draft (§10) · SP-09 Conflict (§12) · SP-10 Accountability/undo (§11) ·
SP-11 Success (§13) · SP-12 Banners (§14).

## 2. State matrix per surface type

| Surface | Loading | Empty | Error | Offline | Permission | Unknown | Stale | AI draft |
|---|---|---|---|---|---|---|---|---|
| Home module card | skeleton row | per-module copy (registry) | inline retry | cached + age | module hidden | per field | age chip | n/a |
| List (quests, work orders, inbox) | 5 skeleton rows | empty list copy + next action | banner + retry | cached + queue | page-level denied | per row | top chip | draft rows marked |
| Detail screen | skeleton blocks | n/a | page error | cached read-only | denied / not found | per field | chip | draft banner |
| Form | disabled submit while sending | n/a | field + form errors | queue if allowed | action denied | "ไม่ทราบ" choice where valid | n/a | AI card on top |
| Counters (Command Center) | skeleton tiles | "ไม่มีข้อมูล" tile | tile error "ไม่ทราบ" + retry | cached | panel hidden | **always shown** tile | age + 60 s rule | AI summary labelled |
| Map | LITE map first, 3D after | "ยังไม่มีข้อมูลอาคาร" | layer error grey+words | cached tiles | layers by scope | marker "ไม่ทราบ" | layer age | n/a |

## 3. Loading (SP-01)

Rules:
1. **Skeleton shaped like the final content** (same row height, same number of lines) so nothing jumps. Spinners only
   inside buttons.
2. **Cache first:** if the person has seen this screen in this temple, show the cached copy at once with its age chip,
   then replace it silently (no content movement under a finger; if new data changes the visible rows show
   "มีข้อมูลใหม่ [แตะเพื่อดู]").
3. Timing: 0-1 s skeleton only; after 3 s add the line "กำลังโหลด..."; after 10 s add [ลองอีกครั้ง] and keep waiting.
4. Skeleton never looks like an empty state (no "ไม่มี..." text until the load finishes).
5. Reduced motion: static grey blocks, no shimmer. Screen reader: one announcement "กำลังโหลด" then "โหลดเสร็จแล้ว".
6. 3D map: LITE map renders first; "กำลังโหลดแผนที่สามมิติ" chip; on failure or low-end device it stays LITE with
   "ใช้แผนที่แบบเรียบง่าย [ลองสามมิติ]" (3D_STRATEGY §1-3). Core UI never waits for 3D.

```
┌────────────────────────────┐
│ ▭▭▭▭▭▭▭▭▭▭        ▭▭▭▭    │  skeleton row = same height as a real row
│ ▭▭▭▭▭▭▭▭▭▭▭▭▭▭             │
├────────────────────────────┤
│ กำลังโหลด...  (after 3 s)  │
└────────────────────────────┘
```

## 4. Error (SP-03)

Anatomy: icon + one-sentence cause + one next step + optional detail disclosure with a reference code (for support).
Never show raw codes as the main text; never "เกิดข้อผิดพลาด" alone.

| Kind | Copy (Thai) | Action |
|---|---|---|
| Network | "เชื่อมต่อไม่ได้ในขณะนี้ ข้อมูลที่เห็นอาจไม่ใหม่" | [ลองอีกครั้ง] (auto retry with backoff in background) |
| Server | "ระบบขัดข้องชั่วคราว ลองใหม่ในอีกสักครู่" + "รหัสอ้างอิง 7F3A" | [ลองอีกครั้ง] [แจ้งปัญหาระบบ] |
| Validation | Inline under the field: "กรุณาระบุเวลาสิ้นสุด" | focus moves to first error; summary at top for screen readers |
| Version conflict (`VERSION_CONFLICT`) | "มีผู้อื่นแก้ไขรายการนี้ไปแล้ว กรุณาดูข้อมูลล่าสุดก่อนทำต่อ" | [ดูข้อมูลล่าสุด]; ท่านเก็บข้อความที่พิมพ์ไว้ให้ |
| Rate limit | "ทำรายการถี่เกินไป กรุณารอสักครู่" | disabled button with countdown text (a plain number, no pressure styling) |
| Partial failure (batch) | "บันทึกสำเร็จ 3 จาก 4 รายการ" + list of the failed one with reason | [ลองรายการที่ไม่สำเร็จ] |

### 4.1 Domain error codes -> Thai copy (from the Wave 1a specs)

| Spec code | Where | Copy (Thai) | Next step shown |
|---|---|---|---|
| `ILLEGAL_TRANSITION` | quest, invitation, trip | "ทำรายการนี้ไม่ได้ในสถานะปัจจุบัน" | show current status and who can move it |
| `SELF_VERIFY_FORBIDDEN` | verify | "ผู้ตรวจรับต้องไม่ใช่ผู้ส่งงาน กรุณาให้ผู้อื่นตรวจ" | [ขอให้ผู้อื่นตรวจ] |
| `DEPENDENCY_UNMET[ids]` | start/submit | "ต้องทำ <ชื่องาน> ให้เสร็จก่อน" | link to that quest |
| `DEPENDENCY_CANCELLED` | start | "งานที่ต้องทำก่อนถูกยกเลิก รอผู้จัดการแก้ไข" | notify manager |
| `CHECKLIST_INCOMPLETE[items]` | submit | "ยังไม่ได้ติ๊ก: <รายการ>" | scroll to item |
| `EVIDENCE_REQUIRED[photo:1]` | submit | "ต้องแนบรูปอย่างน้อย 1 รูป" | [ถ่ายรูป] |
| `CLAIM_LIMIT` | claim | "รับงานได้พร้อมกันไม่เกิน 5 งาน" | list my open claims |
| `CAPACITY_FULL` | claim | "งานนี้ครบจำนวนคนแล้ว" | [ดูงานอื่น] |
| `NOT_CLAIMABLE` | claim | "งานนี้ต้องให้หัวหน้ามอบหมาย" | - |
| `VERIFICATION_REQUIRED_FOR_COMMUNITY_POINTS` | publish | "งานที่ให้แต้มต้องมีผู้ตรวจรับ" | change verification |
| `LEDGER_ASSIGNEE_MISMATCH` | assign | "แต้มประเภทนี้มอบให้ผู้นี้ไม่ได้" (no explanation of monastic status) | choose another person |
| `AUTO_VERIFICATION_FAILED{qr_checkin}` | submit | "ยังยืนยันการมาถึงไม่ได้ ตรวจว่าสแกน QR ที่ถูกจุดและอยู่ในช่วงเวลา" | retry or [ให้เจ้าหน้าที่ตรวจแทน] if fallback |
| `QR_FOREIGN_TEMPLE` | scan | "QR นี้ไม่ใช่ของวัดนี้" | - |
| `INCOMPLETE_FIELDS[...]` | invitation start_review | "ขอข้อมูลเพิ่ม: <ชื่อเจ้าภาพ / สถานที่ ...>" | jump to fields |
| `TRAVEL_ESTIMATE_REQUIRED` | proposal | "ยังไม่ทราบเวลาเดินทาง กรุณากรอกเอง" | focus travel field |
| `CONFIRM_BLOCKED[violations]` | confirm | "ยืนยันไม่ได้: <ท่าน…> ติดกิจอื่นในช่วงนี้" (constraint code translated; never the private reason) | open the conflicting commitment |
| `STALE_PROPOSAL` | confirm | "ข้อเสนอนี้เปลี่ยนไปแล้ว กรุณาตรวจอีกครั้ง" | [ดูข้อเสนอล่าสุด] |
| `TEAM_INCOMPLETE` | confirm | "จำนวนพระยังไม่ครบตามที่ขอ" | back to proposal |
| `NO_VEHICLE` | confirm | "ยังไม่มีรถและคนขับที่ว่างในช่วงนี้" | link to vehicles |
| `ACK_REQUIRED[...]` | confirm | "กรุณารับทราบข้อควรระวังก่อนยืนยัน" | tick list |
| `HUMAN_CONFIRM_REQUIRED` | confirm | (never reachable from UI; if hit) "ต้องให้ผู้มีสิทธิ์ยืนยันด้วยตนเอง" | - |
| `FORBIDDEN_STATE_FOR_ACTOR` | set status | "ผู้ดูแลตั้งได้เฉพาะสถานะ ไม่พร้อม" | - |
| `CALENDAR_STATE_NOT_SETTABLE` | set status | "สถานะนี้มาจากตาราง แก้ที่ตารางกิจ" | open entry |
| `VALID_UNTIL_TOO_FAR` | set status | "ตั้งสถานะได้นานสุด 24 ชั่วโมง (ไม่พร้อมได้ 120 วัน)" | adjust |
| `VALID_UNTIL_IN_PAST` | set status | "เวลาสิ้นสุดต้องเป็นอนาคต" | adjust |
| `TEMPLE_MISMATCH` | any | "รายการนี้อยู่ในอีกวัดหนึ่ง [สลับวัด]" (only if the person is a member there; otherwise NOT_FOUND copy) | switch prompt |
| `NOT_A_MEMBER` / `NOT_FOUND` | any | "ไม่พบรายการ" (identical text for missing and foreign) | [กลับหน้าหลัก] |
| `LAST_ABBOT` | member admin | "วัดต้องมีเจ้าอาวาสอย่างน้อยหนึ่งรูป" | start transfer |
| `ROLE_INELIGIBLE` | member admin | "บทบาทนี้ใช้ไม่ได้กับสถานะปัจจุบัน ผู้ดูแลต้องตรวจสอบ" | open member |
| `SAMANERA_ROLE_LIMIT` | member admin | "สามเณรมีได้เฉพาะบทบาทสามเณร" | - |

## 5. Permission-denied (SP-05)

Seven variants; choose by situation, never by developer convenience.

| # | Variant | When | Behaviour and copy |
|---|---|---|---|
| P-1 | **Hidden** | The person lacks the permission and has no reason to know the feature exists | Nothing rendered (module, tab, button, menu). No teaser, no lock icon. |
| P-2 | **Action absent** | Item visible, action not allowed (e.g. verify own work) | Button not rendered. If a stale screen still sends it: sheet "ท่านไม่มีสิทธิ์ทำรายการนี้" + "ผู้ที่ทำได้: หัวหน้าฝ่ายครัว". |
| P-3 | **Page denied** | A deep link or notification leads to an item the person is known to be tied to but cannot open now (scope changed) | Full page: "ไม่มีสิทธิ์ดูหน้านี้" + short reason class ("ต้องเป็นผู้ได้รับมอบหมาย") + [กลับ] + optional [ขอสิทธิ์จากผู้ดูแล] (sends a request to `member.manage` holders; nothing else). |
| P-4 | **Generic not found** | Missing, deleted, foreign temple, malformed token | "ไม่พบรายการ" only. Same for all causes (S-6). |
| P-5 | **Masked field** | Screen visible, a field restricted by role (e.g. `reason` of an unavailable monk, deceased name, family phone, leave reason) | Field replaced by words: "ไม่พร้อม" (coarse), "ผู้ล่วงลับ (ปกปิด)", "ปกปิด". Never asterisks without words. Copy never says "ซ่อนเพราะท่านไม่มีสิทธิ์" on health/personal fields (that itself leaks existence); it says only the coarse value. |
| P-6 | **Small-group masking** | Aggregate with <= 2 people in a category (dietary, minors) | "น้อยกว่า 3" |
| P-7 | **Membership state** | SUSPENDED, ENDED, pending | SUSPENDED: only the switcher entry "ถูกระงับ" and contact-the-temple link. INVITED/PENDING: inbox card. Consent withdrawn: W14 with plain consequences. |

Mid-session change: if a permission refresh removes a module, the card disappears on next refresh with one polite toast
"สิทธิ์ของท่านมีการเปลี่ยนแปลง" (no detail); drafts typed remain on screen until sent, and the send fails with P-2.
Minors: features denied by `minor_overrides` follow **P-1** (absent), never a denial message.
Cross-temple: a request for another temple's data is always P-4.
Wireframe of P-3:

```
┌────────────────────────────┐
│  ⛔  ไม่มีสิทธิ์ดูหน้านี้     │
│  ต้องเป็นผู้ได้รับมอบหมาย    │
│  [กลับ]  [ขอสิทธิ์จากผู้ดูแล] │
└────────────────────────────┘
```

## 6. Unknown (SP-06)

Unknown is shown wherever the truth cannot be derived. It is **never** shown as 0, "-", blank or "ว่าง".

### 6.1 Anatomy

```
 ไม่ทราบ ⓘ            ← label (word) + shape icon (? in a circle, not colour only)
   ↓ tap
┌ ทำไมจึงไม่ทราบ ───────────────────────┐
│ เหตุผล: ไม่มีการเช็กอินหรือตารางวันนี้ │
│ ระบบรู้อะไรบ้าง: (ไม่มีข้อมูล)         │
│ ใครช่วยให้ทราบได้: ตัวท่านเอง / เลขา   │
│ [ตั้งสถานะ]  (only if viewer can act) │
│ ข้อมูลเมื่อ 10:42                     │
└───────────────────────────────────────┘
```

### 6.2 Rules

1. **Counters:** the Unknown tile/segment is always present and counted; it is never merged into another bucket, never
   dropped when its value is 0 **and computable**. "0 known" and "cannot compute" differ: the first shows "0", the second
   shows "ไม่ทราบ".
2. **Charts and bars:** Unknown segment uses a distinct pattern (hatch) **and** a text label; never the same colour as
   "ว่าง" or the background; never at zero length when non-zero.
3. **Sum invariants** (CC-1..CC-3, presence sum) appear as a quiet footer "รวม 12 = 12" for testers/leads; a mismatch
   shows words "ตัวเลขไม่ตรงกัน แจ้งผู้ดูแล" and is logged.
4. **Sorting:** Unknown is not pushed to the end of a list by default; in the availability board it sits in its own
   labelled group directly after "ว่าง" so it cannot be missed.
5. **Future instants:** a question about a future time shows what is confirmed and "ไม่ทราบ N" separately; the UI never
   states the unknowns will be free.
6. **No fabricated values anywhere:** no averages, no "ประมาณ", no last-known substitution. History lines are labelled
   as reference ("ย้อนหลัง 7 วัน เสิร์ฟจริง: ...") and never feed numbers.
7. **Granularity:** a card with several fields shows Unknown per field, not one blanket "ไม่ทราบ".

### 6.3 Reason -> Thai copy

| Reason code (spec) | Where | Thai copy shown in the explainer |
|---|---|---|
| `NO_VALID_SIGNAL` | monk status | "ไม่มีการเช็กอิน ไม่มีตาราง และไม่ได้ตั้งสถานะไว้ในตอนนี้" |
| `EXPIRED` (manual) | monk status | "สถานะที่ตั้งไว้หมดเวลาแล้ว (เมื่อ hh:mm)" |
| `STALE` / `STALE_CHECK_IN` | monk, staff | "เช็กอินล่าสุดเกิน 12 ชั่วโมงแล้ว" |
| `NO_SIGNAL` | staff | "ยังไม่ได้เช็กอินและไม่มีเวร" |
| `OFF_SHIFT` | staff | shown as its own state "ออกเวร", **not** Unknown (master v0.2 six-state) |
| `NO_PLAN` | event readiness | "ยังไม่มีแผนงาน เพิ่มงานหรือเป้าหมายกำลังคน" |
| `GATE_UNKNOWN` cap | event | "บางเงื่อนไขยังไม่ทราบผล ความพร้อมแสดงสูงสุดที่ ใกล้พร้อม" |
| `NO_STAFFING_TARGETS` | event | "ยังไม่ได้ตั้งเป้าหมายกำลังคน" |
| `monks_required` not set | ceremony | "ยังไม่ได้ระบุจำนวนพระ ระบบไม่เดาให้" |
| `TRAVEL_ESTIMATE_REQUIRED` | proposal, trip | "ยังไม่ทราบเวลาเดินทาง" |
| departure null | driver | "ยังไม่กำหนดเวลาออก" |
| vehicle no affirmative status | fleet | "ยังไม่มีสถานะรถหรือคนขับ จึงไม่ถือว่าว่าง" |
| event guests no registration | kitchen | "แขกกิจกรรม: ไม่ทราบ (กิจกรรมนี้ไม่มีการลงทะเบียน)" |
| severity untriaged | work order | "ยังไม่คัดแยกความรุนแรง ระบบนับเป็น S2 ไว้ก่อน" |
| layer source down | map | "ยังโหลดข้อมูลชั้นนี้ไม่ได้" |
| no check-in data | building people count | "ไม่ทราบ — ยังไม่มีข้อมูลเช็กอินในอาคารนี้" |
| `UNKNOWN_VASSA` | invitation lead | "ยังไม่ทราบพรรษา ผู้ยืนยันเลือกหัวหน้าคณะเอง" |
| `NO_AVAILABILITY_SIGNAL` | proposal warning | "ท่านยังไม่ได้ลงสถานะ อาจว่างหรือไม่ว่างก็ได้" |
| resolver error | board | "ประมวลผลสถานะไม่สำเร็จ นับเป็นไม่ทราบ" + `data_quality.errors` |

## 7. Stale data (SP-07)

| Surface | Fresh | Stale rule | Display |
|---|---|---|---|
| Command Center counters | `computed_at` <= 60 s (HYPOTHESIS) | older -> amber **text + icon** "ข้อมูลเมื่อ 3 นาทีที่แล้ว" | chip on the panel and a [รีเฟรช] button; never auto-reflow while the user is reading |
| Availability snapshot | same | same | same |
| Event readiness | recomputed on change and every 15 min near start | older than 15 min within 48 h of start -> chip | "คำนวณเมื่อ hh:mm" |
| Kitchen headcount | live until `prep_cutoff` | after cut-off: frozen snapshot | "ตัดยอดเมื่อ 08:30" + live delta "เปลี่ยนหลังตัดยอด: −2" |
| Check-in derived presence | within TTL | after TTL contributes nothing | status falls to Unknown with reason `STALE` |
| Cached screen offline | n/a | always shows age | absolute time "ข้อมูลเมื่อ 10:42 วันนี้" |
| Maps markers | computed at read | cached markers older than 5 min | chip |

Rules: stale data is **never hidden**; the age is always one tap away (R-9); relative times switch to absolute after 1 h;
Buddhist-era date for anything beyond today; when new data arrives while the user is interacting, show a non-moving
banner "มีข้อมูลใหม่ [แตะเพื่อรีเฟรช]".

## 8. Offline (SP-04)

```
PHONE
┌────────────────────────────┐
│ ⚠ ออฟไลน์ · ข้อมูลเมื่อ 10:42│  persistent slim bar (text + icon)
│ รอส่ง 2 รายการ  [ดู]         │
└────────────────────────────┘
```

| Rule | Detail |
|---|---|
| Reading | Cached screens remain readable with age chips. Screens never cached (first visit) show "ยังไม่มีข้อมูลในเครื่อง ต้องเชื่อมต่อก่อน". |
| **Allowed offline (queued with `client_at`)** | driver trip transitions (รับทราบ, ออกเดินทาง, ถึงแล้ว, กำลังกลับ, เสร็จสิ้น); staff check-in/out (accepted if received within 12 h and device clock not > 5 min in the future, flagged OFFLINE_QUEUED); quest checklist ticks, start, block; submit with evidence (upload queued); report a problem (draft + photo queued); monk "รับทราบ"; own manual status (applies on arrival; shows "ยังไม่ส่ง"). |
| **Not allowed offline** | confirm/cancel/replace invitation, verify/reject quest, approve event, confirm monk roster, award or redeem points, change roles/members, change consent, switch temple, send Temple Contact. Buttons are replaced by one line "ต้องเชื่อมต่ออินเทอร์เน็ตก่อน" (no disabled look-alikes). |
| Queue item states | รอส่ง -> กำลังส่ง -> ส่งแล้ว / ส่งไม่สำเร็จ (reason) / **มีการเปลี่ยนแปลงที่ฝั่งระบบ** (conflict). |
| Conflict rule | Server state wins for assignments (VEHICLE §4). Example: "งานนี้ถูกมอบหมายใหม่แล้ว บันทึกของท่านเก็บไว้เป็นข้อมูลอ้างอิง" with the person's input preserved. |
| Per temple | The queue belongs to its temple; switching temples never replays it elsewhere. |
| Shared device sign-out | Warn: "มี 2 รายการยังไม่ส่ง ออกจากระบบจะสูญเสียรายการนี้" with [ส่งก่อน] [ออกจากระบบ] (F-02). On confirm, local data is wiped. |
| Reconnect | One summary toast "ส่งแล้ว 2 รายการ" (or the failures); no per-item celebration. |
| Duration | No hard limit; items older than 12 h that depend on server time (check-ins) are flagged for lead review, not dropped silently. Detailed offline design is a later wave (VEHICLE §4). |

## 9. Empty (SP-02)

Types and rules:

| Type | Rule | Example copy |
|---|---|---|
| First use | Say what the module is for and the next action if the person has one | "ยังไม่ได้สมัครงานอาสา — ดูงานที่เปิดรับ" [ดูงานอาสา] |
| Nothing today (valid) | State it plainly; offer the next relevant day | "วันนี้ยังไม่มีกิจที่กำหนด" [ดูพรุ่งนี้] |
| All done | Quiet acknowledgement, no reward animation | "วันนี้ทำครบแล้ว" |
| Filtered | Show the filter and a clear action | "ไม่พบงานตามตัวกรอง (ระดับ: สูง) [ล้างตัวกรอง]" |
| No data yet (system) | Explain the missing input | "ยังไม่มีข้อมูลสถานะพระ" |
| Nothing exists for outsiders | Public views | "วันนี้วัดยังไม่มีกิจกรรมสาธารณะ" [ติดตามวัด] |
Rules: empty never says "ไม่มีข้อมูล" when the true state is Unknown (use SP-06); never suggests a fabricated default task or
zone; never uses a sad mascot; the action is shown only if the viewer may take it.

## 10. AI draft (SP-08)

Applies from Wave 7 (F-39, F-40). Designed now so forms leave room.

```
┌ ร่างโดย AI · ยังไม่ได้บันทึก ───────────┐
│ ชื่อกิจนิมนต์: ทำบุญบ้าน            ✓    │
│ เจ้าภาพ: คุณสมชาย                  ✓    │
│ วันเวลา: 12 ต.ค. 2569 09:00      ตรวจสอบ │  field AI was unsure about
│ สถานที่: (ว่าง — AI ไม่แน่ใจ)             │  left empty, never guessed
│ [ใช้ร่างนี้]  [แก้ไข]  [ทิ้ง]            │
└────────────────────────────────────────┘
```

| Rule | Detail |
|---|---|
| Label | "ร่างโดย AI" in words + icon on every draft card, every AI summary and every AI-filled field group; screen reader reads it first. |
| Not a record | A draft has no id in lists, notifications or counts; it lives in "ร่างของฉัน" (kind: quest, event, invitation, maintenance, summary, checklist). Statuses: pending, accepted, edited_accepted, rejected. |
| Accept | Only the accept button creates the real entity, **as the accepting human** (`source = ai_draft`, creator = that person). The confirm shows "ท่านเป็นผู้สร้างรายการนี้". |
| Uncertainty | Uncertain fields marked "ตรวจสอบ"; missing facts left blank; no invented times, names, counts, phone numbers. |
| Prohibited in drafts | confirm invitation, verify quest, approve event, assign monks, award points, finance, funeral data, health reasons, minors' data. The corresponding controls do not exist in a draft card. |
| AI summary text (daily summary) | "สรุปโดย AI — ตรวจกับตัวเลขต้นทาง" with a link to the panel numbers; if numbers and text differ the numbers win and the text is hidden with "สรุปไม่ตรงกับข้อมูล". |
| Voice | Mic is a convenience on forms; transcript is shown and editable before drafting; recording is not stored unless the temple allows (privacy). |
| Persona | No AI "character", no first-person chat voice in monastic screens. |

## 11. Accountability line and undo (SP-10)

### 11.1 Accountability line (component)

`โดย <ชื่อ> (<บทบาท>) · <hh:mm> · <วันที่ พ.ศ.>` shown (a) in the confirm sheet **before** the action ("ท่านกำลังยืนยันในนาม
<ชื่อ> (เจ้าอาวาส)"), (b) in the result and in the item history after. Delegated acts read
"ยืนยันโดย <เลขา> ตามที่เจ้าอาวาสมอบหมาย". System acts read "ระบบ (ตามกติกา <ชื่อกติกา>)" and are never presented as a person.
For AI, "ร่างโดย AI · ยืนยันโดย <ชื่อ>".

| Action | Accountable human shown | Undo route |
|---|---|---|
| Confirm invitation | confirmer (`invitation.confirm`) | cancel / replace monk / reschedule (same permission; reason mandatory; impact list first) |
| Propose team | proposer | revise team (back to REVIEWING) |
| Confirm monk roster (ceremony) | confirmer (`ceremony.confirm_monks`) | cancel assignment with reason |
| Approve event | approver (`event.approve`) | cancel (needs `event.approve` when APPROVED) |
| Verify quest | verifier (`quest.verify`) | revoke completion by `quest.manage` -> compensating ledger row (not an erase) |
| Assign / reassign quest | assigner | reassign; unassign |
| Set own status | the person | clear status any time |
| Set status on behalf | the setter | the monk or `availability.set_others` clears |
| Check-in | the person (or the proxy lead) | undo within **2 minutes** |
| Award community points | awarder; held items show reviewer | reversal creates a compensating row |
| Redeem reward | the person | cancel before fulfilment if the temple allows |
| Block / mute | the person | unblock in ฉัน |
| Consent change | the person (or guardian) | re-consent; effects listed |
| Send Temple Contact | the sender | none (can send a follow-up) |

### 11.2 Undo behaviour
Undo is a persistent link in the toast for **at least 10 seconds or until dismissed** (never a vanishing 3-second
snackbar) and also in the item history. Where the domain does not allow undo, the confirm sheet says so plainly:
"ทำรายการแล้วย้อนกลับไม่ได้ แต่แก้ไขได้ที่ …".

## 12. Conflict (SP-09)

Applies to: availability conflicts (`MANUAL_BLOCK_OVER_COMMITMENT`, `DOUBLE_BOOKED`), event gate `G-CONFLICT`, proposal
exclusions, concurrent edits, offline sync conflicts.

```
┌ ความขัดแย้ง · สูง ─────────────────────┐
│ พระ… มีสองรายการซ้อนกัน 11:00–11:30      │
│  ① พิธีสวดมนต์ (ในวัด)   ← ยืนยันแล้ว    │
│  ② กิจนิมนต์ บ้านคุณสมชาย ← ยืนยันแล้ว   │
│ ระบบไม่ได้ยกเลิกรายการใดให้              │
│ ผู้ตัดสินใจ: พระเลขานุการ                │
│ [เปิดรายการ ①] [เปิดรายการ ②] [รับทราบ]  │
└────────────────────────────────────────┘
```

Rules: both sides always shown with source and status; copy always states that the system changed nothing; severity word
(สูง / กลาง) + icon, not colour alone; only holders of `availability.set_others` (and the monk for his own) see conflicts;
roles with coarse tiers see no conflicts; a conflict never blocks reading, only confirmation (hard constraints in
SMA are shown as exclusions with codes, not as conflicts); resolution is a human act (edit entry, shorten block, accept).

## 13. Success and progress (SP-11) — calm gamification

| Rule | Detail |
|---|---|
| Confirmation | Short text + tick icon: "บันทึกแล้ว", "เสร็จแล้ว ขอบคุณ". No confetti, coin, fanfare, shake, screen flash, sound. |
| Progress visuals | Rings or a lotus-bloom motif that fills gently; no flame, no levels, no XP bars, no HP, no countdowns. Respect reduced motion (static fill). |
| Monastic | Ticks per day (กิจวัตรวันนี้ 4/6) and "ปฏิบัติแล้ว N วันในเดือนนี้" (cumulative practice days, SCORING §7.1). The current run is a plain number only when it is 2 or more. **No loss mechanics:** a day without practice changes nothing on screen — no reset animation, no "streak broken", no red state, no notification, no grace-day explanation (nothing is lost). **แต้มกิจวัตร** numbers are private to the monk, off by default pending the monk-advisor decision (research doc 02 §2), never in lists of people, never comparable, never redeemable, never visible to anyone else (the abbot included, SCORING F-3). The daily cap is silent: a capped award reads "บันทึกแล้ว", never "ถึงขีดจำกัด". Achievements (e.g. M-WEEK-RUN) are private quiet rows in ฉัน, with no points. |
| Lay | Points history is private; optional participation streak shows one grace day per 7 days and the reset line "เริ่มใหม่ได้เสมอ"; thanks and impact lines ("ช่วยเตรียมอาหาร 120 ที่"); optional per-temple leaderboard exists in the domain but is **off by default** and, if a temple enables it (`temple.settings`), lists only lay members who opted in with a display name, never monastics and never minors (SCORING F-11). |
| Prohibited patterns | loot boxes, random rewards, spin-the-wheel, gambling-like odds, limited-time offers, countdown pressure, "only N left" scarcity copy, daily-login bonuses, streak-loss warnings, public rank of monastics, "top monk", comparisons between monastics, buying points. |
| Wording | ภารกิจ (quest), งานใหญ่ (event) — never "boss"; "แต้มร่วมกิจกรรม" vs "แต้มบุญชุมชน" under field test; never "แต้มบุญ" for monastics. |

## 14. Banners and special states (SP-12)

| State | Placement and copy |
|---|---|
| Demo tenant | Top strip, not dismissible: "วัดตัวอย่าง — ข้อมูลไม่ใช่ข้อมูลจริง" (R-10) |
| Suspended membership | Switcher entry "ถูกระงับ"; inside, only "สมาชิกภาพถูกระงับ ติดต่อวัด" with Temple Contact |
| Pending monastic verification | ฉัน: "รอการยืนยันสถานะ — ระหว่างนี้ใช้งานเหมือนฆราวาส" |
| Pending guardian consent | "รอผู้ปกครองยืนยัน" (F-01) |
| Visiting monk | Label "พระอาคันตุกะ · ถึง <วันที่ พ.ศ.>"; dispute (abbot only) "ยังไม่ได้ตรวจสอบโดยวัดนี้" |
| Consent withdrawn | Feature-specific: "ท่านปิดการแสดงสถานะสุขภาพไว้ จึงไม่แสดงในตาราง" |
| Minor-limited account | Features absent (P-1); ฉัน shows "บัญชีสำหรับผู้เยาว์: ไม่มีแชตและการโทร" in neutral words |
| Heritage/permission flag | Work order: "อาคารอนุรักษ์ ต้องมีเลขอ้างอิงการอนุมัติก่อนเริ่มงาน" |
| Update available | "มีเวอร์ชันใหม่ [อัปเดต]" never forced mid-form |

## 15. Thai copy rules (draft; native and monk-advisor review required)

1. Thai first, English second; Buddhist Era dates (พ.ศ.) displayed, Gregorian stored; 24-hour clock for schedules,
   with "น." only in sentences.
2. Avoid first/second-person pronouns in system text; use neutral polite forms ("กรุณา...", "ยังไม่ได้...").
   For monastics address "ท่าน" when a pronoun is unavoidable; avoid "คุณ" on monastic screens.
3. Monastic vocabulary: กิจนิมนต์ (invitation), ฉันเพล (monk meal; staff meals say "อาหาร"), พระภิกษุ / สามเณร, ถวาย; do
   not use consumer language ("ซื้อ", "แลก", "โปร") near anything monastic.
4. "ยังไม่" for pending/unknown ("ยังไม่ได้ลงสถานะ"), "ไม่ทราบ" for Unknown, "ไม่มี" only for verified zero.
5. No exclamation marks or urgency words in system text, except the severity name "ฉุกเฉิน" for S1 maintenance.
6. Numbers use Arabic digits by default (Thai digits optional in settings); units spelled in Thai (รูป for monks, คน for
   lay people, ที่ for meals, คัน for vehicles).
7. Buttons are verbs, <= 12 Thai characters where possible: "รับทราบ", "ยืนยัน", "ส่งงาน", "ตรวจรับ".
8. Reasons for rejection or cancellation are mandatory text inputs with example chips; examples are suggestions, not
   defaults.
