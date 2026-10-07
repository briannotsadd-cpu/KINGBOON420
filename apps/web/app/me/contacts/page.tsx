import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { myThreads, templeNames, type MyThread } from "@/components/contact/queries";
import { STATUS_TH, topicLabel } from "@/lib/contact";

export const dynamic = "force-dynamic";
const TONE: Record<string, string> = { NEW: "b-unknown", ASSIGNED: "b-warn", REPLIED: "b-ok", CLOSED: "b-closed" };
const when = (d: Date) => d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });
const WAIT: Record<string, string> = { NEW: "วัดยังไม่ได้รับเรื่อง", ASSIGNED: "เจ้าหน้าที่วัดรับเรื่องแล้ว กำลังดำเนินการ" };

export default async function MyContacts() {
  const s = await getSession();
  if (!s) redirect("/login");
  let rows: MyThread[] | null = null, names = new Map<string, string>();
  try { rows = await myThreads(s.authUserId); names = await templeNames([...new Set(rows.map((r) => r.temple_id))]); }
  catch (e) { console.error("[page]", e); rows = null; }
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div>
        <h1>ข้อความของฉันถึงวัด</h1>
        <p className="lead" style={{ margin: 0 }}>แสดงเฉพาะข้อความที่คุณส่งขณะเข้าสู่ระบบ</p>
      </div>
      {rows === null ? <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div>
      : rows.length === 0 ? (
        <div className="card empty"><h3>คุณยังไม่ได้ส่งข้อความถึงวัด</h3><p>เปิดหน้าวัดที่ต้องการ แล้วกด “ติดต่อวัด” ระหว่างที่เข้าสู่ระบบ</p>
          <Link className="btn btn-primary" href="/">ค้นหาวัด</Link></div>
      ) : (
        <ul className="list">
          {rows.map((r) => (
            <li key={r.id} className="card" data-testid={`my-thread-${r.ref_code}`}>
              <div className="row"><h3>{names.get(r.temple_id) ?? "วัด"} · {topicLabel(r.topic)}</h3>
                <span className={`badge ${TONE[r.status] ?? "b-unknown"}`}>{STATUS_TH[r.status] ?? r.status}</span></div>
              <p className="meta">รหัสอ้างอิง {r.ref_code} · ส่งเมื่อ {when(r.created_at)}</p>
              <p style={{ whiteSpace: "pre-line" }}>{r.message}</p>
              {r.reply ? (
                <div className="notice notice-ok" style={{ display: "block" }}>
                  <b>ตอบโดย เจ้าหน้าที่วัด{r.replied_by_name ? ` (${r.replied_by_name})` : ""}</b>
                  <p style={{ whiteSpace: "pre-line", margin: "8px 0 0" }}>{r.reply}</p>
                  {r.replied_at && <p className="meta">{when(r.replied_at)}</p>}
                </div>
              ) : WAIT[r.status] ? <p className="meta">{WAIT[r.status]} (ยังไม่มีคำตอบ ระบบบอกไม่ได้ว่าจะตอบเมื่อไร)</p> : <p className="meta">เรื่องนี้ปิดแล้วโดยไม่มีคำตอบในระบบ</p>}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
