import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, UsersRound } from "lucide-react";
import { getSession } from "@/lib/auth";
import { initials } from "@/lib/chat";
import { ListRefresher } from "@/components/chat/list-refresher";
import styles from "@/components/chat/chat.module.css";
import { myConnections, myConversations } from "./data";

export const dynamic = "force-dynamic";
export const metadata = { title: "แชท — KINGBOON" };

export default async function ChatList() {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!s.displayName) redirect("/welcome");
  let convs, conns;
  try { [convs, conns] = await Promise.all([myConversations(s.authUserId), myConnections(s.authUserId)]); }
  catch (e) { console.error("[page:chat]", e); convs = null; conns = [] as Awaited<ReturnType<typeof myConnections>>; }
  const withDirect = new Set((convs ?? []).filter((c) => c.kind === "direct").map((c) => c.other_person));
  const startable = conns.filter((p) => !withDirect.has(p.person_id));
  return (
    <main className="stack">
      <ListRefresher seconds={5} />
      <div>
        <h1>แชท</h1>
        <p className="lead" style={{ margin: 0 }}>คุยกับคนที่เชื่อมต่อกันแล้ว ข้อความใหม่จะขึ้นเองโดยไม่ต้องรีเฟรช</p>
      </div>
      <Link className="btn btn-secondary" href="/chat/new-group"><UsersRound aria-hidden />สร้างกลุ่มแชทใหม่</Link>
      {convs === null ? (
        <div className="notice notice-error" role="alert">ตอนนี้ดึงรายการแชทไม่ได้ กรุณาโหลดหน้านี้ใหม่</div>
      ) : convs.length === 0 ? (
        <div className="card empty">
          <h3>ยังไม่มีแชท</h3>
          <p>{conns.length > 0 ? "เลือกคนด้านล่างเพื่อเริ่มคุย" : "คุณยังไม่มีคนที่เชื่อมต่อกัน ไปที่โปรไฟล์ชุมชนเพื่อสร้างโปรไฟล์และส่งคำขอเชื่อมต่อ แล้วกลับมาคุยที่นี่"}</p>
          {conns.length === 0 && <Link className="btn btn-primary" href="/community/profile">ไปที่โปรไฟล์ชุมชน</Link>}
        </div>
      ) : (
        <ul className={styles.list} aria-label="รายการแชท">
          {convs.map((c) => {
            const n = Number(c.unread);
            return (
              <li key={c.id}>
                <Link className={styles.convItem} href={`/chat/${c.id}`} data-testid="conv-item">
                  <span className={styles.avatar} aria-hidden>{c.kind === "group" ? <UsersRound size={26} /> : initials(c.title)}</span>
                  <span className={styles.convBody}>
                    <p className={styles.convName}>{c.title ?? "แชท"}{c.kind === "group" ? " (กลุ่ม)" : ""}</p>
                    <p className={styles.convLast}>{c.last_body ?? "ยังไม่มีข้อความ"}</p>
                  </span>
                  {n > 0 && <span className={styles.unread} data-testid="unread" aria-label={`ยังไม่ได้อ่าน ${n} ข้อความ`}>{n > 99 ? "99+" : n}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {startable.length > 0 && (
        <section aria-labelledby="start-h">
          <h2 id="start-h">เริ่มแชทกับคนที่เชื่อมต่อแล้ว</h2>
          <ul className={styles.list}>
            {startable.map((p) => (
              <li key={p.person_id}>
                <Link className={styles.convItem} href={`/chat/new?with=${p.person_id}`}>
                  <span className={styles.avatar} aria-hidden>{initials(p.display_name)}</span>
                  <span className={styles.convBody}><p className={styles.convName}>{p.display_name}</p></span>
                  <MessageCircle aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
