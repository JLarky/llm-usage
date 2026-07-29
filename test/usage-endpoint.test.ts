import assert from "node:assert/strict";
import test from "node:test";

import apiController from "../app/actions/api/controller.tsx";
import type { UsageSubscriptionsDocument } from "../app/data/usage-types.ts";
import { routes } from "../app/routes.ts";
import { jsonResponse, parseUsageSubscriptionsDocument } from "../app/utils/usage-api.ts";
import { sampleUsageDocument } from "../app/data/users.ts";

void test("GET sample usage document has subscriptions", () => {
  const body = sampleUsageDocument();
  assert.ok(Array.isArray(body.subscriptions));
  assert.ok(body.subscriptions.length > 0);
  assert.equal(body.subscriptions[0]?.id, "cursor");
});

void test("POST body validation still works without hitting the router", () => {
  const parsed = parseUsageSubscriptionsDocument({
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
  });
  assert.equal(parsed.ok, true);
});

void test("unauthorized JSON helper returns 401 shape", () => {
  const response = jsonResponse({ error: "Unauthorized" }, 401);
  assert.equal(response.status, 401);
});

void test("api controller is wired for usage route", () => {
  assert.equal(typeof apiController, "object");
  assert.equal(routes.api.usage.method, "ANY");
  assert.equal(routes.api.migrateKv.method, "POST");
});

void test("sample document type matches UsageSubscriptionsDocument", () => {
  const body: UsageSubscriptionsDocument = sampleUsageDocument();
  assert.ok(body.subscriptions.length > 0);
});
