import "server-only";

export type MailResult = { sent: true } | { sent: false; reason: "not_configured" | "failed"; devLogged: boolean };

/** Sends the login code. Real delivery uses Resend (RESEND_API_KEY + MAIL_FROM). Without them, development mode
 *  prints the code to the server console (never to the page) and the page says plainly that no email was sent. */
export async function sendLoginCode(email: string, code: string): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) {
    const dev = process.env.NODE_ENV !== "production" || process.env.MAIL_DEV_LOG === "1";
    if (dev) console.log(`[dev-mail] login code for ${email}: ${code}`);
    return { sent: false, reason: "not_configured", devLogged: dev };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [email], subject: `รหัสเข้าสู่ระบบ KINGBOON: ${code}`,
        text: `รหัสเข้าสู่ระบบของคุณคือ ${code}\nรหัสนี้ใช้ได้ 10 นาที ถ้าคุณไม่ได้ขอรหัสนี้ ไม่ต้องทำอะไร`,
      }),
    });
    return res.ok ? { sent: true } : { sent: false, reason: "failed", devLogged: false };
  } catch {
    return { sent: false, reason: "failed", devLogged: false };
  }
}
