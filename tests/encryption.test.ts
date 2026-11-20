import test from "node:test";
import assert from "node:assert/strict";
import {
  encryptToken,
  decryptToken,
  generateEncryptionKey,
  isEncryptionConfigured,
} from "../lib/crypto/encryption";

test("Token Encryption & Decryption Suite", async (t) => {
  // Ensure TOKEN_ENCRYPTION_KEY is set in process.env for tests
  process.env.TOKEN_ENCRYPTION_KEY =
    process.env.TOKEN_ENCRYPTION_KEY ||
    "ba411ecef0bd56c7f0fca8d880c24e53909fa6902f6ead279dc460c2acdff4f8";

  await t.test("isEncryptionConfigured returns true when valid 64-hex key is set", () => {
    assert.strictEqual(isEncryptionConfigured(), true);
  });

  await t.test("generateEncryptionKey produces a 64-character hexadecimal key", () => {
    const key = generateEncryptionKey();
    assert.strictEqual(key.length, 64);
    assert.match(key, /^[0-9a-fA-F]{64}$/);
  });

  await t.test("encryptToken and decryptToken successfully round-trips a sample access token", () => {
    const originalToken = "EAABwz1234567890abcdefghijklmnopqrstuvwxyz_META_TEST_TOKEN";
    const encrypted = encryptToken(originalToken);

    // Encrypted payload should be in format iv:authTag:ciphertext
    assert.notStrictEqual(encrypted, originalToken);
    const parts = encrypted.split(":");
    assert.strictEqual(parts.length, 3);
    assert.strictEqual(parts[0].length, 24); // 12 bytes = 24 hex chars
    assert.strictEqual(parts[1].length, 32); // 16 bytes = 32 hex chars

    const decrypted = decryptToken(encrypted);
    assert.strictEqual(decrypted, originalToken);
  });

  await t.test("encryptToken produces different ciphertexts for the same plaintext due to random IV", () => {
    const token = "MY_STATIC_ACCESS_TOKEN_VALUE";
    const enc1 = encryptToken(token);
    const enc2 = encryptToken(token);

    assert.notStrictEqual(enc1, enc2);
    assert.strictEqual(decryptToken(enc1), token);
    assert.strictEqual(decryptToken(enc2), token);
  });

  await t.test("decryptToken fails securely on corrupted ciphertext without leaking token", () => {
    const originalToken = "SECRET_TOKEN_TO_PROTECT";
    const encrypted = encryptToken(originalToken);
    const parts = encrypted.split(":");
    // Tamper with ciphertext
    const tampered = `${parts[0]}:${parts[1]}:deadbeef${parts[2].slice(8)}`;

    assert.throws(
      () => {
        decryptToken(tampered);
      },
      (err: any) => {
        // Assert error does NOT contain original token
        assert.strictEqual(err.message.includes(originalToken), false);
        return true;
      }
    );
  });

  await t.test("encryptToken throws error when token is empty", () => {
    assert.throws(() => {
      encryptToken("");
    });
  });
});
