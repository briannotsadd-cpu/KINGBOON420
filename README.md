# BOON SYSTEM — ระบบบุญ

Temple Operating System + Monastic Life System + Temple Workforce + Community Network.

**Status:** Wave 1 closed; Wave 2 in progress (database schema + RLS tests, procedural 3D Wat Arun; Figma design paused
by plan limit). Local app: login, temple claim, data verification, parking (see FEATURE_MATRIX). **No real temple data** —
see [`docs/data/TEMPLE_DATA_AUDIT.md`](docs/data/TEMPLE_DATA_AUDIT.md). Not deployed.

## Run the app locally

```bash
pnpm install
bash supabase/dev/local-db.sh start            # empty PG16 database on :54322 (no sample data)
cp apps/web/.env.example apps/web/.env.local   # then set AUTH_PEPPER and PLATFORM_ADMIN_EMAILS (your email)
pnpm --filter @boon/web dev                     # http://localhost:3000
```

Without `RESEND_API_KEY`/`MAIL_FROM`, no email is sent: in development the 6-digit login code is printed in the
server terminal and the page says plainly that no email was sent.

Tests: `bash supabase/tests/run.sh` (database) · `pnpm --filter @boon/web test` (unit) ·
`bash apps/web/e2e/run.sh` (end-to-end in Chromium at phone size; resets the local database before and after).

## Start here

| Document | Purpose |
|---|---|
| [`docs/master/EXECUTIVE_PRODUCT_PLAN.md`](docs/master/EXECUTIVE_PRODUCT_PLAN.md) | Vision, waves, decisions needed |
| [`docs/master/CURRENT_STATE_AUDIT.md`](docs/master/CURRENT_STATE_AUDIT.md) | What exists today, with evidence |
| [`docs/master/GAP_ANALYSIS.md`](docs/master/GAP_ANALYSIS.md) | Spec vs reality, open questions |
| [`docs/master/TEMPLE_DOMAIN_MODEL.md`](docs/master/TEMPLE_DOMAIN_MODEL.md) | Domain, availability state model, quest lifecycle, ledgers |
| [`docs/master/ROLE_PERMISSION_MATRIX.md`](docs/master/ROLE_PERMISSION_MATRIX.md) | Roles, permissions, scopes, role-aware home |
| [`docs/master/FEATURE_MATRIX.md`](docs/master/FEATURE_MATRIX.md) | Every feature with readiness status |
| [`docs/master/UX_INFORMATION_ARCHITECTURE.md`](docs/master/UX_INFORMATION_ARCHITECTURE.md) | IA, navigation, interaction rules |
| [`docs/master/DATABASE_PLAN.md`](docs/master/DATABASE_PLAN.md) | Tables, tenancy, ledgers, tests |
| [`docs/master/SECURITY_MODEL.md`](docs/master/SECURITY_MODEL.md) | Threats, PDPA, controls, gates |
| [`docs/master/3D_STRATEGY.md`](docs/master/3D_STRATEGY.md) | 3D modes, budgets, asset legality |
| [`docs/master/RESEARCH_PLAN.md`](docs/master/RESEARCH_PLAN.md) | Research questions and methods |
| [`docs/master/AGENT_PLAN.md`](docs/master/AGENT_PLAN.md) | Waves, agents, gates |
| [`docs/master/AGENT_PROMPT_PACK.md`](docs/master/AGENT_PROMPT_PACK.md) | Prompts given to sub-agents |
| [`docs/master/RISK_REGISTER.md`](docs/master/RISK_REGISTER.md) | Risks and mitigations |
| [`docs/master/SPEC.md`](docs/master/SPEC.md) | Owner's specification (baseline) |
| [`docs/adr/`](docs/adr/README.md) | Architecture decisions |
| [`docs/design/DIRECTIONS.md`](docs/design/DIRECTIONS.md) | Three visual directions (partial) |
| [`docs/3d/ASSET_BRIEF.md`](docs/3d/ASSET_BRIEF.md) | 3D model requirements |
| [`FILE_OWNERSHIP.md`](FILE_OWNERSHIP.md) | Who may write which paths |

Readiness vocabulary: `PLANNED → RESEARCHED → DESIGNED → IMPLEMENTED → TESTED → VERIFIED → PILOT_READY`, or `BLOCKED`.
