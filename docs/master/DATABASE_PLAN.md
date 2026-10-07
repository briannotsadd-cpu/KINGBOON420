# DATABASE PLAN — BOON SYSTEM

Status: **DRAFT v0.1 (Wave 0)**. No schema exists (see `CURRENT_STATE_AUDIT.md`). Agent 08 turns this into
migrations in Wave 2/3 after ADR approval.

## 1. Proposed platform (requires ADR-0002)

| Option | For | Against |
|---|---|---|
| **PostgreSQL 16 + Supabase (Auth, RLS, Realtime, Storage)** — *recommended* | RLS is first-class; auth integrates with `auth.uid()`; realtime for chat/command center; storage with policies; spec lists Supabase | Vendor coupling; region choice (Singapore closest to TH) must be checked for PDPA cross-border transfer |
| Plain PostgreSQL + custom API (NestJS/Fastify) | Full control | Rebuild auth, realtime, storage; slower |

All schema work is written as **plain SQL migrations** so it runs both on Supabase and on the local PostgreSQL 16
in this environment. Auth-dependent helpers read a `request.jwt.claims` setting so tests can impersonate users
without Supabase.

## 2. Tenancy rules (non-negotiable)

1. Every tenant-owned table has `temple_id uuid not null references temples(id)`.
2. **Composite foreign keys** include `temple_id` (e.g. `foreign key (temple_id, quest_id) references
   quests(temple_id, id)`) so a row can never point to a row of another temple — enforced by the database, not by
   app code.
3. RLS is **enabled and forced** on every tenant table; default deny.
4. Policies call stable helper functions:
   - `app.current_person_id()`
   - `app.is_member(temple_id)`
   - `app.has_permission(temple_id, permission_code, required_scope)`
   - `app.in_scope(temple_id, row_owner_person_id, row_department_id)`
5. Writes that must be atomic or privileged (point credit, redemption, invitation confirm, quest verify) go
   through `SECURITY DEFINER` functions with `search_path` pinned, which re-check permission inside.
6. `service_role` / bypass keys are never shipped to clients; server functions using them must still pass an
   explicit `temple_id` filter and are covered by tests.

## 3. Table inventory (spec list → proposed table)

| Spec name | Table(s) | Tenant key | Notes |
|---|---|---|---|
| users | `auth.users` (Supabase) + `persons` | global | `persons.monastic_kind`, `monastic_verified_by`, locale |
| profiles | `persons` + `monastic_profiles` | monastic profile per person | vassa, ordination temple, Pali name |
| temples | `temples` | is the tenant | slug, name_th/en, tz, `has_3d_scene`, settings jsonb |
| temple_members | `memberships` | temple_id | status: invited/active/suspended/left |
| roles | `roles`, `membership_roles` | temple_id (templates: null) | |
| permissions | `permissions`, `role_permissions(scope)` | catalog global | |
| departments | `departments`, `membership_departments` | temple_id | |
| availability | `availability_manual`, `checkins` + view `v_monk_availability_now` | temple_id | resolver = SQL function |
| quests | `quests`, `quest_dependencies`, `quest_checklist_items` | temple_id | |
| quest_assignments | `quest_assignments` | temple_id | unique active per (quest, person) |
| quest_evidence | `quest_evidence` | temple_id | storage path + hash + EXIF-stripped flag |
| events | `events` (+ root quest) | temple_id | `memory_source_event_id` for duplication |
| event_tasks | quests with `parent_quest_id` + `event_staffing_targets` | temple_id | no separate task table |
| invitations | `invitations`, `invitation_assignments` | temple_id | |
| schedules | `schedule_entries` | temple_id | single calendar table |
| buildings | `buildings`, `zones` | temple_id | `code` unique per temple; 3D node mapping |
| assets | `assets` | temple_id | QR token |
| maintenance | `maintenance_requests` (→ quest) | temple_id | severity |
| inventory | `inventory_items`, `inventory_movements` | temple_id | movement ledger |
| vehicles | `vehicles` | temple_id | |
| trips | `trips`, `trip_passengers`, `trip_legs` | temple_id | |
| community_profiles | `community_profiles`, `profile_field_visibility` | global person | visibility per field |
| volunteer | `volunteer_signups`, `volunteer_skills` | temple_id | |
| connections | `connections` | global | blocks in `person_blocks` |
| conversations | `conversations`, `conversation_members` | temple_id nullable* | *temple-routed vs person-to-person |
| messages | `messages` | via conversation | |
| calls | `call_sessions`, `call_participants` | via conversation | media via provider (ADR) |
| activity_score | `monastic_activity_ledger` + view balance | temple_id | append-only |
| boon_point_transactions | `boon_point_transactions` + view balance | temple_id | append-only |
| reward_catalog | `reward_catalog` | temple_id | stock |
| reward_redemptions | `reward_redemptions` | temple_id | fulfilment status |
| notifications | `notifications`, `notification_prefs` | temple_id | |
| audit_logs | `audit_logs` | temple_id nullable (platform events) | append-only, no UPDATE/DELETE grants |
| moderation | `moderation_reports`, `moderation_actions` | temple_id | |
| (added) | `ai_drafts` | temple_id | AI output staging |
| (added) | `temple_contact_threads` | temple_id | public → temple routing |
| (added) | `achievements`, `person_achievements` | temple_id | |
| (added) | `temple_memory_notes` | temple_id | lessons learned |

*Person-to-person conversations between lay users are not tenant-owned; their RLS is membership-of-conversation
based. Monastic participants are only allowed via temple-routed conversations unless opted in.

## 4. Ledger design

- `boon_point_transactions(id, temple_id, person_id, amount int not null check (amount <> 0), kind ∈ {earn,
  redeem, reverse, adjust}, source_type, source_id, idempotency_key unique, created_by, created_at)`.
- Balance = `sum(amount)` per (temple, person). Redemption runs in a `SERIALIZABLE` function that locks the person
  row and rejects negative resulting balance.
- `monastic_activity_ledger` has the same shape **without** `redeem`; CHECK + trigger reject rows for lay persons.
- No UPDATE/DELETE privileges on either ledger for any client role.

## 5. Migrations and tests

- Tooling: `supabase/migrations/*.sql` (timestamped), applied by Supabase CLI in cloud and by `psql` in CI/local.
- Seed data lives in `supabase/seed/` and is **clearly fictional** (two demo temples `demo-a`, `demo-b`). Seed
  data is never used as evidence of real operation.
- Test harness: SQL tests (pgTAP if available, else plain `DO` blocks raising exceptions) run against local PG16:
  - tenant isolation matrix (every table × every role × other temple → 0 rows / write denied)
  - ledger invariants
  - availability resolver cases (priority table in `TEMPLE_DOMAIN_MODEL.md` §4.2)
  - quest state transitions (illegal transitions raise)
- CI job `db-test` must pass before any merge touching `supabase/**`.

## 6. Decisions pending

| ADR | Decision | Needed by |
|---|---|---|
| ADR-0001 | Monorepo layout & package manager (proposed: pnpm + Turborepo, `apps/web`, `packages/*`, `supabase/`) | Wave 2 |
| ADR-0002 | Database/auth host (proposed: Supabase, region ap-southeast-1) | Wave 2 |
| ADR-0003 | Tenancy enforcement pattern (composite FK + RLS helpers, above) | Wave 2 |
| ADR-0004 | Realtime & calls provider (Supabase Realtime + LiveKit proposed) | Wave 5 |
| ADR-0005 | AI provider and data handling | Wave 6 |
