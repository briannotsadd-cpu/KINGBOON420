# Wat Arun stylized 3D - build report (Agent 05, 2026-10-07)

Status: **IMPLEMENTED** (desktop software-GL render only). **Not VERIFIED on mobile** - no real device was available.

## What was built
- `assets/3d/wat-arun/generator/generate.mjs` (Node + three + GLTFExporter) writes `assets/3d/wat-arun/wat-arun-stylized.glb`.
  `npm install && npm run build`. node_modules is git-ignored; package.json + lockfile kept.
- 12 building nodes at scene root with exact brief codes: PRANG.MAIN, PRANG.SAT-01..04, MANDAPA.01..04, UBOSOT, GROUND, RIVER.
  Each has children `<code>_LOD0`, `<code>_LOD1`, `marker_anchor`, `camera_target`. Y-up, metres, origin = centre of main prang base.
- Decoration (corner mini-prangs, niches, trees, piers) lives inside each building's meshes, never at root.
- Style: warm-white tiers with random porcelain-mosaic vertex colours (blue/teal/terracotta/rose), gold accents,
  terracotta roofs. 9 shared materials, all vertex-coloured, no textures.
- Note: UBOSOT node is named `WAT-ARUN.UBOSOT` per the brief (registry draft uses `UBOSOT.MAIN`; reconcile in the registry).

## Verification (`npm run verify`, BALANCED budgets)
```
Root nodes: WAT-ARUN.PRANG.MAIN, WAT-ARUN.PRANG.SAT-01, WAT-ARUN.PRANG.SAT-02, WAT-ARUN.PRANG.SAT-03, WAT-ARUN
WAT-ARUN.PRANG.MAIN      OK   LOD0=  1948 LOD1=   288 ratio=15%
WAT-ARUN.PRANG.SAT-01    OK   LOD0=  1412 LOD1=   288 ratio=20%
WAT-ARUN.PRANG.SAT-02    OK   LOD0=  1412 LOD1=   288 ratio=20%
WAT-ARUN.PRANG.SAT-03    OK   LOD0=  1412 LOD1=   288 ratio=20%
WAT-ARUN.PRANG.SAT-04    OK   LOD0=  1412 LOD1=   288 ratio=20%
WAT-ARUN.MANDAPA.01      OK   LOD0=   264 LOD1=    68 ratio=26%
WAT-ARUN.MANDAPA.02      OK   LOD0=   264 LOD1=    68 ratio=26%
WAT-ARUN.MANDAPA.03      OK   LOD0=   264 LOD1=    68 ratio=26%
WAT-ARUN.MANDAPA.04      OK   LOD0=   264 LOD1=    68 ratio=26%
WAT-ARUN.UBOSOT          OK   LOD0=   500 LOD1=    52 ratio=10%
WAT-ARUN.GROUND          OK   LOD0=  2948 LOD1=   484 ratio=16%
WAT-ARUN.RIVER           OK   LOD0=    84 LOD1=    24 ratio=29%
Scene total LOD0=12184 LOD1=2272 (both=14456)
Materials=9  File=1.28 MB  Textures=0
Checks (BALANCED): {"names":true,"tris":true,"materials":true,"size":true}
```
Budgets: <=300k tris, <=20 materials, <=5 MB - all pass with large headroom.
LOD1 ratio is 10-29% per building (scene 19%), at or below the ~25% target.

## Screenshots (`docs/3d/preview/`)
- `wide.png` - 3/4 view of whole site with river
- `close.png` - close-up on main prang
- `top.png` - top-down layout
Preview: `docs/3d/preview/index.html` (local three.js in `vendor/`, orbit controls, sunrise light; needs an HTTP server
at repo root, e.g. `npx http-server`; open `/docs/3d/preview/index.html?view=wide|close|top&lod=1`).
Screenshots: `npm run shoot` (Playwright Chromium, SwiftShader).
Silhouette iterations: 1 (first pass was too tall and thin; widened terraces/tiers, bigger corner ornaments).

## Limits
- Stylized, NOT accurate: heights, proportions, positions are artistic (sources conflict 66.8-86 m; main prang here ~38 m).
- Source of truth for real dimensions is the temple's own confirmation (see registry draft).
- No baked lighting or textures; gold has no env map so it reads dull. No collision, no KTX2 step needed (no textures).
- glTF loaders sanitise node names (dots removed in three.js GLTFLoader); use the raw GLB JSON names for lookups.
- Performance only checked by triangle/material/size budget, not on any mobile GPU.
