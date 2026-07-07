import type { UsageCycle, UsageSubscriptionRecord } from "../data/usage-types.ts";

export type UsageSubscriptionView = {
  id: string;
  provider: string;
  emoji: string;
  used: number;
  total: number;
  usedPercent: number;
  reportedUsage: string;
  cycle: UsageCycle;
  resetsAt: string;
  resetLabel: string;
  depleted: boolean;
};

const cycleSuffix: Record<UsageCycle, string> = {
  weekly: "w",
  monthly: "m",
};

export function usedPercent(record: UsageSubscriptionRecord): number {
  if (record.total <= 0) return 0;
  return Math.min(100, (record.used / record.total) * 100);
}

export function formatResetLabel(resetsAt: string): string {
  const date = new Date(resetsAt);
  const month = date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const day = date.getUTCDate();
  return `${month} ${day}`;
}

export function formatReportedUsage(record: UsageSubscriptionRecord): string {
  const suffix = cycleSuffix[record.cycle];
  const percent = Math.round(usedPercent(record));

  if (record.total === 100) {
    const remains = 100 - percent;
    if (remains <= 0) return `${percent}% used (${suffix})`;
    return `${remains}% remains (${suffix})`;
  }

  const remains = Math.max(0, record.total - record.used);
  return `${remains}/${record.total} remains (${suffix})`;
}

export function toUsageSubscriptionView(record: UsageSubscriptionRecord): UsageSubscriptionView {
  const percent = usedPercent(record);
  return {
    id: record.id,
    provider: record.provider,
    emoji: record.emoji,
    used: record.used,
    total: record.total,
    usedPercent: percent,
    reportedUsage: formatReportedUsage(record),
    cycle: record.cycle,
    resetsAt: record.resetsAt,
    resetLabel: formatResetLabel(record.resetsAt),
    depleted: record.used >= record.total,
  };
}
