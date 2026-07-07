import assert from "node:assert/strict";
import test from "node:test";

import { defaultUsageSubscriptionsDocument } from "../app/data/usage-defaults.ts";
import {
  aggressiveBudget,
  buildUsagePlanRows,
  conservativeBudget,
  daysUntilReset,
} from "../app/utils/usage-budget.ts";
import { toUsageSubscriptionView, usedPercent } from "../app/utils/usage-subscription-view.ts";

const snapshot = new Date("2026-07-07T12:00:00");

test("derives used percent and reported usage from used/total", () => {
  const cursor = defaultUsageSubscriptionsDocument.subscriptions.find((s) => s.id === "cursor");
  assert.ok(cursor);
  assert.equal(usedPercent(cursor), 30);

  const view = toUsageSubscriptionView(cursor);
  assert.equal(view.reportedUsage, "14/20 remains (m)");
});

test("computes conservative under-budget range for cursor on planning snapshot date", () => {
  const cursor = defaultUsageSubscriptionsDocument.subscriptions.find((s) => s.id === "cursor");
  assert.ok(cursor);
  const view = toUsageSubscriptionView(cursor);

  const daysLeft = daysUntilReset(view.resetsAt, snapshot);
  assert.equal(daysLeft, 4);
  assert.equal(conservativeBudget(view.usedPercent, daysLeft, 30), "30% → 87%");
  assert.equal(aggressiveBudget(view.usedPercent, daysLeft), "30% → 48%");
});

test("sorts under-budget providers before overage and depleted", () => {
  const rows = buildUsagePlanRows(
    defaultUsageSubscriptionsDocument.subscriptions.map(toUsageSubscriptionView),
    snapshot,
  );
  assert.equal(rows[0]?.subscription.id, "cursor");
  assert.equal(rows.at(-1)?.subscription.id, "enterprise-codex");
});
