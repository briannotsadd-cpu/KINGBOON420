# SECURITY & PRIVACY MODEL — BOON SYSTEM

Status: **DRAFT v0.1 (Wave 0)**. Owner after Wave 1: Agent 13 (Security/Privacy), reviewed by Opus.

## 1. Security objectives (priority order)

1. **P0 — No cross-temple data leakage.** Any read or write across tenants is a release blocker.
2. **P0 — Protect minors and monastics.** Samanera and temple boys are often under 18; monastics must not be
   reachable by unsolicited contact.
3. **P0 — Ledger integrity.** Points cannot be minted, duplicated or transferred outside the defined functions.
4. **P1 — Least privilege per role/scope.**
5. **P1 — Privacy by default** for optional personal fields.
6. **P1 — Accountability:** every privileged action is audited.

## 2. Legal frame (Thailand) — to be confirmed by Agent 01 / legal counsel

- **PDPA B.E. 2562 (Thailand Personal Data Protection Act).** Lawful basis per data category; data subject rights
  (access, deletion, portability); breach notification; cross-border transfer rules (relevant if hosted outside
  Thailand).
- **Sensitive data (PDPA s.26) includes religious belief and health data.** Recording someone as a monk,
  samanera or temple member can reveal religion; "body information", height/weight may be health-adjacent.
  Requires **explicit consent** and minimisation. Consequence: monastic status is visible only inside the temple
  membership unless the person consents to public display.
- **Minors:** consent of a parent/guardian is required for users under the age threshold. Consequence: account
  type `minor` with restricted features (no person-to-person chat/calls with non-guardians, no public profile).
- Not legal advice. A Thai lawyer must review before pilot (risk R-07).

## 3. Threat model (STRIDE summary)

| Threat | Example | Control |
|---|---|---|
| Spoofing | Lay user claims monastic status to get monk-only views | `monastic_kind` set only by temple admin verification; audited |
| Tampering | Client sends another `temple_id` | RLS + composite FKs; server ignores client tenant unless membership active |
| Tampering | Self-verifying quest to farm points | verifier ≠ assignee constraint; anti-cheat rules |
| Repudiation | Admin denies changing a role | append-only `audit_logs` |
| Information disclosure | Temple B staff lists Temple A members via API filter omission | RLS default-deny; isolation test matrix |
| Information disclosure | Photo evidence leaks GPS | EXIF stripped on upload; storage policies per temple |
| DoS / abuse | Spam to Temple Contact; mass connection requests | rate limits per person & IP; moderation queue |
| Elevation | `temple_admin` grants self `finance.approve` | restricted permissions need abbot approval; cannot self-grant |

## 4. Controls by layer

| Layer | Control |
|---|---|
| AuthN | Supabase Auth (ADR-0002): phone OTP + email; LINE Login considered (Thai market) — ADR. Session refresh, device list, sign-out-all. |
| AuthZ | `has_permission(temple, code, scope)` in RLS and in every SECURITY DEFINER function |
| Tenant | `temple_id` + composite FK + forced RLS; active temple in JWT claim is advisory only |
| Audit | `audit_logs(actor, temple_id, action, entity, before, after, ip_hash, at)`; no update/delete grants |
| Rate limit | Edge/API middleware: auth, contact inbox, connection requests, message send, uploads, AI calls |
| Validation | Zod (or equivalent) schemas shared client/server; DB CHECK constraints for invariants |
| Uploads | MIME sniffing, size limits, image re-encode, EXIF strip, virus scan if feasible, private buckets with signed URLs |
| Privacy | Per-field visibility `PUBLIC/CONNECTIONS/PRIVATE`; optional sensitive fields default PRIVATE; never required |
| Communication | Connection-gated chat; block/mute/report everywhere; monastic DM off by default; minors restricted |
| Calls | Provider tokens minted server-side per call with room-scoped grants; no recording by default |
| AI | Only temple-scoped context passed; no cross-temple retrieval; drafts only; prompt-injection-safe tool design |
| Secrets | Environment secrets only; never in repo; secret scanning in CI |
| Monitoring | Sentry with PII scrubbing; security-relevant events alertable |

## 5. Anti-cheat (community points)

Signals: duplicate check-in, check-in outside geofence, impossible travel between check-ins, many accounts per
device, bursts of awards by one verifier, self-verification attempts. Outcome: hold the award for human review
— never auto-punish.

## 6. Security gates

| Gate | Evidence required |
|---|---|
| Wave 3 exit | Tenant isolation test matrix green on local PG16; RLS enabled+forced on 100% of tenant tables (catalog query output) |
| Wave 6 exit | Chat/call: blocked user cannot message/call; monastic DM default-off test; minor restrictions test |
| Wave 8 | External-style review: OWASP ASVS L2 checklist, dependency audit, penetration test of tenant boundary |
