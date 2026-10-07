import { getSession } from "@/lib/auth";
import { FollowButton } from "./follow-button";
import { isFollowing, publicTempleId } from "./queries";

/** Server wrapper: decides logged-out / following / not following for FollowButton. Renders nothing if lookup fails. */
export async function FollowSection({ slug }: { slug: string }) {
  try {
    const s = await getSession();
    if (!s) return <FollowButton slug={slug} state="anon" />;
    const id = await publicTempleId(slug);
    if (!id) return null;
    return <FollowButton slug={slug} state={(await isFollowing(s.authUserId, id)) ? "following" : "not_following"} />;
  } catch (e) { console.error("[follow]", e); return null; }
}
