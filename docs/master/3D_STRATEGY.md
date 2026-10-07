# 3D STRATEGY — BOON SYSTEM

Status: **DRAFT v0.1 (Wave 0)**. Current state: **no 3D asset, no license, no engine** in the repository.

## 1. Principle

3D is the signature experience, **not a core dependency**. Every feature reachable from the 3D scene must also be
reachable from the 2D map and from lists. The Core System must work with 3D disabled or failed.

## 2. One spatial model, three renderers

```
buildings / zones (DB, stable `code`)
        │
  scene manifest (JSON per temple: code → 3D node name, 2D polygon, camera preset, marker anchor)
        │
   ┌────┴─────────────┬──────────────────┐
 ULTRA 3D           BALANCED 3D         LITE 2.5D / 2D SVG map
```

- Markers (quest, event, maintenance) are computed from data and attached by **building code**, so the same data
  drives all renderers. No marker positions are hard-coded in UI components.
- Mode selection: automatic (device memory, GPU tier, `prefers-reduced-motion`, Save-Data, battery) with a user
  override in settings.

## 3. Modes and budgets (initial targets, to be validated in Wave 2 feasibility)

| | ULTRA | BALANCED | LITE |
|---|---|---|---|
| Target device | desktop / high-end phone | mid-tier Android (e.g. 4 GB RAM) | low-end, reduced motion, 3D failure |
| Triangles on screen | ≤ 1.5 M | ≤ 300 k | n/a |
| Draw calls | ≤ 300 | ≤ 100 | n/a |
| Initial 3D download | ≤ 15 MB | ≤ 5 MB | ≤ 500 KB (SVG + sprites) |
| Frame rate | 60 fps | ≥ 30 fps sustained | n/a |
| Effects | post-processing, dynamic sunrise light, particles, river ambience | baked lighting, no post | none |
| Time to interactive (core UI) | not blocked by 3D | not blocked by 3D | < 2.5 s on 4G |

## 4. Technology (ADR-0006, Wave 2)

Proposed: Three.js via React Three Fiber + drei; glTF 2.0 with Meshopt or Draco geometry compression and KTX2
textures; LOD per building; lazy-loaded scene chunk; `detect-gpu` for tiering. Blender as source-of-truth DCC.
Spline/Rive/Lottie only for UI motion, not the temple scene.

## 5. Asset legality — hard rules

- **No model may be downloaded from any marketplace or scan site unless its license explicitly allows commercial
  use and modification, with attribution recorded.** "Free to download" is not a license.
- Every asset gets a row in `assets/3d/LICENSES.md`: source, author, license, URL, date obtained, modifications,
  owner.
- Wat Arun is a royal first-class temple on UNESCO's Tentative List; on-site photogrammetry or drone capture
  requires **written permission from the temple and confirmation with the Fine Arts Department (กรมศิลปากร)**.
  Drones additionally need NBTC and CAAT registration and an airspace check (Agent 01, doc 06 — sources not yet
  opened, verify). **No drone capture is planned for the pilot.**
- Exclude CC BY-SA (share-alike conflicts with a proprietary app bundle) and any NC (non-commercial) models.
- Realistic options, in order of preference:
  1. **Commissioned stylized model** built from public-domain reference (own photos taken from public areas,
     not detailed replicas), owned by the project.
  2. Temple-provided or temple-authorised capture.
  3. Licensed model with verified commercial license.
- Until an option is secured, the Wat Arun slice ships as **LITE (2D illustrated map)** plus a **procedural
  placeholder** (blocky massing models clearly labelled placeholder) for engineering only.

## 6. Wat Arun vertical slice — scope

Scene: main prang + 4 satellite prangs (`WAT-ARUN.PRANG.SAT-01..04`, ordinal because no source states orientation) +
4 mandapas + ordination hall (ubosot) + riverfront; heights/placement Unknown until the temple confirms (sources
conflict: 66.8–86 m for the main prang) — placeholder massing must be labelled as such; sunrise light; orbit camera;
fly-to building; markers for quest/event/maintenance from live data; tap building → side sheet with Event,
Quest, people count, Maintenance, Assets, Readiness.

## 7. Performance gate (must pass before any second temple)

- [ ] BALANCED ≥ 30 fps p95 on the reference mid-tier Android (real device or cloud device lab) — evidence: trace
- [ ] Core UI interactive before 3D chunk loads — evidence: Lighthouse/WebPageTest trace
- [ ] LITE fallback triggered by WebGL failure and by reduced motion — evidence: E2E test
- [ ] Every building interaction also available in LITE — evidence: E2E test parity list
- [ ] Asset license register complete — evidence: `LICENSES.md` reviewed by Opus

## 8. Blockers now

| Blocker | Resolution |
|---|---|
| No licensed Wat Arun model | Decide option 1/2/3 (§5); option 1 needs a 3D artist budget |
| No real mid-tier device for profiling | Provide a device or a device-lab account |
| Permission from Wat Arun not known | Owner to contact the temple (or pick a pilot temple that agrees) |
