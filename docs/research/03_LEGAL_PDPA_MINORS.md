# 03 — Legal: PDPA, Sensitive Data, Minors, Cross-border, Breach (RQ-05)

Author: Agent 01 · Date: 2026-10-07 · Status: **PLANNED — desk summary, sources unopened (desk, secondary sources)** (relabelled by Opus at Wave 1 gate per R-18; was RESEARCHED)

> **NOT LEGAL ADVICE.** This is a product-research summary built from law-firm and aggregator summaries, not from the
> Royal Gazette text of the Personal Data Protection Act B.E. 2562 (2019). A Thai lawyer must review before pilot (decision D-5).
> Evidence limitation: pages were not opened (fetch blocked); statements are limited to search summaries (see doc 01 §0).

## 1. Requirements as reported

| Topic | Requirement as reported | Source |
|---|---|---|
| Sensitive data (s.26) | Race, ethnic origin, political opinions, creed/**religious or philosophical beliefs**, sexual behaviour, criminal record, **health**, disability, trade union, genetic, biometric data need **explicit consent** unless another listed exception applies | [S1] |
| Minors — 10 years or under (s.20) | Consent must come from the holder of parental authority | [S1][S2] |
| Minors — 10 to under 20 (s.20) | Consent from the minor **and** the legal guardian, unless the act is one a minor may do alone under the Civil and Commercial Code | [S2] |
| Incompetent persons | Legal guardian consents | [S2] |
| Cross-border transfer (s.28) | Destination must have adequate protection (PDPC criteria) or an exception applies (law, consent, contract necessity, vital interests, public interest, approved safeguards such as SCC/BCR). PDPC issued rules on transfers to countries without adequate standards (2024 coverage) | [S3] |
| Breach notification (s.37(4)) | Notify the PDPC Office without undue delay and within 72 hours of becoming aware, when feasible; no notification if no risk to rights and freedoms; high risk also requires notifying data subjects (the latter point is **HYPOTHESIS** from general knowledge, not in the summaries seen) | [S4] |

## 2. Key product insight

Being a Buddhist monk, samanera, or lay member of a temple community **reveals religious belief**. In BOON the very fact of a membership
in a temple, or `monastic_kind <> none`, is therefore probably **sensitive data (s.26)** — HYPOTHESIS (interpretation, ask lawyer).
Health-related status (sick leave, "UNAVAILABLE — sick") is health data. Ceremony type "funeral" can reveal the deceased's family
circumstances.

**So the product must:**
1. Collect explicit, granular, withdrawable consent for membership of a temple, health-related statuses, and optional sensitive profile fields (already: optional, PUBLIC/CONNECTIONS/PRIVATE).
2. Show health-related availability as generic "ไม่พร้อม" to everyone except those with a need to know (do not display "sick" in Command Center broken-down view to broad roles — HYPOTHESIS recommendation).
3. Keep `temple_id` isolation (R-01) — cross-temple leak of religious-affiliation data is both P0 and likely a notifiable breach.
4. Record consent versions per person in an audit-able table (design owner: Agent 08/13).

## 3. Minors — samanera, temple boys, volunteers under 20

- Samanera and temple boys are frequently under 20 (and some under 10 — **HYPOTHESIS**; field to confirm).
- Under s.20 as reported, for ages 10–<20 both minor and guardian consent unless the act is permitted to minors alone [S2]. Whether registering for a *temple operations tool* is such an act: unknown → treat as requiring guardian consent (conservative HYPOTHESIS).
- Product consequences (aligns with Q-06 default "minor accounts, no P2P chat/calls"):
  - Minor accounts: no public profile, no chat/calls, no DM, no location, no photo evidence with face by default.
  - Guardian consent captured at onboarding (Thai text in doc 08), plus an adult sponsor (the abbot/teacher) recorded.
  - Samanera data visible only to those with a legitimate role (abbot, teacher, secretary).
  - Quests for minors: no after-dark or off-site tasks without an adult (HYPOTHESIS policy).

## 4. Cross-border transfer — hosting and vendors

- Planned stack: Supabase **ap-southeast-1 (Singapore)**, Vercel (global edge), Sentry, PostHog, an AI provider, possibly LINE (see EXECUTIVE_PRODUCT_PLAN §4).
- Singapore is outside Thailand: storing Thai personal data there is a cross-border transfer under s.28 unless an exception/safeguard applies [S3]. Whether Singapore counts as "adequate" depends on PDPC's criteria — **OPEN, lawyer** (the summaries seen do not say).
- Recommendation: (1) record every processor and region in a data-processing register; (2) sign DPAs with each vendor; (3) minimise sensitive data sent to AI vendors (drafts use pseudonymous ids, no health data); (4) analytics (PostHog) without sensitive fields; (5) ask the lawyer whether consent or SCC is the transfer basis.

## 5. Breach response

Prepare a runbook (owner Agent 13): detect → assess risk → notify PDPC within 72 h if risk → notify data subjects when high risk (HYPOTHESIS) → temple abbot informed same day. The 72-hour clock starts when the controller is *aware* [S4]. Who is the "controller" — the temple, the platform operator, or joint — is **OPEN (lawyer)** and affects who notifies.

## 6. Other items to put to the lawyer
- Controller/processor roles between BOON operator and each temple (temple likely controller of its members' data — HYPOTHESIS).
- DPO requirement threshold for large-scale sensitive data processing (not verified in this run).
- Lawful basis for volunteer and point records (contract/legitimate interest vs consent).
- Retention schedules, especially for minors and former members.
- Children's data and photographs in evidence uploads.

## 7. Feature impact table

| Feature | Data | Issue | Action |
|---|---|---|---|
| F-01, F-02, F-06 | Membership of a temple, monastic status | Sensitive (religion) | Explicit consent; minimise; audit |
| F-09, F-10, F-12 | Availability, "sick" states | Health | Generic display; role-limited |
| F-11 | Novice class/attendance | Minors | Guardian consent; teacher/abbot only |
| F-27 | Staff presence/leave | Employment/health | Limited roles |
| F-28, F-34, F-35, F-36 | Profile, chat, calls | Minors, sensitive optional fields | Minor accounts off; field visibility |
| F-08 | Evidence photos | Faces, minors | Consent; face-free default; retention |
| F-39, F-40 | Voice/text to AI vendor | Cross-border, sensitive | Minimise; DPA; drafts only |
| F-45 | Analytics/errors | Cross-border | No sensitive payloads |
| F-43 | Finance | Financial data | Post-pilot, legal review |
| F-04 | Isolation | Leak = breach | Test matrix |

## 8. RQ status
RQ-05: **Answered at summary level (secondary sources); lawyer review required.** Open: Singapore adequacy, controller/processor roles, DPO threshold.

## Sources (accessed 2026-10-07 via WebSearch; pages not opened)
- [S1] https://compliance.theartofservice.com/controls/pdpa-thailand/section-26 ; https://securiti.ai/?p=37615 ; https://www.tilleke.com/?p=62439
- [S2] https://compliance.theartofservice.com/controls/pdpa-thailand/section-20 ; https://www.tilleke.com/insights/thailand-issues-guidelines-on-pdpa-consent-and-notification-requirements ; https://www.linklaters.com/insights/data-protected/data-protected---thailand
- [S3] https://www.tilleke.com/insights/thailand-unveils-regulations-for-cross-border-personal-data-transfer ; https://compliance.theartofservice.com/controls/pdpa-thailand/section-28 ; https://www.lawplusltd.com/2024/02/pdpc-rules-on-personal-data-cross-border-transfer-from-thailand-to-recipient-without-adequate-personal-data-protection-standards/
- [S4] https://www.tilleke.com/insights/thailand-pdpc-notification-on-data-breaches/ ; https://www.iapp.org/news/a/thailand-s-pdpc-clarifies-data-breach-notification-requirements ; https://conventuslaw.com/report/thailand-pdpc-notification-on-data-breaches/
