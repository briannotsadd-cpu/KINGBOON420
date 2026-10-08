"use client";
import { useActionState, useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Save, Undo2, Eraser } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import {
  BUILDING_KINDS, CONFIRM_TEXT, EDITABLE_STATUSES, KIND_TH, MAP_H, MAP_W, MAX_POINTS, STATUS_TH, VISIBILITIES, VIS_TH, ZONE_KINDS, ZONE_KIND_TH,
  parsePolygonText, serializePolygon, svgPoints, toMapPoint, type Pt,
} from "@/lib/map";
import { confirmBuildingAction, saveBuildingAction, saveZoneAction, type MapState } from "@/app/temple/[id]/map/actions";

const err = (s: MapState, k: string) => s.fieldErrors?.[k];
/** Re-render the server parts after a successful save while keeping this form mounted (so the success message stays visible). */
function useRefreshOnOk(s: MapState) {
  const router = useRouter();
  const last = useRef<MapState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; router.refresh(); } }, [s, router]);
}
const aria = (s: MapState, k: string) => ({ "aria-invalid": err(s, k) ? true : undefined, "aria-describedby": err(s, k) ? `${k}-err` : `${k}-hint` });

export interface EditTarget { id: string; code: string; name_th: string; kind: string; status: string; visibility: string; polygon: Pt[] | null; confirmed: boolean }

/** Canvas 1600x1000: tap to add a corner. Existing buildings are drawn faintly for orientation. */
function PolygonEditor({ pts, setPts, others, error }: { pts: Pt[]; setPts: (p: Pt[]) => void; others: Pt[][]; error?: string }) {
  const [x, setX] = useState(""), [y, setY] = useState("");
  const add = (p: Pt) => { if (pts.length < MAX_POINTS) setPts([...pts, p]); };
  const click = (e: MouseEvent<SVGSVGElement>) => { const r = e.currentTarget.getBoundingClientRect(); add(toMapPoint(e.clientX, e.clientY, r)); };
  const addTyped = () => {
    const px = Number(x), py = Number(y);
    if (x.trim() === "" || y.trim() === "" || !Number.isFinite(px) || !Number.isFinite(py)) return;
    add([Math.round(px), Math.round(py)]); setX(""); setY("");
  };
  return (
    <div className="field">
      <span className="field-label" style={{ fontWeight: 700 }} id="poly-label">ตำแหน่งบนแผนที่ <span className="hint">(ไม่บังคับ)</span></span>
      <span className="hint" id="polygon-hint">แตะบนแผนที่ทีละมุมของอาคาร อย่างน้อย 3 จุด ถ้ายังไม่ทราบตำแหน่ง ปล่อยว่างไว้ได้</span>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-labelledby="poly-label" data-testid="poly-canvas" onClick={click}
        style={{ width: "100%", height: "auto", display: "block", background: "var(--surface-2)", border: "2px solid var(--line)", borderRadius: 14, cursor: "crosshair", touchAction: "manipulation" }}>
        {Array.from({ length: 7 }, (_, i) => <line key={`v${i}`} x1={(i + 1) * 200} y1={0} x2={(i + 1) * 200} y2={MAP_H} stroke="var(--line)" strokeWidth={2} />)}
        {Array.from({ length: 4 }, (_, i) => <line key={`h${i}`} x1={0} y1={(i + 1) * 200} x2={MAP_W} y2={(i + 1) * 200} stroke="var(--line)" strokeWidth={2} />)}
        {others.map((o, i) => <polygon key={i} points={svgPoints(o)} fill="none" stroke="var(--muted)" strokeWidth={4} strokeDasharray="12 10" />)}
        {pts.length >= 3 && <polygon points={svgPoints(pts)} fill="color-mix(in srgb, var(--saffron) 45%, transparent)" stroke="var(--primary)" strokeWidth={6} />}
        {pts.length === 2 && <polyline points={svgPoints(pts)} fill="none" stroke="var(--primary)" strokeWidth={6} />}
        {pts.map(([px, py], i) => <circle key={i} cx={px} cy={py} r={16} fill="var(--primary)" stroke="var(--surface)" strokeWidth={5} />)}
      </svg>
      <p className="meta" style={{ margin: 0 }} data-testid="poly-count" aria-live="polite">วาดแล้ว {pts.length} จุด{pts.length > 0 && pts.length < 3 ? " (ต้องมีอย่างน้อย 3 จุด)" : ""}</p>
      <div className="btn-row" style={{ marginTop: 0, gap: 12 }}>
        <button type="button" className="btn btn-secondary" disabled={!pts.length} onClick={() => setPts(pts.slice(0, -1))}><Undo2 aria-hidden />ย้อนจุดล่าสุด</button>
        <button type="button" className="btn btn-secondary" disabled={!pts.length} onClick={() => setPts([])}><Eraser aria-hidden />ล้างทั้งหมด</button>
      </div>
      <details className="more">
        <summary>เพิ่มจุดด้วยตัวเลข (ถ้าแตะแผนที่ไม่สะดวก)</summary>
        <div className="stack">
          <div className="field"><label htmlFor="pt-x">ตำแหน่งซ้าย-ขวา (0-{MAP_W})</label>
            <input id="pt-x" className="input" inputMode="numeric" value={x} onChange={(e) => setX(e.target.value)} /></div>
          <div className="field"><label htmlFor="pt-y">ตำแหน่งบน-ล่าง (0-{MAP_H})</label>
            <input id="pt-y" className="input" inputMode="numeric" value={y} onChange={(e) => setY(e.target.value)} /></div>
          <button type="button" className="btn btn-secondary" onClick={addTyped}><Plus aria-hidden />เพิ่มจุดนี้</button>
        </div>
      </details>
      <input type="hidden" name="polygon" value={serializePolygon(pts)} />
      {error && <span className="field-error" id="polygon-err" role="alert">{error}</span>}
    </div>
  );
}

export function BuildingForm({ templeId, edit, others }: { templeId: string; edit?: EditTarget; others: Pt[][] }) {
  const [s, act] = useActionState(saveBuildingAction, {});
  useRefreshOnOk(s);
  const [gen, setGen] = useState(0);
  const initial = s.values?.polygon !== undefined ? (() => { const r = parsePolygonText(s.values!.polygon); return r.ok ? r.value ?? [] : []; })() : (edit?.polygon ?? []);
  const [pts, setPts] = useState<Pt[]>(initial);
  const lastCreated = useRef<MapState | null>(null);
  useEffect(() => {   // a new building was added: empty the form for the next one
    if (s.created && lastCreated.current !== s) { lastCreated.current = s; setPts([]); setGen((g) => g + 1); }
  }, [s]);
  const v = (k: string, d = "") => s.values?.[k] ?? d;
  return (
    <form action={act} className="stack" noValidate data-testid={edit ? "form-edit" : "form-add"}>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      {edit && <input type="hidden" name="building_id" value={edit.id} />}
      <div className="stack" key={gen}>
        {edit ? (
          <div className="field"><span style={{ fontWeight: 700 }}>รหัสอาคาร</span>
            <output className="input" style={{ display: "flex", alignItems: "center", background: "var(--surface-2)" }} data-testid="code-readonly">{edit.code}</output>
            <span className="hint">รหัสแก้ไขไม่ได้หลังสร้างแล้ว (เปลี่ยนได้เฉพาะชื่อ)</span></div>
        ) : (
          <Field id="code" label="รหัสอาคาร" required hint="ตัวอย่าง: MAIN.SALA.01 (ตัวพิมพ์ใหญ่ A-Z หรือตัวเลข คั่นด้วยจุด อย่างน้อย 2 ส่วน) สร้างแล้วแก้ไขไม่ได้" error={err(s, "code")}>
            <input id="code" name="code" className="input" autoCapitalize="characters" autoComplete="off" spellCheck={false} defaultValue={v("code")} {...aria(s, "code")} />
          </Field>
        )}
        <Field id="name_th" label="ชื่ออาคาร" required hint="ตัวอย่าง: ศาลาการเปรียญ" error={err(s, "name_th")}>
          <input id="name_th" name="name_th" className="input" defaultValue={v("name_th", edit?.name_th)} {...aria(s, "name_th")} />
        </Field>
        <Field id="kind" label="ประเภทอาคาร" required error={err(s, "kind")}>
          <select id="kind" name="kind" className="input" defaultValue={v("kind", edit?.kind ?? "SALA")} {...aria(s, "kind")}>
            {BUILDING_KINDS.map((k) => <option key={k} value={k}>{KIND_TH[k]}</option>)}
          </select>
        </Field>
        <Field id="status" label="สถานะ" required error={err(s, "status")}>
          <select id="status" name="status" className="input" defaultValue={v("status", edit?.status ?? "ACTIVE")} {...aria(s, "status")}>
            {EDITABLE_STATUSES.map((k) => <option key={k} value={k}>{STATUS_TH[k]}</option>)}
          </select>
        </Field>
        <Field id="visibility" label="ใครเห็นอาคารนี้ได้" required hint="เลือก “ทุกคน” จะแสดงต่อสมาชิกและแผนที่สาธารณะ หลังวัดยืนยันแล้วเท่านั้น" error={err(s, "visibility")}>
          <select id="visibility" name="visibility" className="input" defaultValue={v("visibility", edit?.visibility ?? "STAFF_ONLY")} {...aria(s, "visibility")}>
            {VISIBILITIES.map((k) => <option key={k} value={k}>{VIS_TH[k]}</option>)}
          </select>
        </Field>
        <Field id="source_note" label="หมายเหตุที่มาของตำแหน่ง" hint="ตัวอย่าง: วาดตามผังที่วัดให้มา" error={err(s, "source_note")}>
          <input id="source_note" name="source_note" className="input" defaultValue={v("source_note")} {...aria(s, "source_note")} />
        </Field>
      </div>
      <PolygonEditor pts={pts} setPts={setPts} others={others} error={err(s, "polygon")} />
      <SubmitButton pendingText="กำลังบันทึก…" block>{edit ? <><Save aria-hidden />บันทึกการแก้ไข</> : <><Plus aria-hidden />เพิ่มอาคาร</>}</SubmitButton>
    </form>
  );
}

/** One form per building: stays mounted when the building becomes confirmed so the result message is visible. */
export function ConfirmForm({ templeId, buildingId, name }: { templeId: string; buildingId: string; name: string }) {
  const [s, act] = useActionState(confirmBuildingAction, {});
  useRefreshOnOk(s);
  return (
    <form action={act} className="stack" noValidate>
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <input type="hidden" name="building_id" value={buildingId} />
      <p className="meta" style={{ margin: 0 }}>{CONFIRM_TEXT}</p>
      <SubmitButton pendingText="กำลังยืนยัน…" variant="secondary"><Check aria-hidden /><span aria-hidden>ยืนยันข้อมูลอาคารนี้</span><span className="sr-only" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}> ({name})</span></SubmitButton>
    </form>
  );
}

export function ZoneForm({ templeId, buildings }: { templeId: string; buildings: { id: string; name_th: string }[] }) {
  const [s, act] = useActionState(saveZoneAction, {});
  useRefreshOnOk(s);
  const [gen, setGen] = useState(0);
  const last = useRef<MapState | null>(null);
  useEffect(() => { if (s.created && last.current !== s) { last.current = s; setGen((g) => g + 1); } }, [s]);
  const v = (k: string) => s.values?.[k] ?? "";
  return (
    <form action={act} className="stack" noValidate data-testid="form-zone">
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="temple_id" value={templeId} />
      <div className="stack" key={gen}>
        <Field id="zone-building" label="อยู่ในอาคาร" hint="ไม่เลือก = โซนกลางแจ้งที่ไม่ได้อยู่ในอาคารใด" error={err(s, "building")}>
          <select id="zone-building" name="building" className="input" defaultValue={v("building")}>
            <option value="">— ไม่อยู่ในอาคารใด —</option>
            {buildings.map((b) => <option key={b.id} value={b.id}>{b.name_th}</option>)}
          </select>
        </Field>
        <Field id="zone-code" label="รหัสโซน" required hint="ตัวอย่าง: MAIN.COURT.01 (สร้างแล้วแก้ไขไม่ได้)" error={err(s, "code")}>
          <input id="zone-code" name="code" className="input" autoCapitalize="characters" autoComplete="off" spellCheck={false} defaultValue={v("code")} {...aria(s, "code")} />
        </Field>
        <Field id="zone-name" label="ชื่อโซน" required error={err(s, "name_th")}>
          <input id="zone-name" name="name_th" className="input" defaultValue={v("name_th")} {...aria(s, "name_th")} />
        </Field>
        <Field id="zone-kind" label="ประเภทโซน" required error={err(s, "kind")}>
          <select id="zone-kind" name="kind" className="input" defaultValue={v("kind") || "COURTYARD"}>
            {ZONE_KINDS.map((k) => <option key={k} value={k}>{ZONE_KIND_TH[k]}</option>)}
          </select>
        </Field>
      </div>
      <SubmitButton pendingText="กำลังบันทึก…" variant="secondary"><Plus aria-hidden />เพิ่มโซน</SubmitButton>
    </form>
  );
}
