import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { asUser, templeFieldRows } from "@/lib/db";
import { FieldList, ReadinessList } from "@/components/field-list";
import { Notice } from "@/components/ui";
import { formatValue, STATUS_TH, type Status } from "@/lib/verification";

type H = { at: Date; field_key: string; action: string; old_value: unknown; new_value: unknown; old_status: string | null; new_status: string | null; reason: string | null; actor_name: string | null };
type T = { name_th: string; status: string; claim_relationship: string | null; claim_registry_number: string | null; claim_evidence: string | null };

export default async function Drill({ params }: { params: Promise<{ templeId: string }> }) {
  const { templeId } = await params;
  const s = await getSession(); if (!s) redirect("/login");
  if (!s.isPlatformAdmin) redirect("/me");
  if (!/^[0-9a-f-]{36}$/.test(templeId)) notFound();
  const [data, extra] = await Promise.all([templeFieldRows(s.authUserId, templeId), asUser(s.authUserId, async (c) => ({
    t: (await c.query<T>("select * from app.temple_claim_info($1)", [templeId])).rows[0],
    h: (await c.query<H>(`select h.at, h.field_key, h.action, h.old_value, h.new_value, h.old_status, h.new_status, h.reason, p.display_name as actor_name
          from public.temple_field_value_history h left join public.persons p on p.id::text = h.actor
         where h.temple_id = $1 order by h.at desc, h.id desc limit 200`, [templeId])).rows,
  }))]);
  const back = `/admin/data-verification/${templeId}`;
  return (
    <main className="stack">
      <Link className="back" href="/admin/data-verification">‹ กลับภาพรวม</Link>
      <div><p className="meta" style={{ margin: 0 }}>ชื่อตามใบสมัคร</p><h1>{extra.t?.name_th ?? "ไม่พบวัด"}</h1></div>
      {extra.t?.claim_evidence && <Notice kind="info"><b>หลักฐานจากผู้สมัคร:</b> {extra.t.claim_evidence}
        {extra.t.claim_registry_number ? ` · เลขทะเบียนที่แจ้ง: ${extra.t.claim_registry_number}` : ""}</Notice>}
      <section className="card"><h2>ความพร้อมก่อนเปิดใช้งานจริง</h2><ReadinessList checks={data.readiness} /></section>
      <Notice kind="warn">ผู้ดูแลระบบ: บันทึกได้เฉพาะ "ข้อมูลจากแหล่งทางราชการ" พร้อมลิงก์และหลักฐาน แล้วกด "ตรวจหลักฐานแล้ว" หลังเปิดดูเอกสารจริง
        ผู้ดูแลระบบยืนยันแทนวัดไม่ได้</Notice>
      <FieldList templeId={templeId} catalog={data.catalog} rows={data.rows} back={back} canTemple={false} isAdmin officialOnly />
      <section className="card">
        <h2>ประวัติการเปลี่ยนแปลง</h2>
        {extra.h.length === 0 ? <p>ยังไม่มีประวัติ</p> : (
          <div className="table-wrap"><table className="data">
            <thead><tr><th>เวลา</th><th>เรื่อง</th><th>ค่าเดิม → ค่าใหม่</th><th>สถานะ</th><th>โดย</th><th>เหตุผล</th></tr></thead>
            <tbody>{extra.h.map((h, i) => (
              <tr key={i}>
                <td>{new Date(h.at).toLocaleString("th-TH", { timeZone: "Asia/Bangkok" })}</td>
                <td>{data.catalog.find((c) => c.field_key === h.field_key)?.label_th ?? h.field_key}</td>
                <td>{h.old_value != null ? `${formatValue(h.old_value)} → ` : ""}{formatValue(h.new_value)}</td>
                <td>{h.old_status ? `${STATUS_TH[h.old_status as Status]?.label ?? h.old_status} → ` : ""}{STATUS_TH[h.new_status as Status]?.label ?? h.new_status}</td>
                <td>{h.actor_name || "ระบบ"}</td><td>{h.reason ?? ""}</td>
              </tr>))}</tbody>
          </table></div>
        )}
      </section>
    </main>
  );
}
