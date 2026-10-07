"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, CameraOff, Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import { Notice } from "@/components/ui";
import { initials } from "@/lib/chat";
import { isTerminal, statusText, type CallMedia } from "@/lib/webrtc";
import { CallSession, type SessionState } from "./call-session";
import styles from "./call.module.css";

interface Props { callId: string; conversationId: string; role: "caller" | "callee"; media: CallMedia; otherName: string; autostart: boolean }

export function CallScreen({ callId, conversationId, role, media, otherName, autostart }: Props) {
  const sessionRef = useRef<CallSession | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [st, setSt] = useState<SessionState>({ phase: role === "caller" ? "calling" : "incoming", pcState: "none", error: null, connectedAt: null });
  const [hasMedia, setHasMedia] = useState(false);
  const [remoteHasVideo, setRemoteHasVideo] = useState(false);
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(media === "video");
  const [speaker, setSpeaker] = useState(true);
  const [busy, setBusy] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [needsTap, setNeedsTap] = useState(false);
  const [sinks, setSinks] = useState<MediaDeviceInfo[]>([]);
  const video = media === "video";
  const ended = isTerminal(st.phase);

  useEffect(() => {
    const s = new CallSession({
      callId, role, media,
      onUpdate: setSt,
      onLocalStream: (stream) => { setHasMedia(true); if (localVideoRef.current) localVideoRef.current.srcObject = stream; },
      onRemoteStream: (stream) => {
        if (audioRef.current) {
          if (audioRef.current.srcObject !== stream) audioRef.current.srcObject = stream;
          // AbortError just means a newer track interrupted this play(); only a policy block needs the manual tap
          void audioRef.current.play().catch((e: { name?: string }) => { if (e?.name === "NotAllowedError") setNeedsTap(true); });
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        setRemoteHasVideo(stream.getVideoTracks().length > 0);
        stream.onaddtrack = () => setRemoteHasVideo(stream.getVideoTracks().length > 0);
      },
    });
    sessionRef.current = s;
    s.startPolling();
    if (autostart) void (role === "caller" ? s.startAsCaller() : s.accept());
    const onHide = () => s.endOnPageHide();
    window.addEventListener("pagehide", onHide);
    return () => { window.removeEventListener("pagehide", onHide); s.dispose(); };
  }, [callId, role, media, autostart]);

  useEffect(() => {
    if (st.phase !== "connected" || !st.connectedAt) return;
    const t0 = st.connectedAt;
    const t = setInterval(() => setElapsed((Date.now() - t0) / 1000), 500);
    return () => clearInterval(t);
  }, [st.phase, st.connectedAt]);

  // output device choice, only where the browser supports setSinkId and there is more than one speaker
  useEffect(() => {
    if (st.phase !== "connected" || typeof HTMLMediaElement === "undefined" || !("setSinkId" in HTMLMediaElement.prototype)) return;
    navigator.mediaDevices?.enumerateDevices().then((d) => setSinks(d.filter((x) => x.kind === "audiooutput"))).catch(() => {});
  }, [st.phase]);

  const toggleMic = () => { const n = !mic; setMic(n); sessionRef.current?.setMic(n); };
  const toggleCam = () => { const n = !cam; setCam(n); sessionRef.current?.setCamera(n); };
  const toggleSpeaker = () => { const n = !speaker; setSpeaker(n); if (audioRef.current) audioRef.current.muted = !n; };
  const act = useCallback(async (fn: () => Promise<unknown>) => { setBusy(true); try { await fn(); } finally { setBusy(false); } }, []);

  const ringing = st.phase === "calling" || st.phase === "incoming";
  const incomingPrompt = role === "callee" && st.phase === "incoming" && !hasMedia;
  const callerNeedsJoin = role === "caller" && st.phase === "calling" && !hasMedia && !autostart && !st.error;
  const text = statusText(st.phase, elapsed);

  return (
    <main className={styles.screen} data-testid="call-screen" data-state={st.pcState} data-phase={st.phase} data-role={role} data-media={media}>
      <div className={`${styles.stage} ${ringing ? styles.ringing : ""}`}>
        <video ref={remoteVideoRef} className={video && remoteHasVideo && !ended ? styles.remoteVideo : styles.hidden} autoPlay playsInline muted
          aria-label={`วิดีโอของ ${otherName}`} data-testid="remote-video" />
        {!(video && remoteHasVideo && !ended) && <div className={styles.avatar} aria-hidden data-testid="call-avatar">{initials(otherName)}</div>}
        <video ref={localVideoRef} className={video && hasMedia && !ended ? styles.localVideo : styles.hidden} autoPlay playsInline muted
          aria-label="ภาพของคุณ" data-testid="local-video" />
        <audio ref={audioRef} autoPlay data-testid="remote-audio" />
        <h1 className={styles.name} data-testid="call-name">{otherName}</h1>
        <p className={`${styles.status} ${st.phase === "failed" ? styles.statusFailed : ""}`} role="status" aria-live="polite" data-testid="call-status">{text}</p>
        {st.error && <Notice kind="error">{st.error}</Notice>}
        {needsTap && !ended && (
          <button type="button" className="btn btn-primary" onClick={() => { void audioRef.current?.play(); setNeedsTap(false); }}>แตะเพื่อเปิดเสียง</button>
        )}
      </div>

      <div style={{ width: "100%", display: "grid", gap: 14 }}>
        {ended ? (
          <Link className="btn btn-primary btn-block" href={`/chat/${conversationId}`} style={{ minHeight: 64 }}>กลับไปที่แชท</Link>
        ) : incomingPrompt ? (
          <>
            <p className={styles.note}>{video ? "สายวิดีโอคอล: เบราว์เซอร์จะขออนุญาตใช้กล้องและไมค์หลังจากกดรับสาย" : "สายเสียง: เบราว์เซอร์จะขออนุญาตใช้ไมค์หลังจากกดรับสาย"}</p>
            <div className={styles.bigRow}>
              <button type="button" className={`${styles.ctl} ${styles.answer}`} disabled={busy} onClick={() => act(() => sessionRef.current!.accept())}><Phone aria-hidden />รับสาย</button>
              <button type="button" className={`${styles.ctl} ${styles.hang}`} disabled={busy} onClick={() => act(() => sessionRef.current!.decline())}><PhoneOff aria-hidden />ปฏิเสธ</button>
            </div>
          </>
        ) : (
          <>
            {callerNeedsJoin && (
              <button type="button" className="btn btn-primary btn-block" style={{ minHeight: 64 }} disabled={busy}
                onClick={() => act(() => sessionRef.current!.startAsCaller())}>เปิดไมค์{video ? "และกล้อง" : ""}แล้วเชื่อมต่อสาย</button>
            )}
            <div className={styles.controls}>
              <button type="button" className={styles.ctl} aria-pressed={mic} onClick={toggleMic} disabled={!hasMedia} data-testid="btn-mic">
                {mic ? <Mic aria-hidden /> : <MicOff aria-hidden />}{mic ? "ไมค์ เปิด" : "ไมค์ ปิด"}</button>
              <button type="button" className={styles.ctl} aria-pressed={speaker} onClick={toggleSpeaker} data-testid="btn-speaker">
                {speaker ? <Volume2 aria-hidden /> : <VolumeX aria-hidden />}{speaker ? "ลำโพง เปิด" : "ลำโพง ปิด"}</button>
              <button type="button" className={styles.ctl} aria-pressed={video ? cam : false} onClick={toggleCam} disabled={!video || !hasMedia} data-testid="btn-camera"
                aria-describedby={video ? undefined : "cam-note"}>
                {video && cam ? <Camera aria-hidden /> : <CameraOff aria-hidden />}{video && cam ? "กล้อง เปิด" : "กล้อง ปิด"}</button>
              <button type="button" className={`${styles.ctl} ${styles.hang}`} onClick={() => act(() => sessionRef.current!.hangUp())} disabled={busy} data-testid="btn-hangup">
                <PhoneOff aria-hidden />วางสาย</button>
            </div>
            {!video && <p className={styles.note} id="cam-note">การโทรด้วยเสียงเปิดกล้องกลางสายไม่ได้ ถ้าต้องการใช้กล้อง ให้วางสายแล้วกด &quot;วิดีโอคอล&quot; ในแชท</p>}
            {sinks.length > 1 && (
              <div className="field">
                <label htmlFor="sink">ช่องเสียงออก</label>
                <select id="sink" className={`input ${styles.sink}`} onChange={(e) => { void (audioRef.current as unknown as { setSinkId(id: string): Promise<void> }).setSinkId(e.target.value).catch(() => {}); }}>
                  {sinks.map((d, i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `ลำโพง ${i + 1}`}</option>)}
                </select>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
