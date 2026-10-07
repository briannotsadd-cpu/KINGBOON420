# TEMPLE MEMORY SPEC (ความรู้ของวัด) — BOON SYSTEM

Owner: Agent 19. Status: **DESIGNED (paper)**. Feature F-17 (Temple Memory / duplicate event, P1), input to F-40
(AI knowledge search, Agent 10, Wave 7). Master: `DATABASE_PLAN.md` (`memory_source_event_id`,
`temple_memory_notes`), `TEMPLE_DOMAIN_MODEL.md` §5.3.

Labels: HYPOTHESIS = my design default / unsourced. All retention values need legal review (D-5).

## 1. Purpose

Let a temple repeat next year's กฐิน, ผ้าป่า or วิสาขบูชา without starting from a blank page: the structure,
checklists, staffing targets, timings and **lessons learned** are kept; **people and evidence are not**.
Temple Memory is **per temple** (`temple_id`); there is no cross-temple memory in Wave 1 (a shared platform
template library exists separately, `EVENT_CATALOG.md` §4).

## 2. What is archived

Archival happens at `COMPLETED → ARCHIVED` (Event spec §4). The system builds an immutable
`memory_event_snapshot` and a mutable-by-humans notes list.

| Block | Content | Person data? |
|---|---|---|
| Identity | event kind, title, template_code, year, anchor/lunar_ref label, start/end, venue building codes, expected vs actual attendance | no |
| Structure | departments, quest tree (titles, descriptions, weights, priority, `is_gate`, checklist items), `depends_on` links, **relative timing** (offset from `starts_at`, e.g. T-14 d) | no |
| Staffing | staffing targets (category, skill, shift, required, min_required, weight) **plus actual outcome**: `f` at LIVE snapshot, final volunteer count present, no-show count | counts only |
| Readiness history | `readiness_snapshot_at_start` and a small series (percent, state, failed gates) at T-14, T-7, T-3, T-1 d | no |
| Consumables and quantities | structured actuals entered at close (e.g. rice kg, water bottles, chairs, candles) with unit; cost optional (finance post-pilot) | no |
| Outcome flags | incidents (none/minor/major + category, no names), weather, overcrowding, parking problems | no |
| Lessons | retro notes (§4) | no (validated) |
| Source ids | `event_id` (kept for traceability; the event row's own people data follows its own retention) | — |

Not archived into memory: volunteer/staff/monk **identities and assignments**, quest evidence (photos), points
awarded, comments/chat, donation/finance records, guest registration lists, ordination candidates, anything from
funerals (Funeral spec §6: anonymous counts only).

## 3. Duplication rules (copy structure, never people or evidence)

`duplicate_event(from = memory snapshot or live event, new_dates)` creates a **new** event in DRAFT with:

| Copied | Rule |
|---|---|
| Event kind, title (with year placeholder), description | title year auto-updated, human reviews |
| Departments, team labels | copied |
| Quest tree | copied as OPEN, **no assignee, no due date from the old event** — `due_at` recomputed = new `starts_at` + stored relative offset; quests with no offset get `due_at` null |
| Checklist items | copied unchecked, no evidence, no timestamps |
| Weights, priorities, `is_gate`, `depends_on` | copied |
| Staffing targets | copied (`required`, `min_required`, `weight`, `skill`), `source = memory`; **suggested** adjustment shown if last year's actual attendance differs from the new expected attendance by > 20% (HYPOTHESIS) |
| Lessons | **shown beside** the new event as "บทเรียนปีที่แล้ว" and optionally turned into checklist items by a human (never auto-turned) |
| Venue | copied as suggestion; G-VENUE re-evaluated for the new window |

| Never copied | Reason |
|---|---|
| People, assignments, volunteers' sign-ups, monk rosters, schedule entries | privacy, relevance (people change), tenant/PDPA minimisation |
| Evidence (photos, files), submissions, verification records | privacy + stale |
| Points, boon points, rewards | ledger integrity |
| Comments, chat, audit rows | privacy |
| Quest status/timestamps | new event starts fresh |
| Readiness values | recomputed (a duplicate is NOT_READY by construction — Event spec EV-20) |

Result: new event has `memory_source_event_id`; structure editable; nothing is "approved" until a human moves the
event to PLANNING/APPROVED. AI may propose a duplicate as an `ai_drafts` row (kind `event`); a human accepts.

Tenant rule: duplicate only from the **same** temple's memory. Cross-temple copy is impossible (no read path).

## 4. Lessons-learned capture

Prompted at COMPLETED (and again T+7 if skipped; never blocking):

| Prompt (Thai UI copy) | Field |
|---|---|
| "อะไรได้ผลดีที่สุด" | `worked_well` text (≤ 500 chars) |
| "อะไรควรทำต่างไปครั้งหน้า" | `do_differently` text |
| "ขาดอะไร / เหลืออะไร" | structured: item, shortage/surplus qty, unit |
| "ปัญหาที่เจอ" | tag(s): traffic, food, weather, sound, crowd, safety, volunteers, venue, communication, other + text |
| "ตัวเลขจริง" | actual attendance, volunteers present, monks present (counts) |

Each lesson row: `temple_memory_notes(event_id, temple_id, author_person, tag[], text, created_at)`. **Validation:**
free text is scanned (server-side, simple pattern rules) for phone numbers and ID-like strings and flagged;
authors are told not to write names of donors, guests or minors (HYPOTHESIS UI warning). Notes are visible to
roles with `event.manage` or `report.view` at the temple; author id visible to the abbot only (to encourage
frank notes — HYPOTHESIS).

## 5. Retention and privacy of memory

| Object | Default (HYPOTHESIS, legal review) |
|---|---|
| Snapshot (no people) | retained indefinitely (it is anonymous operational knowledge) |
| Notes | retained indefinitely; author link removed after 24 months |
| Event-level people data (assignments, sign-ups) | anonymised 24 months after `ended_at`: `person_id` removed, per-role counts kept |
| Funeral | never enters memory except anonymised monthly counts |
| Deletion request by a person | assignments erased/anonymised; memory snapshots unaffected because they hold no person data (verified by a test, §7) |

Data-protection sketch: memory contains no sensitive categories (religion/health) of identifiable people. A test
scans snapshot JSON for any person id and fails the build if one is found.

## 6. Search needs (input to Agent 10, AI Temple Secretary, Wave 7)

Agent 10 will answer questions like:
- "ปีที่แล้วกฐินใช้ข้าวสารกี่กิโล?" → structured consumables with units; needs exact numeric query, not only text.
- "งานไหนมีปัญหาที่จอดรถ?" → tag filter on `problem tags`.
- "ครั้งก่อนเตรียมงานวิสาขบูชากี่วัน?" → relative offsets/duration of the structure.
- "อาสาขาดกี่คนปีที่แล้วตอนเริ่มงาน?" → `f` vs `r` at snapshot.
- "เปรียบเทียบกฐิน 3 ปีล่าสุด" → year series.

Requirements the retrieval layer must meet:
1. **Temple-scoped retrieval only** (`temple_id` filter in every query; no cross-temple retrieval — Security model §4 AI row).
2. **Structured facets**: kind, template_code, year, department, tag, venue code, attendance band.
3. **Thai-language full-text** over titles, checklist items, notes — Thai has no spaces; requires Thai word
   segmentation or n-gram indexing. Technology choice is Agent 08/10's (not decided here).
4. **Optional semantic search** (embeddings) over notes and titles; embeddings must be derived only from the
   no-people snapshot content; must be deleted/rebuilt when a note is deleted.
5. **Citations**: every AI answer cites source `event_id` + year + the field used; AI says "ไม่ทราบ" (Unknown)
   when there is no record — it must not estimate quantities.
6. **Drafts only**: AI can propose a checklist or duplicate; human accepts.
7. **Freshness**: snapshots are immutable; edits by humans create a new revision with `revised_by`.
8. **Excluded corpora**: funeral, ordination candidate details, volunteer identities, finance.

## 7. Cases (`TM-xx`)

| ID | Scenario | Expected |
|---|---|---|
| TM-01 | Archive completed กฐิน | snapshot has structure, targets, actuals, readiness series; no person id anywhere |
| TM-02 | Duplicate | new event DRAFT; leaves OPEN, unassigned; due dates = new start + offsets; readiness computed NOT_READY |
| TM-03 | Duplicate with attendance change | suggestion banner shows when new expected differs > 20% |
| TM-04 | Evidence not copied | no files, photos or submissions in the copy |
| TM-05 | Points not copied | zero ledger rows touched |
| TM-06 | Cross-temple duplicate attempt | impossible; zero rows; audit |
| TM-07 | Lesson containing a phone number | flagged; author asked to edit; blocked from search index until cleared |
| TM-08 | Deletion request from a volunteer | assignments anonymised; snapshot unchanged (it never contained the person) |
| TM-09 | Funeral completed | no snapshot; monthly anonymous counter only |
| TM-10 | AI asks "rice last year?" with no record | answer: "ไม่ทราบ — ไม่มีบันทึก" |
| TM-11 | Template item removed in duplicate | removal not written back to the archived snapshot (immutable) |
| TM-12 | Event cancelled | archived as CANCELLED snapshot with reason; excluded from year-series by default |

## 8. Open questions

1. Do temples actually keep records of quantities (rice, water)? If not, structured actuals will be sparse → UI must make entry easy (voice later, F-39).
2. Who may edit lessons after archive (abbot only vs lead)?
3. Whether to share anonymised templates across temples (consent, ownership) — post-pilot.
4. Lunar year alignment in series comparison (year label by Thai Buddhist era vs Gregorian).
