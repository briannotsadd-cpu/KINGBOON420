import "./globals.css";
import Link from "next/link";
import type { Metadata, Viewport } from "next";
import { Landmark, Search, UserRound, LogIn } from "lucide-react";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic"; // every page depends on the signed-in user
export const metadata: Metadata = { title: "KINGBOON — ระบบวัด", description: "ค้นหาวัด ดูข้อมูลวัดและที่จอดรถ" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#7a2e0e" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let s = null;
  try { s = await getSession(); } catch (e) { console.error("[layout] session lookup failed", e); }
  return (
    <html lang="th">
      <body>
        <header className="topbar">
          <div className="topbar-in">
            <Link href="/" className="brand"><span className="brand-mark"><Landmark size={20} aria-hidden /></span>KINGBOON</Link>
            <nav className="nav" aria-label="เมนูหลัก">
              <Link href="/"><Search size={20} aria-hidden />ค้นหาวัด</Link>
              {s ? <Link href="/me"><UserRound size={20} aria-hidden />ของฉัน</Link>
                 : <Link href="/login"><LogIn size={20} aria-hidden />เข้าสู่ระบบ</Link>}
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
