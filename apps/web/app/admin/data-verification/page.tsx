import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser } from "@/lib/db";
import { StatusBadge } from "@/components/status";

type O = { temple_id: string; temple_name: string; temple_status: string; verified: string; awaiting: string; conflict: string;
  expired: string; rejected: string; missing_source: string; is_verified: boolean };

export default async function Overview() {
  const s = await getSession(); if (!s) redirect("/login");
  if (!s.isPlatformAdmin) return <main><div className="card empty"><h2>หน้านี้สำหรับผู้ดูแลระบบเท่านั้น</h2></div></main>;
  const rows = await asUser(s.authUserId, async (c) => (await c.query<O>("select * from app.verification_overview()")).rows)
    .catch((e) => { console.error("[page]", e); return null; });
  const sum = (k: keyof O) => (rows ?? []).reduce((a, r) => a + Number(r[k]), 0);
  return (
    <main className="stack">
      <Link className="back" href="/admin">‹ กลับหน้าผู้ดูแลระบบ</Link>
      <div><h1>การตรวจสอบข้อมูลวัด</h1><p className="lead" style={{ margin: 0 }}>ภาพรวมสถานะข้อมูลของทุกวัด กดชื่อวัดเพื่อดูรายละเอียดทีละเรื่อง</p></div>
      {rows === null ? <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div>
      : rows.length === 0 ? <div className="card empty"><h2>ยังไม่มีวัดในระบบ</h2><p>เมื่อมีผู้สมัครดูแลวัด ข้อมูลจะแสดงที่นี่</p></div>
      : <>
        <div className="kpis" aria-label="ภาพรวม">
          {([["verified", "ยืนยันแล้ว"], ["awaiting", "รอยืนยัน"], ["conflict", "ข้อมูลขัดกัน"], ["expired", "หมดอายุ"], ["rejected", "ไม่ใช้"], ["missing_source", "ยังไม่มีข้อมูล"]] as const)
            .map(([k, l]) => <div className="kpi" key={k}><span className="meta">{l}</span><b>{sum(k)}</b></div>)}
        </div>
        <div className="card table-wrap">
          <table className="data">
            <thead><tr><th>วัด</th><th>ใบสมัคร</th><th>ยืนยัน</th><th>รอ</th><th>ขัดกัน</th><th>หมดอายุ</th><th>ไม่มีข้อมูล</th><th>สถานะวัด</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.temple_id}>
                <td><Link href={`/admin/data-verification/${r.temple_id}`}>{r.temple_name}</Link><br /><span className="hint">ชื่อตามใบสมัคร</span></td>
                <td><StatusBadge status={r.temple_status} /></td>
                <td>{r.verified}</td><td>{r.awaiting}</td><td>{r.conflict}</td><td>{r.expired}</td><td>{r.missing_source}</td>
                <td>{r.is_verified ? <span className="badge b-ok">VERIFIED TEMPLE</span> : <span className="badge b-warn">ยังไม่พร้อม</span>}</td>
              </tr>))}</tbody>
          </table>
        </div>
      </>}
    </main>
  );
}
