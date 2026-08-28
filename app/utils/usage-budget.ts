import type { UsageCycle, UsageSubscriptionsDocument } from "../data/usage-types.ts";
import { toUsageSubscriptionView, type UsageSubscriptionView } from "./usage-subscription-view.ts";

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

export function parseTimeShift(shiftParam: string | null): number {
  if (!shiftParam) return 0;
  const match = shiftParam.match(/^(-?\d+)([dh])$/);
  if (!match) return 0;
  const amount = Number.parseInt(match[1], 10);
  const unit = match[2];
  return unit === "d" ? amount * MS_PER_DAY : unit === "h" ? amount * 3_600_000 : 0;
}

export function formatTimeShift(shiftMs: number): string {
  if (shiftMs === 0) return "Now";
  const totalHours = Math.round(shiftMs / 3_600_000);
  if (totalHours % 24 === 0) {
    const days = totalHours / 24;
    return days > 0 ? `+${days}d` : `${days}d`;
  }
  return totalHours > 0 ? `+${totalHours}h` : `${totalHours}h`;
}

export function cycleLengthDays(cycle: UsageCycle): number {
  return cycle === "weekly" ? 7 : 30;
}

function utcOffsetMsAt(date: Date, tz: string): number {
  const tzStr = date.toLocaleString("sv", { timeZone: tz, hour12: false });
  const utcStr = date.toLocaleString("sv", { timeZone: "UTC", hour12: false });
  const tzMs = new Date(tzStr.replace(" ", "T")).getTime();
  const utcMs = new Date(utcStr.replace(" ", "T")).getTime();
  return utcMs - tzMs;
}

function naiveToUtc(naiveIso: string): number {
  const match = naiveIso.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2})(?::(\d{2}))?(?::(\d{2}))?(?:\.\d+)?$/,
  );
  if (!match) return new Date(naiveIso).getTime();

  const [, year, month, day, hour, minute = "00", second = "00"] = match;
  const utcGuess = Date.UTC(
    Number.parseInt(year, 10),
    Number.parseInt(month, 10) - 1,
    Number.parseInt(day, 10),
    Number.parseInt(hour, 10),
    Number.parseInt(minute, 10),
    Number.parseInt(second, 10),
  );

  return utcGuess + utcOffsetMsAt(new Date(utcGuess), TZ);
}

export function hoursUntilReset(resetsAt: string, now = new Date()): number {
  const resetUtc = naiveToUtc(resetsAt);
  const diffMs = resetUtc - now.getTime();
  return Math.max(0, Math.round(diffMs / 3_600_000));
}

type ResetWindow = {
  nextResetUtc: number;
  hoursLeft: number;
  timeLeftDays: number;
  resetHappened: boolean;
};

export function nextResetWindow(
  resetsAt: string,
  cycleDays: number,
  now = new Date(),
): ResetWindow {
  const cycleMs = cycleDays * MS_PER_DAY;
  const nowMs = now.getTime();
  let nextResetUtc = naiveToUtc(resetsAt);
  let resetHappened = false;

  while (nextResetUtc <= nowMs) {
    nextResetUtc += cycleMs;
    resetHappened = true;
  }

  const diffMs = Math.max(0, nextResetUtc - nowMs);
  const hoursLeft = Math.round(diffMs / 3_600_000);

  return {
    nextResetUtc,
    hoursLeft,
    timeLeftDays: diffMs / MS_PER_DAY,
    resetHappened,
  };
}

export function daysUntilReset(resetsAt: string, now = new Date(), cycleDays = 30): number {
  return Math.floor(nextResetWindow(resetsAt, cycleDays, now).timeLeftDays);
}

export function formatDaysLeft(hoursLeft: number, resetLabel: string): string {
  if (hoursLeft < 24) return `${hoursLeft}h until ${resetLabel}`;
  return `${Math.floor(hoursLeft / 24)}d until ${resetLabel}`;
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
  timeLeftDays: number,
  cycleDays: number,
): string {
  if (usedPercent >= 100) return "depleted";

  const dayOfCycle = Math.max(0, cycleDays - timeLeftDays);
  const expectedMax = (dayOfCycle / cycleDays) * 100;

  if (usedPercent < expectedMax) {
    return `${Math.round(usedPercent)}% → ${Math.round(expectedMax)}%`;
  }

  return `overage of ${Math.round(usedPercent - expectedMax)}%`;
}

export function aggressiveBudget(
  usedPercent: number,
  timeLeftDays: number,
  cycleDays: number = 30,
  horizon: TimeHorizon = "cycle",
): string {
  if (usedPercent >= 100) return "depleted";
  if (timeLeftDays <= 0) return `${Math.round(usedPercent)}%`;

  let pace: number;
  if (horizon === "day") {
    pace = 100 / cycleDays;
  } else if (horizon === "hour") {
    pace = 100 / (cycleDays * 24);
  } else {
    pace = (100 - usedPercent) / timeLeftDays;
  }

  const end = Math.min(100, usedPercent + pace);
  return `${Math.round(usedPercent)}% → ${Math.round(end)}%`;
}

export function budgetPerDay(usedPercent: number, timeLeftDays: number, cycleDays: number): string {
  if (usedPercent >= 100) return "—";
  if (timeLeftDays <= 0) return "—";

  const flatDailyRate = 100 / cycleDays;
  const evenPace = (100 - usedPercent) / timeLeftDays;

  return `${flatDailyRate.toFixed(1)}% (${evenPace.toFixed(1)}%)`;
}

export function conservativeTargetValue(
  usedPercent: number,
  timeLeftDays: number,
  cycleDays: number,
): number | null {
  if (usedPercent >= 100) return null;
  const dayOfCycle = Math.max(0, cycleDays - timeLeftDays);
  return (dayOfCycle / cycleDays) * 100;
}

export function aggressiveTargetValue(
  usedPercent: number,
  timeLeftDays: number,
  cycleDays: number,
  horizon: TimeHorizon = "cycle",
): number | null {
  if (usedPercent >= 100) return null;
  if (timeLeftDays <= 0) return null;
  let pace: number;
  if (horizon === "day") {
    pace = 100 / cycleDays;
  } else if (horizon === "hour") {
    pace = 100 / (cycleDays * 24);
  } else {
    pace = (100 - usedPercent) / timeLeftDays;
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
    const resetWindow = nextResetWindow(s.resetsAt, cycleDays, now);
    const timeLeftDays = resetWindow.timeLeftDays;
    const dayOfCycle = Math.max(0, cycleDays - timeLeftDays);

    const con: number[] = [];
    const agg: number[] = [];

    for (let d = 0; d <= days; d++) {
      if (d < timeLeftDays) {
        const cycDay = dayOfCycle + d;
        con.push((cycDay / cycleDays) * 100);
        const pace =
          horizon === "day"
            ? 100 / cycleDays
            : horizon === "hour"
              ? 100 / (cycleDays * 24)
              : (100 - s.usedPercent) / timeLeftDays;
        agg.push(Math.min(100, s.usedPercent + d * pace));
      } else {
        const daysSinceReset = d - timeLeftDays;
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
  timeLeftDays: number,
  cycleDays: number,
  conservative: string,
  depleted: boolean,
): number {
  if (depleted || conservative === "depleted") return 10_000;
  if (conservative.startsWith("overage of ")) {
    const amount = Number.parseInt(conservative.replace("overage of ", "").replace("%", ""), 10);
    return 1_000 + (Number.isFinite(amount) ? amount : 999);
  }

  const dayOfCycle = Math.max(0, cycleDays - timeLeftDays);
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
      const cycleDays = cycleLengthDays(subscription.cycle);
      const resetWindow = nextResetWindow(subscription.resetsAt, cycleDays, now);
      const nextResetDate = new Date(resetWindow.nextResetUtc);
      const labelMonth = nextResetDate.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
      const labelDay = nextResetDate.getUTCDate();
      const resetLabel = `${labelMonth} ${labelDay}`;

      const effectiveUsed = resetWindow.resetHappened ? 0 : subscription.usedPercent;
      const effectiveDepleted = resetWindow.resetHappened ? false : subscription.depleted;

      const conservative = conservativeBudget(effectiveUsed, resetWindow.timeLeftDays, cycleDays);
      const aggressive = aggressiveBudget(
        effectiveUsed,
        resetWindow.timeLeftDays,
        cycleDays,
        horizon,
      );

      const timeTitle = formatTimeUntilReset(resetWindow.hoursLeft);

      const elapsedHours = Math.round((cycleDays - resetWindow.timeLeftDays) * 24);
      const cycleHours = cycleDays * 24;
      const elapsedPct =
        Math.round(((cycleDays - resetWindow.timeLeftDays) / cycleDays) * 1000) / 10;
      const elapsedLabel = `${elapsedHours}h / ${cycleHours}h`;
      const displayHoursLeft = Math.max(0, resetWindow.hoursLeft);

      return {
        subscription,
        conservative,
        aggressive,
        budgetPerDay: budgetPerDay(effectiveUsed, resetWindow.timeLeftDays, cycleDays),
        daysLeft: formatDaysLeft(displayHoursLeft, resetLabel),
        timeTitle,
        sortKey: sortKey(
          effectiveUsed,
          resetWindow.timeLeftDays,
          cycleDays,
          conservative,
          effectiveDepleted,
        ),
        usedPercent: effectiveUsed,
        conservativeTarget: conservativeTargetValue(
          effectiveUsed,
          resetWindow.timeLeftDays,
          cycleDays,
        ),
        aggressiveTarget: aggressiveTargetValue(
          effectiveUsed,
          resetWindow.timeLeftDays,
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

export type UsagePlanSubscriptionJson = {
  id: string;
  provider: string;
  emoji: string;
  used: number;
  total: number;
  usedPercent: number;
  cycle: UsageCycle;
  resetsAt: string;
  conservative: string;
  conservativeTarget: number | null;
  aggressive: string;
  aggressiveTarget: number | null;
  budgetPerDay: string;
  daysLeft: string;
  timeElapsedPercent: number;
  timeElapsedLabel: string;
  reportedUsage: string;
};

export type UsagePlanDocument = {
  now: string;
  horizon: TimeHorizon;
  subscriptions: UsagePlanSubscriptionJson[];
};

export function parseHorizon(value: string | null): TimeHorizon {
  return value === "day" || value === "hour" ? value : "cycle";
}

export function parsePlanNow(value: string | null): Date | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

export function buildUsagePlanDocument(
  document: UsageSubscriptionsDocument,
  now = new Date(),
  horizon: TimeHorizon = "cycle",
): UsagePlanDocument {
  // Keep this a pure projection of homepage rows. HomePage renders
  // UsagePlanRow fields; this JSON must copy those same strings/numbers.
  const rows = buildUsagePlanRows(
    document.subscriptions.map(toUsageSubscriptionView),
    now,
    horizon,
  );
  return {
    now: now.toISOString(),
    horizon,
    subscriptions: rows.map((row) => ({
      id: row.subscription.id,
      provider: row.subscription.provider,
      emoji: row.subscription.emoji,
      used: row.subscription.used,
      total: row.subscription.total,
      usedPercent: row.usedPercent,
      cycle: row.subscription.cycle,
      resetsAt: row.subscription.resetsAt,
      conservative: row.conservative,
      conservativeTarget: row.conservativeTarget,
      aggressive: row.aggressive,
      aggressiveTarget: row.aggressiveTarget,
      budgetPerDay: row.budgetPerDay,
      daysLeft: row.daysLeft,
      timeElapsedPercent: row.timeElapsedPercent,
      timeElapsedLabel: row.timeElapsedLabel,
      reportedUsage: row.subscription.reportedUsage,
    })),
  };
}
