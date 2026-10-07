import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CommentForm, CommentItem, PostCard } from "@/components/community/feed";
import { Ineligible } from "@/components/community/ineligible";
import { Notice } from "@/components/ui";
import { isUuid } from "@/lib/community";
import { checkGate, loadPost } from "../../data";

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await checkGate();
  if (!g.ok) return <Ineligible reason={g.reason} detail={g.suspendedReason} />;
  const data = isUuid(id) ? await loadPost(g.session.authUserId, id).catch((e) => { console.error("[community:post]", e); return "error" as const; }) : null;
  const back = <Link href="/community" className="back"><ArrowLeft aria-hidden />กลับไปหน้าชุมชน</Link>;
  if (data === "error") return <>{back}<Notice kind="error">ตอนนี้ดึงโพสต์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่</Notice></>;
  if (!data) return (
    <>{back}<div className="card empty"><h1>ไม่พบโพสต์นี้</h1><p>โพสต์อาจถูกลบ หรือคุณไม่มีสิทธิ์ดู กลับไปหน้าชุมชนเพื่อดูโพสต์อื่น</p></div></>
  );
  return (
    <>
      {back}
      <PostCard post={data.post} detail />
      <section className="stack" aria-label="ความคิดเห็น">
        <h2 style={{ margin: 0 }}>ความคิดเห็น ({data.comments.length})</h2>
        {data.comments.length === 0
          ? <p className="lead" style={{ margin: 0 }}>ยังไม่มีความคิดเห็น เขียนความคิดเห็นแรกได้ด้านล่าง</p>
          : <ul className="list">{data.comments.map((c) => <li key={c.id}><CommentItem c={c} /></li>)}</ul>}
      </section>
      <CommentForm postId={data.post.id} />
    </>
  );
}
