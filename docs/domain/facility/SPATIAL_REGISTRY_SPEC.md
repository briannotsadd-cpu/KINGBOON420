# SPATIAL REGISTRY SPEC — Buildings, Zones and Scene Manifest

Owner: Agent 18 (Facility / Asset) · Status: **DESIGNED (documentation only; no schema or code exists)** · Date: 2026-10-07
Reads: `docs/master/TEMPLE_DOMAIN_MODEL.md` §7, `docs/master/3D_STRATEGY.md` §2, `docs/master/ROLE_PERMISSION_MATRIX.md`.
Consumers: Agent 05 (3D/2D map, Wave 2), Agent 03 (UX), Agent 08 (schema), Agent 19 (event venues), Agent 17 (zones for cleaning/garden).

## 1. Principle

One spatial model, three renderers (ULTRA 3D / BALANCED 3D / LITE 2D SVG). The **building `code`** is the only key shared by
data, 2D map and 3D scene. The Core System works with 3D disabled (3D_STRATEGY §1). Every action reachable from a map
marker is also reachable from a list (the "building list" is a first-class screen, not a fallback afterthought).

## 2. Entities

All rows carry `temple_id` (cross-temple leakage is P0). Field names are proposals for Agent 08, not a schema.

### 2.1 `buildings`
| Field | Type | Notes |
|---|---|---|
| `id` | uuid | internal; never exposed in QR, manifest, or public URLs |
| `temple_id` | uuid | tenant |
| `code` | text | stable, unique per temple, see §3. **Immutable after creation.** |
| `name_th`, `name_en` | text | display names; `name_th` required |
| `kind` | enum | `PRANG, UBOSOT, VIHARA, MANDAPA, SALA, KUTI, BELL_TOWER, GATE, PIER, OFFICE, KITCHEN, TOILET, PARKING, GARDEN_AREA, STORAGE, OTHER` |
| `parent_building_id` | uuid null | e.g. a mandapa belonging to a prang group |
| `status` | enum | `ACTIVE, CLOSED_TEMPORARILY, UNDER_RENOVATION, RETIRED` (never deleted; retired keeps history) |
| `public_visibility` | enum | `PUBLIC, STAFF_ONLY, MONASTIC_ONLY` — controls whether the building appears on the public map at all |
| `source_note` | text | where the registry entry came from (temple confirmation, public reference) |
| `confirmed_by_temple_at` | timestamptz null | null = **unconfirmed draft** (shown with "รอวัดยืนยัน" badge to managers only) |

Dimensions, floor area, GPS: **optional, nullable, and null means Unknown**. Never populated from guesses.

### 2.2 `zones`
Subdivisions of a building or open ground, the unit for cleaning/garden assignment.
`id, temple_id, code, building_id null, name_th, kind (INTERIOR, EXTERIOR, COURTYARD, GARDEN, RIVERFRONT, PARKING, PATH), status`.
Zone code = `<building code>.Z<nn>` or `<TEMPLE>.ZONE.<NAME>` for ground not inside a building.

### 2.3 `scene_manifests`
One active manifest per temple per `schema_version` (§4). Stored as versioned JSON; every edit creates a new `revision`
(append-only). The manifest never contains business data (no counts, no statuses), only geometry/anchors.

## 3. Code naming convention

```
<TEMPLE>.<KIND>.<NAME>[.<QUALIFIER>]          buildings
<building code>.Z<nn>                         zones inside a building
<TEMPLE>.ZONE.<NAME>                          open-ground zones
```
- Segments are `UPPERCASE ASCII A-Z 0-9`, with `-` allowed inside a segment; separator is `.`.
- Regex: `^[A-Z0-9]+(-[A-Z0-9]+)*(\.[A-Z0-9]+(-[A-Z0-9]+)*){1,4}$`, max 64 chars.
- `<TEMPLE>` is the temple slug (e.g. `WAT-ARUN`), assigned once at tenant creation.
- `<KIND>` is one of the `kind` enum values with `_` replaced by `-` (e.g. `BELL-TOWER`).
- `<NAME>` is a short romanised English token (`MAIN`, `NE`, `NORTH`, `OLD`...). Directional qualifiers use compass
  points of the *real site*; if orientation is not confirmed by the temple, use ordinal qualifiers (`01`, `02`) instead.
- Codes are **never reused**, even after RETIRED. Renaming a building changes `name_*`, never `code`.
- Example (from the master model): `WAT-ARUN.PRANG.MAIN`. See `WAT_ARUN_REGISTRY_DRAFT.md` for the draft list.

## 4. Scene manifest JSON contract (v1)

```json
{
  "schema_version": "1",
  "temple_code": "WAT-ARUN",
  "revision": 3,
  "published_at": "2026-10-07T00:00:00+07:00",
  "units": "meters",
  "provenance": "PLACEHOLDER | COMMISSIONED | TEMPLE_CAPTURE | LICENSED",
  "map2d": {
    "viewBox": [0, 0, 1600, 1000],
    "base_asset": "map2d/base.svg",
    "north_deg": null
  },
  "camera_presets": {
    "overview":   { "position": [x, y, z], "target": [x, y, z], "fov": 45 },
    "riverfront": { "position": [x, y, z], "target": [x, y, z], "fov": 45 }
  },
  "buildings": [
    {
      "code": "WAT-ARUN.PRANG.MAIN",
      "node_name": "bld_prang_main",
      "lod_nodes": ["bld_prang_main_lod0", "bld_prang_main_lod1", "bld_prang_main_lod2"],
      "polygon2d": [[x, y], [x, y], [x, y]],
      "label_anchor2d": [x, y],
      "marker_anchor3d": [x, y, z],
      "camera_preset": "prang_main_focus",
      "zones": [
        { "code": "WAT-ARUN.PRANG.MAIN.Z01", "polygon2d": [[x, y]], "node_name": null }
      ]
    }
  ]
}
```

Rules:
1. `code` must exist in `buildings` for the same temple. **Validation at publish:** every manifest building code
   resolves; every ACTIVE building *may* be absent from the manifest (it then appears in lists and as a "no map position"
   row, never silently dropped); no polygon self-intersects; every `camera_preset` reference resolves.
2. `node_name` is the glTF node name in the 3D asset; null is allowed for LITE-only temples. `polygon2d` is required
   for any building shown on the LITE map.
3. Coordinates in the manifest are scene-local units, **not GPS**. Real-world lat/lon, if ever stored, live on
   `buildings.geo` (nullable) and come only from the temple or an authoritative survey.
4. `provenance = PLACEHOLDER` makes every renderer show a visible "แบบจำลองชั่วคราว / placeholder" label
   (3D_STRATEGY §5).
5. The manifest is served to any member of the temple with `asset.view` or public-map access; it carries no data
   beyond geometry, so it is safe to cache. Per-building status comes from a separate marker query (§5).
6. Unknown codes in a client-cached manifest are ignored by the renderer (forward compatible). Unknown fields are
   preserved. A schema_version bump is additive within a major.

## 5. Marker derivation rules

Markers are **computed from data at read time** and attached by building (or zone) code. No marker position is stored
in UI code or in the manifest. Output row: `{ building_code, zone_code?, layer, count, top_severity, top_label, deeplink }`.

| Layer | Source rows | Included when | Severity / state | Visible to |
|---|---|---|---|---|
| `maintenance` | `maintenance_requests` joined to quest | request status not in `CLOSED, REJECTED, CANCELLED` | `top_severity` = max severity (S1 highest); **problem flag** per MAINTENANCE_SPEC §6 | `asset.view` or `maintenance.report` roles; public never |
| `event` | events (Agent 19) whose venue building = code, window overlaps `[now-2h, now+7d]` | event status PLANNED..IN_PROGRESS | readiness band from Agent 19 (not computed here) | per event visibility (public events visible on public map) |
| `quest` | quests with `location.building_id` = code, not terminal, due within today/next 24 h | `quest.view` scope of the viewer | count only on the map; titles in the sheet, subject to scope A/D/T | viewer's own scope only |
| `asset_alert` | assets in building with status `NEEDS_REPAIR`/PM overdue | overdue PM or broken | count | `asset.view` |
| `closed` | `buildings.status` ≠ ACTIVE | always | n/a | all with map access |

Rules:
- Aggregation is per viewer scope: a housekeeper (scope A) sees quest markers only for her own quests; counts never
  leak work the viewer cannot see.
- A zone-level marker rolls up to its building marker (count sum, max severity) and is shown separately only when
  the camera/zoom is on that building.
- If a layer's source is unavailable the marker layer shows **Unknown** (grey), never zero.
- Deep links go to list screens first (`/facility/buildings/{code}`); the same URL works from the 3D click, the 2D
  polygon tap, and the list row.

## 6. Building sheet (side sheet / page)

Opened from any renderer or the list; identical data in all three. Sections and sources:

| Section | Content | Source | Permission / scope |
|---|---|---|---|
| Header | name_th/en, code, kind, status, "รอวัดยืนยัน" badge if unconfirmed | `buildings` | map access |
| Event | events using this building today / next 7 days, readiness band | Agent 19 events | event.view (public events for public) |
| Quest | open quests located here (count, top 5 by priority) | quests | quest.view scope |
| People count | people **checked in** to this building/zone now (count only) | check-ins (Agent 17/02) — **Unknown if no check-in data**, never estimated | `member.view` ≥ D or `command_center.view`; monastics counted without names unless permitted |
| Maintenance | open requests with severity, age, SLA state; problem flag | maintenance_requests | `maintenance.report`/`asset.view` |
| Assets | assets located here, grouped by category, status | assets | `asset.view` (scope A for assigned) — **no value/price fields** (needs `asset.manage`/`finance.view`) |
| Readiness | building readiness for the next event here: open S1/S2 requests = 0, required assets present, cleaning quest done | derived (Agent 19 gates + facility facts) | event.view |
| Zones | zone list with cleaning/garden status | zones + quests | scope |
| History | repair history (last 10) | maintenance_requests closed | `asset.view` |

## 7. North-star mapping (facility questions to exact fields)

| Question | Answer derivation |
|---|---|
| "อาคารไหนมีปัญหา?" | `buildings` where problem flag = true (open requests with `severity_rank <= threshold`, default S2 and above; MAINTENANCE_SPEC §6); marker layer `maintenance`; fields `maintenance_requests.severity, status, building_id` |
| "รถคันไหนว่าง?" | `vehicles.status = AVAILABLE` AND no overlapping `trips.window` or `vehicle_blocks` for the queried interval (VEHICLE_TRIP_SPEC §6); Unknown when a vehicle has no state signal |
| "ต้องออกกี่โมง?" | `trips.planned_departure_at` computed from `invitations.start_at` (Agent 02), `leg.estimated_duration`, buffers (VEHICLE_TRIP_SPEC §5); Unknown if no estimate and no manual override |
| "จุดไหนมีปัญหา?" | zone/building markers with maintenance or `asset_alert`; fields `maintenance_requests.zone_id`, `assets.zone_id`, `buildings.code` |

## 8. Acceptance cases (spatial)

| ID | Case | Expected |
|---|---|---|
| SR-01 | Create building with a code violating the regex | Rejected with field error |
| SR-02 | Rename `name_th` of a building | `code` unchanged; manifest still resolves |
| SR-03 | Attempt to reuse a RETIRED building's code | Rejected |
| SR-04 | Publish manifest referencing code from another temple | Rejected; audit row |
| SR-05 | Active building missing from manifest | Appears in list with "no map position"; not dropped |
| SR-06 | 3D fails to load | LITE map and list show identical markers and sheet data |
| SR-07 | Housekeeper opens building sheet | Sees only own quests; no asset prices; maintenance read-only count |
| SR-08 | No check-in data exists | "People count" shows Unknown, not 0 |
| SR-09 | Marker query source errors | Layer shows Unknown/grey, not 0 |
| SR-10 | Unconfirmed draft building | Hidden from public map; badge for managers |
