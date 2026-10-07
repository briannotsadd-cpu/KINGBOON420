import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Phone, Car, Accessibility, Banknote, Clock, Hash } from "lucide-react";
import { templeParking, templeProfile, type TempleProfile } from "@/lib/db";
import { presentParking, type ParkingView } from "@/lib/parking";

export const dynamic = "force-dynamic";
const TONE: Record<string, string> = { ok: "b-ok", warn: "b-warn", bad: "b-bad", closed: "b-closed", unknown: "b-unknown" };
const DETAIL_ICON = { vehicles: Car, count: Hash, access: Accessibility, fee: Banknote, hours: Clock };

export default async function TemplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let profile: TempleProfile | null = null, parking: ParkingView | null = null, failed = false;
  try { [profile, parking] = await Promise.all([templeProfile(slug), templeParking(slug).then(presentParking)]); }
  catch { failed = true; }
  if (!failed && !profile) notFound();
  return (
    <main>
      <Link className="back" href="/"><ChevronLeft aria-hidden />กลับไปค้นหาวัด</Link>
      {failed || !profile ? (
        <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลวัดไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</div>
      ) : (
        <div className="stack">
          <div>
            <h1>{profile.name_th}</h1>
            <p className="lead">ข้อมูลสำหรับผู้มาเยือน</p>
          </div>
          <section className="card" aria-labelledby="info-h">
            <h2 id="info-h">ข้อมูลวัด</h2>
            <ul className="details">
              <li><MapPin size={20} aria-hidden />{[profile.address_th, profile.province && `จังหวัด${profile.province}`].filter(Boolean).join(" ") || "วัดยังไม่ได้ให้ที่อยู่"}</li>
              <li><Phone size={20} aria-hidden />{profile.phone ? <a href={`tel:${profile.phone.replace(/\s/g, "")}`}>โทร {profile.phone}</a> : "วัดยังไม่ได้ให้เบอร์โทร"}</li>
            </ul>
            {profile.description_th && <p style={{ marginBottom: 0, whiteSpace: "pre-line" }}>{profile.description_th}</p>}
          </section>
          <section aria-labelledby="parking-h">
            <h2 id="parking-h">ที่จอดรถ</h2>
            {parking?.kind === "none" && <div className="card">วัดนี้ไม่มีที่จอดรถของวัด</div>}
            {(parking?.kind === "no_info" || parking?.kind === "not_found") && <div className="card">วัดยังไม่ได้ให้ข้อมูลที่จอดรถ</div>}
            {parking?.kind === "lots" && (
              <ul className="list">
                {parking.lots.map((l) => (
                  <li key={l.code} className="card" data-testid={`lot-${l.code}`}>
                    <div className="row"><h3>{l.name}</h3><span className={`badge ${TONE[l.tone]}`}>{l.label}</span></div>
                    {l.freeText && <p className="big">{l.freeText}</p>}
                    {l.updatedText && <p className="meta">{l.updatedText}</p>}
                    <ul className="details">{l.details.map((d) => { const I = DETAIL_ICON[d.kind]; return <li key={d.kind}><I size={18} aria-hidden />{d.text}</li>; })}</ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
