import "server-only";
import { redirect } from "next/navigation";
import { getSession, type Session } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { diagnoseGate, formatThaiDateTime, type GateReason } from "@/lib/community";

// All reads go through asUser(...) and the app.* functions / RLS-protected selects from migration 0008.

export interface PostView {
  id: string; author: string; authorName: string; body: string; visibility: string;
  cursor: string; when: string; commentCount: number; isMine: boolean;
}
export interface CommentView { id: string; author: string; authorName: string; body: string; when: string; isMine: boolean }
export const FEED_PAGE = 30;

export type Gate = { ok: true; session: Session } | { ok: false; session: Session; reason: GateReason; suspendedReason?: string };

/** Signed-in session or redirect. */
export async function requireSession(): Promise<Session> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.displayName) redirect("/welcome");
  return s;
}

/** Eligibility from the DB (app.community_can); when false, work out an honest reason from the caller's own rows. */
export async function checkGate(): Promise<Gate> {
  const session = await requireSession();
  return asUser(session.authUserId, async (c): Promise<Gate> => {
    const can = (await c.query<{ ok: boolean }>("select app.community_can(app.current_person_id(), 'community.participate') as ok")).rows[0].ok;
    if (can) return { ok: true, session };
    const prof = (await c.query<{ birth_year: number }>("select birth_year from public.community_profiles")).rows[0];
    const susp = (await c.query<{ reason: string }>(
      "select reason from public.community_suspensions where (until is null or until > now()) and person_id = app.current_person_id()")).rows[0];
    const mem = (await c.query<{ monastic: boolean; minor: boolean }>(
      `select coalesce(bool_or(monastic_kind <> 'none'), false) as monastic, coalesce(bool_or(is_minor), false) as minor
         from public.memberships where person_id = app.current_person_id() and status = 'active'`)).rows[0];
    const reason = diagnoseGate({
      hasProfile: !!prof, birthYear: prof?.birth_year ?? null, suspended: !!susp, monastic: mem.monastic, minorFlag: mem.minor,
      nowYear: new Date().getFullYear(),
    });
    return { ok: false, session, reason, suspendedReason: susp?.reason };
  });
}

interface FeedRow { id: string; author: string; author_name: string; body: string; visibility: string; created_at: Date; cursor: string;
  comment_count: number; is_mine: boolean }
export const toPostView = (r: FeedRow): PostView => ({
  id: r.id, author: r.author, authorName: r.author_name, body: r.body, visibility: r.visibility, cursor: r.cursor,
  when: formatThaiDateTime(r.created_at), commentCount: r.comment_count, isMine: r.is_mine,
});

/** One page of the feed; `before` is the microsecond-precise cursor string of the last post already shown. */
export async function loadFeed(authUserId: string, before: string | null): Promise<PostView[]> {
  return asUser(authUserId, async (c) => (await c.query<FeedRow>(
    `select f.id, f.author, f.author_name, f.body, f.visibility, f.created_at, f.comment_count::int as comment_count, f.is_mine,
            to_char(f.created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor
       from app.community_feed($1::timestamptz) f`, [before])).rows.map(toPostView));
}

export async function loadPost(authUserId: string, id: string): Promise<{ post: PostView; comments: CommentView[] } | null> {
  return asUser(authUserId, async (c) => {
    const p = (await c.query<{ id: string; author: string; body: string; visibility: string; created_at: Date; cursor: string; is_mine: boolean }>(
      `select id, author, body, visibility, created_at, author = app.current_person_id() as is_mine,
              to_char(created_at at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as cursor
         from public.community_posts where id = $1 and removed_at is null`, [id])).rows[0];
    if (!p) return null;
    const name = (await c.query<{ display_name: string }>("select display_name from app.profile_card($1)", [p.author])).rows[0]?.display_name ?? "สมาชิกชุมชน";
    const comments = (await c.query<{ id: string; author: string; author_name: string; body: string; created_at: Date }>(
      "select id, author, author_name, body, created_at from app.post_comments_for($1)", [id])).rows;
    const me = (await c.query<{ id: string }>("select app.current_person_id() as id")).rows[0].id;
    return {
      post: { id: p.id, author: p.author, authorName: name, body: p.body, visibility: p.visibility, cursor: p.cursor,
        when: formatThaiDateTime(p.created_at), commentCount: comments.length, isMine: p.is_mine },
      comments: comments.map((x) => ({ id: x.id, author: x.author, authorName: x.author_name, body: x.body,
        when: formatThaiDateTime(x.created_at), isMine: x.author === me })),
    };
  });
}

export interface MyProfile {
  display_name: string; birth_year: number; bio: string | null; skills: string[]; interests: string[];
  bio_vis: string; skills_vis: string; interests_vis: string; discoverable: boolean; call_permission: string;
}
export const loadMyProfile = (authUserId: string) => asUser(authUserId, async (c) => (await c.query<MyProfile>(
  `select display_name, birth_year, bio, skills, interests, bio_vis, skills_vis, interests_vis, discoverable, call_permission
     from public.community_profiles`)).rows[0] ?? null);

export interface Card {
  person_id: string; display_name: string; bio: string | null; skills: string[]; interests: string[]; is_connected: boolean;
  connection_status: string | null; i_requested: boolean; can_message: boolean; can_call: boolean; is_muted: boolean;
}
export const loadCard = (authUserId: string, id: string) => asUser(authUserId, async (c) => (await c.query<Card>(
  "select * from app.profile_card($1)", [id])).rows[0] ?? null);

export const searchPeople = (authUserId: string, q: string) => asUser(authUserId, async (c) => (await c.query<{ person_id: string; display_name: string }>(
  "select person_id, display_name from app.search_people($1)", [q])).rows);

export interface ConnRow { other: string; name: string | null; status: string; mine: boolean; when: string }
export interface BlockedRow { id: string; when: string }
export const loadConnections = (authUserId: string) => asUser(authUserId, async (c) => {
  const conns = (await c.query<{ other: string; name: string | null; status: string; mine: boolean; at: Date }>(
    `select o.other, pc.display_name as name, c.status, c.requester = app.current_person_id() as mine, coalesce(c.responded_at, c.created_at) as at
       from public.connections c
       cross join lateral (select case when c.requester = app.current_person_id() then c.addressee else c.requester end as other) o
       left join lateral app.profile_card(o.other) pc on true
      order by at desc`)).rows.map((r): ConnRow => ({ other: r.other, name: r.name, status: r.status, mine: r.mine, when: formatThaiDateTime(r.at) }));
  const blocked = (await c.query<{ id: string; at: Date }>(
    "select blocked as id, created_at as at from public.person_blocks where blocker = app.current_person_id() order by created_at desc")).rows
    .map((r): BlockedRow => ({ id: r.id, when: formatThaiDateTime(r.at) }));
  return { conns, blocked };
});

export interface QueueRow { id: string; target_kind: string; target_id: string; target_person: string; target_name: string | null;
  content: string | null; reason: string; note: string | null; created_at: Date; prior_actions: number }
export interface SuspensionRow { person_id: string; reason: string; since: string }
export const loadModeration = (authUserId: string) => asUser(authUserId, async (c) => ({
  queue: (await c.query<QueueRow>(
    `select id, target_kind, target_id, target_person, target_name, content, reason, note, created_at, prior_actions::int as prior_actions
       from app.moderation_queue()`)).rows.map((r) => ({ ...r, when: formatThaiDateTime(r.created_at) })),
  suspensions: (await c.query<{ person_id: string; reason: string; created_at: Date }>(
    "select person_id, reason, created_at from public.community_suspensions where until is null or until > now() order by created_at desc")).rows
    .map((r): SuspensionRow => ({ person_id: r.person_id, reason: r.reason, since: formatThaiDateTime(r.created_at) })),
}));
