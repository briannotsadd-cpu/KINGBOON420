import Link from "next/link";
import { ChevronRight, Inbox, MessageSquare } from "lucide-react";
import { inboxTemples } from "./queries";

/** /me section: my messages to temples + the inbox of every temple where I hold contact_inbox.manage (T). */
export async function ContactSection({ authUserId }: { authUserId: string }) {
  const temples = await inboxTemples(authUserId).catch((e) => { console.error("[contact-section]", e); return []; });
  return (
    <section>
      <h2>ข้อความถึงวัด</h2>
      <ul className="list">
        <li><Link className="card" href="/me/contacts"><div className="row"><span style={{ display: "flex", gap: 8, alignItems: "center" }}><MessageSquare aria-hidden /><b>ข้อความของฉันถึงวัด</b></span><ChevronRight aria-hidden /></div></Link></li>
        {temples.map((t) => (
          <li key={t.id}><Link className="card" href={`/temple/${t.id}/inbox`}><div className="row"><span style={{ display: "flex", gap: 8, alignItems: "center" }}><Inbox aria-hidden /><b>กล่องข้อความ {t.name_th}</b></span><ChevronRight aria-hidden /></div></Link></li>
        ))}
      </ul>
    </section>
  );
}
