import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { isUuid } from "@/lib/chat";
import { ChatRoom } from "@/components/chat/chat-room";
import { initialMessages, myConversations } from "../data";

export const dynamic = "force-dynamic";
export const metadata = { title: "แชท — KINGBOON" };

function NotMember() {
  return (
    <main className="stack">
      <h1>เปิดแชทนี้ไม่ได้</h1>
      <div className="notice notice-warn" role="alert">ไม่พบแชทนี้ หรือคุณไม่ได้เป็นสมาชิกของแชทนี้ ถ้าคุณคิดว่าควรเข้าได้ ให้กลับไปที่รายการแชทแล้วเลือกใหม่</div>
      <Link className="btn btn-primary" href="/chat">กลับไปรายการแชท</Link>
    </main>
  );
}

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { id } = await params;
  if (!isUuid(id)) return <NotMember />;
  let conv, msgs;
  try {
    conv = (await myConversations(s.authUserId)).find((c) => c.id === id);
    if (conv) {
      msgs = await initialMessages(s.authUserId, id);
      await asUser(s.authUserId, (c) => c.query("select app.mark_read($1)", [id]));
    }
  } catch (e) {
    console.error("[page:chat/id]", e);
    return <main className="stack"><h1>แชท</h1><div className="notice notice-error" role="alert">ตอนนี้โหลดแชทไม่ได้ กรุณาโหลดหน้านี้ใหม่</div></main>;
  }
  if (!conv || !msgs) return <NotMember />;
  return <ChatRoom conversationId={id} kind={conv.kind} title={conv.title ?? "แชท"} me={s.personId} initial={msgs} />;
}
