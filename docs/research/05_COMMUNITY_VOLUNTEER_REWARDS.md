# 05 — Community, Volunteers and Rewards (RQ-09; also RQ-07 gamification input)

Author: Agent 01 · Date: 2026-10-07 · Status: **PLANNED — desk summary, sources unopened (desk, partial)** (relabelled by Opus at Wave 1 gate per R-18; was RESEARCHED)

Evidence limitation: see doc 01 §0 (search summaries only). Statements without [Sn] are HYPOTHESIS.

## 1. What motivates volunteers

- Thai research on จิตอาสา (volunteer spirit) reports: pride in helping people in need, joy of giving without expecting return, and (for health-care volunteers) professional pride [S1].
- Factors positively associated with volunteer behaviour in a Thai study: volunteer motivation, attitude toward volunteering, self-efficacy, social support (family support, having a volunteer role model); age and gender also significant [S1].
- Teen volunteers in a hospital case study showed six motivation dimensions, including values (pride in helping, self-development), understanding (learning how work systems operate) and social (communication skills) [S1].
- International framework: the Volunteer Functions Inventory (Clary, Snyder and colleagues) identifies six functions volunteering can serve (commonly: values, understanding, social, career, protective, enhancement — the list of names is general knowledge; the summary confirmed "six functions") [S2].
- Merit-making (ทำบุญ) as motive: widely described in Thai Buddhist culture (e.g., giving to temples) [S3]; its role specifically for temple volunteers was **not** sourced — HYPOTHESIS: ทำบุญ is a primary motive alongside community belonging and respect for the abbot.

**So the product must:** recognise contribution through values-aligned feedback (thanks from the temple, visible impact: "meals served",
"people helped"), social proof (group participation) and learning (skills, roles) — not rely only on points.

## 2. Extrinsic rewards and crowding out

- Economics literature indicates extrinsic (financial) incentives can crowd out intrinsic motivation, especially in charitable contexts; researchers have designed interventions that avoid this pitfall [S4]. (Summary level; effect sizes unverified.)
- **Implication (HYPOTHESIS, moderate confidence):** large or cash-like rewards for volunteering risk turning ทำบุญ into a transaction and undermining the intrinsic reason people come.

## 3. Acceptable participation rewards (recommendation)

Principles (all design recommendations, to validate in field):

| Principle | Rule |
|---|---|
| No "buying merit" | Rewards never mention merit (บุญ/กุศล) as the thing exchanged. Wording: "ของที่ระลึกจากการร่วมกิจกรรม" (participation keepsake) as in domain model. |
| Modest, symbolic | Items of small value: temple-made keepsake, amulet-free items, certificate of participation (เกียรติบัตร), thank-you letter, a seat/recognition at an event. HYPOTHESIS: avoid sacred objects (amulets, Buddha images) as redeemable rewards — sensitive; ask monk advisors. |
| Non-cash | No cash equivalents, no vouchers redeemable for money, no raffle/lottery (gambling concerns, doc 02 C3). |
| Not tied to donation | Points are awarded for time/work, never for money donated. Donations never produce points (prevents "pay for merit"). |
| Monastics excluded | Monastic score never redeemable (platform rule); monks do not receive lay points. |
| Opt-in visibility | Volunteer hours may be shown privately; public thanks only with consent. No public leaderboard of lay volunteers by default. |
| Fair and auditable | Every award traces to a verified quest; verifier ≠ assignee (domain model §5). |
| Budgeted | Reward catalog items have stock and monthly caps set by temple. |

Label for lay points: test **"แต้มร่วมกิจกรรม"** vs "แต้มบุญชุมชน" with lay users in the field: the word บุญ next to a redeemable item can read as merit for sale (doc 02 §2, HYPOTHESIS).

## 4. Anti-abuse lessons

No volunteer-platform abuse study was found in this run. General design lessons (HYPOTHESIS from common platform practice, to validate):
1. Verification by someone other than the volunteer (staff scan QR at the event; check-in/out).
2. Caps per day and per quest type; unusual-pattern flags go to a human review queue (F-33) — never auto-punish.
3. Collusion: no self-verification; family/same-device flags are *signals*, not accusations.
4. Photo evidence is easy to fake: prefer on-site QR + staff confirmation over photos.
5. Review hold before points become redeemable (e.g., 48 h) for high-value quests.
6. Appeals path with a named human.
7. Streaks: summaries describe loss-aversion and streak anxiety risks [S5]; **no streaks for monastics; if used for lay, include forgiveness (rest days/"pause")** — see doc 04 §4.

## 5. Tone — respectful vs childish (RQ-07 input to Agent 04)
- Recommend calm visual language (HYPOTHESIS): no confetti, coins, or explosive animation on monastic screens; quiet acknowledgement ("บันทึกแล้ว") is enough.
- "Quest/Boss quest" are internal metaphors; UI copy should say ภารกิจ / งานใหญ่ of the temple (e.g. กฐิน) rather than "boss". Test the word "boss" with Thai users — probably inappropriate beside a religious ceremony (HYPOTHESIS).
- No literature specifically on gamification ethics in religious settings was found. RQ-07 stays partial; field interviews required.

## 6. RQ status
RQ-09: **Partial** — Thai volunteer motivation and crowding-out literature found at summary level; temple-specific volunteer evidence and anti-abuse studies open.

## Sources (accessed 2026-10-07 via WebSearch; pages not opened)
- [S1] https://so03.tci-thaijo.org/index.php/papojournal/article/view/289072 ; https://so02.tci-thaijo.org/index.php/jmsr/article/view/272081 ; https://so07.tci-thaijo.org/index.php/JSSD/article/view/12036
- [S2] https://experts.umn.edu/en/publications/understanding-and-assessing-the-motivations-of-volunteers-a-funct/ ; https://users.nber.org/~rdehejia/!@$DRM/Lecture%2009/supplemental/Clary%20et%20al.pdf
- [S3] https://thesmartlocal.com/thailand/online-merit ; https://mysakonnakhon.com/how-to-make-merit-in-thailand/
- [S4] https://mpra.ub.uni-muenchen.de/30343 ; https://topcat.aeaweb.org/conference/2011/retrieve.php?pdfid=377
- [S5] https://habitdoom.com/blog/streak-anxiety-habit-trackers ; https://uxmag.com/articles/the-psychology-of-hot-streak-game-design
