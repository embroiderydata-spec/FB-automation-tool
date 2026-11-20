import test from "node:test";
import assert from "node:assert/strict";
import { getManagedPages, getPageDetails } from "../lib/meta/graph";

test("Meta Graph API Integration Suite", async (t) => {
  const originalFetch = global.fetch;

  t.afterEach(() => {
    global.fetch = originalFetch;
  });

  await t.test("getManagedPages correctly fetches and parses multi-page pagination responses", async () => {
    let callCount = 0;

    // Mock multi-page responses with cursor pagination
    global.fetch = (async (url: string | URL) => {
      callCount++;

      if (callCount === 1) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: "page_101",
                name: "AI Innovators",
                category: "Technology",
                picture: { data: { url: "https://example.com/p1.png" } },
                tasks: ["MANAGE", "CREATE_CONTENT"],
                access_token: "mock_token_page_101",
              },
            ],
            paging: {
              next: "https://graph.facebook.com/v21.0/me/accounts?after=cursor_2",
            },
          }),
        } as Response;
      } else {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: "page_102",
                name: "Viral Clips Hub",
                category: "Entertainment",
                picture: { data: { url: "https://example.com/p2.png" } },
                tasks: ["MANAGE"],
                access_token: "mock_token_page_102",
              },
            ],
            paging: {},
          }),
        } as Response;
      }
    }) as any;

    const pages = await getManagedPages("mock_user_token");

    assert.strictEqual(callCount, 2);
    assert.strictEqual(pages.length, 2);
    assert.strictEqual(pages[0].id, "page_101");
    assert.strictEqual(pages[0].name, "AI Innovators");
    assert.strictEqual(pages[1].id, "page_102");
    assert.strictEqual(pages[1].name, "Viral Clips Hub");
  });

  await t.test("getManagedPages throws specific error when Meta returns code 190 (expired token)", async () => {
    global.fetch = (async () => ({
      ok: false,
      json: async () => ({
        error: {
          message: "Error validating access token: Session has expired.",
          type: "OAuthException",
          code: 190,
        },
      }),
    })) as any;

    await assert.rejects(
      async () => {
        await getManagedPages("expired_token");
      },
      (err: any) => {
        assert.match(err.message, /Meta session expired \(Code 190\)/);
        return true;
      }
    );
  });

  await t.test("getManagedPages handles rate limit codes (4, 17, 32, 613)", async () => {
    global.fetch = (async () => ({
      ok: false,
      json: async () => ({
        error: {
          message: "(#4) Application request limit reached",
          type: "OAuthException",
          code: 4,
        },
      }),
    })) as any;

    await assert.rejects(
      async () => {
        await getManagedPages("mock_token");
      },
      (err: any) => {
        assert.match(err.message, /rate limit reached/i);
        return true;
      }
    );
  });

  await t.test("getPageDetails accurately extracts followers_count, fan_count and tasks", async () => {
    global.fetch = (async () => ({
      ok: true,
      json: async () => ({
        id: "page_999",
        name: "Sync Test Page",
        category: "Media",
        followers_count: 54200,
        fan_count: 53900,
        tasks: ["MODERATE", "CREATE_CONTENT"],
        picture: { data: { url: "https://example.com/sync.jpg" } },
      }),
    })) as any;

    const details = await getPageDetails("page_999", "mock_page_token");

    assert.strictEqual(details.id, "page_999");
    assert.strictEqual(details.name, "Sync Test Page");
    assert.strictEqual(details.followersCount, 54200);
    assert.strictEqual(details.category, "Media");
  });
});
