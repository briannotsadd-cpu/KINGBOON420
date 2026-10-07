# 3D ASSET BRIEF — Wat Arun vertical slice (owner-built)

From `docs/master/3D_STRATEGY.md` and `docs/domain/facility/SPATIAL_REGISTRY_SPEC.md`. Stylized, not a survey-accurate replica.

## Deliverable
- Format: **glTF 2.0 binary (`.glb`)**, Y-up, metres, origin at the centre of the main prang base.
- One node per building, **named exactly by building code**:
  `WAT-ARUN.PRANG.MAIN`, `WAT-ARUN.PRANG.SAT-01` … `SAT-04`, `WAT-ARUN.MANDAPA.01` … `04`, `WAT-ARUN.UBOSOT`,
  plus ground/river as `WAT-ARUN.GROUND`, `WAT-ARUN.RIVER`. Extra decoration under these nodes, not at root.
- Per building: an empty child `marker_anchor` (where quest/event/maintenance pins float) and `camera_target`.
- LOD: `<code>_LOD0` (full) and `_LOD1` (~25% triangles) as sibling meshes.

## Budgets
| | BALANCED (mid Android) | ULTRA |
|---|---|---|
| Triangles, whole scene | ≤ 300 k | ≤ 1.5 M |
| Materials | ≤ 20 shared | ≤ 40 |
| Textures | ≤ 1024² (KTX2 after export), baked lighting | ≤ 2048² |
| File size after compression | ≤ 5 MB | ≤ 15 MB |

## Licence (required before use)
Add a row to `assets/3d/LICENSES.md`: author (you), date, tools, reference sources (own photos from public areas
only; no downloaded models or scans), licence granted to the project. Heights/placements are artistic — sources conflict.

## Hand-over
Put the `.glb` in `assets/3d/wat-arun/` and the licence row in `assets/3d/LICENSES.md`; the 2D map uses the same codes.

## Notes after first build (Opus, 2026-10-07)
- Code reconciliation: the registry draft uses `WAT-ARUN.UBOSOT.MAIN`; this brief said `WAT-ARUN.UBOSOT`. **The registry
  wins** — rename the node in the generator at the next model iteration.
- three.js `GLTFLoader` strips dots from node names. Wave 5 must also write the building code into each node's glTF
  `extras` (`userData.buildingCode`) and look nodes up by that, not by name.
- Art follow-ups: tropical trees instead of conifers; rounder, ribbed prang profile.
