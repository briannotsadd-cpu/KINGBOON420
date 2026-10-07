# 02 — Vinaya and Religious Constraints (RQ-03, RQ-07)

Author: Agent 01 · Date: 2026-10-07 · Status: **PLANNED — desk summary, sources unopened (desk, partial)** (relabelled by Opus at Wave 1 gate per R-18; was RESEARCHED)

> **Authority notice.** Final interpretation of the Dhamma-Vinaya (พระธรรมวินัย) belongs to monastic authorities (the
> Sangha, the Council of Elders and the pilot temple's abbot and monk advisors), not to this document or to the product team.
> Everything here is a *design input* to be reviewed by a qualified monk advisor before any feature is designed against it.

Evidence quality: same limitation as doc 01 §0 — sources seen as search summaries only; pages not opened. Pāli rule numbers
beyond those a summary stated are labelled HYPOTHESIS (from general knowledge, to be verified in the Tipiṭaka / authoritative Thai edition).

## 1. Constraint table mapped to features

| # | Constraint area | What the sources / hypothesis say | Features (FEATURE_MATRIX) | Recommendation |
|---|---|---|---|---|
| C1 | **Money** | Nissaggiya Pācittiya rule 18: a bhikkhu may not receive, touch or take pleasure in gold and silver (money); also not through another person on his behalf or by accepting money kept for him [S1]. Putting cash directly into the alms bowl or hand puts monks in offence unintentionally [S1]. Basis for the lay role ไวยาวัจกร who handles funds (doc 01 §3). | F-43 Finance, F-32 Rewards, F-30, F-31, F-37 | Monastic users never see money amounts as *their* balance, cannot submit/approve payments, and never receive points convertible to money. Finance UI is lay-only (ไวยาวัจกร, accountant, abbot approval as authority function — validate with monk advisor whether abbot "approval" itself is acceptable). Monastic score is never redeemable (already a non-negotiable rule). Donation flows must not ask a monk to hold or confirm cash. |
| C2 | **Contact with women** | The monastic code has rules on touching, being alone, and sitting in private with women (Saṅghādisesa and Pācittiya categories); summaries confirm the topic and that Thai officials warn monks about conduct [S2]. Specific rule numbers: HYPOTHESIS (not read). | F-35 Chat, F-36 Calls, F-37 Temple Contact, F-34, F-28 | Public users reach monastics only via Temple Contact by default (already a rule). No monastic DM with lay women/girls by default; no 1:1 video call between monk and lay user (supports P2/post-pilot for F-36). Group/office-routed channels with a lay or senior monk custodian. Needs monk-advisor ruling before enabling any direct channel. |
| C3 | **Entertainment, games** | Sekhiyavatta (75 etiquette rules) and other training rules are cited by academic sources as the basis for monastic conduct [S3]; entertainment and gambling restrictions exist in the Vinaya (rule detail not confirmed in this run: HYPOTHESIS). | F-31 (achievements, streak), F-07 (quest framing), F-44 | "Game-like" framing is *tone*, not play: no levels, no loot, no leaderboard for monastics; no random rewards; calm visual language; achievements only as quiet confirmations of completed duties. Validate "quest" label (ภารกิจ) with monks. |
| C4 | **Ranking / competition** | Seniority by ordination years (พรรษา) is the traditional order — HYPOTHESIS. Ranking monks by score would conflict with humility norms and project rule. | F-31, F-15 | No ranking, no comparison view, no "top monk". Enforce in DB: no query exposes monastic score across people except to the person himself (and abbot-level only if monk advisors approve). |
| C5 | **Photography / media of monks** | Recent controversies about monks live-streaming and monetising social media content led to petitions to the Sangha authority [S4]. Policy on photography of monks in general: HYPOTHESIS. | F-08 Evidence, F-28, F-35 | Quest evidence photos must not include monks' faces unless the monk consents and temple policy allows; default evidence = place/object photos. No public gallery of monks. Public-facing monk photos only via temple-managed content. |
| C6 | **Phones/devices** | A resolution of the Council of Elders committee dated 20 March 2563 (2020) bans monks from driving cars and motorcycles [S5]; media and academic sources report concern on monks' social-media conduct and measures for monks violating discipline [S4][S6]. A blanket ban on monk phones was **not** found. | F-09, F-10, F-38, F-24 | Never assume a monk has a personal phone: support secretary-proxy and shared-device. Notifications must be quiet and schedulable (no night push). **Vehicle/driver features must model a lay driver for monks; never "monk drives" assignment.** |
| C7 | **Meal timing** | Meal (ฉันเพล) before noon in standard practice — HYPOTHESIS; see doc 01 §1. | F-25 Kitchen | Kitchen quests/headcounts treat noon as hard cutoff for monk meals; configurable per temple. |
| C8 | **Merit-as-metric** | In popular belief merit (บุญ) is not a countable quantity; counting it may be offensive — HYPOTHESIS, central to Q-07. | F-30, F-31 | See §2. |

## 2. Q-07 — Is "แต้มบุญ" acceptable for monastics?

**Finding:** No source in this run directly evaluates the label. The reasoning below is **HYPOTHESIS**, built from C1, C4 and C8.

Risks of "แต้มบุญ" on the *monastic* ledger:
1. It implies merit is quantified and earned by the monk through app activity (doctrinal concern, C8).
2. It sits beside lay "community boon points", which are redeemable for rewards; a shared word may read as monks "earning merit points for rewards" and touch C1.
3. It invites ranking and comparison (C4).

Alternatives (to be tested with monk advisors, in Thai):

| Option | Thai | Pros | Cons |
|---|---|---|---|
| A | แต้มกิจวัตร | Already the master-plan default alternative; describes duties, not merit | Reads like a points store |
| B | ความสม่ำเสมอในกิจวัตร / บันทึกกิจวัตร | No "points" at all; a log | Weaker motivation hook (acceptable) |
| C | ความก้าวหน้ากิจ / ความเพียร (วิริยะ) | Doctrinally positive word (effort) | "ความเพียร" may be too grand for a counter |
| D | ไม่แสดงตัวเลข — แสดงเป็นเครื่องหมาย ✓ ต่อวัน | Avoids numeric scoring | Needs UX design |

**Recommendation (Q-07):** Do **not** use "แต้มบุญ" for the monastic ledger in UI. Default to **Option A "แต้มกิจวัตร"** for internal consistency, and test Options B and D first because they carry the least doctrinal risk. Keep "แต้มบุญชุมชน" only for the lay ledger and test whether lay users read it as "buying merit"; consider "แต้มร่วมกิจกรรม" (participation points) for lay (see doc 05). Domain-model change proposed in REPORT.
The DB column names (`monastic_activity_score`, `community_boon_points`) can stay; only UI labels change.

## 3. Features against constraints — quick matrix

| Feature | C1 | C2 | C3 | C4 | C5 | C6 | Verdict |
|---|---|---|---|---|---|---|---|
| F-31 activity score | ok if not redeemable | – | tone risk | **conflict if ranked** | – | – | Keep, no ranking, relabel |
| F-30/F-32 boon points/rewards | monks excluded | – | – | – | – | – | Lay only |
| F-35/F-36 chat/calls | – | **risk** | – | – | risk | risk | Monastic DM off; calls post-pilot |
| F-24 vehicles | – | – | – | – | – | **monk never drives** | Driver is lay |
| F-43 finance | **core risk** | – | – | – | – | – | Lay-only, post-pilot |
| F-08 evidence photos | – | – | – | – | **risk** | – | Face-free default |

## 4. Open questions for monk advisors (Thai)
1. ภิกษุ/สามเณรควรเห็นหรือไม่เห็นตัวเลขคะแนนของตนเอง? (Should monks see any number?)
2. คำว่า "ภารกิจ" และ "แต้มกิจวัตร" เหมาะสมหรือไม่?
3. เจ้าอาวาสเป็นผู้อนุมัติเอกสารการเงินผ่านระบบได้หรือไม่ (ไวยาวัจกรเป็นผู้ดำเนินการ)?
4. ช่องทางใดที่ญาติโยมติดต่อพระได้อย่างเหมาะสมผ่านระบบ?
5. การถ่ายภาพ/แชร์ภาพพระในระบบควรมีข้อกำหนดอย่างไร?

## 5. Q-08 — Is monk check-in acceptable?

HYPOTHESIS: A *voluntary, quiet* check-in (e.g. tapping "I'm in the temple") is acceptable and is not surveillance if (a) opt-in, (b) expires (12 h default already in domain model), (c) never shown as location tracking, (d) no GPS. No source found. **Recommendation:** keep calendar + manual opt-in as primary; QR/NFC check-in optional and off by default for monastics; secretary may set status on behalf (audited). Validate in field (doc 08, Guide A/B).

## 6. Anchoring statements to verify
- "75 Sekhiyavatta; 227 training rules for a bhikkhu" appears in search summaries [S3][S7]. (Count matches general knowledge; confirm with Tipiṭaka source.)
- Of the training rules, 24 are discussed in the law-and-Vinaya literature as overlapping with criminal offences (Pārājika 4, Saṅghādisesa 2, Aniyata 2, Pācittiya 16) [S7] — shows Vinaya breach can also be a legal matter under the Sangha Act: HYPOTHESIS on implication for product (log of sensitive actions).

## 7. Q-11 — Does the product need Sangha governance approval?

- Sourced: MCT governs the Sangha and safeguards Dhamma-Vinaya [S8]; the Sangha Act creates ecclesiastical hierarchy and rules for abbots and temple property [doc 01 S2]. Measures on monks' technology and social-media use are being discussed at academic and committee level [S4][S6].
- No source found requiring a software tool to be approved by the Council of Elders. **Status: no legal requirement found (not proven absent).**
- **Recommendation:** (1) Obtain written consent of the pilot temple's abbot — he is the legal representative for temple affairs (doc 01). (2) Ask the abbot whether he wants the district/provincial ecclesiastical head (เจ้าคณะ) informed. (3) Treat any finance or monk-conduct feature as requiring explicit abbot approval. (4) Seek an informal opinion from a monk advisor / the temple's lawyer. Do not claim "approved by the Sangha" in marketing. Marked OPEN pending pilot (D-1).

## 8. Q-04 — LINE Login / LINE OA

Included here because it affects religious-contact channels. Sourced: LINE is the second/third most used app and LINE users ~97% of internet users in 2020 (doc 01 §4). **Recommendation:** P1, not P0. Use LINE OA/LIFF for *notifications and sharing event links to lay users* first; do not make LINE Login the only identity method; no monastic-targeted LINE messaging by default (C2). Verify LINE Messaging API terms and PDPA cross-border implications (LINE servers are abroad; see doc 03) before implementation.

## 9. RQ status

| RQ | Status | Reason |
|---|---|---|
| RQ-03 | Partial | Money rule sourced; others need Tipiṭaka text check and monk advisor |
| RQ-07 | Partial | Label evaluated by reasoning (HYPOTHESIS); gamification-ethics literature in religious contexts not found; streak research (doc 05) |

## Sources (accessed 2026-10-07 via WebSearch; pages not opened)
- [S1] https://www.thairath.co.th/lifestyle/culture/2959031 ; https://www.dailynews.co.th/articles/416083/ ; https://www.posttoday.com/dhamma/554756 — Nissaggiya Pācittiya 18 summary.
- [S2] https://www.pptvhd36.com/news/%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1/252468 ; https://so06.tci-thaijo.org/index.php/jmpr/article/download/250314/169376/892953 — monks and women rules.
- [S3] https://so06.tci-thaijo.org/index.php/ambj/article/download/241639/164299/831878 ; https://so09.tci-thaijo.org/index.php/BRJ/article/download/4594/2734/21694 — Sekhiyavatta.
- [S4] https://www.dailynews.co.th/news/4912117/ ; https://www.thansettakij.com/content/politics/456397 ; https://thethaiger.com/th/news/472765/ — monk social-media conduct petitions.
- [S5] https://www.dailynews.co.th/news/4912117/ (MCT committee resolution 20 Mar 2563, driving ban, as stated by search summary).
- [S6] https://so04.tci-thaijo.org/index.php/jidir/article/view/276473 — law on monks' technology and social media.
- [S7] https://so05.tci-thaijo.org/index.php/lawjournal/article/view/255286 ; https://so11.tci-thaijo.org/index.php/NVKS/article/download/1078/69/3511 — 227 rules; 24 overlapping with criminal offences.
- [S8] https://www.dailynews.co.th/articles/485175/ — MCT functions.
