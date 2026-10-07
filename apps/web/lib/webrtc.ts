// Pure helpers for in-app calls (signalling validation, status text, durations). No browser or server imports.
export const ICE_SERVERS: { urls: string }[] = [{ urls: "stun:stun.l.google.com:19302" }]; // STUN only: no TURN relay in v1
export const MAX_SIGNAL_BYTES = 16384;
export const SIGNAL_KINDS = ["offer", "answer", "ice"] as const;
export type SignalKind = (typeof SIGNAL_KINDS)[number];
export type CallMedia = "voice" | "video";
export type DbCallStatus = "ringing" | "active" | "ended" | "declined" | "missed" | "failed";

const byteLength = (s: string) => new TextEncoder().encode(s).length;

/** Validates a signalling payload before it is relayed (shape per kind, <= 16 KB serialised). */
export function validateSignal(kind: unknown, payload: unknown):
  { ok: true; kind: SignalKind; payload: Record<string, unknown> } | { ok: false; error: string } {
  if (typeof kind !== "string" || !(SIGNAL_KINDS as readonly string[]).includes(kind)) return { ok: false, error: "bad kind" };
  if (payload === null || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, error: "payload must be an object" };
  const p = payload as Record<string, unknown>;
  let json: string;
  try { json = JSON.stringify(p); } catch { return { ok: false, error: "payload not serialisable" }; }
  if (byteLength(json) > MAX_SIGNAL_BYTES) return { ok: false, error: "payload too large" };
  if (kind === "offer" || kind === "answer") {
    if (p.type !== kind || typeof p.sdp !== "string" || p.sdp.length === 0) return { ok: false, error: `${kind} needs {type:"${kind}", sdp}` };
  } else if (typeof p.candidate !== "string") return { ok: false, error: "ice needs {candidate}" };
  return { ok: true, kind: kind as SignalKind, payload: p };
}

export type CallPhase = "idle" | "calling" | "incoming" | "connecting" | "connected" | "ended" | "declined" | "missed" | "failed";

/** Thai status line for the call screen. `failed` always carries the honest "network may not support direct calls" text. */
export const PHASE_TH: Record<CallPhase, string> = {
  idle: "พร้อมโทร",
  calling: "กำลังโทร…",
  incoming: "มีสายเรียกเข้า",
  connecting: "กำลังเชื่อมต่อ",
  connected: "คุยอยู่",
  ended: "วางสายแล้ว",
  declined: "ปฏิเสธสาย",
  missed: "ไม่มีผู้รับสาย",
  failed: "เชื่อมต่อไม่สำเร็จ — เครือข่ายนี้อาจไม่รองรับการโทรตรง",
};

/** mm:ss (or h:mm:ss from one hour). Negative / NaN => 00:00. */
export function formatDuration(totalSec: number): string {
  const s = Number.isFinite(totalSec) && totalSec > 0 ? Math.floor(totalSec) : 0;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

export function statusText(phase: CallPhase, elapsedSec = 0): string {
  return phase === "connected" ? `${PHASE_TH.connected} ${formatDuration(elapsedSec)}` : PHASE_TH[phase];
}

export const isTerminal = (p: CallPhase) => p === "ended" || p === "declined" || p === "missed" || p === "failed";

/** DB call status => UI phase. While the DB says ringing/active we keep the richer local phase when it already fits. */
export function phaseFromDbStatus(status: DbCallStatus, current: CallPhase): CallPhase {
  switch (status) {
    case "ringing": return current === "incoming" ? "incoming" : "calling";
    case "active": return current === "connected" ? "connected" : "connecting";
    case "declined": return "declined";
    case "missed": return "missed";
    case "failed": return "failed";
    case "ended": return "ended";
  }
}

/** RTCPeerConnection state => phase while the DB says the call is active (null = no change). */
export function phaseFromPc(connectionState: string, iceState: string): CallPhase | null {
  if (connectionState === "connected") return "connected";
  if (connectionState === "failed" || iceState === "failed") return "failed";
  if (connectionState === "new" || connectionState === "connecting") return "connecting";
  return null; // "disconnected" is often transient: wait for it to recover or fail
}

/** Thai error for getUserMedia failures. */
export function mediaErrorTh(name: string | undefined, video: boolean): string {
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError")
    return `ไม่ได้รับอนุญาตให้ใช้${video ? "กล้องและ" : ""}ไมโครโฟน กรุณากดอนุญาตในเบราว์เซอร์ (ไอคอนแม่กุญแจข้างที่อยู่เว็บ) แล้วกดโทรอีกครั้ง`;
  if (name === "NotFoundError" || name === "OverconstrainedError" || name === "DevicesNotFoundError")
    return `ไม่พบ${video ? "กล้องหรือ" : ""}ไมโครโฟนในเครื่องนี้ กรุณาเสียบอุปกรณ์แล้วลองใหม่`;
  if (name === "NotReadableError" || name === "AbortError")
    return "อุปกรณ์ถูกใช้งานโดยแอปอื่นอยู่ กรุณาปิดแอปนั้นแล้วลองใหม่";
  return "เปิดไมโครโฟนไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

const START_CALL_ERRORS: Record<string, string> = {
  "42501": "คนนี้ไม่รับสายในตอนนี้",
  "55006": "อีกฝ่ายกำลังติดสายอยู่",
  "54000": "ส่งบ่อยเกินไป รอสักครู่แล้วลองใหม่",
};
export const startCallErrorTh = (code: string | undefined) =>
  START_CALL_ERRORS[code ?? ""] ?? "โทรไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";

/** app.call_state returns one row per pending signal (or one row with null signal): fold into status + ordered signals. */
export interface CallStateRow { status: DbCallStatus; media: CallMedia; caller: string; callee: string; other_name: string | null;
  signal_id: string | number | null; signal_kind: SignalKind | null; payload: Record<string, unknown> | null }
export interface CallSnapshot { status: DbCallStatus; media: CallMedia; caller: string; callee: string; otherName: string | null;
  signals: { id: number; kind: SignalKind; payload: Record<string, unknown> }[] }
export function splitCallRows(rows: CallStateRow[]): CallSnapshot | null {
  if (rows.length === 0) return null;
  const r = rows[0];
  const signals = rows.filter((x) => x.signal_id !== null && x.signal_kind && x.payload)
    .map((x) => ({ id: Number(x.signal_id), kind: x.signal_kind!, payload: x.payload! })).sort((a, b) => a.id - b.id);
  return { status: r.status, media: r.media, caller: r.caller, callee: r.callee, otherName: r.other_name, signals };
}
