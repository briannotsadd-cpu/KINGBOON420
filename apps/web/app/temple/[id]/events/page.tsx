import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarPlus, ChevronRight } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { eventAccess, listEvents, type EventListRow } from "@/components/events/queries";
import { Chip, ReadinessChip, sub } from "@/components/events/chip";
import { STATUS_TH, STATUS_TONE, UUID_RE, formatRangeTh, isUpcoming, kindLabel, parseReadiness, visibilityLabel } from "@/lib/events";

export const dynamic = "force-dynamic";

function EventCard({ templeId, e }: { templeId: string; e: EventListRow }) {
  return (
    <li>
      <Link className="card" href={`/temple/${templeId}/events/${e.id}`} data-testid={`event-${e.id}`}>
        <div className="row">
          <h3 style={{ fontSize: "1.2rem" }}>{e.title}</h3>
          <ChevronRight aria-hidden style={{ flexShrink: 0 }} />
        </div>
        <p style={sub}>{kindLabel(e.kind)} · {formatRangeTh(e.starts_at, e.ends_at)}</p>
        {e.venue_text && <p style={sub}>สถานที่: {e.venue_text}</p>}
        <div className="btn-row" style={{ gap: 8, marginTop: 10 }}>
          <Chip tone={STATUS_TONE[e.status] ?? "closed"}>{STATUS_TH[e.status] ?? e.status}</Chip>
          <ReadinessChip view={parseReadiness(e.readiness)} />
          <Chip tone="closed">{visibilityLabel(e.visibility)}</Chip>
        </div>
      </Link>
    </li>
  );
}

export default async function EventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID_RE.test(id)) notFound();
  let access, rows: EventListRow[] = [], failed = false;
  try {
    access = await eventAccess(s.authUserId, id);
    if (access?.name_th) rows = await listEvents(s.authUserId, id);
  } catch (e) { console.error("[page:events]", e); failed = true; }
  const back = <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>;
  if (failed) return <main className="stack">{back}<div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</div></main>;
  if (!access?.name_th) return (
    <main className="stack">{back}<h1>งานและกิจกรรมของวัด</h1>
      <Notice kind="info">หน้านี้สำหรับสมาชิกของวัดเท่านั้น ถ้าต้องการสมัครเป็นอาสา กรุณาไปที่หน้าวัดแล้วกด “ติดตามวัด” ก่อน</Notice></main>);
  const now = new Date();
  const upcoming = rows.filter((e) => isUpcoming(e, now));
  const past = rows.filter((e) => !isUpcoming(e, now)).reverse();
  return (
    <main className="stack">
      {back}
      <div><h1>งานและกิจกรรมของวัด</h1><p className="lead" style={{ margin: 0 }}>{access.name_th}</p></div>
      {access.manage && (
        <Link className="btn btn-primary btn-block" href={`/temple/${id}/events/new`}><CalendarPlus aria-hidden />สร้างงานใหม่</Link>
      )}
      <section aria-labelledby="up-h">
        <h2 id="up-h">งานที่กำลังจะถึง ({upcoming.length})</h2>
        {upcoming.length === 0
          ? <div className="card empty"><h3>ยังไม่มีงานที่กำลังจะถึง</h3><p style={sub}>{access.manage ? "กด “สร้างงานใหม่” เพื่อเริ่มวางแผนงานบุญหรือกิจกรรม" : "เมื่อวัดประกาศงานใหม่ จะแสดงที่นี่"}</p></div>
          : <ul className="list">{upcoming.map((e) => <EventCard key={e.id} templeId={id} e={e} />)}</ul>}
      </section>
      <section aria-labelledby="past-h">
        <h2 id="past-h">งานที่ผ่านมาแล้ว/ยกเลิก ({past.length})</h2>
        {past.length === 0
          ? <div className="card empty"><h3>ยังไม่มีงานที่ผ่านมา</h3></div>
          : <ul className="list">{past.map((e) => <EventCard key={e.id} templeId={id} e={e} />)}</ul>}
      </section>
    </main>
  );
}
