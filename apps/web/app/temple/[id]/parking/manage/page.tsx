import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { parkingAccess, staffLots, type ParkingAccess, type StaffLot } from "@/components/parking/staff-queries";
import { ConfirmLotForm, DeclaredForm, LotForm } from "@/components/parking/staff-forms";
import { VEHICLE_TH } from "@/lib/parking-staff";

export const dynamic = "force-dynamic";

export default async function ManageParking({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ edit?: string }> }) {
  const [{ id }, { edit }] = await Promise.all([params, searchParams]);
  const se = await getSession(); if (!se) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let a: ParkingAccess | undefined, lots: StaffLot[] = [], failed = false;
  try {
    a = await parkingAccess(se.authUserId, id);
    if (a?.can_manage || a?.can_confirm) lots = await staffLots(se.authUserId, id);
  } catch (e) { console.error("[page:parking-manage]", e); failed = true; }
  const back = <Link className="back" href={`/temple/${id}/parking`}>‹ กลับไปหน้าลานจอดรถ</Link>;
  if (failed) return <main className="stack">{back}<Notice kind="error">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</Notice></main>;
  if (!a?.can_manage && !a?.can_confirm) return (
    <main className="stack">{back}<h1>จัดการลานจอด</h1>
      <Notice kind="info">หน้านี้สำหรับผู้ดูแลสถานที่ ผู้ดูแลวัด หรือเจ้าอาวาสเท่านั้น ถ้าต้องการแก้ข้อมูลลานจอด กรุณาแจ้งผู้ดูแลวัด</Notice></main>);
  const target = edit ? lots.find((l) => l.id === edit) : undefined;
  const waiting = lots.filter((l) => l.active && l.is_public && l.verification_status !== "TEMPLE_CONFIRMED").length;
  return (
    <main className="stack">
      {back}
      <div><h1>จัดการลานจอด</h1>{a.name_th && <p className="lead" style={{ margin: 0 }}>{a.name_th}</p>}</div>
      {waiting > 0 && <Notice kind="warn">มี {waiting} ลานที่ผู้มาวัดยังไม่เห็น เพราะรอวัดยืนยัน{a.can_confirm ? " กดยืนยันได้ในรายการด้านล่าง" : " ให้เจ้าอาวาสหรือผู้ดูแลวัดเป็นผู้ยืนยัน"}</Notice>}

      {a.can_manage && (
        <section aria-labelledby="form-h" className="card">
          <h2 id="form-h">{target ? `แก้ไขลาน: ${target.name_th}` : "เพิ่มลานจอดใหม่"}</h2>
          {edit && !target && <Notice kind="warn">ไม่พบลานที่ต้องการแก้ไข ลองเลือกจากรายการด้านล่างอีกครั้ง</Notice>}
          <LotForm key={target?.id ?? "new"} templeId={id} edit={target} />
          {target && <Link className="back" href={`/temple/${id}/parking/manage`}>เลิกแก้ไข เพิ่มลานใหม่แทน</Link>}
        </section>
      )}

      <section aria-labelledby="list-h">
        <h2 id="list-h">ลานจอดของวัด ({lots.length})</h2>
        {lots.length === 0 ? <div className="card empty"><h3>ยังไม่มีลานจอด</h3><p>{a.can_manage ? "เพิ่มลานแรกได้จากแบบฟอร์มด้านบน" : "ให้ผู้ดูแลสถานที่เพิ่มลานจอดก่อน"}</p></div> : (
          <ul className="list">
            {lots.map((l) => {
              const confirmed = l.verification_status === "TEMPLE_CONFIRMED";
              return (
                <li key={l.id} className="card stack" data-testid={`lot-row-${l.code}`}>
                  <div className="row"><h3>{l.name_th}</h3>
                    {!l.active ? <span className="badge">ปิดใช้งาน</span> : !l.is_public ? <span className="badge">เฉพาะเจ้าหน้าที่</span>
                      : confirmed ? <span className="badge b-ok">วัดยืนยันแล้ว</span> : <span className="badge b-warn">รอวัดยืนยัน</span>}</div>
                  <p className="meta" style={{ margin: 0 }}>{l.code} · {l.capacity ? `จุ ${l.capacity} คัน` : "ความจุ: ไม่ทราบ"}{l.accessible_spaces !== null ? ` · ช่องผู้พิการ ${l.accessible_spaces}` : ""} · {l.vehicle_types.map((v) => VEHICLE_TH[v] ?? v).join(" · ")}</p>
                  <p className="meta" style={{ margin: 0 }}>ค่าจอด: {l.fee_note_th ?? "ไม่ทราบ"} · เวลา: {l.hours_note_th ?? "ไม่ทราบ"} · สถานะหมดอายุใน {l.stale_after_minutes} นาที</p>
                  {a.can_manage && <Link className="btn btn-secondary" href={`/temple/${id}/parking/manage?edit=${l.id}#form-h`}>แก้ไข {l.name_th}</Link>}
                  {a.can_confirm && l.active && l.is_public && <ConfirmLotForm templeId={id} lotId={l.id} confirmed={confirmed} name={l.code} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {a.can_manage && (
        <section aria-labelledby="declared-h" className="card">
          <h2 id="declared-h">ข้อความเมื่อยังไม่มีลานที่ยืนยัน</h2>
          <DeclaredForm templeId={id} current={a.parking_declared ?? "unknown"} />
        </section>
      )}
    </main>
  );
}
