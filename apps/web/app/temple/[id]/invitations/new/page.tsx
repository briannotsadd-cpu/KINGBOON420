import Link from "next/link";
import { gate, LoadError } from "@/components/monastic/parts";
import { riteTypes, type RiteType } from "@/components/monastic/queries";
import { NewInvitationForm, RiteTypeForm } from "@/components/monastic/invitation-forms";
import { Notice } from "@/components/ui";
import { bkkYmd } from "@/lib/monastic";

export const dynamic = "force-dynamic";

export default async function NewInvitation({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.page;
  const back = <Link className="back" href={`/temple/${id}/invitations`}>‹ กลับรายการกิจนิมนต์</Link>;
  if (!g.access.can_inv_manage) return (
    <main className="stack">{back}<h1>รับกิจนิมนต์ใหม่</h1>
      <Notice kind="info">หน้านี้สำหรับเลขาฯ และเจ้าหน้าที่ที่ได้รับมอบหมายให้รับเรื่องนิมนต์ บัญชีของคุณยังไม่มีสิทธิ์นี้</Notice></main>);
  let rites: RiteType[];
  try { rites = await riteTypes(g.s.authUserId, id); } catch (e) { console.error("[page:invitations/new]", e); return <LoadError id={id} />; }
  return (
    <main className="stack">
      {back}
      <div><h1>รับกิจนิมนต์ใหม่</h1><p className="lead" style={{ margin: 0 }}>{g.access.name_th} · บันทึกข้อมูลจากเจ้าภาพ แล้วจึงจัดทีมพระในขั้นต่อไป</p></div>
      <RiteTypeForm templeId={id} open={rites.length === 0} />
      <NewInvitationForm templeId={id} rites={rites} minDate={bkkYmd(new Date())} />
    </main>
  );
}
