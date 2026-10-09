import Link from "next/link";
import { Accessibility, ArrowUpRight, Banknote, Car, CircleCheck, CircleHelp, CircleX, Clock, Hash, Info, LockKeyhole, Map, TriangleAlert } from "lucide-react";
import type { LotView, ParkingView } from "@/lib/parking";
import s from "./parking.module.css";

const DETAIL_ICON = { vehicles: Car, count: Hash, access: Accessibility, fee: Banknote, hours: Clock };
const STATUS_ICON = { ok: CircleCheck, warn: TriangleAlert, bad: CircleX, closed: LockKeyhole, unknown: CircleHelp };

export function ParkingStatus({ lot }: { lot: LotView }) {
  const Icon = STATUS_ICON[lot.tone];
  return <span className={`${s.badge} ${s[lot.tone]}`}><Icon size={15} aria-hidden />{lot.label}</span>;
}

export function ParkingLot({ lot }: { lot: LotView }) {
  return <div data-testid={`lot-${lot.code}`}>
    <div className={s.lotHeader}><div><span className={s.code}>{lot.code}</span><h3>{lot.name}</h3></div><ParkingStatus lot={lot} /></div>
    {lot.freeText && <p className={s.count}>{lot.freeText}</p>}
    {lot.occupiedPercent !== null && <>
      <progress className={s.meter} value={lot.occupiedPercent} max={100} aria-label={`สัดส่วนช่องที่ไม่ว่างใน ${lot.name}: ${lot.occupiedPercent}% ตามรายงาน`} />
      <div className={s.meterText}><span>ไม่ว่าง {lot.occupiedPercent}% ตามรายงาน</span><span>ความจุ {lot.capacity} คัน</span></div>
    </>}
    <p className={s.report}>{lot.updatedText}{lot.reportState === "stale" && " · รายงานเดิมหมดอายุ จึงไม่แสดงจำนวนว่าง"}</p>
    <ul className={s.details}>{lot.details.map((detail) => { const Icon = DETAIL_ICON[detail.kind]; return <li key={detail.kind}><Icon size={16} aria-hidden />{detail.text}</li>; })}</ul>
  </div>;
}

export function ParkingEmpty({ view }: { view: ParkingView }) {
  return <div className={s.empty}>
    <p>{view.kind === "none" ? "วัดนี้ไม่มีที่จอดรถของวัด" : "วัดยังไม่ได้ยืนยันข้อมูลที่จอดรถ"}</p>
    <p>{view.kind === "none" ? "ตรวจสอบทางเลือกในการเดินทางกับวัดก่อนออกเดินทาง" : "ยังไม่สามารถบอกตำแหน่งลานจอดหรือจำนวนที่ว่างได้ ติดต่อวัดเพื่อสอบถามก่อนเดินทาง"}</p>
  </div>;
}

export function ParkingOverview({ view, slug }: { view: ParkingView; slug: string }) {
  const base = `/t/${encodeURIComponent(slug)}`;
  return <section className={s.overview} aria-labelledby="parking-h">
    <div className={s.heading}>
      <div><p className={s.eyebrow}><Car size={18} aria-hidden />ก่อนเดินทาง</p><h2 id="parking-h">ที่จอดรถ</h2><p>ดูลานจอดของวัด และบันทึกจุดที่จอดไว้กลับมาหารถ</p></div>
      <Link className={s.link} href={`${base}/parking`}>วางแผนการจอด<ArrowUpRight size={18} aria-hidden /></Link>
    </div>
    {view.kind === "lots" ? <ul className={s.lots}>{view.lots.map((lot) => <li className={s.lot} key={lot.code}><ParkingLot lot={lot} /></li>)}</ul> : <ParkingEmpty view={view} />}
    <div className={s.footer}><Info size={17} aria-hidden /><span>สถานะจากรายงานของเจ้าหน้าที่ ไม่ใช่เซนเซอร์สด · <Link href={`${base}/map`}><Map size={14} aria-hidden /> ดูแผนผังวัด</Link></span></div>
  </section>;
}
