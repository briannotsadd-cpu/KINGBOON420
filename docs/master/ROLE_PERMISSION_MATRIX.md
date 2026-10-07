# ROLE & PERMISSION MATRIX — BOON SYSTEM

Status: **DRAFT v0.1 (Wave 0, Opus)**. Model: **RBAC + scoped permissions, per temple** (spec §30).

## 1. Model

```
person ──< membership(temple_id) ──< membership_roles >── roles(temple_id | system template)
                                   ──< membership_departments >── departments(temple_id)
roles ──< role_permissions(permission_code, scope)
```

- A permission grant is `(permission_code, scope)`. Scope ∈ `self ⊂ team ⊂ department ⊂ temple`.
- Effective permission = union over all roles of the membership in the **active temple only**. Nothing carries
  across temples.
- System role templates (below) are copied into a temple on onboarding; a temple may rename or extend them but
  cannot grant a permission marked **restricted** (`finance.approve`, `member.manage`, `temple.settings`,
  `audit.view`) without an abbot-level approval that is itself audited.
- The client uses permissions only to hide UI. **Authority is enforced in the database (RLS + SECURITY DEFINER
  functions) and API.**
- Mode: `monastic_kind <> none` → **Monastic Mode**; otherwise **Community & Staff Mode**. A lay staff role never
  switches someone into Monastic Mode, and a monastic never gets community boon points.

## 2. Roles

### 2.1 Monastic Mode

| Code | Thai | Notes |
|---|---|---|
| `abbot` | เจ้าอาวาส | Full temple authority; Command Center |
| `deputy_abbot` | รองเจ้าอาวาส | As abbot minus `temple.settings` restricted items unless delegated |
| `abbot_assistant` | ผู้ช่วยเจ้าอาวาส | Operations management |
| `monk_secretary` | พระเลขานุการ | Invitations, schedules, assignment proposals, reports |
| `bhikkhu` | พระภิกษุ | My Day, quests, own availability, own schedule |
| `samanera` | สามเณร | Learning quests, classes, attendance; **no management permissions** |

### 2.2 Community & Staff Mode

| Code | Thai | Department (default) | Home focus |
|---|---|---|---|
| `community_member` | ญาติโยม / บุคคลทั่วไป | — | Events, volunteer quests, community |
| `volunteer` | อาสาสมัคร | assigned per event | My volunteer quests, check-in |
| `temple_boy` | เด็กวัด | general | My tasks, check-in, report problem |
| `housekeeper` | แม่บ้าน | cleaning | Zones, cleaning quests, checklist, before/after |
| `kitchen_staff` | คนครัว | kitchen | Meal schedule, headcount, stock |
| `kitchen_lead` | หัวหน้าครัว | kitchen | + menu, shopping list, assign kitchen quests |
| `gardener` | คนสวน | garden | Zones, watering, equipment |
| `technician` | ช่าง | facility | Work orders, assets, repair history |
| `facility_manager` | ไวยาวัจกร / ผู้ดูแลทรัพย์สิน | facility | Assets, maintenance, inventory, vehicles |
| `driver` | คนขับรถ | transport | Today's trips, vehicle issues |
| `security_guard` | รปภ. | security | Shifts, incidents, gate log |
| `traffic_staff` | เจ้าหน้าที่จราจร | security | Event parking/traffic quests |
| `ceremony_lead` | มัคนายก | ceremony | Ceremony timeline, readiness, checklist |
| `ceremony_team` | ทีมพิธี | ceremony | Assigned ceremony tasks |
| `undertaker` | สัปเหร่อ | ceremony | **Only funeral rites assigned to them** |
| `office_staff` | ธุรการ / สำนักงาน | office | Documents, bookings, meetings, invitations intake |
| `accountant` | บัญชี | office | Finance view (and approve only if granted) |
| `staff_general` | เจ้าหน้าที่วัด | any | My tasks |
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
| `vehicle.view` / `vehicle.manage` | Vehicles & trips | |
| `finance.view` / `finance.approve` | Finance | yes |
| `points.award_community` | Approve community point awards | |
| `reward.manage` | Reward catalog & fulfilment | |
| `moderation.manage` | Reports, blocks review | |
| `contact_inbox.manage` | Temple Contact inbox routing | |
| `community.participate` | Profile, connections, chat | |
| `report.view` | Temple reports | |
| `audit.view` | Read audit log | yes |
| `temple.settings` | Temple configuration | yes |

## 4. Matrix (scope per role)

Legend: **T** temple · **D** department · **Tm** team · **S** self · **A** assigned-only (rows linked to the
person's assignment) · — none.

| Permission | abbot | deputy | assistant | secretary | bhikkhu | samanera | facility_mgr | technician | housekeeper | kitchen_lead | kitchen | gardener | driver | ceremony_lead | ceremony_team | undertaker | office | accountant | temple_admin | volunteer | temple_boy | security | community |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| quest.view | T | T | T | T | S+T¹ | S | D | A | A | D | A | A | A | D | A | A | D | — | — | A+T¹ | A | A | T¹ |
| quest.create | T | T | T | T | S | — | D | — | — | D | — | — | — | D | — | — | D | — | — | — | — | — | — |
| quest.assign | T | T | T | T | — | — | D | — | — | D | — | — | — | D | — | — | — | — | — | — | — | — | — |
| quest.complete | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| quest.verify | T | T | T | T | — | — | D | — | — | D | — | — | — | D | — | — | — | — | — | — | — | — | — |
| quest.manage | T | T | T | — | — | — | D | — | — | D | — | — | — | D | — | — | — | — | — | — | — | — | — |
| event.view | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | A | T | T | T | T | T | T | T¹ |
| event.manage | T | T | T | T | — | — | — | — | — | — | — | — | — | D | — | — | — | — | — | — | — | — | — |
| invitation.view | T | T | T | T | A | — | — | — | — | — | — | — | A | — | — | — | T | — | — | — | — | — | — |
| invitation.manage | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — |
| invitation.confirm | T | T | T | T² | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| schedule.view | T | T | T | T | S+T¹ | S+T¹ | T¹ | S | S | S | S | S | S | T¹ | S | S | T | — | — | S | S | S | T¹ |
| availability.view | T | T | T | T | T³ | — | — | — | — | T⁴ | — | — | A | T | — | — | T | — | — | — | — | — | — |
| availability.set_self | S | S | S | S | S | S | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| availability.set_others | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| command_center.view | T | T | T | T | — | — | D⁵ | — | — | D⁵ | — | — | — | D⁵ | — | — | — | — | — | — | — | — | — |
| member.view | T | T | T | T | T⁶ | — | D | Tm | Tm | D | Tm | Tm | Tm | D | Tm | — | T | — | T | — | Tm | Tm | — |
| member.manage | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — |
| asset.view | T | T | T | — | — | — | T | T | A | D | A | D | A | D | A | A | — | T | — | — | A | T | — |
| asset.manage | T | — | — | — | — | — | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| maintenance.report | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | T | — |
| maintenance.manage | T | T | T | — | — | — | T | A | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| inventory.view/manage | T/— | T/— | T/— | — | — | — | T/T | D/— | D/— | D/D | D/— | D/— | — | D/— | — | — | — | T/— | — | — | — | — | — |
| vehicle.view/manage | T/T | T/— | T/— | T/— | — | — | T/T | — | — | — | — | — | A/— | — | — | — | T/— | — | — | — | — | — | — |
| finance.view/approve | T/T | T/— | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T/—⁷ | — | — | — | — | — |
| points.award_community | T | T | T | T | — | — | D | — | — | D | — | — | — | D | — | — | — | — | — | — | — | — | — |
| reward.manage | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — |
| moderation.manage | T | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — |
| contact_inbox.manage | T | T | T | T | — | — | — | — | — | — | — | — | — | — | — | — | T | — | — | — | — | — | — |
| community.participate | — | — | — | — | — | — | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S | S |
| report.view | T | T | T | T | — | — | D | — | — | D | — | — | — | D | — | — | T | T | — | — | — | — | — |
| audit.view | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — |
| temple.settings | T | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | — | T⁸ | — | — | — | — |

Notes:
1. Only items flagged `visibility = public` (public events, public volunteer quests, temple-wide schedule).
2. Secretary confirm allowed only if the abbot delegates it in temple settings (default: allowed for routine rites).
3. Monks see colleague availability as coarse states (ว่าง / ไม่ว่าง / ไม่ทราบ), not reasons such as PERSONAL.
4. Kitchen lead sees **counts only** (for headcount), not individual monk states.
5. Department-scoped Command Center view (e.g. facility panel only).
6. Directory of monastics in the same temple; lay staff contact details hidden unless `member.view` ≥ D.
7. `finance.approve` must be granted explicitly by the abbot and is audited; default off.
8. Non-restricted settings only (branding, departments); restricted settings stay with abbot.

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
| kitchen_lead / kitchen | Meals today + headcount → prep quests → stock alerts → shopping list |
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
