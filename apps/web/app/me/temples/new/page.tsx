import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterTempleForm } from "@/components/forms";
import { getSession } from "@/lib/auth";

export default async function NewTemple() {
  if (!(await getSession())) redirect("/login");
  return (
    <main>
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <h1>สมัครเป็นผู้ดูแลข้อมูลวัด</h1>
      <p className="lead">กรอกข้อมูลวัดและหลักฐานว่าคุณเกี่ยวข้องกับวัด ผู้ดูแลระบบจะตรวจกับทะเบียนวัดของสำนักงานพระพุทธศาสนาแห่งชาติก่อนอนุมัติ</p>
      <div className="card"><RegisterTempleForm /></div>
    </main>
  );
}
