import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Showcase3D } from "@/components/map/showcase-3d";
import { PLACEHOLDER_LABEL } from "@/components/map/showcase-text";

export const metadata = { title: "ตัวอย่างแผนที่ 3 มิติ (สาธิต) — KINGBOON" };

export default function Showcase() {
  return (
    <main className="stack">
      <Link className="back" href="/">‹ กลับหน้าแรก</Link>
      <div><h1>ตัวอย่างแผนที่ 3 มิติ (สาธิต)</h1></div>
      <div className="notice notice-warn" data-testid="placeholder-label"><TriangleAlert size={24} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} /><div><b>{PLACEHOLDER_LABEL}</b></div></div>
      <Showcase3D />
    </main>
  );
}
