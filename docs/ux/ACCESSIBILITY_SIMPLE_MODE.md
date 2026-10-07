# ACCESSIBILITY AND SIMPLE MODE — BOON SYSTEM (ระบบบุญ)

Owner: Agent 03 · Wave 1b · Readiness: **DESIGNED** (rules only; nothing user-tested)
Scope: large text, high contrast, reduced motion, screen reader, Thai typography, Simple Mode. Agent 04 chooses fonts,
colours and motion within these rules; Agent 06 implements them; Agent 14 turns section 12 into tests.
User groups come from `docs/research/07_PERSONAS.md` (all **HYPOTHESIS**, not validated): elderly monks and staff,
housekeepers on basic phones, kitchen staff with wet or busy hands, drivers using the phone hands-free, a young monk
with a quiet device, novices and temple boys (possible minors) on shared devices, older volunteers on LINE-heavy phones.

## 1. Principles

| # | Principle |
|---|---|
| A-1 | Accessibility settings are **first-run choices**, not buried: the Welcome screen offers text size and Simple Mode before any form (FLOWS F-01). |
| A-2 | Respect the operating system first (font scale, contrast, reduced motion, Save-Data); the app setting can only make things more accessible, never override the OS to be less so. |
| A-3 | No information by colour alone; no information by position alone; no information by motion alone. |
| A-4 | Everything reachable by touch alone has a non-gesture alternative (no swipe-only, long-press-only, drag-only, hover-only). |
| A-5 | The 3D map is never the only way to reach anything (NAVIGATION N-4); LITE mode is first-class. |
| A-6 | Simple Mode is a **different density of the same product**, not a different product: same permissions, same data, fewer things on screen. |
| A-7 | Thai is the primary language; Thai text must render correctly at every size (section 7). |

## 2. Settings (ฉัน > การแสดงผล / Display)

| Setting | Options | Default | Notes |
|---|---|---|---|
| ภาษา / Language | ไทย, English | ไทย | UI strings Thai first; English for labels, never replaces Thai names of people/places |
| ขนาดตัวอักษร / Text size | ปกติ 100%, ใหญ่ 125%, ใหญ่มาก 150%, ใหญ่พิเศษ 200% | follows OS font scale; else 100% | Live preview with a real card (not lorem ipsum) |
| ความคมชัดสูง / High contrast | ปิด, เปิด | follows OS `prefers-contrast` | section 4 |
| ลดการเคลื่อนไหว / Reduced motion | ปิด, เปิด | follows OS `prefers-reduced-motion` | section 5 |
| โหมดง่าย / Simple Mode | ปิด, เปิด | off; **on by default for `temple_boy`** (GENERAL §6) and suggested after the user raises text size to 150% or more | section 8 |
| ธีม / Theme | ตามระบบ, สว่าง, มืด | ตามระบบ | Both themes meet section 4 |
| แผนที่สามมิติ / 3D quality | อัตโนมัติ, แบบเรียบง่าย (LITE), สมดุล, สูง | อัตโนมัติ | Auto uses device memory, GPU tier, reduced motion, Save-Data, battery (3D_STRATEGY §2) |
| ตัวเลข / Digits | ตัวเลขอารบิก, ตัวเลขไทย | อารบิก | Dates always พ.ศ.; Thai digits are optional |
| อ่านเวลาแบบไทย / Spoken time | ปิด, เปิด | ปิด | "เก้าโมงเช้า" beside "09:00 น." (HYPOTHESIS; helps older users) |
| แจ้งเตือนเงียบ / Quiet hours | start-end | 21:00-05:00 | NAVIGATION §8; urgent S1 maintenance exempt |
| อุปกรณ์ร่วม / Shared device | ปิด, เปิด | off | short session, wipe on sign-out (FLOWS F-02) |

Storage: settings belong to the person (synced across devices) except Shared device and 3D quality, which are per
device. Browser storage may fail; every screen must render with defaults when it does.

## 3. Large text

1. Body text is at least **16 px at 100%**; secondary captions at least **14 px** (Thai tone marks need it, section 7).
   Simple Mode body is at least **18 px** (GENERAL §6).
2. All sizes are relative units that scale with the OS and the app setting up to **200%** with no loss of content or
   function and **no horizontal page scroll at a 320 px viewport** (WCAG 1.4.4 and 1.4.10).
3. Layout reflows: tab bars collapse to the "เพิ่มเติม" pattern; two-up tiles become one column at >= 150%; tables become
   cards; buttons grow with text; nothing is clipped by fixed heights.
4. No key information is truncated. Where a single line must be shortened (title in a compact row), truncation is at
   a word or grapheme-cluster boundary, the full text is available on tap, and the screen reader reads the full text.
5. Interactive targets are at least **48 x 48 px** (default) and **56 x 56 px** in Simple Mode, with at least 8 px between
   targets (12 px in Simple Mode). Primary actions are full-width on phones.
6. Line length: 45-75 Latin characters or about 35-45 Thai characters per line on tablet/desktop content columns.

## 4. Contrast and colour

| Rule | Value |
|---|---|
| Text contrast (normal mode) | >= 4.5:1 (large text >= 3:1), WCAG 2.2 AA, both themes |
| UI components and graphics | >= 3:1 against adjacent colours |
| **High contrast mode** | text >= 7:1, UI >= 4.5:1, 2 px solid borders on cards, inputs and buttons, no text on image or gradient, no translucent surfaces |
| Focus indicator | >= 2 px, >= 3:1, never removed; visible on every interactive element, including tiles |
| States | Every state has **icon shape + words**: ว่าง (check-circle), ไม่ทราบ (? in circle), ไม่พร้อม (minus-circle), ความขัดแย้ง (triangle), ออนไลน์/ออฟไลน์ (cloud / cloud-off). Never green/red alone |
| Event readiness chip | Never green unless READY; each state has a distinct shape and word (EVENT §5.7) |
| Unknown in charts | Hatched pattern + label; distinct from "ว่าง" (STATE_PATTERNS §6) |
| Dark theme | Not pure #000/#FFF pairs for large areas (halation for older eyes); same contrast rules |
| Colour-blind safe | Rely on shape/text first; palette choice by Agent 04 must pass a protan/deutan/tritan simulation |

## 5. Reduced motion

When OS or app setting is on:
1. No parallax, no auto-playing animation, no shimmer skeletons (static blocks), no animated counters.
2. Progress rings and lotus-bloom motifs show the final state without animation.
3. Page and sheet transitions: instant or cross-fade <= 100 ms.
4. 3D: camera moves cut instead of flying, no particles, no river/ambient animation; the app **defaults to LITE** and asks
   before loading 3D ("เปิดแผนที่สามมิติ?").
5. Toasts do not slide; they appear and stay >= 10 s with undo (STATE_PATTERNS §11).
6. Even with motion on: no flashing content (nothing flashes more than three times per second), no autoplay audio,
   no sound effects by default.

## 6. Screen reader and keyboard

Target: TalkBack (Android) and VoiceOver (iOS) in Thai; desktop NVDA/JAWS/VoiceOver; keyboard-only.

| Area | Rule |
|---|---|
| Language | `lang="th"` on Thai content; mixed English labels carry `lang="en"` so the voice switches correctly |
| Landmarks | Header (temple switcher, notifications, avatar), navigation (tab bar), main, complementary (detail pane), footer; one `h1` per screen = screen name |
| Order | DOM order = visual order; the management strip and approvals come before panels |
| Names | Every icon button has a Thai accessible name ("สลับวัด", "การแจ้งเตือน", "โปรไฟล์ของฉัน"); tiles read value + total + action: "ว่าง 3 รูป จากทั้งหมด 12 รูป แตะเพื่อดูรายชื่อ" |
| Status changes | Polite live region once per change ("บันทึกแล้ว", "ออฟไลน์ รอส่ง 2 รายการ", "ข้อมูลเมื่อ 3 นาทีที่แล้ว"); errors use assertive only for blocking errors; focus does not jump |
| Forms | Visible labels (not placeholder-only), error summary at top with links, inline error tied to field, required marked in words ("จำเป็น") |
| Sheets and dialogs | Focus moves into the sheet, is trapped while open, returns to the trigger on close, Esc closes on desktop |
| Counters and charts | Table or list alternative for every chart; Unknown read as "ไม่ทราบ N" |
| Map | List alternative is a first-class tab ("รายการอาคาร"); every marker reachable and named "<อาคาร> มีปัญหาระดับสูง 1 รายการ"; 3D canvas has `aria-hidden` plus the list as the accessible equivalent |
| QR scanning | Camera is optional: "พิมพ์รหัสแทน" and "ให้เจ้าหน้าที่สแกนให้" alternatives (J-03) |
| Time limits | No session timeouts mid-form except shared-device idle (30 min) which warns and extends on any key press |
| Touch alternatives | Single-pointer operation only; no path-based gestures; drag-and-drop (roster ordering) has up/down buttons |
| Notifications | Text only content that is safe on a lock screen (NAVIGATION §8) |
| Audio | None required; optional "ฟัง" (read aloud) on key Simple Mode cards uses the device speech engine (HYPOTHESIS: Thai TTS quality varies by phone) |

## 7. Thai typography rules

| # | Rule | Reason |
|---|---|---|
| T-1 | Body `line-height` >= **1.6** (master UX §4.3); headings >= 1.4; never set a smaller line-height in a container with `overflow: hidden` | Stacked vowels and tone marks (ั ิ ี ้ ๊ ็ ่ ๋ ์) extend above and below the line and are clipped by tight boxes |
| T-2 | Never clip combining marks: containers have at least 0.25 em vertical padding; line clamps only at whole lines; truncation points are grapheme-cluster boundaries (use a grapheme segmenter, never a character count); no mid-cluster cut in any language | Master UX §4.3 "no truncation of Thai combining marks" |
| T-3 | Font stack is **Thai-first**: a typeface designed for Thai with correct mark positioning, then Latin fallback; Agent 04 verifies tone-mark stacking on phrases such as "ผู้ปกครอง", "กิจนิมนต์", "พระครู", "ปรับปรุง", "ที่ต้องทำ" at 14 px and 200% | Latin-first stacks fall back to fonts that mis-place marks |
| T-4 | Minimum rendered size 14 px for any Thai text (16 px body) | Marks become illegible below this |
| T-5 | No `letter-spacing` on Thai text; no `text-transform: uppercase`; no italics or synthetic bold-oblique on Thai | Distorts or breaks Thai letterforms; Thai has no case |
| T-6 | **Left-aligned**, never justified | Thai has no inter-word spaces; justification creates rivers |
| T-7 | Line breaking: rely on the browser's Thai dictionary line breaking (`word-break: normal`, `overflow-wrap: break-word`); never `break-all` on Thai; do not insert manual zero-width spaces except for specific long proper names that break wrongly (document each) | Thai phrases are written without spaces; forced breaks cut words |
| T-8 | Text boxes may grow: no fixed widths for buttons or chips; budget +30% length when translating English labels to Thai and +40% from Thai to English for English-mode layouts | Prevent overflow |
| T-9 | Dates: พ.ศ. year (Gregorian + 543), abbreviated month names (ม.ค. ... ธ.ค.), 24 h clock for schedules, "น." in sentences; stored as UTC instants, rendered Asia/Bangkok | master UX §4.3 |
| T-10 | Numerals: Arabic by default, Thai digits optional (section 2); never mix both in one number; units in Thai (รูป for monastics, คน for lay people, ที่ for meals, คัน for vehicles) | Consistency |
| T-11 | Sorting uses Thai collation (e.g. `Intl.Collator("th")`); search normalises vowel/tone-mark order and ignores insignificant zero-width characters | Correct find-as-you-type |
| T-12 | IME composition is never interrupted: no live validation or re-render of a field during composition; no auto-capitalisation or auto-correct side effects on Thai names | Thai IME composes marks |
| T-13 | Names and titles are shown **in full** with their title prefix (พระครู..., พระมหา..., นาย/นาง/นางสาว); never shorten to initials in lists for people who can see the full name; masked names (funeral) follow the role rule, not truncation | Respect for monastic titles |
| T-14 | Mixed Thai and Latin text uses the same line-height and baseline; a Latin word in Thai text is never wrapped alone on a line if avoidable | Visual rhythm |
| T-15 | Buddhist-era and lunar labels are display labels only; the app never derives a lunar date (EVENT §2.1) | Domain rule |
| T-16 | Test strings include the hardest cases: stacked marks, long Thai sentences without spaces, long monastic titles, mixed Thai+English+digits, "ๆ" and "ฯ" | Regression set for Agent 14 |

## 8. Simple Mode

### 8.1 Purpose and users
For elderly monks and staff, people unfamiliar with apps, and users with low vision or tremor. It reduces what is on
screen and enlarges everything; it never removes safety information or changes permissions.

### 8.2 Rules

| # | Rule |
|---|---|
| SM-1 | **Modules:** show only modules flagged **S** in `HOME_MODULE_REGISTRY.md`, at most **five**, in the role's composition order, plus pinned controls (check-in, report problem). The rest sit behind one item "ดูทั้งหมด". |
| SM-2 | **Targets and text:** targets >= 56 px, gaps >= 12 px, body text >= 18 px, default text size at least "ใหญ่" (125%). |
| SM-3 | **One primary action per screen**, full-width, verb label in Thai plus an icon. Secondary actions are text links below, never beside. |
| SM-4 | **Bottom bar has three items:** หน้าหลัก · ภารกิจ (งานของฉัน) · เมนู (everything else, including แผนที่วัด, ตาราง, ฉัน). |
| SM-5 | **Plain sentences before tiles:** key numbers are shown as a sentence ("ตอนนี้พระว่าง 3 รูป ไม่ทราบสถานะ 2 รูป"). Unknown is always in the sentence. |
| SM-6 | **No gesture dependence**, no hover, no drag; no auto-dismissing messages shorter than 10 s; confirmations use words ("ใช่ ยืนยัน" / "ยกเลิก"), never icons alone. |
| SM-7 | **No dense tables or charts:** lists become cards (title, time, place, status word). Filters limited to two. |
| SM-8 | **Voice entry prominent:** a large "พูด" button on forms that support drafts. Before Wave 7 it uses the device keyboard dictation into text fields; from Wave 7 it produces an **AI draft** that a human accepts (STATE_PATTERNS §10). |
| SM-9 | **Pictures help:** for housekeeper, gardener and temple_boy homes, each card carries a recognisable building or task icon (picture-first; research persona P6). |
| SM-10 | **Safety unchanged:** permission-denied, Unknown, accountability lines and undo links still appear (shortened wording, same meaning). |
| SM-11 | **Reversible and never locked:** "โหมดเต็ม" is always available in เมนู > การแสดงผล; switching does not change data. |
| SM-12 | **Management in Simple Mode** (abbot, secretary): Command Center becomes three large sentence cards - "วันนี้ทั้งวัด", "รออนุมัติ N", "พระว่างกี่รูป" - each opening a full-screen list with big rows; other panels under "ดูทั้งหมด". |
| SM-13 | **Read aloud** button ("ฟัง") on the first card of each home (HYPOTHESIS). |
| SM-14 | Notifications default to the quietest tier; no badge counts beyond a dot. |

### 8.3 Simple Mode composition by role (from registry flags)

| Role | Modules shown (S) | Pinned |
|---|---|---|
| bhikkhu | `mo.my_day`, `mo.availability_toggle`, `+mo.pending_ack` | - |
| samanera | `mo.novice_today`, `mo.my_day` | - |
| abbot, deputy, assistant | three sentence cards (SM-12) + `mg.verify_queue` if any | - |
| monk_secretary | `mg.invitations_inbox` (counts as sentence), `mg.availability_board` (sentence), `mo.my_day` | - |
| housekeeper | `wf.my_zones_today`, `wf.cleaning_checklist` | check-in, report problem |
| kitchen_staff, kitchen lead | `wf.meals_today_headcount`, `wf.kitchen_prep_quests` | check-in, report problem |
| gardener | `wf.garden_zones_watering`, `wf.my_quests_today` | check-in, report problem |
| driver | `fac.today_trips`, `fac.vehicle_status`, `fac.report_vehicle_issue` | check-in |
| security_guard | `wf.shift_handover`, `wf.patrol_rounds`, `wf.gate_log`, `wf.incident_report` | - |
| traffic_staff | `wf.event_traffic_quests` | check-in, report problem |
| ceremony_lead | `ev.next_ceremony_readiness`, `ev.timeline`, `ev.checklist` | - |
| ceremony_team, undertaker | `ev.checklist`, `ev.timeline` / `ev.funeral_assigned` | check-in |
| staff_general, temple_boy, volunteer | `wf.my_quests_today` | check-in, report problem |
| community_member, lay_resident | `cm.today_at_temple`, `cm.volunteer_quests` | - |
| technician, facility_manager | `fac.workorders_open` | report problem, scan |
| office_staff, accountant, waiyawatchakon, temple_admin | not recommended (desktop-oriented); Simple Mode available but shows the first S module only | - |

### 8.4 Examples (Thai)

```
Simple Mode — พระภิกษุ (วันนี้)                   Simple Mode — แม่บ้าน
┌────────────────────────────────────┐            ┌────────────────────────────────────┐
│ 🔊 ฟัง                              │            │ 🔊 ฟัง                              │
│ วันนี้ พุธ 7 ต.ค. 2569              │            │ วันนี้ต้องทำ 3 ที่                    │
│                                    │            │ ┌──────────────────────────────┐   │
│ ถัดไป  09:00 น. (เก้าโมงเช้า)       │            │ │ 🏛 ศาลาการเปรียญ   ถึง 10:00  │   │
│ กิจนิมนต์ บ้านคุณสมชาย              │            │ └──────────────────────────────┘   │
│ ขึ้นรถ 08:25 น.                     │            │ ┌──────────────────────────────┐   │
│                                    │            │ │ 🚻 ห้องน้ำหลัง   ถึง 11:30     │   │
│  [  รับทราบ  ]  (ปุ่มใหญ่)          │            │ └──────────────────────────────┘   │
│  ติดขัด? แจ้งเลขา                   │            │  [ แจ้งปัญหา ]   [ เช็กอิน ]        │
│ สถานะของฉัน: ไม่ทราบ  [ตั้งสถานะ]   │            │ ─────────────────────────────────  │
├────────────────────────────────────┤            │ หน้าหลัก │ งานของฉัน │ เมนู          │
│ หน้าหลัก │ ภารกิจ │ เมนู             │            └────────────────────────────────────┘
└────────────────────────────────────┘
```

## 9. Device, network and shared-use assumptions (HYPOTHESIS, to validate in the field)

| Assumption | Design consequence |
|---|---|
| Many staff use low-end Android with <= 4 GB RAM (R-11) | LITE map default for Save-Data/low memory; core UI must not wait for 3D; image sizes capped; no heavy animation |
| 3G/4G with drops | Skeleton + cache-first; offline queue for permitted actions (STATE_PATTERNS §8) |
| Shared and proxy devices for monks/novices (research P1-P4) | Shared device mode; no data left after sign-out; no notifications with content on lock screen |
| Wet or busy hands, gloves | Large targets; voice/dictation; one-handed reachable primary actions at the bottom |
| LINE-heavy lay users | Public links shareable to LINE without personal data; LINE is a notification channel, never the identity (Q-04) |
| Camera may be denied or absent | QR has typed-code and staff-assist alternatives |

## 10. What is never done for accessibility reasons or otherwise

No CAPTCHA that depends on vision alone; no auto-playing media; no timed actions under 20 s without extension; no content
that requires hovering; no colour-only legends; no identification of people by photo alone; no sound-only alerts; no
reliance on shake or tilt.

## 11. Minors and shared devices

Accessibility settings follow the person; samanera and temple boys on a shared device see the settings of whoever is signed
in. Simple Mode is the default for `temple_boy`; guardian-consent status and sponsor name are shown in plain language (FLOWS F-01).
No accessibility feature (voice, read aloud) may record or upload audio of a minor without the consent captured in F-01.

## 12. Acceptance checklist (for Agent 14 and design review)

| # | Check | Pass criterion |
|---|---|---|
| AC-1 | 200% text on every P0 screen at 320 px width | No horizontal scroll, no clipped Thai marks, no overlapped controls |
| AC-2 | Thai test strings (T-16) at 14/16/18 px and 200% | Marks fully visible; no cut cluster |
| AC-3 | High contrast mode | Text >= 7:1, borders present, no translucent surfaces |
| AC-4 | Reduced motion (OS and app) | No animation except <= 100 ms cross-fade; 3D defaults LITE |
| AC-5 | TalkBack Thai pass on Home, My Day, Command Center, quest submit | Names, order, live regions as section 6; no keyboard/focus trap |
| AC-6 | Colour independence: view screens in greyscale | Every state distinguishable by icon + words |
| AC-7 | Simple Mode: <= 5 modules, targets >= 56 px, one primary action | Verified per role in 8.3 |
| AC-8 | Unknown, permission-denied, offline, stale, empty, AI draft states exist on each P0 module | Checklist per STATE_PATTERNS §2 |
| AC-9 | Map list alternative | Every building reachable without the canvas |
| AC-10 | Field test with older users (HYPOTHESIS: >= 5 per role group: monk, housekeeper, kitchen, driver, volunteer) | Task completion without help on N-01, N-04, N-05, N-06, N-09 |

## 13. Open questions

| ID | Question |
|---|---|
| ACC-Q1 | Which Thai typeface satisfies T-3 and licensing (Agent 04, Wave 2)? |
| ACC-Q2 | Is "อ่านเวลาแบบไทย" welcome or confusing for monks/staff (field test)? |
| ACC-Q3 | Thai TTS quality on target phones (read-aloud HYPOTHESIS). |
| ACC-Q4 | Should Simple Mode be enforceable by a temple admin for specific roles (e.g. all housekeepers)? Default: suggested, not enforced. |
| ACC-Q5 | May samanera in Simple Mode see numbers (แต้มกิจวัตร) at all? Default: off; teacher/guardian setting. Decide with monk advisor (B3). |

## 14. Evidence status (honesty note)

| Claim family | Status |
|---|---|
| WCAG 2.2 AA thresholds (4.5:1, 3:1, 7:1 for the stricter "high contrast" target, 1.4.4 resize to 200%, 1.4.10 reflow at 320 px) | Cited from general knowledge of the W3C standard (https://www.w3.org/TR/WCAG22/); the page was **not opened** in this session -> **HYPOTHESIS** until a human verifies the exact criterion numbers. The 7:1 figure is the AAA text-contrast level, adopted here as the high-contrast target. |
| Thai typography rules T-1 to T-16 (mark clipping, no justification, dictionary line breaking, minimum sizes) | General typographic knowledge, no source consulted -> **HYPOTHESIS**; Agent 04 and a Thai native reviewer must validate with real devices (AC-2). |
| Persona needs (older users, shared devices, wet hands) | From `07_PERSONAS.md`, itself **HYPOTHESIS** (no interviews). |
| 56 px targets, voice-prominent Simple Mode, line-height >= 1.6 | From master `UX_INFORMATION_ARCHITECTURE.md` §4 (decision, not an empirical claim). |
| Quiet hours 21:00-05:00, 10 s undo, 2-minute check-in undo, 60 s stale threshold | Design defaults -> **HYPOTHESIS**; the 2-minute undo is from `STAFF_PRESENCE_SPEC.md` §6, the 60 s from `AVAILABILITY_SPEC.md` §10. |
