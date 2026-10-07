import Link from "next/link";
import { CalendarDays, ClipboardList, Flower2, Users } from "lucide-react";
import { Notice } from "@/components/ui";
import { gate } from "@/components/monastic/parts";

export const dynamic = "force-dynamic";

export default async function MonasticHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.page;
  const a = g.access;
  // Only links this person can use (decided by the database's own permission functions, see monasticAccess).
  const links = [
    a.is_monastic && { href: `/temple/${id}/day`, icon: CalendarDays, title: "วันนี้ของฉัน", note: "ตารางวัน กิจนิมนต์ ภารกิจ และสถานะของฉัน" },
    a.is_monastic && { href: `/temple/${id}/practice`, icon: Flower2, title: "กิจวัตรของฉัน", note: "จำนวนวันที่ปฏิบัติ และแต้มกิจวัตรส่วนตัว" },
    a.can_avail && { href: `/temple/${id}/availability`, icon: Users, title: "สถานะพระ", note: "ใครว่าง ใครไม่ว่าง" },
    a.can_inv_view && { href: `/temple/${id}/invitations`, icon: ClipboardList, title: "กิจนิมนต์", note: a.can_inv_manage ? "รับเรื่อง จัดทีม และยืนยันกิจนิมนต์" : "กิจนิมนต์ที่ฉันอยู่ในคณะ" },
  ].filter(Boolean) as { href: string; icon: typeof Users; title: string; note: string }[];
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div><h1>พระและกิจนิมนต์</h1><p className="lead" style={{ margin: 0 }}>{a.name_th}</p></div>
      {links.length === 0 ? (
        <Notice kind="info">บัญชีของคุณยังไม่มีเมนูในส่วนนี้ ส่วนนี้สำหรับพระ สามเณร และเจ้าหน้าที่ที่ได้รับมอบหมาย ถ้าคิดว่าควรมีสิทธิ์ กรุณาแจ้งเลขาฯ ของวัด</Notice>
      ) : (
        <ul className="list">
          {links.map((l) => (
            <li key={l.href}>
              <Link className="card" href={l.href} data-testid={`hub-${l.href.split("/").pop()}`}>
                <div className="row" style={{ justifyContent: "flex-start" }}><l.icon aria-hidden /><h2 style={{ margin: 0 }}>{l.title}</h2></div>
                <p className="meta">{l.note}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
