import { describe, test } from "node:test";
import assert from "node:assert";
import {
  calculateNextRetryAt,
  generateIdempotencyKey,
  DEFAULT_RETRY_POLICY,
} from "../lib/queue/reliability";
import { redactSecrets } from "../lib/logger/logger";
import { checkRateLimit, RATE_LIMIT_PROFILES } from "../lib/security/rate-limiter";
import { validateEnvironment } from "../lib/config/env-validator";

describe("Phase 2.8 Production Reliability & Security Suite", () => {
  describe("Exponential Backoff & Retry Logic", () => {
    test("calculates increasing backoff delays across successive attempts", () => {
      const now = Date.now();

      const retry1 = calculateNextRetryAt(0); // ~10s
      assert.ok(retry1 instanceof Date);
      const delay1 = retry1.getTime() - now;
      assert.ok(delay1 >= 9500 && delay1 <= 15000, `Delay 1 was ${delay1}`);

      const retry2 = calculateNextRetryAt(1); // ~30s
      assert.ok(retry2 instanceof Date);
      const delay2 = retry2.getTime() - now;
      assert.ok(delay2 >= 29000 && delay2 <= 36000, `Delay 2 was ${delay2}`);

      const retry3 = calculateNextRetryAt(2); // ~120s
      assert.ok(retry3 instanceof Date);
      const delay3 = retry3.getTime() - now;
      assert.ok(delay3 >= 115000 && delay3 <= 140000, `Delay 3 was ${delay3}`);
    });

    test("returns null when attempt count reaches or exceeds maxAttempts", () => {
      const retryExceeded = calculateNextRetryAt(4, DEFAULT_RETRY_POLICY);
      assert.strictEqual(retryExceeded, null, "Should return null for Dead-Letter Queue transition");

      const retryExceededMore = calculateNextRetryAt(10, DEFAULT_RETRY_POLICY);
      assert.strictEqual(retryExceededMore, null);
    });
  });

  describe("Idempotency Engine", () => {
    test("generates deterministic SHA-256 keys for identical inputs", () => {
      const key1 = generateIdempotencyKey("publish_reel", "page_123", "video_456");
      const key2 = generateIdempotencyKey("publish_reel", "page_123", "video_456");
      assert.strictEqual(key1, key2);
      assert.strictEqual(key1.length, 64);
    });

    test("generates distinct keys for distinct job actions or targets", () => {
      const keyA = generateIdempotencyKey("publish_reel", "page_123", "video_456");
      const keyB = generateIdempotencyKey("publish_reel", "page_999", "video_456");
      const keyC = generateIdempotencyKey("sync_analytics", "page_123");

      assert.notStrictEqual(keyA, keyB);
      assert.notStrictEqual(keyA, keyC);
    });
  });

  describe("Sensitive Secret Redaction & Logging Guard", () => {
    test("redacts Meta Graph API access tokens from strings", () => {
      const rawMsg = "Error publishing with token EAAG1234567890abcdef123 to page 456";
      const sanitized = redactSecrets(rawMsg);
      assert.strictEqual(sanitized.includes("EAAG1234567890abcdef123"), false);
      assert.ok(sanitized.includes("[REDACTED]"));
    });

    test("redacts OpenAI API keys from error objects", () => {
      const logContext = {
        provider: "openai",
        key: "sk-proj-1234567890abcdef1234567890",
        model: "gpt-4o",
      };
      const sanitized = redactSecrets(logContext);
      assert.strictEqual(sanitized.key, "[REDACTED]");
      assert.strictEqual(sanitized.model, "gpt-4o");
    });

    test("redacts password and authorization properties in nested objects", () => {
      const payload = {
        user: {
          email: "user@example.com",
          password: "SuperSecretPassword123!",
          accessToken: "EAABsampletoken",
        },
      };
      const clean = redactSecrets(payload);
      assert.strictEqual(clean.user.password, "[REDACTED]");
      assert.strictEqual(clean.user.accessToken, "[REDACTED]");
      assert.strictEqual(clean.user.email, "user@example.com");
    });
  });

  describe("Rate Limiting Engine", () => {
    test("permits requests within quota and decrements tokens accurately", () => {
      const testId = `test_user_${Date.now()}`;
      const res1 = checkRateLimit(testId, "video_rendering"); // Limit is 5
      assert.strictEqual(res1.allowed, true);
      assert.strictEqual(res1.remaining, 4);

      const res2 = checkRateLimit(testId, "video_rendering");
      assert.strictEqual(res2.allowed, true);
      assert.strictEqual(res2.remaining, 3);
    });

    test("blocks requests when limit is exhausted and supplies reset duration", () => {
      const testId = `rate_block_test_${Date.now()}`;
      // Exhaust 5 requests for video_rendering
      for (let i = 0; i < 5; i++) {
        checkRateLimit(testId, "video_rendering");
      }

      // 6th request must be rejected
      const blockedRes = checkRateLimit(testId, "video_rendering");
      assert.strictEqual(blockedRes.allowed, false);
      assert.strictEqual(blockedRes.remaining, 0);
      assert.ok(blockedRes.resetInSeconds > 0);
    });
  });

  describe("Production Environment Auditor", () => {
    test("validates environment without throwing unhandled exceptions", () => {
      const report = validateEnvironment();
      assert.ok(typeof report.environment === "string");
      assert.ok(Array.isArray(report.blockers));
      assert.ok(Array.isArray(report.warnings));
      assert.ok(typeof report.services.supabase === "boolean");
      assert.ok(typeof report.services.tokenEncryption === "boolean");
    });
  });
});
