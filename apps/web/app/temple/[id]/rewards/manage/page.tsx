import Link from "next/link";
import { Notice } from "@/components/ui";
import { pgate, LoadError, fmtDay } from "@/components/points/parts";
import { rewardManageData } from "@/components/points/queries";
import { ManageRedemptionActions, RewardForm } from "@/components/points/forms";
import { FlashNotice } from "@/components/points/flash";

export const dynamic = "force-dynamic";

export default async function RewardsManage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await pgate(id);
  if (!g.ok) return g.page;
  const a = g.access;
  const back = <Link className="back" href={`/temple/${id}/rewards`}>‹ กลับหน้าของที่ระลึก</Link>;
  if (!a.can_reward_manage) return (
    <main className="stack">{back}<h1>จัดการของที่ระลึก</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับมอบหมายให้ดูแลของที่ระลึกเท่านั้น</Notice></main>);
  let d;
  try { d = await rewardManageData(g.s.authUserId, id); } catch (e) { console.error("[page:rewards-manage]", e); return <LoadError />; }
  return (
    <main className="stack">
      {back}
      <div><h1>จัดการของที่ระลึก</h1><p className="lead" style={{ margin: 0 }}>{a.name_th}</p></div>
      <FlashNotice />
      <section aria-label="คำขอที่รอมอบ">
        <h2>คำขอที่รอมอบของ ({d.requested.length})</h2>
        {d.requested.length === 0 ? <div className="card empty"><h3>ไม่มีคำขอที่รอมอบ</h3></div> : (
          <ul className="list" data-testid="requested">
            {d.requested.map((r) => (
              <li key={r.id} className="card" data-testid="requested-row">
                <div className="row"><h3>{r.reward_name ?? "ของที่ระลึก"}</h3><span className="badge b-warn">รอมอบ</span></div>
                <p className="meta">ผู้ขอ: {r.person_name || "สมาชิก"} · {fmtDay(r.created_at)} · ใช้ {r.cost.toLocaleString("th-TH")} แต้ม</p>
                <ManageRedemptionActions templeId={id} redemptionId={r.id} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="card" aria-label="เพิ่มของที่ระลึก">
        <h2>เพิ่มของที่ระลึก</h2>
        <RewardForm templeId={id} />
      </section>
      <section aria-label="รายการทั้งหมด">
        <h2>รายการของที่ระลึกทั้งหมด</h2>
        {d.rewards.length === 0 ? <p className="meta">ยังไม่มีรายการ</p> : (
          <ul className="list">
            {d.rewards.map((r) => (
              <li key={r.id} className="card" data-testid={`manage-${r.name_th}`}>
                <div className="row"><h3>{r.name_th}</h3><span className={`badge ${r.active ? "b-ok" : "b-closed"}`}>{r.active ? "เปิดให้ขอรับ" : "ซ่อนอยู่"}</span></div>
                <p className="meta">{r.cost.toLocaleString("th-TH")} แต้ม · เหลือ {r.stock.toLocaleString("th-TH")} ชิ้น · {r.per_person_limit ? `คนละไม่เกิน ${r.per_person_limit}` : "ไม่จำกัดต่อคน"}</p>
                <details className="more"><summary>แก้ไขรายการนี้</summary><RewardForm templeId={id} reward={r} /></details>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
