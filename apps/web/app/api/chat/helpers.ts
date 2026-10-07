import "server-only";
import { NextResponse } from "next/server";
import { getSession, type Session } from "@/lib/auth";
import { httpStatusForPg } from "@/lib/chat";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Runs a route handler body for the signed-in user. 401 without a session; Postgres 42501 -> 403, 54000 -> 429, etc. */
export async function apiRun(fn: (s: Session) => Promise<unknown>, okStatus = 200): Promise<NextResponse> {
  const noStore = { "Cache-Control": "no-store" };
  try {
    const s = await getSession();
    if (!s) return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อน" }, { status: 401, headers: noStore });
    return NextResponse.json(await fn(s), { status: okStatus, headers: noStore });
  } catch (e) {
    if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status, headers: noStore });
    const code = (e as { code?: string }).code;
    const status = httpStatusForPg(code);
    if (status === 500) console.error("[api]", e);
    return NextResponse.json({ error: "request failed", code }, { status, headers: noStore });
  }
}
