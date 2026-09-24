/** Simple in-memory sliding-window rate limiter (per user).
 *  Single-instance deployment (Vercel). For multi-region production,
 *  move this to Redis/Upstash — see README. */
const buckets = new Map<string, number[]>();

export function rateLimit(
  key: string,
  max: number,
  windowMs: number,
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  const list = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (list.length >= max) {
    buckets.set(key, list);
    const oldest = list[0] ?? now;
    return { ok: false, retryAfterSeconds: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  list.push(now);
  buckets.set(key, list);
  // opportunistic cleanup
  if (buckets.size > 5000) {
    for (const [k] of buckets) {
      if ((buckets.get(k) ?? []).every((t) => t < now - windowMs)) buckets.delete(k);
    }
  }
  return { ok: true, retryAfterSeconds: 0 };
}