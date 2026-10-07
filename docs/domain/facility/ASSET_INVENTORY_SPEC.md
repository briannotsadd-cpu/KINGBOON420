# ASSET & INVENTORY SPEC

Owner: Agent 18 · Status: **DESIGNED (documentation only)** · F-22, F-23 PLANNED · Date: 2026-10-07

## 1. Assets

`assets(id, temple_id, asset_tag (human code), qr_token_hash, name_th, category, building_id, zone_id null, custodian_person_id null,
custodian_department_id null, status, acquired_on null, serial_no null, vehicle_id null, notes, photos[], value_amount (restricted),
supplier (restricted), warranty_until null, last_serviced_at, retired_at null, retire_reason)`.

- `asset_tag` = `<TEMPLE>-A-<nnnnnn>` sequential per temple, shown on the label; not secret, not the DB id.
- `category` examples: AV equipment, furniture, kitchen equipment, electrical, plumbing, tools, vehicle, safety equipment, religious object (tracked only if the temple wants).
- Value, price, supplier, purchase documents: visible only to `asset.manage` or `finance.view` (security requirement). Everyone with `asset.view` sees name, location, status, custodian.
- Religious objects and Buddha images: **HYPOTHESIS** — temples may not want them in an asset register; default category list excludes them, temple can add.

### 1.1 Lifecycle

```
REGISTERED ─label printed/attached─▶ ACTIVE ─┬─ checkout ─▶ IN_USE (custody to person) ─ return ─▶ ACTIVE
                                             ├─ fault ─▶ NEEDS_REPAIR ─ work order closed ─▶ ACTIVE
                                             ├─ send out ─▶ OUT_FOR_REPAIR ─▶ ACTIVE
                                             ├─ lost ─▶ MISSING ─ found ─▶ ACTIVE / ─ confirm ─▶ WRITTEN_OFF
                                             └─ retire (reason) ─▶ RETIRED (terminal; history kept)
```
`status` changes are rows in `asset_events(asset_id, from, to, actor, reason, at)`, append-only. Retired assets are never deleted.
`NEEDS_REPAIR` can be set automatically by a maintenance request with severity ≤ S2 against the asset (MAINTENANCE_SPEC) and reverts on close.

## 2. QR codes

- A label encodes `https://<app-domain>/q/<token>` where `<token>` is a **random 128-bit value (URL-safe, ≥ 22 chars)**.
  It contains no database id, temple id, sequence number, name, or value. Only the **hash** of the token is stored (`qr_token_hash`).
- Token is per asset; **rotation** (re-issue label) invalidates the old token; lost/stolen label handled by rotation.
- Resolving a token **requires login and an active membership in the owning temple**. The server derives `temple_id` from the token's row and
  then checks membership. Unauthenticated or other-temple users get the same generic response ("ไม่พบรายการ / not found"), no hint that it exists.
  (Rate limited; enumeration attempts logged.)
- QR payload is not a credential; it grants nothing without the role check. The same token cannot be used for check-in (separate
  QR family, Agent 17/02 own check-in) — different URL prefix so scanning the wrong type is harmless.

### 2.1 Scan flows

| Flow | Actor | Steps | Result |
|---|---|---|---|
| Identify | any member with `asset.view` | scan → asset card (name, location, status, custodian, last service) | read only |
| Report problem | any `maintenance.report` | scan → "แจ้งซ่อม" prefilled with asset + building → add photo → submit | maintenance_request `source = qr_scan` |
| Checkout / return | custodian-capable roles (`asset.manage`, or A-scope assigned) | scan → "รับ/คืน" → confirm | custody event; status IN_USE / ACTIVE |
| Audit / stocktake | facility_manager | open stocktake session (list of expected assets in a building) → scan each → mismatches listed | Found / Not found report; no automatic write-off |
| Service log | technician (A scope) | scan → add service note and close linked work order | repair history |

## 3. Custody

`asset_custody(asset_id, person_id | department_id, from, to null, handed_by, note)`; one open row at most. Handover requires both sides to be
active members in the same temple (or the handing-over manager acts on behalf with a reason). Leaving staff: membership end triggers a
"custody to review" task for facility_manager; the system never auto-reassigns.

## 4. Inventory (consumables and stock)

`inventory_items(id, temple_id, sku_code, name_th, unit, category, location_building_id, location_zone_id null, reorder_point, reorder_qty null,
status ACTIVE|INACTIVE, owner_department_id)`.
`inventory_movements(id, temple_id, item_id, movement_type, qty_signed numeric, unit_cost (restricted), reason, ref_type, ref_id, actor, occurred_at, idempotency_key)`.

- **Append-only ledger.** `on_hand = SUM(qty_signed)` per item (view, never a stored editable column). Corrections are new rows
  (`adjustment`) with mandatory reason; rows are never updated or deleted.
- `movement_type ∈ {receive, issue, return, adjustment, transfer_out, transfer_in, write_off}`. `issue` qty < 0, `receive` qty > 0.
- Issuing more than `on_hand` is **rejected** (default) unless an `asset.manage`-level user records an adjustment first; negative stock is never silently allowed.
- Issue may reference a quest (kitchen prep, cleaning, event task) via `ref_type/ref_id`, so event consumption is traceable (Agent 19).
- Kitchen: department scope D read (`inventory.view` D) and issue by `kitchen_lead` (`inventory.manage` D); technician/housekeeper view D only.
- Costs: restricted to `asset.manage`/`finance.view`.
- Stock counts: a count session writes `adjustment` rows for differences with the count as `ref`.

### 4.1 Low-stock rule

An item is **LOW** when `on_hand <= reorder_point` and `reorder_point` is set. **OUT** when `on_hand <= 0`. If `reorder_point` is null the item is
**Unknown threshold** — it never shows as OK or LOW. Alerts go to the owner department's lead (kitchen_lead for kitchen items) and
to facility_manager, once per crossing (dedup by item + crossing time; re-armed when stock rises above the point). Shopping-list quest
is a draft the human approves (AI/automation drafts only, humans approve). Event-driven reservations (planned consumption by an upcoming event) are **HYPOTHESIS**, not in v1.

## 5. Security

| Data | Who |
|---|---|
| Asset name, location, status, custodian | `asset.view` (scope per matrix) |
| Value, supplier, cost, purchase docs | `asset.manage` or `finance.view` only |
| QR token plaintext | shown once at label generation; afterwards only hash |
| Stock quantities | `inventory.view` scope |
| Unit costs | `asset.manage`/`finance.view` |
Every tenant row has `temple_id`; all queries filter by active-membership temple; token resolution also derives and checks temple.

## 6. Test cases

| ID | Scenario | Expected |
|---|---|---|
| AS-01 | Register asset, generate label | Token shown once; DB stores hash only; tag `<TEMPLE>-A-nnnnnn` |
| AS-02 | Scan label while logged out | Login prompt; after login as non-member returns generic "not found" |
| AS-03 | Scan label of temple A as member of temple B only | Generic "not found"; attempt logged; no temple name leaked |
| AS-04 | Scan → report problem | Request prefilled with asset+building; `source = qr_scan` |
| AS-05 | Checkout to a person then return | Custody rows open/close; status IN_USE → ACTIVE; one open custody max |
| AS-06 | Rotate token | Old QR fails (not found); new works; audit row |
| AS-07 | Technician views asset | Value/supplier fields absent from API response (not just hidden) |
| AS-08 | Staff member leaves temple with custody | Review task created for facility_manager; no auto reassignment |
| AS-09 | Stocktake in building | Missing assets listed as Not found; none written off automatically |
| AS-10 | Retire asset | Terminal; history stays; cannot be checked out |
| IV-01 | Receive 20, issue 5 | on_hand 15 from ledger sum; two rows |
| IV-02 | Issue 30 with on_hand 15 | Rejected; no row written |
| IV-03 | Correction | Adjustment row with reason; original rows untouched |
| IV-04 | Reorder_point 10, on_hand drops 12 → 9 | LOW once; alert to kitchen_lead and facility_manager; rises to 15 re-arms |
| IV-05 | Item with no reorder_point | Shows "Unknown threshold", never OK |
| IV-06 | Duplicate request with same idempotency_key | One movement only |
| IV-07 | Transfer between buildings | Paired out/in rows; total on_hand unchanged |
| IV-08 | Housekeeper tries to adjust stock | Denied (no `inventory.manage`) |

Readiness: **DESIGNED**. Not implemented or tested.
