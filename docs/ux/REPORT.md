# REPORT — Agent 03 UX Architecture (Wave 1b)

Date: 2026-10-07 · Pack revision W1-r3 · Documentation only. Wrote only under `docs/ux/`. No git command run. No code,
SQL, package or config written. Core domain (Agent 02) was re-read at the end; see section 4.4.

## 1. Summary

Seven UX architecture files define the app shell and navigation (mode tabs, temple switcher, management area, deep links,
no-membership discovery), a permission-keyed home module registry (75 modules; composition for all 28 roles; every
permission code verified against `role_permissions.yaml` by script), 14 north-star flows, 4 Command Center question flows, 3 access flows and 12 journeys (onboarding with PDPA and
guardian consent, all 10 master north-star questions and the 4 proposed by Agent 17, invitation -> Smart Assignment -> human
confirm, quest claim -> evidence -> verify, volunteer sign-up -> check-in -> points, report problem -> work order, Temple
Contact, block/report, and more), state patterns with Thai copy, Command Center layouts and drill-downs, accessibility and
Simple Mode rules, and 21 low-fidelity wireframes (12 required plus 9). Each north-star flow ends on a wireframe with named
data fields. The work surfaced 11 permission/matrix gaps (G-UX-1..11) and 10 document conflicts (section 4); the two that
need an Opus decision first are the numeric ranking in Smart Assignment output (C-6) and future-instant availability (OQ-06).
Nothing is implemented; nothing is user-tested; all personas are HYPOTHESIS.

## 2. Files written (all under `/home/user/KINGBOON420/docs/ux/`)

| File | Content |
|---|---|
| `NAVIGATION.md` | shell, switcher, tab sets per mode, management area with exact permission gates, deep links and routes, discovery, notifications |
| `HOME_MODULE_REGISTRY.md` | registry rules, 6 module tables (id, TH/EN, permission, source, empty, Unknown, priority, Simple flag), gaps G-UX-1..11, composition per role |
| `FLOWS.md` | F-01..F-03, N-01..N-18, J-01..J-12, flow-to-wireframe-to-spec index |
| `STATE_PATTERNS.md` | loading, empty, error (+ domain error code -> Thai table), offline, permission-denied (7 variants), Unknown (+ reason table), stale, AI draft, conflict, accountability/undo, success, banners, Thai copy rules |
| `COMMAND_CENTER_UX.md` | phone/tablet/desktop layouts, six panels, role matrix of panels, drill-downs, Unknown and conflict treatment, privacy decisions |
| `ACCESSIBILITY_SIMPLE_MODE.md` | settings, large text, contrast, reduced motion, screen reader, Thai typography T-1..T-16, Simple Mode SM-1..SM-14, acceptance checklist, evidence status |
| `WIREFRAMES.md` | W01-W21 |
| `REPORT.md` | this file |

## 3. Evidence

### 3.1 Sources
No external source was fetched or searched. The work is synthesis of the repository docs: all of `docs/master/` (including
`role_permissions.yaml`, `UX_INFORMATION_ARCHITECTURE.md`, `ROLE_PERMISSION_MATRIX.md`, `GAP_ANALYSIS.md`), `docs/research/`
(01-08 and `REPORT.md`), `docs/domain/GLOSSARY.md`, `docs/domain/core/` (all 7 specs and its `REPORT.md`),
`docs/domain/workforce/` (all files incl. `MODULE_REGISTRY_INPUT.md`), `docs/domain/facility/` and `docs/domain/events/`
(all specs and reports). Real-world claims (WCAG thresholds, Thai typography, device assumptions, quiet hours) are labelled
HYPOTHESIS in the files (see `ACCESSIBILITY_SIMPLE_MODE.md` §14). All people, places and values in wireframes are invented
demo data.

### 3.2 Self-review checklist

| Check | Result |
|---|---|
| Wrote only under `docs/ux/` | Pass |
| No code, SQL, config; no git add/commit/push/branch | Pass |
| All 7 required files + REPORT | Pass |
| Home modules cite exact permission codes | Pass: scripted check of every backticked code in `docs/ux/*.md` against `role_permissions.yaml` (no unknown code); scripted check that every module in each role's composition is backed by a grant that role holds (one reported mismatch was my own "community_member has no report button" line) |
| Registry has id, TH/EN title, permission, data source, empty/unknown state, priority per role | Pass (priority = Default rank column + section 8 compositions) |
| Merges Agent 17/18/19 inputs | Pass: 25 `wf.*` modules kept with ids; facility and event modules derived (no module file existed for 18/19) |
| FLOWS covers onboarding + PDPA + guardian + temple pick; 10 north-star; invitation -> SMA -> confirm; quest claim -> evidence -> verify; volunteer sign-up -> check-in -> points; report problem -> work order; Temple Contact; block/report | Pass |
| Each north-star question has a flow ending on a screen with named data fields | Pass (N-01..N-10 plus N-11..N-18) |
| STATE_PATTERNS covers loading, empty, error, offline, permission-denied, Unknown, stale, AI draft with Thai copy | Pass |
| COMMAND_CENTER_UX: phone/tablet/desktop, panels, drill-downs, Unknown and conflicts | Pass |
| ACCESSIBILITY: large text, contrast, reduced motion, Simple Mode, screen reader, Thai typography | Pass |
| >= 12 wireframes incl. the 12 named | Pass (21) |
| Never "แต้มบุญ" for monastic score; "แต้มกิจวัตร" used | Pass (grep: "แต้มบุญ" appears only as a prohibition or in conflict notes and as the lay label "แต้มบุญชุมชน") |
| No ranking of monastics; no casino/loot-box patterns | Pass; availability board never sorts or shows พรรษา; SMA numeric scores hidden (C-6); prohibited pattern list in STATE_PATTERNS §13 |
| Unknown shown as "ไม่ทราบ", never 0 | Pass (SP-06; per-module Unknown column) |
| Every consequential action shows the accountable human | Pass (SP-10 table; W20, W06, W05) |
| Show only permitted modules; permission-denied states designed | Pass (R-1, SP-05) |
| Privacy controls per profile field | Pass (W14 PUBLIC/CONNECTIONS/PRIVATE, default PRIVATE for sensitive optional fields) |
| Two ledgers never shown together | Pass (monastic modules never show boon points; lay modules never show activity score; R-10) |
| AI drafts only | Pass (SP-08, J-10; AI never confirms/verifies/approves/assigns/awards) |
| Not verified | Machine check of cross-document consistency beyond the permission-code scripts; no usability testing; Thai copy not reviewed by a native speaker |

## 4. Conflicts between documents (STOP CONDITION: follow `docs/master/**`, list here)

Status after the final reconcile against the fix round (core specs 09:17, YAML v0.3, STAFF_PRESENCE six states, EVENT §7).

| ID | Conflict | Status | UX decision / recommended resolution |
|---|---|---|---|
| C-1 | GLOSSARY said "แต้มบุญ (UI)" and monastic streak with grace | **RESOLVED** (glossary and SCORING now แต้มกิจวัตร; practice days, no loss mechanics) | UX follows: "ปฏิบัติแล้ว N วันในเดือนนี้", run shown only when >= 2, nothing on a missed day |
| C-2 | Five vs six staff presence states | **RESOLVED** (STAFF_PRESENCE and master: six incl. OFF_SHIFT) | Staff tiles: WORKING, FREE, ON_LEAVE, OFF_SITE_DUTY, OFF_SHIFT, UNKNOWN |
| C-3 | Master §4.3 counters vs core two partitions | **RESOLVED** in master/core | Two partitions used |
| C-4 | Schedule kinds missing meal/leave/meeting | **RESOLVED** (ten kinds in core) | UI supports all; resolver maps meeting->TEACHING tier, leave->PERSONAL tier, ignores meal |
| C-5 | Master streak vs research | **RESOLVED** (F-03) | none |
| C-6 | SMA `ranked[]` with numeric `score`/`rank` vs "no ranking of monastics" | **OPEN** (core still outputs rank/score; fix round added the separate `needs_confirmation` list, which the UX shows as its own group) | UX shows suggested list in words; rank, score, breakdown only in a collapsed audit section; Opus ratify, Agent 02 rename to `suggested_order` |
| C-7 | Priority vocabulary LOW/NORMAL/HIGH/URGENT vs `critical` | OPEN (minor) | UI labels ต่ำ/ปกติ/สูง/เร่งด่วน |
| C-8 | Skeleton flat 5-6 tabs vs phone 4 + เพิ่มเติม | **OPEN** (master UX IA untouched) | Proposed change 1 stands |
| C-9 | Agent 17 interim permissions vs YAML | **RESOLVED** by v0.3 (presence.view C for staff, security.log.view, headcount, document codes exist) | UX uses YAML |
| C-10 | `visiting_monastic` role missing | **RESOLVED** (role exists in YAML v0.3: own schedule and quests only) | Composition added |
| C-11 (new) | Monastic status now **per membership** (F-04): mode can differ per temple; "present attestation from another temple" is optional | Resolved in core; UX updated | NAVIGATION §1, §3, §7; FLOWS F-01 step 7 |
| C-12 (new) | Travel Unknown rule: no constants, SMA still runs, `RETURN_BUFFER_UNKNOWN` ack, no travel entries | Resolved in core; UX updated | W04, J-01, STATE_PATTERNS |
| C-13 (new) | EVENT §7 readiness audience: all `@monastic`/`@staff` see full detail; volunteer, lay_resident, community_member see only state chip + percent for events they participate in | Resolved in events spec | W07/W12 notes aligned; the earlier "public only" wording for staff such as kitchen_staff, driver was too narrow |

Permission gaps from the UX pass: G-UX-1 (map access has no code) **OPEN**; G-UX-2 (own score view) **RESOLVED** as a self action (SCORING §11, YAML baseline); G-UX-3, G-UX-5, G-UX-7, G-UX-9 **RESOLVED**; G-UX-4, G-UX-6, G-UX-8, G-UX-10, G-UX-11 remain as listed in `HOME_MODULE_REGISTRY.md` §7.

## 5. Open questions

| ID | Question | Owner |
|---|---|---|
| NAV-Q1 | Show a SUSPENDED temple's name in the switcher? | Opus |
| NAV-Q2 | Accept 4 tabs + "เพิ่มเติม" on phone instead of the flat 5-6 tabs? | Opus |
| NAV-Q3 | Abbot landing = Command Center vs approvals? | Opus |
| NAV-Q4 | Quiet-hours default (21:00-05:00) vs kitchen starting early | field |
| CC-Q1 | "ต้องตัดสินใจวันนี้" sub-count for the approvals strip | Opus |
| CC-Q2 | Is the future-instant question ("ถามช่วงเวลา") P0? Depends on resolver future evaluation (OQ-06 from Agent 17) | Opus, Agent 02 |
| CC-Q3 | closed: coarse tier per AVAILABILITY §9 | closed |
| ACC-Q1..Q5 | Thai typeface; spoken-time option; Thai TTS; Simple Mode enforceable by admin?; samanera and score numbers | Agent 04, monk advisor |
| UX-Q1 | Do monks want to see any number (แต้มกิจวัตร)? Default off pending B3 | monk advisor |
| UX-Q2 | Lay point label: แต้มร่วมกิจกรรม vs แต้มบุญชุมชน | field test (Agent 01 doc 05) |
| UX-Q3 | Is the word "ภารกิจ" acceptable beside religious duties; "งานใหญ่" for events | monk advisor |
| UX-Q4 | Etiquette note for volunteers has no field in the domain; proposed as a description convention | Agent 19 / 12 |
| UX-Q5 | Waitlist for full volunteer shifts (default off) | Agent 12 |
| UX-Q6 | Who is the "adult sponsor" and can the abbot-level hold guardian consent paper records? | Agent 13, lawyer |
| UX-Q7 | Proxy use by secretary for the abbot's devices (no "act as" feature by design) acceptable? | field |

## 6. Proposed changes to master docs (exact file, section, replacement text)

1. **`docs/master/UX_INFORMATION_ARCHITECTURE.md` §2 "Global structure"** — replace the two mode tab lists with:
   "MONASTIC MODE tabs: [วัด — management, only with a management permission] · วันนี้ · ภารกิจ · ตาราง · แผนที่วัด · ฉัน.
   COMMUNITY & STAFF MODE tabs: [วัด — management, only with a management permission] · หน้าหลัก · ภารกิจ · กิจกรรม · แผนที่วัด · ชุมชน ·
   ฉัน. Phone bottom bar shows at most five slots: the first four applicable tabs plus เพิ่มเติม; ฉัน is always also reachable from the avatar. ชุมชน is hidden for minors, monastics and temples with community disabled. Management tab sections are gated by exact permission codes (docs/ux/NAVIGATION.md §5.1)."
2. **Same file §5 North-star table** — append rows (proposed wording, HYPOTHESIS until validated): `คนสวน | วันนี้ต้องดูแลโซนไหน รดน้ำที่ไหน? | Garden home: zones`; `รปภ. | เวรนี้ประจำจุดไหน เดินตรวจรอบไหน? | Security home: shift and rounds`; `ธุรการ | วันนี้มีกิจนิมนต์/นัดหมายอะไรเข้ามา? | Office home: intake`; `เจ้าหน้าที่/เด็กวัด | ตอนนี้ต้องทำอะไร? | My quests today`; `สัปเหร่อ | พิธีที่ได้รับมอบหมายคืออะไร? | Undertaker home`.
3. **Same file §3 Screen inventory** — add: Consent withdrawal and per-field privacy (W14), Temple switcher (W15), Approvals queue (W20), Report problem and work order (W16), Temple Contact compose and inbox (W18), Undertaker home (W21), Simple Mode settings.
4. **Same file §4 rule 5** — replace with: "Gamification tone: calm progress (rings, lotus-bloom motif), no loot boxes, no casino sounds, no countdowns or scarcity copy, no public ranking of monastics. Monastic progress is shown as practice days (ปฏิบัติแล้ว N วันในเดือนนี้) with no loss states; แต้มกิจวัตร numbers are private to the monk and off by default."
5. **`docs/master/ROLE_PERMISSION_MATRIX.md` §5** — add rows: `department_lead (non-kitchen)`: Verify queue → Department board → Team today → Volunteers still needed; `security_guard`: Shift and handover → Patrol rounds → Gate log → Incident report; `traffic_staff`: Event traffic quests → My quests; `temple_admin`: Member admin → Moderation queue → My quests; `waiyawatchakon` (PROPOSED): Finance (post-pilot) → Reports → Stock alerts → Assets due for PM; `lay_resident` (HYPOTHESIS): Today at this temple → Volunteer quests → My quests; `samanera`: add "no management, no chat".
6. **Same file §3 (catalog)** — add `map.view` ("Open the temple map; sections inside are gated by their own codes"; grant `@all` T, `community_member` P) **or** state "any ACTIVE membership" explicitly; add `score.view_self` or declare self-reads implicit (G-UX-1, G-UX-2).
7. **`docs/master/FEATURE_MATRIX.md`** — Evidence column: F-10 `docs/ux/WIREFRAMES.md` W02; F-15 `docs/ux/COMMAND_CENTER_UX.md`, W01; F-09 W03; F-14 W04; F-07/F-08 W05/W06; F-16 W07; F-18 W08; F-29 W13; F-44 `docs/ux/ACCESSIBILITY_SIMPLE_MODE.md` (Simple Mode rules only). Status stays PLANNED until Opus accepts (proposed DESIGNED for F-10, F-15, F-44 structure part).
8. **`docs/master/RISK_REGISTER.md`** — add: "R-19 Availability resolver cannot be evaluated for a future instant: Command Center future question and kitchen headcount show only Unknown (L3, I3; mitigation: OQ-06 in Agent 02 spec, UX shows 'ไม่ทราบ N' explicitly)"; "R-20 Simple Mode and Thai typography rules unvalidated with older users and real devices (L3, I3; mitigation: AC-1..AC-10, field test)".
9. **`docs/master/TEMPLE_DOMAIN_MODEL.md` §6.1** — add sentence: "Assignment proposals are shown to humans as a suggested list with reasons; numeric scores and ranks are audit-only and are not displayed on the main screen" (C-6).
10. **To Agent 02 via Opus (not master):** `GLOSSARY.md` §3 rows `monastic_activity_score` -> "แต้มกิจวัตร (UI)" and `streak` -> practice days (C-1); `SCHEDULE_INVITATION_SPEC.md` §5.6 rename `ranked` -> `suggested_order` with audit-only score (C-6).

## 7. Blockers

- No hard blocker for Wave 1b.
- **B1** (R-03) no pilot temple: every flow and wireframe is unvalidated; Thai copy, tab model and Simple Mode need field tests (research doc 08).
- **B2** monk advisor needed for: showing any number for แต้มกิจวัตร, "ภารกิจ"/"งานใหญ่" wording, tone of monastic screens.
- **B3** lawyer review of the consent copy and minor/guardian flow before pilot (D-5); the W14 text is a draft.
- **B4** resolver future-instant evaluation (OQ-06) and routing provider ADR affect N-02, N-05, N-06 (shown as Unknown until available).
- Decisions needed from Opus before Wave 2 hand-off to Agent 04: C-6, C-8, G-UX-1 (G-UX-2 is now resolved).

## 8. Self-assessed readiness

| Artifact | Readiness | Why not higher |
|---|---|---|
| NAVIGATION.md | DESIGNED | not user-tested; tab model deviates from skeleton (C-8) |
| HOME_MODULE_REGISTRY.md | DESIGNED | facility/event modules derived without a module file from Agents 18/19; G-UX-1 open; codes re-verified against YAML v0.3 (59 codes) |
| FLOWS.md | DESIGNED | no validation with real temple staff; AI flow is Wave 7 |
| STATE_PATTERNS.md | DESIGNED | Thai copy unreviewed |
| COMMAND_CENTER_UX.md | DESIGNED | future-instant control depends on OQ-06 |
| ACCESSIBILITY_SIMPLE_MODE.md | DESIGNED | WCAG and typography claims are HYPOTHESIS (not opened) |
| WIREFRAMES.md | DESIGNED | low-fi, ASCII alignment approximate with Thai marks |
