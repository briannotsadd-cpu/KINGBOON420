import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { chatErrorTh, isUuid } from "@/lib/chat";

export const dynamic = "force-dynamic";

/** /chat/new?with=<personId>: opens (or reuses) the direct conversation, then goes to it. */
export default async function NewChat({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { with: other } = await searchParams;
  let error: string | null = null;
  let id: string | null = null;
  if (!other || !isUuid(other)) error = "ไม่พบคนที่ต้องการคุยด้วย กรุณาเลือกจากรายการแชท";
  else {
    try {
      id = await asUser(s.authUserId, async (c) => (await c.query<{ id: string }>("select app.open_direct_conversation($1) as id", [other])).rows[0].id);
    } catch (e) {
      console.error("[page:chat/new]", e);
      error = chatErrorTh((e as { code?: string }).code, "open");
    }
  }
  if (id) redirect(`/chat/${id}`);
  return (
    <main className="stack">
      <h1>เริ่มแชทไม่ได้</h1>
      <div className="notice notice-error" role="alert">{error}</div>
      <Link className="btn btn-primary" href="/chat">กลับไปรายการแชท</Link>
    </main>
  );
}
