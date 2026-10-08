import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { EventForm } from "@/components/events/event-form";
import { eventAccess, listMembers, type MemberRow } from "@/components/events/queries";
import { UUID_RE } from "@/lib/events";

export const dynamic = "force-dynamic";

export default async function NewEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID_RE.test(id)) notFound();
  let access, members: MemberRow[] = [], failed = false;
  try {
    access = await eventAccess(s.authUserId, id);
    if (access?.manage) members = await listMembers(s.authUserId, id);
  } catch (e) { console.error("[page:events/new]", e); failed = true; }
  const back = <Link className="back" href={`/temple/${id}/events`}>‹ กลับไปรายการงาน</Link>;
  if (failed) return <main className="stack">{back}<div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div></main>;
  if (!access?.manage) return (
    <main className="stack">{back}<h1>สร้างงานใหม่</h1>
      <Notice kind="info">การสร้างงานทำได้เฉพาะผู้ที่วัดมอบหมายให้จัดการงาน ถ้าอยากเสนองาน กรุณาแจ้งเจ้าหน้าที่วัด</Notice></main>);
  return (
    <main className="stack">
      {back}
      <div><h1>สร้างงานใหม่</h1><p className="lead" style={{ margin: 0 }}>{access.name_th} · งานที่สร้างจะเป็น “ร่าง” ก่อน ยังไม่มีใครเห็นนอกจากทีมจัดการงาน</p></div>
      <EventForm templeId={id} members={members} initial={{ title: "", kind: "ceremony", description: "", starts: "", ends: "", venue: "", visibility: "temple_members", lead: "", expected: "" }} />
    </main>
  );
}
