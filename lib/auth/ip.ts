// The left of X-Forwarded-For is whatever the client sent. Prefer the
// proxy-set X-Real-IP, else the right-most hop (added by our own proxy).
export function clientIP(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const hops = (request.headers.get("x-forwarded-for") || "").split(",").map((s) => s.trim()).filter(Boolean);
  return hops[hops.length - 1] || "unknown";
}
