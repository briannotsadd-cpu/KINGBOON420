import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Ineligible } from "@/components/community/ineligible";
import { PersonActions } from "@/components/community/people";
import { Notice } from "@/components/ui";
import { isUuid } from "@/lib/community";
import { checkGate, loadCard } from "../../data";
import s from "@/components/community/community.module.css";

const NONE = <span className="hint">ไม่มีข้อมูลที่คุณมีสิทธิ์เห็น</span>;

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await checkGate();
  if (!g.ok) return <Ineligible reason={g.reason} detail={g.suspendedReason} />;
  const card = isUuid(id) ? await loadCard(g.session.authUserId, id).catch((e) => { console.error("[community:card]", e); return "error" as const; }) : null;
  const back = <Link href="/community/people" className="back"><ArrowLeft aria-hidden />กลับไปค้นหาผู้คน</Link>;
  if (card === "error") return <>{back}<Notice kind="error">ตอนนี้ดึงโปรไฟล์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วโหลดหน้านี้ใหม่</Notice></>;
  if (!card) return <>{back}<div className="card empty"><h1>ไม่พบโปรไฟล์นี้</h1><p>โปรไฟล์นี้อาจไม่เปิดให้ดู หรือคุณไม่มีสิทธิ์ดู ลองค้นหาผู้คนอีกครั้ง</p></div></>;
  const mine = card.person_id === g.session.personId;
  return (
    <>
      {back}
      <section className="card stack">
        <div>
          <h1 style={{ margin: 0 }}>{card.display_name}</h1>
          {card.is_connected && <span className="badge b-ok">เชื่อมต่อกันแล้ว</span>}
        </div>
        {mine
          ? <Link className="btn btn-secondary" href="/community/profile" style={{ justifySelf: "start" }}>แก้ไขโปรไฟล์ของฉัน</Link>
          : <PersonActions card={card} />}
        <div>
          <p className={s.fieldTitle}>แนะนำตัว</p>
          <p style={{ margin: 0 }}>{card.bio ?? NONE}</p>
        </div>
        <div>
          <p className={s.fieldTitle}>ความสามารถ</p>
          {card.skills.length ? <ul className={s.chips}>{card.skills.map((x) => <li key={x} className={s.chip}>{x}</li>)}</ul> : NONE}
        </div>
        <div>
          <p className={s.fieldTitle}>สิ่งที่สนใจ</p>
          {card.interests.length ? <ul className={s.chips}>{card.interests.map((x) => <li key={x} className={s.chip}>{x}</li>)}</ul> : NONE}
        </div>
        {!mine && <p className="meta" style={{ margin: 0 }}>แสดงเฉพาะส่วนที่เจ้าของโปรไฟล์ให้คุณเห็น</p>}
      </section>
    </>
  );
}
