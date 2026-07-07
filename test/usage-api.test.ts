import assert from "node:assert/strict";
import test from "node:test";

import { parseUsageSubscriptionsDocument } from "../app/utils/usage-api.ts";

test("accepts a valid subscriptions document", () => {
  const parsed = parseUsageSubscriptionsDocument({
    subscriptions: [
      {
        id: "cursor",
        provider: "Cursor",
        emoji: "🟢",
        used: 6,
        total: 20,
        cycle: "monthly",
        resetsAt: "2026-07-11T16:00:00",
      },
    ],
  });

  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.subscriptions[0]?.used, 6);
  }
});

test("rejects used above total", () => {
  const parsed = parseUsageSubscriptionsDocument({
    subscriptions: [
      {
        id: "cursor",
        provider: "Cursor",
        emoji: "🟢",
        used: 25,
        total: 20,
        cycle: "monthly",
        resetsAt: "2026-07-11T16:00:00",
      },
    ],
  });

  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.match(parsed.error, /used cannot exceed total/);
  }
});
