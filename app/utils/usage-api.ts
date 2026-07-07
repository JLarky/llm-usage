import type {
  UsageCycle,
  UsageSubscriptionRecord,
  UsageSubscriptionsDocument,
} from "../data/usage-types.ts";

export type UsageDocumentParseResult =
  | { ok: true; value: UsageSubscriptionsDocument }
  | { ok: false; error: string };

const cycles = new Set<UsageCycle>(["weekly", "monthly"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSubscription(value: unknown, index: number): UsageSubscriptionRecord | string {
  if (!isRecord(value)) return `subscriptions[${index}] must be an object`;

  const { id, provider, emoji, used, total, cycle, resetsAt } = value;

  if (typeof id !== "string" || !id.trim()) {
    return `subscriptions[${index}].id must be a non-empty string`;
  }
  if (typeof provider !== "string" || !provider.trim()) {
    return `subscriptions[${index}].provider must be a non-empty string`;
  }
  if (typeof emoji !== "string" || !emoji) {
    return `subscriptions[${index}].emoji must be a string`;
  }
  if (typeof used !== "number" || !Number.isFinite(used) || used < 0) {
    return `subscriptions[${index}].used must be a non-negative number`;
  }
  if (typeof total !== "number" || !Number.isFinite(total) || total <= 0) {
    return `subscriptions[${index}].total must be a positive number`;
  }
  if (used > total) {
    return `subscriptions[${index}].used cannot exceed total`;
  }
  if (typeof cycle !== "string" || !cycles.has(cycle as UsageCycle)) {
    return `subscriptions[${index}].cycle must be "weekly" or "monthly"`;
  }
  if (typeof resetsAt !== "string" || Number.isNaN(Date.parse(resetsAt))) {
    return `subscriptions[${index}].resetsAt must be an ISO date string`;
  }

  return {
    id: id.trim(),
    provider: provider.trim(),
    emoji,
    used,
    total,
    cycle: cycle as UsageCycle,
    resetsAt,
  };
}

export function parseUsageSubscriptionsDocument(body: unknown): UsageDocumentParseResult {
  if (!isRecord(body)) {
    return { ok: false, error: "Body must be a JSON object with subscriptions" };
  }

  if (!Array.isArray(body.subscriptions)) {
    return { ok: false, error: "subscriptions must be an array" };
  }

  if (body.subscriptions.length === 0) {
    return { ok: false, error: "subscriptions must not be empty" };
  }

  const subscriptions: UsageSubscriptionRecord[] = [];
  const seenIds = new Set<string>();

  for (const [index, entry] of body.subscriptions.entries()) {
    const parsed = parseSubscription(entry, index);
    if (typeof parsed === "string") {
      return { ok: false, error: parsed };
    }
    if (seenIds.has(parsed.id)) {
      return { ok: false, error: `duplicate subscription id: ${parsed.id}` };
    }
    seenIds.add(parsed.id);
    subscriptions.push(parsed);
  }

  return { ok: true, value: { subscriptions } };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
