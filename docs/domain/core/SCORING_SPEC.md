# SCORING SPEC (two ledgers, never merged)

Owner: Agent 02. Status: **DESIGNED**. Refines `docs/master/TEMPLE_DOMAIN_MODEL.md` §8 and features F-30, F-31,
F-32, F-33. Reward catalogue and redemption UX belong to Agent 11/12; this spec fixes the ledger rules they rely on.
**[EXT]** = extends a master doc; **HYPOTHESIS** = default without real-world evidence (all numeric defaults below are
temple-configurable and need pilot validation). No SQL, no code.

## 1. Non-negotiable rules (from the product rules)

1. Two separate ledgers: `monastic_activity_score` and `community_boon_points`. **No table, view, function or API
   may sum or join them into one number.**
2. The monastic score is never redeemable, **never ranked or compared, internally or publicly**, never public, never used for promotion or discipline.
3. Points are written only by server-side functions, only on `quest.completed` (or the other sources in §3-4),
   exactly once, in append-only rows. Rows are never updated or deleted.
4. Every row has `temple_id`. Balances are per `(temple_id, person_id)`.
5. AI never awards, reverses or redeems anything.

## 2. Ledger shapes

### 2.1 `monastic_activity_ledger` (append-only)

| Field | Rule |
|---|---|
| `entry_id`, `temple_id`, `person_id` | `membership.monastic_kind <> none` in this temple at write time (`LEDGER_KIND_MISMATCH` otherwise). |
| `amount` | integer; positive for earn, negative only for a reversal row. |
| `reason_code` | `QUEST_COMPLETION, ACHIEVEMENT, REVERSAL` |
| `source_type`, `source_id` | for example `quest_assignment`, id. |
| `idempotency_key` | unique within the ledger (§5). |
| `reverses_entry_id` | set only on `REVERSAL`. |
| `occurred_at`, `created_by_type` | `system` for all rows except none. Monastic rows are never written by a human actor. |
| `capped` | bool, true if the amount was reduced by a cap. |

### 2.2 `boon_point_transactions` (append-only, signed amounts)

| Field | Rule |
|---|---|
| `txn_id`, `temple_id`, `person_id` | `membership.monastic_kind = none` in this temple at write time. |
| `amount` | signed integer. |
| `txn_type` | `EARN, MANUAL_AWARD, REDEEM, REFUND, REVERSAL` |
| `source_type`, `source_id`, `idempotency_key`, `reverses_txn_id`, `actor_id`, `reason`, `occurred_at` | |

Balance = sum of `amount` for the person in the temple. `available_balance = max(0, balance)`. A reversal after
spending may make the balance negative (HYPOTHESIS; alternative: forbid reversal after spending, rejected here
because wrongful awards must be correctable; flagged to reward.manage as `NEGATIVE_BALANCE`). Redemption requires
`available_balance >= cost`.

## 3. Monastic activity score: earning rules

Label in UI: **"แต้มกิจวัตร"** (Opus decision F-01). "แต้มบุญ" is never used for monastics (it stays reserved for lay community points, "แต้มบุญชุมชน"). The label is accompanied by "ตัวชี้วัดความก้าวหน้าส่วนตัว แลกไม่ได้" (personal progress indicator, not exchangeable).

| Rule | Trigger | Amount (HYPOTHESIS defaults) |
|---|---|---|
| ME-1 | assignment COMPLETED on a quest whose ledger is MONASTIC_ACTIVITY | `quest.points.amount` (suggested 1-10), subject to the daily cap |
| ME-2 | *(removed, F-03)* streak milestones never write the monastic ledger; they are achievements only (§8) | 0 |
| ME-3 | achievement with `reward_points > 0` (§8) | per achievement; default 0 |

- **Daily cap** `monastic_daily_cap` = 30 points per local day (Asia/Bangkok, by `completed_at`). An award that would
  exceed it is reduced to the remaining room (`capped = true`, signal `DAILY_CAP_HIT`); at zero room no row is written
  and `scoring.award_capped{awarded: 0}` is emitted. The quest stays COMPLETED.
- Quests created by the assignee himself earn nothing (`SELF_CREATED_NO_POINTS` at publish; at completion any
  residual case is signal `SELF_CREATED`, award 0).
- No other source exists. Attendance, being scheduled for invitations or ceremonies, or anything an administrator
  clicks never adds score.

## 4. Community boon points: earning, manual award, redemption

| Rule | Trigger | Amount (HYPOTHESIS) |
|---|---|---|
| CB-1 `EARN` | assignment COMPLETED on a quest whose ledger is COMMUNITY_BOON (verification is never `none`, QUEST §5.2 G-PUB) | `quest.points.amount`, subject to `community_daily_cap` = 100 |
| CB-2 `MANUAL_AWARD` | human with `points.award_community` (D/T) | amount 1..50 (`AMOUNT_EXCEEDS_LIMIT` above), reason mandatory, actor is not the recipient (`SELF_AWARD_FORBIDDEN`), recipient is lay |
| CB-3 `REDEEM` | recipient requests a participation reward | `-cost`, guards below |
| CB-4 `REFUND` | redemption cancelled before fulfilment | `+cost`, links the REDEEM row |

Redemption guards: recipient `membership.monastic_kind = none` in this temple; ACTIVE membership in the temple; reward is active and in stock in
this temple; `available_balance >= cost` evaluated and written in one **serializable** transaction; per-person
limits from the reward definition. A monastic can never redeem (`FORBIDDEN_MONASTIC`).
Rewards are "ของที่ระลึกจากการร่วมกิจกรรม" (participation rewards); copy such as "buy merit" is forbidden (Agent 04/12).
Points are not transferable between persons or between temples.

## 5. Idempotency keys

| Row | Key |
|---|---|
| quest completion (either ledger) | `quest_completion:{quest_assignment_id}` |
| achievement | `achievement:{person_id}:{code}` |
| reversal | `reversal:{original_entry_id}` |
| manual award | `award:{request_id}` (client-generated uuid) |
| redemption | `redeem:{request_id}` |
| refund | `refund:{redemption_id}` |

A repeated key returns the existing row and result (`DUPLICATE_IGNORED`) without writing and without emitting a second
event. Ledger writers are driven by domain events delivered at-least-once (DOMAIN_EVENTS §1), so this is the
mechanism that prevents double credit.

## 6. Reversal

- Trigger for quest points: `quest.completion_revoked` (QUEST T15) -> system writes a `REVERSAL` row with
  `amount = -(amount actually credited)` and `reverses_entry_id`. Capped awards reverse only what was credited.
- Manual reversal of a community `EARN`/`MANUAL_AWARD` row: `points.award_community` (D/T) with reason; monastic rows
  have **no** manual reversal path (only the system, on revocation).
- A reversal is unique per original (`reversal:{id}`); a reversal of a reversal is rejected
  (`CANNOT_REVERSE_REVERSAL`). Redemptions are undone by `REFUND`, not `REVERSAL`.
- Original rows stay unchanged; balances change only by new rows.

## 7. Practice days and streaks

Derived read models (recomputable), not ledgers. **No streak ever writes either ledger**; milestones are achievements
(§8) only, non-redeemable and unranked.

### 7.1 Monastic: cumulative practice days, no loss mechanics (Opus decision F-03)

Definitions (time zone Asia/Bangkok):
- **Qualifying completion**: assignment of a `monastic_daily` or `novice_learning` quest, COMPLETED, not revoked,
  assignee monastic. **Work date** = local date of `submitted_at` (slow verification never costs a day).
- **Practice day** `d`: at least `streak_min_quests` (default 1) qualifying completions with work date `d`.
- **Excused day**: effective status `UNAVAILABLE` for the whole local day; skipped by the run computation.
- Shown to the monk: `practice_days_this_month` (count of practice days in the current local month, "ปฏิบัติแล้ว N วันในเดือนนี้")
  and `practice_days_total`. The **current run** (consecutive practice days ending today or yesterday, skipping
  excused days) is computed silently and shown only as a plain number when it is 2 or more.
- **No loss mechanics.** When a day is not a practice day: nothing is reset on screen, no "streak broken" message, no
  notification, no domain event, no score change, no red state. The run simply restarts from the next practice day
  without comment. There is no grace-day concept for monastics because nothing is lost. Counts are visible to the monk only.
- Recomputation after late verification, revocation or availability edit may change the numbers silently.
- Milestones (run reaches 7, 30, 100 days; 10, 20 practice days in a month) grant achievements (§8) with
  `reward_points = 0`, once per person per code per 90 days for repeatable ones; nothing else.

### 7.2 Lay: forgiving streak

- A lay **participation day** is a local day with at least one verified community quest completion (`volunteer`).
- Streak `L` counts consecutive participation days with **one grace day per 7 local dates**: scan days in order; a
  participation day -> `L += 1`; a non-participation day `d` (day ended) is tolerated if no tolerated miss occurred
  within `[d-6, d-1]` (`L` unchanged), otherwise `L = 0`.
- A lay streak awards achievements only (no points). Visibility follows profile settings (default PRIVATE).
  Wording is encouraging; a reset is shown as "เริ่มใหม่ได้เสมอ".

## 8. Achievements

`achievement = {code, name_th, name_en, ledger_kind ∈ {MONASTIC, COMMUNITY}, criteria (declarative: metric,
threshold, window), reward_points (default 0), repeatable (default false), visibility}`.

- Evaluated from domain events; granting is idempotent on `achievement:{person_id}:{code}`.
- Starter catalogue (HYPOTHESIS): `M-FIRST-QUEST`, `M-WEEK-RUN` (current run of 7 practice days), `M-LEARN-10` (10 completed
  `novice_learning`), `C-FIRST-VOLUNTEER`, `C-EVENT-HELPER-5` (5 verified volunteer shifts).
- Monastic achievements are visible **only to the monk**. Community achievements follow the profile visibility
  (default PRIVATE, Agent 12 may relax).
- Names must not imply merit levels, rank or superiority (no tiers such as "gold", no "most meritorious").
- An achievement for a ledger kind not matching the person's kind is never granted.

## 9. Explicit forbidden uses

| # | Forbidden | Enforcement point |
|---|---|---|
| F-1 | Redeeming, selling, converting or gifting `monastic_activity_score` | no redeem command accepts the monastic ledger; schema test |
| F-2 | Any ranking, leaderboard, "top monk" or comparison of monastic scores, internal or public | no endpoint or view; report code review; `report.view` returns completion rates only, never per-person scores |
| F-3 | Exposing a monk's score to anyone but himself (abbot included) | row-level access; open question OQ-SC1 |
| F-4 | Using the score for promotion, appointments, ordination matters, discipline or assignment | SMA reads no ledger (SCHEDULE_INVITATION §5.1); documented in UI copy |
| F-5 | Summing, joining, converting or displaying both ledgers together | no function or view that references both; schema/CI check |
| F-6 | Awarding the monastic ledger to a lay person, or community points to a monastic | write-time kind check (§2) |
| F-7 | Transferring points between persons or temples | no such command |
| F-8 | Copy that sells merit ("buy merit", "แลกบุญ" as a purchase) or implies the score measures merit | UX copy review (Agent 03/04) |
| F-9 | Human or AI writing monastic rows directly | monastic rows are system-written only |
| F-10 | Editing or deleting any ledger row | append-only; DB privileges |
| F-11 | Leaderboard for community points unless the temple enables it (default off), and then only opted-in display names | `temple.settings` flag; no minors |

## 10. Anti-cheat hooks

Hooks are pure functions `context -> signals[]` invoked before a ledger write; thresholds are configuration
(HYPOTHESIS defaults). Effects: `FLAG` (record and notify), `CAP` (reduce amount), `HOLD` (community only: no row
until reviewed), `REJECT` (hard guard).

| Signal | Trigger | Effect |
|---|---|---|
| `DAILY_CAP_HIT` | §3, §4 caps | CAP |
| `SELF_CREATED` | assignee is the quest creator | REJECT award (0) |
| `VERIFIER_CONCENTRATION` | one verifier approved >= 80% of an assignee's last >= 10 completions | FLAG + HOLD (community) / FLAG (monastic) |
| `VELOCITY` | >= 5 submissions by one person within 10 minutes | FLAG |
| `DUPLICATE_EVIDENCE_HASH` | same evidence hash on another quest within 30 days | HOLD (community) / FLAG (monastic) |
| `QR_SHARED_DEVICE` | one device completes QR check-ins for several persons | FLAG + HOLD (community) |
| `LEDGER_KIND_MISMATCH` | kind changed between assignment and completion | REJECT (award not written, quest still COMPLETED) |
| `NEGATIVE_BALANCE` | reversal pushes a balance below zero | FLAG to `reward.manage` |

HOLD semantics: no ledger row; `scoring.award_held` event; review item `{person, quest_assignment, signal}`. Reviewer
accepts -> the award is written with the original idempotency key; rejects -> nothing is written (completion stays;
a manager may separately `revoke_completion`). Monastic score has **no HOLD and no human reviewer**, only CAP/FLAG, to
avoid a review process over a personal progress indicator. Reviewer authority for community holds is `points.award_community` (D/T), per the YAML preamble.

## 11. Commands and security

| Command | Actor and permission (scope, `role_permissions.yaml` v0.3) | Note |
|---|---|---|
| `award_for_completion`, `credit_achievement`, `reverse_on_revocation` | system | audited as `system:<name>` |
| `manual_award_community` | `points.award_community` (D/T) | none |
| `manual_reverse_community` | `points.award_community` (D/T) | none |
| `review_hold` (accept/reject) | `points.award_community` (D/T) | none |
| `redeem`, `cancel_own_redemption` | the lay member himself: `community.participate` (S) | none |
| `fulfil_redemption`, `cancel_redemption`, manage catalogue | `reward.manage` (T: office_staff, waiyawatchakon; lay-only grant) | none |
| `view_my_ledger` | self | none (self action) |
| `view_person_ledger` (community only) | `points.award_community` (D/T) or `reward.manage` (T) | monastic ledger: **no viewer other than the person** |
| `enable_leaderboard` | `temple.settings` (T, restricted) | none |

## 12. Cases (`SC`)

Fixture: temple T1; `monastic_daily_cap = 30`, `community_daily_cap = 100`; M1 bhikkhu; N1 samanera; `vol1` lay
volunteer; `abbot1`; `kl` verifier; `now = 2026-10-07 10:00` (+07:00) unless stated. Balances start at 0 unless stated.

| ID | Given | When | Then |
|---|---|---|---|
| SC-01 | Q7 (5 points MONASTIC_ACTIVITY) assignment A7 for M1 reaches COMPLETED | `quest.completed{A7}` is processed | one monastic row `{amount +5, QUEST_COMPLETION, key quest_completion:A7}`; balance 5; event `scoring.activity_awarded` |
| SC-02 | SC-01 done | the same event is delivered again | no new row; `DUPLICATE_IGNORED`; balance 5; no second event |
| SC-03 | Q4 (10 COMMUNITY_BOON, `organizer_approval`) assignment A4 for vol1 COMPLETED | process event | one boon row `{EARN, +10}` for (T1, vol1); balance 10 |
| SC-04 | A5 community quest assigned to M1 **before** M1 was verified as bhikkhu (this temple's attestation made him bhikkhu afterwards); A5 reaches COMPLETED | process event | no row (`LEDGER_KIND_MISMATCH`); event `scoring.award_rejected`; quest stays COMPLETED; direct attempts to write activity score for vol1 or boon points for M1 are rejected the same way |
| SC-05 | SC-01 done; `kl` revokes A7 completion | `quest.completion_revoked{A7}`; replayed; then attempt to reverse the reversal | one `REVERSAL` row `{-5, reverses SC-01 row, key reversal:<id>}`; balance 0; replay ignored; `CANNOT_REVERSE_REVERSAL` |
| SC-06 | vol1 earned 10 (SC-03), redeemed a reward costing 10 (balance 0) | A4 completion revoked | `REVERSAL -10`; balance -10; flag `NEGATIVE_BALANCE` to `reward.manage`; `available_balance 0`; next redeem of cost 10 -> `INSUFFICIENT_BALANCE` until balance >= cost |
| SC-07 | vol1 balance 50; reward cost 30 in stock | `redeem(request r1)` | row `{REDEEM, -30}`; balance 20; redemption PENDING |
| SC-08 | vol1 balance 50; reward cost 60 | `redeem` | `INSUFFICIENT_BALANCE`; no row |
| SC-09 | vol1 balance 50; two simultaneous redemptions of cost 30 with different request ids; plus a duplicate of the first request id | run concurrently | exactly one succeeds, the other gets `INSUFFICIENT_BALANCE`; duplicate request id returns the first result; final balance 20; one REDEEM row |
| SC-10 | M1 (monastic) | `redeem(...)`; any call to move activity score | `FORBIDDEN_MONASTIC`; no command exists for the activity score (F-1) |
| SC-11 | M1 submits `monastic_daily` completions at `2026-10-01T16:50:00Z` and `2026-10-01T17:10:00Z` (both COMPLETED) | compute work dates | first is 10-01 23:50 local -> work date 10-01; second is 10-02 00:10 local -> work date 10-02; two different practice days |
| SC-12 | M1 practice days 10-01, 10-02, 10-03; none on 10-04; practice 10-05; none 10-06; practice 10-07 | read the monk's view at end of 10-07 | `practice_days_this_month = 5`; current run = 1 (shown as nothing); no event, no notification, no "broken" text, no ledger row at any point |
| SC-13 | M1 practice 10-01 and 10-02; UNAVAILABLE for the whole of 10-03 and 10-04; practice 10-05 | read at end of 10-05 | run = 3 (excused days skipped); `practice_days_this_month = 3` |
| SC-13b | M1 practice 10-01 and 10-02; UNAVAILABLE only 06:00-24:00 on 10-03; practice 10-04 and 10-05 | read at end of 10-05 | 10-03 not excused, no practice -> run restarts silently at 10-04; run = 2; `practice_days_this_month = 4` |
| SC-14 | M1 practice 10-01 through 10-07 | recompute, replay | run = 7 -> achievement `M-WEEK-RUN` granted once; **no ledger row**; replay creates nothing |
| SC-14b | lay `vol1` participation days 10-01, 10-02; none 10-03 (tolerated); 10-04 participation; none 10-05 | compute lay streak | `L` = 3 after 10-04 (grace used on 10-03); 10-05 is a second miss within 7 dates -> `L = 0`; UI shows "เริ่มใหม่ได้เสมอ"; no points involved |
| SC-15 | M1 already earned 24 today (10-07); quest QA = 10 points; later QB = 5 points the same day; next day QC = 5 | complete QA, QB, then QC on 10-08 | QA row `+6`, `capped = true`, `DAILY_CAP_HIT`; QB no row (`awarded 0`); QC `+5` (cap resets at 00:00 local); all three quests COMPLETED |
| SC-16 | quest created by M1 himself with residual `points 5` (legacy data) completes | process event | no row; signal `SELF_CREATED`; event `scoring.award_rejected` |
| SC-17 | `abbot1` (points.award_community T) | award vol1 20 (reason); award vol1 80; award himself; award M1 20 | `+20 MANUAL_AWARD`; `AMOUNT_EXCEEDS_LIMIT`; `SELF_AWARD_FORBIDDEN`; `LEDGER_KIND_MISMATCH` |
| SC-18 | any actor, including `abbot1` | request a monastic leaderboard; request a combined "total points" for M1; request a community leaderboard with the setting off; then on | `NOT_SUPPORTED` (F-2); `NOT_SUPPORTED` (F-5); `NOT_ENABLED`; ranking of lay members who opted in, top 10 |
| SC-19 | vol1 has boon balance 40 at T1; vol1 verified as samanera; later attestation REVOKED | evaluate earning and redemption at each stage | after verification: earning and redemption rejected, balance stays 40, no activity score created from it (activity score starts at 0); after revocation: balance 40 usable again; activity rows retained and hidden; never merged |
| SC-20 | vol1 has 10 completions, 9 verified by `kl` (90%); an 11th verified by `kl` | process event | `VERIFIER_CONCENTRATION`; no row; `scoring.award_held`; reviewer accepts -> row with the original key; reviewer rejects -> no row; accept replay -> no duplicate |
| SC-21 | vol1 balance T1 = 20, T2 = 0; vol1 active in both | `redeem` cost 10 in T2; T1 staff reads T2 rows | `INSUFFICIENT_BALANCE`; denied (no cross-temple read) |
| SC-22 | M1 reaches `L=7` | achievement evaluation, replay, other viewer reads M1 profile | one `M-WEEK-RUN` grant (reward 0); replay ignored; other viewers see nothing about it |
| SC-23 | community quest evidence hash equals one used on another quest 10 days ago | complete | `DUPLICATE_EVIDENCE_HASH`; award HELD; no row until reviewed |

Case count: **25** including SC-13b and SC-14b (minimum 15).

## 13. Traceability and open questions

| Spec | Master source |
|---|---|
| §1-2 | TEMPLE_DOMAIN_MODEL §8 table |
| §3-4 | §5.2 ("points credited only on COMPLETED"), §8 |
| §5-6 | §5.2 (idempotency key, reversal) |
| §9 | §8 ("No public ranking... never redeemable"), product rules |

| ID | Question | Owner |
|---|---|---|
| OQ-SC1 | May the abbot see an individual's activity score? Spec: no. | Opus, Agent 01 |
| OQ-SC2 | Negative balance after reversal vs forbidding reversal after spending (§2.2). | Opus |
| OQ-SC3 | Is a daily lay participation streak right for lay members (vs weekly)? | Agent 12 |
| OQ-SC4 | Are all numeric defaults (caps, milestone amounts, thresholds) acceptable to temples and not demotivating? | Agent 01 pilot |
| OQ-SC5 | Minors in community points (guardian consent). | Agent 13 |
