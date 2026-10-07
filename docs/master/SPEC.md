# BOON SYSTEM — ระบบบุญ · MASTER SPECIFICATION (source text)

Committed by the Lead Orchestrator at the Wave 1 gate (2026-10-07) so that coverage can be traced section by
section (governance audit F-05). The text is the owner's specification as given in the session prompt; list
formatting is condensed, wording and section numbers are preserved. **This file is the requirement baseline; the
other `docs/master/*` files interpret it.** Changes to this file require the owner's instruction.

---

## Part A — Orchestration requirements (SUPER MASTER PROMPT)

**Role.** Lead AI Orchestrator acting as Principal Product Director, Principal Software Architect, Staff Engineer,
UX Director, Design Director, 3D Technical Director, Database Architect, Security Lead, QA Lead, DevOps Lead and
Multi-Agent Orchestrator. Main model for thinking, analysis, planning, review and decisions: Opus 5.5. Clearly
scoped delegable work: Sonnet 5.5 agents. If those model names are unavailable, use the highest available
Opus/Sonnet without changing the division of work.

**IMPORTANT.** อย่าเริ่ม Coding ทันที · อย่าคาดเดาว่า Repository เป็นอย่างไร · อย่าคิด Feature ใหม่โดยไม่อ่าน
Specification · อย่าสร้าง UI ก่อนเข้าใจ Domain · อย่าใช้ Fake Implementation แล้วเรียกว่า Complete · อย่าประกาศว่า
Production Ready โดยไม่มี Evidence

**FIRST MISSION.** Read the whole specification and every accessible repository artifact (README, docs, packages,
database, migrations, auth, frontend, backend, tests, deployment configuration, 3D assets, Figma/design assets, git
status/branch/recent commits, environment without revealing secrets). Then map what the specification requires
versus what exists.

**DO NOT CODE YET.** Produce at least: `docs/master/EXECUTIVE_PRODUCT_PLAN.md`, `CURRENT_STATE_AUDIT.md`,
`GAP_ANALYSIS.md`, `TEMPLE_DOMAIN_MODEL.md`, `ROLE_PERMISSION_MATRIX.md`, `FEATURE_MATRIX.md`,
`UX_INFORMATION_ARCHITECTURE.md`, `DATABASE_PLAN.md`, `SECURITY_MODEL.md`, `3D_STRATEGY.md`, `RESEARCH_PLAN.md`,
`AGENT_PLAN.md`, `RISK_REGISTER.md`, and `FILE_OWNERSHIP.md`. Upgrade existing equivalents instead of duplicating.

**SECOND MISSION.** The orchestrator writes every sub-agent prompt itself, from the real specification, current
repository, current gap, dependencies, files, existing architecture and Definition of Done — never generic prompts.

**AGENT PROMPT TEMPLATE.** IDENTITY · MISSION · PRODUCT CONTEXT · CURRENT STATE · REQUIRED RESULT · FILE OWNERSHIP ·
FORBIDDEN FILES · DEPENDENCIES · IMPLEMENTATION REQUIREMENTS · UX REQUIREMENTS · SECURITY REQUIREMENTS · TEST
REQUIREMENTS · EVIDENCE · DEFINITION OF DONE · STOP CONDITIONS.

**AGENT ORGANIZATION** (Sonnet 5.5 each): 01 Product Research · 02 Temple Domain · 03 UX Architecture · 04 Visual
Design / Figma · 05 3D Technical Art · 06 Frontend · 07 Backend · 08 Database + RLS · 09 Realtime / Chat / Call ·
10 AI Temple Secretary · 11 Quest / Gamification / Reward · 12 Community · 13 Security / Privacy · 14 QA ·
15 Performance · 16 DevOps · 17 Temple Workforce · 18 Facility / Asset · 19 Ceremony / Event Operations ·
20 Governance Auditor. Do not create all agents at once without reason; create them in waves by dependency.

**ORCHESTRATION RULE.** Research → Architecture → UX → Design → Foundation → Core → Integration → QA → Security →
Performance → Readiness — not everything in parallel from day one.

**PRODUCT MODEL.** Only two main experiences.
1. MONASTIC MODE — พระ, สามเณร, เจ้าอาวาส, ผู้ช่วยเจ้าอาวาส, พระเลขานุการ. Core: My Day, Daily Quest, Schedule,
   Calendar, Temple Map, Notifications, Activity Score, Streak, Achievement, Voice Assistant, Monk Availability,
   Invitation.
2. COMMUNITY & TEMPLE STAFF MODE — everyone who is not a monk/novice: ญาติโยม, Volunteer, เด็กวัด, แม่บ้าน, ครัว,
   สวน, ช่าง, คนขับ, มัคนายก, สัปเหร่อ, ไวยาวัจกร, สำนักงาน, บัญชี, Security, Staff. Uses a role-aware home.

**NEVER CREATE ONE APP PER JOB.** Core Application + Role + Permission + Department + Temple decide what a user sees.

**TEMPLE COMMAND CENTER** (P0) shows at least: all monks, monks in temple, free, out on invitation, teaching, in
ceremony, travelling; novices; staff; volunteers; quests; events; invitations; facility problems; vehicles;
community. Unknown data is shown as Unknown — never fake numbers.

**MONK AVAILABILITY** state model: AVAILABLE, IN_TEMPLE, ON_INVITATION, TEACHING, CEREMONY, TRAVELING, PERSONAL,
REST, UNAVAILABLE, UNKNOWN — define which are manual, derived, calendar-driven, and their priority.

**QUEST ENGINE** is the central domain: Monk, Novice, Cleaning, Kitchen, Maintenance, Volunteer Quests; Event,
Ceremony, Vehicle Tasks. Quests have verification and an audit trail.

**BOON POINT.** Never merge the monastic and community ledgers: `monastic_activity_score` and
`community_boon_points`. MONASTIC: no exchange for goods, no purchase, no money, not a measure of real merit.
COMMUNITY: rewards allowed, but only from participation; never called buying or exchanging merit.

**3D TEMPLE** is the signature experience but not a core dependency. Start with a Wat Arun vertical slice: Temple
Scene, Building Interaction, Quest/Event/Maintenance markers, Camera Fly-To, Data Integration, LOD, Fallback,
Reduced Motion, Mobile Performance. Do not use models without rights; every asset needs Source / License /
Ownership; without a real model use a stylized model or 2D fallback.

**DESIGN QUALITY.** Not Generic SaaS, Bootstrap Admin, Table Everywhere, Purple Gradient AI App or Student CRUD.
Target: Premium, Modern Thai, Elegant, Cinematic, Minimal, 3D-aware, Gamified, Accessible.

**FIGMA.** Design agent produces at least three directions — 1 Sacred Minimal, 2 Thai Neo-Future, 3 Living Temple —
Opus reviews and selects or hybridises. Developers never pick the visual direction without design approval.

**COMMUNITY.** Profile, Skill, Interest, Volunteer, Connection, Chat, Group, Voice, Video, Reward — with Privacy,
Block, Mute, Report, Call Permission. **MONK CONTACT:** no random DM to monks by default; use Temple Contact routed
by the temple. **PRIVACY:** fields such as body information, income, height, weight are optional with PUBLIC /
CONNECTIONS / PRIVATE; disclosure is never forced.

**SECURITY.** Cross-temple data leakage = P0. Every important domain checks Authentication, Authorization, Tenant,
RLS, Audit, Rate Limit, Validation, Privacy, Abuse.

**AI POLICY.** AI is a copilot, not an authority. Allowed: Draft, Summarize, Search, Schedule Suggestion, Conflict
Detection, Checklist, Voice Parsing, Daily Summary. Forbidden: promotions, measuring merit, final Vinaya rulings,
approving important work on its own.

**DATABASE.** Inspect any existing schema first. Otherwise propose a schema covering at least: users, profiles,
temples, temple_members, roles, permissions, departments, availability, quests, quest_assignments, quest_evidence,
events, event_tasks, invitations, schedules, buildings, assets, maintenance, inventory, vehicles, trips,
community_profiles, volunteer, connections, conversations, messages, calls, activity_score,
boon_point_transactions, reward_catalog, reward_redemptions, notifications, audit_logs, moderation. Never duplicate
existing tables.

**BUILD PRIORITY** (protect if resources are limited): 1 Temple Command Center · 2 Temple 3D / Interactive Map ·
3 Quest · 4 Monk Availability · 5 Smart Schedule / Invitation · 6 Event / Boss Quest · 7 Role / Permission ·
8 Community Quest · 9 Boon Point / Reward · 10 AI Temple Secretary.

**EXECUTION WAVES.** W1 Audit, Research, Domain, Roles, UX · W2 Design System, Figma, 3D Feasibility, Database
Architecture, Security Architecture · W3 Auth, Tenant, RLS, People, Permission, Quest Foundation · W4 Monastic Mode,
Availability, Schedule, Invitation · W5 Temple Command Center, Events, Facility, 3D Integration · W6 Community,
Volunteer, Reward, Communication · W7 AI, Analytics, Optimization · W8 QA, Security Audit, Performance,
Accessibility, Pilot Readiness.

**CODE QUALITY.** Before any merge: Typecheck, Lint, Unit Test, Integration Test (if relevant), E2E (if relevant),
Review Diff, Review Permission, Review Error State. **NO BLIND MERGE:** Agent Work → Agent Self Review → Evidence →
Peer Review → Opus Review → QA → Merge.

**READINESS STATUS.** PLANNED, RESEARCHED, DESIGNED, IMPLEMENTED, TESTED, VERIFIED, PILOT_READY, BLOCKED.
**DO NOT CLAIM COMPLETE:** IMPLEMENTED ≠ VERIFIED · UI exists ≠ Feature works · API exists ≠ Integration works · Test
exists ≠ Test passed · 3D exists ≠ Performance acceptable · Chat UI exists ≠ realtime works · Call button exists ≠
call works. **VERIFIED** needs evidence: test output, screenshot, API result, database evidence, RLS test, E2E,
performance result or other suitable proof.

**THIRD MISSION.** Write `AGENT_PROMPT_PACK.md` with ready-to-send prompts for every Wave 1 agent, review it as
Opus (fix ambiguity, check file collisions and dependencies), then launch.

**CONTINUOUS LOOP** after every wave: 1 collect reports · 2 inspect diffs · 3 run tests · 4 compare with spec ·
5 update Gap Analysis · 6 update Risk Register · 7 update Readiness · 8 decide next wave · 9 rewrite next prompts ·
10 continue. Prompts must change with the real state of the system.

**FINAL STANDARD.** Before declaring pilot readiness the real system must answer: วันนี้ทั้งวัดเป็นอย่างไร? ·
พระกี่รูปว่าง? · พระกี่รูปออกกิจ? · ใครต้องทำอะไร? · Event ไหนยังไม่พร้อม? · อาคารไหนมีปัญหา? · รถคันไหนว่าง? ·
อาสายังขาดกี่คน? · ญาติโยมมี Quest อะไร? · คะแนนถูกต้องหรือไม่? · ใครมีสิทธิ์ดูข้อมูลนี้? · ข้อมูลของวัด A
รั่วไปวัด B หรือไม่? If any cannot be answered, do not declare Pilot Ready.

**BEGIN NOW.** Inspect repository → read documentation → current-state map → compare with spec → Audit + Gap
Analysis → Master Execution Plan → Role Permission Matrix → Agent Plan → Agent Prompt Pack → report findings and
proposed waves; then start Wave 1 by dependency and keep working through each gate. If something cannot be done,
mark it BLOCKED with evidence and a concrete remedy.

---

## Part B — Master Product, Design, Engineering & Multi-Agent Execution Plan

**§0 Product vision.** Not a generic dharma app, not a game, not a donation app. A Temple Operating System +
Monastic Life System + Temple Workforce + Community Network that makes daily life, temple work, personnel,
buildings, invitations, activities, volunteers and community as easy to understand as a premium game's quest system
— while everything is real data and real work.

**§1 Product structure.** Two sides. A. MONASTIC MODE for พระภิกษุ, สามเณร, เจ้าอาวาส, รองเจ้าอาวาส, ผู้ช่วยเจ้าอาวาส,
พระเลขานุการ — shared UX, capabilities unlocked by role and permission. B. COMMUNITY & TEMPLE STAFF MODE for everyone
else: ญาติโยม, อาสาสมัคร, เด็กวัด, ไวยาวัจกร, มัคนายก, สัปเหร่อ, แม่บ้าน, คนครัว, คนสวน, ช่าง, คนขับรถ, รปภ.,
เจ้าหน้าที่จราจร, เจ้าหน้าที่สำนักงาน, บัญชี, เจ้าหน้าที่วัด, บุคคลทั่วไป — one experience whose Home, Menu, Dashboard and
Permission change by role.

**§2 Core principle.** Do not build 20 apps for 20 jobs; build a role-aware experience. Examples: แม่บ้าน → Cleaning
Tasks; คนครัว → Food Operations; คนขับรถ → Trip; ช่าง → Maintenance; ญาติโยม → Community / Events / Volunteer Quest;
พระ → My Day / Quest / Schedule; เจ้าอาวาส → Temple Command Center.

**§3 Temple selection.** After login the system knows which temples the user belongs to; the user may choose; each
temple is a separate tenant (e.g. Wat Arun, Wat Pho, Wat Saket, Wat Benchamabophit, Wat Traimit or future temples).
One temple's data must not leak to another.

**§4 3D temple experience.** 3D-capable temples get a Digital Temple Scene. Hero temple: WAT ARUN — 3D temple, camera
orbit, sunrise lighting, river ambience, subtle particles, building markers, Quest/Event/Maintenance markers,
interactive buildings, Camera Fly-To. 3D must connect to real data (e.g. tap Sala 1 → Event, Quest, people count,
Maintenance, Asset, Readiness).

**§5 Performance mode.** ULTRA (full 3D, post-processing, dynamic lighting) · BALANCED (optimised 3D, reduced effects)
· LITE (2.5D / static interactive map). The core system works even if 3D fails to load.

**§6 Temple Command Center** — the hero feature, answering "how is the whole temple right now?" within seconds.
MONASTIC: all monks, in temple, free, on invitation, teaching, in ceremony, travelling, not ready, all novices.
TEMPLE STAFF: all staff, working, free, on leave, on duty off-site. QUEST: all, Completed, Active, Overdue,
Unassigned, Blocked. EVENTS: today, starting soon, readiness, people count, volunteers still missing. FACILITY:
buildings, maintenance issues, assets, vehicles, parking, kitchen, inventory. COMMUNITY: participants, volunteers,
community quests, boon points, reward redemptions.

**§7 Monk availability.** AVAILABLE, IN_TEMPLE, ON_INVITATION, TEACHING, CEREMONY, TRAVELING, PERSONAL, REST,
UNAVAILABLE, UNKNOWN. Monks can change some states themselves; some come from the calendar automatically.

**§8 Monastic Mode core features.** My Day, Daily Quest, Calendar, Temple Schedule, My Assignment, Temple Map,
Notifications, Activity Score, Streak, Achievement, Voice Assistant, Check-in, Quest Completion.

**§9 Monk-specific.** กิจนิมนต์, พิธี, งานสอน, งานเผยแผ่, Availability, Assigned Ceremony, Invitation Calendar.

**§10 Novice features.** Learning Quest, Class Schedule, Study, Attendance, Exam, Learning Progress — and no
unrelated management rights.

**§11 Monastic activity score.** The UI may call it แต้มบุญ, but the system name is `monastic_activity_score`; it does
not mean real religious merit. Forbidden: buying points, exchanging for money, exchanging for goods, pay-to-win,
use for ecclesiastical promotion, ranking the worth of monks. Used only for activity progress, quest progress,
streak and achievement. *(Wave 1 note: research recommends not using the label แต้มบุญ for monastics — see
`TEMPLE_DOMAIN_MODEL.md` §1; the owner/monk advisor decides.)*

**§12 Temple management.** Abbot / assistant / secretary monk use Monastic Mode but unlock Temple Command Center,
People Management, Assignment, Smart Monk Assignment, Event Management, Invitation, Approvals, Reports, Permission,
Temple Configuration.

**§13 Smart Monk Assignment.** Example: a request for 5 monks, Saturday 10:00, Rangsit. The system checks
availability, existing schedule, travel time, ceremony, teaching, vehicle, return time; proposes a team; a human
confirms. AI must never assign monks without human approval.

**§14 Community & Temple Staff Mode core.** Profile, Temple, Quest, Events, Temple Map, Notifications, Chat,
Community, Achievement, Activity History — modules shown by role.

**§15 Temple operations roles.** CLEANING (แม่บ้าน): Cleaning Quest, Zone, Checklist, Supplies, Before/After,
Maintenance Report, Shift, Handover. KITCHEN: Meal Schedule, Headcount, Menu, Ingredients, Stock, Shopping List,
Kitchen Quest. GARDEN: Zone, Watering, Maintenance, Equipment, Schedule. TEMPLE BOY / GENERAL STAFF: My Tasks, Quest,
Check-in, Location, Instructions, Complete, Report Problem.

**§16 Facility & asset** (ไวยาวัจกร, ช่าง, asset custodians, drivers, facility staff): Asset, Inventory, Maintenance,
Work Order, Building, Vehicle, Repair History, Preventive Maintenance, QR Asset, Temple 3D Maintenance Layer.

**§17 Driver home.** Today's Trips, Departure, Destination, Passenger / Monk list, Vehicle, Route, Trip Status,
Vehicle Issue, Maintenance.

**§18 Ceremony team** (มัคนายก, ceremony team, สัปเหร่อ, related staff): Ceremony Schedule, Timeline, Checklist,
Venue, Equipment, Monk Count, Guest, Readiness, Quest. สัปเหร่อ sees only information needed for their own work.

**§19 Office** (ธุรการ, สำนักงาน, บัญชี, document staff): Document, Archive, Meeting, Calendar, Contact, Booking,
Report, PDF Export, Task; Finance only for permitted roles.

**§20 Community user** (ญาติโยม / general public): Profile, Temple Discovery, Follow Temple, 3D Temple, Events,
Volunteer Quest, Community, Connection, Chat, Voice Call, Video Call, Groups, Achievement, Community Boon Points,
Rewards.

**§21 Community profile.** Photo, Display Name, Age, Occupation, Skills, Interest, Volunteer History, Achievement,
Boon Points. Optional: Height, Weight, Body information, Income range. Every field selectable PUBLIC / CONNECTIONS /
PRIVATE.

**§22 Community boon points.** Ledger strictly separate from monks. Earned from Volunteer, Temple Activity, Verified
Quest, Event Participation, Staff-verified contribution. Redeemable for books, dharma books, bags, notebooks,
bookmarks, activity shirts, souvenirs, digital badges, special activities. Called Participation Reward — never
buying or exchanging merit.

**§23 Anti-cheat.** Verification by QR, Organizer Approval, Photo Evidence, Location, Staff Verification,
Attendance. Detect duplicate, fake check-in, multi-account, impossible activity, point abuse.

**§24 Community communication.** Public ↔ Public: connection first, then Chat, Voice, Video, Group; with Block, Mute,
Report. Public ↔ Monk: no random DM by default; use Temple Contact and let the temple route it to the responsible
person.

**§25 Quest engine.** Title, Description, Temple, Department, Role, Assignee, Location, Building, Start, Due, Priority,
Points, Checklist, Evidence, Verification, Status, Dependencies.

**§26 Event = Boss Quest.** Large events (กฐิน, ผ้าป่า, important days, retreat courses, community events) with
Progress, Department, Team, Checklist, Readiness, Dependency.

**§27 Temple memory.** Last year's event, checklist, headcount, problems, owners, assets used, timeline; next year
duplicate the event and adjust.

**§28 AI Temple Secretary.** Allowed: Voice → Quest / Event / Invitation / Maintenance Draft, Meeting Summary,
Schedule Conflict, Checklist, Search Temple Knowledge, Daily Summary, Risk/Problem Summary. Forbidden: approving
important work, evaluating merit, promotions, final Vinaya interpretation.

**§29 Multi-tenant.** All important data has `temple_id`. One account works in many temples with different roles
(e.g. Brian: Temple A maintenance staff, Temple B volunteer, Temple C community member).

**§30 Permission model.** RBAC + scoped permission. Examples: quest.view, quest.create, quest.assign,
quest.complete, event.manage, member.view, member.manage, asset.view, asset.manage, finance.view,
finance.approve, vehicle.manage, temple.settings. Scope: self, team, department, temple.

**§31 Security** (non-negotiable): Authentication, Authorization, RLS, Tenant Isolation, Audit Log, Rate Limit,
Upload Validation, Privacy, Moderation, Secure Calling, Secure Chat. Cross-temple leakage = P0.

**§32 Design direction.** Not a generic admin dashboard: Premium, Cinematic, Modern Thai, Elegant, Minimal,
3D-aware, gamified but not childish.

**§33 Design system "BOON UI".** Thai first, English, Dark Mode, Light Mode if needed, Large Text, High Contrast,
Reduced Motion, Simple Mode.

**§34 Motion.** Micro-interactions, progress animation, quest complete, camera transition, building fly-to, card
transition. Forbidden: casino effects, loot boxes, loud reward sounds, excessive effects.

**§35 Tools.** Figma, Blender, Spline, Rive, Lottie, Three.js, React Three Fiber, Next.js, TypeScript, PostgreSQL,
Supabase, LiveKit or equivalent, PostHog, Sentry, Vercel — every important technology needs an ADR.

**§36 Multi-agent team.** Master: Opus 5.5 (Product Director, Architect, Design Director, Engineering Lead,
Reviewer, Orchestrator). Sub-agents: Sonnet 5.5, Agents 01–20 as listed in Part A.

**§37 Agent contract.** OWNER, ROLE, MISSION, INPUTS, DEPENDENCIES, FILES_ALLOWED, FILES_FORBIDDEN, EXPECTED OUTPUT,
TEST, EVIDENCE, BLOCKERS, STATUS. No agent edits files locked by another.

**§38 File ownership.** Create `FILE_OWNERSHIP.md` before parallel work; use worktree/branch/lock as appropriate;
never merge blindly.

**§39 Execution phases.** 0 Audit (no code changes) · 1 Research (users, domain, pain points, competitors, risks) ·
2 Product architecture (domain, features, roles, permissions, multi-tenant) · 3 UX architecture (user flow, IA,
wireframe, empty state, error state) · 4 Visual (3 directions, design system, Figma, prototype) · 5 3D vertical slice
(Wat Arun; pass the performance gate before other temples) · 6 Foundation (Auth, DB, RLS, Audit, Tenant,
Permission) · 7 Quest (quest, assignment, completion, verification, points) · 8 Monastic (My Day, availability,
schedule, invitation) · 9 Temple Command Center (people, quest, event, facility, community) · 10 Event (Boss Quest,
teams, readiness) · 11 Facility (asset, maintenance, vehicle, inventory) · 12 Community (profile, volunteer, points,
rewards) · 13 Communication (chat, group, voice, video, Temple Contact) · 14 AI (voice, assistant, summary,
drafting) · 15 Hardening (security, privacy, moderation, accessibility, performance) · 16 Pilot (real users, real
temple workflow, no fake readiness claims).

**§40 Status.** PLANNED, RESEARCHED, DESIGNED, IMPLEMENTED, TESTED, VERIFIED, PILOT_READY, BLOCKED — never DONE
without evidence.

**§41 Definition of verified.** Real frontend, real backend, real database, real permissions; mobile, Thai UI,
loading, error and empty states pass; tests pass; evidence exists. Fake data is never used to claim the system works.

**§42 Core features priority** (never cut): 1 Temple Command Center · 2 Interactive Temple Map / 3D · 3 Quest System ·
4 Monk Availability · 5 Smart Schedule & Invitation · 6 Event / Boss Quest · 7 People + Role/Permission ·
8 Community Quest · 9 Boon Point + Reward · 10 AI Temple Secretary.

**§43 North star.** พระ: "วันนี้ผมต้องทำอะไร?" · พระเลขานุการ: "ตอนนี้มีพระกี่รูปพร้อมออกกิจ?" · เจ้าอาวาส:
"วันนี้ทั้งวัดเป็นอย่างไร?" · แม่บ้าน: "พื้นที่ไหนต้องทำ?" · คนครัว: "ต้องเตรียมอาหารกี่คน?" · คนขับ:
"ต้องออกกี่โมง?" · มัคนายก: "พิธีพร้อมหรือยัง?" · ช่าง: "จุดไหนมีปัญหา?" · อาสา: "มีอะไรให้ผมช่วย?" ·
ญาติโยม: "วันนี้วัดมีกิจกรรมอะไร?" — if these cannot be answered, the system is not complete.
