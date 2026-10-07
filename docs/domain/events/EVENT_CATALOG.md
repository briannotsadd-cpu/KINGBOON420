# EVENT CATALOG — BOON SYSTEM (template library)

Owner: Agent 19. Status: **PLANNED — desk summary, sources unopened** (template structure is DESIGNED, content is not RESEARCHED): every source was seen only as a web-search summary and no page was opened (risk R-18; audit F-06). Desk summary, sources unopened. Feature F-16.

## 0. How to read this catalogue

- **Templates are starting points** a temple edits; they copy into an event as quests + staffing targets
  (`source = template`). They are not rules of religion. The system never blocks an event because a template item
  was removed, except template `gate` items the temple has kept.
- **Evidence labels.** `[S#]` = sourced (list below). **HYPOTHESIS** = unsourced design assumption: typical
  structure of a temple fair/ceremony, ratios, lead times. Nothing in a HYPOTHESIS cell may be shown to users as a
  religious requirement; UI copy for these says "คำแนะนำจากแม่แบบ" (template suggestion), not "ต้องมี".
- **Honesty about sources.** The sources below were obtained through web-search result summaries on 2026-10-07;
  individual pages were not fetched and read in full. They are mostly secondary (temple websites, Wikipedia,
  tourism sites). No Thai primary source (Sangha Supreme Council, Department of Religious Affairs, Tipitaka
  edition) was verified. Before any requirement-like statement is shown to temples, a monk or Vinaya-literate
  advisor at the pilot temple must confirm it (D-1).

### Sources (all accessed 2026-10-07)

| Id | URL | Used for |
|---|---|---|
| S1 | https://tbcm.org.my/blog/6w0eg3ywyjh3ii6gk4ij7xogmfvyi0 | Kathina: ≥ 5 bhikkhus having completed vassa at the monastery; within one month after the end of vassa; offered to the Sangha as a whole; once per monastery per year |
| S2 | https://www.dhammakaya.or.th/activities/annual-activities/kathina | Kathina annual activity description |
| S3 | https://www.watsacramento.org/w-article-000-e.htm | Makha, Visakha, Asalha Bucha, Khao Phansa, candlelit circumambulation (Wian Tian) descriptions |
| S4 | https://en.wikipedia.org/wiki/Tak_Bat_Devo and https://www.lovethailand.org/travel/en/36-Uthai-Thani/8523-Tak-Bat-Devo-Tradition.html | Ok Phansa / Tak Bat Devo: day after Ok Phansa, almsgiving to descending monks (example: > 500 monks, Wat Sangkat Rattana Khiri) |
| S5 | https://en.wikipedia.org/wiki/Upasampad%C4%81 and https://www.bl.uk/stories/blogs/posts/monastic-ordination-in-theravada-buddhism | Upasampada: consecrated boundary (sima); quorum ten, or five in remote areas incl. a Vinaya holder; preceptor + two acariyas |
| S6 | https://en.wikipedia.org/wiki/Thai_funeral | Funeral overview (see Funeral spec) |
| S7 | https://securiti.ai/thailand-personal-data-protection-act-pdpa | PDPA background (see Funeral / Memory specs) |

### Template record shape

`temple_id` (null = platform template, set on a temple's copy), `template_code, name_th/en, kind, anchor_rule, typical_duration, departments[], timeline[T-minus offsets],
checklist[ {title, department, offset_days, weight, is_gate, evidence} ], staffing[ {dept, category, skill,
formula, min_rule} ], notes, evidence_label`.

Staffing `formula` uses `expected_attendance (A)`; the suggested number is only a **suggestion** that a human
edits. Defaults below are all **HYPOTHESIS** (no sourced ratio exists in this research).

Common lead-time vocabulary: `T-60` means 60 days before `starts_at`. Offsets are HYPOTHESIS everywhere.

## 1. Common department set and common checklist (HYPOTHESIS)

| Dept | Typical duties |
|---|---|
| ceremony (พิธีการ) | rite order of service, altar/seat arrangement, chanting books, monk roster, sacred thread/water if used by temple custom |
| reception (ต้อนรับ-ลงทะเบียน) | sign-in, guide guests, seating for elderly, lost & found |
| kitchen (โรงครัว) | meal for monks (before noon), guests/volunteers meals, water, waste |
| cleaning (สะอาด) | before/during/after cleaning, bins, toilets |
| traffic (จราจร-ที่จอดรถ) | parking plan, shuttle, road signs, neighbours notice |
| security & first aid | gate, crowd, lost children, first aid kit, fire safety |
| publicity | announcement, poster, live stream if any |
| finance (การเงิน-รับบริจาค) | donation receipts, counting with two people — **no readiness money gate**; post-pilot (F-43) |
| sound/stage | PA, microphones, lighting, power |
| facility | venue condition, extension cords, tents, chairs, toilets |

Every template also sets `registration_mode` and `meal_windows` (Event spec §2.5) so the kitchen headcount gets a meal-required guest count or an explicit Unknown.

Common checklist skeleton (HYPOTHESIS): T-60 set date/venue & abbot approval · T-45 roster & budget outline ·
T-30 announcement · T-21 recruit volunteers · T-14 confirm monks & suppliers · T-7 equipment check, maintenance
sweep, traffic plan · T-3 rehearsal/walk-through · T-1 set-up, final headcount · T0 run · T+1 clean up, count
actuals, retro.

Common `gate` items (HYPOTHESIS, temple may delete): monk roster confirmed; venue safety walk-through done; first
aid kit & fire extinguisher location checked; sound check done.

## 2. Templates

### 2.1 กฐิน — Kathina (`KATHINA`) — kind `merit_offering`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | Held once per monastery per year within the one-month period after the end of the rains retreat (after the full moon of the 11th lunar month). The temple fixes a date inside this window. | [S1] |
| Rite prerequisites | At least five bhikkhus must have completed the rains retreat in that monastery; the cloth is offered to the Sangha as a whole, not to a named monk. **Evidence grade: LOW** (one Malaysian temple blog [S1] plus a temple site description; not a Vinaya or Thai authority; audit F-39). Kept only as a non-blocking informational warning; the pilot temple's monk advisor must confirm before it is shown as a rule. | [S1] |
| Product consequence | Template adds a **non-blocking validation**: "จำนวนพระที่จำพรรษาครบ" shown as an informational field and warning if < 5. The count is entered by the temple (vassa residence records are not tracked by the system in Wave 1) → value `Unknown` until entered. Never auto-asserted. | [S1] + design |
| Duration | Commonly one day, sometimes with a preceding procession/evening events | HYPOTHESIS |
| Departments | all in §1 plus **reception of procession (ขบวนแห่)**, **donation/finance** | HYPOTHESIS |
| Checklist extras | robe cloth & requisites prepared · chairman (ประธานกฐิน) contacted and schedule agreed · procession route and traffic plan · Sangha roster for acceptance · food for Sangha and guests · donation receipt procedure | HYPOTHESIS |
| Staffing (HYPOTHESIS) | monk: temple's resident vassa-complete monks (≥5, see above) + guests as customary; volunteers ≈ ⌈A/25⌉; kitchen `skill_tags` [cook] ≥ ⌈A/60⌉; traffic ≥ 4 if A ≥ 200; first-aid ≥ 1 | HYPOTHESIS |
| Gates | G-STAFF monk target; `is_gate`: "ยืนยันจำนวนพระจำพรรษาครบ" (informational: passes when someone enters a number, any number — the number itself is not judged) | design |

### 2.2 ผ้าป่า — Pa-pa offering (`PAPA`) — kind `merit_offering`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | No fixed season identified in this research. | HYPOTHESIS: held any time (temple fund-raising for a purpose) |
| Content | Offering of cloth/requisites and funds for a stated purpose; chanting and sermon by monks; sometimes a procession | HYPOTHESIS |
| Departments | reception, finance, kitchen (small), publicity, ceremony | HYPOTHESIS |
| Checklist extras | purpose and target statement approved by abbot · donation account transparency (public report after event) · tree/stand preparation · thank-you list (no donor ranking by amount — privacy) | HYPOTHESIS |
| Staffing | monks 3–9 (customary count varies) — **do not state as a rule; default = temple-entered**; volunteers ⌈A/30⌉ | HYPOTHESIS |

### 2.3 วันมาฆบูชา — Makha Bucha (`MAKHA`) — kind `festival_day`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | Full-moon day of the third lunar month, usually end Feb / early March. In leap-month years the date shifts; use the official calendar. | [S3]; leap-year shift: HYPOTHESIS |
| Commemorates | Gathering of 1,250 monks who came spontaneously to the Buddha. | [S3] |
| Typical program | Evening gathering, sermon, candlelit circumambulation (wian tian) three times around the ordination hall/stupa/Buddha image. | [S3] |
| Departments | ceremony, reception, security & first aid (candles/fire), traffic, kitchen (light), cleaning (wax), publicity | HYPOTHESIS |
| Checklist extras | candles/flowers/incense supply · circumambulation route marked · fire safety for candles (extinguisher, sand bucket) · sermon monk confirmed · sound system · wax clean-up | HYPOTHESIS |
| Staffing | monks per temple practice (temple-entered); volunteers ⌈A/25⌉; security ≥ 2; first aid ≥ 1 | HYPOTHESIS |
| Gates | `is_gate`: fire-safety check completed | HYPOTHESIS |

### 2.4 วันวิสาขบูชา — Visakha Bucha (`VISAKHA`) — kind `festival_day`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | Full-moon day of the sixth lunar month. | [S3] |
| Commemorates | Birth, enlightenment and passing away of the Buddha. | [S3] |
| Typical program | Public sermon by day; candlelit procession by night. | [S3] |
| Rest | as Makha (shared base template `FULL_MOON_FESTIVAL`) plus **day program** (alms, sermon) | HYPOTHESIS |

### 2.5 วันอาสาฬหบูชา — Asalha Bucha (`ASALHA`) — kind `festival_day`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | Full moon of the eighth lunar month (usually July). | [S3] |
| Commemorates | The first discourse. | [S3] |
| Rest | Base `FULL_MOON_FESTIVAL`; often paired with Khao Phansa the next day (create one linked event pair; readiness separate) | pairing: [S3]; linking: design |

### 2.6 วันเข้าพรรษา — Khao Phansa (`KHAO_PHANSA`) — kind `festival_day`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | The day after Asalha Bucha; start of the three-month rains retreat. | [S3] |
| Typical program | Offering of candles/rains-retreat requisites, ceremony of undertaking residence | HYPOTHESIS (details of customary rites not sourced) |
| System side effects | Optional: create a **Vassa record** is *out of scope for Wave 1* (needed later for Kathina's "completed vassa" fact). Flagged as open question for Agent 02. | design |
| Departments / staffing | reception, ceremony, kitchen small, cleaning | HYPOTHESIS |

### 2.7 วันออกพรรษา / ตักบาตรเทโว — Ok Phansa / Tak Bat Devo (`OK_PHANSA`, `TAK_BAT_DEVO`)

| Aspect | Content | Evidence |
|---|---|---|
| Anchor rule | Ok Phansa marks end of the rains retreat; Tak Bat Devo (tak bat thewo) commonly falls on the day after. | [S4] |
| Meaning | Commemorates the Buddha's descent from Tavatimsa heaven; monks descend/walk and receive alms from many donors. Large examples: > 500 monks, 449-step staircase. | [S4] |
| Typical operations | Alms-giving lines, food/offering sets pre-sold or prepared, queue control, monk walking route, crowd & weather contingency. | HYPOTHESIS (derived from [S4] description of scale) |
| Departments | + **alms-line coordination**, traffic, security & first aid | HYPOTHESIS |
| Gates | monk roster & route clear; crowd/traffic plan done (`is_gate`) | HYPOTHESIS |
| Note | Ok Phansa starts the Kathina window → UI suggests creating `KATHINA` (suggestion only). | [S1], [S4] |

### 2.8 บวช — Ordination (`ORDINATION`) — kind `ordination`

| Aspect | Content | Evidence |
|---|---|---|
| Rite facts | Upasampada is performed inside a consecrated boundary (sima) before a Sangha quorum: ten monks, or five in remote areas (including a Vinaya holder). Theravada practice names a preceptor (upajjhaya) and two acariyas. | [S5] |
| Product consequence | Fields: sima location, preceptor, two acariyas, quorum count (temple-entered). Quorum information is **informational with a prompt**; whether the temple's area counts as "remote" is a ruling the system must not make → no automatic gate on 5 vs 10; the template gate is "ยืนยันองค์สงฆ์ครบตามที่วัดกำหนด" (temple confirms), HYPOTHESIS. | [S5] + design |
| Candidate/family items | candidate details, robes/bowl set, parents' consent, ordination date coordination, candidate's training period, guest list | HYPOTHESIS (candidate eligibility rules, e.g. age 20 for bhikkhu, are well known but **not verified here**; do not encode) |
| Privacy | Candidate is often a minor-adjacent/young adult; data limited to name, contact of guardian; retention per Memory spec. Samanera ordination of minors → minors rules (Security model §2) | design |
| Departments | ceremony, reception, kitchen, sound, publicity | HYPOTHESIS |

### 2.9 ปฏิบัติธรรม course (`DHAMMA_COURSE`) — kind `course`

| Aspect | Content | Evidence |
|---|---|---|
| Anchor | Temple-chosen start/end; multi-day. | HYPOTHESIS |
| Capacity model | `capacity` participants; registration list (not public); rooms/dormitory by building zone (Agent 18); meals; schedule per day; instructors; rules briefing (attire, precepts commonly 8 for retreatants — **unsourced**) | HYPOTHESIS |
| Departments | instruction, registration, kitchen, accommodation/cleaning, security | HYPOTHESIS |
| Staffing | instructor monks (temple-entered); kitchen skill ⌈capacity/40⌉; accommodation staff ≥ 1 per 30 | HYPOTHESIS |
| Gates | accommodation ready (maintenance gate on dorm buildings); medical-needs form collected? (health data, optional; sensitive — see Security model §2) | HYPOTHESIS |
| Multi-day | one event, daily leaf quests with per-day due dates; readiness evaluates the whole; daily readiness view = filter of leaves by date (view only) | design |

### 2.10 Community event (`COMMUNITY`) — kind `community`

Open-ended template: fair, cleaning day (Big Cleaning Day), school-visit, blood drive with a partner, Dhamma talk.
Departments minimal (reception, cleaning, sound). Staffing by `A`. All HYPOTHESIS. Community events are the likely
source of public volunteer sign-ups (Agent 12, Wave 6).

## 3. Shared base: `FULL_MOON_FESTIVAL` (HYPOTHESIS)

Used by Makha, Visakha, Asalha: ceremony, reception, security & fire safety, traffic, kitchen (light), cleaning,
publicity. Checklist: candles/incense/flowers · circumambulation route · fire safety · sermon monk · PA · wax
clean-up. Gate: fire-safety check, sound check.

## 4. Template governance

- Template library is **platform-provided, read-only**; a temple *copies* a template into its own template set
  (rows with `temple_id`) and edits there. Platform templates carry `evidence_label` per item; a temple's edited
  copy loses sourced status (becomes "แก้ไขโดยวัด").
- Annual dates: system offers a "suggest date" helper only after a human enters the year's official calendar
  dates (Open question O-1). No lunar calendar implementation in Wave 1.
- Pilot validation required: no template may be called `RESEARCHED` until its sources are opened and read by a human and a pilot-temple walk-through has happened (Agent 01
  interview kit). Status in REPORT.md.

## 5. Open questions

| # | Question |
|---|---|
| O-1 | Which authority/calendar does the pilot temple use for lunar dates and leap years? |
| O-2 | Does the pilot temple record vassa residence per monk? (needed for Kathina fact) |
| O-3 | Typical monk counts per rite at the pilot temple (all counts here are HYPOTHESIS or temple-entered). |
| O-4 | Do temples sell/prepare "offering sets" for Tak Bat Devo (inventory/finance implications)? |
| O-5 | Which events are public vs members-only in practice? |
