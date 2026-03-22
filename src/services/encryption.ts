// ==========================================================
// ENCRYPTION DISABLED — Key exchange not yet implemented.
// Both partners independently generate different keys, making
// encrypted content unreadable across devices. Encryption will
// be re-enabled once a proper key exchange mechanism is built.
// ==========================================================

/**
 * No-op: returns a placeholder key. Encryption is disabled.
 */
export async function generateCoupleKey(_coupleId: string): Promise<string> {
  return 'disabled';
}

/**
 * No-op: returns a placeholder key. Encryption is disabled.
 */
export async function getCoupleKey(_coupleId: string): Promise<string | null> {
  return 'disabled';
}

/**
 * No-op: returns plaintext. Encryption is disabled.
 */
export function encrypt(text: string, _key: string): string {
  return text;
}

/**
 * No-op: returns the input. Encryption is disabled.
 * Also handles legacy encrypted data by detecting the format.
 */
export function decrypt(encoded: string, _key: string): string {
  try {
    const decoded = atob(encoded);
    if (decoded.includes(':')) {
      return '[encrypted response]';
    }
  } catch {
    // Not base64 — it's plaintext
  }
  return encoded;
}
