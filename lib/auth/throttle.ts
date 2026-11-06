// In-memory sign-in throttle: 5 failures in 15 minutes blocks that IP + username
// for 15 minutes. Per server instance, which is enough to stop casual guessing.

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const MAX_KEYS = 10_000;

type Entry = { count: number; firstAt: number };
const failures = new Map<string, Entry>();

function live(key: string, now: number): Entry | null {
  const e = failures.get(key);
  if (!e) return null;
  if (now - e.firstAt > WINDOW_MS) {
    failures.delete(key);
    return null;
  }
  return e;
}

/** Seconds until the key may try again, or 0 when it isn't blocked. */
export function loginBlocked(key: string, now = Date.now()): number {
  const e = live(key, now);
  if (!e || e.count < MAX_FAILURES) return 0;
  return Math.max(1, Math.ceil((e.firstAt + WINDOW_MS - now) / 1000));
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const e = live(key, now);
  if (e) {
    e.count++;
    return;
  }
  if (failures.size >= MAX_KEYS) {
    const oldest = failures.keys().next().value;
    if (oldest !== undefined) failures.delete(oldest);
  }
  failures.set(key, { count: 1, firstAt: now });
}

export function clearLoginFailures(key: string): void {
  failures.delete(key);
}
