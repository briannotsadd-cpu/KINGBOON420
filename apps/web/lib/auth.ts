import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { asServer, asUser } from "./db";
import { sendLoginCode, type MailResult } from "./mail";

const COOKIE = "kb_session";
const CODE_TTL_MIN = 10, MAX_ATTEMPTS = 5, MAX_CODES_PER_HOUR = 5, SESSION_DAYS = 30;

function pepper(): string {
  const p = process.env.AUTH_PEPPER;
  if (p && p.length >= 16) return p;
  if (process.env.NODE_ENV === "production") throw new Error("AUTH_PEPPER (16+ chars) must be set in production");
  return "dev-only-pepper-not-for-production";
}
const sha = (s: string) => createHash("sha256").update(s).digest("hex");

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e) && e.length <= 254 ? e : null;
}

export type RequestCodeResult = { ok: true; mail: MailResult } | { ok: false; error: "rate_limited" };

export async function requestLoginCode(email: string): Promise<RequestCodeResult> {
  const recent = await asServer(async (c) => (await c.query<{ n: string }>(
    "select count(*) n from authx.login_codes where email = $1 and created_at > now() - interval '1 hour'", [email])).rows[0].n);
  if (Number(recent) >= MAX_CODES_PER_HOUR) return { ok: false, error: "rate_limited" };
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await asServer((c) => c.query(
    `insert into authx.login_codes(email, code_hash, expires_at) values ($1, $2, now() + make_interval(mins => $3))`,
    [email, sha(code + pepper()), CODE_TTL_MIN]));
  return { ok: true, mail: await sendLoginCode(email, code) };
}

export type VerifyResult = { ok: true; isNewUser: boolean } | { ok: false; error: "invalid" | "expired" | "too_many" };

export async function verifyLoginCode(email: string, code: string): Promise<VerifyResult> {
  const result = await asServer(async (c): Promise<VerifyResult | { ok: true; userId: string; isNewUser: boolean }> => {
    const row = (await c.query<{ id: string; code_hash: string; attempts: number; expired: boolean }>(
      `select id, code_hash, attempts, expires_at < now() as expired from authx.login_codes
        where email = $1 and consumed_at is null order by created_at desc limit 1 for update`, [email])).rows[0];
    if (!row) return { ok: false, error: "invalid" };
    if (row.expired) return { ok: false, error: "expired" };
    if (row.attempts >= MAX_ATTEMPTS) return { ok: false, error: "too_many" };
    const a = Buffer.from(sha(code + pepper())), b = Buffer.from(row.code_hash);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      await c.query("update authx.login_codes set attempts = attempts + 1 where id = $1", [row.id]);
      return { ok: false, error: row.attempts + 1 >= MAX_ATTEMPTS ? "too_many" : "invalid" };
    }
    await c.query("update authx.login_codes set consumed_at = now() where id = $1", [row.id]);
    const user = (await c.query<{ id: string }>(
      `insert into authx.users(email) values ($1) on conflict (email) do update set email = excluded.email returning id`, [email])).rows[0];
    const person = (await c.query<{ id: string; display_name: string }>(
      "select id, display_name from public.persons where auth_user_id = $1", [user.id])).rows[0];
    let isNewUser = false;
    let personId = person?.id;
    if (!person) {
      personId = (await c.query<{ id: string }>(
        "insert into public.persons(auth_user_id, display_name) values ($1, '') returning id", [user.id])).rows[0].id;
      isNewUser = true;
    } else if (!person.display_name) isNewUser = true;
    const admins = (process.env.PLATFORM_ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    if (admins.includes(email)) await c.query("insert into public.platform_admins values ($1) on conflict do nothing", [personId]);
    return { ok: true, userId: user.id, isNewUser };
  });
  if (!result.ok || !("userId" in result)) return result as VerifyResult;
  const token = randomBytes(32).toString("base64url");
  await asServer((c) => c.query(
    "insert into authx.sessions(user_id, token_hash, expires_at) values ($1, $2, now() + make_interval(days => $3))",
    [result.userId, sha(token), SESSION_DAYS]));
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_DAYS * 86400,
  });
  return { ok: true, isNewUser: result.isNewUser };
}

export interface Session { authUserId: string; personId: string; email: string; displayName: string; isPlatformAdmin: boolean }

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const row = await asServer(async (c) => (await c.query<{ user_id: string; email: string }>(
    `select s.user_id, u.email from authx.sessions s join authx.users u on u.id = s.user_id
      where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()`, [sha(token)])).rows[0]);
  if (!row) return null;
  return asUser(row.user_id, async (c) => {
    const p = (await c.query<{ id: string; display_name: string; admin: boolean }>(
      "select id, display_name, app.is_platform_admin() as admin from public.persons where id = app.current_person_id()")).rows[0];
    if (!p) return null;
    return { authUserId: row.user_id, personId: p.id, email: row.email, displayName: p.display_name, isPlatformAdmin: p.admin };
  });
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await asServer((c) => c.query("update authx.sessions set revoked_at = now() where token_hash = $1", [sha(token)]));
  jar.delete(COOKIE);
}
