# FILE OWNERSHIP — BOON SYSTEM

One writer per path. An agent may **read** anything, but may **write** only its paths. To change a file owned
by someone else, write a proposal in your own output; Opus applies it. Agents do not commit or push — Opus does.

Current wave: **Wave 1 closed → Wave 2 pending launch** (updated 2026-10-07).

Exception (audit F-36): `docs/master/role_permissions.yaml`, `docs/master/tools/role_matrix.py` and JSON examples in
specs are specification data/tooling, allowed in documentation waves.

## Active locks

| Path | Owner | Wave | Lock |
|---|---|---|---|
| `docs/master/**` | Opus (Lead Orchestrator) | all | permanent |
| `FILE_OWNERSHIP.md`, `README.md`, `docs/adr/**` | Opus | all | permanent |
| `docs/research/**` | Agent 01 — Product Research | 1a | released (complete) |
| `docs/domain/core/**`, `docs/domain/GLOSSARY.md` | Agent 02 — Temple Domain | 1a | released (complete) |
| `docs/domain/workforce/**` | Agent 17 — Temple Workforce | 1a | released (complete) |
| `docs/domain/facility/**` | Agent 18 — Facility / Asset | 1a | released (complete) |
| `docs/domain/events/**` | Agent 19 — Ceremony / Event Operations | 1a | released (complete) |
| `docs/ux/**` | Agent 03 — UX Architecture | 1b | released (complete) |
| `docs/reviews/wave-1/**` | Agent 20 — Governance Auditor | 1b | released (complete) |

## Reserved for later waves (no writes yet)

| Path | Planned owner | Wave |
|---|---|---|
| `docs/design/**`, `packages/ui/tokens/**` | Agent 04 | 2 |
| `packages/ui/**` except `tokens/` (scaffold), `packages/domain/**` (scaffold) | Agent 16 → 06/11 | 2 / 3 |
| `docs/security/**` | Agent 13 | 2 |
| `docs/3d/**` (except `ASSET_BRIEF.md`, Opus), `assets/3d/**` | Agent 05 — **active (Wave 2, procedural Wat Arun design)** | 2 |
| `packages/temple-scene/**` | Agent 05 | 5 |
| `supabase/migrations/**`, `supabase/tests/**`, `supabase/seed/**`, `docs/db/**` | Agent 08 | 2–3 |
| `.github/**`, `turbo.json`, root `package.json`, `pnpm-workspace.yaml` | Agent 16 | 2 |
| `apps/web/**` (split by route group when parallel) | Agent 06 | 3+ |
| `apps/web/src/server/**`, `supabase/functions/**` | Agent 07 | 3+ |
| `packages/domain/**` (pure domain logic: availability resolver, quest FSM, readiness) | Agent 02 → 11 | 3+ |
| `tests/e2e/**` | Agent 14 | 3+ |

## Conflict rule

If two agents need the same file, Opus splits the file or sequences the work. No agent edits a locked path,
even "just one line".
