// Browser-only WebRTC session for one 1:1 call. Media is peer-to-peer and NEVER recorded; only SDP/ICE go through the server.
// STUN only (no TURN): some networks (symmetric NAT, strict firewalls) cannot connect. We say so honestly and mark the call failed.
import {
  ICE_SERVERS, isTerminal, mediaErrorTh, phaseFromDbStatus, phaseFromPc, type CallMedia, type CallPhase, type CallSnapshot, type SignalKind,
} from "@/lib/webrtc";

export interface SessionState { phase: CallPhase; pcState: string; error: string | null; connectedAt: number | null }
export interface SessionOpts {
  callId: string; role: "caller" | "callee"; media: CallMedia;
  onUpdate: (s: SessionState) => void;
  onRemoteStream: (s: MediaStream) => void;
  onLocalStream: (s: MediaStream) => void;
}

const CONNECT_TIMEOUT_MS = 25_000; // active in the DB but no media connection by then => honest failure
const DISCONNECT_GRACE_MS = 10_000;

type Sig = { id: number; kind: SignalKind; payload: Record<string, unknown> };

export class CallSession {
  private pc: RTCPeerConnection | null = null;
  private local: MediaStream | null = null;
  private remote = new MediaStream();
  private lastSignal = 0;
  private chain: Promise<void> = Promise.resolve();
  private sendChain: Promise<void> = Promise.resolve();
  private iceBuf: RTCIceCandidateInit[] = [];
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeSince: number | null = null;
  private disconnectedSince: number | null = null;
  private resolvePc!: () => void;
  private pcReady = new Promise<void>((r) => { this.resolvePc = r; });
  private starting = false;
  state: SessionState;

  constructor(private o: SessionOpts) {
    this.state = { phase: o.role === "caller" ? "calling" : "incoming", pcState: "none", error: null, connectedAt: null };
  }

  private set(p: Partial<SessionState>) { this.state = { ...this.state, ...p }; this.o.onUpdate(this.state); }
  private api = (path: string, init?: RequestInit) => fetch(`/api/calls/${this.o.callId}${path}`, { cache: "no-store", ...init });
  private post = (path: string, body: unknown, keepalive = false) =>
    this.api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive });

  // ---- polling (every 1 s) ----------------------------------------------------------------------------------------
  startPolling() {
    const tick = async () => {
      if (this.stopped) return;
      try { await this.pollOnce(); } catch { /* transient network error: try again next tick */ }
      if (!this.stopped) this.timer = setTimeout(tick, 1000);
    };
    void tick();
  }

  private async pollOnce() {
    const res = await this.api(`?after=${this.lastSignal}`);
    if (res.status === 401 || res.status === 403) { this.finish("failed", "ไม่พบสายนี้ หรือคุณหมดเวลาการเข้าสู่ระบบ กรุณากลับไปที่แชทแล้วลองใหม่"); return; }
    if (!res.ok) return;
    const { call } = (await res.json()) as { me: string; call: CallSnapshot };
    for (const s of call.signals) { this.lastSignal = Math.max(this.lastSignal, s.id); this.enqueue(s); }
    const next = phaseFromDbStatus(call.status, this.state.phase);
    if (isTerminal(next)) { this.finish(next); return; }
    if (call.status === "active") {
      this.activeSince ??= Date.now();
      if (this.pc && this.state.phase !== "connected" && Date.now() - this.activeSince > CONNECT_TIMEOUT_MS) { await this.fail(); return; }
    }
    if (this.disconnectedSince && Date.now() - this.disconnectedSince > DISCONNECT_GRACE_MS) { await this.fail(); return; }
    if (next !== this.state.phase) this.set({ phase: next });
  }

  // ---- signalling ---------------------------------------------------------------------------------------------------
  private sendSignal(kind: SignalKind, payload: unknown) {
    this.sendChain = this.sendChain.then(async () => {
      if (this.stopped) return;
      try { await this.post("/signal", { kind, payload }); } catch { /* the poll loop notices a dead call */ }
    });
    return this.sendChain;
  }

  private enqueue(s: Sig) {
    this.chain = this.chain.then(async () => {
      await this.pcReady;
      if (this.stopped || !this.pc) return;
      try { await this.apply(s); } catch (e) { console.warn("[call] signal failed", s.kind, e); }
    });
  }

  private async apply(s: Sig) {
    const pc = this.pc!;
    if (s.kind === "offer" && this.o.role === "callee") {
      await pc.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
      await this.flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await this.sendSignal("answer", { type: answer.type, sdp: answer.sdp });
    } else if (s.kind === "answer" && this.o.role === "caller") {
      await pc.setRemoteDescription(s.payload as unknown as RTCSessionDescriptionInit);
      await this.flushIce();
    } else if (s.kind === "ice") {
      const cand = s.payload as unknown as RTCIceCandidateInit;
      if (pc.remoteDescription) await pc.addIceCandidate(cand).catch(() => {});
      else this.iceBuf.push(cand);
    }
  }

  private async flushIce() {
    const buf = this.iceBuf; this.iceBuf = [];
    for (const c of buf) await this.pc!.addIceCandidate(c).catch(() => {});
  }

  // ---- media + peer connection -------------------------------------------------------------------------------------
  private async getMedia(): Promise<boolean> {
    const video = this.o.media === "video";
    if (!navigator.mediaDevices?.getUserMedia) {
      this.set({ error: "เบราว์เซอร์นี้ไม่รองรับการโทร หรือหน้านี้ไม่ได้เปิดผ่าน https กรุณาใช้เบราว์เซอร์รุ่นใหม่" });
      return false;
    }
    try {
      this.local = await navigator.mediaDevices.getUserMedia({ audio: true, video: video ? { facingMode: "user" } : false });
      this.o.onLocalStream(this.local);
      return true;
    } catch (e) {
      this.set({ error: mediaErrorTh((e as { name?: string }).name, video) });
      return false;
    }
  }

  private buildPc() {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;
    this.local!.getTracks().forEach((t) => pc.addTrack(t, this.local!));
    pc.ontrack = (e) => {
      if (!this.remote.getTracks().includes(e.track)) this.remote.addTrack(e.track);
      this.o.onRemoteStream(this.remote);
    };
    pc.onicecandidate = (e) => { if (e.candidate) void this.sendSignal("ice", e.candidate.toJSON()); };
    const onState = () => {
      this.disconnectedSince = pc.connectionState === "disconnected" ? (this.disconnectedSince ?? Date.now()) : null;
      const p = phaseFromPc(pc.connectionState, pc.iceConnectionState);
      const patch: Partial<SessionState> = { pcState: pc.connectionState };
      if (this.stopped) return;
      if (p === "connected" && !isTerminal(this.state.phase)) { patch.phase = "connected"; patch.connectedAt = this.state.connectedAt ?? Date.now(); }
      this.set(patch);
      if (p === "failed") void this.fail();
    };
    pc.onconnectionstatechange = onState;
    pc.oniceconnectionstatechange = onState;
    this.resolvePc();
    return pc;
  }

  /** Caller: user pressed "โทร" in the chat. Gets the microphone/camera, then sends the offer. Returns false on a media error. */
  async startAsCaller(): Promise<boolean> {
    if (this.starting || this.pc) return true;
    this.starting = true; this.set({ error: null });
    if (!(await this.getMedia())) { this.starting = false; await this.hangUp(); return false; } // nothing to ring for without a microphone
    if (this.stopped) { this.stopTracks(); return false; } // unmounted while the permission prompt was open
    const pc = this.buildPc();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await this.sendSignal("offer", { type: offer.type, sdp: offer.sdp });
    return true;
  }

  /** Callee: user pressed "รับสาย". Media first (so a permission error leaves the call ringing), then accept. */
  async accept(): Promise<boolean> {
    if (this.starting || this.pc) return true;
    this.starting = true; this.set({ error: null });
    if (!(await this.getMedia())) { this.starting = false; return false; }
    if (this.stopped) { this.stopTracks(); return false; }
    const res = await this.post("", { action: "answer" }).catch(() => null);
    if (!res || !res.ok) {
      this.stopTracks(); this.starting = false;
      this.set({ error: res?.status === 404 ? "สายนี้สิ้นสุดแล้ว (ผู้โทรวางสายหรือหมดเวลา)" : "รับสายไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดรับสายอีกครั้ง" });
      return false;
    }
    this.buildPc();
    this.set({ phase: "connecting" });
    return true;
  }

  async decline() { await this.post("", { action: "decline" }).catch(() => {}); this.finish("declined"); }
  async hangUp() { await this.post("", { action: "end" }).catch(() => {}); this.finish("ended"); }
  /** Honest failure: tell the server so the other side sees it too. */
  private async fail() {
    if (this.stopped) return;
    await this.post("", { action: "end", failed: true }).catch(() => {});
    this.finish("failed");
  }

  /** Best-effort end when the tab is closed. */
  endOnPageHide() { if (!this.stopped && this.state.phase !== "incoming") void this.post("", { action: "end" }, true).catch(() => {}); }

  setMic(on: boolean) { this.local?.getAudioTracks().forEach((t) => { t.enabled = on; }); }
  setCamera(on: boolean) { this.local?.getVideoTracks().forEach((t) => { t.enabled = on; }); }
  hasVideoTrack() { return (this.local?.getVideoTracks().length ?? 0) > 0; }

  private stopTracks() { this.local?.getTracks().forEach((t) => t.stop()); this.remote.getTracks().forEach((t) => t.stop()); }

  private finish(phase: CallPhase, error?: string) {
    if (this.stopped) return;
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.stopTracks();
    try { this.pc?.close(); } catch { /* already closed */ }
    this.resolvePc();
    this.set({ phase, pcState: this.pc ? "closed" : this.state.pcState, ...(error ? { error } : {}) });
  }

  /** Component unmount: release the camera/microphone. Never records anything. */
  dispose() {
    this.stopped = true;
    if (this.timer) clearTimeout(this.timer);
    this.stopTracks();
    try { this.pc?.close(); } catch { /* already closed */ }
    this.resolvePc();
  }
}
