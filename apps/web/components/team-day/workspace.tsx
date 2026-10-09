import Link from "next/link";
import { Notice } from "@/components/ui";
import { FlashNotice } from "@/components/contact/flash";
import { TaskProgress } from "@/components/events/detail-forms";
import { TASK_TH, TASK_TONE } from "@/lib/events";
import { fmtDateTime, fmtTime, dayKindLabel } from "@/lib/monastic";
import { GROUP_LABEL, groupTasks, type DayTask, type TaskGroup } from "@/lib/team-day";
import type { TeamDayData } from "./queries";
import styles from "./workspace.module.css";

function Task({ task: t, templeId, mine, actions, now }: { task: DayTask; templeId: string; mine: boolean; actions: boolean; now: Date }) {
  return <li className={styles.task} data-testid="day-task">
    <div className="row"><h3>{t.title}</h3><span className={`badge b-${TASK_TONE[t.status] ?? "warn"}`}>
      {t.status === "UNASSIGNED" ? "ยังไม่มีผู้รับผิดชอบ" : TASK_TH[t.status] ?? "ไม่ทราบสถานะ"}
    </span></div>
    <p className="meta">{t.due_at ? `กำหนด ${fmtDateTime(t.due_at)}` : "ยังไม่กำหนดวันส่ง"}
      {t.due_at && t.due_at < now && !["SUBMITTED", "COMPLETED"].includes(t.status) ? " · เลยกำหนดแล้ว" : ""}
      {!mine && t.assignee_name ? ` · ${t.assignee_name}` : ""}</p>
    {t.description && <p className={styles.description}>{t.description}</p>}
    {(t.building_name || t.venue) && <p>สถานที่ · {t.building_name ?? t.venue}</p>}
    {t.reason && <p>บันทึกส่งต่อ · {t.reason}</p>}
    {mine && actions && t.event_id && t.assignment_id && ["ASSIGNED", "IN_PROGRESS"].includes(t.status) &&
      <TaskProgress templeId={templeId} eventId={t.event_id} assignmentId={t.assignment_id} status={t.status} isMine canVerify={false} />}
    <div className="btn-row">
      {t.event_id && <Link className="btn btn-secondary" href={`/temple/${templeId}/events/${t.event_id}`}>{mine ? "ดูรายละเอียดกิจกรรม" : "เปิดกิจกรรมเพื่อจัดการงาน"}{t.event_title ? ` · ${t.event_title}` : ""}</Link>}
      {t.building_name && <Link className="btn btn-secondary" href={`/temple/${templeId}/map`}>เปิดแผนผังวัด</Link>}
    </div>
    {mine && t.status === "SUBMITTED" && <p className="meta">ส่งงานแล้ว รอผู้มีสิทธิ์ตรวจรับ — ยังไม่ถือว่าเสร็จสมบูรณ์</p>}
    {mine && !t.event_id && t.status !== "COMPLETED" && <p className="meta">งานทั่วไปยังไม่มีหน้าส่งงานในระบบ กรุณาประสานผู้มอบหมาย ไม่ต้องส่งซ้ำ</p>}
  </li>;
}

export function DayWorkspace({ data, templeId, now, isToday }: { data: TeamDayData; templeId: string; now: Date; isToday: boolean }) {
  const groups = groupTasks(data.own, now);
  return <div className="stack">
    <FlashNotice />
    <nav className={styles.summary} aria-label="สรุปงานของฉัน">
      {(["attention", "active", "waiting", "done"] as TaskGroup[]).map(k => groups[k].length ? <Link key={k} href={`#day-${k}`}><strong>{groups[k].length}</strong><span>{GROUP_LABEL[k]}</span></Link> : <span key={k}><strong>0</strong> {GROUP_LABEL[k]}</span>)}
    </nav>
    <p className="meta">งานของฉันเท่านั้น · รวมงานค้างและงานไม่กำหนดวัน · วันและเวลาไทย
      {!isToday && " · สถานะเป็นข้อมูลปัจจุบัน ไม่ใช่ประวัติย้อนหลัง"}</p>
    {data.ownLimited && <Notice kind="info">แสดง 100 งานแรก ตัวเลขสรุปนับเฉพาะงานที่แสดง</Notice>}
    {data.schedule.length > 0 && <section className="stack" aria-label="ตารางของฉัน"><h2>ตารางของวัน</h2><ul className="list">
      {data.schedule.map(s => <li className={styles.task} key={s.ref_id}><h3>{fmtTime(s.starts_at)} · {s.title}</h3><p className="meta">{dayKindLabel("schedule", s.detail.kind)}{s.ends_at ? ` · ถึง ${fmtTime(s.ends_at)}` : ""}{s.detail.venue ? ` · ${s.detail.venue}` : ""}</p></li>)}
    </ul></section>}
    {data.own.length === 0 && <Notice kind="info">ยังไม่มีงานมอบหมายสำหรับวันนี้ ถ้ารอรับงานอยู่ ให้สอบถามผู้จัดกิจกรรม หรือดูงานและกิจกรรมของวัด</Notice>}
    {(["attention", "active", "waiting", "done"] as TaskGroup[]).filter(k => groups[k].length > 0).map(k => <section key={k} id={`day-${k}`} className={`${styles.section} stack`} aria-labelledby={`title-${k}`}>
      <h2 id={`title-${k}`}>{GROUP_LABEL[k]}</h2>
      <ul className="list">{groups[k].map(t => <Task key={t.assignment_id ?? t.id} task={t} templeId={templeId} mine actions={isToday} now={now} />)}</ul>
    </section>)}
    {data.team.length > 0 && <section className={`${styles.team} stack`} aria-label="งานทีมที่ต้องติดตาม"><h2>งานทีมที่ต้องติดตาม</h2>
      <p className="meta">เฉพาะงานที่คุณมีสิทธิ์มอบหมายหรือตรวจรับ ไม่ใช่ภาพรวมทั้งวัด</p>
      {data.teamLimited && <Notice kind="info">แสดง 100 รายการแรก กรุณาเปิดกิจกรรมเพื่อติดตามรายการอื่น</Notice>}
      <ul className="list">{data.team.map(t => <Task key={t.assignment_id ?? t.id} task={t} templeId={templeId} mine={false} actions={false} now={now} />)}</ul>
    </section>}
    <Link className="btn btn-secondary" href={`/temple/${templeId}/events`}>ดูงานและกิจกรรมของวัด</Link>
  </div>;
}
