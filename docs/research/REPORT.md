# REPORT — Agent 01 Product Research (Wave 1a)

Saved by the Lead Orchestrator from Agent 01's hand-back on 2026-10-07. Sub-agents could not write report files
in this harness, so the text was returned instead.

## Summary

Eight research files exist in `docs/research/` (01–08). **Main caveat:** WebSearch worked, but WebFetch and HTTP
were blocked by the egress proxy. No source page was opened; every citation was seen only as a search-result URL
and its generated summary. Claims are limited to what those summaries said; everything else is labelled
HYPOTHESIS. No section numbers, quotes, statistics or interviews were invented. **Primary texts still need a
verification pass** (Royal Gazette Sangha Act, official PDPA text, Tipitaka rule numbers, vendor pages).

## Files written

`01_TEMPLE_OPERATIONS.md`, `02_VINAYA_AND_RELIGIOUS_CONSTRAINTS.md`, `03_LEGAL_PDPA_MINORS.md`,
`04_COMPETITOR_ANALYSIS.md`, `05_COMMUNITY_VOLUNTEER_REWARDS.md`, `06_HERITAGE_3D_PERMISSIONS.md`,
`07_PERSONAS.md`, `08_FIELD_RESEARCH_KIT.md`.

## Top findings

1. **Money is the sharpest Vinaya constraint** (Nissaggiya Pacittiya 18, per summaries). Monks cannot receive or hold
   money, which justifies a legally distinct ไวยาวัจกร (appointed under the Sangha Act as amended B.E. 2535 and
   Sangha Council Rule 18/2536) and keeps finance and rewards lay-only.
2. **Q-07:** do not use "แต้มบุญ" for monastics. It implies quantified merit, sits beside redeemable lay points and
   invites ranking. Default "แต้มกิจวัตร"; also test "บันทึกกิจวัตร" and a no-number checkmark. For lay users,
   test "แต้มร่วมกิจกรรม" against "แต้มบุญชุมชน". A monk advisor decides.
3. **PDPA (not legal advice):** membership and monastic status likely reveal religious belief (s.26). Health
   statuses are health data. Minors 10 to under 20 need guardian involvement (s.20). Singapore hosting is a
   cross-border transfer (s.28) with an unconfirmed adequacy basis. Breach notification within 72 h (s.37(4)).
4. **Wat Arun 3D:** permission likely needs both the temple and the Fine Arts Department (UNESCO Tentative List).
   Drones need NBTC and CAAT registration plus an airspace check. No usable licence was verified for any existing
   model. No drone capture for the pilot.
5. **No analogue product** combines availability/roster, work orders, volunteer events and a temple ethics model.
   Adopt availability, swap and reminder patterns (Planning Center, ChurchSuite, Connecteam). Avoid streak
   loss-aversion, HP punishment and leaderboards.

## Gap-analysis recommendations

- **Q-04 LINE:** P1, not P0. LINE OA/LIFF for lay notifications and sharing; LINE Login never the only identity;
  no monastic-targeted messaging by default.
- **Q-08 monk check-in:** optional, opt-in, expiring, no GPS. A secretary may set status on a monk's behalf
  (audited). Calendar plus manual opt-in stays primary.
- **Q-11 governance approval:** no legal requirement found (not proof of absence). Get the pilot abbot's written
  consent, ask about informing เจ้าคณะ, never claim "Sangha-approved".

## RQ status

| RQ | Status |
|---|---|
| RQ-01 | partial |
| RQ-02 | OPEN — no source on real invitation handling; field kit prepared |
| RQ-03 | partial |
| RQ-04 | partial — roles and law identified via summaries; texts unread |
| RQ-05 | answered from secondary sources; lawyer needed |
| RQ-06 | partial — 16 products listed, shallow; Thai temple apps unverified |
| RQ-07 | partial — no religious-context gamification literature found |
| RQ-08 | partial — no monk/staff device data |
| RQ-09 | partial |
| RQ-10 | partial |

## Proposed changes to master docs

1. `TEMPLE_DOMAIN_MODEL.md` §1 "activity score": UI label "แต้มกิจวัตร" (working; "แต้มบุญ" not used for
   monastics pending monk advisor). Keep `monastic_activity_score`.
2. `TEMPLE_DOMAIN_MODEL.md` §1 "boon points": test "แต้มร่วมกิจกรรม" vs "แต้มบุญชุมชน".
3. `ROLE_PERMISSION_MATRIX.md` §2.2: split `facility_manager` into `waiyawatchakon` (legal bursar, restricted
   finance) and `facility_manager` (operational only).
4. `GAP_ANALYSIS.md` §3: add the Q-04, Q-07, Q-08, Q-11 recommendations.
5. `3D_STRATEGY.md` §5: temple written permission + Fine Arts Department confirmation; NBTC + CAAT + airspace
   check for drones; exclude CC BY-SA and NC models.
6. `FEATURE_MATRIX.md` F-31: no ranking, comparison views or streak-loss mechanics for monastics; lay streaks only
   with forgiveness.
7. `FEATURE_MATRIX.md` F-24: drivers are lay; a monk is never assigned as driver (MCT resolution of 20 Mar 2563
   as reported by a summary — verify).
8. `RISK_REGISTER.md`: add R-17 (Singapore hosting = cross-border transfer of religion-linked data) and R-18
   (research sources unverified because pages were not opened).

## Open questions

Real invitation workflow and decider · device ownership / shared phones · samanera ages and guardian logistics ·
whether abbot approval of finance is acceptable to monk advisors · whether amulets or Buddha images may be rewards
(probably not) · Singapore adequacy and controller/processor roles · Wat Arun permit process and airspace · Sangha
Act section numbers (e.g. s.31) against the Royal Gazette.

## Self-assessed readiness

01–06 RESEARCHED (partial; 04 shallow) · 07 Personas RESEARCHED as HYPOTHESIS, unvalidated · 08 Field kit
DESIGNED (unused; needs Thai native, monk-advisor and lawyer review) · Field research BLOCKED.

## Blockers

- **B1** WebFetch/HTTP blocked — primary sources unread. Re-run the verification pass once fetch is allowed.
- **B2** No pilot temple (R-03).
- **B3** No monk advisor for Vinaya interpretation or the label decision.
- **B4** Lawyer review required (D-5).
