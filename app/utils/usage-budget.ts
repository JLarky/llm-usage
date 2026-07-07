import type { UsageCycle } from "../data/usage-types.ts";
import type { UsageSubscriptionView } from "./usage-subscription-view.ts";

export type UsagePlanRow = {
  subscription: UsageSubscriptionView;
  conservative: string;
  aggressive: string;
  budgetPerDay: string;
  daysLeft: string;
  timeTitle: string;
  sortKey: number;
};

const TZ = "America/Denver";
const MS_PER_DAY = 86_400_000;

export function cycleLengthDays(cycle: UsageCycle): number {
  return cycle === "weekly" ? 7 : 30;
}

function dateStrInTz(date: Date): string {
  return date.toLocaleDateString("en-CA", { timeZone: TZ });
}

function parseResetDate(resetsAt: string): string {
  return resetsAt.split("T")[0];
}

export function daysUntilReset(resetsAt: string, now = new Date()): number {
  const todayStr = dateStrInTz(now);
  const resetDateStr = parseResetDate(resetsAt);
  const todayMs = new Date(todayStr + "T00:00:00").getTime();
  const resetMs = new Date(resetDateStr + "T00:00:00").getTime();
  return Math.max(0, Math.round((resetMs - todayMs) / MS_PER_DAY));
}

export function formatDaysLeft(days: number, resetLabel: string): string {
  return `${days} until ${resetLabel}`;
}

function utcOffsetMsAt(date: Date, tz: string): number {
  const tzStr = date.toLocaleString("sv", { timeZone: tz, hour12: false });
  const utcStr = date.toLocaleString("sv", { timeZone: "UTC", hour12: false });
  const tzMs = new Date(tzStr.replace(" ", "T")).getTime();
  const utcMs = new Date(utcStr.replace(" ", "T")).getTime();
  return utcMs - tzMs;
}

function naiveToUtc(naiveIso: string): number {
  const d = new Date(naiveIso);
  return d.getTime() + utcOffsetMsAt(d, TZ);
}

export function hoursUntilReset(resetsAt: string, now = new Date()): number {
  const resetUtc = naiveToUtc(resetsAt);
  const diffMs = resetUtc - now.getTime();
  return Math.max(0, Math.round(diffMs / 3_600_000));
}

export function formatTimeUntilReset(hours: number): string {
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.round(hours % 24);
  if (remainingHours === 0) {
    return `${days} day${days > 1 ? "s" : ""}`;
  }
  return `${days} day${days > 1 ? "s" : ""} and ${remainingHours} hour${remainingHours > 1 ? "s" : ""}`;
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

      const timeTitle = formatTimeUntilReset(hoursUntilReset(subscription.resetsAt, now));

      return {
        subscription,
        conservative,
        aggressive,
        budgetPerDay: budgetPerDay(subscription.usedPercent, daysLeft, cycleDays),
        daysLeft: formatDaysLeft(daysLeft, subscription.resetLabel),
        timeTitle,
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
