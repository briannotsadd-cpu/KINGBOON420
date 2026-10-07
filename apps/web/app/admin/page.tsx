import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, X } from "lucide-react";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { Notice } from "@/components/ui";
import { RELATIONSHIP_TH } from "@/lib/verification";

export const dynamic = "force-dynamic";
type P = { id: string; name_th: string; province: string | null; address_th: string | null; phone: string | null; description_th: string | null; applicant_name: string | null; created_at: Date;
  claim_relationship: string | null; claim_registry_number: string | null; claim_evidence: string | null; has_official_evidence: boolean };

export default async function Admin({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const { done } = await searchParams;
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.isPlatformAdmin) return <main><div className="card empty"><h2>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</h2><Link href="/me">กลับหน้าของฉัน</Link></div></main>;
  const rows = await asUser(s.authUserId, async (c) => (await c.query<P>("select * from app.pending_temples()")).rows).catch((e) => { console.error("[page]", e); return null; });
  return (
    <main className="stack">
      <div><h1>ใบสมัครดูแลวัดที่รอตรวจ</h1><p className="lead" style={{ margin: 0 }}>ตรวจว่าวัดมีอยู่ในทะเบียนวัด และผู้สมัครเกี่ยวข้องกับวัดจริง ก่อนอนุมัติ</p></div>
      <Link className="btn btn-secondary" href="/admin/data-verification">ดูภาพรวมการตรวจสอบข้อมูลทุกวัด</Link>
      {done === "approved" && <Notice kind="ok">อนุมัติวัดเรียบร้อยแล้ว</Notice>}
      {done === "rejected" && <Notice kind="ok">บันทึกการไม่อนุมัติเรียบร้อยแล้ว ผู้สมัครจะเห็นเหตุผล</Notice>}
      {rows === null ? <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div>
      : rows.length === 0 ? <div className="card empty"><h2>ไม่มีวัดที่รออนุมัติ</h2><p>เมื่อมีคนส่งใบสมัคร จะแสดงที่นี่</p></div>
      : rows.map((r) => (
        <article key={r.id} className="card">
          <h2>{r.name_th}</h2>
          <ul className="details">
            <li>จังหวัด: {r.province}</li>
            <li>ที่อยู่: {r.address_th ?? "ไม่ได้กรอก"}</li>
            <li>โทร: {r.phone ?? "ไม่ได้กรอก"}</li>
            <li>ผู้สมัคร: {r.applicant_name || "ไม่ทราบชื่อ"} ({r.claim_relationship ? RELATIONSHIP_TH[r.claim_relationship] : "ไม่ระบุ"}) · ส่งเมื่อ {new Date(r.created_at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</li>
            <li>เลขทะเบียนที่แจ้ง: {r.claim_registry_number ?? "ไม่ได้แจ้ง"}</li>
            <li>หลักฐานที่ผู้สมัครให้: {r.claim_evidence ?? "ไม่มี"}</li>
          </ul>
          {r.description_th && <p>{r.description_th}</p>}
          {r.has_official_evidence
            ? <Notice kind="ok">มีหลักฐานจากทะเบียนวัดที่ตรวจแล้ว</Notice>
            : <Notice kind="warn">ยังอนุมัติไม่ได้: ยังไม่มีหลักฐานจากทะเบียนวัดที่ตรวจแล้ว — <Link href={`/admin/data-verification/${r.id}#temple.name_th`}>บันทึกหลักฐานทะเบียนวัด</Link></Notice>}
          <div className="btn-row">
            {r.has_official_evidence && <Link className="btn btn-primary" href={`/admin/review/${r.id}/approved`}><Check aria-hidden />อนุมัติ</Link>}
            <Link className="btn btn-secondary" href={`/admin/review/${r.id}/rejected`}><X aria-hidden />ไม่อนุมัติ</Link>
          </div>
        </article>
      ))}
    </main>
  );
}
