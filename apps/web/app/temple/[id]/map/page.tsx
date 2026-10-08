import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Box, Settings2 } from "lucide-react";
import { getSession } from "@/lib/auth";
import { mapAccess, mapBuildings, type MapAccess, type MapBuilding } from "@/components/map/queries";
import { MapView } from "@/components/map/map-view";
import { Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TempleMap({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let access: MapAccess | undefined, rows: MapBuilding[] = [], failed = false;
  try {
    access = await mapAccess(s.authUserId, id);
    if (access?.is_member) rows = await mapBuildings(s.authUserId, id);
  } catch (e) { console.error("[page]", e); failed = true; }
  if (failed) return <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
    <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลแผนที่ไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div></main>;
  // Not a member: say nothing about the temple's buildings, only what to do next.
  if (!access?.is_member) return (
    <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <h1>แผนที่วัด</h1>
      <Notice kind="info">แผนที่ภายในวัดแสดงให้เฉพาะผู้ที่ติดตามหรือเป็นสมาชิกของวัดนี้ ถ้ายังไม่ได้ติดตามวัด ให้ไปที่หน้าวัดแล้วกด “ติดตามวัด” ส่วนแผนผังที่วัดเผยแพร่แล้วดูได้จากหน้าสาธารณะของวัด</Notice>
      <Link className="btn btn-secondary" href="/">ค้นหาวัด</Link></main>);
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div><h1>แผนที่วัด</h1><p className="lead" style={{ margin: 0 }}>{access.name_th}</p></div>
      {access.can_manage && <Link className="btn btn-primary btn-block" href={`/temple/${id}/map/manage`}><Settings2 aria-hidden />จัดการอาคารและแผนที่</Link>}
      <MapView
        detail
        manageHref={access.can_manage ? `/temple/${id}/map/manage` : undefined}
        emptyText="วัดยังไม่ได้เพิ่มอาคารในแผนที่"
        items={rows.map((b) => ({ key: b.id, code: b.code, name_th: b.name_th, kind: b.kind, status: b.status, polygon: b.polygon, confirmed: b.confirmed,
          visibility: b.visibility, events_today: b.events_today, open_quests: b.open_quests }))} />
      <p className="meta">จำนวนกิจกรรมและงานอาสานับเฉพาะที่คุณมีสิทธิ์เห็น ถ้าไม่มีข้อมูลจะแสดงว่า “ไม่ทราบ”</p>
      <Link className="btn btn-secondary btn-block" href="/showcase/3d"><Box aria-hidden />ดูตัวอย่างแผนที่ 3 มิติ (สาธิต)</Link>
    </main>
  );
}
