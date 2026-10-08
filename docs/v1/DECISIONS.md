# v1 Decisions (scope cuts and answers to OPEN spec items)

Date: 2026-10-08. Each decision is enforced in the database (RLS or SECURITY DEFINER functions) unless noted.
Migrations reference these codes. Changing one means a new migration plus updated tests (see `supabase/tests/`).

## Owner answers (2026-10-07)
| Topic | Answer | Effect |
|---|---|---|
| Calls | Direct WebRTC + Supabase/Postgres for signalling | D-C7 |
| "แต้ม AI" | Points plus rule-based helpers, no model calls | D-P*, D-H* |
| Map | 2D map + the existing 3D Wat Arun scene, labelled as a showcase | D-M* |
| Deploy | Use an existing Supabase project (which one: still open) | see README "Deploy" |

## Community / chat / calls (0008, 0010)
- **D-C1:** Community codes (`community.*`) belong only to `@lay` roles. Monastic members and minors get no community access at all. Monks are reached only through Temple Contact, which temple staff route.
- **D-C2:** Minors are excluded by birth year. A profile stores only `birth_year`, not a full date. The check is fail-closed: a year difference under 21 blocks access, so someone who is 20 by date may still be refused until the next year.
- **D-C3:** Chat and calls require an accepted connection. A block in either direction stops messages, calls and comments, and hides the profile. Mute only hides content.
- **D-C4:** A post is either `public` (seen by every community member) or connections-only. Blocks hide posts in both directions. The feed is ordered by time, with no ranking.
- **D-C5:** Reports on global community content are moderated by platform admins, not temple staff, because community content is not tenant data. Moderation can lead to a time-limited suspension, which can be lifted.
- **D-C6:** Rate limits live inside the write functions:
  - messages: 20 per minute;
  - Temple Contact: 5 per hour per sender and 60 per hour per temple (the anonymous sender is stored only as an IP hash);
  - other writes: between 5 and 200 per window, depending on the function.
- **D-C7:** Calls are 1:1, in direct conversations only. Media goes peer-to-peer over WebRTC and is never recorded.
  - Signalling uses DB rows plus polling route handlers. Supabase Realtime is not used, because auth is custom.
  - Signal rows are deleted when the call ends.
  - There is STUN only and no TURN server, so calls between some strict NATs will fail. The UI then shows a Thai error.
- **D-C8:** Group chat has no calls in v1.
- **D-C9:** Temple Contact threads are tenant data. Only staff holding the inbox permission read and answer them. The sender sees their own threads at `/me/contacts`.

## Monastic life and events (0009, 0012)
- Availability, invitations, events, readiness and the monastic activity score follow the specs named in the 0009 header.
- An invitation is confirmed only by a person holding `invitation.confirm`. Team suggestions (`sma-v1`) are rule-based and audit-only, and are never shown as a ranking.
- **Not in v1:**
  - skills (HC-6), rite declines (HC-5), vehicles (HC-7);
  - meal headcount, recurrence, check-out, travel-time provider;
  - `ai_drafts`, achievements.

## Map (0011)
- **D-M1:** Buildings and zones are entered by the temple. A building appears publicly only after someone holding `temple.settings` confirms it, and any edit clears that confirmation. Codes never change and rows are never deleted (they are marked RETIRED instead).
- **D-M2:** The 2D map uses simple polygons (3–64 points) on a temple-local 1600×1000 grid, not GPS.
- **D-M3:** The 3D Wat Arun scene is a showcase or placeholder only. It is not temple-confirmed data and is labelled that way in the UI. There is no 3D asset manifest table in v1.

## Points (0011)
- **D-P1:** The point ledger is append-only and written only by functions. Every row records `txn_type`, `source_type` and `source_id`, so "my points" can show where each point came from.
- **D-P2:** Lay points come from verified task completion (daily cap 100) and from staff awards (1–50 points, a reason is required, and nobody can award themselves).
- **D-P3:** Points are put on hold when one verifier approves a suspicious share of a person's points (`VERIFIER_CONCENTRATION`). A different person must review the hold.
- **D-P4:** Rewards are redeemed from the temple catalogue. Staff fulfil a redemption or cancel it with a refund.
- **D-P5:** Points are separate from the monastic activity score. There is no combined view and no leaderboard.

## Helpers ("AI" without a model) (0011)
- **D-H1:** The helpers are the daily summary, schedule conflicts and the event checklist. They are deterministic SQL with no model calls.
- **D-H2:** Helpers only point things out. They never confirm temple data, invitations, donations or point awards.

## Command Center (0011)
- **D-CC1:** One read model, `app.command_center`.
  - People with temple-wide scope (T) see every panel.
  - People with department scope (D) see no monastic panel and no invitations panel.
- **D-CC2:** A panel the caller cannot see comes back as `null`, with a note saying why. It is never shown as zero, so "unknown" is not mistaken for "none".

## Temple data verification (0013)
- **D-V1:** A critical field needs two confirmations: step 1 by anyone with verify rights, then step 2 by the abbot. Step 2 must be a different person from step 1.
- **D-V2:** Platform admins can never confirm data on a temple's behalf.
