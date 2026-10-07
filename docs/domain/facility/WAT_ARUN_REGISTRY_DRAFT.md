# WAT ARUN REGISTRY DRAFT

Owner: Agent 18 · Status: **DESIGNED (draft structure; sources unopened per R-18) — NOT a real registry** · Access date for all sources: **2026-10-07**

> **A real registry needs the temple's confirmation.** Nothing here has been confirmed by Wat Arun Ratchawararam.
> Every `confirmed_by_temple_at` value must start as null. No dimensions or coordinates are recorded here: where
> sources give numbers they are quoted as-is and conflicts are listed, never resolved by guessing.

## 1. Source limitations (be honest)

- Direct fetch of `en.wikipedia.org` and `whc.unesco.org` was blocked by the environment's egress proxy. Facts below come
  from **search-result excerpts** of those and other pages. Each row cites the page that surfaced the fact; a human
  should open the page and re-verify before the temple review.
- No official temple/Fine Arts Department registry was reachable. HYPOTHESIS items are labelled.

## 2. Sources

| ID | Source | URL |
|---|---|---|
| S1 | Wikipedia, "Wat Arun" (via search excerpt) | https://en.wikipedia.org/wiki/Wat_Arun |
| S2 | Structurae, "Wat Arun" (via search excerpt) | https://structurae.net/en/structures/wat-arun |
| S3 | Lonely Planet, Wat Arun (via search excerpt) | https://www.lonelyplanet.com/points-of-interest/wat-arun/407510 |
| S4 | PRD Thailand, "Thailand to Submit Wat Arun's Central Pagoda for UNESCO World Heritage Tentative List" | https://thailand.prd.go.th/en/content/category/detail/id/2874/iid/381165 |
| S5 | Time Out Bangkok, "Wat Arun's Phra Prang nominated for UNESCO tentative list" (July 2025) | https://www.timeout.com/bangkok/news/thailands-wat-arun-phra-prang-nominated-for-unescos-tentative-world-heritage-list-071725 |
| S6 | Thai web search results (วัดอรุณราชวราราม): travel.trueid.net, mgronline.com, silpa-mag.com | https://travel.trueid.net/detail/97V35Awoyk40 · https://www.silpa-mag.com/?p=129292 · https://mgronline.com/travel/detail/9660000012697 |
| S7 | UNESCO World Heritage Centre tentative list entry 6821 (surfaced in search, not fetched) | https://whc.unesco.org/en/tentativelists/6821/ |

## 3. Proposed registry (buildings)

Status key: **SOURCED** = named in at least one public source; **CANDIDATE** = HYPOTHESIS, not found in a fetched source,
included only so the temple can confirm or strike it. Orientation words (north, etc.) appear only where a source says
so; otherwise ordinal codes are used (SPATIAL_REGISTRY_SPEC §3).

| # | Proposed `code` | Kind | Name (TH / EN) | Status | Evidence (what the source says) | Cite |
|---|---|---|---|---|---|---|
| 1 | `WAT-ARUN.PRANG.MAIN` | PRANG | พระปรางค์ประธาน / Central prang | SOURCED | Main feature is the central prang (Khmer-style tower) encrusted with porcelain; completed 1851 after nine years of construction; construction started under Rama II and completed under Rama III; nominated as "The Central Pagoda of Wat Arun Ratchawararam: Icon of Rattanakosin". | S1, S3, S4, S5 |
| 2 | `WAT-ARUN.PRANG.SAT-01` | PRANG | พระปรางค์ทิศ (ที่ 1) / Satellite prang 1 | SOURCED (count only) | "The corners are surrounded by four smaller satellite prang." Which corner is which is **not stated**; ordinal codes used. | S1, S2 |
| 3 | `WAT-ARUN.PRANG.SAT-02` | PRANG | พระปรางค์ทิศ (ที่ 2) / Satellite prang 2 | SOURCED (count only) | as above | S1, S2 |
| 4 | `WAT-ARUN.PRANG.SAT-03` | PRANG | พระปรางค์ทิศ (ที่ 3) / Satellite prang 3 | SOURCED (count only) | as above | S1, S2 |
| 5 | `WAT-ARUN.PRANG.SAT-04` | PRANG | พระปรางค์ทิศ (ที่ 4) / Satellite prang 4 | SOURCED (count only) | as above | S1, S2 |
| 6 | `WAT-ARUN.MANDAPA.01` .. `.04` (4 rows) | MANDAPA | มณฑป / Mandapas | SOURCED (count only) | Structurae excerpt: group layout has "Mandapas in the four cardinal directions". Whether these coincide with a Thai term or building the temple lists separately is unknown. | S2 |
| 7 | `WAT-ARUN.UBOSOT.MAIN` | UBOSOT | พระอุโบสถ / Ordination hall | SOURCED | Ordination hall contains a Buddha image said to be designed by Rama II, with murals of Prince Siddhartha's encounters with birth, old age, sickness and death. | S3 |
| 8 | `WAT-ARUN.UBOSOT.OLD` | UBOSOT | โบสถ์น้อย / Small (old) ubosot | SOURCED | Thai source: in front of the prang are the "โบสถ์น้อย" and "วิหารน้อย"; the โบสถ์น้อย is the temple's former ubosot and enshrines the cast royal statue of King Taksin. Wikipedia excerpt mentions Rama II restoring Wat Jaeng's "Ubosot Noi and Vihāra Noi". | S6 (trueid), S1 |
| 9 | `WAT-ARUN.VIHARA.OLD` | VIHARA | วิหารน้อย / Small vihara | SOURCED | as row 8 | S6, S1 |
| 10 | `WAT-ARUN.GATE.YAKSHA-01`, `.02` | GATE (guardian figures) | ยักษ์วัดแจ้ง / Yaksha guardian statues | SOURCED (existence); count and positions HYPOTHESIS | Thai source tells of a lightning strike on 24 Aug B.E. 2473 that felled a yaksha figure in front of the ubosot (north side). Number and exact placement not confirmed. Modelled as guardians, not as maintainable buildings, unless the temple wants them tracked. | S6 |
| 11 | `WAT-ARUN.PIER.01` | PIER | ท่าน้ำ / Riverfront pier | CANDIDATE (HYPOTHESIS) | Temple lies on the west bank of the Chao Phraya (S6) and the 3D vertical-slice scope names a riverfront (3D_STRATEGY §6). No source fetched names a specific pier or its structure. | S6, 3D_STRATEGY |
| 12 | `WAT-ARUN.SALA.xx`, `WAT-ARUN.BELL-TOWER.01`, `WAT-ARUN.KUTI.xx`, `WAT-ARUN.OFFICE.01`, `WAT-ARUN.KITCHEN.01`, `WAT-ARUN.TOILET.xx`, `WAT-ARUN.PARKING.xx` | various | sala, bell tower, monks' quarters, office, kitchen, toilets, parking | CANDIDATE (HYPOTHESIS) | Typical temple facilities. **No source consulted lists them for Wat Arun.** Must come from the temple's own survey; placeholders reserve the naming pattern only. | none |

Row counts: SOURCED named structures = 1 main prang, 4 satellite prangs, 4 mandapas, ubosot, old ubosot, old vihara,
yaksha statues; CANDIDATE = pier and operational buildings.

## 4. Conflicts and open points (do not resolve by guessing)

| Topic | Source A | Source B | Treatment |
|---|---|---|---|
| Height of the central prang | "reported by different sources as between 66.8 m (219 ft) and 86 m (282 ft)"; Rama II "had begun plans to raise the main pagoda to 70 m" (S1) | "Rising 82 metres" (S4/S5 coverage of the UNESCO nomination) | **Record no height.** `buildings.height_m = null` (Unknown). Show "ความสูง: ไม่ทราบ / ยังไม่ยืนยัน". The temple or the Fine Arts Department supplies a figure. |
| Which satellite prang is at which corner | not stated | not stated | ordinal codes `SAT-01..04` until confirmed |
| Mandapa vs. other structures | S2 lists mandapas in four directions | Thai sources list โบสถ์น้อย/วิหารน้อย in front of the prang | Possibly different structures; the temple must confirm the list |
| Name of the ubosot's principal image | S3: "designed by Rama II" | not named in any source consulted | Not recorded; image enshrined is not a facility asset here |
| Heritage-listing scope | The UNESCO tentative nomination concerns the **central pagoda** (S4/S5), not the whole temple | — | Do not imply the whole compound is listed |

Per Fine Arts Department or heritage rules, a structure that is a registered ancient monument may need approval before
repair works. **HYPOTHESIS**: Thai heritage law may require permission for maintenance on listed structures; the
Maintenance spec therefore carries a `heritage_flag` (MAINTENANCE_SPEC §5). Legal confirmation needed (no source here).

## 5. Next steps (owner actions)

1. Temple walkthrough: confirm each row, add missing buildings and zones, set `confirmed_by_temple_at`.
2. Temple (or heritage authority) supplies authoritative dimensions if wanted; until then Unknown.
3. Agent 05 may only create a **placeholder massing** scene from this list; the placeholder carries no real
   proportions and is labelled (3D_STRATEGY §5).
4. Re-verify S1, S2, S7 by opening the pages (blocked in this run).
