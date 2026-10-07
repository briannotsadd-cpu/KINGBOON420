# Schema v1 (Wave 3 foundation) — status: DRAFT, proven on local PostgreSQL 16 only

Plain PostgreSQL 16 (ADR-0002, Supabase-compatible). Migrations run as an owner role **with BYPASSRLS** (superuser locally,
`postgres` on Supabase) because SECURITY DEFINER helpers must read membership tables past FORCED RLS. App role: `authenticated`.
Auth: JWT `sub` (`request.jwt.claims`) -> `persons.auth_user_id`.

## Tables
Global (allowlisted, forced RLS): `persons`, `temples`(tenant root), `roles`, `permissions`, `role_permissions` (seeded from YAML).
Tenant (`temple_id` + composite FKs + forced RLS): `memberships`(monastic_kind, is_minor), `monastic_attestations`, `departments`,
`membership_roles`, `membership_departments`, `audit_logs`(append-only), `quests`, `quest_assignments`, `quest_evidence`(meta),
`schedule_entries`, `availability_manual`(valid_until not null), `checkins`, `boon_point_transactions`, `monastic_activity_ledger`.

## Helpers (`app.*`, SECURITY DEFINER, fixed search_path)
`current_person_id()`, `is_member(temple)`, `permission_rank(temple, code)`, `has_permission(temple, code, 'S'|'D'|'T')`,
`in_scope(temple, code, owner_person, dept)` (T any; D own departments; S/A/P/C own rows), `record_monastic_activity(...)` (system only),
`write_audit(...)`, `deny_mutation()`.

## Seed
`supabase/seed/gen_roles_seed.py` expands @groups/overrides from `docs/master/role_permissions.yaml` -> `001_roles_permissions.sql` (526 grants, 28 roles).
`002_demo.sql`: fictional temples `demo-a`, `demo-b`.

## Decisions / limits to review (Opus)
1. **Fail-closed conditions:** grants with condition `delegated` / `explicit_grant` are ignored until a delegation/grant table exists (not in v1).
2. Scope modifiers A (assigned-only), P (public-only), C (coarse) are stored but rank as "self" (1); P is enforced for schedule (visibility='public'),
   A via assignment-owner policies; **C (coarse availability counts) and A on invitations/funerals are NOT implemented** (no aggregate function yet) — raw availability is self or T only.
3. Minors: `community.*` sub-capabilities denied in `permission_rank`; other minor restrictions (PDPA) not modelled yet.
4. `monastic_kind` mutability: ledger guard checks the kind at insert time only; changing kind later is not blocked (needs attestation-change rule — domain decision).
5. Quest `status` on `quests` is coarse (DRAFT/OPEN/CANCELLED/COMPLETED); lifecycle lives on `quest_assignments` (decision S-4). Points crediting on COMPLETED is not in v1 (needs OQ-03).
6. Skipped by scope: events, facility, community, invitations, funerals, shifts, ai_drafts.
7. Join requests/invitation acceptance (baseline rights) are not in v1 policies; memberships are written by `member.manage` holders.
8. Monastic ledger is readable only by its own person (no cross-person read, honouring no-ranking); admin reads need a decision.
