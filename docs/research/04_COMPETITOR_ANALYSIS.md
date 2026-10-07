# 04 — Competitor and Analogue Analysis (RQ-06)

Author: Agent 01 · Date: 2026-10-07 · Status: **PLANNED — desk summary, sources unopened (desk, shallow — secondary summaries)** (relabelled by Opus at Wave 1 gate per R-18; was RESEARCHED)

Evidence limitation: vendor sites could not be opened (fetch blocked). Capabilities below are limited to what search summaries said.
A cell marked **?** means *not verified in this run* — not "absent". Pricing is quoted only where a summary stated it and is
volatile; re-check before any decision. No Thai temple-specific competing product with verifiable features was found.

## 1. Products reviewed (16)

| # | Product | Category | What was verified (source) |
|---|---|---|---|
| 1 | Planning Center (Services, People) | Church mgmt | Volunteer scheduling, team coordination; volunteers block dates and confirm/decline; matrix view scheduling months ahead with automated reminders; à-la-carte apps, Services listed at about USD 15/month in one review summary [S1] |
| 2 | ChurchSuite | Church mgmt | Rotas, rota swapping, built-in unavailability, automatic reminders; also people, giving, events, children's check-in; reviewers say not intuitive at first [S2] |
| 3 | Breeze / Tithely ChMS | Church mgmt | Child check-in, volunteer scheduling, giving tools; owned by Tithe.ly [S1] |
| 4 | Tithe.ly | Giving / church | Giving tools (same family as #3) [S1] |
| 5 | Elvanto | Church mgmt | **Not researched in this run** |
| 6 | VolunteerHub | Volunteer mgmt | Entry pricing reported from about USD 150/month; in operation since 1996 [S3] |
| 7 | Better Impact (Volunteer Impact) | Volunteer mgmt | Rated 4.7/5 on one review site (141 reviews) [S3] |
| 8 | SignUpGenius / SignUp.com | Volunteer sign-up | Reviewers found SignUp.com easier to set up and administer than VolunteerHub [S3] |
| 9 | UpKeep | CMMS | Work-order and issue-status tracking; reviewers praise transparent communication [S4] |
| 10 | Fiix | CMMS | Asset tracking, vendor mgmt, compliance auditing, purchase orders, calendar scheduling [S4] |
| 11 | MaintainX | CMMS | Work orders, audit trail, checklists, inventory, real-time collaboration; high ease-of-use ratings [S4] |
| 12 | Connecteam | Workforce | Mobile-first for deskless staff: shift scheduling, time tracking, checklists, forms, tasks, chat, shift swaps [S5] |
| 13 | Deputy | Workforce | Scheduling depth, demand forecasting, auto-scheduling, compliance rules [S5] |
| 14 | Habitica | Gamified habits | Habits become an RPG character; XP and gold for completion, HP loss for skipping [S6] |
| 15 | Duolingo (streaks) | Gamification reference | Streak counter; loss-aversion mechanism; risk of streak anxiety discussed in summaries [S6] |
| 16 | ONAB e-Donation / e-Prayer (with IsWhere.com) | Thai merit app | Lets users donate online to any temple and send a prayer to a temple (reported at launch) [S7] |
| – | Monday / ClickUp | Task patterns | Not researched |
| – | Thai temple LINE OAs | Thai | **Could not verify any**; only generic LINE OA booking examples [S8] |

Thai temple/merit apps beyond #16: not verified (search returned general articles on online merit-making and academic work on
merit-making apps [S7]). **Status: partial.** Recommend a field/desk follow-up with Thai-language app-store search by a person with store access.

## 2. Capability matrix vs BOON's 10 core features

Legend: ● verified in summary · ◐ partial/adjacent · ○ not seen (unverified) · ✕ not applicable by design.

| BOON core feature | PlanningCtr | ChurchSuite | VolunteerHub | SignUpGenius | CMMS (UpKeep/Fiix/MaintainX) | Connecteam | Deputy | Habitica/Duolingo | ONAB e-Donation |
|---|---|---|---|---|---|---|---|---|---|
| 1 Command Center (live status) | ○ | ○ | ○ | ○ | ◐ dashboards? ○ | ○ | ◐ | ✕ | ✕ |
| 2 Map / 3D | ○ | ○ | ○ | ○ | ○ | ◐ geofencing/GPS [S5] | ○ | ✕ | ✕ |
| 3 Quest (task w/ evidence) | ◐ | ○ | ○ | ○ | ● work orders, checklists [S4] | ● tasks, forms, checklists [S5] | ◐ | ◐ habit tasks [S6] | ✕ |
| 4 Monk availability | ● volunteer blockout dates [S1] | ● unavailability [S2] | ○ | ○ | ✕ | ◐ | ● availability [S5] | ✕ | ✕ |
| 5 Schedule & invitation | ● scheduling [S1] | ● rotas [S2] | ○ | ◐ sign-ups | ◐ PM calendar [S4] | ● shifts [S5] | ● [S5] | ✕ | ◐ send prayer? |
| 6 Event / Boss quest | ◐ | ● events [S2] | ○ | ◐ | ✕ | ○ | ✕ | ✕ | ✕ |
| 7 People + roles/permissions | ● | ● | ○ | ○ | ○ | ● | ● | ✕ | ✕ |
| 8 Community quest (volunteer) | ● | ● | ● | ● | ✕ | ✕ | ✕ | ✕ | ✕ |
| 9 Points + rewards | ○ | ○ | ○ | ○ | ✕ | ○ | ✕ | ● [S6] | ✕ |
| 10 AI secretary | ○ | ○ | ○ | ○ | ○ | ○ | ● auto-scheduling [S5] | ✕ | ✕ |

Reading: every analogue covers *slices*. None was seen combining roster/availability, work orders, volunteer events, **and** a
temple-specific ethics model. This is consistent with BOON's positioning but is a **shallow-evidence conclusion** (HYPOTHESIS on whitespace).

## 3. Patterns to adopt
1. **Availability-first volunteer scheduling** (block-out dates, confirm/decline, swap) — Planning Center, ChurchSuite [S1][S2] → F-12, F-29.
2. **Mobile-first checklists + forms for deskless staff** — Connecteam, MaintainX [S4][S5] → F-07, F-21, F-25 with large-text Simple Mode.
3. **Shift swap with or without approval** [S5] → configurable per temple.
4. **Automated reminders** [S1][S2] → F-38, with quiet hours and no push to monastics at night.
5. **Work-order lifecycle with status transparency** [S4] → F-21.
6. **Child check-in patterns** [S1] → informs minors handling (F-11), HYPOTHESIS relevance.

## 4. Patterns to avoid
1. **Streak loss-aversion** (Duolingo-style): summaries describe anxiety and unhealthy attachment [S6]. Avoid for monastics entirely; for lay, forgiving streaks or none. (Master plan lists "streak" under F-31 — flag in REPORT.)
2. **HP damage / punishment mechanics** (Habitica) [S6] — never punish for missed duties.
3. **Leaderboards** — conflicts with C4 (doc 02).
4. **Heavy training burden** — ChurchSuite users report needing training [S2]; BOON must be learnable by non-technical staff in minutes (HYPOTHESIS target).
5. **Tool sprawl / per-app pricing** — pricing models need to fit temple budgets (HYPOTHESIS: temples have little software budget).
6. **Western-church assumptions**: giving-centric flows (Tithe.ly) would collide with C1 for monastics.

## 5. Thai-specific gaps (HYPOTHESIS, to validate)
- Monk-invitation scheduling, vehicle/driver coupling, and Vinaya-aware constraints are not offered by the analogues seen.
- Thai users communicate through LINE (doc 01 §4); none of the Western tools were verified to support LINE-native notification.

## 6. RQ status
RQ-06: **Partial.** ≥10 products reviewed (16 listed; 14 with source-backed notes), matrix is shallow; Thai temple apps largely unverified.

## Sources (accessed 2026-10-07 via WebSearch; pages not opened)
- [S1] https://www.planningcenter.com/compare-planning-center-vs-breeze ; https://planningcenter.com/compare-planning-center-vs-tithely ; https://g2.com/products/planning-center-services/pricing ; https://capterra.com/p/132513/Breeze-ChMS/
- [S2] https://churchsuite.co.uk/case_study/church-admin-adapting-to-your-situation-3 ; https://www.techjockey.com/us/reviews/churchsuite
- [S3] https://www.g2.com/compare/signup-com-vs-volunteerhub ; https://www.capterra.ie/compare/79209/135392/volunteerhub/vs/signupgenius ; https://www.capterra.com.au/compare/79197/135392/volunteer-impact/vs/signupgenius
- [S4] https://www.g2.com/compare/fiix-cmms-vs-upkeep ; https://www.selecthub.com/cmms-software/upkeep-vs-maintainx/ ; https://www.g2.com/compare/fiix-cmms-vs-maintainx
- [S5] https://connecteam.com/connecteam-vs-deputy/ ; https://dupple.com/compare/deputy-vs-connecteam (note: Connecteam's own page is a vendor-biased source)
- [S6] https://habitdoom.com/blog/streak-anxiety-habit-trackers ; https://uxmag.com/articles/the-psychology-of-hot-streak-game-design ; https://mwm.ai/glossary/daily-streak (blogs; low authority)
- [S7] https://www.nationthailand.com/in-focus/40001141 ; https://so03.tci-thaijo.org/index.php/saketreview/article/view/278755 ; https://thesmartlocal.com/thailand/online-merit
- [S8] https://developers.line.biz/en/docs/line-mini-app/service/line-mini-app-oa/index.html.md
