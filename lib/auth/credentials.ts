import { createHash, timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";

// Bootstrap admins come from SUPERADMIN_USERS_JSON, a list of
// { "email": "...", "password": "<bcrypt hash>", "totp_secret": "<base32>" }.
// totp_secret is optional; when set, sign-in also needs an authenticator code.
// Make a hash with: node scripts/hash-password.mjs
// Plain-text passwords are only accepted outside production.

type SuperadminCredential = {
  username: string;
  password: string;
};

const credentialStore = new Map<string, string>();
const totpStore = new Map<string, string>();
let hydrated = false;
let warnedPlaintext = false;

// Compared against when the username is unknown, so a miss takes as long as a hit.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("qrave-dummy-password", 10));

const isProduction = () => process.env.NODE_ENV === "production";

export function isBcryptHash(value: string): boolean {
  return /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
}

function hydrateFromEnv(): void {
  if (hydrated) return;
  hydrated = true;

  const raw = process.env.SUPERADMIN_USERS_JSON;
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Array<{ email?: string; username?: string; password?: string; totp_secret?: string }>;
    for (const row of parsed) {
      const username = String(row.username || row.email || "").trim().toLowerCase();
      const password = String(row.password || "").trim();
      if (!username || !password) continue;
      if (!isBcryptHash(password) && isProduction()) {
        if (!warnedPlaintext) {
          console.error(
            "SUPERADMIN_USERS_JSON has a plain-text password; that account is disabled in production. Store a bcrypt hash instead.",
          );
          warnedPlaintext = true;
        }
        continue;
      }
      credentialStore.set(username, password);
      const totp = String(row.totp_secret || "").replace(/\s/g, "").toUpperCase();
      if (totp) totpStore.set(username, totp);
    }
  } catch {
    // Ignore malformed env and keep store empty.
  }
}

function plainEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function validateSuperadminCredentials(username: string, password: string): Promise<boolean> {
  hydrateFromEnv();
  const key = username.trim().toLowerCase();
  const expected = credentialStore.get(key);
  if (!expected) {
    await bcrypt.compare(password, await getDummyHash());
    return false;
  }
  if (isBcryptHash(expected)) {
    return bcrypt.compare(password, expected);
  }
  return plainEqual(password, expected);
}

export async function addSuperadminCredential(input: SuperadminCredential): Promise<{ ok: boolean; reason?: string }> {
  hydrateFromEnv();
  const username = input.username.trim().toLowerCase();
  const password = input.password.trim();
  if (!username || !password) {
    return { ok: false, reason: "username and password required" };
  }
  credentialStore.set(username, await bcrypt.hash(password, 10));
  return { ok: true };
}

export function listBootstrapCredentials(): Array<{ username: string }> {
  hydrateFromEnv();
  return Array.from(credentialStore.keys()).map((username) => ({ username }));
}

/** The authenticator secret configured for a bootstrap admin, if any. */
export function bootstrapTotpSecret(username: string): string | null {
  hydrateFromEnv();
  return totpStore.get(username.trim().toLowerCase()) || null;
}
