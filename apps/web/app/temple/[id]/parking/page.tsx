import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CircleCheck, CircleHelp, CircleX, ExternalLink, LockKeyhole, Settings, TriangleAlert } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { parkingAccess, staffLots, type ParkingAccess, type StaffLot } from "@/components/parking/staff-queries";
import { ReportForm } from "@/components/parking/staff-forms";
import { REPORT_TH, reportAge } from "@/lib/parking-staff";
import s from "@/components/parking/staff.module.css";

export const dynamic = "force-dynamic";

const TONE = { AVAILABLE: "ok", FILLING: "warn", FULL: "bad", CLOSED: "closed", UNKNOWN: "unknown" } as const;
const ICON = { AVAILABLE: CircleCheck, FILLING: TriangleAlert, FULL: CircleX, CLOSED: LockKeyhole, UNKNOWN: CircleHelp };
const label = (st: StaffLot["status"]) => st === "UNKNOWN" ? "ไม่ทราบสถานะตอนนี้" : REPORT_TH[st].label;

function LotCard({ lot, templeId, canReport }: { lot: StaffLot; templeId: string; canReport: boolean }) {
  const Icon = ICON[lot.status], tone = TONE[lot.status];
  const stale = lot.status === "UNKNOWN" && lot.reported_at !== null;
  const used = lot.capacity && lot.free_spaces !== null ? Math.round((lot.capacity - lot.free_spaces) / lot.capacity * 100) : null;
  return (
    <li className={s.lotCard} data-testid={`board-${lot.code}`} data-status={lot.status}>
      <div className={`${s.band} ${s[tone]}`}><Icon size={22} aria-hidden />{label(lot.status)}
        {lot.free_spaces !== null && lot.status !== "FULL" && <small>ว่าง {lot.free_spaces} คัน</small>}</div>
      <div className={s.lotBody}>
        <div><span className={s.code}>{lot.code}</span><h3>{lot.name_th}</h3></div>
        {used !== null && <div className={`${s.meter} ${s[tone]}`} role="img" aria-label={`ไม่ว่าง ${used}% ตามรายงานล่าสุด`}><span style={{ width: `${used}%` }} /></div>}
        <p className={s.meta}>{reportAge(lot.reported_at)}{lot.reported_by_me ? " (โดยคุณ)" : ""}{stale ? " · รายงานหมดอายุแล้ว ผู้มาวัดเห็นเป็น “ไม่ทราบสถานะ”" : ""}</p>
        {lot.note_th && lot.status !== "UNKNOWN" && <p className={s.note}>{lot.note_th}</p>}
        <div className={s.tags}>
          <span className="badge">{lot.capacity ? `จุ ${lot.capacity} คัน` : "ความจุ: ไม่ทราบ"}</span>
          {!lot.is_public ? <span className="badge">เฉพาะเจ้าหน้าที่</span>
            : lot.verification_status === "TEMPLE_CONFIRMED" ? <span className="badge b-ok">ผู้มาวัดเห็นแล้ว</span>
            : <span className="badge b-warn">รอวัดยืนยัน ผู้มาวัดยังไม่เห็น</span>}
        </div>
        {canReport && <div className={s.actions}><Link className="btn btn-secondary btn-block" href={`/temple/${templeId}/parking?lot=${lot.id}#report`}>รายงานลาน {lot.code}</Link></div>}
      </div>
    </li>
  );
}

export default async function StaffParking({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lot?: string }> }) {
  const [{ id }, { lot: lotParam }] = await Promise.all([params, searchParams]);
  const se = await getSession(); if (!se) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let a: ParkingAccess | undefined, lots: StaffLot[] = [], failed = false;
  try {
    a = await parkingAccess(se.authUserId, id);
    if (a?.can_report || a?.can_manage) lots = await staffLots(se.authUserId, id);
  } catch (e) { console.error("[page:parking-staff]", e); failed = true; }
  const back = <Link className="back" href={`/temple/${id}`}>‹ กลับเมนูของวัด</Link>;
  if (failed) return <main className="stack">{back}<Notice kind="error">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</Notice></main>;
  if (!a?.can_report && !a?.can_manage) return (
    <main className="stack">{back}<h1>ลานจอดรถ</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับมอบหมายดูแลลานจอดรถเท่านั้น (เช่น เจ้าหน้าที่จราจร รปภ. ผู้ดูแลสถานที่) ถ้าต้องการช่วยรายงาน กรุณาแจ้งเจ้าอาวาสหรือผู้ดูแลวัด</Notice>
      {a?.public_ok && a.slug && <Link className="btn btn-secondary" href={`/t/${encodeURIComponent(a.slug)}/parking`}>ดูหน้าที่จอดรถที่ผู้มาวัดเห็น</Link>}
    </main>);
  const active = lots.filter((l) => l.active);
  const count = (st: StaffLot["status"]) => active.filter((l) => l.status === st).length;
  const initial = active.find((l) => l.id === lotParam)?.id ?? active[0]?.id ?? "";
  return (
    <main className="stack">
      {back}
      <div><h1>ลานจอดรถ</h1>{a.name_th && <p className="lead" style={{ margin: 0 }}>{a.name_th}</p>}</div>

      {active.length > 0 && (
        <div className={s.summary} aria-label="สรุปสถานะลานจอดตอนนี้" data-testid="parking-summary">
          {(["AVAILABLE", "FILLING", "FULL", "UNKNOWN"] as const).map((k) => (
            <div key={k} className={`${s.stat} ${s[TONE[k]]}`}><strong>{count(k)}</strong><span>{k === "UNKNOWN" ? "ไม่ทราบ" : REPORT_TH[k].label}</span></div>
          ))}
        </div>
      )}

      {active.length === 0 ? (
        <div className="card empty"><h2>ยังไม่มีลานจอดที่เปิดใช้งาน</h2>
          <p>{a.can_manage ? "เพิ่มลานจอดแรกของวัดก่อน แล้วเจ้าหน้าที่จะรายงานสถานะจากหน้านี้ได้" : "ให้ผู้ดูแลสถานที่หรือผู้ดูแลวัดเพิ่มลานจอดก่อน แล้วจึงรายงานสถานะได้"}</p>
          {a.can_manage && <Link className="btn btn-primary" href={`/temple/${id}/parking/manage`}><Settings aria-hidden />เพิ่มลานจอดแรก</Link>}
        </div>
      ) : (
        <>
          {a.can_report && (
            <section id="report" className="card" aria-labelledby="report-h">
              <h2 id="report-h">รายงานสถานะตอนนี้</h2>
              <p className="meta" style={{ marginTop: 0 }}>เลือกลาน แตะสถานะ แล้วกดส่ง ผู้มาวัดจะเห็นทันที และสถานะจะหมดอายุเองถ้าไม่มีใครรายงานใหม่</p>
              <ReportForm templeId={id} initialLot={initial} lots={active.map((l) => ({ id: l.id, code: l.code, name_th: l.name_th, capacity: l.capacity }))} />
            </section>
          )}
          <section aria-labelledby="board-h" className="stack">
            <h2 id="board-h">ทุกลานตอนนี้ ({active.length})</h2>
            <ul className={s.board}>{active.map((l) => <LotCard key={l.id} lot={l} templeId={id} canReport={a.can_report} />)}</ul>
          </section>
        </>
      )}

      <div className="btn-row">
        {a.can_manage && active.length > 0 && <Link className="btn btn-secondary" href={`/temple/${id}/parking/manage`}><Settings aria-hidden />จัดการลานจอด</Link>}
        {a.public_ok && a.slug && <Link className="btn btn-secondary" href={`/t/${encodeURIComponent(a.slug)}/parking`}><ExternalLink aria-hidden />ดูหน้าที่ผู้มาวัดเห็น</Link>}
      </div>
    </main>
  );
}
