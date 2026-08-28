import assert from "node:assert/strict";
import test from "node:test";

import { defaultUsageSubscriptionsDocument } from "../app/data/usage-defaults.ts";
import {
  aggressiveBudget,
  buildUsagePlanDocument,
  buildUsagePlanRows,
  conservativeBudget,
  daysUntilReset,
  nextResetWindow,
  parseHorizon,
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

void test("plan JSON exposes conservative daily cap for weekly Codex", () => {
  const now = new Date("2026-08-28T16:26:00.000Z");
  const plan = buildUsagePlanDocument(
    {
      subscriptions: [
        {
          id: "chatgpt-codex",
          provider: "My Codex",
          emoji: "🟣",
          used: 6,
          total: 100,
          cycle: "weekly",
          resetsAt: "2026-09-03T16:26:56.000Z",
        },
      ],
    },
    now,
    parseHorizon(null),
  );

  assert.equal(plan.horizon, "cycle");
  assert.equal(plan.now, now.toISOString());
  assert.equal(plan.subscriptions.length, 1);
  const codex = plan.subscriptions[0];
  assert.ok(codex);
  assert.equal(codex.id, "chatgpt-codex");
  assert.equal(codex.usedPercent, 6);
  assert.equal(codex.conservative, "6% → 14%");
  assert.ok(codex.conservativeTarget != null);
  assert.equal(Math.round(codex.conservativeTarget), 14);
  assert.match(codex.budgetPerDay, /^14\.3%/);
});

void test("plan JSON matches homepage rows field-for-field", () => {
  const now = snapshot;
  const horizon = parseHorizon("cycle");
  const views = defaultUsageSubscriptionsDocument.subscriptions.map(toUsageSubscriptionView);
  const rows = buildUsagePlanRows(views, now, horizon);
  const plan = buildUsagePlanDocument(defaultUsageSubscriptionsDocument, now, horizon);

  assert.equal(plan.subscriptions.length, rows.length);
  for (const [index, row] of rows.entries()) {
    const json = plan.subscriptions[index];
    assert.ok(json);
    assert.equal(json.id, row.subscription.id);
    assert.equal(json.provider, row.subscription.provider);
    assert.equal(json.conservative, row.conservative);
    assert.equal(json.conservativeTarget, row.conservativeTarget);
    assert.equal(json.aggressive, row.aggressive);
    assert.equal(json.aggressiveTarget, row.aggressiveTarget);
    assert.equal(json.budgetPerDay, row.budgetPerDay);
    assert.equal(json.daysLeft, row.daysLeft);
    assert.equal(json.usedPercent, row.usedPercent);
    assert.equal(json.reportedUsage, row.subscription.reportedUsage);
    assert.equal(json.timeElapsedPercent, row.timeElapsedPercent);
    assert.equal(json.timeElapsedLabel, row.timeElapsedLabel);
  }
});
