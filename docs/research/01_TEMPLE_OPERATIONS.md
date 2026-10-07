# 01 — Temple Operations (RQ-01, RQ-02, RQ-04, RQ-08)

Author: Agent 01 (Product Research) · Date: 2026-10-07 · Status: **PLANNED — desk summary, sources unopened (desk, partial)** (relabelled by Opus at Wave 1 gate per R-18; was RESEARCHED) · Field validation: BLOCKED (R-03)

## 0. Evidence quality — read this first

During this run `WebSearch` worked but `WebFetch` and direct HTTP were blocked by the network proxy (EGRESS_BLOCKED). Every
source below was therefore seen only as a **search-result title, URL and generated summary**; the underlying page was
**not opened**. Rules applied in this file:

- A statement marked **[Sn]** is limited to what the search summary for that source said (source list at end; access date 2026-10-07).
- Statement marked **HYPOTHESIS** = general knowledge or inference, not verified by a source in this run. Treat as untested.
- No section numbers of the Sangha Act are asserted unless the search summary stated them; those are flagged "as stated by search summary, verify against Royal Gazette".

## 1. Day in the life (RQ-01)

### 1.1 What the sources support
- A published daily-routine feed for a temple programme shows the sequence: morning chanting (ทำวัตรเช้า) and alms round
  (บิณฑบาต), a Dhamma reflection, the meal (ฉันภัตตาหาร), and evening chanting (ทำวัตรเย็น) [S1]. A second summary describes
  midday meal (ฉันเพล), afternoon meditation (ภาวนา), then evening chanting [S1].

### 1.2 Working model for BOON (all HYPOTHESIS until a pilot temple confirms)
Times differ by temple, by season, by whether it is a Buddhist holy day (วันพระ) or shaving day (วันโกน), and by status of the monk.

| Block (HYPOTHESIS) | Typical content | Product implication |
|---|---|---|
| Pre-dawn to early morning | ทำวัตรเช้า, sweeping/duties, บิณฑบาต (not every monk, not every temple) | `schedule_entries` must support recurring routine blocks per temple, with per-monk exemptions |
| Morning meal | ฉันเช้า (some temples one meal, e.g. forest tradition) | Kitchen headcount feed (F-25) needs "meals per day" as a temple setting, not a constant |
| Late morning | ฉันเพล before noon (Vinaya: no solid food after noon — see doc 02) | Never schedule "meal" items after noon as monk meals |
| Afternoon | Class (novice/Pali/Dhamma study), duties, guests, invitations (กิจนิมนต์) | Teaching state (`TEACHING`) and invitation state compete for the same hours |
| Evening | ทำวัตรเย็น, study, rest | Evening chanting is a fixed commitment; do not suggest assignments that overlap |

**So the product must:** treat the routine as *template + exceptions*, never as an assumed fact about one monk's availability
(consistent with "never default to AVAILABLE").

## 2. How กิจนิมนต์ are requested and staffed today (RQ-02)

- No source found in this run documents the actual intake workflow (phone / LINE / notebook). **Status: OPEN (field research).**
- Search for online invitation/booking systems returned only generic LINE OA appointment/queue examples (clinic scheduling,
  queue systems) and no verifiable temple monk-booking product [S9]. This is weak evidence that LINE OA is a common
  technical pattern for booking in Thailand, not evidence about temples.
- HYPOTHESIS (current-state journey, to validate in field kit doc 08):
  1. Host (family/organisation) phones or messages the temple office or a monk directly.
  2. Secretary monk / office staff checks a paper or phone calendar and the abbot's wishes.
  3. Monks are chosen by seniority, speciality (e.g. funeral chanting), vehicle/driver availability and distance.
  4. Confirmation by phone/LINE; driver arranged; offering/donation handled by the host (outside system).
  5. Pain points: double booking, forgotten commitments, cannot see who is free, no travel time estimate.
- **So the product must:** capture invitations as *requests* with human confirmation (F-13/F-14), show conflicts rather than hide
  them, and accept messages pasted from LINE (AI draft only — F-39) because the first touchpoint is probably a chat message.

## 3. Sangha administration and legal basis (RQ-04)

### 3.1 Supported by sources
- The Sangha Act B.E. 2505 (1962) was amended in B.E. 2535 (1992); the amended act includes provisions on appointing a temple
  lay bursar (ไวยาวัจกร, "Veyyavaccakara") and on management of temple treasures, revenues and bookkeeping [S2].
- The abbot is charged with maintaining and managing temple property in good order; in practice he appoints the ไวยาวัจกร to
  handle matters on his behalf [S2]. A search summary also attributes to **section 31** the abbot's role as representative of
  the temple in general affairs [S2] — *as stated by search summary; verify the section number against the Royal Gazette text before use.*
- Academic review: management of temple assets from subsidies and donations is described as inefficient/unclear under the Act,
  its amendment No. 2 (B.E. 2535) and ministerial regulations, with corruption risk [S3].
- The Council of Elders (มหาเถรสมาคม) is the supreme governing body of the Thai Sangha, with duties including governing the
  Sangha, supervising novice ordination, education, propagation, public works/welfare, and safeguarding Dhamma-Vinaya [S4].
- Ecclesiastical rule: **Sangha Council Rule No. 18 (B.E. 2536) on appointing and removing ไวยาวัจกร** sets qualifications
  (a clause "ข้อ 6 (9)" is cited for a qualification) [S5]. Details of the qualifications were **not** seen.
- มัคนายก: described in academic sources as a lay person knowledgeable in Buddhist rites who supports the monks, encourages
  people to come to the temple, and leads ritual speech on merit-making days; one study analyses the persuasion language used
  to encourage donations [S6]. Whether the role is defined in statute was **not** established (likely custom — HYPOTHESIS).

### 3.2 Role mapping to `ROLE_PERMISSION_MATRIX.md` (HYPOTHESIS, needs legal/monastic review)

| Real role | Basis (as sourced) | BOON role code | Design implication |
|---|---|---|---|
| เจ้าอาวาส | Sangha Act; legal representative of temple property matters [S2] | `abbot` | Highest authority; finance approval stays with abbot-level + ไวยาวัจกร (F-43 post-pilot) |
| ไวยาวัจกร | Appointed by abbot under Act + Sangha Rule 18/2536 [S2][S5] | `facility_manager` (matrix label "ไวยาวัจกร / ผู้ดูแลทรัพย์สิน") | **Do not merge "property carer" with legal ไวยาวัจกร.** The legal role exists to handle money/property that monks must not handle (see doc 02). Recommend splitting into `waiyawatchakon` (legal bursar, restricted) and `facility_manager` (operational). |
| มัคนายก | Custom/ritual role [S6] | `ceremony_lead` | Matches matrix. Not an administrator of money. |
| รองเจ้าอาวาส / ผู้ช่วย | **HYPOTHESIS** from common practice | `deputy_abbot`, `abbot_assistant` | Validate titles in the field. |
| เจ้าคณะ (ecclesiastical district officials) | Hierarchy under MCT [S4] | not modelled | Relevant to Q-11 (see doc 02 §7). |

## 4. Devices, LINE and digital habits (RQ-08)

- ETDA's 2022 Thailand Internet User Behavior report exists with generational breakdowns: Gen Y online 8 h 45 min/day, Gen X 5 h 52 min,
  Baby Boomers 3 h 21 min (as reported by a news summary of the survey) [S7].
- A 2020 figure reported via Statista: LINE used by about 96.9% of Thai internet users as an online communication channel;
  among Baby Boomer internet users about 95.3% used Facebook and 93.1% LINE [S7]. This is dated (2020) and is among *internet users*, not the whole population.
- 2024 data: Facebook most popular social platform, then LINE, then TikTok; social media penetration 68.3% of the population [S7].
- Monks and technology: Thai academic literature reports monks using Facebook, YouTube, TikTok for propagation and counselling, group LINE for communication,
  and also societal/ethical concern and misconduct cases; usage among monks in one province was "moderate" [S8].
  **No sourced statistic for device ownership among monks, novices or lay temple staff was found.** Status: OPEN.

**So the product must:** (a) be a mobile-first PWA that works on low-end Android (HYPOTHESIS); (b) treat LINE as a primary
*notification and sharing* channel (see Q-04 in doc 02 §8 and REPORT); (c) assume monks may share a phone or have restricted use
(HYPOTHESIS) — shared-device and secretary-proxy flows are required; (d) offer large text and Simple Mode for elderly lay staff.

## 5. RQ status

| RQ | Status | Reason |
|---|---|---|
| RQ-01 | Partial | Routine sequence sourced only at generic level; times and variants are HYPOTHESIS |
| RQ-02 | Open | No sourced account of current invitation handling; field kit prepared |
| RQ-04 | Partial | Act, amendment, bursar rule existence sourced via summaries; section texts not read |
| RQ-08 | Partial | Population-level LINE/Facebook data sourced (some dated); monk-specific device data open |

## Sources (all accessed 2026-10-07 via WebSearch; pages not opened — see §0)

- [S1] https://www.trueplookpanya.com/truelittlemonk/season8/gallery/1561 (and neighbouring daily-routine gallery pages) — search summary of daily routine.
- [S2] https://so04.tci-thaijo.org/index.php/WTURJ/article/download/256310/173541 ; https://so05.tci-thaijo.org/index.php/PPJ/article/view/280969 — abbot duties, ไวยาวัจกร, Act amended B.E. 2535.
- [S3] https://so05.tci-thaijo.org/index.php/PPJ/article/view/280969 — temple assets legal measures.
- [S4] https://www.dailynews.co.th/articles/485175/ — functions of มหาเถรสมาคม.
- [S5] https://www.dailynews.co.th/news/5006335/ — Sangha Council Rule No. 18 (2536).
- [S6] https://so02.tci-thaijo.org/index.php/JGSR/article/download/271108/183969/1192050 — มัคนายก.
- [S7] https://www.etda.or.th/getattachment/78750426-4a58-4c36-85d3-d1c11c3db1f3/IUB-65-Final.pdf.aspx ; https://www.nationthailand.com/in-focus/national/40019312 ; https://thestandard.co/digital-2024-thailand-report/ ; https://www.statista.com/statistics/1129912/thailand-preferred-online-communication-channels (mirror listed in results).
- [S8] https://so04.tci-thaijo.org/index.php/jidir/article/view/276473 ; https://so12.tci-thaijo.org/index.php/JISDIADP/article/view/6079 ; https://so04.tci-thaijo.org/index.php/ksk/article/view/124902
- [S9] https://developers.line.biz/en/docs/line-mini-app/service/line-mini-app-oa/index.html.md ; https://grad.dpu.ac.th/upload/content/files/year13-1/13-6.pdf (generic LINE OA booking examples).
