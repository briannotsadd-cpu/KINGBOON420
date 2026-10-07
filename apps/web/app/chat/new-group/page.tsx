import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { GroupForm } from "@/components/chat/group-form";
import { myConnections } from "../data";

export const dynamic = "force-dynamic";
export const metadata = { title: "สร้างกลุ่มแชท — KINGBOON" };

export default async function NewGroup() {
  const s = await getSession();
  if (!s) redirect("/login");
  const people = await myConnections(s.authUserId).catch((e) => { console.error("[page:chat/new-group]", e); return null; });
  return (
    <main className="stack">
      <Link className="back" href="/chat">← กลับไปรายการแชท</Link>
      <h1>สร้างกลุ่มแชท</h1>
      <p className="lead" style={{ margin: 0 }}>เพิ่มได้เฉพาะคนที่เชื่อมต่อกับคุณแล้ว</p>
      {people === null ? <div className="notice notice-error" role="alert">ตอนนี้ดึงรายชื่อไม่ได้ กรุณาโหลดหน้านี้ใหม่</div>
        : people.length === 0 ? (
          <div className="card empty"><h3>ยังไม่มีคนให้เลือก</h3><p>ต้องเชื่อมต่อกับคนอื่นก่อนจึงจะสร้างกลุ่มได้</p>
            <Link className="btn btn-primary" href="/community/profile">ไปที่โปรไฟล์ชุมชน</Link></div>
        ) : <GroupForm people={people} />}
    </main>
  );
}
