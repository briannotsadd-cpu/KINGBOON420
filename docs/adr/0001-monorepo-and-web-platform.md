# ADR-0001 — Monorepo layout and web platform

Status: **Accepted** for layout and frameworks; **Proposed** for Vercel hosting (owner ack, D-3). Date: 2026-10-07.

## Context
Greenfield repo. Mobile-first PWA required (UX IA §1); web + shared domain logic + SQL; spec §35 lists Next.js,
TypeScript, Vercel. Low-end Android phones are common among staff (R-11).

## Decision
- **pnpm workspaces + Turborepo.** Layout: `apps/web` (Next.js App Router, TypeScript strict), `packages/domain` (pure
  TS: availability resolver, quest FSM, readiness, scoring — no I/O), `packages/ui` (BOON UI components/tokens),
  `packages/temple-scene` (lazy-loaded 3D, Wave 5), `supabase/` (migrations, tests, seed), `tests/e2e` (Playwright).
- Node 22 LTS; Vitest for unit tests; Playwright for E2E (Chromium is available in CI and the dev container).
- Lint/format: ESLint + Prettier; `tsc --noEmit` in CI.
- Hosting (Proposed): Vercel preview deploys per branch.

## Consequences
- Domain case tables in `docs/domain/**` become Vitest suites in `packages/domain` verbatim.
- 3D is an optional package; the core app never imports it eagerly.
- Native apps deferred until pilot evidence (push reliability on iOS, voice).
