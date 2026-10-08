import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarClock, MapPin, Pencil, User } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { eventAccess, eventDetail, type EventDetail } from "@/components/events/queries";
import { Chip, sub } from "@/components/events/chip";
import { ReadinessPanel } from "@/components/events/readiness-panel";
import { LifecycleForm } from "@/components/events/lifecycle-form";
import { AddParticipantForm, DecideForm, SignupForm, TargetForm, TaskForm, TaskProgress, WithdrawForm } from "@/components/events/detail-forms";
import {
  PARTICIPANT_TH, PARTICIPANT_TONE, STATUS_TH, STATUS_TONE, TASK_TH, TASK_TONE, UUID_RE, categoryLabel, formatDateTh, formatRangeTh, formatTimeTh, kindLabel,
  parseReadiness, visibilityLabel, weightLabel,
} from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID_RE.test(id) || !UUID_RE.test(eventId)) notFound();
  let access, d: EventDetail | null = null, failed = false;
  try {
    access = await eventAccess(s.authUserId, id);
    if (access?.name_th) d = await eventDetail(s.authUserId, id, eventId, access.manage);
  } catch (e) { console.error("[page:event]", e); failed = true; }
  const back = <Link className="back" href={`/temple/${id}/events`}>‹ กลับไปรายการงาน</Link>;
  if (failed) return <main className="stack">{back}<div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองโหลดหน้านี้ใหม่</div></main>;
  if (!access?.name_th) return (
    <main className="stack">{back}<h1>งานของวัด</h1>
      <Notice kind="info">หน้านี้สำหรับสมาชิกของวัดเท่านั้น ถ้าต้องการสมัครเป็นอาสา กรุณาไปที่หน้าวัดแล้วกด “ติดตามวัด” ก่อน แล้วกลับมาเปิดงานนี้อีกครั้ง</Notice></main>);
  if (!d) return (
    <main className="stack">{back}<h1>ไม่พบงานนี้</h1>
      <Notice kind="info">ไม่พบงานนี้ หรืองานนี้ยังไม่เปิดให้คุณดู กรุณากลับไปเลือกงานจากรายการ</Notice></main>);

  const { event: e, targets, participants, tasks, members } = d;
  const view = parseReadiness(e.readiness);
  const open = e.status !== "COMPLETED" && e.status !== "CANCELLED";
  const canSignup = e.status === "PLANNING" || e.status === "APPROVED";
  const sees = access.manage || access.volApprove;       // the database shows other people's sign-ups only to these roles
  const firstSignup = !access.manage ? targets.find((t) => t.category === "volunteer" && !participants.some((p) => p.target_id === t.id && p.person_id === s.personId && (p.status === "PENDING" || p.status === "CONFIRMED")))?.id : undefined;
  const ids = { templeId: id, eventId: e.id };
  const takenBy = (targetId: string) => participants.filter((p) => p.target_id === targetId && (p.status === "PENDING" || p.status === "CONFIRMED")).map((p) => p.person_id);

  return (
    <main className="stack">
      {back}
      <div>
        <h1 data-testid="event-title">{e.title}</h1>
        <div className="btn-row" style={{ gap: 8, marginTop: 4 }}>
          <Chip tone={STATUS_TONE[e.status] ?? "closed"} testid="event-status" state={e.status}>{STATUS_TH[e.status] ?? e.status}</Chip>
          <Chip tone="closed">{kindLabel(e.kind)}</Chip>
          <Chip tone="closed">{visibilityLabel(e.visibility)}</Chip>
        </div>
      </div>

      <section className="card" aria-labelledby="info-h">
        <h2 id="info-h">รายละเอียดงาน</h2>
        <ul className="details" style={{ fontSize: "1rem", color: "var(--text)" }}>
          <li><CalendarClock size={20} aria-hidden />{formatRangeTh(e.starts_at, e.ends_at)}</li>
          <li><MapPin size={20} aria-hidden />{e.venue_text ? `สถานที่: ${e.venue_text}` : "ยังไม่ได้ระบุสถานที่"}</li>
          <li><User size={20} aria-hidden />ผู้รับผิดชอบ: {e.lead_name ?? (e.lead_person_id ? "(ไม่มีสิทธิ์ดูชื่อ)" : "ยังไม่ได้เลือก")}</li>
          {e.expected_attendance !== null && <li>ผู้ร่วมงานที่คาดไว้: {e.expected_attendance} คน</li>}
        </ul>
        {e.description && <p style={{ whiteSpace: "pre-line", marginBottom: 0 }}>{e.description}</p>}
        {e.status === "CANCELLED" && e.cancel_reason && <Notice kind="warn">เหตุผลที่ยกเลิก: {e.cancel_reason}</Notice>}
        {access.manage && (e.status === "DRAFT" || e.status === "PLANNING" || e.status === "APPROVED") && (
          <Link className="btn btn-secondary" style={{ marginTop: 16 }} href={`/temple/${id}/events/${e.id}/edit`}><Pencil aria-hidden />แก้ไขรายละเอียดงาน</Link>
        )}
      </section>

      {access.manage && <LifecycleForm {...ids} status={e.status} canApprove={access.approve} />}

      <ReadinessPanel view={view} status={e.status} />

      <section aria-labelledby="staff-h" className="stack">
        <h2 id="staff-h" style={{ marginBottom: 0 }}>กำลังคนที่ต้องการ</h2>
        {targets.length === 0 && <div className="card empty"><h3>ยังไม่มีเป้าหมายกำลังคน</h3><p style={sub}>{access.manage ? "เพิ่มเป้าหมายด้านล่าง เช่น อาสา 10 คน หรือพระ 5 รูป" : "ทีมจัดการงานยังไม่ได้กำหนดจำนวนคนที่ต้องการ"}</p></div>}
        {targets.map((t) => {
          const mine = participants.find((p) => p.target_id === t.id && p.person_id === s.personId);
          const rows = participants.filter((p) => p.target_id === t.id);
          const filled = rows.filter((p) => p.status === "CONFIRMED").length;
          const active = mine && (mine.status === "PENDING" || mine.status === "CONFIRMED");
          return (
            <div key={t.id} className="card" data-testid={`target-${t.label}`}>
              <div className="row"><h3>{t.label}</h3><Chip tone="unknown">{categoryLabel(t.category)}</Chip></div>
              <p style={sub}>
                ต้องการ {t.required} {t.category === "monk" ? "รูป" : "คน"} · ขั้นต่ำ {t.min_required}{t.hard_gate ? " · เป็นเงื่อนไขบังคับ" : ""}
                {sees && <> · <b data-testid="filled">ยืนยันแล้ว {filled}</b></>}
              </p>
              {rows.length > 0 && (
                <ul className="list" style={{ marginTop: 12, gap: 10 }}>
                  {rows.map((p) => (
                    <li key={p.id} className="stack" style={{ gap: 8 }} data-testid={`participant-${p.display_name ?? p.id}`}>
                      <div className="row">
                        <span>{p.person_id === s.personId ? "คุณ" : (p.display_name || "ไม่มีชื่อ")}</span>
                        <Chip tone={PARTICIPANT_TONE[p.status] ?? "closed"}>{PARTICIPANT_TH[p.status] ?? p.status}</Chip>
                      </div>
                      {p.status === "PENDING" && access.volApprove && p.person_id !== s.personId && <DecideForm {...ids} participantId={p.id} />}
                      {p.status === "PENDING" && p.person_id === s.personId && access.volApprove && <p style={sub}>คุณอนุมัติการสมัครของตัวเองไม่ได้ ต้องให้ผู้อนุมัติคนอื่นทำ</p>}
                    </li>
                  ))}
                </ul>
              )}
              {t.category === "volunteer" && (
                <div style={{ marginTop: 12 }}>
                  {active ? (<><p style={sub}>สถานะของคุณ: {PARTICIPANT_TH[mine.status]}</p><WithdrawForm {...ids} participantId={mine.id} /></>)
                    : canSignup ? (<>{mine?.status === "DECLINED" && <p style={sub}>การสมัครครั้งก่อนไม่ได้รับอนุมัติ สมัครใหม่ได้</p>}<SignupForm {...ids} targetId={t.id} primary={t.id === firstSignup} /></>)
                    : <p style={sub}>ยังไม่เปิดรับสมัครอาสา (เปิดเมื่องานอยู่ในช่วงวางแผนหรืออนุมัติแล้ว)</p>}
                </div>
              )}
              {t.category !== "volunteer" && active && <div style={{ marginTop: 12 }}><WithdrawForm {...ids} participantId={mine.id} /></div>}
              {access.manage && t.category !== "volunteer" && open && (
                <div style={{ marginTop: 12 }}><AddParticipantForm {...ids} targetId={t.id} category={t.category} members={members} taken={takenBy(t.id)} /></div>
              )}
            </div>
          );
        })}
        {access.manage && open && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>เพิ่มเป้าหมายกำลังคน</h3>
            <TargetForm {...ids} />
          </div>
        )}
      </section>

      <section aria-labelledby="task-h" className="stack">
        <h2 id="task-h" style={{ marginBottom: 0 }}>งานย่อยที่ต้องทำ</h2>
        {tasks.length === 0 && <div className="card empty"><h3>ยังไม่มีงานย่อยที่คุณเห็น</h3><p style={sub}>{access.manage ? "เพิ่มงานย่อยด้านล่าง เช่น เตรียมเครื่องเสียง" : "งานย่อยจะแสดงเมื่อมีคนมอบหมายให้คุณ"}</p></div>}
        {tasks.map((t) => {
          const st = t.assignment_status ?? t.status;
          const mineTask = t.assignee_person_id === s.personId;
          return (
            <div key={t.id} className="card" data-testid={`task-${t.title}`}>
              <div className="row"><h3>{t.title}</h3><Chip tone={TASK_TONE[st] ?? "closed"} testid="task-status" state={st}>{TASK_TH[st] ?? st}</Chip></div>
              <div className="btn-row" style={{ gap: 8, marginTop: 8 }}>
                <Chip tone={t.weight >= 4 ? "bad" : "closed"}>ความสำคัญ: {weightLabel(t.weight)}</Chip>
                {t.is_gate && <Chip tone="warn">ต้องเสร็จก่อนงาน</Chip>}
              </div>
              <p style={sub}>
                ผู้รับผิดชอบ: {mineTask ? "คุณ" : (t.assignee_name || (t.assignee_person_id ? "(ไม่มีสิทธิ์ดูชื่อ)" : "ยังไม่มี"))}
                {t.due_at && <> · กำหนดเสร็จ {formatDateTh(t.due_at)} {formatTimeTh(t.due_at)}</>}
              </p>
              {t.assignment_id && (
                <div style={{ marginTop: 12 }}>
                  <TaskProgress {...ids} assignmentId={t.assignment_id} status={st} isMine={mineTask} canVerify={access.verify} />
                </div>
              )}
            </div>
          );
        })}
        {access.manage && open && (
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>เพิ่มงานย่อย</h3>
            <TaskForm {...ids} members={members} />
          </div>
        )}
      </section>
    </main>
  );
}
