# FUNERAL OPERATIONS SPEC — BOON SYSTEM

Owner: Agent 19. Status: **DESIGNED (paper)**; **requires Thai legal/PDPA review (D-5) before pilot**.
Features: F-26 (ceremony team and undertaker views). Roles: `undertaker` (สัปเหร่อ), `ceremony_lead`, abbot-level,
`office_staff`. Permission codes are exactly those of `docs/master/role_permissions.yaml` v0.3: `funeral.assigned.view` (T abbot/deputy/assistant/secretary; A rostered bhikkhu/samanera, undertaker, ceremony_team; D ceremony_lead; alias names only), `funeral.register.view` (restricted; abbot T, office_staff T create_edit), `ceremony.confirm_monks` (restricted). Master rules used: undertaker sees **only funeral rites assigned to them**; deceased and family
data masked outside the assignment (`ROLE_PERMISSION_MATRIX.md` cross-check rule).

## 0. Evidence and honesty

- Thai funerals commonly involve a bathing/water-pouring rite shortly after death, daily chanting by monks
  (often Abhidhamma chanting) usually at a temple, a eulogy, and a cremation, possibly with a procession around the
  crematorium three times [S6 `https://en.wikipedia.org/wiki/Thai_funeral`, accessed 2026-10-07; also
  https://folklore.usc.edu/funeral-rituals-thailand/ via search result summary]. Everything else here
  (durations, monk counts, what an สัปเหร่อ does, who needs which data) is **HYPOTHESIS** to validate with the pilot
  temple's สัปเหร่อ and abbot. Rite details differ by region and family.
- PDPA background from secondary sources (accessed 2026-10-07): PDPA treats religion and health data as sensitive
  (s.26); retention must not be forever, controllers need a destruction system, but no fixed period is
  prescribed (s.37) — https://securiti.ai/thailand-personal-data-protection-act-pdpa ; one secondary source says
  PDPA does not protect the data of *deceased* persons, but **family members' data is personal data and a
  funeral record reveals religion** (HYPOTHESIS that this makes the record sensitive-adjacent). Legal review
  decides; this spec takes the conservative reading.

## 1. Principles

1. **Funerals are not events.** No public listing, no volunteer recruitment, no readiness percent in public,
   no Temple Memory person data. They use quests (`ceremony_task`) and `schedule_entries` for monks, but all
   rows carry `visibility = restricted`.
2. **Assignment-scoped access (A).** A person sees a funeral rite only if they hold an active
   `funeral_assignment` for it, or hold an abbot-level/office funeral permission (§4).
3. **Data minimisation.** Collect only what is needed to perform the rite (§3). No cause of death, no medical
   data, no religion field (the rite itself implies it), no ID numbers, no photos of the deceased, no finance
   records in this domain.
4. **Aliases outside assignment.** Anywhere a funeral appears outside its assigned audience (Command Center,
   calendars, availability, audit lists) it appears only as **"งานฌาปนกิจ #<short id>"** with time window and
   venue; never a name.
5. **Short retention** with a minimal register (§6).

## 2. Workflow

States (`funeral_rite.status`): `RECEIVED → ARRANGING → CONFIRMED → IN_PROGRESS → COMPLETED → CLOSED`;
`CANCELLED` from any non-terminal.

| Step | Actor | Action | Data written |
|---|---|---|---|
| 1 Intake | `office_staff` via `funeral.register.view` T (create/edit); abbot-level may also create through the same function | Family contacts temple (by phone/in person; *Temple Contact* channel when via app); office creates `RECEIVED` record | deceased display name, family contact (1), requested dates/times, venue wish, rite wishes (free text, bounded) |
| 2 Arrange | `ceremony_lead` (`funeral.assigned.view` D, `quest.assign` D) with the abbot's decision recorded by `ceremony.confirm_monks` holders | Choose sala/hall, crematorium slot (Agent 18 building), days of chanting, cremation date | rite schedule entries (restricted) |
| 3 Roster | holders of `ceremony.confirm_monks` (abbot, deputy, assistant; secretary if delegated) confirm monks, same flow as Ceremony spec §6 | Monk team per chanting session and for cremation | `schedule_entries kind=ceremony`, `source_type='event'`, `source_id = funeral_session id` (core's enum has no funeral value; a dedicated `funeral_session` value or a `restricted` flag on the row is an **open request to Agent 02**; the row exposes only kind, time and venue alias, never the rite name) |
| 4 Assign staff | `ceremony_lead` (`quest.assign` D) | Assign undertaker (สัปเหร่อ), ceremony_team, housekeeper, kitchen if meals, driver if transport | `funeral_assignments` (person, role, tasks) with `valid_until = closed_at + 7 d` |
| 5 Prepare | assignees | Checklist: hall, coffin stand, flowers (as family wishes), sound, chanting materials, crematorium readiness, guest seating, water/refreshments, parking | quests (`ceremony_task`) |
| 6 Run | assignees | Sessions and cremation; status IN_PROGRESS | attendance headcount (optional number) |
| 7 Complete | ceremony_lead | Mark COMPLETED; ash/remains handling task closed per family wishes (free text note, not data about remains) | |
| 8 Close | system/office | After closing: PII purge schedule starts (§6) | |

Funeral checklist template is HYPOTHESIS and temple-editable; **no ritual requirement is asserted**.

## 3. Data model (minimal fields)

| Entity | Fields | Notes |
|---|---|---|
| `funeral_rite` | id, temple_id, status, `display_ref` (short id), deceased_display_name (text), `deceased_name_masked_policy`, family_contact_person (name text) + phone, schedule window(s), venue building(s), rite wishes (≤ 500 chars, free text), `created_by`, `closed_at` | Family contact is **one** person. No relation/address/ID. Date of death is **not** required (optional, month-level default; HYPOTHESIS: needed only for the register if the temple requires it). |
| `funeral_session` | rite_id, kind (`bathing`, `chanting`, `eulogy`, `cremation`, `other` — vocabulary HYPOTHESIS), starts_at, ends_at, venue, monks_required | Sessions drive monk rostering. |
| `funeral_assignment` | rite_id, person_id, role (`undertaker`, `ceremony_team`, `housekeeper`, `kitchen`, `driver`, `usher`), tasks, `valid_until` | The source of access (A). |
| `funeral_register_entry` | rite_id, temple_id, deceased_display_name, rite date(s) | Minimal permanent-ish register (see §6, optional per temple, HYPOTHESIS that temples keep one; confirm with pilot). |

Never stored: cause/place of death, medical info, religion, national ID, address, photos, relationships beyond
one contact, payments/donations (finance domain, post-pilot).

## 4. What each role sees

Legend: Y full · M masked (alias only / initials) · P partial (fields listed) · — none.

| Role (YAML v0.3) | Rite list (`funeral.assigned.view`; **alias names only**) | Deceased name | Family contact | Schedule & venue | Checklist | Monk roster | Register (`funeral.register.view`) |
|---|---|---|---|---|---|---|---|
| abbot / deputy_abbot / abbot_assistant / monk_secretary | **T**: all rites, listed as "งานฌาปนกิจ #ref" with time, venue, status | via register only (abbot) | — | Y | — (own tasks if assigned) | Y (names; roster confirmation needs `ceremony.confirm_monks`) | abbot Y T (audited read); others — |
| bhikkhu / samanera | **A**: rites where rostered (own sessions) | — | — | Y own sessions | — | — | — |
| office_staff (intake) | — | Y (writes at intake) | Y (writes at intake; no read-back after hand-over) | — | — | — | Y T create/edit |
| ceremony_lead | **D**: rites in own department | Y (operational need) | P (first name + phone) | Y | Y | Y (names) | — |
| undertaker | **A**: assigned rites only | Y | P (first name + phone, from CONFIRMED until `closed_at`) | Y (their sessions) | Y (their tasks) | P (number of monks and session times, no names) | — |
| ceremony_team | **A**: assigned rites only | M ("ผู้ล่วงลับ", initials) | — | Y (own tasks/time/venue) | own tasks | — | — |
| housekeeper / kitchen_staff / driver / other staff with a task | — no rite access; only their own quest (`quest.view` A) titled with the alias | — | — | own task time/venue | own task | — | — |
| facility_manager / technician | — (only a maintenance quest "เตรียมสถานที่งานพิธี") | — | — | venue/time | — | — | — |
| community_member / volunteer / lay_resident / others | — | — | — | — | — | — | — |
| accountant / platform_admin | — (platform_admin: no implicit access; break-glass audited) | — | — | — | — | — | — |

The rite list never returns the deceased's name or any family field: those live only in the rite detail
(assignment-scoped, roles above) and the register (`funeral.register.view`).

Command Center / Home counters show **counts only** ("งานฌาปนกิจวันนี้ 2"), no names.
The undertaker's list is restricted to rites with an active, unexpired assignment of that person (`funeral.assigned.view` scope A); row-level security enforces
(test: `undertaker` cannot list non-assigned funerals — Wave 3 gate item in the matrix).

## 5. Security requirements

- Every funeral table (`funeral_rite`, `funeral_session`, `funeral_assignment`, `funeral_register_entry`) carries `temple_id` with composite FKs (cross-temple leakage = P0). Access via SECURITY DEFINER functions,
  never direct table access from the client.
- Audit log every read of deceased name/family contact by non-assignee roles, and every export (none planned).
- No full-text search over funeral data; no AI processing of funeral data (AI Secretary excluded by default).
- Notifications carry no name ("งานฌาปนกิจ #A12 พรุ่งนี้ 14:00 ศาลา 2"); push previews must not show name.
- Chat/DM: no family-contact export to chat; calling from within app via masked bridge is out of scope.
- Photos/evidence on funeral quests are disabled (`evidence_policy = none`) to avoid capturing the deceased/family.
- Logging/Sentry: scrub funeral fields.

## 6. Retention (HYPOTHESIS defaults; legal review required — PDPA s.37 prescribes no period)

| Data | Default retention | Then |
|---|---|---|
| Family contact (name, phone) | until `closed_at + 7 days` | hard delete |
| `funeral_assignment` rows | `closed_at + 7 days` (access ends) → rows kept 90 days for audit then person link removed | person_id nulled |
| Wishes free text | `closed_at + 30 days` | delete |
| Sessions/schedule rows | `closed_at + 90 days` | anonymise (keep counts) |
| `funeral_register_entry` (name + dates) | long-term (temple decision; abbot-only) — HYPOTHESIS that temples keep a register | review yearly; deletion on lawful request unless a statutory duty applies (to be determined by counsel) |
| Temple Memory | **anonymous counts only** (number of rites per month, avg session count, checklist lessons without names) | — |

## 7. Cases (`FN-xx`)

| ID | Scenario | Expected |
|---|---|---|
| FN-01 | Undertaker opens list | only assigned rites |
| FN-02 | Undertaker queries a non-assigned rite by id | not found (no existence leak) |
| FN-03 | Housekeeper assigned to hall prep | no rite access (no `funeral.assigned.view`); sees only own quest titled with the alias, time, venue |
| FN-04 | Command Center | count only; no names |
| FN-05 | Secretary with delegated `ceremony.confirm_monks` opens roster | alias + time + venue; deceased name and contact not returned |
| FN-06 | Assignment expires (valid_until passed) | access ends; list empty |
| FN-07 | Family contact purge | 7 days after close, phone and name deleted; job audited |
| FN-08 | Rite cancelled | assignments revoked; contact purged on cancel + 7 d |
| FN-09 | Notification content | no name in title/body |
| FN-10 | AI draft requested on funeral data | refused by policy |
| FN-11 | Cross-temple read attempt | zero rows (P0 test) |
| FN-12 | Abbot opens register | allowed; audited read |
| FN-13 | Second undertaker added mid-rite | sees only from assignment time; earlier sessions' notes visible? **No** (assignment-scoped from creation time) — HYPOTHESIS |
| FN-14 | Calendar/availability for a rostered monk | shows `CEREMONY` state, no rite name |

## 8. Open questions (for pilot temple / counsel)

1. Does the temple keep a funeral register? What fields are statutory vs customary?
2. Does an สัปเหร่อ at the pilot temple coordinate with the family, or does the office?
3. How are crematorium slots and fees handled (finance — out of scope; post-pilot F-43)?
4. Are deceased-person data truly out of PDPA scope; what about names printed on funeral cards (public by custom)?
5. Is a member-visible "funeral tonight" notice culturally expected (public notice board) — if yes, a separate
   family-approved public announcement object, never derived from the restricted record.
