import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, HandHeart, MapPin } from "lucide-react";
import { getSession } from "@/lib/auth";
import { templePublic } from "@/lib/db";
import { formatValue } from "@/lib/verification";
import { formatRangeTh, kindLabel } from "@/lib/events";
import { publicEvents, type PublicEvent } from "@/components/events/queries";
import { publicTempleId } from "@/components/contact/queries";
import { Chip, sub } from "@/components/events/chip";

export const dynamic = "force-dynamic";

// Visitors see only what temple_public_events returns: title, time, venue and how many volunteers are still needed.
// No readiness, no gates, no monk or staff numbers.
export default async function PublicEvents({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let fields, events: PublicEvent[] = [], failed = false, templeId: string | null = null, signedIn = false;
  try {
    fields = await templePublic(slug);
    if (fields) {
      events = await publicEvents(slug);
      const s = await getSession();
      if (s) { signedIn = true; templeId = await publicTempleId(slug); }
    }
  } catch (e) { console.error("[page:public-events]", e); failed = true; }
  if (!failed && !fields) notFound();
  const name = fields?.find((f) => f.field_key === "temple.name_th");
  return (
    <main className="stack">
      <Link className="back" href={`/t/${encodeURIComponent(slug)}`}><ChevronLeft aria-hidden />กลับไปหน้าวัด</Link>
      {failed ? (
        <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</div>
      ) : (
        <>
          <div><h1>งานและกิจกรรมของวัด</h1>{name && <p className="lead" style={{ margin: 0 }}>{formatValue(name.value)}</p>}</div>
          {events.length === 0 ? (
            <div className="card empty"><h3>ตอนนี้วัดยังไม่ได้ประกาศงานที่เปิดให้คนทั่วไปเห็น</h3><p style={sub}>กลับมาดูใหม่ภายหลัง หรือกด “ติดตามวัด” ที่หน้าวัด</p></div>
          ) : (
            <ul className="list">
              {events.map((e) => (
                <li key={e.id} className="card" data-testid={`public-event-${e.id}`}>
                  <h3 style={{ fontSize: "1.2rem" }}>{e.title}</h3>
                  <ul className="details" style={{ fontSize: "1rem", color: "var(--text)" }}>
                    <li><CalendarClock size={20} aria-hidden />{formatRangeTh(e.starts_at, e.ends_at)}</li>
                    {e.venue_text && <li><MapPin size={20} aria-hidden />{e.venue_text}</li>}
                    <li><HandHeart size={20} aria-hidden /><b data-testid="volunteers-needed">ต้องการอาสา {e.volunteers_needed} คน</b></li>
                  </ul>
                  <div className="btn-row" style={{ gap: 8, marginTop: 8 }}><Chip tone="closed">{kindLabel(e.kind)}</Chip></div>
                  {signedIn && templeId ? (
                    <Link className="btn btn-secondary" style={{ marginTop: 12 }} href={`/temple/${templeId}/events/${e.id}`}>ดูรายละเอียดและสมัครเป็นอาสา</Link>
                  ) : signedIn ? null : (
                    <p style={sub}><Link href="/login">เข้าสู่ระบบ</Link> แล้วติดตามวัด เพื่อสมัครเป็นอาสา</p>
                  )}
                  {signedIn && <p style={sub}>ต้องติดตามวัดที่หน้าวัดก่อน จึงจะเห็นปุ่มสมัคร</p>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </main>
  );
}
