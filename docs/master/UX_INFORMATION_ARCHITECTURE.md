# UX INFORMATION ARCHITECTURE — BOON SYSTEM

Status: **DRAFT v0.1 skeleton (Wave 0, Opus)**. Agent 03 produces detailed flows and wireframes in Wave 1 under
`docs/ux/`; Opus merges accepted changes here.

## 1. Platform assumption (ADR-0001)

Mobile-first responsive web app (installable PWA) built with Next.js. Command Center and office work are also
optimised for tablet/desktop. Native apps are deferred until the pilot proves need (push reliability on iOS and
voice are the main reasons to revisit).

## 2. Global structure

```
Launch → Sign in (phone OTP / email / LINE?) → Temple picker (if >1 membership; remembers last)
      → App shell [ temple switcher · mode badge · notifications · profile ]
          ├─ MONASTIC MODE tabs:   วันนี้ (My Day) · ภารกิจ · ตาราง · แผนที่วัด · ฉัน
          │      + management tab "วัด" (Command Center, People, Invitations, Events, Approvals, Reports)
          │        visible only with command_center.view / invitation.manage
          └─ COMMUNITY & STAFF MODE tabs: หน้าหลัก (role-aware) · ภารกิจ · กิจกรรม · แผนที่วัด · ชุมชน · ฉัน
                 (ชุมชน hidden for minors or if community disabled by temple)
```
No-membership user: Temple Discovery (search, follow, public events, 3D/2D visit) → request to join / volunteer.

## 3. Screen inventory (P0 first)

| Area | Screens |
|---|---|
| Onboarding | Sign in, OTP, consent (PDPA, sensitive data, minor/guardian), temple picker, join request |
| Command Center | Overview (Monastic / Staff / Quest / Events / Facility / Community panels), drill-down lists, Unknown explainer |
| My Day | Timeline (schedule + quests), availability toggle, check-in, daily summary |
| Quest | List (filters by status/derived OVERDUE), detail, checklist, evidence capture, verify queue |
| Availability | Board (by state, incl. ไม่ทราบ), monk detail, conflicts |
| Invitation | Inbox, intake form, Smart Assignment proposal (with reasons), confirm, calendar |
| Event / Boss Quest | Event list, readiness view, department boards, staffing gaps, duplicate from memory |
| Map | 3D / 2D toggle, building sheet, layers (quest/event/maintenance) |
| Facility | Work orders, asset (QR scan), inventory, vehicles, trips |
| Community | Profile with field visibility, connections, chat, groups, calls, volunteer quests, rewards, points history |
| Temple Contact | Public compose; temple inbox & routing |
| Settings | Language TH/EN, text size, high contrast, reduced motion, Simple Mode, 3D quality, privacy |

## 4. Interaction rules

1. **Unknown is a first-class value.** Display "ไม่ทราบ" with a reason tooltip ("ไม่มีการเช็กอินหรือตารางวันนี้").
   Never show 0 when the truth is unknown.
2. Every list has designed **empty, loading (skeleton), error (retry + offline), and permission-denied** states.
3. Thai first: copy written in Thai, then English; Thai typography line-height ≥ 1.6; no truncation of Thai
   combining marks; Buddhist Era dates shown (พ.ศ.) with Gregorian in data.
4. Simple Mode: larger targets (≥ 56 px), fewer modules, voice entry prominent — for elderly monks and staff.
5. Gamification tone: calm progress (rings, streak flame-free motif e.g. lotus bloom), no loot boxes, no casino
   sounds, no public ranking of monastics.
6. Actions with consequence (confirm invitation, verify quest, redeem reward) show who is accountable and are
   undoable where the domain allows.
7. AI output always labelled "ร่างโดย AI" and requires an explicit accept.

## 5. North-star question → screen

| Who | Question | Answered on |
|---|---|---|
| พระ | วันนี้ผมต้องทำอะไร? | My Day |
| พระเลขานุการ | ตอนนี้มีพระกี่รูปพร้อมออกกิจ? | Availability board / Command Center Monastic panel |
| เจ้าอาวาส | วันนี้ทั้งวัดเป็นอย่างไร? | Command Center overview |
| แม่บ้าน | พื้นที่ไหนต้องทำ? | Housekeeper home: My zones |
| คนครัว | ต้องเตรียมอาหารกี่คน? | Kitchen home: headcount |
| คนขับ | ต้องออกกี่โมง? | Driver home: next departure |
| มัคนายก | พิธีพร้อมหรือยัง? | Ceremony readiness |
| ช่าง | จุดไหนมีปัญหา? | Work orders + map maintenance layer |
| อาสา | มีอะไรให้ผมช่วย? | Volunteer quests |
| ญาติโยม | วันนี้วัดมีกิจกรรมอะไร? | Community home: Today at this temple |
