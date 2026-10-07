import { redirect } from "next/navigation";
import { EmailForm } from "@/components/forms";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (await getSession().catch((e) => { console.error("[page]", e); return null; })) redirect("/me");
  return (
    <main>
      <p className="steps">ขั้นที่ 1 จาก 2</p>
      <h1>เข้าสู่ระบบ</h1>
      <p className="lead">กรอกอีเมล แล้วเราจะส่งรหัส 6 หลักไปให้ ไม่ต้องจำรหัสผ่าน</p>
      <div className="card"><EmailForm /></div>
    </main>
  );
}
