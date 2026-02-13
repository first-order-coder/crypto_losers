/**
 * Sanitize a raw header value to only allow characters valid in IP
 * addresses: digits, dots, colons (IPv6), commas, and spaces.
 */
function sanitize(raw: string): string {
  return raw.replace(/[^0-9a-fA-F.:, ]/g, "");
}

/**
 * Extract the first valid-looking IP from a comma-separated header value.
 * Returns null if nothing usable remains after sanitization.
 */
function parseFirstIp(raw: string): string | null {
  const cleaned = sanitize(raw);
  const first = cleaned.split(",")[0]?.trim();
  return first && first.length > 0 ? first : null;
}

/**
 * Extract the client IP from a request using a deterministic fallback order:
 *
 *   1. `x-forwarded-for` — standard proxy header (first IP in list)
 *   2. `x-real-ip`       — common reverse-proxy header (Nginx, Vercel)
 *   3. `"global"`        — safe fallback when no header is present
 *
 * All header values are sanitized to prevent injection of unexpected
 * characters before being used as rate-limit keys.
 */
export function getRequestIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const ip = parseFirstIp(xff);
    if (ip) return ip;
  }

  const xri = req.headers.get("x-real-ip");
  if (xri) {
    const ip = parseFirstIp(xri);
    if (ip) return ip;
  }

  return "global";
}
