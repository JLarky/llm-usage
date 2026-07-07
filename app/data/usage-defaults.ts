import type { UsageSubscriptionsDocument } from "./usage-types.ts";

import defaultDocument from "../../data/usage-subscriptions.default.json" with { type: "json" };

export const defaultUsageSubscriptionsDocument = defaultDocument as UsageSubscriptionsDocument;
