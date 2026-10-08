import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { EventForm } from "@/components/events/event-form";
import { eventAccess, eventForEdit, listMembers, type EventForEdit, type MemberRow } from "@/components/events/queries";
import { UUID_RE, toBkkLocal } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string; eventId: string }> }) {
  const { id, eventId } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID_RE.test(id) || !UUID_RE.test(eventId)) notFound();
  let access, ev: EventForEdit | null = null, members: MemberRow[] = [], failed = false;
  try {
    access = await eventAccess(s.authUserId, id);
    if (access?.manage) { [ev, members] = await Promise.all([eventForEdit(s.authUserId, id, eventId), listMembers(s.authUserId, id)]); }
  } catch (e) { console.error("[page:events/edit]", e); failed = true; }
  const back = <Link className="back" href={`/temple/${id}/events/${eventId}`}>‹ กลับไปหน้างาน</Link>;
  if (failed) return <main className="stack">{back}<div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div></main>;
  if (!access?.manage) return (
    <main className="stack">{back}<h1>แก้ไขรายละเอียดงาน</h1><Notice kind="info">การแก้ไขงานทำได้เฉพาะผู้ที่วัดมอบหมายให้จัดการงาน</Notice></main>);
  if (!ev) notFound();
  if (!["DRAFT", "PLANNING", "APPROVED"].includes(ev.status)) return (
    <main className="stack">{back}<h1>แก้ไขรายละเอียดงาน</h1><Notice kind="info">งานนี้เริ่มจัดหรือปิดไปแล้ว จึงแก้ไขรายละเอียดไม่ได้</Notice></main>);
  const lead = members.find((m) => m.person_id === ev.lead_person_id);
  return (
    <main className="stack">
      {back}
      <h1>แก้ไขรายละเอียดงาน</h1>
      <EventForm templeId={id} eventId={ev.id} approved={ev.status === "APPROVED"} members={members} currentLeadName={lead?.display_name}
        initial={{ title: ev.title, kind: ev.kind, description: ev.description ?? "", starts: toBkkLocal(ev.starts_at), ends: toBkkLocal(ev.ends_at),
          venue: ev.venue_text ?? "", visibility: ev.visibility, lead: ev.lead_person_id ?? "", expected: ev.expected_attendance === null ? "" : String(ev.expected_attendance) }} />
    </main>
  );
}
