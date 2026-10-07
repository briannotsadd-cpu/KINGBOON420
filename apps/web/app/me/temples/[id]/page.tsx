import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { TempleForm } from "@/components/forms";
import { Notice } from "@/components/ui";
import { StatusBadge } from "@/components/status";

export const dynamic = "force-dynamic";
type T = { id: string; slug: string; name_th: string; province: string | null; address_th: string | null; phone: string | null;
  description_th: string | null; is_listed: boolean; status: string; review_note: string | null; can_edit: boolean };

export default async function TempleAdmin({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ registered?: string }> }) {
  const [{ id }, { registered }] = await Promise.all([params, searchParams]);
  const s = await getSession();
  if (!s) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await asUser(s.authUserId, async (c) => (await c.query<T>(
    `select id, slug, name_th, province, address_th, phone, description_th, is_listed, status, review_note,
            app.has_permission(id, 'temple.settings', 'T') as can_edit from public.temples where id = $1`, [id])).rows[0]);
  if (!t) notFound();
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div><h1>{t.name_th}</h1><StatusBadge status={t.status} /></div>
      {registered && <Notice kind="ok"><b>ส่งใบสมัครเรียบร้อยแล้ว</b> ผู้ดูแลระบบจะตรวจสอบ ระหว่างนี้วัดจะยังไม่แสดงต่อคนทั่วไป</Notice>}
      {t.status === "pending" && !registered && <Notice kind="info">รอผู้ดูแลระบบอนุมัติ ระหว่างนี้วัดจะยังไม่แสดงต่อคนทั่วไป</Notice>}
      {t.status === "rejected" && <Notice kind="error"><b>ไม่ได้รับการอนุมัติ</b>{t.review_note ? ` เหตุผล: ${t.review_note}` : ""}</Notice>}
      {t.status === "approved" && (t.is_listed
        ? <Notice kind="ok">คนทั่วไปค้นหาวัดนี้ได้แล้ว <Link href={`/t/${t.slug}`}>ดูหน้าที่คนทั่วไปเห็น</Link></Notice>
        : <Notice kind="info">อนุมัติแล้ว แต่ยังปิดการค้นหาอยู่ ติ๊ก "เปิดให้คนทั่วไปค้นหา" ด้านล่างแล้วกดบันทึก</Notice>)}
      <section className="card">
        <h2>ข้อมูลวัด</h2>
        {t.can_edit ? <TempleForm mode="edit" temple={t} /> : <p>คุณดูข้อมูลได้ แต่ไม่มีสิทธิ์แก้ไขข้อมูลวัดนี้</p>}
      </section>
    </main>
  );
}
