import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

// Authenticator-app codes (RFC 6238: 6 digits, 30-second steps, SHA-1),
// recovery codes, and encryption of stored secrets.

const STEP_SECONDS = 30;
const DIGITS = 6;
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx < 0) throw new Error("invalid base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A new random secret, base32 (160 bits). */
export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

export function codeForStep(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 15;
  const bin = (mac.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return bin.toString().padStart(DIGITS, "0");
}

function sameString(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Checks a 6-digit code, allowing one step of clock drift either way.
 * Returns the matched step, or null. A step at or before lastStep is refused,
 * so a code can't be used twice.
 */
export function verifyTotp(secret: string, code: string, lastStep: number | null, now = Date.now()): number | null {
  const c = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(c)) return null;
  const step = currentStep(now);
  for (const s of [step - 1, step, step + 1]) {
    if (lastStep !== null && s <= lastStep) continue;
    if (sameString(codeForStep(secret, s), c)) return s;
  }
  return null;
}

export function otpauthUrl(secret: string, account: string, issuer = "Qrave Admin"): string {
  const label = encodeURIComponent(`${issuer}:${account}`);
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ---- Recovery codes ----

const RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = randomBytes(10);
    let s = "";
    for (const b of bytes) s += RECOVERY_ALPHABET[b % RECOVERY_ALPHABET.length];
    codes.push(`${s.slice(0, 5)}-${s.slice(5)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(code)).digest("hex");
}

export function looksLikeRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === 10;
}

// ---- Secret encryption (AES-256-GCM) ----
// Key: SUPERADMIN_TOTP_KEY, else derived from SUPERADMIN_SESSION_SECRET.
// Changing that key makes stored secrets unreadable, so admins would need to
// set up 2FA again.

function encryptionKey(): Buffer {
  const raw = String(process.env.SUPERADMIN_TOTP_KEY || process.env.SUPERADMIN_SESSION_SECRET || "").trim();
  if (raw.length < 32) throw new Error("SUPERADMIN_TOTP_KEY (or SUPERADMIN_SESSION_SECRET) must be at least 32 characters");
  return createHash("sha256").update(`qrave-admin-totp:${raw}`).digest();
}

export function encryptSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), enc.toString("base64")].join(".");
}

export function decryptSecret(stored: string): string {
  const [v, iv, tag, enc] = stored.split(".");
  if (v !== "v1" || !iv || !tag || !enc) throw new Error("bad secret format");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(enc, "base64")), decipher.final()]).toString("utf8");
}

/** True unless SUPERADMIN_REQUIRE_2FA=false. Defaults to off outside production. */
export function twoFactorRequired(): boolean {
  const v = String(process.env.SUPERADMIN_REQUIRE_2FA || "").trim().toLowerCase();
  if (v === "false" || v === "0" || v === "off") return false;
  if (v === "true" || v === "1" || v === "on") return true;
  return process.env.NODE_ENV === "production";
}
