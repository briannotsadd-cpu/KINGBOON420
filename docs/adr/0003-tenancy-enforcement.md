# ADR-0003 — Tenancy enforcement pattern

Status: **Accepted**. Date: 2026-10-07.

## Context
Cross-temple leakage is P0 (spec §31). App-level filters are easy to forget.

## Decision
1. Every tenant table (including child tables) has `temple_id uuid not null`.
2. Foreign keys between tenant tables are **composite** `(temple_id, id)` so a row cannot reference another
   temple's row.
3. RLS **enabled and forced** on every tenant table; default deny; policies call `app.has_permission(temple_id, code,
   scope)` and related helpers derived from `docs/master/role_permissions.yaml`.
4. Privileged writes (ledger credit, redemption, verification, invitation/ceremony confirmation, attestation) go
   through `SECURITY DEFINER` functions with pinned `search_path` that re-check permission.
5. Tests generated from the YAML: for every tenant table × role, a member of temple A reads 0 rows and cannot write
   rows of temple B; a schema test fails if any table in the tenant schema lacks `temple_id` or forced RLS.

## Consequences
Slightly more verbose schema; isolation becomes a property the database proves in CI rather than a convention.
