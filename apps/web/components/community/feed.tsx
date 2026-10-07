"use client";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { MessageCircle, Send, ChevronDown } from "lucide-react";
import { Field, Notice, SubmitButton } from "@/components/ui";
import { createPostAction, commentAction, loadMoreAction } from "@/app/community/actions";
import type { PostView, CommentView } from "@/app/community/data";
import { POST_VIS_LABEL, LIMITS, visLabel } from "@/lib/community";
import { ContentMenu } from "./content-menu";
import { ariaOf, errOf, useRefreshOnOk } from "./hooks";
import s from "./community.module.css";

export function ComposeForm() {
  const [st, act] = useActionState(createPostAction, {});
  const form = useRef<HTMLFormElement>(null);
  useRefreshOnOk(st);
  useEffect(() => { if (st.ok) form.current?.reset(); }, [st]);
  return (
    <form action={act} ref={form} className="card stack" noValidate>
      <h2 style={{ margin: 0 }}>เขียนโพสต์</h2>
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && <Notice kind="ok">{st.ok}</Notice>}
      <Field id="body" label="ข้อความ" required hint={`ไม่เกิน ${LIMITS.post} ตัวอักษร`} error={errOf(st, "body")}>
        <textarea id="body" name="body" className="input" defaultValue={st.values?.body} {...ariaOf(st, "body")} />
      </Field>
      <Field id="visibility" label="ใครเห็นโพสต์นี้ได้" required error={errOf(st, "visibility")}>
        <select id="visibility" name="visibility" className="input" defaultValue={st.values?.visibility ?? "public"} {...ariaOf(st, "visibility")}>
          {(Object.keys(POST_VIS_LABEL) as (keyof typeof POST_VIS_LABEL)[]).map((k) => <option key={k} value={k}>{POST_VIS_LABEL[k]}</option>)}
        </select>
      </Field>
      <SubmitButton pendingText="กำลังโพสต์…" block><Send aria-hidden />โพสต์</SubmitButton>
    </form>
  );
}

export function PostCard({ post, detail, onGone }: { post: PostView; detail?: boolean; onGone?: (what: "mute" | "block" | "delete", personId: string, postId: string) => void }) {
  const [gone, setGone] = useState(false);
  const handle = (what: "mute" | "block" | "delete", personId: string, postId: string) => { if (what !== "mute") setGone(true); onGone?.(what, personId, postId); };
  return (
    <article className={`card ${s.post}`} aria-label={`โพสต์ของ ${post.authorName}`}>
      <div className={s.head}>
        <div>
          <Link href={`/community/people/${post.author}`} className={s.author}>{post.authorName}</Link>
          <p className={s.when}>{post.when} · {visLabel(post.visibility)}</p>
        </div>
        <ContentMenu kind="post" targetId={post.id} personId={post.author} personName={post.authorName} mine={post.isMine} onGone={handle} />
      </div>
      {!gone && <p className={s.body}>{post.body}</p>}
      {!gone && !detail && (
        <div className={s.foot}>
          <Link href={`/community/posts/${post.id}`} className={s.link}><MessageCircle size={20} aria-hidden />ความคิดเห็น {post.commentCount} รายการ</Link>
        </div>
      )}
    </article>
  );
}

export function FeedList({ initial }: { initial: PostView[] }) {
  const [extra, setExtra] = useState<PostView[]>([]);
  const [more, setMore] = useState(initial.length >= 30);
  const [err, setErr] = useState<string | null>(null);
  const [goneAuthors, setGoneAuthors] = useState<Set<string>>(new Set());
  const [acted, setActed] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const all = [...initial, ...extra.filter((e) => !initial.some((i) => i.id === e.id))];
  const shown = all.filter((p) => !goneAuthors.has(p.author) || p.id === acted);
  const last = all.at(-1);
  const onGone = (what: "mute" | "block" | "delete", personId: string, postId: string) => {
    if (what === "delete") return;
    setActed(postId); setGoneAuthors((g) => new Set(g).add(personId));
  };
  const loadMore = () => {
    if (!last) return;
    setErr(null);
    start(async () => {
      const r = await loadMoreAction(last.cursor);
      if ("error" in r) { setErr(r.error); return; }
      setExtra((x) => [...x, ...r.posts]); setMore(r.more);
    });
  };
  if (!shown.length) return (
    <div className="card empty"><h3>ยังไม่มีโพสต์</h3><p>เป็นคนแรกที่เขียนโพสต์ทักทายชุมชน หรือค้นหาผู้คนเพื่อเชื่อมต่อกัน</p></div>
  );
  return (
    <div className="stack">
      <ul className="list" aria-label="โพสต์ในชุมชน">
        {shown.map((p) => <li key={p.id}><PostCard post={p} onGone={onGone} /></li>)}
      </ul>
      {err && <Notice kind="error">{err}</Notice>}
      {more && (
        <button type="button" className="btn btn-secondary btn-block" onClick={loadMore} disabled={pending} aria-busy={pending}>
          {pending ? <><span className="spinner" aria-hidden style={{ width: 22, height: 22 }} />กำลังโหลด…</> : <><ChevronDown aria-hidden />โหลดเพิ่ม</>}
        </button>
      )}
    </div>
  );
}

export function CommentForm({ postId }: { postId: string }) {
  const [st, act] = useActionState(commentAction, {});
  const form = useRef<HTMLFormElement>(null);
  useRefreshOnOk(st);
  useEffect(() => { if (st.ok) form.current?.reset(); }, [st]);
  return (
    <form action={act} ref={form} className="card stack" noValidate>
      <h2 style={{ margin: 0 }}>เขียนความคิดเห็น</h2>
      {st.error && <Notice kind="error">{st.error}</Notice>}
      {st.ok && <Notice kind="ok">{st.ok}</Notice>}
      <input type="hidden" name="post" value={postId} />
      <Field id="body" label="ความคิดเห็น" required hint={`ไม่เกิน ${LIMITS.comment} ตัวอักษร`} error={errOf(st, "body")}>
        <textarea id="body" name="body" className="input" defaultValue={st.values?.body} {...ariaOf(st, "body")} />
      </Field>
      <SubmitButton pendingText="กำลังส่ง…" block><Send aria-hidden />ส่งความคิดเห็น</SubmitButton>
    </form>
  );
}

export function CommentItem({ c }: { c: CommentView }) {
  return (
    <article className={`card ${s.post}`} aria-label={`ความคิดเห็นของ ${c.authorName}`}>
      <div className={s.head}>
        <div>
          <Link href={`/community/people/${c.author}`} className={s.author}>{c.authorName}</Link>
          <p className={s.when}>{c.when}</p>
        </div>
        {!c.isMine && <ContentMenu kind="comment" targetId={c.id} personId={c.author} personName={c.authorName} />}
      </div>
      <p className={s.body}>{c.body}</p>
    </article>
  );
}
