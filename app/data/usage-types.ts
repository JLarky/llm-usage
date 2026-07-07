export type UsageCycle = "weekly" | "monthly";

export type UsageSubscriptionRecord = {
  id: string;
  provider: string;
  emoji: string;
  used: number;
  total: number;
  cycle: UsageCycle;
  resetsAt: string;
};

export type UsageSubscriptionsDocument = {
  subscriptions: UsageSubscriptionRecord[];
};
