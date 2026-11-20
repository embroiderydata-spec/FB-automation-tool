import test from "node:test";
import assert from "node:assert/strict";
import { generateOAuthState, validateOAuthState } from "../lib/meta/oauth";
import { getOAuthDialogUrl, META_CONFIG } from "../lib/meta/config";

test("Meta OAuth & CSRF Protection Suite", async (t) => {
  await t.test("generateOAuthState produces a 64-character random hex string", () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();

    assert.strictEqual(state1.length, 64);
    assert.strictEqual(state2.length, 64);
    assert.notStrictEqual(state1, state2);
    assert.match(state1, /^[0-9a-fA-F]{64}$/);
  });

  await t.test("validateOAuthState succeeds when stateParam matches stateCookie", () => {
    const state = generateOAuthState();
    const isValid = validateOAuthState(state, state);
    assert.strictEqual(isValid, true);
  });

  await t.test("validateOAuthState rejects mismatched states", () => {
    const state1 = generateOAuthState();
    const state2 = generateOAuthState();
    const isValid = validateOAuthState(state1, state2);
    assert.strictEqual(isValid, false);
  });

  await t.test("validateOAuthState safely rejects null or undefined states", () => {
    assert.strictEqual(validateOAuthState(null, "some_state"), false);
    assert.strictEqual(validateOAuthState("some_state", null), false);
    assert.strictEqual(validateOAuthState(null, null), false);
  });

  await t.test("getOAuthDialogUrl constructs URL with centralized Graph API version and required scopes", () => {
    const state = "test_state_123456";
    const urlString = getOAuthDialogUrl(state);
    const url = new URL(urlString);

    assert.strictEqual(url.origin, "https://www.facebook.com");
    assert.strictEqual(url.pathname, `/${META_CONFIG.graphApiVersion}/dialog/oauth`);
    assert.strictEqual(url.searchParams.get("state"), state);
    assert.strictEqual(url.searchParams.get("response_type"), "code");

    const scopes = url.searchParams.get("scope")?.split(",") || [];
    assert.strictEqual(scopes.includes("pages_show_list"), true);
    assert.strictEqual(scopes.includes("pages_read_engagement"), true);
    assert.strictEqual(scopes.includes("pages_manage_posts"), true);
  });
});
