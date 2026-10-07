# REQUIRED REAL DATA — KINGBOON / BOON SYSTEM

Date: 2026-10-07 · Based on the **actual** schema (`supabase/migrations/0001`–`0006`) and app (`apps/web`), not on assumptions.
Rule: nothing below may be invented. Unknown = shown as unknown. Public display needs `TEMPLE_CONFIRMED` or `PUBLISHED`.

## 0. Current state (audit 2026-10-07)

| Check | Result | Evidence |
|---|---|---|
| Target temple identified? | **NO** — no pilot temple chosen (owner preparing questionnaire). Wat Arun appears only as a 3D showcase idea. | `docs/master/EXECUTIVE_PRODUCT_PLAN.md` §7a D-1 |
| Real temple data in the app/DB | **None.** Dev/prod DB starts empty. | `supabase/dev/local-db.sh` loads migrations + `seed/001_roles_permissions.sql` only |
| Fictional data | Only in tests: `supabase/tests/fixtures/*` (demo-a/demo-b), `apps/web/lib/parking.test.ts`. Never loaded by the app DB. | `supabase/tests/run.sh` |
| Hard-coded real names in UI | One example text "เช่น วัดอรุณ" in the search box → **removed** (neutral hint). | `apps/web/app/page.tsx` |
| Official sources reachable from this environment | **NO** — `curl https://www.onab.go.th` → `CONNECT tunnel failed, response 403` (egress policy). Same for `ratchakitcha.soc.go.th`. | command output in session 2026-10-07 |
| 3D model | Stylized, procedural, project-owned, labelled "not survey-accurate". Not temple data. | `assets/3d/LICENSES.md` |

## 1. Temple identity and profile (feature: ค้นหาวัด / หน้าวัด) — `data_field_catalog`

| Field key | Thai | Expected official source | Risk | Re-check |
|---|---|---|---|---|
| `temple.name_th` | ชื่อวัดภาษาไทย (ทางการ) | ONAB registry (Tier 1) | normal | — |
| `temple.name_en` | ชื่อภาษาอังกฤษ | temple (Tier 2) | normal | — |
| `temple.registry_number` | เลขทะเบียนวัด | ONAB registry | normal | — |
| `temple.type` | ประเภทวัด (วัดราษฎร์ / พระอารามหลวง) | ONAB / Royal Gazette | normal | — |
| `temple.sect` | นิกาย | ONAB | normal | — |
| `temple.province` · `temple.district` · `temple.subdistrict` | จังหวัด · อำเภอ · ตำบล | ONAB | normal | — |
| `temple.address` | ที่อยู่ | ONAB / temple | normal | 365 d |
| `temple.geo` | พิกัด | temple confirmation (Google Maps = Tier 3 cross-check only) | high | 365 d |
| `temple.founded` | วันที่ตั้งวัด | ONAB / Royal Gazette | normal | — |
| `temple.wisungkhamasima` | วิสุงคามสีมา (วันที่ได้รับ) | Royal Gazette | normal | — |
| `temple.history` | ประวัติวัด | ONAB "ประวัติวัดทั่วราชอาณาจักร" / temple | normal | — |
| `temple.abbot_name` | เจ้าอาวาส | temple only (must confirm) | high | 365 d |
| `temple.office_phone` | เบอร์สำนักงาน | temple only | normal | 180 d |
| `temple.official_channels` | เว็บไซต์ / Facebook / LINE ทางการ | temple only | normal | 180 d |
| `temple.opening_hours` | เวลาเปิด-ปิด | temple only | normal | 90 d |
| `temple.chanting_schedule` | ตารางทำวัตร | temple only | normal | 90 d |
| `temple.donation_account` | บัญชีรับบริจาค / พร้อมเพย์ | temple only, **double verification** | critical | 365 d |

## 2. Parking (feature: ที่จอดรถ) — `parking_lots`, `parking_status_reports`
Lot name, vehicle types, capacity, accessible spaces, fee, hours — **temple-entered, must be confirmed by the temple
before public** (`parking_lots.verification_status`). Live status = first-hand reports by authorised staff (append-only).

## 3. People (roles in `role_permissions.yaml`: พระ, สามเณร, ไวยาวัจกร, มัคนายก, เจ้าหน้าที่, แม่บ้าน, รปภ., ฯลฯ)
Only the person themself or the temple may enter people data; never imported from the internet; never guessed.
Not public. Monastic status is attested per temple (decision F-04).

## 4. Features planned but NOT IMPLEMENTED (no data collected; listed so nothing is invented later)

| Feature | Real data needed | Source |
|---|---|---|
| Events / งานบุญ / งานบวช / งานศพ | dates, times, place, organiser | temple only, expires after the event |
| Ceremony / funeral ops | rite schedule, family contact (restricted) | temple only (PDPA, `FUNERAL_OPERATIONS_SPEC.md`) |
| Buildings / map / navigation | building list, entrances, restricted zones | temple confirmation before any navigation use |
| Donations | accounts, QR | temple only, double verification, never AI-edited |
| Bookings, documents, announcements, assets | temple-owned records | temple only |

## 5. Questions to ask the temple (cannot be answered from public sources)
Abbot name and title · office phone and hours · official online channels · chanting/alms schedule · parking lots ·
donation account (and who is authorised to confirm it) · map/zone boundaries (monastic vs lay areas).
