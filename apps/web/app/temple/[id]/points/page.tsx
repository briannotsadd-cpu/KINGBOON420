import Link from "next/link";
import { Gift, HandHeart } from "lucide-react";
import { Notice } from "@/components/ui";
import { pgate, LoadError, fmtDay } from "@/components/points/parts";
import { myPointsData } from "@/components/points/queries";
import { NOT_POINTS_COPY, signed, txnLabel, txnTone } from "@/lib/points";

export const dynamic = "force-dynamic";

/** Community boon points: own balance + a history that says where every point came from. Lay members only. */
export default async function MyPoints({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await pgate(id);
  if (!g.ok) return g.page;
  const a = g.access;
  const back = <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>;
  if (a.is_monastic) return (
    <main className="stack">{back}
      <h1>แต้มบุญชุมชน</h1>
      <Notice kind="info">แต้มบุญชุมชนเป็นของสมาชิกฆราวาส พระและสามเณรไม่ร่วมระบบนี้ สิ่งที่เป็นของท่านคือ <b>แต้มกิจวัตร</b> ซึ่งแยกต่างหาก ไม่นำมารวมกัน และไม่ใช้แลกของ ดูได้ที่ <Link href={`/temple/${id}/practice`}>กิจวัตรของฉัน</Link></Notice>
    </main>);
  let d;
  try { d = await myPointsData(g.s.authUserId, id); } catch (e) { console.error("[page:points]", e); return <LoadError />; }
  const balance = d.rows.length ? Number(d.rows[0].balance) : 0;
  const rows = d.rows.filter((r) => r.created_at && r.amount !== null);
  return (
    <main className="stack">
      {back}
      <div><h1>แต้มบุญชุมชน</h1><p className="lead" style={{ margin: 0 }}>{a.name_th}</p></div>
      <Notice kind="info">{NOT_POINTS_COPY} ไม่มีการจัดอันดับระหว่างสมาชิก และเห็นเฉพาะของคุณเอง</Notice>
      <section className="card" aria-label="แต้มคงเหลือ">
        <h2>แต้มคงเหลือของฉัน</h2>
        <p className="big" data-testid="balance" style={{ fontSize: "2.2rem" }}>{balance.toLocaleString("th-TH")} แต้ม</p>
        <div className="btn-row">
          <Link className="btn btn-secondary" href={`/temple/${id}/rewards`}><Gift aria-hidden />ของที่ระลึกจากการร่วมกิจกรรม</Link>
        </div>
      </section>
      {d.held.length > 0 && (
        <section className="card" aria-label="แต้มรอตรวจ" data-testid="held">
          <h2>แต้มรอตรวจ</h2>
          <p className="meta">แต้มเหล่านี้ยังไม่นับในแต้มคงเหลือ เจ้าหน้าที่จะตรวจก่อนบันทึก เมื่อตรวจแล้วจะแสดงในประวัติด้านล่าง</p>
          <ul className="list" style={{ marginTop: 12 }}>
            {d.held.map((h) => (
              <li key={h.id} className="row"><span>{fmtDay(h.created_at)} · แต้มจากการร่วมกิจกรรม {h.amount.toLocaleString("th-TH")} แต้ม</span><span className="badge b-warn">รอตรวจ</span></li>
            ))}
          </ul>
        </section>
      )}
      <section aria-label="ประวัติแต้ม">
        <h2>ประวัติแต้ม และที่มาของแต้ม</h2>
        {rows.length === 0 ? (
          <div className="card empty"><h3>ยังไม่มีประวัติแต้ม</h3><p>เมื่อคุณร่วมกิจกรรมของวัดและเจ้าหน้าที่ตรวจรับแล้ว แต้มและที่มาจะแสดงที่นี่</p></div>
        ) : (
          <ul className="list" data-testid="history">
            {rows.map((r, i) => (
              <li key={i} className="card" data-testid="history-row">
                <div className="row">
                  <span className="meta" style={{ margin: 0 }}>{fmtDay(r.created_at!)}</span>
                  <span className={`badge ${txnTone(r.amount!)}`} data-testid="amount">{signed(r.amount!)} แต้ม</span>
                </div>
                <h3 style={{ marginTop: 8 }}>{txnLabel(r.txn_type)}</h3>
                <p style={{ margin: "4px 0 0" }}>ที่มา: {r.reason || "ไม่ได้ระบุ"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {a.can_award && (
        <Link className="card" href={`/temple/${id}/points/manage`}>
          <div className="row" style={{ justifyContent: "flex-start" }}><HandHeart aria-hidden /><h3>เครื่องมือเจ้าหน้าที่: มอบแต้มและตรวจแต้มที่พักไว้</h3></div>
        </Link>
      )}
    </main>
  );
}
