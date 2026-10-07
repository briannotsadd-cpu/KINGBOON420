# RISK REGISTER — BOON SYSTEM

Revision 1 — 2026-10-07. Scale: Likelihood/Impact 1 (low) – 5 (high). Score = L × I.

| ID | Risk | L | I | Score | Mitigation | Owner | Status |
|---|---|---|---|---|---|---|---|
| R-01 | Cross-temple data leak via missing RLS or app-level filter | 3 | 5 | 15 | Composite FKs, forced RLS, generated isolation test matrix in CI from first migration | Agent 08/13 | Open |
| R-02 | No legally usable Wat Arun 3D model | 5 | 3 | 15 | LITE map path; commissioned stylized model; license register | Agent 05 / Owner | Open — **blocking F-19** |
| R-03 | No access to real temple users → product built on assumptions | 4 | 5 | 20 | Desk research labelled HYPOTHESIS; owner to secure pilot temple before Wave 4 | Owner / Agent 01 | Open — **highest** |
| R-04 | Gamification perceived as disrespectful (points for monks, "แต้มบุญ" label) | 3 | 4 | 12 | No ranking, no redemption, calm design; validate label with monk advisors | Agent 01/04 | Open |
| R-05 | Points system abused (fake check-ins, collusion) | 3 | 3 | 9 | Verification policies, anti-cheat holds, verifier ≠ assignee | Agent 11/13 | Open |
| R-06 | Unsafe contact with monks or minors through chat/calls | 3 | 5 | 15 | Temple Contact routing, monastic DM off, minor accounts, block/report | Agent 12/13 | Open |
| R-07 | PDPA non-compliance (religion/health sensitive data, cross-border hosting) | 3 | 4 | 12 | Explicit consent, minimisation, region choice, lawyer review pre-pilot | Agent 13 / Owner | Open |
| R-08 | Scope explosion (20 roles × many modules) delays the 10 core features | 4 | 4 | 16 | Role-aware module registry; waves; P0-only until pilot | Opus | Open |
| R-09 | AI makes or appears to make authoritative decisions (assigning monks, Vinaya rulings) | 2 | 5 | 10 | Drafts-only architecture; UI labelling; human confirm required by DB function | Agent 10 | Open |
| R-10 | Fake/seed data mistaken for real readiness | 3 | 4 | 12 | Seed temples named `demo-*`, banner in UI on demo tenants; Unknown semantics | Opus / Agent 14 | Open |
| R-11 | 3D hurts performance on low-end phones common among staff | 4 | 3 | 12 | Core UI independent of 3D; auto LITE; perf gate | Agent 15 | Open |
| R-12 | Thai speech-to-text quality insufficient for voice drafting (Pali terms, dialects) | 3 | 3 | 9 | Benchmark in Wave 7 with Thai temple vocabulary; fallback to form | Agent 10 | Open |
| R-13 | Availability data stale → wrong "พระว่าง" counts | 4 | 4 | 16 | Never default to AVAILABLE; expiry on manual status; UNKNOWN visible | Agent 02/07 | Open |
| R-14 | Parallel agents overwrite each other's files | 3 | 3 | 9 | `FILE_OWNERSHIP.md`, one owner per path, Opus merge | Opus | Open |
| R-15 | Spec mentions models/tools that may change (Sonnet/Opus versions, vendors) | 2 | 2 | 4 | ADRs; abstraction around AI provider | Opus | Open |
| R-16 | Using real temple names (Wat Pho, Wat Arun) in marketing/demo without consent | 3 | 3 | 9 | Use names only for pilot partners with consent; demo tenants fictional | Owner | Open |

## Change log

| Rev | Date | Change |
|---|---|---|
| 1 | 2026-10-07 | Initial register |
