import { db } from "@/lib/db";

// Sign-in throttle. Failures are counted per username and per IP, so a
// spoofed IP header can't buy more guesses at one account. Counts live in the
// superadmin_login_failures table so they hold across restarts and server
// instances; if that table can't be reached we fall back to memory.

export const WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { user: 10, ip: 20, mfa: 5 } as const;
const MAX_KEYS = 10_000;

type Kind = keyof typeof LIMITS;
type Entry = { count: number; firstAt: number };
const memory = new Map<string, Entry>();

export function throttleKeys(username: string, ip: string): string[] {
  return [`user:${username.toLowerCase()}`, `ip:${ip}`];
}

/** Keys for wrong 2FA codes: 5 per account per 15 minutes. */
export function mfaThrottleKeys(adminId: string, ip: string): string[] {
  return [`mfa:${adminId}`, `ip:${ip}`];
}

function limitFor(key: string): number {
  const kind = key.slice(0, key.indexOf(":")) as Kind;
  return LIMITS[kind] ?? LIMITS.user;
}

function liveMemory(key: string, now: number): Entry | null {
  const e = memory.get(key);
  if (!e) return null;
  if (now - e.firstAt > WINDOW_MS) {
    memory.delete(key);
    return null;
  }
  return e;
}

function memoryBlocked(keys: string[], now: number): number {
  let wait = 0;
  for (const key of keys) {
    const e = liveMemory(key, now);
    if (e && e.count >= limitFor(key)) {
      wait = Math.max(wait, Math.ceil((e.firstAt + WINDOW_MS - now) / 1000));
    }
  }
  return wait > 0 ? Math.max(1, wait) : 0;
}

function memoryRecord(key: string, now: number): void {
  const e = liveMemory(key, now);
  if (e) {
    e.count++;
    return;
  }
  if (memory.size >= MAX_KEYS) {
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(key, { count: 1, firstAt: now });
}

/** Seconds until these keys may try again, or 0 when none is blocked. */
export async function loginBlocked(keys: string[], now = Date.now()): Promise<number> {
  try {
    const { rows } = await db.query<{ key: string; count: number; first_at: Date }>(
      `SELECT key, count, first_at FROM superadmin_login_failures
        WHERE key = ANY($1) AND first_at > now() - make_interval(secs => $2)`,
      [keys, WINDOW_MS / 1000],
    );
    let wait = 0;
    for (const r of rows) {
      if (r.count >= limitFor(r.key)) {
        wait = Math.max(wait, Math.ceil((new Date(r.first_at).getTime() + WINDOW_MS - now) / 1000));
      }
    }
    return Math.max(wait > 0 ? Math.max(1, wait) : 0, memoryBlocked(keys, now));
  } catch {
    return memoryBlocked(keys, now);
  }
}

export async function recordLoginFailure(keys: string[], now = Date.now()): Promise<void> {
  for (const key of keys) memoryRecord(key, now);
  try {
    for (const key of keys) {
      await db.query(
        `INSERT INTO superadmin_login_failures (key, count, first_at) VALUES ($1, 1, now())
         ON CONFLICT (key) DO UPDATE SET
           count = CASE WHEN superadmin_login_failures.first_at <= now() - make_interval(secs => $2)
                        THEN 1 ELSE superadmin_login_failures.count + 1 END,
           first_at = CASE WHEN superadmin_login_failures.first_at <= now() - make_interval(secs => $2)
                           THEN now() ELSE superadmin_login_failures.first_at END`,
        [key, WINDOW_MS / 1000],
      );
    }
  } catch {
    // Memory counts above still apply.
  }
}

/** Clears the account's count after a good sign-in. The IP count is kept. */
export async function clearLoginFailures(username: string, adminId?: string): Promise<void> {
  const keys = [`user:${username.toLowerCase()}`];
  if (adminId) keys.push(`mfa:${adminId}`);
  for (const k of keys) memory.delete(k);
  try {
    await db.query(`DELETE FROM superadmin_login_failures WHERE key = ANY($1)`, [keys]);
  } catch {
    // Nothing to clear.
  }
}
