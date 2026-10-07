import type { NextRequest } from "next/server";
import { asUser } from "@/lib/db";
import { isUuid } from "@/lib/chat";
import { MAX_SIGNAL_BYTES, validateSignal } from "@/lib/webrtc";
import { apiRun, HttpError } from "../../../chat/helpers";

export const dynamic = "force-dynamic";

/** POST /api/calls/[id]/signal { kind: "offer"|"answer"|"ice", payload } -> app.send_signal. Payload <= 16 KB. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const raw = await req.text();
  return apiRun(async (s) => {
    if (!isUuid(id)) throw new HttpError(400, "bad id");
    if (raw.length > MAX_SIGNAL_BYTES * 2) throw new HttpError(413, "payload too large");
    let body: { kind?: unknown; payload?: unknown };
    try { body = JSON.parse(raw); } catch { throw new HttpError(400, "bad json"); }
    const v = validateSignal(body.kind, body.payload);
    if (!v.ok) throw new HttpError(400, v.error);
    await asUser(s.authUserId, (c) => c.query("select app.send_signal($1, $2, $3::jsonb)", [id, v.kind, JSON.stringify(v.payload)]));
    return { ok: true };
  });
}
