# REPORT — Agent 19 (Ceremony / Event Operations), Wave 1a

Date: 2026-10-07. Documentation only; no code, SQL or config written. No git commands run.

## 1. Summary

Specified events as Boss Quests (root/department/leaf quest tree, staffing targets with confirmed-head-count
rules), a **pure, unit-testable readiness function** (task score 0.6 + staffing score 0.4, floor percent, 7 hard
gates, caps for Unknown inputs, 48 h time escalation, five states), 28 event cases (EV-01…28 with numeric test
vectors), a 10-template catalogue (sourced or HYPOTHESIS per item), in-temple ceremony operations (including the
`schedule_entries kind=ceremony` write through Agent 02's contract), funeral operations with assignment-scoped
access and short retention, and Temple Memory (copy structure, never people/evidence; lessons capture; search
needs for Agent 10). All three north-star questions are mapped to fields (Event spec §6).

## 2. Files written (all under `/home/user/KINGBOON420/docs/domain/events/`)

| File | Readiness |
|---|---|
| `EVENT_BOSS_QUEST_SPEC.md` | DESIGNED |
| `EVENT_CATALOG.md` | PLANNED — desk summary, sources unopened (R-18, audit F-06); most items HYPOTHESIS |
| `CEREMONY_OPERATIONS_SPEC.md` | DESIGNED |
| `FUNERAL_OPERATIONS_SPEC.md` | DESIGNED; blocked on legal review before pilot |
| `TEMPLE_MEMORY_SPEC.md` | DESIGNED |
| `REPORT.md` | — |

Feature matrix mapping: F-16 DESIGNED, F-17 DESIGNED, F-26 DESIGNED (proposed status changes are Opus's; evidence =
these files; none is IMPLEMENTED/TESTED/VERIFIED).

## 3. Evidence

Sources (accessed 2026-10-07; obtained through web-search result summaries, pages not individually fetched; all
secondary): tbcm.org.my Kathina; dhammakaya.or.th Kathina; watsacramento.org ceremonies; Wikipedia Tak Bat Devo,
Upasampada, Thai funeral; lovethailand.org Tak Bat Devo; bl.uk monastic ordination; folklore.usc.edu Thai funeral;
securiti.ai Thai PDPA. Full URL list: `EVENT_CATALOG.md` §0 and `FUNERAL_OPERATIONS_SPEC.md` §0.
Not verified from any primary Thai authority. Not read: other Wave 1a agents' outputs (written concurrently).

Self-review checklist:
- [x] Only wrote under docs/domain/events/.
- [x] No code/SQL (field tables are conceptual).
- [x] Ritual requirements stated as fact only where sourced (Kathina ≥5 bhikkhus + one-month window; ordination quorum 10/5; festival dates); all else labelled HYPOTHESIS.
- [x] Readiness formula exact: inputs, T, S, percent (floor), gates, state order, 28 vectors incl. float boundary.
- [x] Unknown is first-class (gates and caps), never defaulted to OK.
- [x] Two ledgers untouched; no points logic added; AI drafts only; humans confirm monk rosters.
- [x] Funeral/family data assignment-scoped, retention specified, masked views by role.
- [x] Every tenant row has temple_id; cross-temple cases included (EV-23, FN-11, TM-06, CE-11).
- [x] ≥ 15 EV cases (28).
- [x] Reconciled with final Agent 02/17/18 docs in the fix round; status per assumption in `EVENT_BOSS_QUEST_SPEC.md` §9.

## 4. Top findings

1. Readiness percent can mislead; the real signal is gates plus gaps. Spec makes gates dominate, Unknown cap
   readiness at ALMOST_READY, and a freshly duplicated event is correctly NOT_READY.
2. Role matrix gap: `event.manage` is D-scope for `ceremony_lead` only. Kitchen/traffic/etc. leads cannot manage
   their own event sub-tree; no permission exists to *confirm monks for in-temple ceremonies* (only invitations).
3. Kathina's "≥ 5 bhikkhus completed vassa" needs a vassa-residence fact the domain does not track; spec treats it
   as temple-entered Unknown, never auto-asserted. Ordination quorum (10 or 5 remote) is a ruling the system must not make.
4. Funeral data: religion/health sensitivity, family data is personal data; spec minimises (no cause of death), uses
   aliases outside assignment, 7-day purge of family contact. Retention values are HYPOTHESIS pending counsel.
5. Source quality is weak (secondary, summary-level). Every template count/ratio is HYPOTHESIS; pilot walk-through needed.

## 5. Open questions

See each file's last section. Key: lunar-calendar authority (O-1), vassa records (O-2), who confirms ceremony monk
rosters, whether percent is useful to temples vs gates+gaps only, funeral register and statutory duties, multi-temple events.

## 6. Proposed changes to master docs

1. `ROLE_PERMISSION_MATRIX.md` §3 (catalog) — add rows:
   - `event.approve` — "Approve event date/venue/scope (PLANNING → APPROVED)" — Restricted: yes (T for abbot, deputy, assistant; secretary only if delegated).
   - `event.volunteer_approve` — "Approve volunteer sign-ups for a department" — scope D (ceremony_lead, department_lead (kitchen), facility_manager per event assignment).
   - `ceremony.confirm_monks` — "Confirm monk roster for in-temple ceremonies and funeral sessions" — T for abbot, deputy, assistant, monk_secretary (secretary default allowed for routine rites like note 2 of `invitation.confirm`).
   - `funeral.assigned.view` — A scope for `undertaker`, `ceremony_team`; `funeral.register.view` — T for abbot only (office_staff create/edit).
2. `ROLE_PERMISSION_MATRIX.md` §4, row `event.manage`: add `D` for `department_lead` (kitchen), `facility_manager` and per-event department-lead assignment (or replace by `event_department_lead` grant), so department heads can edit their own sub-tree.
3. `TEMPLE_DOMAIN_MODEL.md` §5.3 — replace the readiness bullet with: "`readiness` is a pure function defined in `docs/domain/events/EVENT_BOSS_QUEST_SPEC.md` §5: percent = floor(100·(0.6·T + 0.4·S)); gates G-OWNER, G-VENUE, G-STAFF, G-MAINT, G-CRIT, G-CHECK, G-CONFLICT; states UNKNOWN / NOT_READY / IN_PROGRESS / ALMOST_READY / READY."
4. `TEMPLE_DOMAIN_MODEL.md` §1 — add terms: `staffing target` (เป้าหมายกำลังคน), `gate` (เงื่อนไขบังคับ), `funeral rite` (พิธีฌาปนกิจ, restricted).
5. `DATABASE_PLAN.md` — add `event_staffing_targets`, `event_departments`, `ceremony_assignments`, `funeral_rite/session/assignment/register_entry`, `memory_event_snapshot`; funeral tables restricted-access, purge jobs.
6. `FEATURE_MATRIX.md` — F-26 add dependency on F-12 (schedule entries) and F-13 conflict flag; F-17 add `temple_memory_notes` and the no-people snapshot test.
7. `SECURITY_MODEL.md` — add funeral data class (restricted, assignment-scoped, 7-day contact purge) and AI exclusion for funeral data.
8. `RISK_REGISTER.md` — add: R-new "ritual statements sourced only from secondary web sources"; R-new "funeral data legal basis unknown (PDPA)".

## 7. Blockers

- None blocking Wave 1 documents. Blocks later waves: (a) legal review of funeral data and retention (D-5);
  (b) pilot temple walk-through to validate templates, monk-roster authority and defaults (D-1);
  (c) Agent 02 / 17 / 18 contracts (schedule_entries conflict flag, skill vocabulary, maintenance severity feed)
  must be reconciled with assumptions listed in Event spec §9.

## 8. Wave 1 fix round (2026-10-07)

Source: `docs/reviews/wave-1/GOVERNANCE_AUDIT.md` + `docs/master/role_permissions.yaml` v0.2. Proposals 1-3, 8 were
applied by Opus; the codes below are the YAML's.
- Permission codes aligned (Event spec §3 table; Funeral spec §4 rewritten by YAML code; Ceremony spec §6.1).
- `kitchen_lead` and `event_department_lead` removed; kitchen lead = `department_lead` (kitchen) with `event.manage` D (F-17).
- `schedule_entries`: kinds = master set of 10; this domain writes `ceremony` only with `source_type = 'event'` (F-12, F-13).
- G-MAINT now reads the Agent 18 `problem` flag (default threshold S2).
- Meal-required guest count exposed (Event spec §2.5, EV-29..31).
- F-06 catalogue relabelled DESIGNED; F-23 `temple_id` statements added; F-24 domain events (Event spec §11);
  F-25 free `skill_tags[]`; F-39 evidence grade LOW on Kathina; F-41 readiness audience proposed (Event spec §7).
- Still open for Opus/others: abbot-level funeral rite-list code (F-18); per-event department lead grant; one skill vocabulary owner (F-25);
  attendance record owner (F-26); core to expose the monk-conflict count function and add a funeral `source_type`; asset reservation (A18-2); `SCHEDULE_INVITATION_SPEC.md:23` still lists 7 kinds.
- Proposals 4-7 (glossary terms, DATABASE_PLAN tables, FEATURE_MATRIX notes, SECURITY_MODEL funeral class) remain with Opus (audit F-07, F-08, F-28, F-30).
- Add-on (YAML v0.3): funeral visibility aligned (Funeral spec §4); F-41 audience rule per coordinator (Event spec §7); catalogue label PLANNED — desk summary, sources unopened; domain events in dot.case incl. `attendance.recorded` (Event spec §11).
