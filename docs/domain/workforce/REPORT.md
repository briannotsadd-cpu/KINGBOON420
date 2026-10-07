# REPORT — Agent 17, Temple Workforce (Wave 1a)

Date: 2026-10-07 · Pack revision W1-r2 · Scope: lay workforce roles only (drivers, technicians, facility manager → Agent 18; ceremony roles, undertaker → Agent 19).

## 0. Wave 1 fix round (applies on top of everything below)

Aligned to `role_permissions.yaml` v0.3, `ROLE_PERMISSION_MATRIX.md` v0.2, `GOVERNANCE_AUDIT.md`.

| Item | Status | Where |
|---|---|---|
| Six presence states (`OFF_SHIFT` added; UNKNOWN only for missing signal); counters, sum invariant, cases WF-05/10/13/14 revised, WF-23..26 added | Done | `STAFF_PRESENCE_SPEC.md` §2, §4.2, §5, §9 |
| `kitchen_lead` replaced by `department_lead` (kitchen) | Done | KITCHEN, MODULE_REGISTRY_INPUT, STAFF_PRESENCE_SPEC, this report |
| YAML codes only (presence.*, shift.manage, headcount.*, inventory.record, quest.request, security.log(.view), security.incident.view, document.*, booking.manage); no proposed codes remain | Done | all permission tables |
| presence.view T/D/C, set_others incl. abbot/deputy/assistant, no Tm; legacy scopes removed (F-32); member.view D | Done | PRESENCE §7, KITCHEN §9, CLEANING §9, GENERAL §9 |
| Gate log read = `security.log.view`; incidents = `security.incident.view` (abbot, deputy, dept lead only) (F-18) | Done | SECURITY_TRAFFIC §4, §9 |
| Dot-case domain events, `temple_id` statement on staff tables (audit F-?, tenant rows) | Done | PRESENCE §3.1, §8 |
| `quest_type = security` used; `samanera` no longer holds `quest.request` (F-27) | Done | SECURITY_TRAFFIC §3, GENERAL §3 |
| `attendance` verification has no record owner (F-26): QT-TRF-02 -> `qr_checkin`, QT-GEN-03 -> `staff_verification` | Done (open for Opus/Agent 19) | SECURITY_TRAFFIC §3, GENERAL §4 |
| Monastic score label "แต้มกิจวัตร" | Not mentioned in my files; workforce quests stay `points = 0`, OQ-03 open | — |
| Skill vocabulary owner (`skill_code`, audit line on A17-1) | Not done: needs Opus to assign one owner; not invented here | — |
| Staff `presence` / handover tables missing in DATABASE_PLAN | Not mine (Agent 08) | — |

Sections 3.2 (mismatch table) and 5 (proposals) below are the Wave 1a record; most M-items are now closed by matrix v0.2/v0.3. Still open: zone read rule (M-10), M-13 resolved by the `waiyawatchakon` role.

## 1. Summary
Nine artifacts specify workflows, quest templates, data needs and role-aware homes for: housekeeper, kitchen lead/staff,
gardener, general staff, temple boy, security guard, traffic staff, office staff, accountant, temple admin. A shared
**staff presence** spec (6 states, shifts, check-in, handover, counters with a sum invariant, 26 cases) and a
**kitchen headcount** definition (range, never an invented single number, 10 cases) are the two load-bearing pieces.
The largest finding is that the permission matrix does not support most of what these homes need (18 mismatches, §3).
No web or field research was done: every real-world duty is a HYPOTHESIS and each file ends with field-research
questions. No code, SQL or config was written; nothing outside `docs/domain/workforce/` was touched; no git commands run.

## 2. Files written (all under `/home/user/KINGBOON420/docs/domain/workforce/`)
`CLEANING.md` · `KITCHEN.md` · `GARDEN.md` · `GENERAL_STAFF_AND_TEMPLE_BOY.md` · `SECURITY_TRAFFIC.md` · `OFFICE.md` ·
`STAFF_PRESENCE_SPEC.md` · `MODULE_REGISTRY_INPUT.md` · `REPORT.md`

## 3. Evidence

### 3.1 Sources
None. No URL was fetched. Master docs read: `AGENT_PROMPT_PACK.md` (COMMON RULES, Agent 17), `ROLE_PERMISSION_MATRIX.md`,
`TEMPLE_DOMAIN_MODEL.md`, `EXECUTIVE_PRODUCT_PLAN.md`, `FEATURE_MATRIX.md`, `FILE_OWNERSHIP.md`, `SECURITY_MODEL.md`,
`UX_INFORMATION_ARCHITECTURE.md` (§5), `GAP_ANALYSIS.md` (§3), `RESEARCH_PLAN.md`, `RISK_REGISTER.md` (grep). Real-world
claims (duties, hours, meal practice, minors, ไวยาวัจกร) are labelled HYPOTHESIS in the files.

### 3.2 Mismatch list vs `ROLE_PERMISSION_MATRIX.md`

| ID | Mismatch | Where hit | Recommendation |
|---|---|---|---|
| M-01 | `staff_general` and `traffic_staff` have **no column** in §4 | GENERAL, SECURITY | Add columns: `staff_general` = `volunteer` + `temple_boy` rows; `traffic_staff` = `security` row minus `asset.view` T |
| M-02 | No role holds `quest.assign`/`quest.verify` for departments **cleaning, garden, security, general, office** (only facility_mgr D, department_lead (kitchen) D, ceremony_lead D, and T roles). Housekeepers, gardeners, guards cannot be assigned or verified in-department | CLEANING, GARDEN, SECURITY, GENERAL, OFFICE | Interim: put `facility_manager` (and optionally `office_staff` for assign) in those departments via `membership_departments` so scope D applies. Alternative: a `staff_supervisor` role. Decision for Opus |
| M-03 | **No permission for presence, shifts, leave or check-in**; `availability.*` is monastic-only | PRESENCE, all | Add `presence.view`, `presence.set_self`, `presence.set_others`, `shift.manage` (rows in PRESENCE §7) |
| M-04 | Security home lists incidents and gate log; **no permission**; incident data must be restricted | SECURITY | Add `security.log` (create own) and `security.incident.view` (**restricted**) |
| M-05 | Kitchen headcount: `kitchen_staff` has no `availability.view`; lead has T⁴ counts only; no code for aggregate headcount or manual adjustment | KITCHEN | Add `headcount.view` (D) and `headcount.adjust` (D) fed by an aggregate function |
| M-06 | Meal services are not representable in `schedule_entries` kinds (§6.2: invitation, ceremony, teaching, class, duty, personal) | KITCHEN | Agent 02: add kind `meal` or a `meal_service` table |
| M-07 | Office documents/bookings/meetings/PDF (F-42) have no codes; `schedule.manage` is in the catalog but **no matrix row** | OFFICE | Add `document.view/manage`, `booking.manage` (P2); add `schedule.manage` row |
| M-08 | `accountant` and `temple_admin` have `quest.view` — but `quest.complete` S (cannot see what they complete); `temple_admin` also has no `schedule.view` | OFFICE | Set `quest.view` = A for both; `schedule.view` S for temple_admin |
| M-09 | `temple_boy` is probably a minor but `community.participate` S (chat) applies to all staff | GENERAL | Minor flag overrides: no P2P chat; matrix note required (links Q-06) |
| M-10 | Zones are not assets; housekeeper/gardener "My zones" rely on `asset.view` A | CLEANING, GARDEN | Agent 18 defines zone read rule; derive from assigned-quest location |
| M-11 | Staff cannot record consumption (`inventory.manage` only for facility_mgr, department_lead (kitchen) D) | CLEANING, KITCHEN, GARDEN | Add `inventory.record` (movement of type "use") at D, or allow quest-completion to log use |
| M-12 | `security_guard` has `asset.view` **T** (broader than needed) | SECURITY | Narrow to A/D (checkpoints and gates) |
| M-13 | ไวยาวัจกร mapped to `facility_manager` only; in practice may handle money/property for monks (HYPOTHESIS) while finance roles are `accountant` | OFFICE | Agent 01 to source; Opus to decide mapping before F-43 |
| M-14 | No role for nuns (แม่ชี) or lay residents, yet they may eat from the temple kitchen (HYPOTHESIS) | KITCHEN | Field question; possible role or "meal audience" setting |
| M-15 | `office_staff` `availability.view` T: matrix note 3 (coarse states, no reasons) is written for monks only | OFFICE | Extend note 3 to all lay readers |
| M-16 | A monk has `quest.create` S only; no way to ask a temple boy/staff for an errand | GENERAL | Add `quest.request` (DRAFT quest to a department, published by a lead) |
| M-17 | No `leave` kind in `schedule_entries` | PRESENCE | Agent 02: add kind `leave` (reason type stored apart from the calendar row) |
| M-18 | Staff panel in Command Center: `command_center.view` D⁵ only for three roles; `temple_admin` and `office_staff` cannot see staff counters | PRESENCE, OFFICE | Decide if `temple_admin` gets staff panel at T |

### 3.3 Case counts
- `STAFF_PRESENCE_SPEC.md`: **26** cases WF-01…WF-26 (minimum 12).
- `KITCHEN.md` headcount: **10** cases WF-31…WF-40.
- Quest templates: CLEANING 7, KITCHEN 9, GARDEN 7, GENERAL/TEMPLE BOY 7, SECURITY/TRAFFIC 7, OFFICE/ADMIN/ACCOUNTANT 10 = **47**, each with checklist, evidence and verification policy.
- Modules: 25 registered (`MODULE_REGISTRY_INPUT.md`).

### 3.4 Self-review checklist

| Check | Result |
|---|---|
| Wrote only under `docs/domain/workforce/` | Pass |
| No code, SQL, package or config | Pass (field lists are concept tables, no DDL) |
| No git add/commit/push/branch change | Pass |
| Out-of-scope roles untouched (driver, technician, facility_manager, ceremony, undertaker) | Pass (population note only) |
| Every listed role has a home definition and quest templates | Pass (accountant home is a P2 placeholder and has one template QT-ACC-01 — F-43 is post-pilot) |
| KITCHEN defines headcount: formula, three sources, Unknown display | Pass (§3) |
| Presence spec: 5 states, shift, check-in, handover, counters + sum invariant, ≥ 12 cases | Pass |
| Registry has id, TH/EN title, permission, data source | Pass |
| Two ledgers respected | Pass: workforce templates `points = 0`; no ledger touched (see OQ-03) |
| AI drafts only | Pass: nothing here lets AI assign or confirm; reassign is system-suggested, human-confirmed |
| Unknown never invented | Pass: headcount ranges, presence UNKNOWN reasons, empty states |
| Staff privacy: team-level only, no finance, incidents restricted | Pass |
| Real-world claims sourced or HYPOTHESIS | Pass (no sources; all HYPOTHESIS) |
| Readiness vocabulary only | Pass |

## 4. Open questions

| ID | Question | Owner |
|---|---|---|
| OQ-01 | D-WF-1: five presence states with `UNKNOWN/OFF_SHIFT`, or add a sixth `OFF_SHIFT` state? Recommendation: add the sixth | Opus |
| OQ-02 | How is M-02 solved: dept scope for `facility_manager`, (a `staff_supervisor` role was rejected; resolved by `department_lead`)? | Opus |
| OQ-03 | May lay staff earn `community_boon_points` for assigned duties? Default here: no (`points = 0`) to avoid gamifying paid work; volunteers earn through Agent 12/19 flows | Opus, Agent 11 |
| OQ-04 | Is `security` a new `quest_type`? (Proposed; default `general` until accepted) | Agent 02 |
| OQ-05 | Raw presence signal and gate-log retention periods (proposed ≤ 90 days / 30 days) | Agent 13, legal |
| OQ-06 | Can the availability resolver be evaluated for a future instant with `location_state`? Kitchen headcount depends on it | Agent 02 |
| OQ-07 | Event registration must expose `meal_required` and confirmed counts | Agent 19 |
| OQ-08 | Minor policy for `temple_boy` (age, guardian consent, restricted features) | Agent 13, legal (Q-06) |
| OQ-09 | Field research: all FQ-* lists at the end of each file (unanswered, BLOCKED by R-03 until a pilot temple exists) | Agent 01 |

## 5. Proposed changes to master docs

1. **`docs/master/ROLE_PERMISSION_MATRIX.md` §3 (Permissions catalog)** — append rows:
   `presence.view`, `presence.set_self`, `presence.set_others`, `shift.manage`, `headcount.view`, `headcount.adjust`,
   `security.log`, `security.incident.view` (**restricted**), `inventory.record`, `quest.request`, `document.view/manage`,
   `booking.manage`. Descriptions per `STAFF_PRESENCE_SPEC.md` §7 and `SECURITY_TRAFFIC.md` §4.
2. **Same file §4 (Matrix)** — add columns `staff_general` (copy `volunteer` + `temple_boy` rows) and `traffic_staff` (copy
   `security` except `asset.view` = A); add a `schedule.manage` row (T for abbot/deputy/assistant/secretary, T for
   `office_staff`); change `quest.view` for `accountant` and `temple_admin` from — to A; narrow `asset.view` for `security`
   from T to A; extend note 3 to read "Monks and all lay readers see coarse states (ว่าง / ไม่ว่าง / ไม่ทราบ), not reasons".
3. **Same file §4 notes** — add note: "A membership flagged `minor` never receives `community.participate` chat/call
   capabilities regardless of role."
4. **`docs/master/TEMPLE_DOMAIN_MODEL.md` §5.1** — replace the `quest_type` list with
   `{monastic_daily, novice_learning, cleaning, kitchen, garden, maintenance, volunteer, event_task, ceremony_task, vehicle_task, office, security, general}`
   (adds `security`; note: `event_root` is referenced in §5.3 but missing from the list — Agent 02 to resolve).
5. **Same file §6.2** — replace `kind ∈ {invitation, ceremony, teaching, class, duty, personal}` with
   `kind ∈ {invitation, ceremony, teaching, class, duty, personal, meal, leave, meeting}`.
6. **Same file §11 Q5** — append: "Answered in `docs/domain/workforce/KITCHEN.md` §3: headcount is a derived **range**
   (confirmed present … everyone not known to be away) from availability, event registrations and optional staff meals,
   plus a human-entered planned number; nothing is estimated."
7. **`docs/master/FEATURE_MATRIX.md` F-27** — Evidence column: `docs/domain/workforce/STAFF_PRESENCE_SPEC.md`; Status
   remains PLANNED (not RESEARCHED: no field/desk research). F-25: Evidence `CLEANING.md`, `KITCHEN.md`, `GARDEN.md`;
   F-42: Evidence `OFFICE.md` (P2).
8. **`docs/master/UX_INFORMATION_ARCHITECTURE.md` §5 (North-star table)** — add rows (proposed wording, HYPOTHESIS until validated):
   `คนสวน | วันนี้ต้องดูแลโซนไหน รดน้ำที่ไหน? | Garden home: zones`; `รปภ. | เวรนี้ประจำจุดไหน เดินตรวจรอบไหน? | Security home: shift and rounds`;
   `ธุรการ | วันนี้มีกิจนิมนต์/นัดหมายอะไรเข้ามา? | Office home: intake`; `เจ้าหน้าที่/เด็กวัด | ตอนนี้ต้องทำอะไร? | My quests today`.
9. **`docs/master/RISK_REGISTER.md`** — add risk: "Permission matrix does not cover staff presence, security records or
   headcount; Wave 3 RLS built on the current matrix would leave these features without authority rules" (L3, I4;
   mitigation: apply items 1–3 before Agent 08 starts).

## 6. Blockers
- Research is desk-only/none (no web used, no pilot temple, R-03): all role duties remain HYPOTHESIS; no artifact can exceed DESIGNED.
- Presence and kitchen headcount depend on Agent 02's resolver (future-instant evaluation, OQ-06) and Agent 19's registration data (OQ-07). No hard block on writing; both are interface assumptions.
- Matrix gaps M-02, M-03, M-04, M-05 must be decided before Wave 3 implementation.

## 7. Self-assessed readiness

| Artifact | Readiness | Note |
|---|---|---|
| `STAFF_PRESENCE_SPEC.md` | DESIGNED | Testable (26 cases); depends on M-03 decision |
| `KITCHEN.md` (headcount) | DESIGNED | Formula testable (10 cases); depends on OQ-06/07 |
| `CLEANING.md` | DESIGNED | Duties HYPOTHESIS |
| `GARDEN.md` | DESIGNED | Duties HYPOTHESIS; proposed north-star |
| `GENERAL_STAFF_AND_TEMPLE_BOY.md` | DESIGNED | Weakest evidence; minor safeguarding needs legal review |
| `SECURITY_TRAFFIC.md` | DESIGNED | Needs M-04 and retention decisions |
| `OFFICE.md` | DESIGNED | Pilot content is intake + admin only; documents and finance are P2 |
| `MODULE_REGISTRY_INPUT.md` | DESIGNED | Ready for Agent 03 with interim permissions |
