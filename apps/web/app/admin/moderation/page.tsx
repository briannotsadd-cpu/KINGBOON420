import Link from "next/link";
import { redirect } from "next/navigation";
import { LiftButton } from "@/components/community/people";
import { ModerationItem } from "@/components/community/moderation-item";
import { Notice } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { loadModeration } from "../../community/data";
import s from "@/components/community/community.module.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "ตรวจสอบรายงานชุมชน — KINGBOON" };

export default async function ModerationPage() {
  const sess = await getSession();
  if (!sess) redirect("/login");
  if (!sess.isPlatformAdmin) return (
    <main><div className="card empty"><h1>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</h1><p>บัญชีของคุณไม่มีสิทธิ์ดูรายงานชุมชน</p>
      <Link className="btn btn-secondary" href="/me">กลับหน้าของฉัน</Link></div></main>
  );
  const data = await loadModeration(sess.authUserId).catch((e) => { console.error("[admin:moderation]", e); return null; });
  return (
    <main className={s.scope}>
      <div>
        <h1>รายงานชุมชนที่รอตรวจสอบ</h1>
        <p className="lead" style={{ margin: 0 }}>เรื่องที่เกี่ยวกับผู้เยาว์อยู่บนสุดเสมอ ต้องใส่เหตุผลทุกครั้งที่ตัดสิน ระบบไม่แสดงตัวตนผู้รายงาน</p>
      </div>
      {!data ? <Notice kind="error">ตอนนี้ดึงรายงานไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่</Notice> : (
        <>
          <section className="stack" aria-labelledby="q-h">
            <h2 id="q-h" style={{ margin: 0 }}>รอตรวจสอบ ({data.queue.length})</h2>
            {data.queue.length === 0 ? <div className="card empty"><h3>ไม่มีรายงานที่รอตรวจสอบ</h3></div> : (
              <ul className="list">{data.queue.map((q) => <li key={q.id}><ModerationItem item={q} /></li>)}</ul>
            )}
          </section>
          <section className="stack" aria-labelledby="s-h">
            <h2 id="s-h" style={{ margin: 0 }}>ผู้ที่ถูกระงับอยู่ ({data.suspensions.length})</h2>
            {data.suspensions.length === 0 ? <p className="lead" style={{ margin: 0 }}>ไม่มีผู้ถูกระงับ</p> : (
              <ul className="list">{data.suspensions.map((x) => (
                <li key={x.person_id} className="card"><div className={s.item}>
                  <div><span className={s.itemName}>{x.name}</span><p className={s.when}>ระงับเมื่อ {x.since}</p><p style={{ margin: 0 }}>เหตุผล: {x.reason}</p></div>
                  <LiftButton id={x.person_id} />
                </div></li>
              ))}</ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
