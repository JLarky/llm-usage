import assert from "node:assert/strict";
import test from "node:test";

import { defaultUsageSubscriptionsDocument } from "../app/data/usage-defaults.ts";
import {
  aggressiveBudget,
  buildUsagePlanRows,
  conservativeBudget,
  daysUntilReset,
  nextResetWindow,
} from "../app/utils/usage-budget.ts";
import { toUsageSubscriptionView, usedPercent } from "../app/utils/usage-subscription-view.ts";

const snapshot = new Date("2026-07-07T12:00:00");

void test("derives used percent and reported usage from used/total", () => {
  const cursor = defaultUsageSubscriptionsDocument.subscriptions.find((s) => s.id === "cursor");
  assert.ok(cursor);
  assert.equal(usedPercent(cursor), 30);

  const view = toUsageSubscriptionView(cursor);
  assert.equal(view.reportedUsage, "14/20 remains (m)");
});

void test("computes conservative under-budget range for cursor on planning snapshot date", () => {
  const cursor = defaultUsageSubscriptionsDocument.subscriptions.find((s) => s.id === "cursor");
  assert.ok(cursor);
  const view = toUsageSubscriptionView(cursor);

  const daysLeft = daysUntilReset(view.resetsAt, snapshot, 30);
  assert.equal(daysLeft, 4);
  assert.equal(conservativeBudget(view.usedPercent, daysLeft, 30), "30% → 87%");
  assert.equal(aggressiveBudget(view.usedPercent, daysLeft), "30% → 48%");
});

void test("uses real reset hour for same-day reset math and display", () => {
  const rows = buildUsagePlanRows(
    [
      toUsageSubscriptionView({
        id: "codex",
        provider: "Codex",
        emoji: "🤖",
        used: 30,
        total: 100,
        cycle: "weekly",
        resetsAt: "2026-07-09T12:00:00",
      }),
    ],
    new Date("2026-07-09T09:00:00-06:00"),
  );

  assert.equal(rows[0]?.daysLeft, "3h until July 9");
  assert.equal(rows[0]?.conservative, "30% → 98%");
  assert.equal(rows[0]?.aggressive, "30% → 100%");
  assert.equal(rows[0]?.timeElapsedLabel, "165h / 168h");
});

void test("rolls to next cycle only after reset time passes", () => {
  const resetWindow = nextResetWindow(
    "2026-07-09T00:10:00",
    7,
    new Date("2026-07-09T09:00:00-06:00"),
  );
  assert.equal(resetWindow.resetHappened, true);
  assert.equal(resetWindow.hoursLeft, 159);

  const rows = buildUsagePlanRows(
    [
      toUsageSubscriptionView({
        id: "codex",
        provider: "Codex",
        emoji: "🤖",
        used: 100,
        total: 100,
        cycle: "weekly",
        resetsAt: "2026-07-09T00:10:00",
      }),
    ],
    new Date("2026-07-09T09:00:00-06:00"),
  );

  assert.equal(rows[0]?.usedPercent, 0);
  assert.equal(rows[0]?.daysLeft, "6d until July 16");
  assert.equal(rows[0]?.conservative, "0% → 5%");
});

void test("sorts under-budget providers before overage and depleted", () => {
  const rows = buildUsagePlanRows(
    defaultUsageSubscriptionsDocument.subscriptions.map(toUsageSubscriptionView),
    snapshot,
  );
  assert.equal(rows[0]?.subscription.id, "cursor");
  assert.equal(rows.at(-1)?.subscription.id, "enterprise-codex");
});
