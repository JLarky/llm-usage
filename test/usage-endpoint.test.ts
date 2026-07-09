import assert from "node:assert/strict";
import test from "node:test";
import { createRouter } from "remix/router";

import apiController from "../app/actions/api/controller.tsx";
import type { UsageSubscriptionsDocument } from "../app/data/usage-types.ts";
import { routes } from "../app/routes.ts";

const router = createRouter();
(router as any).map(routes.api, apiController);

async function readJson(response: Response): Promise<unknown> {
  return JSON.parse(await response.text());
}

void test("GET /api/usage returns current usage document", async () => {
  const response = await router.fetch(new Request("http://test/api/usage"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/json; charset=utf-8");

  const body = (await readJson(response)) as UsageSubscriptionsDocument;
  assert.ok(Array.isArray(body.subscriptions));
  assert.ok(body.subscriptions.length > 0);
  assert.equal(body.subscriptions[0]?.id, "cursor");
});

void test("POST /api/usage still requires auth", async () => {
  const response = await router.fetch(
    new Request("http://test/api/usage", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        subscriptions: [
          {
            id: "cursor",
            provider: "Cursor",
            emoji: "🟢",
            used: 1,
            total: 20,
            cycle: "weekly",
            resetsAt: "2026-07-11T16:00:00",
          },
        ],
      }),
    }),
  );

  assert.equal(response.status, 503);
});

void test("unsupported methods return 405", async () => {
  const response = await router.fetch(
    new Request("http://test/api/usage", {
      method: "DELETE",
    }),
  );

  assert.equal(response.status, 405);
  assert.deepEqual(await readJson(response), { error: "Method Not Allowed" });
});
