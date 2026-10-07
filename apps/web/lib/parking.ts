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
  return new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Bangkok" }).format(new Date(at));
}

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
      const status: ParkingStatus = r.status ?? "UNKNOWN";
      const s = STATUS[status];
      const details: LotView["details"] = [];
      if (r.vehicle_types?.length) details.push({ kind: "vehicles", text: r.vehicle_types.map((v) => VEHICLE[v] ?? v).join(" · ") });
      details.push({ kind: "count", text: r.capacity != null ? `ทั้งหมด ${r.capacity} คัน` : "จำนวนช่องจอด: ไม่ทราบ" });
      if (r.accessible_spaces) details.push({ kind: "access", text: `ช่องจอดผู้พิการ ${r.accessible_spaces} ช่อง` });
      if (r.fee_note_th) details.push({ kind: "fee", text: `ค่าจอด: ${r.fee_note_th}` });
      if (r.hours_note_th) details.push({ kind: "hours", text: `เวลา: ${r.hours_note_th}` });
      return {
        code: r.lot_code!,
        name: r.lot_name_th ?? r.lot_code!,
        tone: s.tone,
        label: s.label,
        // a number is shown only when a fresh report counted it — never estimated
        freeText: status !== "UNKNOWN" && r.free_spaces != null ? `ว่างประมาณ ${r.free_spaces} คัน` : null,
        updatedText: r.reported_at ? `อัปเดตล่าสุด ${formatTime(r.reported_at)} น.` : "ยังไม่มีการรายงานสถานะ",
        details,
      };
    }),
  };
}
