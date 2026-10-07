import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { inboxAccess, inboxThreads, type InboxThread } from "@/components/contact/queries";
import { InboxActions } from "@/components/contact/inbox-actions";
import { Notice } from "@/components/ui";
import { STATUS_TH, TABS, topicLabel } from "@/lib/contact";

export const dynamic = "force-dynamic";
const when = (d: Date) => d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" });

export default async function Inbox({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const s = await getSession(); if (!s) redirect("/login");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  let access, rows: InboxThread[] = [], failed = false;
  try {
    access = await inboxAccess(s.authUserId, id);
    if (access?.allowed) rows = await inboxThreads(s.authUserId, id);
  } catch (e) { console.error("[page]", e); failed = true; }
  const active = TABS.find((t) => t.key === tab) ?? TABS[0];
  if (failed) return <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
    <div className="card notice-error" role="alert">ตอนนี้ดึงข้อมูลไม่ได้ กรุณาลองโหลดหน้านี้ใหม่</div></main>;
  // No permission (or not a member): show nothing about the temple or its messages.
  if (!access?.allowed) return (
    <main className="stack"><Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <h1>กล่องข้อความวัด</h1>
      <Notice kind="info">หน้านี้สำหรับเจ้าหน้าที่ที่ได้รับมอบหมายให้ดูแลกล่องข้อความของวัดเท่านั้น</Notice></main>);
  const count = (st: string) => rows.filter((r) => r.status === st).length;
  const shown = rows.filter((r) => r.status === active.status);
  return (
    <main className="stack">
      <Link className="back" href="/me">‹ กลับหน้าของฉัน</Link>
      <div><h1>กล่องข้อความวัด</h1><p className="lead" style={{ margin: 0 }}>{access.name_th} · ใหม่ {count("NEW")}</p></div>
      <nav aria-label="สถานะข้อความ" className="btn-row" style={{ marginTop: 0, gap: 8 }}>
        {TABS.map((t) => (
          <Link key={t.key} href={`/temple/${id}/inbox?tab=${t.key}`} aria-current={t.key === active.key ? "page" : undefined}
            className="btn btn-secondary" style={{ minHeight: 48, padding: "0 16px", ...(t.key === active.key ? { background: "var(--primary)", color: "var(--on-primary)" } : {}) }}>{t.label} {count(t.status)}</Link>
        ))}
      </nav>
      <p className="meta">ไม่มีช่องส่งตรงถึงพระ ทุกคำตอบส่งในนามเจ้าหน้าที่วัด</p>
      {shown.length === 0 ? (
        <div className="card empty"><h3>{active.key === "new" ? "ยังไม่มีข้อความใหม่" : `ยังไม่มีข้อความที่${active.label}`}</h3></div>
      ) : (
        <ul className="list">
          {shown.map((r) => (
            <li key={r.id} className="card" data-testid={`thread-${r.ref_code}`}>
              <div className="row"><h3>{topicLabel(r.topic)}</h3><span className="badge b-unknown">{STATUS_TH[r.status]}</span></div>
              <p className="meta">รหัส {r.ref_code} · {when(r.created_at)}</p>
              <p style={{ whiteSpace: "pre-line" }}>{r.message}</p>
              <p className="meta">จาก {r.sender_name || "ไม่ระบุชื่อ"}{r.has_account ? " (มีบัญชีในระบบ)" : ""}
                {r.sender_phone ? <> · โทร <a href={`tel:${r.sender_phone}`}>{r.sender_phone}</a></> : " · ไม่ได้ใส่เบอร์โทร"}</p>
              <p className="meta">ผู้รับผิดชอบ: {r.assigned_name ?? "—"}</p>
              {r.reply && (
                <div className="notice notice-ok" style={{ display: "block", margin: "8px 0" }}>
                  <b>ตอบโดย เจ้าหน้าที่วัด{r.replied_by_name ? ` (${r.replied_by_name})` : ""}</b>
                  <p style={{ whiteSpace: "pre-line", margin: "8px 0 0" }}>{r.reply}</p>
                  {r.replied_at && <p className="meta">{when(r.replied_at)}</p>}
                </div>
              )}
              <InboxActions templeId={id} threadId={r.id} status={r.status} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
