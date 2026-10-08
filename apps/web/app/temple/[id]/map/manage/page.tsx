import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { mapAccess, mapBuildings, mapZones, type MapAccess, type MapBuilding, type MapZone } from "@/components/map/queries";
import { BuildingForm, ConfirmForm, ZoneForm } from "@/components/map/manage-forms";
import { Notice } from "@/components/ui";
import { kindLabel, statusLabel, visLabel, zoneKindLabel } from "@/lib/map";

export const dynamic = "force-dynamic";

export default async function ManageMap({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const s = await getSession(); if (!s) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let access: MapAccess | undefined, rows: MapBuilding[] = [], zones: MapZone[] = [], failed = false;
  try {
    access = await mapAccess(s.authUserId, id);
    if (access?.can_manage) [rows, zones] = await Promise.all([mapBuildings(s.authUserId, id), mapZones(s.authUserId, id)]);
  } catch (e) { console.error("[page]", e); failed = true; }
  const back = <Link className="back" href={`/temple/${id}/map`}>‹ กลับไปแผนที่</Link>;
  if (failed) return <main className="stack">{back}<div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div></main>;
  if (!access?.can_manage) return (
    <main className="stack">{back}<h1>จัดการอาคารและแผนที่</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์จัดการอาคารเท่านั้น (เช่น เจ้าอาวาส ผู้ดูแลสถานที่) ถ้าต้องการแก้ไขแผนที่ กรุณาแจ้งเจ้าอาวาสหรือผู้ดูแลวัด</Notice></main>);
  const target = edit ? rows.find((b) => b.id === edit) : undefined;
  const others = rows.filter((b) => b.polygon && b.id !== target?.id).map((b) => b.polygon!);
  const nameOf = (bid: string | null) => rows.find((b) => b.id === bid)?.name_th;
  return (
    <main className="stack">
      {back}
      <div><h1>จัดการอาคารและแผนที่</h1><p className="lead" style={{ margin: 0 }}>{access.name_th}</p></div>

      <section aria-labelledby="form-h" className="card">
        <h2 id="form-h">{target ? `แก้ไขอาคาร: ${target.name_th}` : "เพิ่มอาคารใหม่"}</h2>
        {edit && !target && <Notice kind="warn">ไม่พบอาคารที่ต้องการแก้ไข ลองเลือกจากรายการด้านล่างอีกครั้ง</Notice>}
        <BuildingForm key={target?.id ?? "new"} templeId={id} others={others}
          edit={target && { id: target.id, code: target.code, name_th: target.name_th, kind: target.kind, status: target.status, visibility: target.visibility, polygon: target.polygon, confirmed: target.confirmed }} />
        {target && <Link className="back" href={`/temple/${id}/map/manage`}>เลิกแก้ไข เพิ่มอาคารใหม่แทน</Link>}
      </section>

      <section aria-labelledby="list-h">
        <h2 id="list-h">อาคารที่เพิ่มไว้ ({rows.length})</h2>
        {rows.length === 0 ? <div className="card empty"><h3>ยังไม่มีอาคาร</h3><p>เพิ่มอาคารแรกได้จากแบบฟอร์มด้านบน</p></div> : (
          <ul className="list">
            {rows.map((b) => (
              <li key={b.id} className="card stack" data-testid={`row-${b.code}`}>
                <div className="row"><h3>{b.name_th}</h3>
                  {b.confirmed ? <span className="badge b-ok">วัดยืนยันแล้ว</span> : <span className="badge b-warn">รอวัดยืนยัน</span>}</div>
                <p className="meta" style={{ margin: 0 }}>{b.code} · {kindLabel(b.kind)} · {statusLabel(b.status)} · เห็นได้: {visLabel(b.visibility)}</p>
                <p className="meta" style={{ margin: 0 }}>{b.polygon ? `วาดแล้ว ${b.polygon.length} จุด` : "ยังไม่มีตำแหน่งบนแผนที่"}</p>
                <Link className="btn btn-secondary" href={`/temple/${id}/map/manage?edit=${b.id}`}>แก้ไข {b.name_th}</Link>
                {!b.confirmed && access.can_confirm && <ConfirmForm templeId={id} buildingId={b.id} name={b.name_th} />}
                {!b.confirmed && !access.can_confirm && <p className="meta" style={{ margin: 0 }}>ให้เจ้าอาวาสหรือผู้ดูแลระบบของวัดเป็นผู้ยืนยันข้อมูลอาคารนี้</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="zone-h" className="card">
        <h2 id="zone-h">โซน</h2>
        {zones.length > 0 && (
          <ul className="details" style={{ marginBottom: 16 }}>
            {zones.map((z) => <li key={z.id} data-testid={`zone-${z.code}`}>{z.code} · {z.name_th} · {zoneKindLabel(z.kind)}{z.building_id ? ` · ใน ${nameOf(z.building_id) ?? "อาคารที่ซ่อนอยู่"}` : ""}</li>)}
          </ul>
        )}
        <ZoneForm templeId={id} buildings={rows.map((b) => ({ id: b.id, name_th: b.name_th }))} />
      </section>
    </main>
  );
}
