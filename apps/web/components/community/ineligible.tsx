import Link from "next/link";
import { Building2, ShieldAlert, UserRound } from "lucide-react";
import type { GateReason } from "@/lib/community";

const COPY: Record<GateReason, { title: string; body: string }> = {
  no_profile: { title: "ยังไม่มีโปรไฟล์ชุมชน", body: "ก่อนเข้าชุมชน กรุณาสร้างโปรไฟล์ของคุณก่อน ใช้เวลาประมาณ 1 นาที" },
  no_temple: { title: "ติดตามวัดก่อน", body: "ชุมชนเปิดให้สมาชิกของวัดที่ผ่านการตรวจสอบ กรุณาติดตามวัดอย่างน้อย 1 วัดก่อน แล้วกลับมาที่หน้านี้" },
  monastic: { title: "บัญชีพระใช้ช่องทางติดต่อวัดแทน", body: "บัญชีพระใช้ช่องทางติดต่อวัดแทน ไม่มีแชท/ชุมชน" },
  minor: { title: "ยังใช้ชุมชนไม่ได้", body: "ผู้มีอายุต่ำกว่า 20 ปียังใช้ชุมชนไม่ได้" },
  suspended: { title: "บัญชีของคุณถูกระงับการใช้ชุมชน", body: "ผู้ดูแลระบบระงับการใช้ชุมชนของคุณ" },
};

export function Ineligible({ reason, detail }: { reason: GateReason; detail?: string }) {
  const c = COPY[reason];
  const Icon = reason === "no_profile" ? UserRound : reason === "no_temple" ? Building2 : ShieldAlert;
  return (
    <section className="card empty stack" aria-labelledby="gate-h">
      <Icon size={40} aria-hidden style={{ margin: "0 auto" }} />
      <h1 id="gate-h" style={{ margin: 0 }}>{c.title}</h1>
      <p style={{ margin: 0 }}>{c.body}</p>
      {reason === "suspended" && detail && <p style={{ margin: 0 }}>เหตุผล: {detail}</p>}
      {reason === "suspended" && <p style={{ margin: 0 }}>ถ้าคิดว่าเกิดความผิดพลาด กรุณาติดต่อผู้ดูแลระบบหรือวัดของคุณ</p>}
      {reason === "no_profile" && <Link className="btn btn-primary" href="/community/profile" style={{ justifySelf: "center" }}>สร้างโปรไฟล์ชุมชน</Link>}
      {reason === "no_temple" && <Link className="btn btn-primary" href="/" style={{ justifySelf: "center" }}>ค้นหาวัดเพื่อติดตาม</Link>}
    </section>
  );
}
