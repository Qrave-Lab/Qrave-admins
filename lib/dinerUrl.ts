// The diner-facing site (Qrave-website). QR codes and diner links point here.
// Set NEXT_PUBLIC_DINER_APP_URL per environment (e.g. a local Qrave-website
// for testing); this default is the live site.
export const DEFAULT_DINER_APP_URL = "https://www.qravetech.in";

export function dinerBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_DINER_APP_URL || DEFAULT_DINER_APP_URL).replace(/\/+$/, "");
}
