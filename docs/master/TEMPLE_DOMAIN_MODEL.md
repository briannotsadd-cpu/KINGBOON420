# TEMPLE DOMAIN MODEL — BOON SYSTEM

Status: **v0.2 (Wave 1 gate, Opus)**. Agent 02 deepens this in Wave 1 under `docs/domain/`; changes to this
file are made only by Opus after review.

## 1. Ubiquitous language (core terms)

| English (code) | Thai | Meaning |
|---|---|---|
| `temple` | วัด | Tenant. All operational data belongs to exactly one temple. |
| `person` | บุคคล | A human with one login account. Global, not per temple. |
| `membership` | สมาชิกวัด | A person's relationship with one temple: mode, roles, departments, status. |
| `monastic` | บรรพชิต | Bhikkhu (พระภิกษุ) or samanera (สามเณร). Uses **Monastic Mode**. |
| `lay` | ฆราวาส | Anyone not monastic. Uses **Community & Staff Mode**. |
| `department` | ฝ่าย | Organisational unit inside a temple (kitchen, cleaning, ceremony, office…). |
| `role` | บทบาท | Named bundle of permissions inside a temple (abbot, driver, volunteer…). |
| `quest` | ภารกิจ | Any unit of work with an owner, a due time, a status and optional verification. |
| `boss quest` | ภารกิจใหญ่ | An event (กฐิน, ผ้าป่า, วันสำคัญ, course) modelled as a parent quest with child quests and a readiness score. |
| `invitation` | กิจนิมนต์ | A request from outside for monks to attend a rite at a place and time. |
| `ceremony` | พิธี | A rite performed by monks (inside or outside the temple). |
| `availability` | สถานะพระ | The effective status of a monastic at a moment in time. |
| `activity score` | แต้มกิจวัตร (working UI label) | `monastic_activity_score`. Progress indicator for monastics. **Not merit, not currency.** "แต้มบุญ" is **not** used for monastics (Agent 01: implies quantified merit, sits beside redeemable lay points, invites ranking). Final label decided by a monk advisor (B3). |
| `boon points` | แต้มบุญชุมชน (label under test vs แต้มร่วมกิจกรรม) | `community_boon_points`. Participation points for lay people, redeemable for participation rewards. Field-test whether "บุญ" next to a redeemable item reads as buying merit. |
| `participation reward` | ของที่ระลึกจากการร่วมกิจกรรม | What community points can be exchanged for. Never "buying merit". |
| `temple contact` | ช่องทางติดต่อวัด | The only default channel from the public to monastics; routed by the temple. |
| `temple memory` | ความรู้ของวัด | Archived events, checklists and lessons, reused next year. |

## 2. Bounded contexts

```
Identity ── Tenancy ── Organisation(Role/Permission/Department)
                │
   ┌────────────┼─────────────┬──────────────┬─────────────┐
 People    Scheduling      Quest Engine     Facility      Community
 (monastic  (calendar,     (quest, assign,  (building,    (profile,
  & lay     invitation,     evidence,        asset,        connection,
  profiles) ceremony,       verification)    maintenance,  volunteer)
            availability)       │            vehicle/trip,     │
                                │            inventory)        │
                         Scoring (2 ledgers) ── Rewards        Communication
                                │                              (chat/call/
                         Notification · Audit · AI Drafts       temple contact)
                                │
                         Command Center (read model over all contexts)
```

Rules:
- **Quest Engine is the shared work primitive.** Cleaning, kitchen, maintenance, event tasks, ceremony tasks,
  vehicle tasks and monastic daily quests are all quests with a `quest_type`. Domain-specific detail lives in
  extension tables (e.g. `maintenance_requests.quest_id`), not in separate task systems.
- **Command Center owns no data.** It is a read model (views / RPCs) over the other contexts. Every metric must
  be traceable to source rows; anything not derivable is shown as **Unknown**, never estimated.
- **AI owns no authority.** AI writes only to `ai_drafts`; a human action converts a draft into a real entity.

## 3. Tenancy and identity

- `person` is global (one auth account). `membership(person_id, temple_id)` is the unit of access.
- A person may hold memberships in many temples with **different roles in each** (spec §29: Brian = maintenance at
  A, volunteer at B, community member at C).
- **Monastic status is a property of the person** (`person.monastic_kind ∈ {none, bhikkhu, samanera}`), verified
  by a temple admin. Mode is derived per membership: monastic person → Monastic Mode in any temple where they hold
  an active membership. A monk visiting another temple sees only that temple's data that his membership there
  permits.
- Active temple context is chosen after login (temple switcher). The server never trusts a client-sent
  `temple_id` without checking an active membership.
- `platform_admin` exists for system operation but has **no implicit read access to temple data**; break-glass
  access is audited.

## 4. Monk availability state model

### 4.1 States and their source

| State | Thai | Source | Set by | Location implied |
|---|---|---|---|---|
| `CEREMONY` | ทำพิธี | **Calendar-driven** — assigned to a ceremony whose time window covers *now* | Assignment confirmed by authorised human | From ceremony venue (in temple / off-site) |
| `ON_INVITATION` | ออกกิจนิมนต์ | **Calendar-driven** — confirmed invitation assignment, on-site window | Invitation confirmed by authorised human | Off-site |
| `TRAVELING` | เดินทาง | **Calendar-driven** — travel legs before/after an off-site commitment (from trip or computed buffer) | Derived from invitation + trip | Off-site |
| `TEACHING` | สอน | **Calendar-driven** — teaching schedule entry | Schedule owner | From schedule venue |
| `UNAVAILABLE` | ไม่พร้อม | **Manual** (self or admin; e.g. sick, retreat) with mandatory end time | Monk or authorised admin | Unknown unless stated |
| `PERSONAL` | กิจส่วนตัว | **Manual** with end time | Monk | Unknown unless stated |
| `REST` | พักผ่อน | **Manual** with end time | Monk | In temple |
| `IN_TEMPLE` | อยู่ในวัด | **Derived** from a fresh check-in (QR/NFC/manual) with no higher-priority state | System | In temple |
| `AVAILABLE` | ว่าง | **Manual** opt-in ("พร้อมรับกิจ") with end time, and no higher-priority state | Monk | In temple unless stated |
| `UNKNOWN` | ไม่ทราบ | **Derived** — no valid signal (no calendar item, manual status expired, check-in stale) | System | Unknown |

### 4.2 Resolution (priority, highest first)

```
1 UNAVAILABLE  (manual hard block — also raises conflict if it overlaps a confirmed commitment)
2 CEREMONY
3 ON_INVITATION
4 TRAVELING
5 TEACHING
6 PERSONAL
7 REST
8 AVAILABLE
9 IN_TEMPLE
10 UNKNOWN     (fallback)
```

`effective_status(monk, t) = highest-priority state whose interval contains t`. Rules:
- **Never default to AVAILABLE.** A monk is "ว่าง" only by explicit opt-in that has not expired.
- Every manual state carries `valid_until` (default: end of the local day, Asia/Bangkok). Expired → ignored.
- Check-in signals go stale after a configurable TTL (default 12 h) → contribute nothing.
- Overlap of a manual block (1, 6, 7) with a calendar commitment (2–5) is a **conflict**; the system shows the
  resolved state *and* a conflict flag to the secretary. It never silently cancels a commitment.
- Output also includes `location_state ∈ {IN_TEMPLE, OFF_SITE, UNKNOWN}` so the Command Center can count
  "พระอยู่ในวัด" independently of "พระว่าง" (a monk teaching in the temple is in the temple but not free).

### 4.3 Command Center counters

| Counter | Definition |
|---|---|
| พระทั้งหมด | active monastic memberships with `monastic_kind = bhikkhu` |
| สามเณรทั้งหมด | same with `samanera` |
| อยู่ในวัด | `location_state = IN_TEMPLE` |
| ว่าง | `effective_status = AVAILABLE` |
| ออกกิจนิมนต์ | `ON_INVITATION` |
| กำลังสอน / ทำพิธี / เดินทาง | `TEACHING` / `CEREMONY` / `TRAVELING` |
| ไม่พร้อม | `UNAVAILABLE` + `PERSONAL` + `REST` (shown broken down on tap) |
| **ไม่ทราบ** | `UNKNOWN` — always shown, never hidden |

Invariant: the sum of per-state counts equals the total. A dashboard test enforces it.

## 5. Quest engine

### 5.1 Quest fields (from spec §25)

`id, temple_id, quest_type, title, description, department_id, required_role_id, location (building_id/zone_id/
free text), starts_at, due_at, priority, points (+ ledger), checklist, evidence_policy, verification_policy,
status, parent_quest_id (boss quest), depends_on[], created_by, source (manual | template | ai_draft | recurring)`.

`quest_type ∈ {monastic_daily, novice_learning, cleaning, kitchen, garden, maintenance, volunteer, event_root,
event_task, ceremony_task, vehicle_task, office, security, general}` (`security` added from Agent 17; `event_root`
was referenced in §5.3 but missing). Workforce quest templates default to 0 points until OQ-03 (do staff earn community
points for paid work?) is decided.

### 5.2 Lifecycle

| From | Event | To | Who |
|---|---|---|---|
| DRAFT | publish | OPEN | creator with `quest.create` |
| OPEN | assign / claim | ASSIGNED | `quest.assign`, or self-claim if quest is claimable |
| ASSIGNED / IN_PROGRESS | block (reason) | BLOCKED | assignee or manager |
| BLOCKED | unblock | previous state | assignee or manager |
| ASSIGNED | start | IN_PROGRESS | assignee |
| IN_PROGRESS | submit (+ evidence) | SUBMITTED | assignee |
| SUBMITTED | verify ok | VERIFIED → COMPLETED | verifier ≠ assignee |
| SUBMITTED | verify reject (reason) | IN_PROGRESS | verifier |
| SUBMITTED | (verification policy = none) | COMPLETED | system |
| any non-terminal | cancel (reason) | CANCELLED | `quest.manage` |
- `OVERDUE` is **derived** (`due_at < now` and not COMPLETED/CANCELLED), not a stored status.
- `UNASSIGNED` = OPEN with zero active assignments (derived).
- Points are credited **only on COMPLETED**, by a server-side function, exactly once (idempotency key =
  `quest_assignment_id`). Reversal creates a compensating ledger row; rows are never updated or deleted.
- Verification methods: `none | organizer_approval | staff_verification | qr_checkin | photo_evidence |
  location | attendance`. A verifier cannot verify their own submission.
- Every transition writes an `audit_logs` row (actor, from, to, reason).

### 5.3 Boss Quest (Event)

- An `event` has exactly one root quest of type `event_root`; departments get child quests.
- Readiness is a **pure function** specified in `docs/domain/events/EVENT_BOSS_QUEST_SPEC.md` §5:
  `percent = floor(100·(0.6·T + 0.4·S))` (T = completed task weight share, S = staffing fill), seven hard gates
  (G-OWNER, G-VENUE, G-STAFF, G-MAINT, G-CRIT, G-CHECK, G-CONFLICT) each PASS/FAIL/UNKNOWN; states UNKNOWN /
  NOT_READY / IN_PROGRESS / ALMOST_READY / READY. A failing gate → NOT_READY regardless of percent; an UNKNOWN gate
  caps at ALMOST_READY. A freshly duplicated event is NOT_READY by construction.
- Events can be duplicated from Temple Memory (copies structure, checklist and staffing targets, never people or
  evidence).

## 6. Scheduling and invitations

### 6.1 Invitation lifecycle

```
RECEIVED ─triage─▶ REVIEWING ─propose team─▶ TEAM_PROPOSED ─human confirm─▶ CONFIRMED ─▶ IN_PROGRESS ─▶ COMPLETED
     │                  │                         │                              │
     └──decline──▶ DECLINED ◀──────────────────────┘                    cancel ─▶ CANCELLED
```
- Captures: host contact, rite type, venue + geo, start, expected duration, monks required, transport (host
  provides / temple vehicle), notes.
- **Smart Monk Assignment** proposes candidates using availability, existing schedule, travel time estimate,
  return buffer and vehicle availability. It produces a ranked suggestion with reasons. **Only an authorised
  human moves TEAM_PROPOSED → CONFIRMED.** AI never confirms.
- On CONFIRMED the system creates schedule entries (ON_INVITATION window + TRAVELING legs) for each monk and
  optionally a `trip` for the driver. Invitation CANCELLED → linked trip cancelled; invitation back to
  REVIEWING/TEAM_PROPOSED → trip ON_HOLD (Agent 18). A monk is never assigned as a driver.

### 6.2 Schedule entry

`schedule_entries(temple_id, person_id, kind ∈ {invitation, ceremony, teaching, class, duty, personal, meal, leave,
meeting}, starts_at,
ends_at, venue, source_type, source_id)` — the single calendar table that availability resolution reads.

## 7. Facility

- `buildings` (stable `code`, e.g. `WAT-ARUN.PRANG.MAIN`) are the shared key between data, 2D map and 3D scene.
  Code regex `^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$`; immutable; never reused. Detail:
  `docs/domain/facility/SPATIAL_REGISTRY_SPEC.md`.
- `zones` subdivide buildings/grounds (cleaning and garden assignments).
- `assets` (QR code, building/zone, custodian, status), `maintenance_requests` (→ quest of type maintenance),
  `inventory_items` + `inventory_movements`, `vehicles`, `trips` (driver, vehicle, passengers, legs, status).
- "Building has a problem" = an open, non-duplicate maintenance request with severity S2 or worse (threshold
  configurable per temple; untriaged severity counts as S2). Also feeds event gate G-MAINT.
- Vehicle availability is UNKNOWN (never FREE) without an affirmative status and a known driver; departure time is
  Unknown without a travel estimate or manual override (`VEHICLE_TRIP_SPEC.md`).
- Staff presence mirrors monk availability: WORKING / FREE / ON_LEAVE / OFF_SITE_DUTY / UNKNOWN, with a sum
  invariant (`docs/domain/workforce/STAFF_PRESENCE_SPEC.md`). **Decision (Opus): add a sixth state `OFF_SHIFT`** so
  people who have checked out are not counted as UNKNOWN.
- Kitchen headcount is a **range** [confirmed present … everyone not known to be away] plus a human-entered planned
  number; nothing is estimated (`docs/domain/workforce/KITCHEN.md` §3).

## 8. Scoring — two ledgers, never merged

| | `monastic_activity_score` | `community_boon_points` |
|---|---|---|
| Who | monastics only | lay members only |
| Earned from | completed monastic quests, streaks, achievements | verified volunteer/quest/event participation |
| Spend | **never** (no redemption, no money, no goods) | participation rewards catalog |
| Ranking | **No public ranking**; personal progress only. Not usable for promotion. | Optional per-temple leaderboard, off by default |
| Storage | `monastic_activity_ledger` (append-only) | `boon_point_transactions` (append-only, signed amounts) |
| Enforcement | DB constraint: ledger rows only for persons with `monastic_kind <> none` | DB constraint: only `monastic_kind = none`; redemption cannot exceed balance (serializable txn) |

No table, view or API may sum the two ledgers together.

## 9. Community and communication

- `community_profiles` with per-field visibility `PUBLIC | CONNECTIONS | PRIVATE` (default PRIVATE for optional
  sensitive fields: height, weight, body information, income range).
- `connections` (request → accepted / declined / blocked). Chat, voice, video and groups between lay people
  require an accepted connection or a shared group the temple created.
- **Monastic contact:** public users cannot open a DM with a monastic by default. They message *Temple Contact*;
  the temple routes the thread to a responsible person. A monastic may opt in to direct contact per temple and
  per relationship.
- Block, mute and report are available on every person and message surface; reports go to the temple moderation
  queue.

## 10. AI drafts

`ai_drafts(temple_id, created_for, kind ∈ {quest, event, invitation, maintenance, summary, checklist}, payload,
source_audio_ref, status ∈ {pending, accepted, edited_accepted, rejected})`. Accepting a draft calls the normal
create API as the human who accepted it. AI output is labelled as AI-generated in the UI.

## 11. Open domain questions (for Agent 02 / research)

1. Does a samanera's learning schedule come from an external Pariyatti curriculum, or is it temple-defined?
2. Who in a typical temple confirms invitations — the abbot, secretary monk, or a lay office?
3. Are monks comfortable with check-in signals at all? Alternative: availability purely from calendar + opt-in.
4. Do vehicles belong to the temple or to lay supporters lending them? (affects ownership and liability)
5. ~~Kitchen headcount~~ — answered by Agent 17 (range + planned number, see §7). Needs availability at a future
   instant from the resolver (OQ-06) and meal-required guest counts from events (OQ-07).
6. Which rites can a สัปเหร่อ see, and must deceased-person data be restricted further (family privacy)?
