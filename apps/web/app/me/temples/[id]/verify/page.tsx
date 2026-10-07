import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser, templeFieldRows } from "@/lib/db";
import { FieldList } from "@/components/field-list";

export default async function Verify({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const can = await asUser(s.authUserId, async (c) => (await c.query<{ ok: boolean }>(
    "select app.has_permission($1, 'temple.settings', 'T') as ok", [id])).rows[0].ok);
  if (!can) notFound();
  const data = await templeFieldRows(s.authUserId, id);
  return (
    <main className="stack">
      <Link className="back" href={`/me/temples/${id}`}>‹ กลับหน้าวัด</Link>
      <div>
        <h1>ตรวจสอบข้อมูลวัด</h1>
        <p className="lead" style={{ margin: 0 }}>ดูข้อมูลแต่ละเรื่องพร้อมแหล่งที่มา ถ้าถูกต้องให้กด "ยืนยันว่าถูกต้อง" ถ้าไม่ถูกต้องให้แก้ไขพร้อมบอกแหล่งที่มา
          ข้อมูลจะแสดงต่อคนทั่วไปเฉพาะเรื่องที่วัดยืนยันแล้วเท่านั้น</p>
      </div>
      <FieldList templeId={id} catalog={data.catalog} rows={data.rows} back={`/me/temples/${id}/verify`} canTemple isAdmin={s.isPlatformAdmin} />
    </main>
  );
}
