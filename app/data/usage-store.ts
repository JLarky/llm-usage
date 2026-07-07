import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defaultUsageSubscriptionsDocument } from "./usage-defaults.ts";
import type { UsageSubscriptionsDocument } from "./usage-types.ts";

const KV_KEY = ["usage", "subscriptions"] as const;
const LOCAL_STORE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/usage-subscriptions.local.json",
);

type DenoKv = {
  get: <T>(key: readonly string[]) => Promise<{ value: T | null }>;
  set: (key: readonly string[], value: unknown) => Promise<unknown>;
};

type DenoRuntime = {
  openKv: (url?: string) => Promise<DenoKv>;
};

function getDenoRuntime(): DenoRuntime | null {
  const deno = (globalThis as { Deno?: DenoRuntime }).Deno;
  return deno?.openKv ? deno : null;
}

async function openKv(): Promise<DenoKv | null> {
  const deno = getDenoRuntime();
  if (!deno) return null;

  const url = process.env.DENO_KV_URL;
  return url ? deno.openKv(url) : deno.openKv();
}

async function readLocalFile(): Promise<UsageSubscriptionsDocument | null> {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, "utf8");
    return JSON.parse(raw) as UsageSubscriptionsDocument;
  } catch {
    return null;
  }
}

async function writeLocalFile(document: UsageSubscriptionsDocument): Promise<void> {
  await writeFile(LOCAL_STORE_PATH, `${JSON.stringify(document, null, 2)}\n`, "utf8");
}

export async function loadUsageSubscriptions(): Promise<UsageSubscriptionsDocument> {
  const kv = await openKv();
  if (kv) {
    const entry = await kv.get<UsageSubscriptionsDocument>(KV_KEY);
    if (entry.value?.subscriptions?.length) {
      return entry.value;
    }

    const seed = defaultUsageSubscriptionsDocument;
    await kv.set(KV_KEY, seed);
    return seed;
  }

  return (await readLocalFile()) ?? defaultUsageSubscriptionsDocument;
}

export async function saveUsageSubscriptions(document: UsageSubscriptionsDocument): Promise<void> {
  const kv = await openKv();
  if (kv) {
    await kv.set(KV_KEY, document);
    return;
  }

  await writeLocalFile(document);
}
