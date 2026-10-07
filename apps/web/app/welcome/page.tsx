import { redirect } from "next/navigation";
import { NameForm } from "@/components/forms";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function Welcome() {
  if (!(await getSession())) redirect("/login");
  return (
    <main>
      <h1>ยินดีต้อนรับ</h1>
      <p className="lead">ขั้นสุดท้าย: บอกชื่อที่ต้องการให้คนอื่นเห็น</p>
      <div className="card"><NameForm /></div>
    </main>
  );
}
