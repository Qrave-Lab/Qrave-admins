import { randomBytes } from "crypto";

// Table QR codes open {diner site}/menu/qr/{token}. The token (in qr_tokens)
// identifies the restaurant and table, the same as QR codes made in the POS.
// Existing tokens are always reused: replacing one breaks codes already
// printed on tables.

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }>;
};

export { tableQrUrl } from "./tableQrUrl";

/**
 * Returns each table's QR token, creating one for tables that have none.
 * Pass a transaction client to create tokens inside the caller's transaction.
 */
export async function ensureTableQrTokens(
  db: Queryable,
  restaurantId: string,
  tableIds: string[],
): Promise<Map<string, string>> {
  const tokens = new Map<string, string>();
  if (tableIds.length === 0) return tokens;

  const read = async () => {
    const { rows } = await db.query(
      `SELECT table_id::text AS table_id, token FROM qr_tokens WHERE restaurant_id = $1 AND table_id = ANY($2::uuid[])`,
      [restaurantId, tableIds],
    );
    for (const r of rows) tokens.set(String(r.table_id), String(r.token));
  };

  await read();
  const missing = tableIds.filter((id) => !tokens.has(id));
  if (missing.length > 0) {
    // Same format as the backend: 16 random bytes, hex. DO NOTHING keeps a
    // token another request created meanwhile; re-reading picks it up.
    const newTokens = missing.map(() => randomBytes(16).toString("hex"));
    await db.query(
      `INSERT INTO qr_tokens (token, restaurant_id, table_id)
       SELECT t.token, $1, t.table_id
       FROM unnest($2::text[], $3::uuid[]) AS t(token, table_id)
       ON CONFLICT (restaurant_id, table_id) DO NOTHING`,
      [restaurantId, newTokens, missing],
    );
    await read();
  }
  return tokens;
}
