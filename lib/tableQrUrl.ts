// Safe for browser code (no Node imports). Server code uses lib/tableQr.ts.

/** The link a table's QR code opens: {diner site}/menu/qr/{token}. */
export function tableQrUrl(baseUrl: string, token: string): string {
  return `${baseUrl.trim().replace(/\/+$/, "")}/menu/qr/${token}`;
}
