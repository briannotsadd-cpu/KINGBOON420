import Link from "next/link";
import { Plus } from "lucide-react";
import { gate, LoadError, BackToHub } from "@/components/monastic/parts";
import { listInvitations, type InvRow } from "@/components/monastic/queries";
import { Notice } from "@/components/ui";
import { INV_STATUS_ORDER, INV_STATUS_TH, fmtDateTime, invBadge } from "@/lib/monastic";

export const dynamic = "force-dynamic";

export default async function Invitations({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await gate(id);
  if (!g.ok) return g.page;
  if (!g.access.can_inv_view) return (
    <main className="stack"><BackToHub id={id} /><h1>กิจนิมนต์</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าหน้าที่ที่รับเรื่องนิมนต์ และพระที่อยู่ในคณะของกิจนิมนต์ บัญชีของคุณยังไม่มีสิทธิ์นี้ ถ้าต้องการนิมนต์พระมาทำพิธี กรุณาใช้ปุ่ม ติดต่อวัด ในหน้าวัด</Notice></main>);
  let rows: InvRow[];
  try { rows = await listInvitations(g.s.authUserId, id); } catch (e) { console.error("[page:invitations]", e); return <LoadError id={id} />; }
  return (
    <main className="stack">
      <BackToHub id={id} />
      <div><h1>กิจนิมนต์</h1><p className="lead" style={{ margin: 0 }}>{g.access.name_th}</p></div>
      {g.access.can_inv_manage && <Link className="btn btn-primary btn-block" href={`/temple/${id}/invitations/new`} data-testid="new-invitation"><Plus aria-hidden />รับกิจนิมนต์ใหม่</Link>}
      {rows.length === 0 ? (
        <div className="card empty" data-testid="inv-empty"><h3>ยังไม่มีกิจนิมนต์</h3>
          <p>{g.access.can_inv_manage ? "เมื่อมีเจ้าภาพมานิมนต์ ให้กดรับกิจนิมนต์ใหม่" : "เมื่อเลขาฯ จัดให้ท่านอยู่ในคณะของกิจนิมนต์ จะแสดงที่นี่"}</p></div>
      ) : INV_STATUS_ORDER.map((st) => {
        const list = rows.filter((r) => r.status === st);
        if (!list.length) return null;
        return (
          <section key={st} className="stack" aria-label={INV_STATUS_TH[st]} data-testid={`group-${st}`}>
            <h2 className="group-h" style={{ margin: "12px 0 0" }}>{INV_STATUS_TH[st]} ({list.length})</h2>
            <ul className="list">
              {list.map((r) => (
                <li key={r.id}>
                  <Link className="card" href={`/temple/${id}/invitations/${r.id}`} data-testid={`inv-${r.id}`}>
                    <div className="row"><h3>{r.rite_name ?? "กิจนิมนต์"}</h3><span className={`badge ${invBadge(r.status)}`}>{INV_STATUS_TH[r.status]}</span></div>
                    <p className="meta">เจ้าภาพ {r.host_name} · {fmtDateTime(r.starts_at)} · พระ {r.monks_required} รูป</p>
                    <p className="meta">{r.venue_text}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </main>
  );
}
