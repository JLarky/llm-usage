import type { UsageCycle } from "../data/usage-types.ts";
import type { UsageSubscriptionView } from "./usage-subscription-view.ts";

export type TimeHorizon = "cycle" | "day" | "hour";

export type UsagePlanRow = {
  subscription: UsageSubscriptionView;
  conservative: string;
  aggressive: string;
  budgetPerDay: string;
  daysLeft: string;
  timeTitle: string;
  sortKey: number;
  usedPercent: number;
  conservativeTarget: number | null;
  aggressiveTarget: number | null;
  timeElapsedPercent: number;
  timeElapsedLabel: string;
};

export type ProjectionSeries = {
  id: string;
  label: string;
  color: string;
  conservative: number[];
  aggressive: number[];
};

export type ProjectionData = {
  series: ProjectionSeries[];
  combined: ProjectionSeries | null;
  days: number;
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

export function aggressiveBudget(
  usedPercent: number,
  daysLeft: number,
  cycleDays: number = 30,
  horizon: TimeHorizon = "cycle",
): string {
  if (usedPercent >= 100) return "depleted";
  if (daysLeft <= 0) return `${Math.round(usedPercent)}%`;

  let pace: number;
  if (horizon === "day") {
    pace = 100 / cycleDays;
  } else if (horizon === "hour") {
    pace = 100 / (cycleDays * 24);
  } else {
    pace = (100 - usedPercent) / daysLeft;
  }

  const end = Math.min(100, usedPercent + pace);
  return `${Math.round(usedPercent)}% → ${Math.round(end)}%`;
}

export function budgetPerDay(usedPercent: number, daysLeft: number, cycleDays: number): string {
  if (usedPercent >= 100) return "—";
  if (daysLeft <= 0) return "—";

  const flatDailyRate = 100 / cycleDays;
  const evenPace = (100 - usedPercent) / daysLeft;

  return `${flatDailyRate.toFixed(1)}% (${evenPace.toFixed(1)}%)`;
}

export function conservativeTargetValue(
  usedPercent: number,
  daysLeft: number,
  cycleDays: number,
): number | null {
  if (usedPercent >= 100) return null;
  const dayOfCycle = Math.max(1, cycleDays - daysLeft);
  return (dayOfCycle / cycleDays) * 100;
}

export function aggressiveTargetValue(
  usedPercent: number,
  daysLeft: number,
  cycleDays: number,
  horizon: TimeHorizon = "cycle",
): number | null {
  if (usedPercent >= 100) return null;
  if (daysLeft <= 0) return null;
  let pace: number;
  if (horizon === "day") {
    pace = 100 / cycleDays;
  } else if (horizon === "hour") {
    pace = 100 / (cycleDays * 24);
  } else {
    pace = (100 - usedPercent) / daysLeft;
  }
  return Math.min(100, usedPercent + pace);
}

const PALETTE = [
  "#22c55e",
  "#a855f7",
  "#eab308",
  "#3b82f6",
  "#14b8a6",
  "#ef4444",
  "#f97316",
  "#ec4899",
];

export function buildProjectionData(
  subscriptions: UsageSubscriptionView[],
  now: Date,
  horizon: TimeHorizon,
  days: number = 30,
): ProjectionData {
  const active = subscriptions.filter((s) => !s.depleted);

  const series: ProjectionSeries[] = active.map((s, i) => {
    const cycleDays = cycleLengthDays(s.cycle);
    const dl = daysUntilReset(s.resetsAt, now);
    const dayOfCycle = Math.max(1, cycleDays - dl);

    const con: number[] = [];
    const agg: number[] = [];

    for (let d = 0; d <= days; d++) {
      if (d < dl) {
        const cycDay = dayOfCycle + d;
        con.push((cycDay / cycleDays) * 100);
        const pace =
          horizon === "day"
            ? 100 / cycleDays
            : horizon === "hour"
              ? 100 / (cycleDays * 24)
              : (100 - s.usedPercent) / dl;
        agg.push(Math.min(100, s.usedPercent + d * pace));
      } else {
        const daysSinceReset = d - dl;
        const cyclePos = daysSinceReset % cycleDays;
        con.push((cyclePos / cycleDays) * 100);
        const pace = 100 / cycleDays;
        agg.push(Math.min(100, daysSinceReset * pace));
      }
    }

    return {
      id: s.id,
      label: `${s.emoji} ${s.provider}`,
      color: PALETTE[i % PALETTE.length],
      conservative: con,
      aggressive: agg,
    };
  });

  const combined: ProjectionSeries | null =
    series.length > 0
      ? {
          id: "combined",
          label: "Combined avg",
          color: "#2dacf9",
          conservative: series[0].conservative.map((_, d) => {
            const sum = series.reduce((a, s) => a + s.conservative[d], 0);
            return Math.round((sum / series.length) * 10) / 10;
          }),
          aggressive: series[0].aggressive.map((_, d) => {
            const sum = series.reduce((a, s) => a + s.aggressive[d], 0);
            return Math.round((sum / series.length) * 10) / 10;
          }),
        }
      : null;

  return { series, combined, days };
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
  horizon: TimeHorizon = "cycle",
): UsagePlanRow[] {
  return subscriptions
    .map((subscription) => {
      const daysLeft = daysUntilReset(subscription.resetsAt, now);
      const cycleDays = cycleLengthDays(subscription.cycle);
      const conservative = conservativeBudget(subscription.usedPercent, daysLeft, cycleDays);
      const aggressive = aggressiveBudget(subscription.usedPercent, daysLeft, cycleDays, horizon);

      const timeTitle = formatTimeUntilReset(hoursUntilReset(subscription.resetsAt, now));

      const dayOfCycle = Math.max(1, cycleDays - daysLeft);
      const elapsedPct = Math.round((dayOfCycle / cycleDays) * 1000) / 10;
      const elapsedLabel = `${dayOfCycle}d / ${cycleDays}d`;

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
        usedPercent: subscription.usedPercent,
        conservativeTarget: conservativeTargetValue(subscription.usedPercent, daysLeft, cycleDays),
        aggressiveTarget: aggressiveTargetValue(
          subscription.usedPercent,
          daysLeft,
          cycleDays,
          horizon,
        ),
        timeElapsedPercent: elapsedPct,
        timeElapsedLabel: elapsedLabel,
      };
    })
    .sort(
      (a, b) =>
        a.sortKey - b.sortKey || a.subscription.provider.localeCompare(b.subscription.provider),
    );
}
