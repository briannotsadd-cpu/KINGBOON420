import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { getSession } from "@/lib/auth";

export default async function Sent({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ ref?: string }> }) {
  const [{ slug }, { ref }] = await Promise.all([params, searchParams]);
  const s = await getSession().catch(() => null);
  const refOk = ref && /^[0-9A-Fa-f]{8}$/.test(ref) ? ref.toUpperCase() : null;
  return (
    <main className="stack">
      <div className="card" style={{ textAlign: "center" }}>
        <CheckCircle2 size={48} aria-hidden style={{ color: "var(--ok)" }} />
        <h1>ส่งข้อความถึงวัดแล้ว</h1>
        {refOk && (<><p style={{ margin: 0 }}>รหัสอ้างอิงของคุณ</p><p className="big" data-testid="ref-code" style={{ letterSpacing: ".15em" }}>{refOk}</p></>)}
        <p>เจ้าหน้าที่วัดจะอ่านข้อความของคุณ เราบอกไม่ได้ว่าวัดจะตอบเมื่อไร</p>
        <p className="meta">{s
          ? "เมื่อวัดตอบ คุณจะเห็นคำตอบในหน้า “ข้อความของฉัน”"
          : "ถ้าคุณใส่เบอร์โทร วัดอาจติดต่อกลับทางเบอร์นั้น ควรจดรหัสอ้างอิงไว้ ถ้าต้องการให้ตอบในระบบ ให้เข้าสู่ระบบก่อนส่งข้อความ"}</p>
      </div>
      {s && <Link className="btn btn-primary btn-block" href="/me/contacts">ดูข้อความของฉัน</Link>}
      <Link className={`btn ${s ? "btn-secondary" : "btn-primary"} btn-block`} href={`/t/${encodeURIComponent(slug)}`}>กลับไปหน้าวัด</Link>
    </main>
  );
}
