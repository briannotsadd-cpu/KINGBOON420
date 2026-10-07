# REPORT — Agent 08 Database + RLS (Wave 2)

Saved by Opus from the agent hand-back, 2026-10-07. **Readiness: schema v1 IMPLEMENTED + TESTED locally (PG16).**
Not VERIFIED: CI workflow not yet run on GitHub; no app layer.

## Opus re-run (independent)
`bash supabase/tests/run.sh` → PASS 01_schema (19 tables, forced RLS, composite tenant FKs) · PASS 02_isolation
(14 tables × 28 roles, 784 cells) · PASS controls · PASS 03_ledgers · PASS 04_quest_guards · ALL DB TESTS PASSED, exit 0.

## Agent mutation evidence
`quests_sel` changed to `using (true or …)` → `ASSERT FAILED: role abbot sees 1 rows of temple B in quests`, exit 1;
restored → exit 0.

## Known gaps (carry to Wave 3)
1. Migrations need an owner with BYPASSRLS (SECURITY DEFINER helpers).
2. `delegated` / `explicit_grant` grants fail closed until a delegation table exists.
3. Scope modifiers A/P/C rank as self; coarse C availability aggregate not implemented.
4. Minor restrictions modelled only for community.* capabilities.
5. Ledger guard checks `monastic_kind` at insert only; changing kind later is not blocked (domain decision).
6. No point credit on quest COMPLETED (OQ-03).
7. No policies for invitation acceptance / join requests.
8. Out of v1 scope: events, facility, community, invitations, funerals, shifts, ai_drafts.
