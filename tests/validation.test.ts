import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  PageSettingsUpdateSchema,
  PageImportSchema,
  AutomationToggleSchema,
  DisconnectAccountSchema,
} from "../lib/validations/facebook";

test("Zod Validation Schemas Suite", async (t) => {
  await t.test("PageSettingsUpdateSchema parses valid partial settings updates", () => {
    const validData = {
      niche: "AI & Tech",
      content_category: "Technology",
      posts_per_day: 2,
      aspect_ratio: "9:16" as const,
      auto_publish: false,
    };

    const res = PageSettingsUpdateSchema.safeParse(validData);
    assert.strictEqual(res.success, true);
    if (res.success) {
      assert.strictEqual(res.data.niche, "AI & Tech");
      assert.strictEqual(res.data.content_category, "Technology");
      assert.strictEqual(res.data.posts_per_day, 2);
      assert.strictEqual(res.data.aspect_ratio, "9:16");
      assert.strictEqual(res.data.auto_publish, false);
    }
  });

  await t.test("PageSettingsUpdateSchema rejects invalid aspect ratios", () => {
    const invalidData = {
      aspect_ratio: "4:3", // only '9:16', '16:9', '1:1' allowed
    };

    const res = PageSettingsUpdateSchema.safeParse(invalidData);
    assert.strictEqual(res.success, false);
  });

  await t.test("PageSettingsUpdateSchema rejects duration_min exceeding upper bound", () => {
    const invalidData = {
      video_duration_min: 500, // max is 300
    };

    const res = PageSettingsUpdateSchema.safeParse(invalidData);
    assert.strictEqual(res.success, false);
  });

  await t.test("PageImportSchema accepts valid account UUID and 1 to 100 pages", () => {
    const valid = {
      account_id: crypto.randomUUID(),
      page_ids: ["page_1", "page_2", "page_3"],
    };

    const res = PageImportSchema.safeParse(valid);
    assert.strictEqual(res.success, true);
  });

  await t.test("PageImportSchema rejects invalid UUID", () => {
    const invalid = {
      account_id: "not-a-valid-uuid",
      page_ids: ["page_1"],
    };

    const res = PageImportSchema.safeParse(invalid);
    assert.strictEqual(res.success, false);
  });

  await t.test("PageImportSchema rejects empty page_ids list", () => {
    const invalid = {
      account_id: crypto.randomUUID(),
      page_ids: [],
    };

    const res = PageImportSchema.safeParse(invalid);
    assert.strictEqual(res.success, false);
  });

  await t.test("AutomationToggleSchema parses boolean properly", () => {
    assert.strictEqual(AutomationToggleSchema.safeParse({ enabled: true }).success, true);
    assert.strictEqual(AutomationToggleSchema.safeParse({ enabled: false }).success, true);
    assert.strictEqual(AutomationToggleSchema.safeParse({ enabled: "true" }).success, false);
  });

  await t.test("DisconnectAccountSchema enforces valid UUID", () => {
    assert.strictEqual(
      DisconnectAccountSchema.safeParse({
        account_id: crypto.randomUUID(),
      }).success,
      true
    );
    assert.strictEqual(
      DisconnectAccountSchema.safeParse({ account_id: "123" }).success,
      false
    );
  });
});
