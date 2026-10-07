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
| `monastic_kind` | enum `none \| bhikkhu \| samanera` | **Derived** from attestations (section 5); never writable by the person. Default `none`. |
| `ordination_date` | date, optional | Used for vassa (พรรษา). Unknown if absent; never estimated. |
| `created_at` | instant | |

Rules:
- P-1 A person has no `temple_id`. All temple-bound data hangs off `membership`.
- P-2 `monastic_kind` is the only person-level attribute that changes behaviour in every temple; it is therefore
  attested by temples, not self-declared (section 5).
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
| `status` | enum | Section 4. |
| `roles[]` | role ids of this temple | Union of permissions applies in this temple only. |
| `departments[]` | department ids | |
| `valid_from`, `valid_until` | instants, `valid_until` optional | **Required** when `kind = visiting`. After `valid_until` the membership is ENDED by the system. |
| `home_temple_label` | text, optional | Free text for visiting monks ("วัดต้นสังกัด"). Informational only; never a foreign key into another tenant. |
| `invited_by`, `approved_by` | membership ids | Audit. |

Role eligibility classes [EXT] (HYPOTHESIS, enforced at role assignment):

| Class | Roles | Requires |
|---|---|---|
| M (monastic-only) | `abbot, deputy_abbot, abbot_assistant, monk_secretary, bhikkhu, samanera` | `monastic_kind <> none`; `bhikkhu` needs `bhikkhu`, `samanera` needs `samanera`. |
| L (lay-only) | `community_member, volunteer` | `monastic_kind = none` (these roles earn community boon points). |
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
| INVITED | `accept_invitation` | ACTIVE | the invited person | self (no code, see gap G-1) | Token valid, not expired (default 14 days, HYPOTHESIS). |
| — | `request_to_join` | PENDING_APPROVAL | any person | self | Temple accepts join requests; default role `community_member` only. |
| PENDING_APPROVAL | `approve_join` | ACTIVE | admin | `member.manage` (T) | |
| PENDING_APPROVAL | `reject_join` / `withdraw` | ENDED | admin / person | `member.manage` (T) / self | Reason mandatory for reject. |
| ACTIVE | `suspend_member` | SUSPENDED | admin | `member.manage` (T) | Reason; not last abbot; suspended members keep history but have no access. |
| SUSPENDED | `reinstate_member` | ACTIVE | admin | `member.manage` (T) | |
| ACTIVE / SUSPENDED | `end_membership` | ENDED | admin or person | `member.manage` (T) or self-leave (gap G-1) | Not last abbot. Open assignments are released (quest module), future schedule entries cancelled and flagged to secretary. |
| ACTIVE (visiting) | system expiry | ENDED | system | — | `valid_until <= now`. |

Effect of status on data access: only ACTIVE grants permissions. INVITED/PENDING_APPROVAL/SUSPENDED/ENDED grant none
(a SUSPENDED person can still log in and see the temple switcher entry as "ถูกระงับ", nothing else). ENDED is
terminal; re-joining creates a new membership row (history preserved).

## 5. Monastic verification

### 5.1 Why attestation

`monastic_kind` flips a person into Monastic Mode in every temple and excludes them from `community_boon_points`.
A false attestation therefore has cross-temple impact; a self-declared flag is not acceptable.

### 5.2 Record

`monastic_attestation(person_id, attesting_temple_id, kind ∈ {bhikkhu, samanera}, state, evidence_ref,
attested_by, approved_by, attested_at, revoked_at, revoke_reason)`.

- `evidence_ref` is a reference to a document held in restricted storage (for example an ordination certificate,
  ใบสุทธิ). **HYPOTHESIS**: temples accept such a document as proof; Agent 01 to validate. No document content is
  copied into the domain tables, and the document is visible only to `member.manage` holders of the attesting temple.
- States: `CLAIMED → PENDING_REVIEW → VERIFIED | REJECTED`, and `VERIFIED → REVOKED`.

### 5.3 Flow

1. **Claim.** During onboarding the person may state "I am a monk/novice" and attach evidence. State `CLAIMED`;
   `monastic_kind` stays `none`. UI shows "รอการยืนยัน". While pending the person behaves as lay in every rule
   (including ledgers); this is deliberate and safe.
2. **Request.** The person selects the temple where they hold (or are invited to) a membership; state
   `PENDING_REVIEW`.
3. **Verify.** Actor with `member.manage` (T) in the attesting temple sets `VERIFIED` and `kind`.
   - If actor holds `abbot` or `deputy_abbot`: single approval suffices.
   - If actor holds only `temple_admin`: a second, distinct `member.manage` holder with `abbot` or `deputy_abbot`
     must approve (`approved_by`). Two-person rule (HYPOTHESIS; master says only "verified by a temple admin").
   - The verifier is never the person themself.
4. **Effect.** `person.monastic_kind` is recomputed (section 5.4), event `person.monastic_kind_changed` is emitted,
   the person's memberships switch Mode on next request, and role eligibility is re-checked (a lay-only role such as
   `volunteer` held by a newly verified monk is flagged `ROLE_INELIGIBLE` and suspended from use until an admin
   resolves it; nothing is deleted).
5. **Revoke (disrobing or error).** An attesting temple's `member.manage` holder sets `REVOKED` with reason. Effects:
   `monastic_kind` recomputed; monastic roles of the person in all temples become `ROLE_INELIGIBLE`; earned
   `monastic_activity_score` rows are kept (append-only) but no longer earned or shown; `community_boon_points`
   earning becomes possible again for new participation. Ledgers are never merged or converted (see SCORING_SPEC).

### 5.4 Derivation of `monastic_kind`

```
monastic_kind(person) =
  kind of the most recent VERIFIED, non-REVOKED attestation among attesting temples
  where the person has an ACTIVE membership at evaluation time;
  else none
```
- Two VERIFIED attestations that disagree (bhikkhu vs samanera, e.g. after higher ordination) resolve to the most
  recent `attested_at`; both stay in history.
- If the only attesting temple ends the person's membership, the attestation is retained but **suspended**: the
  person falls back to `none` until a temple where they have ACTIVE membership attests. (HYPOTHESIS; alternative
  reading: attestation is global once verified. Recommendation: keep the stricter reading until Agent 01 reports how
  temples recognise visiting monks.)
- A temple A attestation is never readable by temple B beyond the derived `monastic_kind` (and optional
  `ordination_date` if the person shares it). Evidence stays in temple A.

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
- M-4 If Brian is later verified as a bhikkhu by temple B, he becomes Monastic Mode at B **and at A and C**
  (mode is derived from the person). At A, `technician` is class E so it stays (with warning); at B, `volunteer` and
  at C `community_member` are L-class and become `ROLE_INELIGIBLE`.
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
5. `switch_temple` itself needs no permission code (self action; see gap G-1).

Failure behaviour: no membership -> `NOT_A_MEMBER` (the same response as "temple does not exist", so temple ids are
not enumerable).

## 8. Mode

`mode(membership) = MONASTIC if person.monastic_kind <> none else COMMUNITY_STAFF`.
- A lay staff role never makes a person monastic; a monastic never receives community points (SCORING_SPEC).
- Mode is evaluated per request, not cached in tokens beyond the section 7 limit.

## 9. Platform admin and break-glass

- `platform_admin` has **no** membership and no implicit temple read.
- `break_glass(temple_id, reason, ticket_ref)` is a distinct, explicit command: requires two platform admins (one
  requests, one approves; HYPOTHESIS), time-boxed (maximum 4 hours, HYPOTHESIS), read-only unless the approval says
  otherwise, writes a `platform.break_glass_opened` audit entry visible to the temple's `audit.view` holders, and
  notifies the abbot. Not covered by the permission matrix (gap G-3); owned by Agent 13 for detail.

## 10. Visiting monk

A monk from another temple temporarily staying at the host temple.

- V-1 Host creates `membership(kind = visiting, valid_until required)`. Maximum span default 120 days (about one
  rains retreat plus margin, HYPOTHESIS), configurable via `temple.settings`.
- V-2 The visiting monk must already be `monastic_kind <> none` through an attestation by a temple where he holds an
  ACTIVE membership (usually his home temple). The host does not re-verify; it may flag `dispute` to the abbot
  (visible as "ยังไม่ได้ตรวจสอบโดยวัดนี้"). If the monk has no attestation at all he cannot be `visiting` as a monk;
  the host can create a lay membership and start the verification flow.
- V-3 Default role: `visiting_monastic` [EXT] = `bhikkhu` template minus `member.view` T and minus
  `availability.view` (T, coarse). Gap G-4: the matrix has no such role.
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

Permission codes and scopes from `docs/master/ROLE_PERMISSION_MATRIX.md`. "Gap" means the matrix does not cover it.

| Command | Permission (scope) | Notes |
|---|---|---|
| `invite_member`, `approve_join`, `reject_join`, `suspend_member`, `reinstate_member`, `end_membership` | `member.manage` (T) | Restricted code. Holders: abbot, deputy, temple_admin. |
| `assign_role`, `remove_role` | `member.manage` (T) | Guards R-1..R-3 and eligibility classes. Restricted-permission roles also need abbot approval. |
| `attest_monastic` (verify/revoke) | `member.manage` (T) + two-person rule | Gap G-2: master says only "temple admin". |
| `claim_monastic`, `request_attestation` | self | Gap G-1. |
| `accept_invitation`, `request_to_join`, `withdraw`, `leave_temple`, `switch_temple`, `list_my_temples` | self | Gap G-1: no permission code for pure self actions; recommend the matrix lists a baseline "authenticated person" capability set. |
| `view_people_directory` | `member.view` (T/D/Tm; monastic directory T⁶) | As matrix. |
| `break_glass_*` | platform (outside matrix) | Gap G-3. |
| `create_visiting_membership` | `member.manage` (T) | Needs `valid_until`. |

## 12. Invariants (test targets)

| ID | Invariant |
|---|---|
| TI-01 | `membership(person_id, temple_id)` is unique. |
| TI-02 | No row of a tenant table exists without `temple_id`; no foreign key crosses `temple_id`. |
| TI-03 | Effective permission = union over roles of the ACTIVE membership in `active_temple_id` only. |
| TI-04 | A request whose payload `temple_id` differs from the session's `active_temple_id` is rejected. |
| TI-05 | Non-ACTIVE membership grants zero permissions. |
| TI-06 | `monastic_kind` is derived, never written directly by a person; changing it emits an event and an audit row. |
| TI-07 | A `samanera` membership holds only the `samanera` role. |
| TI-08 | Each temple always has at least one ACTIVE `abbot`. |
| TI-09 | `visiting` memberships always have `valid_until`, and ENDED automatically after it. |
| TI-10 | L-class roles are never held by a person with `monastic_kind <> none` in an usable state. |
| TI-11 | `platform_admin` has no read path to temple rows except audited break-glass. |
| TI-12 | Attestation evidence is readable only by `member.manage` holders of the attesting temple. |

## 13. Scenarios (test seeds, `TI-S` series)

| ID | Given | When | Then |
|---|---|---|---|
| TI-S01 | Brian ACTIVE at A (technician), B (volunteer), C (community_member); session active=A | Brian reads quests of B by passing `temple_id=B` | `TEMPLE_MISMATCH`; no rows. |
| TI-S02 | Same | `switch_temple(B)` then list quests | Only B quests visible he is permitted to see; A permissions not applied. |
| TI-S03 | Brian SUSPENDED at A | `switch_temple(A)` | `NOT_A_MEMBER`-class denial with status "ถูกระงับ" shown only in the switcher list; B and C switches succeed. |
| TI-S04 | temple_admin T1 (no abbot role) | `attest_monastic(person P, bhikkhu)` alone | State stays PENDING_REVIEW; requires approval by abbot/deputy; `monastic_kind` of P stays `none`. |
| TI-S05 | Abbot attests P as bhikkhu | Command completes | P `monastic_kind = bhikkhu`; event emitted; P's `volunteer` role at temple B becomes ROLE_INELIGIBLE. |
| TI-S06 | Monk M has only attestation from temple A; M's membership at A ENDED, M ACTIVE visiting at B | Evaluate `monastic_kind` | `none` until a temple where M is ACTIVE attests (recommended strict reading). |
| TI-S07 | Visiting membership valid_until 2026-12-01T00:00+07:00 | Clock at 2026-12-01T00:00:00+07:00 | ENDED; future entries cancelled and flagged. |
| TI-S08 | Samanera N | admin adds role `facility_manager` | Rejected `SAMANERA_ROLE_LIMIT`. |
| TI-S09 | T1 has one abbot X | suspend X | Rejected `LAST_ABBOT`. |
| TI-S10 | Person with two logins | second login attempts to claim same person | Rejected; account merge is an open question (O-1). |
| TI-S11 | Lay user requests join, default role | admin approves with role `bhikkhu` | Rejected `ROLE_INELIGIBLE` (class M needs monastic_kind). |
| TI-S12 | Platform admin | reads `quests` of T1 without break-glass | Denied; with approved break-glass, read allowed and audited. |

## 14. Open questions carried (owner)

| ID | Question | Owner |
|---|---|---|
| O-1 | Duplicate person accounts: merge policy. | Agent 13 / Opus |
| O-2 | Is attestation global once verified, or tied to an ACTIVE membership of the attesting temple (section 5.4)? | Agent 01 research, Opus decision |
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
