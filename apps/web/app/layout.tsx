import "./globals.css";
import type { Metadata, Viewport } from "next";

export const metadata: Metadata = { title: "ระบบบุญ — BOON SYSTEM", description: "ข้อมูลวัดสำหรับผู้มาเยือน" };
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
