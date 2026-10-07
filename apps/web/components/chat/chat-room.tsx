"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EllipsisVertical, LogOut, Phone, Send, Video } from "lucide-react";
import { Notice } from "@/components/ui";
import { leaveConversationAction, reportMessageAction, sendMessageAction, startCallAction } from "@/app/chat/actions";
import { cursorOf, initials, MAX_BODY, mergeMessages, REMOVED_TH, REPORT_REASONS, timeLabel, type ChatMessage } from "@/lib/chat";
import styles from "./chat.module.css";

const POLL_MS = 3000;
const FULL_REFRESH_EVERY = 10; // every 10th poll re-reads the whole window, so a moderator removal shows up (cursor polls only see new rows)

export function ChatRoom({ conversationId, kind, title, me, initial }:
  { conversationId: string; kind: "direct" | "group"; title: string; me: string; initial: ChatMessage[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollWarn, setPollWarn] = useState(false);
  const [callBusy, setCallBusy] = useState<"voice" | "video" | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [reportMsg, setReportMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pollCount = useRef(0);
  const inFlight = useRef(false);

  const poll = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      pollCount.current += 1;
      const full = pollCount.current % FULL_REFRESH_EVERY === 0;
      const after = full ? null : cursorOf(messagesRef.current);
      const qs = new URLSearchParams({ read: "1" });
      if (after) qs.set("after", after);
      const res = await fetch(`/api/chat/${conversationId}?${qs}`, { cache: "no-store" });
      if (res.status === 401) { router.push("/login"); return; }
      if (res.status === 403) { router.refresh(); return; }
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { messages: ChatMessage[] };
      setPollWarn(false);
      if (data.messages.length) setMessages((cur) => mergeMessages(cur, data.messages));
    } catch { setPollWarn(true); }
    finally { inFlight.current = false; }
  }, [conversationId, router]);

  useEffect(() => {
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  // keep the newest message in view
  useEffect(() => { const el = logRef.current; if (el) el.scrollTop = el.scrollHeight; }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true); setError(null);
    const r = await sendMessageAction(conversationId, draft).catch(() => ({ ok: false as const, error: "ส่งไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดส่งอีกครั้ง ข้อความของคุณยังอยู่ในช่องพิมพ์" }));
    setSending(false);
    if (!r.ok) { setError(r.error); return; } // keep the draft
    setDraft("");
    await poll();
  }

  async function call(media: "voice" | "video") {
    setCallBusy(media); setError(null);
    const r = await startCallAction(conversationId, media).catch(() => ({ ok: false as const, error: "โทรไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่" }));
    if (!r.ok || !r.id) { setCallBusy(null); setError(r.ok ? "โทรไม่สำเร็จ กรุณาลองใหม่" : r.error); return; }
    router.push(`/call/${r.id}?go=1`);
  }

  async function leave() {
    const r = await leaveConversationAction(conversationId);
    if (!r.ok) { setError(r.error); setConfirmLeave(false); return; }
    router.push("/chat");
  }

  async function report(messageId: string, fd: FormData) {
    const r = await reportMessageAction(messageId, String(fd.get("reason") ?? ""), String(fd.get("note") ?? ""))
      .catch(() => ({ ok: false as const, error: "ส่งรายงานไม่สำเร็จ กรุณาลองใหม่" }));
    if (r.ok) { setReporting(null); setMenuFor(null); setReportMsg({ kind: "ok", text: "ส่งรายงานแล้ว ผู้ดูแลระบบจะตรวจสอบข้อความนี้ ขอบคุณที่ช่วยดูแลชุมชน" }); }
    else setReportMsg({ kind: "error", text: r.error });
  }

  const over = draft.length > MAX_BODY;
  return (
    <main className={styles.room}>
      <div className={styles.head}>
        <Link className="back" href="/chat" aria-label="กลับไปรายการแชท">←</Link>
        <h1 className={styles.headTitle} data-testid="chat-title">{title}</h1>
        {kind === "direct" ? (
          <div className={styles.callBtns}>
            <button type="button" className="btn btn-secondary" onClick={() => call("voice")} disabled={callBusy !== null} aria-busy={callBusy === "voice"}>
              <Phone aria-hidden />โทร</button>
            <button type="button" className="btn btn-secondary" onClick={() => call("video")} disabled={callBusy !== null} aria-busy={callBusy === "video"}>
              <Video aria-hidden />วิดีโอคอล</button>
          </div>
        ) : confirmLeave ? (
          <div className={styles.callBtns}>
            <button type="button" className="btn btn-danger" onClick={leave}>ยืนยัน ออกจากกลุ่ม</button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(false)}>ยกเลิก</button>
          </div>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => setConfirmLeave(true)}><LogOut aria-hidden />ออกจากกลุ่ม</button>
        )}
      </div>

      <div ref={logRef} className={styles.log} role="log" aria-live="polite" aria-label="ข้อความในแชท" data-testid="chat-log">
        {messages.length === 0 && <p className={styles.empty}>ยังไม่มีข้อความ พิมพ์ข้อความแรกด้านล่างได้เลย</p>}
        {messages.map((m) => {
          const mine = m.sender === me;
          return (
            <div key={m.id} className={`${styles.msg} ${mine ? styles.mine : styles.theirs}`} data-testid="msg" data-removed={m.removed ? "1" : undefined}>
              {kind === "group" && !mine && <span className={styles.who}>{m.sender_name ?? "สมาชิก"}</span>}
              <div className={styles.bubbleRow}>
                <div className={`${styles.bubble} ${m.removed ? styles.removed : ""}`}>{m.removed ? REMOVED_TH : m.body}</div>
                {!mine && !m.removed && (
                  <button type="button" className={styles.more} aria-label="ตัวเลือกข้อความ" aria-expanded={menuFor === m.id}
                    onClick={() => { setMenuFor(menuFor === m.id ? null : m.id); setReporting(null); setReportMsg(null); }}>
                    <EllipsisVertical aria-hidden />
                  </button>
                )}
              </div>
              <span className={styles.time}>{timeLabel(m.created_at)}</span>
              {menuFor === m.id && (
                <div className={styles.panel}>
                  {reporting === m.id ? (
                    <form action={(fd) => report(m.id, fd)} className="stack">
                      <label htmlFor={`reason-${m.id}`}>เหตุผลที่รายงาน</label>
                      <select id={`reason-${m.id}`} name="reason" className="input" defaultValue="inappropriate">
                        {REPORT_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                      <label htmlFor={`note-${m.id}`}>รายละเอียดเพิ่มเติม (ไม่บังคับ)</label>
                      <textarea id={`note-${m.id}`} name="note" className="input" maxLength={500} style={{ minHeight: 80 }} />
                      <div className="btn-row" style={{ marginTop: 0 }}>
                        <button type="submit" className="btn btn-danger">ส่งรายงาน</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setReporting(null)}>ยกเลิก</button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className="btn btn-secondary" onClick={() => setReporting(m.id)}>รายงานข้อความนี้</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.compose}>
        {reportMsg && <Notice kind={reportMsg.kind}>{reportMsg.text}</Notice>}
        {error && <Notice kind="error">{error}</Notice>}
        {pollWarn && <Notice kind="warn">เชื่อมต่ออินเทอร์เน็ตไม่ได้ชั่วคราว ข้อความใหม่อาจยังไม่แสดง ระบบจะลองใหม่เอง</Notice>}
        <form onSubmit={send} className={styles.composeRow}>
          <label htmlFor="chat-input" className={styles.sr}>พิมพ์ข้อความ</label>
          <textarea id="chat-input" name="body" className="input" rows={1} placeholder="พิมพ์ข้อความ…" value={draft}
            onChange={(e) => setDraft(e.target.value)} aria-invalid={over ? true : undefined}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }} />
          <button type="submit" className="btn btn-primary" disabled={sending} aria-busy={sending}>
            {sending ? <span className="spinner" aria-hidden style={{ width: 22, height: 22 }} /> : <Send aria-hidden />}ส่ง
          </button>
        </form>
        {draft.length > MAX_BODY - 200 && <div className={`${styles.counter} ${over ? styles.counterBad : ""}`}>{draft.length}/{MAX_BODY}{over ? " — ยาวเกินไป กรุณาตัดข้อความ" : ""}</div>}
      </div>
    </main>
  );
}
