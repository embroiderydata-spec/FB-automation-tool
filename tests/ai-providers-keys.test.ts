import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  maskApiKey,
  saveUserProviderKey,
  deleteUserProviderKey,
  getProviderApiKey,
  getAllProviderStatuses,
  testLiveProviderConnection,
  SUPPORTED_PROVIDERS,
} from "../lib/ai/provider-keys";
import { encryptToken, decryptToken } from "../lib/crypto/encryption";

describe("AI Providers Key Management & Security Suite", () => {
  const TEST_USER_ID = "2cd3c4b4-3f80-40a7-96ba-d6ffb702ad2e";
  const TEST_EMAIL = "embroiderydata@gmail.com";

  it("verifies all 8 required providers are defined in SUPPORTED_PROVIDERS", () => {
    const providerIds = SUPPORTED_PROVIDERS.map((p) => p.id);
    assert.ok(providerIds.includes("openai"), "OpenAI must be supported");
    assert.ok(providerIds.includes("anthropic"), "Anthropic must be supported");
    assert.ok(providerIds.includes("groq"), "Groq must be supported");
    assert.ok(providerIds.includes("replicate"), "Replicate must be supported");
    assert.ok(providerIds.includes("runway"), "Runway must be supported");
    assert.ok(providerIds.includes("elevenlabs"), "ElevenLabs must be supported");
    assert.ok(providerIds.includes("google"), "Google AI / Gemini must be supported");
    assert.ok(providerIds.includes("meta"), "Meta Facebook Graph API must be supported");
  });

  it("masks API keys properly and never exposes full raw credentials", () => {
    assert.equal(maskApiKey("short"), "••••••••••••••••");
    assert.equal(maskApiKey("12345678"), "••••••••••••••••");
    assert.equal(maskApiKey("sk-proj-abc123456789xyz9999"), "••••••••••••9999");
    assert.equal(maskApiKey("gsk_ultra_secret_key_7890"), "••••••••••••7890");
  });

  it("encrypts and decrypts provider keys with AES-256-GCM authenticated cipher", () => {
    const rawKey = "sk-live-test-key-for-openai-automation-9876";
    const encrypted = encryptToken(rawKey);

    assert.notEqual(encrypted, rawKey);
    assert.ok(encrypted.includes(":"), "Format must be iv:tag:ciphertext");

    const decrypted = decryptToken(encrypted);
    assert.equal(decrypted, rawKey);
  });

  it("saves a provider API key securely encrypted, verifies masked key and decryption", async () => {
    const sampleKey = "sk-proj-test123456789abcdef0000";
    const saved = await saveUserProviderKey(
      TEST_USER_ID,
      TEST_EMAIL,
      "openai",
      sampleKey,
      "https://api.openai.com/v1",
      "gpt-4o"
    );

    assert.equal(saved.provider, "openai");
    assert.equal(saved.masked_key, "••••••••••••0000");
    assert.equal(saved.is_configured, true);

    // Retrieve raw key server-side and verify decryption
    const retrieved = await getProviderApiKey("openai", TEST_USER_ID, TEST_EMAIL);
    assert.equal(retrieved.apiKey, sampleKey);
    assert.equal(retrieved.baseUrl, "https://api.openai.com/v1");
    assert.equal(retrieved.model, "gpt-4o");
  });

  it("getAllProviderStatuses returns safe public metadata without raw keys", async () => {
    const statuses = await getAllProviderStatuses(TEST_USER_ID, TEST_EMAIL);

    for (const [providerId, status] of Object.entries(statuses)) {
      assert.ok(status.provider, `Provider ID must be present for ${providerId}`);
      // Raw key must never be present on the public status object
      assert.equal((status as any).apiKey, undefined);
      assert.equal((status as any).encrypted_key, undefined);
      if (status.is_configured) {
        assert.ok(status.masked_key.startsWith("••••"), "Configured key must be masked");
      }
    }
  });

  it("deletes a provider API key completely and updates status", async () => {
    // Save Groq key
    await saveUserProviderKey(TEST_USER_ID, TEST_EMAIL, "groq", "gsk_test_key_groq_1234");
    let stored = await getProviderApiKey("groq", TEST_USER_ID, TEST_EMAIL);
    assert.equal(stored.apiKey, "gsk_test_key_groq_1234");

    // Delete Groq key
    await deleteUserProviderKey(TEST_USER_ID, TEST_EMAIL, "groq");

    stored = await getProviderApiKey("groq", TEST_USER_ID, TEST_EMAIL);
    // Should be null unless an env var is set
    assert.ok(stored.apiKey === null || stored.apiKey === process.env.GROQ_API_KEY);
  });

  it("testLiveProviderConnection safely catches invalid credentials and returns meaningful error", async () => {
    const invalidResult = await testLiveProviderConnection(
      "openai",
      "sk-invalid-nonexistent-key-12345"
    );

    assert.equal(invalidResult.success, false);
    assert.ok(
      invalidResult.message.includes("Invalid API Key") ||
        invalidResult.message.includes("401") ||
        invalidResult.message.includes("Incorrect API key")
    );
  });

  it("testLiveProviderConnection detects missing API keys cleanly", async () => {
    const emptyResult = await testLiveProviderConnection("anthropic", "");
    assert.equal(emptyResult.success, false);
    assert.ok(emptyResult.message.includes("No API key configured"));
  });
});
