# CEREMONY OPERATIONS SPEC (in-temple rites) — BOON SYSTEM

Owner: Agent 19. Status: **DESIGNED (paper)**. Features: F-16 (ceremony kind), F-26 (ceremony team & undertaker
views — undertaker part in Funeral spec).
Boundary: **in-temple** rites only. Off-site rites at a host's venue are invitations (กิจนิมนต์) owned by Agent 02
(F-13). A ceremony may be part of an event (e.g. the Makha evening rite inside the Makha event) or standalone
(e.g. weekly merit rite, a house-blessing held at the temple, a memorial chanting booked by a family).
Evidence labels as in `EVENT_CATALOG.md` §0 (HYPOTHESIS = unsourced).

## 1. Model

`ceremony` = a rite with a time window and venue inside the temple, performed by a monk roster.

| Field | Notes |
|---|---|
| id, temple_id | |
| event_id | nullable; when set, the ceremony is a **component** of that event and its readiness feeds the event via its leaf quests/targets (no double counting: the ceremony's own readiness is shown on its page, the event counts only the target rows attached to the event) |
| rite_type | controlled vocabulary maintained per temple: `morning_chanting`, `evening_chanting`, `merit_offering_rite`, `blessing`, `memorial_chanting`, `uposatha_related`, `festival_rite`, `ordination_rite`, `other` (HYPOTHESIS list; temple can extend; **funeral rites excluded** → Funeral spec) |
| starts_at, ends_at | |
| venue_building_id (+ zone) | Agent 18 building code (e.g. ordination hall, sala) |
| host_note | optional, who requested (family / temple) — free text limited; no health/religion data about guests |
| expected_guests | int; drives seating/food suggestions |
| monks_required | int ≥ 0, **temple-entered**. The system does not infer a count from rite type (no sourced rule; HYPOTHESIS that customary counts exist and vary) |
| samanera_allowed | bool, whether samanera may be rostered (temple decision) |
| status | `SCHEDULED → ROSTER_PROPOSED → ROSTER_CONFIRMED → PREPARED → IN_PROGRESS → COMPLETED`, or `CANCELLED` |
| visibility | internal / temple_members / public |

A ceremony owns (a) a **timeline**, (b) a **checklist** (leaf quests of type `ceremony_task`), (c) an **equipment
list**, (d) a **monk roster**, (e) **guest/seating info**. It has a root quest like an event (`event_root`
sub-kind `ceremony_root`) so the same readiness function (Event spec §5) applies unchanged:
- targets: monk (from roster), ceremony_team staff, volunteers (e.g. seating/ushers);
- gates: G-OWNER, G-VENUE, G-STAFF (monk), G-MAINT (venue), G-CONFLICT, G-CHECK, G-CRIT;
- PREPARED = state function result is READY **and** the ceremony lead taps "พร้อมแล้ว" (human attestation);
  PREPARED is not auto-derived.

## 2. Timeline template (HYPOTHESIS: generic; times are offsets from `starts_at`)

| Offset | Step | Owner role |
|---|---|---|
| T-7 d | Rite requested/scheduled; venue reserved; monk count set | ceremony_lead / office |
| T-3 d | Roster proposed to secretary/abbot; equipment check created | ceremony_lead |
| T-2 d | Roster confirmed (human) → schedule entries written | secretary / abbot |
| T-1 d | Venue cleaning, altar/seating set-up, equipment test, offering items | ceremony_team, housekeeper |
| T-2 h | Final check: monks present or in transit, sound, light, water, seating | ceremony_lead |
| T-15 min | Doors, guests seated; monks notified (reminder) | ceremony_team |
| T0 → T+duration | Rite (status IN_PROGRESS; monks' state = CEREMONY by calendar) | — |
| T+30 min | Tidy-up; items returned; attendance count entered | ceremony_team |
| T+1 d | Retro note (optional, 2 questions) | ceremony_lead |

Offsets are defaults; the template per rite type may override. Standalone routine rites (daily chanting) use
recurring quests (Agent 02 `source = recurring`) and skip this ladder.

## 3. Checklist template (HYPOTHESIS; temple edits)

- **Venue**: swept/mopped · mats/seats arranged (elevated seat for monks per temple custom) · altar/Buddha image
  prepared · flowers/candles/incense · fans/air condition · lights.
- **Sound**: microphones, speakers, battery spares, chanting books/sheets.
- **Offerings**: items for offering to monks ready; water; refreshments for guests.
- **Guests**: seating plan for elderly, parking/guidance, shoe racks, restrooms open.
- **Safety**: fire extinguisher location; no open flame hazard (candles) `is_gate`.
- **Roster**: monks confirmed (`is_gate`), names list printed for ceremony lead (only monks assigned).
Each item = leaf quest `ceremony_task`, weight default 2, department = ceremony; department lead = ceremony_lead.

## 4. Venue and equipment

- Venue = Agent 18 `building` (and optional zone). The ceremony **reserves** the building window; overlap with
  another ceremony/event at the same building is a G-VENUE fail unless flagged `allow_shared_venue`.
- G-MAINT reads open maintenance requests at that building ≥ severity threshold (Agent 18 contract A18-1).
- Equipment = Agent 18 assets/inventory references: `ceremony_equipment(ceremony_id, asset_or_item_ref, qty,
  status ∈ {NEEDED, RESERVED, READY, MISSING})`. A MISSING item raises a quest for facility_manager. Equipment
  items flagged `critical` map to `is_gate` leaf quests.
- Assumption **A18-2**: an asset reservation API exists; until then equipment is a checklist only (no stock check).

## 5. Monk count, guests

- `monks_required` is temple-entered (see §1). Confirmed monks `f` counts per Event spec §2.4 rules.
- If `samanera_allowed = false`, a samanera cannot be rostered (rejected server-side). HYPOTHESIS: some rites
  need bhikkhu only; the temple decides. Where a rite truly requires a Sangha quorum (e.g. ordination: ten, or
  five in remote areas [S5]), the template adds an informational prompt, **never an automatic ruling**.
- Guests: `expected_guests` and optional `actual_guests` at close. Guest names are **not collected** by default
  (data minimisation). A registration list exists only for courses/events that need it.

## 6. Monk assignment to ceremonies and `schedule_entries`

### 6.1 Flow (human in the loop — rule: AI/system proposes, authorised human confirms)

1. `ceremony_lead` (or office) creates the ceremony and sets `monks_required`.
2. Roster **proposal**: manual selection, or Smart Assignment suggestions (Agent 02/07 logic, F-14) producing a
   ranked list with reasons (availability, existing schedule, rite-fit if the temple recorded it). The proposal
   is stored as `ceremony_assignments(status = PROPOSED)`. AI may only write `ai_drafts`.
3. An authorised human (**secretary or abbot-level**; proposed new permission `ceremony.confirm_monks`, default
   granted to abbot, deputy, assistant, monk_secretary) moves each assignment `PROPOSED → CONFIRMED`.
   `ceremony_lead` can propose but not confirm (lay role; monks' time belongs to the monastic hierarchy — design
   assumption, HYPOTHESIS, validate with pilot).
4. On CONFIRMED the system writes one `schedule_entries` row per monk through **Agent 02's contract**:

| schedule_entries column | Value |
|---|---|
| temple_id | ceremony.temple_id |
| person_id | the monk |
| kind | `ceremony` |
| starts_at / ends_at | ceremony window **minus/plus** configured monk buffer (default 15 min before, 0 after; HYPOTHESIS) |
| venue | building code (+ zone) |
| source_type | `ceremony_assignment` |
| source_id | `ceremony_assignments.id` |

   Resolver result during the window: monk `effective_status = CEREMONY`, `location_state = IN_TEMPLE`
   (master §4.1). Idempotency key: `(source_type, source_id)`; re-confirm does not duplicate.
5. Monk notification: "ได้รับมอบหมาย: <rite> <time> <venue>". The monk may press **"แจ้งติดขัด"** (report a
   conflict) which flags the assignment; it does *not* auto-cancel (never silently cancel a commitment, master
   §4.2). Whether monks should have accept/decline buttons is a cultural question → HYPOTHESIS: use
   "acknowledge / report a problem" wording; validate in interviews.

### 6.2 Changes and conflicts

| Situation | Behaviour |
|---|---|
| Ceremony rescheduled | Linked `schedule_entries` are updated in the same transaction; assignments → `NEEDS_RECONFIRM`; monks notified; secretary re-confirms (Event spec EV-19) |
| Monk becomes UNAVAILABLE (manual) overlapping | Conflict flag from resolver; G-CONFLICT FAIL; secretary sees both states (master §4.2); replacement proposed |
| Monk removed | assignment `CANCELLED`; schedule entry deleted/ended by `source_id`; audit reason |
| Ceremony cancelled | assignments `CANCELLED`; schedule entries removed; notifications |
| Overlap with an invitation (off-site) | resolver conflict; the system does not choose |

### 6.3 Who sees what (ceremony)

| Role | Sees |
|---|---|
| abbot / deputy / assistant / secretary | all ceremonies, rosters, readiness |
| ceremony_lead | ceremonies of department D: timeline, checklist, roster **names**, readiness; can propose, cannot confirm |
| ceremony_team | assigned ceremony tasks (A) and the ceremony timeline; roster names only if needed for the task (default: yes, names of monks, no contact info) |
| bhikkhu / samanera | own ceremony assignments (S) and temple-wide public ceremonies |
| housekeeper / facility / kitchen | only the tasks assigned to them and the time/venue |
| volunteer / community | public ceremonies only: title, time, venue |

## 7. Cases (`CE-xx`)

| ID | Scenario | Expected |
|---|---|---|
| CE-01 | Create ceremony, monks_required = 7, no assignments | readiness state NOT_READY (G-STAFF), monk gap 7 |
| CE-02 | Confirm 7 monks | 7 `schedule_entries` kind ceremony; resolver shows CEREMONY in window |
| CE-03 | Re-confirm same assignment | no duplicate schedule row (idempotent) |
| CE-04 | Lead attempts to confirm | rejected (lacks `ceremony.confirm_monks`) |
| CE-05 | Samanera rostered on a bhikkhu-only ceremony | rejected |
| CE-06 | Monk sets UNAVAILABLE overlapping a confirmed ceremony | conflict flag, G-CONFLICT FAIL, monk not counted in f, no auto-cancel |
| CE-07 | Reschedule by 2 days | schedule entries moved, assignments NEEDS_RECONFIRM until re-confirmed |
| CE-08 | Venue under open high-severity maintenance | G-MAINT FAIL → NOT_READY |
| CE-09 | Two ceremonies same hall overlapping | G-VENUE FAIL unless allow_shared_venue |
| CE-10 | Ceremony inside an event | event readiness uses the event-attached targets/leaves only; no double counting |
| CE-11 | Monk from another temple (visiting) | assignable only with ACTIVE membership in this temple (tenant rule) |
| CE-12 | Cancel ceremony | entries removed, monks notified, audit row |
| CE-13 | Funeral-type rite attempted as ceremony | rejected; must use funeral flow |
| CE-14 | Housekeeper views ceremony | sees only own cleaning task, time, venue |

## 8. Out of scope / open questions

1. Rite-fit data on monks (who can lead which chanting) is sensitive HR-like info — not modelled in Wave 1.
2. Whether abbot seniority/lineup order on the dais is recorded (cultural, not modelled).
3. Interface assumptions A02-2 (write `schedule_entries`), A18-1/A18-2 — reconcile at Wave 1 review.
