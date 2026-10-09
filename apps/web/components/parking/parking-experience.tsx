"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Car, LocateFixed, Map, Navigation, RefreshCw, Save, Trash2 } from "lucide-react";
import { formatTime, readSavedParking, type ParkingView, type SavedParking } from "@/lib/parking";
import { ParkingEmpty, ParkingLot, ParkingStatus } from "./parking-overview";
import s from "./parking.module.css";

export function ParkingExperience({ view, slug }: { view: ParkingView; slug: string }) {
  const lots = view.kind === "lots" ? view.lots : [];
  const [selected, setSelected] = useState(lots[0]?.code ?? "");
  const [saved, setSaved] = useState<SavedParking | null>(null);
  const [note, setNote] = useState("");
  const [position, setPosition] = useState<SavedParking["position"]>(null);
  const [locating, setLocating] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const noteId = useId();
  const noteInput = useRef<HTMLInputElement>(null);
  const locationRequest = useRef(0);
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();
  const storageKey = `boon:parking:${slug}`;
  const lot = lots.find((item) => item.code === selected);
  const selectedExists = Boolean(lot);
  const firstLotCode = lots[0]?.code ?? "";

  useEffect(() => {
    setReady(false); setSaved(null); setLocating(false);
    setSelected(lots[0]?.code ?? ""); setNote(""); setPosition(null); setMessage(""); setError("");
    try { setSaved(readSavedParking(localStorage.getItem(storageKey))); }
    catch { setError("อุปกรณ์นี้ไม่อนุญาตให้บันทึกข้อมูล คุณยังดูข้อมูลลานจอดได้"); }
    setReady(true);
    return () => { locationRequest.current += 1; };
  }, [storageKey]);

  // A refreshed report can withdraw a lot. Never attach its GPS draft to another lot.
  useEffect(() => {
    if (selectedExists || (!selected && !firstLotCode)) return;
    locationRequest.current += 1;
    setSelected(firstLotCode); setPosition(null); setLocating(false); setNote(""); setMessage(""); setError("");
  }, [selectedExists, selected, firstLotCode]);

  function captureLocation() {
    setPosition(null); setError(""); setMessage("");
    if (!navigator.geolocation) { setError("อุปกรณ์นี้ไม่รองรับการหาพิกัด กรุณาใช้บันทึกช่วยจำแทน"); return; }
    const request = ++locationRequest.current;
    setLocating(true);
    navigator.geolocation.getCurrentPosition((location) => {
      if (request !== locationRequest.current) return;
      setPosition({ lat: location.coords.latitude, lng: location.coords.longitude, accuracy: location.coords.accuracy });
      setLocating(false);
      setMessage("รับพิกัดแล้ว กดบันทึกเมื่อคุณอยู่ข้างรถ");
    }, (failure) => {
      if (request !== locationRequest.current) return;
      setLocating(false);
      setError(failure.code === 1 ? "ไม่ได้รับอนุญาตให้ใช้ตำแหน่ง คุณยังบันทึกลานจอดและจุดสังเกตได้" : "หาพิกัดไม่ได้ กรุณาลองใหม่หรือบันทึกจุดสังเกตแทน");
    }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }

  function save() {
    if (!lot) return;
    setError(""); setMessage("");
    const value: SavedParking = { version: 1, lotCode: lot.code, lotName: lot.name, note: note.trim(), savedAt: new Date().toISOString(), position };
    try { localStorage.setItem(storageKey, JSON.stringify(value)); setSaved(value); setMessage("บันทึกจุดจอดในอุปกรณ์นี้แล้ว"); }
    catch { setError("บันทึกไม่ได้ พื้นที่เก็บข้อมูลอาจเต็มหรือถูกปิดใช้งาน"); }
  }

  function clear() {
    locationRequest.current += 1; setLocating(false);
    setError(""); setMessage("");
    try { localStorage.removeItem(storageKey); setSaved(null); setPosition(null); setNote(""); setMessage("ลบบันทึกจุดจอดแล้ว"); noteInput.current?.focus(); }
    catch { setError("ยังลบบันทึกไม่ได้ กรุณาตรวจสอบสิทธิ์พื้นที่เก็บข้อมูลของเบราว์เซอร์"); }
  }

  return <div className={s.workspace}>
    <section aria-labelledby="lot-picker-title">
      <h2 id="lot-picker-title">เลือกลานจอด</h2>
      <p className="hint">ข้อมูลลานจอดที่วัดเปิดเผย · สถานะจากรายงานเจ้าหน้าที่</p>
      <button className="btn btn-secondary" type="button" disabled={refreshing} onClick={() => startRefresh(() => router.refresh())}>
        <RefreshCw size={17} aria-hidden />{refreshing ? "กำลังตรวจรายงาน…" : "ตรวจรายงานใหม่"}
      </button>
      {view.kind !== "lots" ? <div className={s.overview}><ParkingEmpty view={view} /></div> : <>
        <div className={s.selector} role="group" aria-label="เลือกลานจอดเพื่อดูรายละเอียด">
          {lots.map((item) => <button key={item.code} type="button" className={s.choice} aria-pressed={item.code === lot?.code}
            onClick={() => { locationRequest.current += 1; setLocating(false); setSelected(item.code); setPosition(null); setMessage(""); setError(""); }}>
            <span><strong>{item.name}</strong><small>{item.code}</small></span><ParkingStatus lot={item} />
          </button>)}
        </div>
        {lot && <div className={s.panel} aria-live="polite"><ParkingLot lot={lot} /></div>}
      </>}
      <p className="hint">ยังไม่มีข้อมูลพิกัดรายลานหรือช่องจอด จึงไม่สามารถแนะนำช่องว่างหรือเส้นทางภายในวัดได้</p>
      <Link className="btn btn-secondary" href={`/t/${encodeURIComponent(slug)}/map`}><Map size={20} aria-hidden />เปิดแผนผังวัด</Link>
    </section>
    <section className={s.panel} aria-labelledby="my-car-title">
      <h2 id="my-car-title"><Car size={21} aria-hidden />กลับมาหารถ</h2>
      <p>เก็บลานจอดและจุดสังเกตไว้ในอุปกรณ์นี้ ไม่ส่งพิกัดให้ระบบวัด</p>
      {!ready ? <p role="status">กำลังอ่านบันทึกในอุปกรณ์…</p> : saved ? <div className={s.saved}>
        <p className={s.eyebrow}>จุดจอดที่คุณบันทึก</p><strong>{saved.lotName}</strong><span className={s.report}>บันทึก {formatTime(saved.savedAt)} น.</span>
        {!lots.some((item) => item.code === saved.lotCode) && <p>ลานนี้ไม่อยู่ในข้อมูลที่วัดเผยแพร่แล้ว บันทึกเดิมของคุณยังอยู่</p>}
        {saved.note && <div className={s.note}>{saved.note}</div>}
        {saved.position ? <>
          <p className={s.gps}><LocateFixed size={17} aria-hidden />พิกัดจากอุปกรณ์ คลาดเคลื่อนได้ประมาณ {Math.ceil(saved.position.accuracy)} เมตร ไม่ใช่พิกัดช่องจอดที่วัดยืนยัน</p>
          <a className="btn btn-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${saved.position.lat},${saved.position.lng}&travelmode=walking`} target="_blank" rel="noopener noreferrer"><Navigation size={19} aria-hidden />เปิดแผนที่ไปพิกัดที่บันทึก</a>
          <p>Google Maps จะได้รับพิกัดนี้เมื่อเปิดลิงก์ เส้นทางภายในวัดอาจไม่ครบถ้วน</p>
        </> : <p>ไม่ได้บันทึก GPS ใช้ชื่อลานและจุดสังเกตเพื่อกลับมาหารถ</p>}
        <div className={s.actions}><button className="btn btn-secondary" type="button" onClick={clear}><Trash2 size={18} aria-hidden />ลบบันทึก</button></div>
      </div> : <p>ยังไม่มีจุดจอดที่บันทึกไว้</p>}
      {lot && ready && <form onSubmit={(event) => { event.preventDefault(); save(); }}>
        <div className="field"><label htmlFor={noteId}>จุดสังเกต (ไม่จำเป็น)</label><input ref={noteInput} id={noteId} className="input" maxLength={280} value={note} onChange={(event) => setNote(event.target.value)} placeholder="เช่น ข้างต้นไม้ใหญ่ ใกล้ทางเข้า" /></div>
        <p>จะบันทึกใน {lot.name}{saved ? " แทนบันทึกเดิม" : ""} · บันทึกเมื่อจอดรถแล้ว</p>
        <div className={s.actions}>
          <button className="btn btn-secondary" type="button" disabled={locating} onClick={captureLocation}><LocateFixed size={18} aria-hidden />{locating ? "กำลังหาพิกัด…" : "ใช้ GPS จุดที่ยืนอยู่"}</button>
          <button className="btn btn-primary" type="submit" disabled={locating}><Save size={18} aria-hidden />บันทึกจุดจอด</button>
        </div>
        {position && <div className={s.gps}><LocateFixed size={17} aria-hidden /><span>พิกัดพร้อมบันทึก · คลาดเคลื่อนประมาณ {Math.ceil(position.accuracy)} เมตร <button type="button" onClick={() => { setPosition(null); setMessage(""); }}>ไม่ใช้พิกัด</button></span></div>}
      </form>}
      {message && <div className={s.message} role="status">{message}</div>}
      {error && <div className="notice notice-error" role="alert">{error}</div>}
    </section>
  </div>;
}
