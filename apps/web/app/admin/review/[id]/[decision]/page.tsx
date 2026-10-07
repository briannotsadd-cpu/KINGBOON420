import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { ReviewForm } from "@/components/forms";

export const dynamic = "force-dynamic";
export default async function Review({ params }: { params: Promise<{ id: string; decision: string }> }) {
  const { id, decision } = await params;
  if (decision !== "approved" && decision !== "rejected") notFound();
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.isPlatformAdmin) redirect("/admin");
  const t = await asUser(s.authUserId, async (c) => (await c.query<{ id: string; name_th: string; province: string }>(
    "select id, name_th, province from app.pending_temples() where id = $1", [id])).rows[0]).catch((e) => { console.error("[page]", e); return undefined; });
  if (!t) return <main><div className="card empty"><h2>ไม่พบใบสมัครนี้</h2><p>อาจถูกตรวจสอบไปแล้ว</p><Link href="/admin">กลับรายการที่รออนุมัติ</Link></div></main>;
  return (
    <main className="stack">
      <Link className="back" href="/admin">‹ ยกเลิก กลับรายการ</Link>
      <h1>{decision === "approved" ? "ยืนยันการอนุมัติ" : "ยืนยันการไม่อนุมัติ"}</h1>
      <div className="card">
        <p style={{ marginTop: 0 }}>วัด: <b>{t.name_th}</b> จังหวัด{t.province}</p>
        <p>{decision === "approved"
          ? "เมื่ออนุมัติแล้ว ผู้ดูแลวัดจะเปิดให้คนทั่วไปค้นหาวัดนี้ได้ การอนุมัติจะถูกบันทึกไว้และยกเลิกจากหน้านี้ไม่ได้"
          : "ผู้สมัครจะเห็นว่าไม่ได้รับการอนุมัติพร้อมเหตุผลที่คุณเขียน การตัดสินนี้ยกเลิกจากหน้านี้ไม่ได้"}</p>
        <ReviewForm templeId={t.id} decision={decision} />
      </div>
    </main>
  );
}
