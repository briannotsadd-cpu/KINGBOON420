import { ComposeForm, FeedList } from "@/components/community/feed";
import { Ineligible } from "@/components/community/ineligible";
import { Notice } from "@/components/ui";
import { checkGate, loadFeed } from "./data";

export default async function CommunityHome() {
  const g = await checkGate();
  if (!g.ok) return <Ineligible reason={g.reason} detail={g.suspendedReason} />;
  const posts = await loadFeed(g.session.authUserId, null).catch((e) => { console.error("[community:feed]", e); return null; });
  return (
    <>
      <div>
        <h1>ชุมชน</h1>
        <p className="lead" style={{ margin: 0 }}>พูดคุยกับผู้ที่เกี่ยวข้องกับวัดเดียวกัน ทุกโพสต์รายงานได้ที่ปุ่ม ⋯</p>
      </div>
      <ComposeForm />
      {posts === null
        ? <Notice kind="error">ตอนนี้ดึงโพสต์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่</Notice>
        : <FeedList initial={posts} />}
    </>
  );
}
