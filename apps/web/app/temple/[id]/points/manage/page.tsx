import Link from "next/link";
import { randomUUID } from "node:crypto";
import { Notice } from "@/components/ui";
import { pgate, LoadError, fmtDay } from "@/components/points/parts";
import { awardData } from "@/components/points/queries";
import { AwardForm, HoldActions } from "@/components/points/forms";
import { FlashNotice } from "@/components/points/flash";
import { signalExplain } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function PointsManage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await pgate(id);
  if (!g.ok) return g.page;
  const a = g.access;
  const back = <Link className="back" href={`/temple/${id}/points`}>‹ กลับหน้าแต้มบุญชุมชน</Link>;
  if (!a.can_award) return (
    <main className="stack">{back}<h1>มอบแต้มและตรวจแต้ม</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับมอบหมายให้ดูแลแต้มบุญชุมชนเท่านั้น</Notice></main>);
  let d;
  try { d = await awardData(g.s.authUserId, id); } catch (e) { console.error("[page:points-manage]", e); return <LoadError />; }
  return (
    <main className="stack">
      {back}
      <div><h1>มอบแต้มและตรวจแต้ม</h1><p className="lead" style={{ margin: 0 }}>{a.name_th}</p></div>
      <Notice kind="info">แต้มจากการร่วมกิจกรรม ไม่ใช่การซื้อหรือแลกบุญ มอบแทนได้เฉพาะเมื่อมีเหตุผลจริง ทุกครั้งผู้รับจะเห็นเหตุผล ไม่มีการมอบให้ตัวเอง และพระสงฆ์ไม่อยู่ในระบบนี้</Notice>
      <FlashNotice />
      <section className="card" aria-label="มอบแต้ม">
        <h2>มอบแต้มให้สมาชิก</h2>
        <AwardForm templeId={id} requestId={randomUUID()} members={d.members} meId={a.me} />
      </section>
      <section aria-label="แต้มที่พักไว้รอตรวจ">
        <h2>แต้มที่พักไว้รอตรวจ ({d.holds.length})</h2>
        {d.holds.length === 0 ? (
          <div className="card empty"><h3>ไม่มีแต้มที่รอตรวจ</h3></div>
        ) : (
          <ul className="list" data-testid="holds">
            {d.holds.map((h) => (
              <li key={h.id} className="card" data-testid="hold-row">
                <div className="row"><h3>{h.person_name || "สมาชิก"}</h3><span className="badge b-warn">รอตรวจ {h.amount.toLocaleString("th-TH")} แต้ม</span></div>
                <p className="meta">{fmtDay(h.created_at)}{h.quest_title ? ` · จากงาน: ${h.quest_title}` : ""}</p>
                <p>{signalExplain(h.signal)}</p>
                {h.person_id === a.me
                  ? <Notice kind="info">นี่เป็นแต้มของคุณเอง ตรวจเองไม่ได้ กรุณาให้เจ้าหน้าที่คนอื่นตรวจ</Notice>
                  : <HoldActions templeId={id} holdId={h.id} />}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
