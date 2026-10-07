# TENANCY & IDENTITY SPEC

Owner: Agent 02. Status: **DESIGNED**. Refines `docs/master/TEMPLE_DOMAIN_MODEL.md` §3 and
`docs/master/ROLE_PERMISSION_MATRIX.md` §1. Implementation-neutral: no SQL, no code. Items marked **[EXT]** extend
the master docs; items marked **HYPOTHESIS** are design defaults without real-world evidence yet.

## 1. Scope

Defines who a person is, how a person relates to temples, how monastic status is established, how a person acts in
one temple at a time, and the invariants every other spec relies on.

## 2. Person

`person` is global: one login account, one row.

| Field | Type | Rule |
|---|---|---|
| `person_id` | opaque id | Immutable. |
| `auth_subject` | string | Exactly one per person. Two logins never share a person. |
| `display_name`, `display_name_th` | text | Shown in temples where the person has a membership. |
| `ordination_date` | date, optional | Used for vassa (พรรษา). Unknown if absent; never estimated. Self-declared, informational; not an attestation and never propagated between temples. |
| `created_at` | instant | |

Rules:
- P-1 A person has no `temple_id`. All temple-bound data hangs off `membership`.
- P-2 **There is no person-level `monastic_kind`** (Opus decision F-04). Monastic status is a property of the
  *membership*, set only by that temple's attestation (section 5). Nothing about it is shared between temples
  unless the person chooses to present it.
- P-3 Contact details and sensitive optional fields (height, weight, income range) belong to the community profile
  (Agent 12 area) and are outside this spec; they are never required for membership.
- P-4 Erasure (PDPA) pseudonymises the person; ledgers and audit rows are kept with a pseudonymous id. Policy detail
  is carried as an open question to Agent 13.

## 3. Membership

`membership(person_id, temple_id)` is unique per pair. Every access decision starts from an ACTIVE membership in the
active temple.

| Field | Type | Rule |
|---|---|---|
| `membership_id` | id | |
| `temple_id` | id | Tenant key. |
| `person_id` | id | |
| `kind` [EXT] | enum `resident \| staff \| volunteer \| community \| visiting` | `resident` = lives in temple (monks, novices, temple boys); `visiting` = time-bounded guest monk. |
| `monastic_kind` [EXT] | enum `none \| bhikkhu \| samanera` | Set only by this temple's attestation (section 5); default `none`; never writable by the person. Drives Mode, ledger eligibility and role classes **in this temple only**. |
| `status` | enum | Section 4. |
| `roles[]` | role ids of this temple | Union of permissions applies in this temple only. |
| `departments[]` | department ids | |
| `valid_from`, `valid_until` | instants, `valid_until` optional | **Required** when `kind = visiting`. After `valid_until` the membership is ENDED by the system. |
| `home_temple_label` | text, optional | Free text for visiting monks ("วัดต้นสังกัด"). Informational only; never a foreign key into another tenant. |
| `invited_by`, `approved_by` | membership ids | Audit. |

Role eligibility classes [EXT] (HYPOTHESIS, enforced at role assignment):

| Class | Roles | Requires |
|---|---|---|
| M (monastic-only) | `abbot, deputy_abbot, abbot_assistant, monk_secretary, bhikkhu, samanera` | `membership.monastic_kind <> none`; `bhikkhu` needs `bhikkhu`, `samanera` needs `samanera`. |
| L (lay-only) | `community_member, volunteer` | `membership.monastic_kind = none` (these roles earn community boon points). |
| E (either) | all other staff roles | none. A monk holding a staff role stays in Monastic Mode. |

Further invariants on roles:
- R-1 A `samanera` membership may hold **only** the `samanera` role template (matrix verification line: zero
  management permissions). Any attempt to add another role is rejected `SAMANERA_ROLE_LIMIT`.
- R-2 Restricted permissions (`finance.approve, member.manage, temple.settings, audit.view`) are granted only
  through an audited abbot-level approval (matrix section 1).
- R-3 Every temple has at least one ACTIVE membership holding `abbot`. The last one cannot be ended, suspended or
  stripped of the role (`LAST_ABBOT`). Transfer is two-step: incoming accepts, then outgoing confirms (HYPOTHESIS).

## 4. Membership states

```
 (invite) INVITED ─accept─▶ ACTIVE ◀─reinstate─ SUSPENDED
 (join request) PENDING_APPROVAL ─approve─▶ ACTIVE ─suspend─▶ SUSPENDED
      │reject/withdraw         │ end (removed|left|expired|disrobed-transfer)
      ▼                        ▼
    ENDED ◀──────────────── ENDED
```

| From | Command | To | Actor | Permission (scope) | Guards |
|---|---|---|---|---|---|
| — | `invite_member` | INVITED | admin | `member.manage` (T) | Roles pass eligibility (section 3); not already ACTIVE/INVITED here. |
| INVITED | `accept_invitation` | ACTIVE | the invited person | self (baseline capability, no code) | Token valid, not expired (default 14 days, HYPOTHESIS). |
| — | `request_to_join` | PENDING_APPROVAL | any person | self | Temple accepts join requests; default role `community_member` only. |
| PENDING_APPROVAL | `approve_join` | ACTIVE | admin | `member.manage` (T) | |
| PENDING_APPROVAL | `reject_join` / `withdraw` | ENDED | admin / person | `member.manage` (T) / self | Reason mandatory for reject. |
| ACTIVE | `suspend_member` | SUSPENDED | admin | `member.manage` (T) | Reason; not last abbot; suspended members keep history but have no access. |
| SUSPENDED | `reinstate_member` | ACTIVE | admin | `member.manage` (T) | |
| ACTIVE / SUSPENDED | `end_membership` | ENDED | admin or person | `member.manage` (T) or self-leave (baseline capability) | Not last abbot. Open assignments are released (quest module), future schedule entries cancelled and flagged to secretary. |
| ACTIVE (visiting) | system expiry | ENDED | system | — | `valid_until <= now`. |

Effect of status on data access: only ACTIVE grants permissions. INVITED/PENDING_APPROVAL/SUSPENDED/ENDED grant none
(a SUSPENDED person can still log in and see the temple switcher entry as "ถูกระงับ", nothing else). ENDED is
terminal; re-joining creates a new membership row (history preserved).

## 5. Monastic verification (per membership)

### 5.1 Why per membership

Monastic status is religion-linked personal data (PDPA sensitive category, HYPOTHESIS pending Agent 13) and it flips
Mode and ledger eligibility. Opus decision F-04: each temple decides for itself whom it treats as bhikkhu or samanera.
A temple's attestation affects **only its own membership row**. There is no cross-temple propagation, no cross-temple
notification and no global derivation.

### 5.2 Record

`monastic_attestation(attestation_id, membership_id, temple_id, kind ∈ {bhikkhu, samanera}, state, evidence_ref,
attested_by, approved_by, attested_at, revoked_at, revoke_reason, presented_from_attestation_id?)`.

- `evidence_ref` references a document in restricted storage (for example an ordination certificate, ใบสุทธิ).
  **HYPOTHESIS**: temples accept it as proof; Agent 01 to validate. Visible only to `member.manage` holders of this
  temple.
- States: `CLAIMED → PENDING_REVIEW → VERIFIED | REJECTED`, and `VERIFIED → REVOKED`.

### 5.3 Flow

1. **Claim / request.** For a membership in temple T, the person states "I am a monk/novice" (baseline capability:
   request monastic attestation) and attaches evidence; state `PENDING_REVIEW`. Until verified,
   `membership.monastic_kind = none` and the person behaves as lay in every rule (including ledgers).
2. **Verify.** Actor with `member.manage` (T) in T sets `VERIFIED` and `kind`.
   - `abbot` or `deputy_abbot`: single approval suffices.
   - Only `temple_admin`: a second, distinct `member.manage` holder with `abbot` or `deputy_abbot` must approve.
     Two-person rule (unchanged, Opus S-7).
   - The verifier is never the person themself.
3. **Effect (this temple only).** `membership.monastic_kind` is set; event `membership.monastic_kind_set` is emitted
   to this temple's consumers only; Mode switches on next request in T; role eligibility is re-checked in T (a
   lay-only role such as `volunteer` becomes `ROLE_INELIGIBLE`, suspended from use, never deleted). Other memberships
   of the same person are untouched and nobody is notified.
4. **Revoke (disrobing or error).** T's `member.manage` holder sets `REVOKED` with reason: `membership.monastic_kind`
   returns to `none` in T; monastic roles in T become `ROLE_INELIGIBLE`; `monastic_activity_score` rows in T are kept
   (append-only) but no longer earned or shown; community points earning is possible again in T. Ledgers are never
   merged or converted (SCORING_SPEC). Other temples are not informed.

### 5.4 Presenting a prior attestation (optional, person's choice)

- When joining or being invited to temple B, the person **may choose** to present an attestation held at temple A
  (a prompt in the join flow; the default is not to present).
- Presenting shares only: `kind`, attesting temple's display name and date, and, if the person ticks it, the evidence
  reference for B's `member.manage` holders. Temple A is not notified and learns nothing.
- B then either **accepts** (a B attestation with `presented_from_attestation_id` set, still requiring B's
  approval rule above) or **re-attests** from its own evidence, or **declines**. Until B acts, the membership is lay.
- B's attestation is independent: revoking at A never changes B, and vice versa.

## 6. Multi-temple membership and the Brian example

Source: spec §29 (Brian = maintenance at A, volunteer at B, community member at C).

| Temple | Membership kind | Roles | Mode | What Brian sees when active |
|---|---|---|---|---|
| A | staff | `technician` | Community & Staff | Work orders assigned to him (A scope), assets, My Day |
| B | volunteer | `volunteer` | Community & Staff | Volunteer quests, public events of B |
| C | community | `community_member` | Community & Staff | Public events, community, own points at C |

Rules shown by the example:
- M-1 Effective permissions = union of roles **of the active temple's membership only**. `technician` at A grants
  nothing at B or C.
- M-2 Quests, schedule entries, availability and ledgers are keyed by `temple_id`. Brian's `community_boon_points`
  at B are a separate balance from C; points are **not** transferable between temples (decision; carried to
  SCORING_SPEC and as open question O-3).
- M-3 If Brian's membership at A is SUSPENDED, B and C are unaffected.
- M-4 If temple B later attests Brian as a bhikkhu, Brian is in Monastic Mode **at B only**; at A (`technician`)
  and C (`community_member`) nothing changes and neither temple is told. At B his `volunteer` role becomes
  `ROLE_INELIGIBLE`. If he wishes, he may present B's attestation when joining another temple (section 5.4).
- M-5 Cross-temple read is impossible by construction: a command receives `active_temple_id` from the verified
  session, never from the payload (section 7).

## 7. Temple switch and session

Commands:
- `list_my_temples()` returns memberships with status ACTIVE or SUSPENDED (and INVITED/PENDING for the inbox) for the
  caller only.
- `switch_temple(temple_id)`.

Guards for `switch_temple`:
1. The caller has a membership row for `temple_id` with `status = ACTIVE` and (if visiting) `valid_until > now`.
2. On success the session claim `active_temple_id` is set; every subsequent request re-derives permissions from the
   membership row (or from a cache whose maximum age is 5 minutes **and** which is invalidated by a membership
   revision counter; HYPOTHESIS for the 5-minute figure). A client-supplied `temple_id` that differs from the
   session's `active_temple_id` is rejected `TEMPLE_MISMATCH`; it is not silently corrected.
3. Single active membership: auto-select. Several: remember last used per device, but always show the switcher.
4. Switching never merges contexts: client caches are cleared on switch (UI requirement for Agent 03).
5. `switch_temple` itself needs no permission code (baseline capability for any authenticated person).

Failure behaviour: no membership -> `NOT_A_MEMBER` (the same response as "temple does not exist", so temple ids are
not enumerable).

## 8. Mode

`mode(membership) = MONASTIC if membership.monastic_kind <> none else COMMUNITY_STAFF`. A person may therefore be in Monastic Mode in one temple and Community & Staff Mode in another.
- A lay staff role never makes a person monastic; a monastic never receives community points (SCORING_SPEC).
- Mode is evaluated per request, not cached in tokens beyond the section 7 limit.

## 9. Platform admin and break-glass

- `platform_admin` has **no** membership and no implicit temple read.
- `break_glass(temple_id, reason, ticket_ref)` is a distinct, explicit command: requires two platform admins (one
  requests, one approves; HYPOTHESIS), time-boxed (maximum 4 hours, HYPOTHESIS), read-only unless the approval says
  otherwise, writes a `platform.break_glass_opened` audit entry visible to the temple's `audit.view` holders, and
  notifies the abbot. Platform-level, outside the temple permission model; owned by Agent 13 for detail.

## 10. Visiting monk

A monk from another temple temporarily staying at the host temple.

- V-1 Host creates `membership(kind = visiting, valid_until required)`. Maximum span default 120 days (about one
  rains retreat plus margin, HYPOTHESIS), configurable via `temple.settings`.
- V-2 The host decides the monk's status itself: either it **re-attests** (section 5.3) or the monk **chooses to
  present** an attestation from his home temple and the host accepts it (section 5.4). Until then the visiting
  membership is lay (the monk may not be given monastic roles). The home temple is neither notified nor consulted.
- V-3 Default role: `visiting_monastic` [EXT] = `bhikkhu` template minus `member.view` T and minus
  `availability.view` (T, coarse). The role `visiting_monastic` exists in `role_permissions.yaml` v0.3; its grants are defined there.
- V-4 He sees only what the host membership permits: his own My Day, own schedule, assigned quests, public items.
  He sees nothing of his home temple while the host is active (the home label is plain text).
- V-5 Command Center counts him in `พระทั้งหมด` (he is an ACTIVE monastic membership) and in `of_which_visiting`
  (AVAILABILITY_SPEC section 10), because he occupies the temple.
- V-6 Smart Monk Assignment excludes visiting monks by default (`include_visiting = false`); the secretary may
  enable per invitation.
- V-7 On `valid_until` the membership ENDS automatically; open assignments are released; future schedule entries are
  cancelled and flagged to the secretary (never deleted).
- V-8 Ledger effects: monastic_activity_score earned at the host stays in the host's ledger (temple-keyed) and is
  not readable by the home temple.

## 11. Commands and required authority

Permission codes and scopes from `docs/master/role_permissions.yaml` v0.3. Pure self actions use the YAML's baseline capabilities.

| Command | Permission (scope) | Notes |
|---|---|---|
| `invite_member`, `approve_join`, `reject_join`, `suspend_member`, `reinstate_member`, `end_membership` | `member.manage` (T) | Restricted code. Holders: abbot, deputy, temple_admin. |
| `assign_role`, `remove_role` | `member.manage` (T) | Guards R-1..R-3 and eligibility classes. Restricted-permission roles also need abbot approval. |
| `attest_monastic` (verify/revoke) | `member.manage` (T) + two-person rule | Two-person rule adopted by Opus (S-7). |
| `claim_monastic`, `request_attestation` | self (baseline: request monastic attestation) | |
| `accept_invitation`, `request_to_join`, `withdraw`, `leave_temple`, `switch_temple`, `list_my_temples` | self (baseline capabilities in YAML) | |
| `view_people_directory` | `member.view` (T, D; bhikkhu T(monastics_only)) | As matrix. |
| `break_glass_*` | platform (outside the temple model) | |
| `create_visiting_membership` | `member.manage` (T) | Needs `valid_until`. |

## 12. Invariants (test targets)

| ID | Invariant |
|---|---|
| TI-01 | `membership(person_id, temple_id)` is unique. |
| TI-02 | No row of a tenant table exists without `temple_id`; no foreign key crosses `temple_id`. |
| TI-03 | Effective permission = union over roles of the ACTIVE membership in `active_temple_id` only. |
| TI-04 | A request whose payload `temple_id` differs from the session's `active_temple_id` is rejected. |
| TI-05 | Non-ACTIVE membership grants zero permissions. |
| TI-06 | `membership.monastic_kind` is set only by that temple's attestation, never written by the person; each change emits an event (to that temple only) and an audit row. No person-level monastic field exists. |
| TI-07 | A `samanera` membership holds only the `samanera` role. |
| TI-08 | Each temple always has at least one ACTIVE `abbot`. |
| TI-09 | `visiting` memberships always have `valid_until`, and ENDED automatically after it. |
| TI-10 | L-class roles are never held by a person with `membership.monastic_kind <> none` in an usable state. |
| TI-11 | `platform_admin` has no read path to temple rows except audited break-glass. |
| TI-12 | Attestation evidence is readable only by `member.manage` holders of the attesting temple. |

## 13. Scenarios (test seeds, `TI-S` series)

| ID | Given | When | Then |
|---|---|---|---|
| TI-S01 | Brian ACTIVE at A (technician), B (volunteer), C (community_member); session active=A | Brian reads quests of B by passing `temple_id=B` | `TEMPLE_MISMATCH`; no rows. |
| TI-S02 | Same | `switch_temple(B)` then list quests | Only B quests visible he is permitted to see; A permissions not applied. |
| TI-S03 | Brian SUSPENDED at A | `switch_temple(A)` | `NOT_A_MEMBER`-class denial with status "ถูกระงับ" shown only in the switcher list; B and C switches succeed. |
| TI-S04 | temple_admin T1 (no abbot role) | `attest_monastic(membership of P at T1, bhikkhu)` alone | State stays PENDING_REVIEW; requires approval by abbot/deputy; `membership.monastic_kind` of P at T1 stays `none`. |
| TI-S05 | Abbot of T1 attests P as bhikkhu | Command completes | P's membership at T1 has `monastic_kind = bhikkhu`; event to T1 consumers only; P's `volunteer` role at T1 becomes ROLE_INELIGIBLE; P's memberships at T2 and T3 unchanged and no event or notification reaches T2/T3. |
| TI-S06 | Monk M attested at A; M later joins B and **chooses to present** A's attestation | B reviews | B accepts (own attestation with `presented_from` set, two-person rule applies) or re-attests; until then M is lay at B; A is not notified; revoking at A later leaves B unchanged. If M does not choose to present, B sees nothing about A. |
| TI-S07 | Visiting membership valid_until 2026-12-01T00:00+07:00 | Clock at 2026-12-01T00:00:00+07:00 | ENDED; future entries cancelled and flagged. |
| TI-S08 | Samanera N | admin adds role `facility_manager` | Rejected `SAMANERA_ROLE_LIMIT`. |
| TI-S09 | T1 has one abbot X | suspend X | Rejected `LAST_ABBOT`. |
| TI-S10 | Person with two logins | second login attempts to claim same person | Rejected; account merge is an open question (O-1). |
| TI-S11 | Lay user requests join, default role | admin approves with role `bhikkhu` | Rejected `ROLE_INELIGIBLE` (class M needs `membership.monastic_kind`). |
| TI-S12 | Platform admin | reads `quests` of T1 without break-glass | Denied; with approved break-glass, read allowed and audited. |

## 14. Open questions carried (owner)

| ID | Question | Owner |
|---|---|---|
| O-1 | Duplicate person accounts: merge policy. | Agent 13 / Opus |
| O-2 | *(resolved by Opus F-04)* attestation is per membership; no global status. | closed |
| O-3 | Are boon points per temple (this spec) or per person across temples? | Opus, Agent 12 |
| O-4 | PDPA erasure vs append-only ledger and audit. | Agent 13 |
| O-5 | Do temples accept document-based proof (ใบสุทธิ)? | Agent 01 |

## 15. Traceability

| This spec | Master source |
|---|---|
| §2-3 | TEMPLE_DOMAIN_MODEL §3, ROLE_PERMISSION_MATRIX §1 |
| §5 | TEMPLE_DOMAIN_MODEL §3 ("verified by a temple admin") |
| §6 | TEMPLE_DOMAIN_MODEL §3 (Brian) |
| §7 | TEMPLE_DOMAIN_MODEL §3 (temple switcher) |
| §9 | TEMPLE_DOMAIN_MODEL §3 (platform_admin), SECURITY_MODEL |
| §12 | ROLE_PERMISSION_MATRIX §6 verification list |
