"use client";
import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, BellOff, LogIn } from "lucide-react";
import { Notice, SubmitButton } from "@/components/ui";
import { followAction, type ContactState } from "@/app/contact-actions";

function useRefreshOnOk(s: ContactState) {
  const router = useRouter();
  const last = useRef<ContactState | null>(null);
  useEffect(() => { if (s.ok && last.current !== s) { last.current = s; router.refresh(); } }, [s, router]);
}

/** state: anon = logged out; following / not_following = signed in. */
export function FollowButton({ slug, state }: { slug: string; state: "anon" | "following" | "not_following" }) {
  const [s, act] = useActionState(followAction, {});
  useRefreshOnOk(s);
  if (state === "anon")
    return <Link className="btn btn-secondary btn-block" href="/login"><LogIn aria-hidden />เข้าสู่ระบบเพื่อติดตามวัด</Link>;
  const following = state === "following";
  return (
    <form action={act} className="stack">
      {s.error && <Notice kind="error">{s.error}</Notice>}
      {s.ok && <Notice kind="ok">{s.ok}</Notice>}
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="op" value={following ? "leave" : "follow"} />
      {following && <p className="meta" style={{ margin: 0 }}>คุณกำลังติดตามวัดนี้</p>}
      <SubmitButton pendingText="กำลังบันทึก…" variant="secondary" block>
        {following ? <><BellOff aria-hidden />เลิกติดตามวัด</> : <><Bell aria-hidden />ติดตามวัด</>}
      </SubmitButton>
    </form>
  );
}
