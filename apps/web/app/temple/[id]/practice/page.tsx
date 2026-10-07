import { gate, LoadError, BackToHub } from "@/components/monastic/parts";
import { myPractice } from "@/components/monastic/queries";
import { Notice } from "@/components/ui";

export const dynamic = "force-dynamic";

/** Own practice days and own activity score. No ranking, no comparison, no loss states: only what the monk himself did. */
export default async function Practice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.page;
  if (!g.access.is_monastic) return (
    <main className="stack"><BackToHub id={id} />
      <h1>กิจวัตรของฉัน</h1>
      <Notice kind="info">หน้านี้เป็นบันทึกกิจวัตรส่วนตัวของพระและสามเณร จึงยังไม่มีข้อมูลสำหรับบัญชีของคุณ</Notice>
    </main>);
  let p;
  try { p = await myPractice(g.s.authUserId, id); } catch (e) { console.error("[page:practice]", e); return <LoadError id={id} />; }
  if (!p) return <LoadError id={id} />;
  const month = Number(p.practice_days_this_month), total = Number(p.practice_days_total), score = Number(p.activity_score);
  return (
    <main className="stack">
      <BackToHub id={id} />
      <div><h1>กิจวัตรของฉัน</h1><p className="lead" style={{ margin: 0 }}>{g.access.name_th} · เห็นเฉพาะตัวท่านเอง</p></div>
      <section className="card" aria-label="วันที่ปฏิบัติ" data-testid="practice-days">
        <h2>วันที่ปฏิบัติกิจวัตร</h2>
        <div className="kpis">
          <div className="kpi"><b data-testid="days-month">{month}</b>วัน เดือนนี้</div>
          <div className="kpi"><b data-testid="days-total">{total}</b>วัน ทั้งหมด</div>
          {p.current_run != null && <div className="kpi"><b data-testid="days-run">{p.current_run}</b>วัน ติดต่อกัน</div>}
        </div>
        {total === 0 && <p className="meta">เมื่อมีภารกิจกิจวัตรที่ตรวจรับแล้ว วันที่ปฏิบัติจะแสดงที่นี่</p>}
      </section>
      <section className="card" aria-label="แต้มกิจวัตร" data-testid="practice-score">
        <h2>แต้มกิจวัตร</h2>
        <p className="big" data-testid="score">{score.toLocaleString("th-TH")}</p>
        <p className="meta">ตัวชี้วัดความก้าวหน้าส่วนตัว แลกไม่ได้</p>
        <p className="meta">แต้มนี้เห็นเฉพาะตัวท่านเอง ไม่ใช้เทียบกับรูปอื่น และไม่มีการจัดอันดับ</p>
      </section>
    </main>
  );
}
