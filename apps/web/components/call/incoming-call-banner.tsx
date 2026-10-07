"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone, PhoneOff, Video } from "lucide-react";
import type { CallMedia } from "@/lib/webrtc";
import styles from "./call.module.css";

interface Incoming { id: string; media: CallMedia; caller: string; caller_name: string }
const POLL_MS = 3000;
const SIGNED_OUT_POLL_MS = 15000;

/** Mount once in the root layout. Polls GET /api/calls/incoming every 3 s and offers รับสาย / ปฏิเสธ. */
export function IncomingCallBanner() {
  const pathname = usePathname();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onCallPage = pathname?.startsWith("/call/") ?? false;

  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      let next = POLL_MS;
      try {
        const res = await fetch("/api/calls/incoming", { cache: "no-store" });
        if (res.status === 401) { next = SIGNED_OUT_POLL_MS; if (!stop) setIncoming(null); }
        else if (res.ok) {
          const { incoming: row } = (await res.json()) as { incoming: Incoming | null };
          if (!stop) setIncoming((cur) => (cur?.id === row?.id ? cur : row));
        }
      } catch { /* offline: keep the last state and try again */ }
      if (!stop) timer = setTimeout(tick, next);
    };
    void tick();
    return () => { stop = true; clearTimeout(timer); };
  }, []);

  if (!incoming || onCallPage) return null;

  async function decline() {
    if (!incoming) return;
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/calls/${incoming.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "decline" }) });
      if (res.ok || res.status === 404) setIncoming(null); // 404: already ended or answered elsewhere
      else setError("ปฏิเสธสายไม่สำเร็จ กรุณากดอีกครั้ง");
    } catch { setError("ปฏิเสธสายไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดอีกครั้ง"); }
    setBusy(false);
  }

  return (
    <div className={styles.banner} role="alert" aria-live="assertive" data-testid="incoming-call">
      <p className={styles.bannerTitle}>
        {incoming.media === "video" ? <Video size={22} aria-hidden style={{ verticalAlign: "-4px", marginRight: 8 }} /> : <Phone size={22} aria-hidden style={{ verticalAlign: "-4px", marginRight: 8 }} />}
        {incoming.caller_name} โทรมา ({incoming.media === "video" ? "วิดีโอคอล" : "สายเสียง"})
      </p>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className={styles.bannerBtns}>
        <Link href={`/call/${incoming.id}?accept=1`} className={`${styles.bannerBtn} ${styles.accept}`} data-testid="incoming-accept"><Phone aria-hidden />รับสาย</Link>
        <button type="button" className={`${styles.bannerBtn} ${styles.decline}`} onClick={decline} disabled={busy} data-testid="incoming-decline"><PhoneOff aria-hidden />ปฏิเสธ</button>
      </div>
    </div>
  );
}
