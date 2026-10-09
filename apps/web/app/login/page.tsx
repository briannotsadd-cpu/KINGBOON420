import { redirect } from "next/navigation";
import { EmailForm } from "@/components/forms";
import { getSession } from "@/lib/auth";
import { KeyRound } from "lucide-react";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await getSession().catch((e) => { console.error("[page]", e); return null; })) redirect("/me");
  return (
    <main className="auth-page">
      <div className="auth-mark"><KeyRound size={28} aria-hidden /></div>
      <p className="steps">ขั้นที่ 1 จาก 2</p>
      <h1>เข้าสู่ระบบ</h1>
      <p className="lead">กรอกอีเมล แล้วเราจะส่งรหัส 6 หลักไปให้ ไม่ต้องจำรหัสผ่าน</p>
      <div className="card"><EmailForm /></div>
    </main>
  );
}
