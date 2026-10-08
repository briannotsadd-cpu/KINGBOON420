import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CalendarDays, Gift, HandCoins, Inbox, LayoutDashboard, Map, Medal, PartyPopper, Users } from "lucide-react";
import { getSession } from "@/lib/auth";
import { Notice } from "@/components/ui";
import { UUID, pointsAccess, type PAccess } from "@/components/points/queries";

export const dynamic = "force-dynamic";

type Item = { href: string; icon: typeof Users; title: string; note: string };

/** Temple menu: one entry point per temple. Each link is shown only when the database's permission functions allow it;
 *  the target pages check again on their own. */
function templeMenu(id: string, a: PAccess): Item[] {
  const base = `/temple/${id}`;
  const lay = a.is_member && !a.is_monastic;
  return ([
    a.is_member && { href: `${base}/day`, icon: CalendarDays, title: a.is_monastic ? "วันนี้ของฉัน" : "วันนี้ของทีมวัด", note: a.is_monastic ? "ตารางวัน กิจนิมนต์ และภารกิจส่วนตัว" : "งานที่ได้รับมอบหมาย งานค้าง และงานที่รอตรวจรับ" },
    (a.is_monastic || a.can_avail || a.can_inv_view) && { href: `${base}/monastic`, icon: CalendarDays, title: "พระและกิจนิมนต์", note: "วันนี้ของฉัน สถานะพระ และกิจนิมนต์" },
    a.is_member && { href: `${base}/events`, icon: PartyPopper, title: "งานและกิจกรรม", note: "งานของวัด ความพร้อม และการสมัครเป็นอาสา" },
    a.is_member && { href: `${base}/map`, icon: Map, title: "แผนผังวัด", note: "อาคารและพื้นที่ที่วัดยืนยันแล้ว" },
    lay && { href: `${base}/points`, icon: Medal, title: "แต้มบุญของฉัน", note: "ยอดแต้มและที่มาของทุกแต้ม" },
    lay && { href: `${base}/rewards`, icon: Gift, title: "ของที่ระลึก", note: "ใช้แต้มแลกของที่ระลึกของวัด" },
    a.can_award && { href: `${base}/points/manage`, icon: HandCoins, title: "มอบแต้มและตรวจแต้มที่รอตรวจ", note: "สำหรับเจ้าหน้าที่ที่ได้รับมอบหมาย" },
    a.can_reward_manage && { href: `${base}/rewards/manage`, icon: Gift, title: "จัดการของที่ระลึก", note: "เพิ่มของ ดูคำขอแลก และส่งมอบ" },
    a.can_cc_view && { href: `${base}/command`, icon: LayoutDashboard, title: "ศูนย์บัญชาการวัด", note: "ภาพรวมวันนี้ สิ่งที่ต้องทำ และข้อเสนอแนะ" },
    a.can_inbox && { href: `${base}/inbox`, icon: Inbox, title: "กล่องข้อความของวัด", note: "ข้อความที่คนทั่วไปส่งถึงวัด" },
  ].filter(Boolean) as Item[]);
}

export default async function TempleHub({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!UUID.test(id)) notFound();
  let a: PAccess | undefined;
  try { a = await pointsAccess(s.authUserId, id); } catch (e) {
    console.error("[page:temple-hub]", e);
    return <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <Notice kind="error">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</Notice></main>;
  }
  const items = a?.is_member ? templeMenu(id, a) : [];
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div><h1>เมนูของวัด</h1>{a?.name_th && <p className="lead" style={{ margin: 0 }}>{a.name_th}</p>}</div>
      {!a?.is_member ? (
        <Notice kind="info">คุณยังไม่ได้เป็นสมาชิกของวัดนี้ ถ้าต้องการติดตามวัด ให้กด “ติดตามวัด” ที่หน้าวัด</Notice>
      ) : (
        <ul className="list">
          {items.map((l) => (
            <li key={l.href}>
              <Link className="card" href={l.href} data-testid={`menu-${l.href.slice(`/temple/${id}`.length + 1).replace("/", "-")}`}>
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
