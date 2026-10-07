import { asUser } from "@/lib/db";
import { apiRun } from "../../chat/helpers";

export const dynamic = "force-dynamic";

/** GET /api/calls/incoming -> { incoming: { id, media, caller, caller_name } | null } (polled every 3 s by IncomingCallBanner). */
export async function GET() {
  return apiRun(async (s) => {
    const row = await asUser(s.authUserId, async (c) => (await c.query<{ id: string; media: "voice" | "video"; caller: string; caller_name: string }>(
      "select id, media, caller, caller_name from app.incoming_call()")).rows[0]);
    return { incoming: row ?? null };
  });
}
