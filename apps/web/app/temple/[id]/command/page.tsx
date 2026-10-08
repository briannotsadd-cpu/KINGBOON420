import Link from "next/link";
import { CalendarClock, Inbox, MailOpen } from "lucide-react";
import { Notice } from "@/components/ui";
import { pgate, LoadError } from "@/components/points/parts";
import { commandData } from "@/components/command/queries";
import { CommunityPanel, EventPanel, FacilityPanel, MonasticPanel, QuestPanel, StaffPanel } from "@/components/command/panels";
import { ConflictsCard, DailySummary } from "@/components/command/cards";
import { EventChecklist } from "@/components/helpers/event-checklist";
import { asOfText } from "@/lib/command";
import { fmtDateTime } from "@/lib/monastic";

export const dynamic = "force-dynamic";

/** Temple Command Center: counts only, Unknown is explicit, nothing is decided by the system. */
export default async function Command({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await pgate(id);
  if (!g.ok) return g.page;
  const a = g.access;
  const back = <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>;
  if (!a.can_cc_view) return (
    <main className="stack">{back}<h1>ศูนย์บัญชาการวัด</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าอาวาส เลขาฯ และเจ้าหน้าที่ที่ได้รับมอบหมายให้ดูภาพรวมของวัดเท่านั้น ถ้าคิดว่าควรมีสิทธิ์ กรุณาแจ้งเลขาฯ ของวัด</Notice></main>);
  let d;
  try { d = await commandData(g.s.authUserId, id); } catch (e) { console.error("[page:command]", e); return <LoadError />; }
  if (!d.cc) return <LoadError />;
  const cc = d.cc;
  const links = [
    a.can_avail && { href: `/temple/${id}/availability`, icon: CalendarClock, label: "สถานะพระ (ใครว่าง/ไม่ว่าง)" },
    a.can_inv_view && { href: `/temple/${id}/invitations`, icon: MailOpen, label: "กิจนิมนต์" },
    a.can_inbox && { href: `/temple/${id}/inbox`, icon: Inbox, label: "กล่องข้อความวัด" },
  ].filter(Boolean) as { href: string; icon: typeof Inbox; label: string }[];
  return (
    <main className="stack">
      {back}
      <div>
        <h1>ศูนย์บัญชาการวัด</h1>
        <p className="lead" style={{ margin: 0 }}>{a.name_th} · <span data-testid="as-of">{asOfText(cc.as_of)}</span></p>
      </div>
      <Notice kind="info">หน้านี้แสดงเฉพาะจำนวน ไม่มีคะแนนรายบุคคลและไม่มีการจัดอันดับ ข้อมูลที่ระบบยังไม่มีจะแสดงว่า “ไม่ทราบ” พร้อมเหตุผล ไม่แสดงเป็น 0</Notice>
      <DailySummary lines={d.summary} />
      <ConflictsCard rows={d.conflicts} full={d.fullConflicts} />
      {d.nextEvent && d.checklist && (
        <section className="card" aria-label="รายการตรวจความพร้อมของงาน">
          <h2>งานถัดไปที่คุณดูแล</h2>
          <EventChecklist rows={d.checklist} title={`${d.nextEvent.title} · ${fmtDateTime(new Date(d.nextEvent.starts_at))}`} />
        </section>
      )}
      {cc.monastic && <MonasticPanel m={cc.monastic as never} inv={cc.invitations as never} />}
      <StaffPanel s={cc.staff} />
      <QuestPanel q={cc.quests} />
      <EventPanel e={cc.events} />
      <FacilityPanel f={cc.facility} />
      <CommunityPanel c={cc.community} />
      {links.length > 0 && (
        <nav aria-label="ไปยังหน้าที่เกี่ยวข้อง"><h2>ไปทำต่อที่หน้า</h2>
          <ul className="list">{links.map((l) => (
            <li key={l.href}><Link className="card" href={l.href}><div className="row" style={{ justifyContent: "flex-start" }}><l.icon aria-hidden /><h3>{l.label}</h3></div></Link></li>))}</ul>
        </nav>
      )}
    </main>
  );
}
