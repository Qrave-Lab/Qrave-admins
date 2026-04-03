type SuperadminCredential = {
  username: string;
  password: string;
};

const credentialStore = new Map<string, string>();
let hydrated = false;

function hydrateFromEnv(): void {
  if (hydrated) return;
  hydrated = true;

  const raw = process.env.SUPERADMIN_USERS_JSON;
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as Array<{ email?: string; username?: string; password?: string }>;
    for (const row of parsed) {
      const username = String(row.username || row.email || "").trim().toLowerCase();
      const password = String(row.password || "").trim();
      if (username && password) {
        credentialStore.set(username, password);
      }
    }
  } catch {
    // Ignore malformed env and keep store empty.
  }
}

function normalize(input: SuperadminCredential): SuperadminCredential {
  return {
    username: input.username.trim().toLowerCase(),
    password: input.password.trim(),
  };
}

export function validateSuperadminCredentials(username: string, password: string): boolean {
  hydrateFromEnv();
  const key = username.trim().toLowerCase();
  const expected = credentialStore.get(key);
  return Boolean(expected) && expected === password;
}

export function addSuperadminCredential(input: SuperadminCredential): { ok: boolean; reason?: string } {
  hydrateFromEnv();
  const normalized = normalize(input);
  if (!normalized.username || !normalized.password) {
    return { ok: false, reason: "username and password required" };
  }
  credentialStore.set(normalized.username, normalized.password);
  return { ok: true };
}

export function listBootstrapCredentials(): Array<{ username: string }> {
  hydrateFromEnv();
  return Array.from(credentialStore.keys()).map((username) => ({ username }));
}
