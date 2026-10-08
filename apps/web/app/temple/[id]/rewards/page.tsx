import Link from "next/link";
import { Settings } from "lucide-react";
import { Notice } from "@/components/ui";
import { pgate, LoadError, fmtDay } from "@/components/points/parts";
import { rewardsData } from "@/components/points/queries";
import { CancelRedemption, RedeemForm } from "@/components/points/forms";
import { FlashNotice } from "@/components/points/flash";
import { NOT_POINTS_COPY, redemptionLabel, redemptionTone } from "@/lib/points";

export const dynamic = "force-dynamic";

export default async function Rewards({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await pgate(id);
  if (!g.ok) return g.page;
  const a = g.access;
  const back = <Link className="back" href={`/temple/${id}/points`}>‹ กลับหน้าแต้มบุญชุมชน</Link>;
  if (a.is_monastic) return (
    <main className="stack">{back}<h1>ของที่ระลึกจากการร่วมกิจกรรม</h1>
      <Notice kind="info">การขอรับของที่ระลึกใช้แต้มบุญชุมชนของสมาชิกฆราวาส พระและสามเณรไม่ร่วมระบบนี้ และแต้มกิจวัตรของท่านแลกของไม่ได้ ดูกิจวัตรได้ที่ <Link href={`/temple/${id}/practice`}>กิจวัตรของฉัน</Link></Notice></main>);
  let d;
  try { d = await rewardsData(g.s.authUserId, id); } catch (e) { console.error("[page:rewards]", e); return <LoadError />; }
  return (
    <main className="stack">
      {back}
      <div><h1>ของที่ระลึกจากการร่วมกิจกรรม</h1><p className="lead" style={{ margin: 0 }}>{a.name_th}</p></div>
      <Notice kind="info">{NOT_POINTS_COPY} ของที่ระลึกเป็นการขอบคุณที่ร่วมกิจกรรม ไม่ได้เป็นการซื้อขาย</Notice>
      <FlashNotice />
      <p className="big" data-testid="balance">แต้มของฉัน {d.balance.toLocaleString("th-TH")} แต้ม</p>
      <section aria-label="รายการของที่ระลึก">
        <h2>ของที่ขอรับได้</h2>
        {d.rewards.length === 0 ? (
          <div className="card empty"><h3>ตอนนี้ยังไม่มีรายการของที่ระลึก</h3><p>เมื่อวัดเพิ่มรายการ จะแสดงที่นี่</p></div>
        ) : (
          <ul className="list">
            {d.rewards.map((r) => (
              <li key={r.id} className="card" data-testid={`reward-${r.name_th}`}>
                <div className="row"><h3>{r.name_th}</h3><span className="badge b-closed">{r.cost.toLocaleString("th-TH")} แต้ม</span></div>
                {r.description && <p style={{ whiteSpace: "pre-line" }}>{r.description}</p>}
                <p className="meta">{r.per_person_limit ? `ขอรับได้คนละ ${r.per_person_limit} ชิ้น` : "ไม่จำกัดจำนวนต่อคน"} · {r.stock > 0 ? "มีของพร้อมมอบ" : "ของหมดแล้ว"}</p>
                {r.stock > 0 && <RedeemForm templeId={id} reward={r} />}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-label="คำขอของฉัน">
        <h2>คำขอรับของฉัน</h2>
        {d.mine.length === 0 ? <p className="meta">คุณยังไม่ได้ขอรับของที่ระลึก</p> : (
          <ul className="list" data-testid="mine">
            {d.mine.map((m) => (
              <li key={m.id} className="card" data-testid="mine-row">
                <div className="row"><h3>{m.reward_name ?? "ของที่ระลึก"}</h3><span className={`badge ${redemptionTone(m.status)}`}>{redemptionLabel(m.status)}</span></div>
                <p className="meta">ขอเมื่อ {fmtDay(m.created_at)} · ใช้ {m.cost.toLocaleString("th-TH")} แต้ม{m.status === "CANCELLED" ? " (คืนแต้มแล้ว)" : ""}</p>
                {m.status === "REQUESTED" && <p className="meta">รอเจ้าหน้าที่มอบของให้ที่วัด</p>}
                <CancelRedemption templeId={id} redemptionId={m.id} open={m.status === "REQUESTED"} />
              </li>
            ))}
          </ul>
        )}
      </section>
      {a.can_reward_manage && (
        <Link className="card" href={`/temple/${id}/rewards/manage`}>
          <div className="row" style={{ justifyContent: "flex-start" }}><Settings aria-hidden /><h3>เครื่องมือเจ้าหน้าที่: จัดการของที่ระลึก</h3></div>
        </Link>
      )}
    </main>
  );
}
