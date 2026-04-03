const OTP_TTL_MS = 5 * 60 * 1000;

const otpStore = new Map<string, { otp: string; expiresAt: number; password: string }>();
const sessionStore = new Map<string, { email: string; createdAt: number }>();

function randomDigits(len: number): string {
  let out = "";
  for (let i = 0; i < len; i += 1) {
    out += Math.floor(Math.random() * 10).toString();
  }
  return out;
}

function randomToken(): string {
  const parts = Array.from({ length: 4 }, () => Math.random().toString(36).slice(2));
  return parts.join("");
}

export function createOtp(email: string, password: string): string {
  const otp = randomDigits(6);
  otpStore.set(email.toLowerCase(), {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    password,
  });
  return otp;
}

export function verifyOtp(email: string, otp: string, password: string): { ok: boolean; reason?: string } {
  const key = email.toLowerCase();
  const row = otpStore.get(key);
  if (!row) return { ok: false, reason: "OTP not requested" };
  if (Date.now() > row.expiresAt) {
    otpStore.delete(key);
    return { ok: false, reason: "OTP expired" };
  }
  if (row.password !== password) return { ok: false, reason: "Invalid password" };
  if (row.otp !== otp) return { ok: false, reason: "Invalid OTP" };
  otpStore.delete(key);
  return { ok: true };
}

export function createSession(email: string): string {
  const token = randomToken();
  sessionStore.set(token, { email, createdAt: Date.now() });
  return token;
}

export function sessionExists(token: string | undefined): boolean {
  if (!token) return false;
  return sessionStore.has(token);
}

export function getSessionEmail(token: string | undefined): string | null {
  if (!token) return null;
  return sessionStore.get(token)?.email ?? null;
}

export function clearSession(token: string | undefined): void {
  if (!token) return;
  sessionStore.delete(token);
}
