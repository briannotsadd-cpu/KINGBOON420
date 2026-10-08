import { FlashNotice } from "@/components/contact/flash";
import Link from "next/link";
import { gate, LoadError, BackToHub } from "@/components/monastic/parts";
import { myDay } from "@/components/monastic/queries";
import { AvailabilityForm, CheckInButton, ClearOwnButton, RespondForm } from "@/components/monastic/day-forms";
import { Notice } from "@/components/ui";
import { teamDay } from "@/components/team-day/queries";
import { DayWorkspace } from "@/components/team-day/workspace";
import {
  addDaysYmd, bkkYmd, dayKindLabel, endOfTodayLocal, fmtDateTime, fmtTime, fmtYmd, isYmd, questStatusLabel, reasonLabel, stateBadge, stateLabel,
} from "@/lib/monastic";

export const dynamic = "force-dynamic";

export default async function MyDay({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ d?: string }> }) {
  const [{ id }, { d }] = await Promise.all([params, searchParams]);
  const g = await gate(id);
  if (!g.ok) return g.page;
  const now = new Date(), today = bkkYmd(now);
  const day = isYmd(d) ? d : today;
  if (!g.access.is_monastic) {
    let team;
    try { team = await teamDay(g.s.authUserId, id, day); }
    catch (e) {
      console.error("[page:team-day]", e);
      return <main className="stack"><Link className="back" href={`/temple/${id}`}>‹ กลับเมนูวัด</Link><h1>วันนี้ของทีมวัด</h1>
        <Notice kind="error">ดึงงานไม่ได้ ข้อมูลอาจไม่เป็นปัจจุบัน กรุณาลองใหม่</Notice>
        <Link className="btn btn-secondary" href={`/temple/${id}/day?d=${day}`}>ลองโหลดอีกครั้ง</Link></main>;
    }
    return <main className="stack"><Link className="back" href={`/temple/${id}`}>‹ กลับเมนูวัด</Link>
      <header><h1>วันนี้ของทีมวัด</h1><p className="lead">{g.access.name_th}</p><p>{fmtYmd(day)}</p></header>
      <nav className="btn-row" aria-label="เปลี่ยนวัน">
        <Link className="btn btn-secondary" href={`/temple/${id}/day?d=${addDaysYmd(day, -1)}`}>‹ วันก่อน</Link>
        {day !== today && <Link className="btn btn-secondary" href={`/temple/${id}/day`}>วันนี้</Link>}
        <Link className="btn btn-secondary" href={`/temple/${id}/day?d=${addDaysYmd(day, 1)}`}>วันถัดไป ›</Link>
      </nav>
      <DayWorkspace data={team} templeId={id} now={now} isToday={day === today} />
    </main>;
  }
  let data;
  try { data = await myDay(g.s.authUserId, id, day); } catch (e) { console.error("[page:day]", e); return <LoadError id={id} />; }
  const items = [...data.items].sort((a, b) => +a.starts_at - +b.starts_at);
  const isToday = day === today;
  const av = data.avail;
  return (
    <main className="stack">
      <BackToHub id={id} />
      <div><h1>{isToday ? "วันนี้" : "ตารางวัน"} · {fmtYmd(day)}</h1><p className="lead" style={{ margin: 0 }}>{g.access.name_th}</p></div>
      <FlashNotice />
      <nav className="btn-row" style={{ marginTop: 0, gap: 8 }} aria-label="เปลี่ยนวัน">
        <Link className="btn btn-secondary" style={{ minHeight: 48, padding: "0 16px" }} href={`/temple/${id}/day?d=${addDaysYmd(day, -1)}`}>‹ วันก่อน</Link>
        {!isToday && <Link className="btn btn-secondary" style={{ minHeight: 48, padding: "0 16px" }} href={`/temple/${id}/day`}>วันนี้</Link>}
        <Link className="btn btn-secondary" style={{ minHeight: 48, padding: "0 16px" }} href={`/temple/${id}/day?d=${addDaysYmd(day, 1)}`}>วันถัดไป ›</Link>
      </nav>

      {isToday && (
        <section className="card stack" aria-label="สถานะของฉัน" data-testid="my-status">
          <h2 style={{ margin: 0 }}>สถานะของฉัน</h2>
          <div>
            <span className={`badge ${stateBadge(av?.state ?? "UNKNOWN")}`} data-testid="my-state">{stateLabel(av?.state ?? "UNKNOWN")}</span>
            <p className="meta">{reasonLabel(av?.reason ?? "NO_SIGNAL")}{av?.until_at ? ` · ถึง ${fmtTime(av.until_at)}` : ""}</p>
            <p className="meta">เหตุผลของสถานะ ผู้อื่นที่ไม่ใช่เจ้าอาวาสหรือเลขาฯ จะไม่เห็น</p>
          </div>
          {data.manual.map((m) => (
            <div key={m.id} className="stack">
              <p className="meta" style={{ margin: 0 }}>ที่ฉันตั้งไว้: <b>{stateLabel(m.state)}</b> ถึง {fmtDateTime(m.valid_until)}</p>
              <ClearOwnButton templeId={id} rowId={m.id} label="ยกเลิกสถานะที่ตั้งไว้" />
            </div>
          ))}
          <AvailabilityForm templeId={id} defaultUntil={endOfTodayLocal(now)} />
          <CheckInButton templeId={id} />
        </section>
      )}

      <section aria-label="ตารางของวัน" className="stack">
        <h2 style={{ margin: 0 }}>ตารางและภารกิจ</h2>
        {items.length === 0 ? (
          <div className="card empty" data-testid="day-empty"><h3>วันนี้ยังไม่มีกิจที่กำหนด</h3>
            <p>{isToday ? "ถ้ามีกิจนิมนต์หรือภารกิจใหม่ จะแสดงที่นี่" : "ลองดูวันอื่นด้วยปุ่มด้านบน"}</p></div>
        ) : (
          <ul className="list" data-testid="day-list">
            {items.map((it) => {
              const dt = it.detail ?? {};
              const isQuest = it.item_kind === "quest";
              const isInv = !isQuest && dt.kind === "invitation" && dt.source === "invitation" && !!dt.invitation_id;
              return (
                <li key={`${it.item_kind}-${it.ref_id}`} className="card" data-testid={`row-${isQuest ? "quest" : dt.kind}${dt.leg ? `-${dt.leg}` : ""}`}>
                  <div className="row">
                    <h3>{!isQuest || it.ends_at ? `${fmtTime(it.starts_at)} ` : ""}{it.title}</h3>
                    <span className="badge b-unknown">{dayKindLabel(it.item_kind, dt.kind, dt.leg)}</span>
                  </div>
                  {!isQuest && <p className="meta">{dt.venue ? `${dt.venue} · ` : ""}{dt.kind === "invitation" || dt.kind === "travel" ? "นอกวัด" : "ในวัด/ตามที่กำหนด"}{it.ends_at ? ` · ถึง ${fmtTime(it.ends_at)}` : ""}</p>}
                  {isQuest && (
                    <p className="meta">
                      <span className={`badge ${dt.overdue ? "b-bad" : it.status === "SUBMITTED" ? "b-warn" : "b-closed"}`}>{questStatusLabel(it.status, !!dt.overdue, !!dt.waiting_verifier)}</span>
                      {it.ends_at ? ` · กำหนด ${fmtTime(it.ends_at)}` : ""}
                    </p>
                  )}
                  {isInv && <RespondForm templeId={id} invId={dt.invitation_id!} response={dt.monk_response ?? "PENDING"} />}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
