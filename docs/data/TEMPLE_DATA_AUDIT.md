# TEMPLE DATA AUDIT — KINGBOON / BOON SYSTEM

Date: 2026-10-07 · Scope: every temple record that could reach a real user. Field list: `REQUIRED_REAL_DATA.md` §1.

## 1. Verdict

| Item | Status | Evidence |
|---|---|---|
| Target temple | **BLOCKED** — not identified by the owner (questionnaire in progress). No temple was picked at random. | `REQUIRED_REAL_DATA.md` §0 |
| Official sources (ONAB, Royal Gazette) | **BLOCKED** — unreachable from this environment: `CONNECT tunnel failed, response 403` | session command output 2026-10-07 |
| Real temple records in the database | **0** | `supabase/dev/local-db.sh` loads migrations and the roles seed only |
| Fields `PUBLISHED` / `TEMPLE_CONFIRMED` with real data | **0** | — |
| Every field in `data_field_catalog` | **UNKNOWN / NOT VERIFIED** | — |
| Fictional data | Test fixtures only (`supabase/tests/fixtures/*`, `.invalid` URLs, labelled TEST FIXTURE). Never loaded into the app database. | `supabase/tests/run.sh`, `apps/web/e2e/run.sh` resets the DB before and after |

## 2. System controls (built and tested locally, with no real data)

| Control | Where it is enforced | Test |
|---|---|---|
| 11-state pipeline (DISCOVERED → … → PUBLISHED, CONFLICT, REJECTED, OUTDATED, SUSPENDED, VERIFICATION_EXPIRED) | DB `app.advance_field_value` transition table | `07_verification.sql` |
| Provenance on every value (source type, tier, URL, retrieved date, evidence, who recorded it) | `data_sources`, `temple_field_values` NOT NULL columns | `07_verification.sql` |
| Tier 3 and AI-assisted values stay DISCOVERED and cannot advance | `app.record_field_value` | `07_verification.sql` |
| Only the temple can confirm; a platform admin cannot confirm on its behalf | `app.advance_field_value` | `06_registration.sql`, `07_verification.sql` |
| Critical fields (donation account) need two different approvers, one of them the abbot | DB | `07_verification.sql` (**DB only, not driven through the UI in E2E**) |
| Conflicting values → CONFLICT, never auto-picked; a human resolves them | `app.record_field_value`, `app.resolve_conflict` | `07_verification.sql`, E2E step 5 |
| Expiry → VERIFICATION_EXPIRED, hidden from the public | `app.effective_status`, public functions | `07_verification.sql` (**DB only, not in E2E**) |
| Temple approval requires a tier-1 registry name at SOURCE_VERIFIED or above | `app.review_temple` | `06_registration.sql`, E2E |
| The public sees only TEMPLE_CONFIRMED or PUBLISHED values of verified temples | `listed_temples`, `temple_public_fields`, `temple_parking` | `06`, `07` + 3 mutation checks |
| Append-only history and audit log | `temple_field_value_history`, `audit_logs` | `07_verification.sql`, E2E history table |
| Temple-admin checklist, admin drill-down `/admin/data-verification` | `apps/web` | E2E `registration.e2e.mjs` 17/17, 4 out of 4 runs |

## 3. What is needed to move real data forward

1. **The owner names the target temple** (WAITING FOR OWNER).
2. **Allow egress** to `www.onab.go.th` and `ratchakitcha.soc.go.th` (environment Network access → Allowed domains), or have a person record the registry page by hand with its URL and retrieval date.
3. **A temple authority signs in, claims the temple and confirms each field** (WAITING FOR TEMPLE). Questions: `REQUIRED_REAL_DATA.md` §5.
4. Deploy (Supabase is deferred by the owner because of cost) — **NOT IMPLEMENTED**.
