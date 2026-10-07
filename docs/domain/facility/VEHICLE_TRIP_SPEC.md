# VEHICLE & TRIP SPEC — Vehicles, Trips, Driver Workflow

Owner: Agent 18 (vehicles, trips, driver workflow). **Agent 02 owns invitations**; this spec only references the lifecycle in
`TEMPLE_DOMAIN_MODEL.md` §6.1 (RECEIVED → REVIEWING → TEAM_PROPOSED → CONFIRMED → IN_PROGRESS → COMPLETED; DECLINED, CANCELLED).
Status: **DESIGNED (documentation only)** · F-24 PLANNED · Date: 2026-10-07.

## 1. Vehicles

`vehicles(id, temple_id, asset_id, plate_no, nickname, kind ∈ {van, sedan, pickup, minibus, boat, other}, seats_total, seats_usable_for_monks,
ownership ∈ {temple, lent_by_supporter, rented, unknown}, owner_note, status, odometer_km null, insurance_until null, inspection_until null,
default_driver_person_id null)`.
- `ownership` is explicit because ownership/liability is an open domain question (master model §11 Q4). `unknown` is allowed and shown as Unknown.
- Insurance/inspection dates are optional; if a date is past, the vehicle is shown **EXPIRED DOCS** and flagged to facility_manager. Whether an expired doc *blocks* assignment is a temple setting (default: warn, not block). **HYPOTHESIS** on legal requirements; no source used.
- Plate numbers and driver names are personal-ish data: visible to `vehicle.view` holders only.

### 1.1 Vehicle states

| State | Thai | Set by | Meaning |
|---|---|---|---|
| `AVAILABLE` | ว่าง | derived | status OK, no overlapping trip or block |
| `RESERVED` | จองแล้ว | derived from a trip in ASSIGNED/ACKNOWLEDGED within the window | planned use |
| `ON_TRIP` | กำลังเดินทาง | derived from active trip (DEPARTED..RETURNING) | in use |
| `NEEDS_REPAIR` | รอซ่อม | maintenance request severity ≤ S2 on vehicle, or driver report | not assignable (hard block) |
| `IN_SERVICE` | อยู่ระหว่างซ่อม/ตรวจ | PM or workshop block (`vehicle_blocks`) | not assignable during block |
| `UNAVAILABLE` | ไม่พร้อมใช้ | manual with mandatory end time | not assignable until `valid_until` |
| `UNKNOWN` | ไม่ทราบ | derived | no state signal (new vehicle, expired manual state) |
| `RETIRED` | เลิกใช้ | manager | terminal |
Resolution priority: RETIRED > NEEDS_REPAIR > IN_SERVICE > UNAVAILABLE > ON_TRIP > RESERVED > AVAILABLE > UNKNOWN.
"Free" requires an affirmative status record (default `OK` set at onboarding) — a new vehicle without a status is **Unknown**, never Free.
Manual states expire (`valid_until`, default end of local day, Asia/Bangkok), like monk states in the master model.

## 2. Trips

`trips(id, temple_id, invitation_id null, event_id null, purpose, vehicle_id null, driver_person_id null, status, planned_departure_at,
departure_source ∈ {computed, manual}, planned_return_at null, notes, created_from ∈ {invitation_confirmed, manual, event}, host_provides_transport bool)`.
`trip_passengers(trip_id, person_id, role ∈ {monk, samanera, attendant, other}, pickup_stop_id null, confirmed bool)`.
`trip_legs(trip_id, seq, from_place, to_place, kind ∈ {outbound, pickup, venue_shuttle, return}, planned_start_at, estimated_duration_min, estimate_source ∈ {provider, manual, unknown}, actual_start_at, actual_end_at)`.

### 2.1 Link to invitations (Agent 02)
- A trip with `invitation_id` is created only when the invitation reaches **CONFIRMED** (by an authorised human, never by AI) and the transport mode is "temple vehicle" (master model §6.1). If transport = "host provides", no trip row is created for a vehicle; an informational trip may exist with `host_provides_transport = true` and no vehicle/driver (so the driver is not notified).
- Passengers are copied from the confirmed team (monks); later changes to the team (Agent 02) update `trip_passengers` and notify the driver. The trip never changes the invitation.
- Invitation CANCELLED → trip CANCELLED automatically (reason "invitation cancelled"); invitation back to TEAM_PROPOSED/REVIEWING → trip frozen as `ON_HOLD` pending human review. Invitation start-time change → departure recomputed (§5) and driver notified.
- Facility never writes to invitation state. The only upward signal is a read model: trip status and vehicle availability exposed to Smart Monk Assignment (§6).

### 2.2 Trip lifecycle

```
PLANNED ──assign vehicle+driver──▶ ASSIGNED ──driver acknowledges──▶ ACKNOWLEDGED ──depart (start leg)──▶ DEPARTED
   │                                    │                                                   │
   └─────────cancel(reason)─────────────┴──▶ CANCELLED                        arrive at venue ▼
                                                    ARRIVED ──wait/return start──▶ RETURNING ──return to temple──▶ COMPLETED
                                                    any active ──problem──▶ DISRUPTED ──resolve──▶ previous state
                                                    PLANNED..ACK ──invitation frozen──▶ ON_HOLD
```
| Transition | Who | Rule |
|---|---|---|
| PLANNED → ASSIGNED | `vehicle.manage` (facility_manager, abbot) | vehicle must be AVAILABLE for the whole window incl. buffers; driver must not overlap another trip |
| ASSIGNED → ACKNOWLEDGED | the driver (scope A) | notification + one tap; unacknowledged T-2h raises alert |
| ACKNOWLEDGED → DEPARTED | driver | records actual departure + odometer (optional) |
| DEPARTED → ARRIVED | driver | records arrival; may trigger "monks arrived" notice to the host-contact owner (Agent 02 decides notification) |
| ARRIVED → RETURNING | driver | |
| RETURNING → COMPLETED | driver | records return odometer; unfilled → system closes after grace and marks "unconfirmed completion" |
| DISRUPTED | driver / manager | e.g. breakdown, traffic; reason mandatory; triggers replan |
| CANCELLED | manager / cascade from invitation | reason mandatory |
Each transition writes `audit_logs`. The driver's updates also create schedule signals: legs feed `TRAVELING` windows for monks (master model §4.1).

## 3. Passengers (monks)
- Passenger lists contain monastics (bhikkhu/samanera) and attendants. Capacity check: `passengers <= seats_usable_for_monks`; exceeding is blocked (hard).
- Privacy: the **driver sees names and pickup points of passengers of own trips only** (scope A) — not their availability reasons, ceremonies elsewhere, or personal status (coarse-state rule, master matrix note 3). Monks see their own trips and the driver's name/plate.
- Monastic-specific etiquette items (e.g. seating, women passengers) are **HYPOTHESIS**, not modelled; a free-text trip note exists for the secretary.

## 4. Driver home
Ordered modules (master matrix §5): **Today's trips (departure time first)** → vehicle status → report vehicle issue.
- Card per trip: departure time (bold, with Unknown shown as "ยังไม่กำหนด"), venue, passengers count and names, pickup stops, return window, host contact owner (via temple, not full private data), notes.
- Actions: Acknowledge, Depart, Arrived, Returning, Complete, Report problem (opens maintenance request `source = trip_issue`, vehicle prefilled), Call secretary.
- Pre-trip checklist (quest of type `vehicle_task`: tyres, fuel, cleanliness) is optional per temple.
- Works offline-tolerant: actions queue and sync with timestamps (conflict rule: server state wins for assignment; driver timestamps recorded as `client_at`). Detailed offline design belongs to a later wave.
- Drivers also see `vehicle.view` scope A only: their assigned vehicles and trips, nothing else.

## 5. Departure time computation

```
planned_departure_at = invitation.start_at
                       - arrival_buffer            (default 30 min before rite start)
                       - Σ leg.estimated_duration  (outbound + pickups)
                       - pickup_dwell × stops      (default 5 min per stop)
                       - traffic_margin            (default 20% of Σ travel, min 10 min)
```
All defaults are **HYPOTHESIS**, configurable per temple under settings; no data supports them.
- `estimated_duration_min` comes from (a) a routing provider (ADR pending; none selected), (b) a manual entry by the secretary or driver, or (c) **unknown**.
- If every outbound leg estimate is unknown and no manual departure is entered, `planned_departure_at` is **null and shown as Unknown ("ยังไม่กำหนด")**; the system never invents a travel time. Smart Assignment treats the trip as "needs estimate" and reports that in its reasons.
- `departure_source = manual` overrides the computed value; the computed one is retained for comparison. Recalculation on any input change re-notifies the driver and passengers' schedule entries (TRAVELING window) via Agent 02/17 interfaces.
- Return: `planned_return_at = venue_end + return_buffer + return leg` (default return buffer 15 min, HYPOTHESIS); if rite duration is Unknown the return is Unknown.
- "ต้องออกกี่โมง?" = `trips.planned_departure_at` (earliest trip of the day for the viewer's temple), Unknown when null.
- Time zone: Asia/Bangkok; trips crossing midnight are stored in UTC with local rendering.

## 6. Vehicle availability for Smart Monk Assignment
Interface (read-only function for Agent 02/F-14): `vehicle_availability(temple_id, window_start, window_end, seats_needed)` returns rows
`{ vehicle_id, state ∈ {FREE, BUSY, BLOCKED, UNKNOWN}, free_from, free_until, seats_usable, driver_available ∈ {YES, NO, UNKNOWN}, reasons[] }`.
- Window includes `arrival_buffer`, travel legs and return legs plus a turnaround buffer (default 20 min, HYPOTHESIS).
- FREE requires: vehicle state AVAILABLE, no overlapping trip/block, `seats_usable >= seats_needed`, **and** a driver with no overlapping trip/leave. No driver with a known state → `driver_available = UNKNOWN` and the result is `UNKNOWN`, not FREE.
- Driver availability reads staff presence/leave (Agent 17, F-27); until that exists, drivers are `UNKNOWN` unless manually confirmed on the trip.
- If transport = host provides, vehicle requirement is not applicable ("N/A").
- Output never includes passenger names or monk reasons; it only informs the proposal. A human still confirms (invitation.confirm).

## 7. Permissions
| Action | Permission |
|---|---|
| View vehicles/trips | `vehicle.view` (T abbot, facility_manager, office, secretary; A for driver) |
| Create/assign/cancel trips, edit vehicles | `vehicle.manage` (T abbot, facility_manager) |
| Drive actions on own trips | driver, `quest.complete`-style scope A |
| Fuel, cost, insurance policy amounts | `asset.manage`/`finance.view` only |
Secretary (`monk_secretary`) has `vehicle.view` T but not manage; trip creation from a confirmed invitation is done by the system on behalf of the confirming human and assigned by facility_manager. (Proposed master-doc clarification in REPORT.)

## 8. Test cases

| ID | Scenario | Expected |
|---|---|---|
| VT-01 | Invitation CONFIRMED, transport = temple vehicle | Trip PLANNED created with passengers; no vehicle/driver yet; facility_manager task |
| VT-02 | Invitation transport = host provides | No vehicle trip; driver not notified; informational record only |
| VT-03 | Assign van with 9 usable seats to 10 passengers | Blocked (capacity) |
| VT-04 | Assign vehicle already on overlapping trip | Blocked; conflict message |
| VT-05 | Driver acknowledges | ASSIGNED → ACKNOWLEDGED; timestamp; unacknowledged at T-2h alerts manager |
| VT-06 | Departure computed (defaults) | start 09:00, buffer 30, one 40-min leg, 1 stop (5 min), margin = max(20% x 40 = 8, 10) = 10 | `planned_departure_at` = 07:35 (09:00 - 30 - 40 - 5 - 10); test asserts exact value with fixed config |
| VT-07 | No travel estimate and no manual time | `planned_departure_at` null → "ยังไม่กำหนด"; Smart Assignment reasons include "needs estimate" |
| VT-08 | Invitation start time moved 1 h later | Departure recomputed; driver + passengers' TRAVELING windows updated; manual overrides kept but flagged |
| VT-09 | Driver reports brake fault after trip | Maintenance request S2 `trip_issue`; vehicle NEEDS_REPAIR; future ASSIGNED trips on it flagged "needs new vehicle" |
| VT-10 | Invitation CANCELLED after trip ASSIGNED | Trip CANCELLED, driver notified, vehicle released |
| VT-11 | Manual vehicle UNAVAILABLE expires | Falls to AVAILABLE only if status OK was recorded; else UNKNOWN |
| VT-12 | Vehicle without any state signal queried | Smart Assignment sees UNKNOWN, never FREE |
| VT-13 | Driver opens home | Sees only own trips today; passenger names but not availability reasons; no other drivers' trips |
| VT-14 | Breakdown mid-trip | DISRUPTED with reason; secretary alerted; replan options listed; monks' TRAVELING remains until resolved |
| VT-15 | Driver forgets to complete | Auto-closed after grace as "unconfirmed completion"; odometer blank |
| VT-16 | Cross-temple access | Driver of A cannot read trip ids of B; tests per RLS matrix |
| VT-17 | Team change after trip assigned (monk swapped) | Passengers updated; driver notified; capacity re-checked |
| VT-18 | Expired insurance on vehicle | EXPIRED DOCS warning; assignment allowed or blocked per temple setting |

Readiness: **DESIGNED**. Not implemented or tested. Routing provider and driver availability source are dependencies (see REPORT).
