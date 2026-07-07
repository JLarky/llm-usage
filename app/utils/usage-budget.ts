import type { UsageCycle } from "../data/usage-types.ts";
import type { UsageSubscriptionView } from "./usage-subscription-view.ts";

export type UsagePlanRow = {
  subscription: UsageSubscriptionView;
  conservative: string;
  aggressive: string;
  budgetPerDay: string;
  daysLeft: string;
  sortKey: number;
};

const MS_PER_DAY = 86_400_000;

export function cycleLengthDays(cycle: UsageCycle): number {
  return cycle === "weekly" ? 7 : 30;
}

export function daysUntilReset(resetsAt: string, now = new Date()): number {
  const reset = new Date(resetsAt);
  const startUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const endUtc = Date.UTC(reset.getUTCFullYear(), reset.getUTCMonth(), reset.getUTCDate());
  return Math.max(0, Math.round((endUtc - startUtc) / MS_PER_DAY));
}

export function formatDaysLeft(days: number, resetLabel: string): string {
  return `${days} until ${resetLabel}`;
}

export function conservativeBudget(
  usedPercent: number,
  daysLeft: number,
  cycleDays: number,
): string {
  if (usedPercent >= 100) return "depleted";

  const dayOfCycle = Math.max(1, cycleDays - daysLeft);
  const expectedMax = (dayOfCycle / cycleDays) * 100;

  if (usedPercent < expectedMax) {
    return `${Math.round(usedPercent)}% → ${Math.round(expectedMax)}%`;
  }

  return `overage of ${Math.round(usedPercent - expectedMax)}%`;
}

export function aggressiveBudget(usedPercent: number, daysLeft: number): string {
  if (usedPercent >= 100) return "depleted";
  if (daysLeft <= 0) return `${Math.round(usedPercent)}%`;

  const evenPace = (100 - usedPercent) / daysLeft;
  const end = Math.min(100, usedPercent + evenPace);
  return `${Math.round(usedPercent)}% → ${Math.round(end)}%`;
}

export function budgetPerDay(usedPercent: number, daysLeft: number, cycleDays: number): string {
  if (usedPercent >= 100) return "—";
  if (daysLeft <= 0) return "—";

  const dayOfCycle = Math.max(1, cycleDays - daysLeft);
  const expectedMax = (dayOfCycle / cycleDays) * 100;
  const timeProportional = Math.max(0, (expectedMax - usedPercent) / daysLeft);
  const evenPace = (100 - usedPercent) / daysLeft;

  return `${timeProportional.toFixed(1)}% (${evenPace.toFixed(1)}%)`;
}

function sortKey(
  usedPercent: number,
  daysLeft: number,
  cycleDays: number,
  conservative: string,
  depleted: boolean,
): number {
  if (depleted || conservative === "depleted") return 10_000;
  if (conservative.startsWith("overage of ")) {
    const amount = Number.parseInt(conservative.replace("overage of ", "").replace("%", ""), 10);
    return 1_000 + (Number.isFinite(amount) ? amount : 999);
  }

  const dayOfCycle = Math.max(1, cycleDays - daysLeft);
  const expectedMax = (dayOfCycle / cycleDays) * 100;
  return -(expectedMax - usedPercent);
}

export function buildUsagePlanRows(
  subscriptions: UsageSubscriptionView[],
  now = new Date(),
): UsagePlanRow[] {
  return subscriptions
    .map((subscription) => {
      const daysLeft = daysUntilReset(subscription.resetsAt, now);
      const cycleDays = cycleLengthDays(subscription.cycle);
      const conservative = conservativeBudget(subscription.usedPercent, daysLeft, cycleDays);
      const aggressive = aggressiveBudget(subscription.usedPercent, daysLeft);

      return {
        subscription,
        conservative,
        aggressive,
        budgetPerDay: budgetPerDay(subscription.usedPercent, daysLeft, cycleDays),
        daysLeft: formatDaysLeft(daysLeft, subscription.resetLabel),
        sortKey: sortKey(
          subscription.usedPercent,
          daysLeft,
          cycleDays,
          conservative,
          subscription.depleted,
        ),
      };
    })
    .sort(
      (a, b) =>
        a.sortKey - b.sortKey || a.subscription.provider.localeCompare(b.subscription.provider),
    );
}
