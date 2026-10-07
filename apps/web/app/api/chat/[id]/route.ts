import type { NextRequest } from "next/server";
import { asUser } from "@/lib/db";
import { isIsoTimestamp, isUuid, type ChatMessage } from "@/lib/chat";
import { apiRun, HttpError } from "../helpers";

export const dynamic = "force-dynamic";

/** GET /api/chat/[id]?after=ISO[&read=1] -> { me, messages } (oldest first). Polled every 3 s by the conversation view. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const after = req.nextUrl.searchParams.get("after");
  const read = req.nextUrl.searchParams.get("read") === "1";
  return apiRun(async (s) => {
    if (!isUuid(id)) throw new HttpError(400, "bad id");
    if (after !== null && !isIsoTimestamp(after)) throw new HttpError(400, "bad after");
    return asUser(s.authUserId, async (c) => {
      const member = (await c.query<{ m: boolean }>("select app.is_conv_member($1) as m", [id])).rows[0].m;
      if (!member) throw new HttpError(403, "not a member");
      // to_char keeps microseconds, so the cursor round-trips exactly (a JS Date would truncate to ms and re-send the last row).
      const rows = (await c.query<ChatMessage>(
        `select id, sender, sender_name, body, removed,
                to_char(created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at
           from app.conversation_messages($1, $2::timestamptz)`, [id, after])).rows;
      const messages = rows.reverse(); // DB returns newest first (limit 200)
      if (read && messages.some((m) => m.sender !== s.personId)) await c.query("select app.mark_read($1)", [id]);
      return { me: s.personId, messages };
    });
  });
}
