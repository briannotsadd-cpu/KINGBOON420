import { createHash } from "node:crypto";

/** First address of an x-forwarded-for header, or 'unknown'. */
export function firstIp(xff: string | null | undefined): string {
  const first = (xff ?? "").split(",")[0]?.trim();
  return first ? first : "unknown";
}

/** sha256(ip + pepper), hex. The DB only ever sees this hash (rate limiting), never the address. */
export function ipHash(xff: string | null | undefined, pepper: string): string {
  return createHash("sha256").update(firstIp(xff) + pepper).digest("hex");
}
