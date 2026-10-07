import Link from "next/link";
import { redirect } from "next/navigation";
import { TempleForm } from "@/components/forms";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function NewTemple() {
  const s = await getSession();
  if (!s) redirect("/login");
  return (
    <main>
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <h1>ลงทะเบียนวัด</h1>
      <p className="lead">กรอกข้อมูลวัด แล้วกดส่งใบสมัคร ผู้ดูแลระบบจะตรวจสอบก่อนเปิดให้คนทั่วไปเห็น</p>
      <div className="card"><TempleForm mode="create" /></div>
    </main>
  );
}
