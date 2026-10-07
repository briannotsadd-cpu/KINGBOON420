import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { isUuid } from "@/lib/chat";
import { splitCallRows, isTerminal, type CallStateRow } from "@/lib/webrtc";
import { CallScreen } from "@/components/call/call-screen";

export const dynamic = "force-dynamic";
export const metadata = { title: "โทร — KINGBOON" };

function Gone({ text }: { text: string }) {
  return (
    <main className="stack">
      <h1>เปิดสายนี้ไม่ได้</h1>
      <div className="notice notice-warn" role="alert">{text}</div>
      <Link className="btn btn-primary" href="/chat">กลับไปรายการแชท</Link>
    </main>
  );
}

/** /call/[id]?go=1 (caller, right after pressing โทร) or ?accept=1 (callee, after pressing รับสาย in the banner). */
export default async function CallPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ go?: string; accept?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { id } = await params;
  const q = await searchParams;
  if (!isUuid(id)) return <Gone text="ไม่พบสายนี้ กรุณากลับไปที่แชทแล้วกดโทรใหม่" />;
  let snap, conversationId: string | undefined;
  try {
    const r = await asUser(s.authUserId, async (c) => ({
      rows: (await c.query<CallStateRow>("select * from app.call_state($1, 0)", [id])).rows,
      conv: (await c.query<{ conversation_id: string }>("select conversation_id from public.call_sessions where id = $1", [id])).rows[0]?.conversation_id,
    }));
    snap = splitCallRows(r.rows); conversationId = r.conv;
  } catch (e) {
    console.error("[page:call]", e);
    return <Gone text="ตอนนี้โหลดสายไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่" />;
  }
  if (!snap || !conversationId) return <Gone text="ไม่พบสายนี้ หรือคุณไม่ได้อยู่ในสายนี้" />;
  const role = snap.caller === s.personId ? "caller" : "callee";
  const live = !isTerminal(snap.status === "ringing" ? "calling" : snap.status === "active" ? "connecting" : snap.status);
  return (
    <CallScreen callId={id} conversationId={conversationId} role={role} media={snap.media} otherName={snap.otherName ?? "ผู้ใช้"}
      autostart={live && (role === "caller" ? q.go === "1" : q.accept === "1")} />
  );
}
