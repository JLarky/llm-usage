import type { UsageSubscriptionsDocument, UsageSubscriptionRecord } from "./usage-types.ts";
import { parseUsageSubscriptionsDocument } from "../utils/usage-api.ts";

function values(formData: FormData, field: string): string[] {
  return formData.getAll(field).map((value) => (typeof value === "string" ? value : ""));
}

export function parseUsageSubscriptionsForm(
  formData: FormData,
): { ok: true; value: UsageSubscriptionsDocument } | { ok: false; error: string } {
  const ids = values(formData, "id");
  const providers = values(formData, "provider");
  const emojis = values(formData, "emoji");
  const used = values(formData, "used");
  const total = values(formData, "total");
  const cycles = values(formData, "cycle");
  const resetsAt = values(formData, "resetsAt");

  const count = ids.length;
  if (
    !count ||
    providers.length !== count ||
    emojis.length !== count ||
    used.length !== count ||
    total.length !== count ||
    cycles.length !== count ||
    resetsAt.length !== count
  ) {
    return { ok: false, error: "Incomplete subscription form submission" };
  }

  const subscriptions: UsageSubscriptionRecord[] = ids.map((id, index) => ({
    id,
    provider: providers[index] ?? "",
    emoji: emojis[index] ?? "",
    used: Number(used[index]),
    total: Number(total[index]),
    cycle: (cycles[index] ?? "") as UsageSubscriptionRecord["cycle"],
    resetsAt: resetsAt[index] ?? "",
  }));

  return parseUsageSubscriptionsDocument({ subscriptions });
}
