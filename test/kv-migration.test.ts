import assert from "node:assert/strict";
import test from "node:test";

import { KV_MIGRATION_KEY, KV_NAMESPACE, kvKey, type DenoKv } from "../app/data/kv.ts";
import { migrateLegacyKvRecords } from "../app/data/kv-migration.ts";

type Entry = { key: readonly string[]; value: unknown };

function fakeKv(initial: Entry[]): DenoKv {
  const values = new Map(initial.map((entry) => [JSON.stringify(entry.key), entry.value]));
  return {
    async get<T>(key: readonly string[]) {
      const value = values.get(JSON.stringify(key));
      return { value: value === undefined ? null : (value as T) };
    },
    async set(key: readonly string[], value: unknown) {
      values.set(JSON.stringify(key), value);
    },
    async delete(key: readonly string[]) {
      values.delete(JSON.stringify(key));
    },
    async *list<T>({ prefix }: { prefix: readonly string[] }) {
      const entries = [...values.entries()]
        .map(([encodedKey, value]) => ({
          key: JSON.parse(encodedKey) as readonly string[],
          value: value as T,
        }))
        .filter((entry) =>
          entry.key.slice(0, prefix.length).every((part, index) => part === prefix[index]),
        );
      yield* entries;
    },
  };
}

void test("migrates legacy records once into the app namespace", async () => {
  assert.equal(KV_NAMESPACE, "llm-usage");
  assert.deepEqual(kvKey("user", "example"), ["llm-usage", "user", "example"]);
  assert.deepEqual(KV_MIGRATION_KEY, ["llm-usage", "migration", "legacy-v1"]);

  const kv = fakeKv([
    { key: ["user", "alice"], value: { id: "alice" } },
    { key: ["usage", "alice"], value: { subscriptions: [] } },
    { key: ["other", "record"], value: "untouched" },
  ]);

  const result = await migrateLegacyKvRecords(kv);
  assert.deepEqual(result, { status: "migrated", copied: 2, skipped: 0 });
  assert.deepEqual(await kv.get(kvKey("user", "alice")), { value: { id: "alice" } });
  assert.deepEqual(await kv.get(["user", "alice"]), { value: { id: "alice" } });

  const repeat = await migrateLegacyKvRecords(kv);
  assert.deepEqual(repeat, { status: "already-complete", copied: 2, skipped: 0 });
});
