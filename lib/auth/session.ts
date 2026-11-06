// Signed admin session tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
// Uses Web Crypto so it works in route handlers and in proxy.ts.

export const SESSION_COOKIE = "qrave_sa_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 12;

const MIN_SECRET_LENGTH = 32;

export type SessionPayload = {
  /** qadmin id, or "bootstrap:<username>" for env-configured accounts */
  id: string;
  username: string;
  /** expiry, unix seconds */
  exp: number;
};

export class SessionSecretMissingError extends Error {
  constructor() {
    super(`SUPERADMIN_SESSION_SECRET must be set to at least ${MIN_SECRET_LENGTH} characters`);
  }
}

function secret(): string | null {
  const s = String(process.env.SUPERADMIN_SESSION_SECRET || "").trim();
  return s.length >= MIN_SECRET_LENGTH ? s : null;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmac(key: string, data: string): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey("raw", encoder.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, encoder.encode(data)));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

/** Creates a signed token. Throws SessionSecretMissingError when no secret is configured. */
export async function signSession(id: string, username: string, now = Date.now()): Promise<string> {
  const key = secret();
  if (!key) throw new SessionSecretMissingError();
  const payload: SessionPayload = { id, username, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = toBase64Url(await hmac(key, body));
  return `${body}.${sig}`;
}

/** Returns the payload when the token is correctly signed and not expired; otherwise null. */
export async function verifySession(token: string | undefined | null, now = Date.now()): Promise<SessionPayload | null> {
  const key = secret();
  if (!key || !token || token.length > 2048) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot !== token.lastIndexOf(".")) return null;
  const body = token.slice(0, dot);
  const given = fromBase64Url(token.slice(dot + 1));
  if (!given) return null;
  const expected = await hmac(key, body);
  if (!sameBytes(given, expected)) return null;

  const raw = fromBase64Url(body);
  if (!raw) return null;
  try {
    const p = JSON.parse(decoder.decode(raw)) as Partial<SessionPayload>;
    if (typeof p.id !== "string" || !p.id || typeof p.username !== "string" || !p.username) return null;
    if (typeof p.exp !== "number" || p.exp * 1000 <= now) return null;
    return { id: p.id, username: p.username, exp: p.exp };
  } catch {
    return null;
  }
}
