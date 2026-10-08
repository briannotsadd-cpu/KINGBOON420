"use client";
import Link from "next/link";
import { useRef, useState, type KeyboardEvent } from "react";
import { Pencil, X } from "lucide-react";
import { MAP_H, MAP_W, countLabel, kindLabel, labelPoint, statusLabel, svgPoints, visLabel, type Pt } from "@/lib/map";

export interface ViewItem {
  key: string; code: string; name_th: string; kind: string; status: string; polygon: Pt[] | null;
  confirmed?: boolean; visibility?: string; events_today?: number | null; open_quests?: number | null;
}

const css = `
.map-svg { width: 100%; height: auto; display: block; background: var(--surface-2); border: 1px solid var(--line); border-radius: 14px; }
.map-b { cursor: pointer; outline: none; }
.map-b polygon { fill: color-mix(in srgb, var(--saffron) 38%, transparent); stroke: var(--primary); stroke-width: 5; stroke-linejoin: round; }
.map-b.closed polygon { fill: color-mix(in srgb, var(--closed) 28%, transparent); }
.map-b.pending polygon { stroke-dasharray: 18 10; }
.map-b:hover polygon { fill: color-mix(in srgb, var(--saffron) 60%, transparent); }
.map-b.sel polygon { stroke-width: 10; fill: color-mix(in srgb, var(--saffron) 70%, transparent); }
.map-b:focus-visible polygon { stroke: var(--text); stroke-width: 10; }
.map-b text { fill: var(--text); font-weight: 700; font-size: 52px; paint-order: stroke; stroke: var(--surface); stroke-width: 10px; pointer-events: none; text-anchor: middle; }
.map-item { display: block; width: 100%; text-align: left; font: inherit; color: inherit; cursor: pointer; min-height: 56px; }
.map-item[aria-pressed="true"] { border-color: var(--primary); border-width: 2px; }
`;

export function MapView({ items, manageHref, detail, emptyText }: { items: ViewItem[]; manageHref?: string; detail: boolean; emptyText: string }) {
  const [sel, setSel] = useState<string | null>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const cur = items.find((b) => b.key === sel) ?? null;
  const open = (k: string) => { setSel(k); requestAnimationFrame(() => { sheetRef.current?.focus(); sheetRef.current?.scrollIntoView?.({ block: "nearest" }); }); };
  const drawn = items.filter((b) => b.polygon);
  const keyOpen = (k: string) => (e: KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(k); } };
  const tone = (b: ViewItem) => `${b.status === "ACTIVE" ? "" : "closed"} ${b.confirmed === false ? "pending" : ""}`;

  if (items.length === 0) return <div className="card empty" data-testid="map-empty"><h3>{emptyText}</h3></div>;
  return (
    <div className="stack">
      <style>{css}</style>
      {drawn.length > 0 ? (
        <section aria-labelledby="map-h" className="stack" style={{ gap: 8 }}>
          <h2 id="map-h">แผนที่วัด</h2>
          <p className="hint" style={{ margin: 0 }}>แตะอาคารบนแผนที่ หรือเลือกจากรายการด้านล่าง เพื่อดูรายละเอียด{detail ? " เส้นประ = รอวัดยืนยัน" : ""}</p>
          <svg className="map-svg" viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="group" aria-label="แผนที่อาคารในวัด" data-testid="map-svg">
            {drawn.map((b) => (
              <g key={b.key} className={`map-b ${sel === b.key ? "sel" : ""} ${tone(b)}`} role="button" tabIndex={0} data-testid={`poly-${b.code}`}
                aria-label={`${b.name_th} ${kindLabel(b.kind)} ${statusLabel(b.status)}${b.confirmed === false ? " รอวัดยืนยัน" : ""} แตะเพื่อดูรายละเอียด`}
                aria-pressed={sel === b.key} onClick={() => open(b.key)} onKeyDown={keyOpen(b.key)}>
                <polygon points={svgPoints(b.polygon!)} />
                <text x={labelPoint(b.polygon!)[0]} y={labelPoint(b.polygon!)[1]}>{b.name_th}</text>
              </g>
            ))}
          </svg>
        </section>
      ) : (
        <div className="notice notice-info" role="status">ยังไม่มีอาคารที่วาดตำแหน่งบนแผนที่ ดูรายการอาคารด้านล่างได้เลย</div>
      )}

      {cur && (
        <section ref={sheetRef} tabIndex={-1} className="card" aria-labelledby="sheet-h" data-testid="building-sheet" style={{ outlineOffset: 4 }}>
          <div className="row" style={{ alignItems: "flex-start" }}>
            <h2 id="sheet-h" style={{ margin: 0 }}>{cur.name_th}</h2>
            <button type="button" className="btn btn-secondary" style={{ minHeight: 48, padding: "0 14px" }} onClick={() => setSel(null)} aria-label="ปิดรายละเอียดอาคาร"><X aria-hidden />ปิด</button>
          </div>
          <p style={{ margin: "8px 0 0", display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span className="badge b-unknown">{kindLabel(cur.kind)}</span>
            <span className={`badge ${cur.status === "ACTIVE" ? "b-ok" : "b-warn"}`}>{statusLabel(cur.status)}</span>
            {cur.confirmed === false && <span className="badge b-warn">รอวัดยืนยัน</span>}
          </p>
          <dl className="stack" style={{ margin: "16px 0 0", gap: 10 }}>
            <div><dt className="meta">รหัสอาคาร</dt><dd style={{ margin: 0, fontWeight: 700 }}>{cur.code}</dd></div>
            {detail && <>
              <div><dt className="meta">กิจกรรมวันนี้</dt><dd style={{ margin: 0, fontWeight: 700 }} data-testid="sheet-events">{countLabel(cur.events_today, "กิจกรรม")}</dd></div>
              <div><dt className="meta">งานอาสาที่เปิดอยู่</dt><dd style={{ margin: 0, fontWeight: 700 }} data-testid="sheet-quests">{countLabel(cur.open_quests, "งาน")}</dd></div>
              {cur.visibility && <div><dt className="meta">ใครเห็นอาคารนี้ได้</dt><dd style={{ margin: 0 }}>{visLabel(cur.visibility)}</dd></div>}
            </>}
          </dl>
          {manageHref && <Link className="btn btn-secondary" style={{ marginTop: 16 }} href={`${manageHref}?edit=${encodeURIComponent(cur.key)}`}><Pencil aria-hidden />แก้ไขอาคารนี้</Link>}
        </section>
      )}

      <section aria-labelledby="list-h">
        <h2 id="list-h">รายการอาคาร ({items.length})</h2>
        <ul className="list">
          {items.map((b) => (
            <li key={b.key}>
              <button type="button" className="card map-item" aria-pressed={sel === b.key} onClick={() => open(b.key)} data-testid={`item-${b.code}`}>
                <span className="row"><b style={{ fontSize: "1.15rem" }}>{b.name_th}</b>
                  <span className={`badge ${b.status === "ACTIVE" ? "b-ok" : "b-warn"}`}>{statusLabel(b.status)}</span></span>
                <span className="meta" style={{ display: "block" }}>{kindLabel(b.kind)} · {b.code}</span>
                <span style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
                  {b.confirmed === false && <span className="badge b-warn">รอวัดยืนยัน</span>}
                  {!b.polygon && <span className="badge b-closed">ยังไม่มีตำแหน่งบนแผนที่</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
