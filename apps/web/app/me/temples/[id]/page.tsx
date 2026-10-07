import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ClipboardCheck, BadgeCheck } from "lucide-react";
import { getSession } from "@/lib/auth";
import { asUser, templeFieldRows } from "@/lib/db";
import { ListedToggle } from "@/components/forms";
import { Notice } from "@/components/ui";
import { StatusBadge } from "@/components/status";
import { ReadinessList } from "@/components/field-list";

type T = { id: string; slug: string; name_th: string; is_listed: boolean; status: string; review_note: string | null; can_edit: boolean };

export default async function TempleHome({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ registered?: string }> }) {
  const [{ id }, { registered }] = await Promise.all([params, searchParams]);
  const s = await getSession(); if (!s) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const t = await asUser(s.authUserId, async (c) => (await c.query<T>(
    "select id, slug, name_th, is_listed, status, review_note, app.has_permission(id, 'temple.settings', 'T') as can_edit from public.temples where id = $1", [id])).rows[0]);
  if (!t) notFound();
  const data = t.can_edit ? await templeFieldRows(s.authUserId, id) : null;
  const ready = data?.readiness.every((r) => r.passed) ?? false;
  const toConfirm = data?.rows.filter((r) => ["WAITING_TEMPLE_CONFIRMATION", "CONFLICT", "VERIFICATION_EXPIRED"].includes(r.effective_status)).length ?? 0;
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div>
        <p className="meta" style={{ margin: 0 }}>ชื่อตามใบสมัคร (ยังไม่ใช่ข้อมูลที่ยืนยันแล้ว)</p>
        <h1>{t.name_th}</h1>
        <div className="btn-row" style={{ marginTop: 0 }}><StatusBadge status={t.status} />
          {ready && <span className="badge b-ok"><BadgeCheck size={18} aria-hidden />วัดที่ผ่านการตรวจสอบ</span>}</div>
      </div>
      {registered && <Notice kind="ok"><b>ส่งใบสมัครเรียบร้อยแล้ว</b> ผู้ดูแลระบบจะตรวจกับทะเบียนวัดและติดต่อวัดเพื่อยืนยันตัวตนของคุณ</Notice>}
      {t.status === "pending" && !registered && <Notice kind="info">รอผู้ดูแลระบบตรวจกับทะเบียนวัด ระหว่างนี้ข้อมูลยังไม่แสดงต่อคนทั่วไป</Notice>}
      {t.status === "rejected" && <Notice kind="error"><b>ไม่ได้รับการอนุมัติ</b>{t.review_note ? ` เหตุผล: ${t.review_note}` : ""}</Notice>}
      {data && (
        <>
          <section className="card">
            <h2>ความพร้อมก่อนเปิดใช้งานจริง</h2>
            <ReadinessList checks={data.readiness} />
          </section>
          <Link className="btn btn-primary btn-block" href={`/me/temples/${id}/verify`}>
            <ClipboardCheck aria-hidden />ตรวจสอบข้อมูลวัด{toConfirm ? ` (รอดำเนินการ ${toConfirm} รายการ)` : ""}</Link>
          <section className="card">
            <h2>การค้นหาโดยคนทั่วไป</h2>
            <p style={{ marginTop: 0 }}>{t.is_listed ? "เปิดอยู่" : "ปิดอยู่"} — คนทั่วไปจะเห็นวัดได้เมื่อเปิดไว้ <b>และ</b> ผ่านการตรวจสอบครบทุกข้อด้านบน
              {ready && t.is_listed && <> · <Link href={`/t/${t.slug}`}>ดูหน้าที่คนทั่วไปเห็น</Link></>}</p>
            <ListedToggle templeId={id} listed={t.is_listed} />
          </section>
        </>
      )}
      {!t.can_edit && <p>คุณเป็นสมาชิกของวัดนี้ แต่ไม่มีสิทธิ์ตรวจสอบข้อมูลวัด</p>}
    </main>
  );
}
