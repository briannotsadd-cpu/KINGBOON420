import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, BadgeCheck, Phone, MapPin } from "lucide-react";
import { templeParking, templePublic, type PublicField } from "@/lib/db";
import { presentParking, type ParkingView } from "@/lib/parking";
import { formatDateTh, formatValue } from "@/lib/verification";
import { FollowSection } from "@/components/contact/follow-section";
import { ParkingOverview } from "@/components/parking/parking-overview";

const HIDDEN_IN_LIST = new Set(["temple.name_th", "temple.geo", "temple.donation_account"]);

function FieldValue({ f }: { f: PublicField }) {
  const v = formatValue(f.value);
  if (f.field_key === "temple.office_phone") return <a href={`tel:${v.replace(/[^\d+]/g, "")}`}><Phone size={18} aria-hidden /> โทร {v}</a>;
  return <span style={{ whiteSpace: "pre-line" }}>{v}</span>;
}

export default async function TemplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let fields: PublicField[] | null = null, parking: ParkingView | null = null, failed = false;
  try { [fields, parking] = await Promise.all([templePublic(slug), templeParking(slug).then(presentParking)]); }
  catch (e) { console.error("[page]", e); failed = true; }
  if (!failed && fields === null) notFound();
  const name = fields?.find((f) => f.field_key === "temple.name_th");
  const geo = fields?.find((f) => f.field_key === "temple.geo");
  const donation = fields?.find((f) => f.field_key === "temple.donation_account");
  return (
    <main>
      <Link className="back" href="/"><ChevronLeft aria-hidden />กลับไปค้นหาวัด</Link>
      {failed || !fields ? (
        <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลวัดไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</div>
      ) : (
        <div className="stack">
          <div>
            <h1>{name ? formatValue(name.value) : "วัด"}</h1>
            <span className="badge b-ok"><BadgeCheck size={18} aria-hidden />วัดที่ผ่านการตรวจสอบ</span>
          </div>
          <Link className="btn btn-primary btn-block" href={`/t/${encodeURIComponent(slug)}/contact`}>ติดต่อวัด</Link>
          <Link className="btn btn-secondary btn-block" href={`/t/${encodeURIComponent(slug)}/map`}>แผนผังวัด</Link>
          <Link className="btn btn-secondary btn-block" href={`/t/${encodeURIComponent(slug)}/events`}>งานและกิจกรรมของวัด</Link>
          {parking && <ParkingOverview view={parking} slug={slug} />}
          <FollowSection slug={slug} />
          <section className="card" aria-labelledby="info-h">
            <h2 id="info-h">ข้อมูลวัด</h2>
            <p className="hint" style={{ marginTop: 0 }}>แสดงเฉพาะข้อมูลที่วัดยืนยันแล้ว เรื่องที่ไม่แสดงคือยังไม่ได้ยืนยัน</p>
            <dl className="stack" style={{ margin: 0 }}>
              {fields.filter((f) => !HIDDEN_IN_LIST.has(f.field_key)).map((f) => (
                <div key={f.field_key}>
                  <dt style={{ fontWeight: 700 }}>{f.label_th}</dt>
                  <dd style={{ margin: 0 }}><FieldValue f={f} /></dd>
                  <dd className="meta" style={{ margin: 0 }}>✓ ยืนยันโดยวัด · ตรวจสอบล่าสุด {formatDateTh(f.verified_at)} · ข้อมูลจาก: {f.source_name}</dd>
                </div>
              ))}
            </dl>
            {geo && (() => { const g = geo.value as { lat: number; lng: number }; return (
              <a className="btn btn-secondary" style={{ marginTop: 16 }} target="_blank" rel="noreferrer noopener"
                 href={`https://www.google.com/maps/search/?api=1&query=${g.lat},${g.lng}`}><MapPin aria-hidden />เปิดแผนที่นำทาง (ตำแหน่งที่วัดยืนยัน)</a>); })()}
          </section>
          {donation && (
            <section className="card" aria-labelledby="don-h">
              <h2 id="don-h">บัญชีรับบริจาค</h2>
              <p style={{ whiteSpace: "pre-line", marginTop: 0 }}>{formatValue(donation.value)}</p>
              <p className="meta">✓ ยืนยัน 2 ขั้นโดยวัด · ตรวจสอบล่าสุด {formatDateTh(donation.verified_at)}</p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
