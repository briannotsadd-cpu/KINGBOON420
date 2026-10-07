"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server parts of the page every few seconds (new messages / unread badges) without a full reload. */
export function ListRefresher({ seconds = 5 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
