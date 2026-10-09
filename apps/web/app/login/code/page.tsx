import Link from "next/link";
import { redirect } from "next/navigation";
import { CodeForm } from "@/components/forms";
import { Notice } from "@/components/ui";
import { normalizeEmail } from "@/lib/auth";

export default async function CodePage({ searchParams }: { searchParams: Promise<{ email?: string; dev?: string }> }) {
  const { email: raw = "", dev } = await searchParams;
  const email = normalizeEmail(raw);
  if (!email) redirect("/login");
  return (
    <main className="auth-page">
      <Link className="back" href="/login">‹ เปลี่ยนอีเมล</Link>
      <p className="steps">ขั้นที่ 2 จาก 2</p>
      <h1>กรอกรหัสจากอีเมล</h1>
      <div className="stack">
        {dev ? (
          <Notice kind="warn"><b>ยังไม่ได้ส่งอีเมลจริง</b> เพราะยังไม่ได้ตั้งค่าบริการส่งอีเมล (โหมดสำหรับผู้พัฒนา)
            รหัสถูกพิมพ์ไว้ในหน้าต่างของเซิร์ฟเวอร์เท่านั้น</Notice>
        ) : (
          <p className="lead" style={{ margin: 0 }}>เราส่งรหัสไปที่ <b>{email}</b> แล้ว รหัสใช้ได้ 10 นาที ถ้าไม่เห็นอีเมล ลองดูในกล่อง "จดหมายขยะ"</p>
        )}
        <div className="card"><CodeForm email={email} /></div>
        <Link className="btn btn-secondary" href="/login">ขอรหัสใหม่</Link>
      </div>
    </main>
  );
}
