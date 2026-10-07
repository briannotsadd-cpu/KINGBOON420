# NAVIGATION — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 (UX Architecture) · Wave 1b · Readiness: **DESIGNED** (documentation only; unvalidated with users)
Inputs: `docs/master/UX_INFORMATION_ARCHITECTURE.md` (skeleton v0.1), `ROLE_PERMISSION_MATRIX.md` v0.2 and
`role_permissions.yaml`, `docs/domain/core/*` (TENANCY §7-8 switcher and mode), research docs 02/03/07.
Precedes Visual Design (Agent 04): this file fixes **structure**, not colour, type or motion style.

Conventions: Thai UI copy first, English in parentheses on first use. Permission codes are the exact codes in
`role_permissions.yaml`. "Hidden" means the element is not rendered at all (never greyed out). Authority is enforced
by the database and API; the client hides UI only (matrix §1).

## 1. Principles

| # | Principle | Consequence for navigation |
|---|---|---|
| N-1 | One account, many temples, **one active temple at a time** | Temple switcher is always reachable; switching clears all client caches (TENANCY §7.4). |
| N-2 | Mode is derived, never chosen | Mode badge is a label, not a toggle. Mode is derived **per membership**: `membership.monastic_kind <> none` -> Monastic Mode in that temple; otherwise Community & Staff Mode (TENANCY §8, Opus F-04). The same person can be Monastic Mode in one temple and Community & Staff Mode in another. |
| N-3 | Show only what the person may use | No disabled tabs or modules. A hidden module has no teaser. |
| N-4 | Everything is reachable three ways | List, map, and deep link reach the same screen (matches 3D_STRATEGY §1: 3D is never the only path). |
| N-5 | Same-answer rule for foreign or missing items | A deep link to another temple's item, a deleted item, and a never-existing item show the same generic "ไม่พบรายการ" (no hint it exists; TENANCY §7, ASSET_INVENTORY §2). |
| N-6 | Minors and monastics have narrower surfaces by design | Minor flag hides chat/call/public-profile entry points (`minor_overrides`); monastics have no community tab (`community.participate` is `@lay` only) and are reached by the public only through Temple Contact. |
| N-7 | Quiet by default | Notifications are batched and schedulable; no night push; no sound by default (research doc 02 C6). |

## 2. App shell

```
PHONE (≤ 599 px)                     TABLET (600-1023)                  DESKTOP (≥ 1024)
┌──────────────────────────┐        ┌────┬───────────────────┐         ┌──────┬──────────────────────────┐
│ [วัดศรีสุข ▾] [โหมด] 🔔 👤│        │rail│ top bar           │         │ side │ top bar                  │
├──────────────────────────┤        │    ├───────────────────┤         │ nav  ├──────────────────────────┤
│                          │        │ ico│                   │         │ full │ content (max 1200, 2-col │
│       content            │        │ ico│   content         │         │ text │ where useful: list+detail)│
│                          │        │ ico│   (list+detail on │         │      │                          │
│                          │        │    │    landscape)     │         │      │                          │
├──────────────────────────┤        └────┴───────────────────┘         └──────┴──────────────────────────┘
│ tab tab tab tab  ⋯เพิ่มเติม│
└──────────────────────────┘
```

Top bar (always, left to right):

| Element | Behaviour |
|---|---|
| **Temple switcher** (ชื่อวัด ▾) | Opens the sheet in section 3. Shows the active temple name (Thai first). Always visible, even with one membership (single membership: shows name, sheet lists only "ค้นหาวัดอื่น"). |
| **Mode badge** | Text chip: "โหมดพระภิกษุ" / "โหมดสามเณร" / "โหมดชุมชนและเจ้าหน้าที่". Not interactive except tap -> one-line explainer ("โหมดกำหนดจากสถานะที่วัดยืนยัน"). |
| **Demo banner** (conditional) | Temples whose slug starts `demo-` show a persistent strip "วัดตัวอย่าง — ข้อมูลไม่ใช่ข้อมูลจริง" (R-10). Cannot be dismissed. |
| **Notifications** (🔔) | Inbox, section 8. Badge is a dot with count capped "9+"; never a red alarm for non-urgent items. |
| **Avatar** (👤) | Opens ฉัน (Me): profile, privacy per field, points history, settings, consent, sign out. It is the permanent route to ฉัน, so the tab bar can drop it when full. |
| **Offline/stale indicator** | Small text chip "ออฟไลน์" or "ข้อมูลเมื่อ 10:42" (STATE_PATTERNS §7-8). |

Bottom tab bar (phone) holds **at most five** slots. If more tabs apply, the first four are shown and the fifth is
"เพิ่มเติม" (More) listing the remainder. Tablet and desktop show every tab in the rail/side nav.

## 3. Temple switcher and session context

Sheet content (data from `list_my_temples()`, TENANCY §7):

```
┌ เลือกวัด ─────────────────────────────┐
│ ● วัดศรีสุข            ใช้งานอยู่      │   ACTIVE membership, current
│   บทบาท: พระภิกษุ · โหมดพระภิกษุ       │
│ ○ วัดบ้านสวน           (อาสาสมัคร)     │   ACTIVE
│ ○ วัดท่าน้ำ  พระอาคันตุกะ ถึง 12 ธ.ค. 69│   visiting, valid_until shown (พ.ศ.)
│ ◌ วัดป่าใหญ่           ถูกระงับ        │   SUSPENDED: not selectable, no detail
│ ✉ คำเชิญจาก วัดโพธิ์    [ดู]           │   INVITED  -> invitation inbox
│ ⏳ วัดกลาง             รออนุมัติ       │   PENDING_APPROVAL, [ถอนคำขอ]
│ ＋ ค้นหาวัด / ติดตามวัด                │   -> Temple Discovery
└───────────────────────────────────────┘
```

Rules:
1. Only ACTIVE memberships (and visiting ones with `valid_until > now`) are selectable. SUSPENDED shows the label
   "ถูกระงับ" and nothing else (TENANCY §4). ENDED memberships are not listed.
2. Single ACTIVE membership: auto-select at launch. Several: restore last used on this device but **always show the
   switcher entry** (TENANCY §7.3).
3. Switching shows a one-second neutral transition "กำลังเปลี่ยนเป็นวัด X" and **clears every client cache**
   (queries, drafts in memory, offline queue is per-temple and stays attached to its temple; it is never replayed
   into another temple). The landing tab is recomputed from the new membership.
4. Mode may change on switch: monastic status is **attested per temple** (TENANCY §5), so a monk can be Monastic Mode at
   temple B and plain Community & Staff Mode at temple A until A attests him too; neither temple is told about the other.
   Role set changes entirely: nothing carries across temples (matrix §1; M-1 in TENANCY §6). The switcher never shows
   one temple's attestation to another.
5. A visiting monk (role `visiting_monastic`: own schedule and quests, no directory, no colleague availability) sees the
   host temple only through the permissions of his visiting membership; the label "พระอาคันตุกะ"
   appears under his name on host-temple screens. A host-flagged dispute shows "ยังไม่ได้ตรวจสอบโดยวัดนี้" to the abbot only.
6. Monastic claim pending (`PENDING_REVIEW`) **for this temple's membership**: the person behaves as lay in every rule here
   and the mode badge is the community one; ฉัน shows "รอวัดนี้ยืนยันสถานะ" (FLOWS F-01). Presenting an attestation
   held at another temple is the person's explicit choice at join time and is off by default (TENANCY §5.4).
7. `TEMPLE_MISMATCH` (client-sent temple differs from session): show the switch prompt, never silently correct (section 6).

## 4. Tab sets per mode

### 4.1 Monastic Mode (abbot, deputy_abbot, abbot_assistant, monk_secretary, bhikkhu, samanera, visiting_monastic)

| Slot | Tab (TH) | EN | Content | Visible to |
|---|---|---|---|---|
| M0 | **วัด** | Temple (management) | Section 5 | holders of any management permission (section 5.1) |
| M1 | **วันนี้** | My Day | Timeline of schedule + quests, availability control | all monastics |
| M2 | **ภารกิจ** | Quests | My quests, filters, detail | all monastics |
| M3 | **ตาราง** | Schedule | Calendar day/week; invitations that involve me | all monastics (`schedule.view` S+P or T) |
| M4 | **แผนที่วัด** | Temple map | 3D/2D/list of buildings, layers | all monastics |
| M5 | **ฉัน** | Me | Profile, progress (แต้มกิจวัตร, private), settings | all monastics (also via avatar) |

Phone order: with M0 present: วัด · วันนี้ · ภารกิจ · ตาราง · เพิ่มเติม(แผนที่วัด, ฉัน). Without M0: วันนี้ · ภารกิจ ·
ตาราง · แผนที่วัด · ฉัน. Landing tab: M0 for abbot/deputy/assistant/secretary (they hold `command_center.view` T);
M1 for bhikkhu and samanera.

Samanera: the tab set is identical, but M3 is labelled "ตารางเรียน" when the schedule contains class entries, M0 never
appears (zero management permissions, matrix verification line), and the default landing is "วันนี้" showing today's
class and learning quests first (research persona P4). No chat, no community tab, no points numbers unless the
guardian/teacher setting allows (see ACCESSIBILITY_SIMPLE_MODE §8).

### 4.2 Community & Staff Mode (all other roles)

| Slot | Tab (TH) | EN | Content | Visible when |
|---|---|---|---|---|
| C0 | **วัด** | Temple (management) | Section 5, restricted to the person's permissions | any management permission (section 5.1): facility_manager, department_lead, ceremony_lead, temple_admin, office_staff, waiyawatchakon, accountant |
| C1 | **หน้าหลัก** | Home (role-aware) | Module stack from `HOME_MODULE_REGISTRY.md` | everyone |
| C2 | **ภารกิจ** | Quests | My quests, claimable quests, volunteer quests | everyone (`quest.view`) |
| C3 | **กิจกรรม** | Events | Today at this temple, upcoming events, event detail | everyone (`event.view`; community_member sees public items only) |
| C4 | **แผนที่วัด** | Temple map | 3D/2D/list | everyone with temple membership |
| C5 | **ชุมชน** | Community | Profile, connections, chat, groups, volunteer wall, rewards, points history | `community.participate` (S) **and** not a minor **and** temple has community enabled |
| C6 | **ฉัน** | Me | As M5 | everyone (also via avatar) |

Phone order (first four plus More): C1 หน้าหลัก · C2 ภารกิจ · C3 กิจกรรม · C5 ชุมชน (or C4 แผนที่วัด if C5 hidden) ·
เพิ่มเติม (remaining). When C0 applies it takes the first slot: วัด · หน้าหลัก · ภารกิจ · กิจกรรม · เพิ่มเติม.
Landing tab: C1 for everyone; C0 only for roles whose home composition begins with a management module
(abbot-level; none in this mode by default, so C1).

Minor-flagged membership (any role; `minor_overrides` deny `community.p2p_chat`, `community.calls`,
`community.public_profile`): C5 is **hidden**. Points, volunteer quests, events and Temple Contact remain reachable through
C2, C3 and ฉัน. No entry point to chat, call, DM, connection request or public profile appears anywhere (also
not in search, not in "people at this temple"). Guardian and sponsor details are visible only in ฉัน to the minor
as "ผู้ปกครองที่ให้ความยินยอม: (ชื่อ)".

`lay_resident` (แม่ชี / ผู้พำนักในวัด, HYPOTHESIS): C1 shows volunteer-like modules plus meal presence; C5 as per rules.
`temple_boy`: Simple Mode default; C5 hidden unless the temple confirms the person is an adult.

## 5. Management area ("วัด")

### 5.1 Visibility of the tab

The tab renders when the person holds **at least one** of these permissions at any scope, and shows only the
sections whose gate is met:

| Section (TH / EN) | Gate (exact codes) | Notes |
|---|---|---|
| ศูนย์บัญชาการ / Command Center | `command_center.view` (T for abbot, deputy, assistant, secretary; D for facility_manager, department_lead, ceremony_lead; D(staff panel) for temple_admin) | Panels inside are gated individually (COMMAND_CENTER_UX §3). |
| กิจนิมนต์ / Invitations | `invitation.manage` (T) or `invitation.view` (T) | Inbox, intake, Smart Assignment proposal, calendar. `invitation.view` A roles (bhikkhu, driver) see only their own through ตาราง / Driver home, not this section. |
| ตารางพระ / Availability board | `availability.view` (T for the four management monastics; C for ceremony_lead and office_staff, which gives counts and coarse states only) | |
| กำลังคน / Staff presence | `presence.view` (T, D; C for every staff role = coarse team counts only) | Names and six-state detail need `presence.view` at D or T; counts come from the Command Center panel. |
| งานและภารกิจ / Quests admin | `quest.assign`, `quest.verify`, `quest.manage` (D or T) | Verify queue, assignment boards, claimable pool. |
| กิจกรรม / Events admin | `event.manage` (D or T), `event.approve` (restricted) | Event list, department boards, staffing gaps, approvals, duplicate from Temple Memory. |
| พิธี / Ceremonies | `ceremony.confirm_monks` (restricted), `event.manage` | Roster confirm. `ceremony_lead` can propose, not confirm. |
| อนุมัติ / Approvals | any of `invitation.confirm`, `ceremony.confirm_monks`, `event.approve`, `event.volunteer_approve`, `quest.verify`, `points.award_community` | A single queue grouped by type; only the types the viewer may act on. |
| ทรัพย์สินและซ่อมบำรุง / Facility | `asset.view`, `maintenance.manage`, `vehicle.view`, `inventory.view` | Work orders, assets (QR), inventory, vehicles, trips. |
| ผู้คน / People | `member.view` (T, D, Tm) / `member.manage` (restricted) | Directory scoped; monk directory vs lay directory per matrix note 5. |
| รายงาน / Reports | `report.view` | |
| กล่องข้อความวัด / Temple Contact inbox | `contact_inbox.manage` | Routing and replies; public messages to monastics land here. |
| รางวัล / Rewards admin | `reward.manage` (office_staff, waiyawatchakon; lay-only), `points.award_community` | Catalog, fulfilment, award queue. |
| ตรวจสอบเนื้อหา / Moderation | `moderation.manage` | Reports and blocks review. |
| เอกสารและการจอง / Documents and bookings | `document.view` / `document.manage` / `booking.manage` | **P2**, hidden until F-42. |
| การเงิน / Finance | `finance.view` (restricted: abbot oversight, waiyawatchakon, accountant) | **P2 / post-pilot**, hidden until F-43; never rendered in any monastic user's own balance. |
| บันทึกตรวจสอบ / Audit log | `audit.view` (abbot only) | |
| ตั้งค่าวัด / Temple settings | `temple.settings` | `temple_admin` sees non-restricted items only. |
| ทะเบียนพิธีฌาปนกิจ / Funeral register | `funeral.register.view` (abbot; office_staff create/edit) | Restricted; counts only elsewhere (FUNERAL §4). Rite lists (alias names only) need `funeral.assigned.view`. |
| ความปลอดภัย / Security records | `security.log.view` (D; abbot, deputy T), `security.incident.view` (restricted: abbot, deputy, security department lead) | Gate log and incident records; guards add entries with `security.log` (S). |

### 5.2 Management navigation shape

```
วัด
 ├─ ภาพรวม (Command Center)          ← landing for command_center.view
 ├─ รออนุมัติ (Approvals)            ← badge = count of items THIS viewer may act on
 ├─ กิจนิมนต์ → กล่องรับ · ข้อเสนอรายชื่อพระ · ปฏิทิน
 ├─ พระและสามเณร → กระดานสถานะ (availability board) · ความขัดแย้ง
 ├─ เจ้าหน้าที่ → วันนี้ · เวร · ลา
 ├─ กิจกรรมและพิธี → รายการ · ความพร้อม · อาสาที่ยังขาด · ความรู้ของวัด
 ├─ ภารกิจ → คิวตรวจรับ · มอบหมาย
 ├─ อาคารและทรัพย์สิน → ใบสั่งซ่อม · สินทรัพย์ · วัสดุ · รถและเที่ยวรถ
 ├─ ผู้คน · รายงาน · กล่องข้อความวัด · รางวัล · ตรวจสอบเนื้อหา
 └─ ตั้งค่า (เฉพาะผู้มีสิทธิ์)
```
On phone, this is a list page (section headers, 56 px rows). On tablet/desktop it is a secondary nav column beside
content. Only rows the viewer may open appear; empty section headers are removed.

## 6. Deep links

### 6.1 Route conventions

Routes carry **no temple id in the path**; the active temple comes from the session. Item ids are opaque and
non-sequential. A route may carry an optional temple hint `?w=<temple-slug>` used only to offer a switch.

| Screen | Route (pattern) | Required to open | Notes |
|---|---|---|---|
| Home | `/` | login | Landing per section 4 |
| My Day | `/day` | monastic mode | Query `?d=YYYY-MM-DD` for another day |
| Quest list / detail | `/quests`, `/quests/{id}` | `quest.view` | |
| Verify queue | `/manage/verify` | `quest.verify` | |
| Schedule | `/schedule` | `schedule.view` | |
| Availability board | `/manage/availability` | `availability.view` | |
| Invitation inbox / detail / proposal | `/manage/invitations`, `/manage/invitations/{id}`, `/manage/invitations/{id}/proposal` | `invitation.manage` or `invitation.view` | |
| Command Center | `/manage/command-center` (+ `/panel/{monastic\|staff\|quests\|events\|facility\|community}`) | `command_center.view` | |
| Events | `/events`, `/events/{id}`, `/events/{id}/readiness` | `event.view` (readiness detail: not community_member) | |
| Map | `/map`, `/facility/buildings/{code}` | membership | Building code is the stable key (SPATIAL_REGISTRY §3) |
| Work order | `/facility/work-orders/{id}` | `maintenance.report` (own) / `maintenance.manage` | Reporter always sees own report |
| Asset by QR | `/q/{token}` | login + membership in the owning temple | Foreign/unknown token = generic not found (ASSET_INVENTORY §2) |
| Staff check-in QR | distinct prefix `/c/{token}` | `presence.set_self` | Different family from asset QR so a wrong scan is harmless |
| Driver trip | `/trips/{id}` | `vehicle.view` (A) | |
| Community | `/community/*` | `community.participate`, not minor | |
| Temple Contact (public) | `/contact` or `/{temple-slug}/contact` | none (works logged-out) | Public compose |
| Temple page (public) | `/{temple-slug}` | none | Discovery, public events |
| Settings | `/me/settings`, `/me/privacy`, `/me/consent` | login | |

### 6.2 Resolution order for any deep link

```
1 Not logged in      -> sign in, then continue to the same link (link kept through OTP)
2 Public route       -> open without login (public temple page, public event, Temple Contact)
3 No active temple   -> if exactly one ACTIVE membership: select it; else show the switcher with the link kept
4 Temple hint (?w=) differs from active temple:
      user has ACTIVE membership in hinted temple -> prompt "ลิงก์นี้เป็นของ วัด X  [สลับวัด] [ยกเลิก]"
      otherwise                                    -> generic "ไม่พบรายการ" (same as missing)
5 Item not in active temple, or deleted             -> generic "ไม่พบรายการ" + [กลับหน้าหลัก]
6 Item exists but viewer lacks scope                -> permission-denied state (STATE_PATTERNS §5), only when the
                                                      viewer already has a legitimate way to know it exists (e.g. a
                                                      notification pointing to it); otherwise same as 5
7 Open
```
After switching temple through a prompt the link is re-resolved from step 5. Links never contain personal data or
names. Share-to-LINE of a public event link carries only the public route.

### 6.3 Back behaviour
Back returns to the previous screen inside the same temple; after a temple switch the history stack is reset to the
landing tab so the user cannot step "back" into the previous temple's screens.

## 7. No-membership user (Temple Discovery)

A signed-in person with zero ACTIVE memberships (or a logged-out visitor) lands on **ค้นหาวัด**:

```
┌ ค้นหาวัด ─────────────────────────────┐
│ [🔍 ชื่อวัด / จังหวัด / ตำบล         ]│
│ วัดที่ติดตาม  (0)                     │
│ ผลการค้นหา                            │
│  ┌ วัดศรีสุข · ลำพูน ───────────────┐ │
│  │ กิจกรรมสาธารณะ: 2  [ดูวัด]       │ │
│  └──────────────────────────────────┘ │
└───────────────────────────────────────┘
Temple page (public): ชื่อวัด · ที่อยู่ · แผนที่ 2D (LITE) · กิจกรรมสาธารณะ ·
   อาสาที่ต้องการ (เฉพาะ "ต้องการอาสา N คน (ฝ่าย X)") · [ติดตาม] · [ขอเข้าร่วม] · [ติดต่อวัด]
```
Available without membership: search, follow, public events, public volunteer needs, 2D/3D visit of public areas,
Temple Contact compose, request to join (default role `community_member` only; a person who is a monk may optionally present an attestation from another temple, default off), request to volunteer.
Not available: quests, schedule, any people list, chat, points. Public pages show no monk names, no counts of monks,
no readiness detail, no maintenance (EVENT spec §7).
A pending join request appears in the switcher as "รออนุมัติ" with a withdraw action. Rejection shows the reason
given by the admin (reason is mandatory, TENANCY §4).

## 8. Notifications

| Rule | Detail |
|---|---|
| Surfaces | In-app inbox (🔔) first; push is P1 (F-38), LINE OA is P1 and never the only channel (Q-04). |
| Grouping | Grouped per temple; a temple's items open in that temple (with the switch prompt of section 6.2 when needed). Notifications of non-active temples show only "มีรายการใหม่ใน วัด X" (no content) until the person switches. |
| Quiet hours | Default **no push 21:00-05:00 (Asia/Bangkok)**, configurable per person; HYPOTHESIS. Exception: maintenance severity S1 "ฉุกเฉิน" to its named recipients (MAINTENANCE §4). Monastics: no sound/vibration by default. |
| Content | No health reason, no leave reason, no host phone, no deceased name, no points amount for monastics in push text. Example: "มีงานใหม่ในตาราง วันนี้ 09:00" not "ถูกมอบหมายเพราะ…". |
| Action items | Items needing a decision (approve, verify) show the accountable role: "รอตรวจรับโดย หัวหน้าฝ่ายครัว". |
| Monk acknowledgements | A monk receiving a roster or invitation assignment sees "รับทราบ" and "แจ้งติดขัด" (ceremony spec §6.1 wording), never "ปฏิเสธ". |
| Proxy | A secretary may read a monk's notifications only if the monk's device is shared/proxy-enrolled (FLOWS F-02). |

## 9. Role landing summary

| Role group | Landing tab | First module / screen |
|---|---|---|
| abbot, deputy_abbot, abbot_assistant | วัด | Command Center overview (W01), then approvals |
| monk_secretary | วัด | Invitations inbox, then availability board |
| bhikkhu, samanera, visiting_monastic | วันนี้ | My Day (W02) |
| facility_manager, department_lead, ceremony_lead | หน้าหลัก | Own role home; วัด tab available (scope D Command Center) |
| temple_admin | หน้าหลัก | Member admin, moderation queue |
| office_staff, accountant, waiyawatchakon | หน้าหลัก | Per registry composition |
| housekeeper, kitchen_staff, gardener, driver, security_guard, traffic_staff, staff_general, temple_boy, technician, undertaker, ceremony_team | หน้าหลัก | Role home (W09-W11 and registry) |
| volunteer, community_member, lay_resident | หน้าหลัก | Community home (W12) |
| no membership | ค้นหาวัด | Discovery (section 7) |

## 10. Open questions for Opus / later waves

| ID | Question |
|---|---|
| NAV-Q1 | Is the temple switcher allowed to show "ถูกระงับ" with the temple name (leaks nothing beyond what the person already knows) or must it be anonymous? Default here: name shown. |
| NAV-Q2 | Phone bar rule (4 tabs + More) departs from the skeleton's 5-6 flat tabs; accepted? |
| NAV-Q3 | Should the abbot-level landing be Command Center or the approvals queue? Default: Command Center with approvals as panel 2 (matrix §5 order). |
| NAV-Q4 | Quiet-hours defaults (21:00-05:00) are HYPOTHESIS; field-test with secretary monks and kitchen staff (kitchen starts early). |
