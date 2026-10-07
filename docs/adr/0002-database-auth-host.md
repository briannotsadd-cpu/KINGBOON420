# ADR-0002 — Database, auth and realtime host

Status: **Accepted** by owner 2026-10-07 (D-3). Cross-border risk R-17 stays open for real pilot data. Date: 2026-10-07.

## Context
Tenancy relies on PostgreSQL RLS. Chat/Command Center need realtime; evidence photos need storage with policies.
Religion-linked and minor data make hosting location a PDPA question (Agent 01 doc 03: s.26, s.28).

## Options
| Option | For | Against |
|---|---|---|
| Supabase (PostgreSQL 16, Auth, RLS, Realtime, Storage), region ap-southeast-1 | First-class RLS, `auth.uid()`, realtime, storage policies; spec §35 | Cross-border transfer TH → SG; vendor coupling |
| Self-hosted PostgreSQL + custom auth/realtime in Thailand | Data residency | Large build/ops cost |

## Decision (proposed)
Supabase in ap-southeast-1 **for development and demo tenants only** until the owner and a Thai lawyer confirm the
transfer basis. **No real pilot personal data enters any host before that confirmation.**
All SQL is written **portable** (plain PostgreSQL 16 migrations; auth read via a `request.jwt.claims` setting) so it
runs on the local PostgreSQL 16 in the dev container and in CI, and could move to Thai hosting.

## Consequences
Wave 2/3 database work and tenant-isolation tests proceed locally without any cloud account. Choosing a host is not
on the critical path until pilot data.
