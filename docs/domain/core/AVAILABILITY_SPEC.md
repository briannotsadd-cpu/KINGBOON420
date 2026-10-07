# AVAILABILITY SPEC (Monk availability resolver)

Owner: Agent 02. Status: **DESIGNED**. Refines `docs/master/TEMPLE_DOMAIN_MODEL.md` §4 and feature F-09.
Becomes `packages/domain` (pure function) and a database function in Wave 3-4. No SQL here. **[EXT]** = extends a
master doc; **HYPOTHESIS** = default without real-world evidence.

## 1. Scope and principles

- A pure, deterministic function: same inputs, same outputs. No clock reads inside; `at` is an input.
- **Never default to AVAILABLE.** "ว่าง" exists only by explicit, unexpired opt-in.
- **Unknown is a first-class answer.** No valid signal -> `UNKNOWN`, shown everywhere, counted always.
- **Never silently cancel a commitment.** Overlaps produce `conflicts[]`; humans resolve.
- Per temple: availability is computed inside one `temple_id`. A monk's commitments in another temple are invisible
  here (see case AV-43 and open question OQ-A3).
- Time: all instants are stored as UTC; every rule that mentions a "day" or "midnight" uses **Asia/Bangkok
  (UTC+07:00, no DST)**. Intervals are half-open `[from, to)`: start inclusive, end exclusive.

## 2. Contract

### 2.1 Inputs

| Input | Type | Notes |
|---|---|---|
| `temple_id` | id | From the verified session, never from payload. |
| `person_id` | id | Must have an ACTIVE membership in `temple_id` and `monastic_kind <> none`. |
| `at` | instant | The moment to resolve. |
| `manual_statuses[]` | rows | `{id, state ∈ {UNAVAILABLE, PERSONAL, REST, AVAILABLE}, valid_from, valid_until, set_by, set_by_kind ∈ {SELF, ADMIN}, location_hint ∈ {IN_TEMPLE, OFF_SITE, null}, reason_code, truncated_at?}`. `valid_until` always present. |
| `schedule_entries[]` | rows | From SCHEDULE_INVITATION_SPEC §2: `{id, kind, status, starts_at, ends_at, venue_kind ∈ {IN_TEMPLE, OFF_SITE, UNKNOWN}, source_type, source_id}`. Only `status = CONFIRMED` counts. |
| `checkins[]` | rows | `{id, checked_at, method ∈ {qr, nfc, manual}, checked_out_at?}`; server time only. |
| `config` | object | `checkin_ttl_minutes` (default 720, allowed 60-1440), `checkin_enabled` (per temple), `max_manual_hours` (24), `max_unavailable_days` (120). |

### 2.2 Output `AvailabilityResult`

| Field | Type | Meaning |
|---|---|---|
| `effective_status` | one of the ten states | Winner by priority (section 3). |
| `location_state` | `IN_TEMPLE \| OFF_SITE \| UNKNOWN` | Section 5. |
| `conflicts[]` | `Conflict` | Section 6. Empty if none at `at`. |
| `reason` | object | `{code ∈ {WINNER_MANUAL, WINNER_CALENDAR, WINNER_CHECKIN, NO_VALID_SIGNAL}, winner_ref, valid_until, next_change_at, contributing[], ignored[]}`. `ignored[]` items are `{ref, why ∈ {EXPIRED, STALE, NOT_STARTED, NOT_CONFIRMED, CANCELLED, SUPERSEDED_BY_HIGHER_PRIORITY, SUPERSEDED_BY_NEWER_MANUAL, CHECKED_OUT}}`. |
| `as_of` | instant | Echo of `at`. |

Errors: `NOT_A_MEMBER` (also returned when the person does not exist, to avoid enumeration), `NOT_MONASTIC`.

## 3. Resolution

Priority, highest first (identical to master §4.2):

| Rank | State | Source |
|---|---|---|
| 1 | `UNAVAILABLE` | manual (hard block) |
| 2 | `CEREMONY` | calendar `ceremony` |
| 3 | `ON_INVITATION` | calendar `invitation` |
| 4 | `TRAVELING` | calendar `travel` [EXT] |
| 5 | `TEACHING` | calendar `teaching`, and [EXT] `class`, `duty` |
| 6 | `PERSONAL` | manual, and calendar `personal` |
| 7 | `REST` | manual |
| 8 | `AVAILABLE` | manual opt-in |
| 9 | `IN_TEMPLE` | derived from fresh check-in |
| 10 | `UNKNOWN` | fallback |

Algorithm:
1. Validate membership and monastic kind (errors above).
2. **Active signals at `at`:**
   - manual row active iff `valid_from <= at < min(valid_until, truncated_at ?? ∞)`;
   - schedule entry active iff `status = CONFIRMED and starts_at <= at < ends_at`;
   - check-in fresh iff `checkin_enabled and checked_at <= at < checked_at + ttl and (checked_out_at is null or at < checked_out_at)`.
3. Map each active signal to a state (table above; a `personal` calendar entry maps to PERSONAL).
4. `effective_status` = state with the lowest rank number among active signals; `UNKNOWN` if none.
   Several signals of the same state: the winner for `reason.winner_ref` is the one with the latest `set_at`
   (manual) or earliest `starts_at` (calendar), then smallest id.
5. Fill `conflicts[]` (section 6), `location_state` (section 5), `reason` (all other active signals go to
   `contributing[]` if they affect location, else `ignored[]` with `SUPERSEDED_BY_HIGHER_PRIORITY`; inactive signals
   with a recognisable cause go to `ignored[]`).
6. `reason.valid_until` = end of the winning signal's interval (null for UNKNOWN). `reason.next_change_at` =
   the earliest instant after `at` at which any known signal starts, ends, expires or goes stale (null if none).

Mapping gaps in the master (carried to REPORT): `class` (a novice attending class) and `duty` have no state in
master §4.1; this spec maps them to TEACHING (UI label "เรียน/สอน") [EXT]. `travel` is not in master §6.2's list of
kinds but is needed for TRAVELING legs [EXT].

Return buffer: the planning buffer after a trip (SCHEDULE_INVITATION_SPEC §5) is **not** a status; it only
constrains assignment. Inside the buffer the resolver returns whatever signals exist (usually UNKNOWN).

## 4. State sources and rules

| State | Created by | Needs end time | Implied location | Notes |
|---|---|---|---|---|
| UNAVAILABLE | `set_status` (self or admin) | yes | none; `location_hint` or fallback | Reasons `SICK, RETREAT, OTHER`. Sensitive; visibility in section 9. |
| CEREMONY | confirmed schedule entry | entry end | entry `venue_kind` | |
| ON_INVITATION | confirmed invitation entry | entry end | OFF_SITE | |
| TRAVELING | confirmed `travel` entry | entry end | OFF_SITE | |
| TEACHING | confirmed `teaching/class/duty` entry | entry end | entry `venue_kind` | A monk teaching in the temple is IN_TEMPLE but not free. |
| PERSONAL | `set_status` (self) or `personal` entry | yes | `location_hint` or fallback | |
| REST | `set_status` (self) | yes | IN_TEMPLE | |
| AVAILABLE | `set_status` (self only) | yes | IN_TEMPLE unless `location_hint` | Nobody else may set it. |
| IN_TEMPLE | `check_in` | TTL | IN_TEMPLE | Only if the temple and the monk enabled check-in (master open question Q3). |
| UNKNOWN | none | n/a | UNKNOWN | |

Table-vs-prose note: master §4.1 says manual states "carry mandatory end time"; §4.2 says the default
`valid_until` is end of the local day. Reading adopted: the **stored row** always has an end; the **command** fills
the default when the user gives none (section 8).

## 5. Location

`location_state` is computed independently of `effective_status`:
1. If the winning signal implies a location (table above, not "none"), use it.
2. Else if a manual row with a `location_hint` is active and newer than the latest fresh check-in, use the hint.
3. Else if a fresh check-in exists, `IN_TEMPLE`.
4. Else `UNKNOWN`.

Consequence: a monk in UNAVAILABLE (hard block) with no hint and no check-in has `location_state = UNKNOWN` even if
a ceremony is also scheduled. The resolver does not infer location from lower-priority commitments (HYPOTHESIS;
simple and explainable; revisit with Agent 07 if the board needs it).

## 6. Conflicts

`Conflict = {type, severity, refs[], overlap_from, overlap_to, action_owner = "secretary"}`.

| Type | Definition | Source |
|---|---|---|
| `MANUAL_BLOCK_OVER_COMMITMENT` | A manual `UNAVAILABLE`, `PERSONAL` or `REST` row overlaps an entry mapped to CEREMONY, ON_INVITATION, TRAVELING or TEACHING. | master §4.2 |
| `DOUBLE_BOOKED` [EXT] | Two or more distinct confirmed calendar entries overlap. | not in master; unavoidable once entries from several sources exist |

- `severity = HIGH` if either side is UNAVAILABLE, CEREMONY or ON_INVITATION; else `MEDIUM`.
- An opt-in `AVAILABLE` overlapping a commitment is **not** a conflict; it is simply outranked.
- `resolve()` reports conflicts whose overlap contains `at`. A separate `detect_conflicts(person|all, from, to)`
  returns every overlap intersecting the range (used by the secretary board and by the invitation confirm guard).
- Conflicts are visible only to holders of `availability.set_others` (T) and the monk himself (section 9).
- Resolving a conflict is a human act (edit the entry, shorten the block, or accept); the system never edits either
  side.

## 7. Expiry, check-in, time zone

- **Manual expiry.** An expired manual row contributes nothing (`ignored: EXPIRED`). The status falls to the next
  signal, usually `UNKNOWN`.
- **Default `valid_until`** when omitted by the command: the next local 00:00 after `now`
  (`end_of_local_day`). If `now` is exactly 00:00 local, the end is `now + 24h`.
- **Caps** (HYPOTHESIS defaults): AVAILABLE, PERSONAL, REST at most `max_manual_hours` = 24 h from now;
  UNAVAILABLE at most `max_unavailable_days` = 120 days. Beyond cap -> `VALID_UNTIL_TOO_FAR`. `valid_until <= now`
  -> `VALID_UNTIL_IN_PAST`.
- **Check-in TTL.** Default 12 h (master). Fresh iff `at < checked_at + ttl`: at exactly `checked_at + ttl` the signal is
  stale. `check_out` ends the signal at `checked_out_at`. The server records `checked_at` from its own clock; client
  time is ignored. A QR/NFC code must belong to a building of the same temple; otherwise `QR_FOREIGN_TEMPLE`.
- **Midnight boundary.** A manual row ending at local 00:00 is already expired at 00:00:00. A calendar entry that
  crosses midnight is active on both sides of it. Day-based rules (streaks) use the local date of the instant.
- **Time zone input.** Any ISO-8601 input with an offset or `Z` is converted to an instant; the Bangkok calendar date
  is computed only after conversion (case AV-27).

## 8. Commands, authority and who may set what

Permission codes and scopes from `docs/master/ROLE_PERMISSION_MATRIX.md`.

| Command | Permission (scope) | Allowed states | Rules |
|---|---|---|---|
| `set_status(self)` | `availability.set_self` (S) | UNAVAILABLE, PERSONAL, REST, AVAILABLE | Monastics only (matrix: abbot...samanera). Defaults and caps in section 7. |
| `set_status(other)` | `availability.set_others` (T) | **UNAVAILABLE only** | Admin may block a sick monk. Admins may never set AVAILABLE (opt-in must be the monk's own act), PERSONAL or REST. Target must be an active monastic of the same temple. Row has `set_by_kind = ADMIN`. |
| `clear_status` | self for own SELF rows; `availability.set_others` (T) for any row | n/a | Clearing sets `truncated_at = now`; rows are never deleted (audit). |
| `check_in` / `check_out` | **gap G-A1**: no permission code | n/a | Self action of a monastic with check-in enabled. Recommend `availability.set_self`-like baseline or a new `presence.checkin`. |
| `manage_schedule_entry` | `schedule.manage` — **gap G-A2**: code exists in the catalog but has no row in the matrix | n/a | Needed to create ceremony/teaching/class/duty entries. Proposed grant in REPORT. |
| `view_availability` | `availability.view` (T, T³ coarse, T⁴ counts, A) | n/a | Section 9. |
| `view_conflicts` | `availability.set_others` (T) holders, plus the monk for his own | n/a | Derived rule; matrix has no `conflict.view`. |

Calendar-driven states are never writable via `set_status`: `CALENDAR_STATE_NOT_SETTABLE`.

**Supersession (stop-condition note).** Master §4.2 applies pure priority, so a monk who set REST until 15:00 and
then, at 14:00, sets AVAILABLE would still resolve to REST (rank 7 beats rank 8). Two readings:
- Reading A (strict): rank always wins; the monk must clear REST first. Predictable but user-hostile.
- Reading B (recommended, used in this spec): creating a new SELF manual row truncates (`truncated_at = new.valid_from`)
  every overlapping SELF row of the same person. ADMIN rows are never truncated by SELF rows.
Cases AV-34 and AV-35 encode B. If the Opus review picks A, those two cases flip to `REST`.

## 9. Visibility

| Viewer | Matrix | What they see |
|---|---|---|
| abbot, deputy, assistant, secretary | T | Full result: status, location, conflicts, reason codes (including SICK). |
| office_staff, ceremony_lead | T | Recommended **operational tier** (HYPOTHESIS): status and location; manual reason codes masked to "ไม่พร้อม"; no conflicts. Matrix grants T without saying which tier: gap G-A3. |
| bhikkhu | T³ | **Coarse only**: FREE (AVAILABLE), BUSY (all others except next), UNKNOWN (UNKNOWN and IN_TEMPLE). No reason, no location, no conflicts. IN_TEMPLE maps to UNKNOWN because presence is not an opt-in to be free. |
| kitchen_lead | T⁴ | Aggregate counts only (`location.in_temple`, total). |
| driver | A | Only monks on his own assigned trips: name and the trip window. |
| samanera and all others | — | None (Command Center requires its own permission). |
| the monk himself | S | Everything about himself. |

## 10. Command Center counters

`snapshot(temple_id, at)`; every person is resolved with the **same** `at`.

Population: ACTIVE memberships in the temple with `person.monastic_kind ∈ {bhikkhu, samanera}`, including
`visiting` ones (reported again as `of_which_visiting`). SUSPENDED, ENDED, INVITED are excluded.

| Counter (Thai) | Definition |
|---|---|
| `total` (พระและสามเณรทั้งหมด) | `bhikkhu_total + samanera_total` |
| `bhikkhu_total` (พระทั้งหมด) | population with `bhikkhu` |
| `samanera_total` (สามเณรทั้งหมด) | population with `samanera` |
| `status.AVAILABLE` (ว่าง) | `effective_status = AVAILABLE` |
| `status.ON_INVITATION` (ออกกิจนิมนต์) | as named |
| `status.TEACHING` (กำลังสอน), `status.CEREMONY` (ทำพิธี), `status.TRAVELING` (เดินทาง) | as named |
| `status.not_ready` (ไม่พร้อม) | `UNAVAILABLE + PERSONAL + REST`, with breakdown on tap |
| `status.IN_TEMPLE` (อยู่ในวัด-ยังไม่มีสถานะ) [EXT label] | `effective_status = IN_TEMPLE` |
| `status.UNKNOWN` (ไม่ทราบ) | always displayed, never hidden or folded |
| `location.in_temple` (อยู่ในวัด) | `location_state = IN_TEMPLE` (this is the master's "อยู่ในวัด") |
| `location.off_site`, `location.unknown` | as named |

Master gap (carried to REPORT): master §4.3 lists "อยู่ในวัด" by location, which overlaps the status counters, and
has no tile for `effective_status = IN_TEMPLE`; its sum invariant therefore cannot hold as written. This spec keeps
two independent partitions.

Invariants (each is a dashboard test):
- **CC-1** sum over the ten `effective_status` values = `total`.
- **CC-2** `location.in_temple + location.off_site + location.unknown = total`.
- **CC-3** `bhikkhu_total + samanera_total = total`.
- **CC-4** `status.not_ready = UNAVAILABLE + PERSONAL + REST`.
- **CC-5** each person appears in exactly one status bucket and one location bucket.
- **CC-6** a person whose resolution raises an error is counted `UNKNOWN`/`UNKNOWN`, `data_quality.errors` is
  incremented and shown; the person is never dropped.
- Output carries `computed_at`; the UI shows age and flags it when older than 60 s (HYPOTHESIS).
- Counters are traceable: `snapshot_detail(status)` lists persons (subject to section 9 visibility).

## 11. Cases (`AV`)

Conventions: temple T1; `ttl = 720 min`; check-in enabled; M1, M2 bhikkhu, N1 samanera, L1 lay; date
`D = 2026-10-07` (Wednesday); times are `HH:MM` local (+07:00) on D unless a date is written as `10-08`.
Result notation: `status / location / conflicts / key reason`.

### 11.1 Resolver

| ID | Given | When | Then |
|---|---|---|---|
| AV-01 | M1 has no rows | resolve at 10:00 | UNKNOWN / UNKNOWN / [] / NO_VALID_SIGNAL, next_change_at null |
| AV-02 | check-in 08:00 (qr) | at 10:00 | IN_TEMPLE / IN_TEMPLE / [] / WINNER_CHECKIN, valid_until 20:00, next_change_at 20:00 |
| AV-03 | check-in 08:00 | at 20:00:00 (exactly +12 h) | UNKNOWN / UNKNOWN / [] / ignored `[{checkin, STALE}]` |
| AV-04 | check-in 08:00 | at 19:59:59 | IN_TEMPLE / IN_TEMPLE / [] |
| AV-05 | manual AVAILABLE 08:00-12:00, no check-in | at 10:00 | AVAILABLE / IN_TEMPLE / [] / WINNER_MANUAL |
| AV-06 | same row | at 12:00:00 | UNKNOWN / UNKNOWN / [] / ignored `[{row, EXPIRED}]` (never defaults to AVAILABLE) |
| AV-07 | AVAILABLE 08:00-12:00 and check-in 08:00 | at 10:00 | AVAILABLE / IN_TEMPLE / [] / contributing `[checkin]` (rank 8 beats 9) |
| AV-08 | manual REST 13:00-15:00 | at 14:00 | REST / IN_TEMPLE / [] |
| AV-09 | PERSONAL 09:00-11:00, hint OFF_SITE | at 10:00 | PERSONAL / OFF_SITE / [] |
| AV-10 | PERSONAL 09:00-11:00, no hint, no check-in | at 10:00 | PERSONAL / UNKNOWN / [] |
| AV-11 | PERSONAL 09:00-11:00, no hint; check-in 08:00 | at 10:00 | PERSONAL / IN_TEMPLE / [] (location from fresh check-in) |
| AV-12 | UNAVAILABLE (reason SICK) set by secretary, valid 10-07 07:00 to 10-09 00:00 | at 10-08 10:00 | UNAVAILABLE / UNKNOWN / [] / WINNER_MANUAL |
| AV-13 | confirmed `teaching` entry 09:00-10:30, venue IN_TEMPLE | at 09:30 | TEACHING / IN_TEMPLE / [] (counts as in temple, not free) |
| AV-14 | confirmed `ceremony` 07:00-08:30, venue IN_TEMPLE | at 07:00:00, then at 08:30:00 | CEREMONY / IN_TEMPLE; then UNKNOWN / UNKNOWN (start inclusive, end exclusive) |
| AV-15 | confirmed `ceremony` 15:00-17:00, venue OFF_SITE | at 16:00 | CEREMONY / OFF_SITE / [] |
| AV-16 | confirmed `invitation` 10:00-12:00 | at 11:00 | ON_INVITATION / OFF_SITE / [] |
| AV-17 | `travel` 09:15-10:00, `invitation` 10:00-12:00, `travel` 12:00-12:45 | at 09:59:59; 10:00:00; 12:00:00 | TRAVELING / OFF_SITE; ON_INVITATION / OFF_SITE; TRAVELING / OFF_SITE |
| AV-18 | as AV-17 | at 13:00 (inside a 30 min return buffer) | UNKNOWN / UNKNOWN / [] (buffer is not a status) |
| AV-19 | `ceremony` 10:00-11:30 (IN_TEMPLE) and `invitation` 11:00-13:00 | at 11:15 | CEREMONY / IN_TEMPLE / `[DOUBLE_BOOKED, HIGH, overlap 11:00-11:30]` |
| AV-20 | manual UNAVAILABLE 08:00-18:00 (self, SICK) and `ceremony` 10:00-11:00 IN_TEMPLE | at 10:30 | UNAVAILABLE / UNKNOWN / `[MANUAL_BLOCK_OVER_COMMITMENT, HIGH]`; the ceremony entry remains CONFIRMED (not cancelled) |
| AV-21 | manual PERSONAL 09:00-12:00 (no hint) and `teaching` 10:00-11:00 IN_TEMPLE | at 10:30; at 09:30 | TEACHING / IN_TEMPLE / `[MANUAL_BLOCK_OVER_COMMITMENT, MEDIUM]`; PERSONAL / UNKNOWN / [] (no overlap at that instant; `detect_conflicts(09:00-12:00)` still reports it) |
| AV-22 | manual REST 12:00-16:00 and `invitation` 13:00-15:00 | at 14:00 | ON_INVITATION / OFF_SITE / `[MANUAL_BLOCK_OVER_COMMITMENT, HIGH]` |
| AV-23 | manual AVAILABLE 08:00-18:00 and `teaching` 10:00-11:00 IN_TEMPLE | at 10:30 | TEACHING / IN_TEMPLE / [] / ignored `[{AVAILABLE row, SUPERSEDED_BY_HIGHER_PRIORITY}]` |
| AV-24 | `teaching` 10:00-12:00 IN_TEMPLE and `travel` 11:00-12:00 | at 11:30 | TRAVELING / OFF_SITE / `[DOUBLE_BOOKED, MEDIUM]` |
| AV-25 | at 20:00 M1 sets AVAILABLE with no end | read row; at 23:59:59; at 10-08 00:00:00 | row `valid_until = 10-08 00:00`; AVAILABLE; then UNKNOWN |
| AV-26 | `ceremony` 10-07 22:00 to 10-08 02:00, venue OFF_SITE | at 10-08 00:30; at 10-08 02:00:00 | CEREMONY / OFF_SITE; UNKNOWN |
| AV-27 | AVAILABLE valid until `2026-10-08T00:00:00+07:00` | at `2026-10-07T16:59:59Z`; at `2026-10-07T17:00:00Z` | AVAILABLE; UNKNOWN (UTC input converted before comparison) |
| AV-28 | REST 09:00-10:00; check-in 06:00 | at 18:30 | UNKNOWN / UNKNOWN / [] / ignored `[{REST, EXPIRED}, {checkin, STALE}]` |
| AV-29 | `ceremony` entry 10:00-11:00 with status PROPOSED; another with status CANCELLED | at 10:30 | UNKNOWN / UNKNOWN / [] / ignored `NOT_CONFIRMED`, `CANCELLED` |
| AV-30 | M1 has no membership in T2; session active temple T2 | resolve(M1) | error NOT_A_MEMBER (identical to unknown person) |
| AV-31 | L1 lay with ACTIVE membership | resolve(L1) | error NOT_MONASTIC |
| AV-32 | server clock 10:00; client sends `check_in` claiming 18:00 | check_in, then resolve at 10:30 | row `checked_at = 10:00`; IN_TEMPLE / IN_TEMPLE |
| AV-33 | check-in 08:00, check_out 09:00 | at 08:30; at 09:30 | IN_TEMPLE; UNKNOWN / UNKNOWN / ignored `[{checkin, CHECKED_OUT}]` |
| AV-34 | M1 set REST 13:00-15:00 at 12:00; at 14:00 M1 sets AVAILABLE until 16:00 (reading B) | resolve at 14:30; at 13:30 | row REST gets `truncated_at = 14:00`; AVAILABLE / IN_TEMPLE; REST (history is preserved). Reading A would give REST at 14:30. |
| AV-35 | Secretary set UNAVAILABLE 08:00 to 10-08 00:00 (ADMIN); at 10:00 M1 sets AVAILABLE until 18:00 | at 12:00 | UNAVAILABLE / UNKNOWN / []; ignored `[{AVAILABLE, SUPERSEDED_BY_HIGHER_PRIORITY}]`; ADMIN row not truncated |
| AV-36 | secretary (set_others) | `set_status(M1, AVAILABLE)`; `set_status(M1, REST)`; `set_status(M1, UNAVAILABLE, valid_until 10-09 00:00)` | `FORBIDDEN_STATE_FOR_ACTOR`; `FORBIDDEN_STATE_FOR_ACTOR`; accepted |
| AV-37 | now 14:20; M1 `set_status(REST)` without end; again with `valid_until 10-09 00:00`; UNAVAILABLE with now+100 days; with now+130 days | four commands | row valid_until `10-08 00:00`; `VALID_UNTIL_TOO_FAR` (more than 24 h); accepted; `VALID_UNTIL_TOO_FAR` |
| AV-38 | N1 (samanera), L1 (lay), M2 (bhikkhu) | N1 `set_status(M1, UNAVAILABLE)`; L1 `set_status(L1, REST)`; M2 `set_status(M1, UNAVAILABLE)`; M1 `set_status(CEREMONY)` | all rejected: FORBIDDEN, FORBIDDEN, FORBIDDEN, `CALENDAR_STATE_NOT_SETTABLE` |
| AV-39 | M2 (bhikkhu, `availability.view` T³ coarse); M1 resolves to PERSONAL | M2 views M1; then M1 AVAILABLE; then M1 IN_TEMPLE | `{coarse: BUSY}`; `{coarse: FREE}`; `{coarse: UNKNOWN}`; no reason, location or conflicts in any response |
| AV-40 | five monastics: M1 bhikkhu AVAILABLE; M2 bhikkhu TEACHING (IN_TEMPLE); M3 bhikkhu ON_INVITATION; M4 samanera REST; N5 samanera no signal | snapshot at 10:30 | total 5 (bhikkhu 3, samanera 2); AVAILABLE 1, TEACHING 1, ON_INVITATION 1, REST 1, UNKNOWN 1, others 0; not_ready 1; location in_temple 3 (M1, M2, M4), off_site 1, unknown 1; CC-1..CC-5 hold |
| AV-41 | AV-40 plus M6 visiting bhikkhu ACTIVE with fresh check-in, M7 SUSPENDED, M8 visiting membership ENDED | snapshot | total 6, `of_which_visiting` 1, status.IN_TEMPLE 1; M7 and M8 absent; CC-1 sum = 6 |
| AV-42 | AV-40 where M3's resolution raises an internal error | snapshot | M3 counted UNKNOWN/UNKNOWN; `data_quality.errors = 1`; ON_INVITATION 0, UNKNOWN 2; CC-1 sum = 5 |
| AV-43 | M1 also has an ACTIVE membership in T2 with `ceremony` 10:00-11:00 in T2 | resolve(M1) in T1 at 10:30 | UNKNOWN / UNKNOWN / [] (T2 data never visible in T1); documented limitation OQ-A3 |
| AV-44 | AVAILABLE 08:00-12:00 and `teaching` 10:00-11:00 | resolve at 09:00; 10:30; 11:00 | `next_change_at` 10:00 (AVAILABLE); 11:00 (TEACHING); 12:00 (AVAILABLE) |
| AV-45 | two overlapping `teaching` entries 10:00-11:00 and 10:30-11:30 | at 10:45 | TEACHING / per venue / `[DOUBLE_BOOKED, MEDIUM, overlap 10:30-11:00]`; winner_ref = earlier `starts_at` |
| AV-46 | at 10:00 all of: manual UNAVAILABLE, ceremony, invitation, travel, teaching, manual PERSONAL, REST, AVAILABLE, fresh check-in | resolve; then remove the current winner and resolve again, repeatedly | UNAVAILABLE, CEREMONY, ON_INVITATION, TRAVELING, TEACHING, PERSONAL, REST, AVAILABLE, IN_TEMPLE, UNKNOWN (rank order) |
| AV-47 | check-in disabled in T1 config; fresh check-in row exists | at 10:00 | UNKNOWN / UNKNOWN (check-in ignored) |
| AV-48 | M1 has REST 13:00-15:00 | M1 `clear_status` at 13:40; resolve at 13:50; resolve at 13:30 | row `truncated_at = 13:40`, not deleted; UNKNOWN; REST |

Case count: **48** (minimum 30).

## 12. Traceability

| Spec section | Master source |
|---|---|
| §2-3 | TEMPLE_DOMAIN_MODEL §4.1-4.2 |
| §5 | §4.2 (location_state) |
| §6 | §4.2 (conflicts) |
| §7 | §4.2 (valid_until default, TTL) |
| §8 | ROLE_PERMISSION_MATRIX §3-4 (`availability.*`, `schedule.*`) |
| §9 | ROLE_PERMISSION_MATRIX notes 3, 4 |
| §10 | TEMPLE_DOMAIN_MODEL §4.3; RISK_REGISTER R-13 |

## 13. Open questions (owner)

| ID | Question | Owner |
|---|---|---|
| OQ-A1 | Are monks comfortable with check-in at all (master Q3)? Spec supports calendar + opt-in only (check-in disabled). | Agent 01 |
| OQ-A2 | Should reading A or B (section 8 supersession) apply? | Opus review |
| OQ-A3 | A monk with commitments in two temples: should a cross-temple busy signal exist without leaking detail? | Opus, Agent 13 |
| OQ-A4 | Operational tier for office_staff and ceremony_lead (section 9). | Opus |
