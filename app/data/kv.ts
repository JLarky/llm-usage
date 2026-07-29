import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type DenoKv = {
  get: <T>(key: readonly string[]) => Promise<{ value: T | null }>;
  set: (key: readonly string[], value: unknown) => Promise<unknown>;
  delete: (key: readonly string[]) => Promise<unknown>;
};

export const KV_NAMESPACE = "llm-usage";

export function kvKey(...parts: string[]): readonly string[] {
  return [KV_NAMESPACE, ...parts];
}

type DenoRuntime = {
  openKv: (url?: string) => Promise<DenoKv>;
};

const LOCAL_STORE_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../data/app-store.local.json",
);

export type LocalAppStore = {
  users: Record<string, unknown>;
  credIndex: Record<string, string>;
  inviteIndex: Record<string, unknown>;
  tokenIndex: Record<string, unknown>;
  usage: Record<string, unknown>;
};

function emptyStore(): LocalAppStore {
  return { users: {}, credIndex: {}, inviteIndex: {}, tokenIndex: {}, usage: {} };
}

function getDenoRuntime(): DenoRuntime | null {
  const deno = (globalThis as { Deno?: DenoRuntime }).Deno;
  return deno?.openKv ? deno : null;
}

export async function openKv(): Promise<DenoKv | null> {
  const deno = getDenoRuntime();
  if (!deno) return null;
  const url = process.env.DENO_KV_URL;
  return url ? deno.openKv(url) : deno.openKv();
}

export async function readLocalStore(): Promise<LocalAppStore> {
  try {
    const raw = await readFile(LOCAL_STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as Partial<LocalAppStore>;
    return {
      users: parsed.users ?? {},
      credIndex: parsed.credIndex ?? {},
      inviteIndex: parsed.inviteIndex ?? {},
      tokenIndex: parsed.tokenIndex ?? {},
      usage: parsed.usage ?? {},
    };
  } catch {
    return emptyStore();
  }
}

export async function writeLocalStore(store: LocalAppStore): Promise<void> {
  await writeFile(LOCAL_STORE_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}
