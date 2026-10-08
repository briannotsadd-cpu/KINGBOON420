// Pure presentation rules for the parking card (docs/domain/facility/PARKING_SPEC.md). No I/O.
export type ParkingStatus = "AVAILABLE" | "FILLING" | "FULL" | "CLOSED" | "UNKNOWN";
export type Declared = "unknown" | "none" | "lots";

export interface ParkingRow {
  temple_name_th: string;
  parking_declared: Declared;
  lot_code: string | null;
  lot_name_th: string | null;
  capacity: number | null;
  accessible_spaces: number | null;
  vehicle_types: string[] | null;
  fee_note_th: string | null;
  hours_note_th: string | null;
  status: ParkingStatus | null;
  free_spaces: number | null;
  reported_at: string | Date | null;
}

export interface LotView {
  code: string;
  name: string;
  tone: "ok" | "warn" | "bad" | "closed" | "unknown";
  label: string;
  freeText: string | null;
  updatedText: string | null;
  reportState: "reported" | "stale" | "missing";
  capacity: number | null;
  freeSpaces: number | null;
  occupiedPercent: number | null;
  details: { kind: "vehicles" | "count" | "access" | "fee" | "hours"; text: string }[];
}

export type ParkingView =
  | { kind: "not_found" }
  | { kind: "none"; templeName: string }
  | { kind: "no_info"; templeName: string }
  | { kind: "lots"; templeName: string; lots: LotView[] };

const STATUS: Record<ParkingStatus, { tone: LotView["tone"]; label: string }> = {
  AVAILABLE: { tone: "ok", label: "มีที่ว่าง" },
  FILLING: { tone: "warn", label: "ใกล้เต็ม" },
  FULL: { tone: "bad", label: "เต็ม" },
  CLOSED: { tone: "closed", label: "ปิด" },
  UNKNOWN: { tone: "unknown", label: "ไม่ทราบสถานะตอนนี้" },
};

const VEHICLE: Record<string, string> = { car: "รถยนต์", motorcycle: "มอเตอร์ไซค์", van: "รถตู้", bus: "รถบัส" };

export function formatTime(at: string | Date): string {
  const date = new Date(at);
  if (!Number.isFinite(date.getTime())) return "ไม่ทราบเวลา";
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(date);
}

const count = (value: number | null) => value !== null && Number.isSafeInteger(value) && value >= 0 ? value : null;

export function presentParking(rows: ParkingRow[]): ParkingView {
  if (rows.length === 0) return { kind: "not_found" };
  const templeName = rows[0].temple_name_th;
  const lots = rows.filter((r) => r.lot_code !== null);
  if (lots.length === 0) {
    return rows[0].parking_declared === "none" ? { kind: "none", templeName } : { kind: "no_info", templeName };
  }
  return {
    kind: "lots",
    templeName,
    lots: lots.map((r) => {
      // The database applies each lot's freshness threshold. Do not guess one in the UI.
      const validReport = r.reported_at !== null && Number.isFinite(new Date(r.reported_at).getTime());
      const status: ParkingStatus = validReport ? r.status ?? "UNKNOWN" : "UNKNOWN";
      const s = STATUS[status];
      const capacity = count(r.capacity);
      const reportedFree = count(r.free_spaces);
      const freeSpaces = status !== "UNKNOWN" && status !== "CLOSED" && reportedFree !== null
        && (capacity === null || reportedFree <= capacity) && (status !== "FULL" || reportedFree === 0) ? reportedFree : null;
      const details: LotView["details"] = [];
      if (r.vehicle_types?.length) details.push({ kind: "vehicles", text: r.vehicle_types.map((v) => VEHICLE[v] ?? v).join(" · ") });
      details.push({ kind: "count", text: capacity !== null ? `ทั้งหมด ${capacity} คัน` : "จำนวนช่องจอด: ไม่ทราบ" });
      const accessible = count(r.accessible_spaces);
      if (accessible !== null) details.push({ kind: "access", text: `ช่องจอดผู้พิการ ${accessible} ช่อง` });
      if (r.fee_note_th) details.push({ kind: "fee", text: `ค่าจอด: ${r.fee_note_th}` });
      if (r.hours_note_th) details.push({ kind: "hours", text: `เวลา: ${r.hours_note_th}` });
      return {
        code: r.lot_code!,
        name: r.lot_name_th ?? r.lot_code!,
        tone: s.tone,
        label: s.label,
        // a number is shown only when a fresh report counted it — never estimated
        freeText: freeSpaces !== null ? `ว่างประมาณ ${freeSpaces} คัน` : null,
        updatedText: validReport ? `อัปเดตล่าสุด ${formatTime(r.reported_at!)} น.` : "ยังไม่มีการรายงานสถานะ",
        reportState: !validReport ? "missing" : status === "UNKNOWN" ? "stale" : "reported",
        capacity,
        freeSpaces,
        occupiedPercent: capacity !== null && capacity > 0 && freeSpaces !== null ? Math.round((capacity - freeSpaces) / capacity * 100) : null,
        details,
      };
    }),
  };
}

export interface SavedParking {
  version: 1;
  lotCode: string;
  lotName: string;
  note: string;
  savedAt: string;
  position: { lat: number; lng: number; accuracy: number } | null;
}

/** Local device data is untrusted. A corrupt record must never crash the parking page. */
export function readSavedParking(raw: string | null): SavedParking | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const v = value as Record<string, unknown>;
    if (v.version !== 1 || typeof v.lotCode !== "string" || !v.lotCode || v.lotCode.length > 128
      || typeof v.lotName !== "string" || !v.lotName || v.lotName.length > 500
      || typeof v.note !== "string" || v.note.length > 280
      || typeof v.savedAt !== "string" || !Number.isFinite(Date.parse(v.savedAt))) return null;
    if (v.position !== null) {
      if (!v.position || typeof v.position !== "object") return null;
      const p = v.position as Record<string, unknown>;
      if (typeof p.lat !== "number" || !Number.isFinite(p.lat) || Math.abs(p.lat) > 90
        || typeof p.lng !== "number" || !Number.isFinite(p.lng) || Math.abs(p.lng) > 180
        || typeof p.accuracy !== "number" || !Number.isFinite(p.accuracy) || p.accuracy < 0) return null;
    }
    return v as unknown as SavedParking;
  } catch { return null; }
}
