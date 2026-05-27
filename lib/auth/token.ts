import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || "fallback-qrave-superadmin-secret-key-12345-secured";

/**
 * Signs a subject (e.g. "id:username") using HMAC-SHA256.
 * Returns a secure token format: payloadBase64Url.signatureBase64Url
 */
export function signToken(subject: string): string {
  const hmac = crypto.createHmac("sha256", SECRET);
  hmac.update(subject);
  const signature = hmac.digest("base64url");
  const payloadBase64 = Buffer.from(subject).toString("base64url");
  return `${payloadBase64}.${signature}`;
}

/**
 * Verifies a token's cryptographic signature.
 * Returns the verified subject, or null if the signature is invalid.
 */
export function verifyToken(token: string): string | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    
    const [payloadBase64, signature] = parts;
    if (!payloadBase64 || !signature) return null;
    
    const subject = Buffer.from(payloadBase64, "base64url").toString("utf-8");
    
    // Compute expected signature
    const hmac = crypto.createHmac("sha256", SECRET);
    hmac.update(subject);
    const expectedSignature = hmac.digest("base64url");
    
    // Timing-attack safe comparison
    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);
    
    if (sigBuffer.length === expectedSigBuffer.length && crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return subject;
    }
  } catch (error) {
    console.error("Token verification error:", error);
    return null;
  }
  return null;
}
