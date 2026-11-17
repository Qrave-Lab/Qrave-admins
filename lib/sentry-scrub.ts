// Dependency-free event scrubbing shared by the server, edge and browser Sentry
// configs. Keep this file free of imports so it is safe in every runtime.
const REDACTED = "[redacted]";
const SENSITIVE_HEADERS = new Set([
  "authorization", "cookie", "set-cookie", "x-csrf-token", "x-api-key", "proxy-authorization",
  "x-razorpay-signature", "x-manager-pin",
]);
const SENSITIVE_QUERY = ["token", "otp", "pin", "signature", "secret", "password", "key", "code", "sig"];

export function redactText(s: string): string {
  return s
    .replace(/bearer\s+[A-Za-z0-9._-]+/gi, `Bearer ${REDACTED}`)
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, REDACTED)
    .replace(/\+?\d[\d\s-]{7,}\d/g, REDACTED);
}

export function scrubQueryString(q: string): string {
  if (!q) return q;
  const raw = q.startsWith("?") ? q.slice(1) : q;
  return raw
    .split("&")
    .map((pair) => {
      const [k] = pair.split("=");
      let name = k;
      try { name = decodeURIComponent(k); } catch { /* keep raw */ }
      return SENSITIVE_QUERY.some((s) => name.toLowerCase().includes(s)) ? `${k}=${REDACTED}` : pair;
    })
    .join("&");
}

function scrubUrl(url: string): string {
  const i = url.indexOf("?");
  if (i < 0) return url;
  const hash = url.indexOf("#", i);
  const end = hash < 0 ? url.length : hash;
  return url.slice(0, i + 1) + scrubQueryString(url.slice(i + 1, end)) + url.slice(end);
}

export function scrubEvent<T>(input: T): T {
  const event = input as any;
  const req = event.request;
  if (req) {
    if (req.headers) {
      for (const k of Object.keys(req.headers)) {
        if (SENSITIVE_HEADERS.has(k.toLowerCase())) req.headers[k] = REDACTED;
      }
    }
    delete req.cookies;
    delete req.data;
    delete req.env;
    if (typeof req.query_string === "string") req.query_string = scrubQueryString(req.query_string);
    if (typeof req.url === "string") req.url = scrubUrl(req.url);
  }
  if (event.user) event.user = event.user.id ? { id: event.user.id } : {};
  if (typeof event.message === "string") event.message = redactText(event.message);
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === "string") ex.value = redactText(ex.value);
  }
  for (const b of event.breadcrumbs ?? []) {
    if (typeof b.message === "string") b.message = redactText(b.message);
    if (b.data) {
      delete b.data.url; delete b.data.to; delete b.data.from; // may carry tokens in query strings
    }
  }
  return input;
}
