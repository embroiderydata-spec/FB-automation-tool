import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Recommended 12 bytes for GCM
const AUTH_TAG_LENGTH = 16; // 16 bytes auth tag

export const DEFAULT_TOKEN_ENCRYPTION_KEY =
  "ba411ecef0bd56c7f0fca8d880c24e53909fa6902f6ead279dc460c2acdff4f8";

/**
 * Validates and retrieves the 32-byte encryption key buffer from process.env.TOKEN_ENCRYPTION_KEY.
 * Falls back to DEFAULT_TOKEN_ENCRYPTION_KEY if unconfigured in environment.
 */
export function getEncryptionKey(): Buffer {
  const rawKey = process.env.TOKEN_ENCRYPTION_KEY || DEFAULT_TOKEN_ENCRYPTION_KEY;

  if (!rawKey) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is not configured. Please set a 32-byte (64 hex characters) key in environment variables."
    );
  }

  // Support 64-char hex format (preferred)
  if (/^[0-9a-fA-F]{64}$/.test(rawKey)) {
    return Buffer.from(rawKey, "hex");
  }

  // Support 32-byte raw string
  const buf = Buffer.from(rawKey, "utf8");
  if (buf.length === 32) {
    return buf;
  }

  throw new Error(
    "Invalid TOKEN_ENCRYPTION_KEY format. Must be a 64-character hexadecimal string or 32-byte string."
  );
}

/**
 * Verifies if the encryption configuration is present and valid.
 */
export function isEncryptionConfigured(): boolean {
  try {
    getEncryptionKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Generates a cryptographically secure 256-bit encryption key as a 64-char hex string.
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Encrypts a sensitive string (e.g. Meta access token) using AES-256-GCM.
 * Output format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 */
export function encryptToken(token: string): string {
  if (!token) {
    throw new Error("Cannot encrypt empty token.");
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(token, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts an encrypted token string using AES-256-GCM.
 * Authenticates ciphertext with the authentication tag.
 */
export function decryptToken(encryptedPayload: string): string {
  if (!encryptedPayload) {
    throw new Error("Encrypted payload is required for decryption.");
  }

  const parts = encryptedPayload.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted token payload format.");
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error("Invalid IV length in encrypted token payload.");
  }

  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error("Invalid auth tag length in encrypted token payload.");
  }

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  try {
    let decrypted = decipher.update(ciphertextHex, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    // Never expose token or internal cipher details in error
    throw new Error("Failed to decrypt token: Authentication tag verification failed or corrupted ciphertext.");
  }
}
