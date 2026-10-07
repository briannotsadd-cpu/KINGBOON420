import type { NextRequest } from "next/server";
import { asUser } from "@/lib/db";
import { isUuid } from "@/lib/chat";
import { splitCallRows, type CallStateRow } from "@/lib/webrtc";
import { apiRun, HttpError } from "../../chat/helpers";

export const dynamic = "force-dynamic";

/** GET /api/calls/[id]?after=<signal id> -> { me, call: { status, media, caller, callee, otherName, signals[] } } (polled every 1 s). */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const afterRaw = req.nextUrl.searchParams.get("after") ?? "0";
  return apiRun(async (s) => {
    if (!isUuid(id)) throw new HttpError(400, "bad id");
    if (!/^\d{1,18}$/.test(afterRaw)) throw new HttpError(400, "bad after");
    const rows = await asUser(s.authUserId, async (c) =>
      (await c.query<CallStateRow>("select * from app.call_state($1, $2::bigint)", [id, afterRaw])).rows);
    const call = splitCallRows(rows);
    if (!call) throw new HttpError(403, "not your call");
    return { me: s.personId, call };
  });
}

/** POST /api/calls/[id] { action: "answer" | "decline" | "end", failed?: boolean } -> { ok: true } */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => null)) as { action?: unknown; failed?: unknown } | null;
  return apiRun(async (s) => {
    if (!isUuid(id)) throw new HttpError(400, "bad id");
    const action = body?.action;
    if (action !== "answer" && action !== "decline" && action !== "end") throw new HttpError(400, "bad action");
    await asUser(s.authUserId, async (c) => {
      if (action === "end") await c.query("select app.end_call($1, $2)", [id, body?.failed === true]);
      else await c.query("select app.answer_call($1, $2)", [id, action === "answer"]);
    });
    return { ok: true };
  });
}
