# ROLE & PERMISSION MATRIX — BOON SYSTEM

Status: **v0.3 (Wave 1 gate, Opus)** — incorporates Wave 1a findings and the governance audit (Agent 20). Source of truth for grants: [`role_permissions.yaml`](role_permissions.yaml). Model: **RBAC + scoped permissions, per temple** (spec §30).

## 1. Model

```
person ──< membership(temple_id) ──< membership_roles >── roles(temple_id | system template)
                                   ──< membership_departments >── departments(temple_id)
roles ──< role_permissions(permission_code, scope)
```

- A permission grant is `(permission_code, scope[(condition)])`. Scope chain `self ⊂ department ⊂ temple`, with
  orthogonal modifiers A (assigned-only), P (public-only), C (counts/coarse). The *team* scope was removed at the
  Wave 1 gate (no data model). Conditions come from a closed list (`condition_keys` in the YAML).
- Validator + renderer: `python3 docs/master/tools/role_matrix.py --check` (enforces known roles, scope grammar,
  and invariants: samanera holds no management permission; monastics hold no lay-only permission
  (`finance.approve`, `reward.manage`, community capabilities); undertaker is assigned-only; audit is abbot-only).
- Effective permission = union over all roles of the membership in the **active temple only**. Nothing carries
  across temples.
- System role templates (below) are copied into a temple on onboarding; a temple may rename or extend them but
  cannot grant any permission marked 🔒 **restricted** (the YAML `restricted` list) without an abbot-level approval that is itself audited.
- The client uses permissions only to hide UI. **Authority is enforced in the database (RLS + SECURITY DEFINER
  functions) and API.**
- Mode is **per membership**: a membership with a temple-attested `monastic_kind` (decision F-04) → **Monastic Mode**; otherwise **Community & Staff Mode**. A lay staff role never
  switches someone into Monastic Mode, and a monastic never gets community boon points.

## 2. Roles

### 2.1 Monastic Mode

| Code | Thai | Notes |
|---|---|---|
| `abbot` | เจ้าอาวาส | Full temple authority; Command Center |
| `deputy_abbot` | รองเจ้าอาวาส | Most abbot grants; exact differences are in the YAML (no finance, audit, asset/vehicle manage) |
| `abbot_assistant` | ผู้ช่วยเจ้าอาวาส | Operations management |
| `monk_secretary` | พระเลขานุการ | Invitations, schedules, assignment proposals, reports |
| `bhikkhu` | พระภิกษุ | My Day, quests, own availability, own schedule |
| `samanera` | สามเณร | Learning quests, classes, attendance; **no management permissions** |
| `visiting_monastic` | พระอาคันตุกะ | Visiting monk/novice: own schedule and quests; no directory or colleague availability |

### 2.2 Community & Staff Mode

| Code | Thai | Department (default) | Home focus |
|---|---|---|---|
| `community_member` | ญาติโยม / บุคคลทั่วไป | — | Events, volunteer quests, community |
| `volunteer` | อาสาสมัคร | assigned per event | My volunteer quests, check-in |
| `temple_boy` | เด็กวัด | general | My tasks, check-in, report problem |
| `housekeeper` | แม่บ้าน | cleaning | Zones, cleaning quests, checklist, before/after |
| `kitchen_staff` | คนครัว | kitchen | Meal schedule, headcount, stock |
| `gardener` | คนสวน | garden | Zones, watering, equipment |
| `technician` | ช่าง | facility | Work orders, assets, repair history |
| `waiyawatchakon` | ไวยาวัจกร | office | Legal lay steward of temple property/money appointed under the Sangha Act (Agent 01, to verify against Royal Gazette); holds restricted finance grants because monks may not handle money |
| `facility_manager` | ผู้ดูแลอาคารและทรัพย์สิน | facility | Operations only: assets, maintenance, inventory, vehicles; no finance |
| `department_lead` | หัวหน้าฝ่าย | any (scope D) | Assign/verify/manage quests, shifts, presence and headcount **in own department**; `kitchen_lead` is `department_lead` in kitchen |
| `driver` | คนขับรถ | transport | Today's trips, vehicle issues |
| `security_guard` | รปภ. | security | Shifts, incidents, gate log |
| `traffic_staff` | เจ้าหน้าที่จราจร | security | Event parking/traffic quests |
| `ceremony_lead` | มัคนายก | ceremony | Ceremony timeline, readiness, checklist |
| `ceremony_team` | ทีมพิธี | ceremony | Assigned ceremony tasks |
| `undertaker` | สัปเหร่อ | ceremony | **Only funeral rites assigned to them** |
| `office_staff` | ธุรการ / สำนักงาน | office | Documents, bookings, meetings, invitations intake |
| `accountant` | บัญชี | office | Finance view (and approve only if granted) |
| `staff_general` | เจ้าหน้าที่วัด | any | My tasks |
| `lay_resident` | แม่ชี / ผู้พำนักในวัด | — | HYPOTHESIS (M-14): counted in kitchen headcount; volunteer-like grants |
| `temple_admin` | ผู้ดูแลระบบของวัด | office | Membership & role admin for the temple (lay), no finance |

`platform_admin` is outside the temple model: operates the platform, **no default read of temple data**.

## 3. Permissions catalog

| Code | Description | Restricted |
|---|---|---|
| `quest.view` | View quests | |
| `quest.create` | Create quests/drafts | |
| `quest.assign` | Assign/reassign quests | |
| `quest.complete` | Start/submit own assignments | |
| `quest.verify` | Verify others' submissions | |
| `quest.manage` | Cancel, edit any quest | |
| `event.view` / `event.manage` | View / manage events (boss quests) | |
| `invitation.view` / `invitation.manage` | View / triage & propose teams | |
| `invitation.confirm` | Confirm monk team for an invitation | yes |
| `schedule.view` / `schedule.manage` | Calendar | |
| `availability.view` | See monastic availability | |
| `availability.set_self` | Set own manual status | |
| `availability.set_others` | Set status for others (e.g. sick) | |
| `command_center.view` | Temple Command Center | |
| `member.view` / `member.manage` | People directory / invite, roles | manage: yes |
| `asset.view` / `asset.manage` | Assets & buildings | |
| `maintenance.report` / `maintenance.manage` | Report / triage & close | |
| `inventory.view` / `inventory.manage` | Stock | |
| `parking.report` | Report a parking lot status (available / filling / full / closed) | |
| `parking.manage` | Create and edit parking lots of the temple | |
| `vehicle.view` / `vehicle.manage` | Vehicles & trips | |
| `finance.view` / `finance.approve` | Finance | yes |
| `points.award_community` | Approve community point awards | |
| `reward.manage` | Reward catalog & fulfilment | |
| `moderation.manage` | Reports, blocks review | |
| `contact_inbox.manage` | Temple Contact inbox routing | |
| `community.participate` | Profile, connections, chat | |
| `quest.request` | Ask a department for help (creates DRAFT for a lead to publish) | |
| `event.approve` | Approve event date/venue/scope (PLANNING → APPROVED) | yes |
| `event.volunteer_approve` | Approve volunteer sign-ups for a department | |
| `ceremony.confirm_monks` | Confirm monk roster for in-temple ceremonies / funeral sessions | yes |
| `funeral.assigned.view` | See funeral rites one is assigned to | |
| `funeral.register.view` | Funeral register (deceased/family) | yes |
| `presence.view` / `presence.set_self` / `presence.set_others` | Staff presence (WORKING/FREE/ON_LEAVE/OFF_SITE_DUTY/UNKNOWN) | |
| `shift.manage` | Shifts and handover | |
| `headcount.view` / `headcount.adjust` | Meal headcount range / planned number | |
| `inventory.record` | Record consumption movements | |
| `security.log` / `security.incident.view` | Gate log, rounds / incident records | incident: yes |
| `document.view` / `document.manage` / `booking.manage` | Office documents and bookings (P2) | |
| `report.view` | Temple reports | |
| `audit.view` | Read audit log | yes |
| `temple.settings` | Temple configuration | yes |

## 4. Matrix (scope per role)

Legend: **T** temple · **D** department · **S** self · **A** assigned-only · **P** public items only · **C** counts/
coarse states only (ว่าง / ไม่ว่าง / ไม่ทราบ — never reasons such as PERSONAL) · `(condition)` from `condition_keys` ·
🔒 restricted · — none. Legacy v0.1 footnotes in domain specs map as: T¹ = P · T³ = C · T⁴ = C · T⁶ = T(monastics_only)
· D⁵ = D(panel_staff)/D.

<!-- GENERATED from role_permissions.yaml — do not edit the table by hand -->
| Permission | abbot | deputy | asst | secr | bhik | sam | visit | waiya | fac_mgr | tech | dept_lead | house | kitchen | garden | driver | cer_lead | cer_team | undert | office | acct | t_admin | guard | traffic | staff | t_boy | resident | vol | comm |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `quest.view` | T | T | T | T | S+P | S | S+P | D | D | A | D | A | A | A | A | D | A | A | D | A | A | A | A | A | A | A+P | A+P | P |
| `quest.create` | T | T | T | T | S | — | — | — | D | — | D | — | — | — | — | D | — | — | D | — | — | — | — | — | — | — | — | — |
| `quest.request` | — | — | — | — | T | — | — | — | — | T | — | T | T | T | T | — | — | — | T | — | — | T | — | T | — | — | — | — |
| `quest.assign` | T | T | T | T | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — |
| `quest.complete` | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| `quest.verify` | T | T | T | T | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — |
| `quest.manage` | T | T | T | — | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — |
| `event.view` | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | A | T | T | T | T | T | T | T | T | T | P |
| `event.manage` | T | T | T | T | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — |
| `event.approve` 🔒 | T | T | T | T(delegated) | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `event.volunteer_approve` | — | — | — | — | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — |
| `invitation.view` | T | T | T | T | A | — | — | — | — | — | — | — | — | — | A | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `invitation.manage` | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `invitation.confirm` 🔒 | T | T | T | T(delegated) | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `ceremony.confirm_monks` 🔒 | T | T | T | T(delegated) | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `funeral.assigned.view` | T | T | T | T | A | A | — | — | — | — | — | — | — | — | — | D | A | A | — | — | — | — | — | — | — | — | — | — |
| `funeral.register.view` 🔒 | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T(create_edit) | — | — | — | — | — | — | — | — | — |
| `schedule.view` | T | T | T | T | S+P | S+P | S+P | S | P | S | S | S | S | S | S | P | S | S | T | S | S | S | S | S | S | S | S | P |
| `schedule.manage` | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | D(kind_ceremony) | — | — | T | — | — | — | — | — | — | — | — | — |
| `availability.view` | T | T | T | T | C | — | — | — | — | — | — | — | — | — | A | C | — | — | C | — | — | — | — | — | — | — | — | — |
| `availability.set_self` | S | S | S | S | S | S | S | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `availability.set_others` | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `presence.view` | T | T | T | — | — | — | — | C | D | C | D | C | C | C | C | D | C | C | C | C | T | C | C | C | C | — | — | — |
| `presence.set_self` | — | — | — | — | — | — | — | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | — |
| `presence.set_others` | T | T | T | — | — | — | — | — | D | — | D | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — |
| `shift.manage` | — | — | — | — | — | — | — | — | D | — | D | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — |
| `headcount.view` | T | T | T | T | — | — | — | — | — | — | D | — | D | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `headcount.adjust` | — | — | — | — | — | — | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `command_center.view` | T | T | T | T | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | D(panel_staff) | — | — | — | — | — | — | — |
| `member.view` | T | T | T | T | T(monastics_only) | — | — | T | D | D | D | D | D | D | D | D | D | — | T | — | T | D | D | D | D | — | — | — |
| `member.manage` 🔒 | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — |
| `asset.view` | T | T | T | — | — | — | — | T | T | T | D | A | A | A | A | D | A | A | — | T | — | A | A | — | A | — | — | — |
| `asset.manage` | T | — | — | — | — | — | — | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `maintenance.report` | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | — |
| `maintenance.manage` | T | T | T | — | — | — | — | — | T | A | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `inventory.view` | T | T | T | — | — | — | — | T | T | D | D | D | D | D | — | D | — | — | — | T | — | — | — | — | — | — | — | — |
| `inventory.record` | — | — | — | — | — | — | — | — | — | D | — | D | D | D | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `inventory.manage` | — | — | — | — | — | — | — | — | T | — | D | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `parking.report` | T | T | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — | — | — | — | T | T | — | — | — | — | — |
| `parking.manage` | T | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — |
| `vehicle.view` | T | T | T | T | — | — | — | — | T | — | — | — | — | — | A | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `vehicle.manage` | T | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `finance.view` 🔒 | T | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — |
| `finance.approve` 🔒 | — | — | — | — | — | — | — | T(explicit_grant) | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `points.award_community` | T | T | T | T | — | — | — | — | D | — | D | — | — | — | — | D | — | — | — | — | — | — | — | — | — | — | — | — |
| `reward.manage` | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `moderation.manage` | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — |
| `contact_inbox.manage` | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `community.participate` | — | — | — | — | — | — | — | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| `community.p2p_chat` | — | — | — | — | — | — | — | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| `community.calls` | — | — | — | — | — | — | — | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| `community.public_profile` | — | — | — | — | — | — | — | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| `security.log` | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | S | S | — | — | — | — | — |
| `security.log.view` 🔒 | T | T | — | — | — | — | — | — | — | — | D(dept_security) | — | — | — | — | — | — | — | — | — | — | D | D | — | — | — | — | — |
| `security.incident.view` 🔒 | T | T | — | — | — | — | — | — | — | — | D(dept_security) | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `document.view` | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | T | — | — | — | — | — | — | — | — |
| `document.manage` | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `booking.manage` | — | — | — | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — |
| `report.view` | T | T | T | T | — | — | — | T | D | — | D | — | — | — | — | D | — | — | T | T | — | — | — | — | — | — | — | — |
| `audit.view` 🔒 | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| `temple.settings` 🔒 | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T(non_restricted) | — | — | — | — | — | — | — |

<!-- 61 permissions × 28 roles -->

Rules that the table cannot express:
1. **Minor flag overrides roles:** a membership flagged `minor` never gets person-to-person chat, calls or a
   public profile, whatever the role (`minor_overrides` in the YAML; PDPA s.20 per Agent 01).
2. **Money is lay-only (decision F-02, Vinaya per Agent 01; monk-advisor confirmation pending):** `finance.approve`
   and `reward.manage` are never granted to a monastic role; the abbot keeps `finance.view` for oversight.
   `waiyawatchakon` `finance.approve` requires an explicit, audited grant; default off.
3. Trip creation from a CONFIRMED invitation is a system action on behalf of the confirming human;
   `facility_manager` assigns vehicle and driver (Agent 18). A driver sees passenger names only for own trips.
4. `kitchen_staff` `headcount.view` shows the aggregate range only, never individual monk states.
5. `bhikkhu` `member.view` T covers the monastic directory only; lay contact details need `member.view` ≥ D.
6. `funeral.assigned.view` shows the rite list with alias names only; deceased/family data needs
   `funeral.register.view` 🔒.
7. Roles proposed and **rejected**: `staff_supervisor`, `event_department_lead`, `kitchen_lead` — all expressed as
   `department_lead` scoped to a department. Samanera do not hold `quest.request` (minors; R-22).

Cross-check rule: `undertaker` sees only funeral ceremonies they are assigned to (A); deceased and family data
is masked outside that assignment.

## 5. Role-aware Home composition

| Role | Home modules (ordered) |
|---|---|
| abbot / deputy / assistant | Command Center summary → approvals → today's events → invitations awaiting decision → My Day |
| monk_secretary | Invitations inbox → availability board → Smart Assignment → today's schedule → My Day |
| bhikkhu | My Day (schedule + quests) → availability toggle → streak/achievement → temple map |
| samanera | Today's class & learning quests → attendance → streak → My Day |
| housekeeper | My zones today → cleaning checklist → supplies → report problem |
| department_lead (kitchen) / kitchen | Meals today + headcount → prep quests → stock alerts → shopping list |
| gardener | Zones & watering → equipment → quests |
| technician / facility_mgr | Open work orders by severity → map maintenance layer → assets due for PM |
| driver | Today's trips (departure time first) → vehicle status → report vehicle issue |
| ceremony_lead / team | Next ceremony readiness → timeline → checklist → monk count |
| undertaker | Assigned funeral rites only → checklist |
| office / accountant | Documents & bookings → meetings → invitation intake → finance (if permitted) |
| volunteer / temple_boy / staff | My quests today → check-in → report problem |
| community_member | Today at this temple → volunteer quests → events → community → my points |

Home is assembled from a **module registry** keyed by permission, not by hard-coded role checks, so a temple
can create custom roles without code changes.

## 6. Verification required (Wave 3 gate)

- [ ] Generated SQL test: for every permission × scope, a member of temple A cannot read or write temple B rows.
- [ ] `undertaker` cannot list non-assigned ceremonies.
- [ ] `samanera` has zero management permissions.
- [ ] `community_member` cannot open a DM to a monastic.
- [ ] Monastic person cannot receive `community_boon_points`; lay person cannot receive activity score.
