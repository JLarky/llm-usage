import { KV_MIGRATION_KEY, kvKey, openKv, type DenoKv } from "./kv.ts";

const LEGACY_KEY_PREFIXES = ["user", "cred", "invite", "apitoken", "usage"] as const;

export type KvMigrationResult = {
  status: "migrated" | "already-complete";
  copied: number;
  skipped: number;
};

function isLegacyKey(key: readonly string[], prefix: string): boolean {
  return key.length > 1 && key[0] === prefix;
}

export async function migrateLegacyKvRecords(kv: DenoKv): Promise<KvMigrationResult> {
  const completed = await kv.get<KvMigrationResult>(KV_MIGRATION_KEY);
  if (completed.value) {
    return { ...completed.value, status: "already-complete" };
  }

  let copied = 0;
  let skipped = 0;
  for (const prefix of LEGACY_KEY_PREFIXES) {
    for await (const entry of kv.list<unknown>({ prefix: [prefix] })) {
      if (!isLegacyKey(entry.key, prefix)) continue;
      const target = kvKey(...entry.key);
      const existing = await kv.get(target);
      if (existing.value !== null) {
        skipped += 1;
        continue;
      }
      await kv.set(target, entry.value);
      copied += 1;
    }
  }

  const result = { status: "migrated" as const, copied, skipped };
  await kv.set(KV_MIGRATION_KEY, result);
  return result;
}

export async function migrateLegacyKv(): Promise<KvMigrationResult | null> {
  const kv = await openKv();
  return kv ? migrateLegacyKvRecords(kv) : null;
}
