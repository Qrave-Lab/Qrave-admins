import { db } from "@/lib/db";
import { bootstrapTotpSecret } from "@/lib/auth/credentials";
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  verifyTotp,
} from "@/lib/auth/totp";

// Two-step sign-in state for each admin. Database admins keep it in
// superadmin_users; bootstrap (env) admins use totp_secret from
// SUPERADMIN_USERS_JSON and can't keep recovery codes.

const BOOTSTRAP_PREFIX = "bootstrap:";

export type MfaStatus = {
  enabled: boolean;
  /** Bootstrap admins are set up through the env, not the setup screen. */
  bootstrap: boolean;
  recoveryCodesLeft: number;
};

export function isBootstrapId(id: string): boolean {
  return id.startsWith(BOOTSTRAP_PREFIX);
}

function bootstrapUsername(id: string): string {
  return id.slice(BOOTSTRAP_PREFIX.length);
}

// Last used step per bootstrap admin, so a code can't be replayed.
const bootstrapLastStep = new Map<string, number>();

export async function getMfaStatus(id: string): Promise<MfaStatus> {
  if (isBootstrapId(id)) {
    return { enabled: Boolean(bootstrapTotpSecret(bootstrapUsername(id))), bootstrap: true, recoveryCodesLeft: 0 };
  }
  const { rows } = await db.query(
    `SELECT totp_enabled_at, COALESCE(array_length(totp_recovery_hashes, 1), 0) AS left
       FROM superadmin_users WHERE id::text = $1`,
    [id],
  );
  if (rows.length === 0) throw new Error("admin not found");
  return { enabled: rows[0].totp_enabled_at !== null, bootstrap: false, recoveryCodesLeft: Number(rows[0].left) };
}

/**
 * Checks a sign-in code: a 6-digit authenticator code, or a recovery code
 * (which is then used up). Returns how it was accepted, or null.
 */
export async function verifySecondFactor(id: string, code: string): Promise<"totp" | "recovery" | null> {
  const trimmed = code.trim();

  if (isBootstrapId(id)) {
    const username = bootstrapUsername(id);
    const secret = bootstrapTotpSecret(username);
    if (!secret) return null;
    const step = verifyTotp(secret, trimmed, bootstrapLastStep.get(username) ?? null);
    if (step === null) return null;
    bootstrapLastStep.set(username, step);
    return "totp";
  }

  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      `SELECT totp_secret_enc, totp_enabled_at, totp_last_step, totp_recovery_hashes
         FROM superadmin_users WHERE id::text = $1 FOR UPDATE`,
      [id],
    );
    const row = rows[0];
    if (!row || !row.totp_secret_enc || row.totp_enabled_at === null) {
      await client.query("ROLLBACK");
      return null;
    }

    if (looksLikeRecoveryCode(trimmed)) {
      const hash = hashRecoveryCode(trimmed);
      const hashes: string[] = row.totp_recovery_hashes || [];
      if (!hashes.includes(hash)) {
        await client.query("ROLLBACK");
        return null;
      }
      await client.query(
        `UPDATE superadmin_users SET totp_recovery_hashes = array_remove(totp_recovery_hashes, $2) WHERE id::text = $1`,
        [id, hash],
      );
      await client.query("COMMIT");
      return "recovery";
    }

    const last = row.totp_last_step === null ? null : Number(row.totp_last_step);
    const step = verifyTotp(decryptSecret(row.totp_secret_enc), trimmed, last);
    if (step === null) {
      await client.query("ROLLBACK");
      return null;
    }
    await client.query(`UPDATE superadmin_users SET totp_last_step = $2 WHERE id::text = $1`, [id, step]);
    await client.query("COMMIT");
    return "totp";
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Starts setup: makes a new secret and keeps it as pending until confirmed.
 * Refused while 2FA is already on (turn it off first).
 */
export async function startSetup(id: string): Promise<string> {
  if (isBootstrapId(id)) {
    // Shown once so it can be copied into SUPERADMIN_USERS_JSON.
    return generateSecret();
  }
  const secret = generateSecret();
  const { rowCount } = await db.query(
    `UPDATE superadmin_users SET totp_secret_enc = $2, totp_last_step = NULL
      WHERE id::text = $1 AND totp_enabled_at IS NULL`,
    [id, encryptSecret(secret)],
  );
  if (!rowCount) throw new Error("2FA is already on for this account");
  return secret;
}

/** Confirms setup with a code from the app. Returns fresh recovery codes, or null if the code is wrong. */
export async function confirmSetup(id: string, code: string): Promise<string[] | null> {
  if (isBootstrapId(id)) return null;
  const { rows } = await db.query(
    `SELECT totp_secret_enc FROM superadmin_users WHERE id::text = $1 AND totp_enabled_at IS NULL`,
    [id],
  );
  const enc = rows[0]?.totp_secret_enc;
  if (!enc) return null;
  const step = verifyTotp(decryptSecret(enc), code, null);
  if (step === null) return null;

  const codes = generateRecoveryCodes();
  const { rowCount } = await db.query(
    `UPDATE superadmin_users
        SET totp_enabled_at = now(), totp_last_step = $2, totp_recovery_hashes = $3
      WHERE id::text = $1 AND totp_enabled_at IS NULL AND totp_secret_enc = $4`,
    [id, step, codes.map(hashRecoveryCode), enc],
  );
  return rowCount ? codes : null;
}

/** Replaces the recovery codes. Needs a current code from the app. */
export async function regenerateRecoveryCodes(id: string, code: string): Promise<string[] | null> {
  if (isBootstrapId(id)) return null;
  if ((await verifySecondFactor(id, code)) !== "totp") return null;
  const codes = generateRecoveryCodes();
  await db.query(`UPDATE superadmin_users SET totp_recovery_hashes = $2 WHERE id::text = $1`, [id, codes.map(hashRecoveryCode)]);
  return codes;
}

/** Turns 2FA off. Needs a current code (or a recovery code). */
export async function disableMfa(id: string, code: string): Promise<boolean> {
  if (isBootstrapId(id)) return false;
  if (!(await verifySecondFactor(id, code))) return false;
  await db.query(
    `UPDATE superadmin_users
        SET totp_secret_enc = NULL, totp_enabled_at = NULL, totp_last_step = NULL, totp_recovery_hashes = '{}'
      WHERE id::text = $1`,
    [id],
  );
  return true;
}
