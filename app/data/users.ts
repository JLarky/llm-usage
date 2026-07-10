import { createHash, randomBytes, randomUUID } from "node:crypto";

import { openKv, readLocalStore, writeLocalStore } from "./kv.ts";
import { defaultUsageSubscriptionsDocument } from "./usage-defaults.ts";
import type { UsageSubscriptionsDocument } from "./usage-types.ts";

export type PasskeyRecord = {
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  label: string;
  createdAt: string;
};

export type ApiTokenRecord = {
  id: string;
  name: string;
  tokenHash: string;
  prefix: string;
  createdAt: string;
};

export type DeviceInviteRecord = {
  id: string;
  createdAt: string;
  expiresAt: string;
  claimedAt: string | null;
};

export type UserRecord = {
  id: string;
  createdAt: string;
  passkeys: PasskeyRecord[];
  apiTokens: ApiTokenRecord[];
  deviceInvites: DeviceInviteRecord[];
};

export type InviteLookup = {
  userId: string;
  expiresAt: string;
  claimedAt: string | null;
};

export type TokenLookup = {
  userId: string;
  tokenId: string;
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

export function hashApiToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createApiTokenValue(): { token: string; prefix: string; tokenHash: string } {
  const token = `llu_${randomBytes(24).toString("base64url")}`;
  return { token, prefix: token.slice(0, 12), tokenHash: hashApiToken(token) };
}

export async function getUser(userId: string): Promise<UserRecord | null> {
  const kv = await openKv();
  if (kv) {
    const entry = await kv.get<UserRecord>(["user", userId]);
    return entry.value;
  }
  const store = await readLocalStore();
  const value = store.users[userId];
  return value ? (value as UserRecord) : null;
}

export async function saveUser(user: UserRecord): Promise<void> {
  const kv = await openKv();
  if (kv) {
    await kv.set(["user", user.id], user);
    return;
  }
  const store = await readLocalStore();
  store.users[user.id] = user;
  await writeLocalStore(store);
}

export async function findUserIdByCredential(credentialId: string): Promise<string | null> {
  const kv = await openKv();
  if (kv) {
    const entry = await kv.get<string>(["cred", credentialId]);
    return entry.value;
  }
  const store = await readLocalStore();
  return store.credIndex[credentialId] ?? null;
}

export async function indexCredential(credentialId: string, userId: string): Promise<void> {
  const kv = await openKv();
  if (kv) {
    await kv.set(["cred", credentialId], userId);
    return;
  }
  const store = await readLocalStore();
  store.credIndex[credentialId] = userId;
  await writeLocalStore(store);
}

export async function createUserWithPasskey(
  passkey: PasskeyRecord,
  userId: string = randomUUID(),
): Promise<{ user: UserRecord; usage: UsageSubscriptionsDocument }> {
  const user: UserRecord = {
    id: userId,
    createdAt: nowIso(),
    passkeys: [passkey],
    apiTokens: [],
    deviceInvites: [],
  };
  const usage = structuredClone(defaultUsageSubscriptionsDocument);
  await saveUser(user);
  await indexCredential(passkey.credentialId, user.id);
  await saveUserUsage(user.id, usage);
  return { user, usage };
}

export async function addPasskeyToUser(
  userId: string,
  passkey: PasskeyRecord,
): Promise<UserRecord | null> {
  const user = await getUser(userId);
  if (!user) return null;
  if (user.passkeys.some((entry) => entry.credentialId === passkey.credentialId)) {
    return user;
  }
  const next: UserRecord = { ...user, passkeys: [...user.passkeys, passkey] };
  await saveUser(next);
  await indexCredential(passkey.credentialId, userId);
  return next;
}

export async function updatePasskeyCounter(
  userId: string,
  credentialId: string,
  counter: number,
): Promise<void> {
  const user = await getUser(userId);
  if (!user) return;
  const next: UserRecord = {
    ...user,
    passkeys: user.passkeys.map((entry) =>
      entry.credentialId === credentialId ? { ...entry, counter } : entry,
    ),
  };
  await saveUser(next);
}

export async function createDeviceInvite(userId: string): Promise<DeviceInviteRecord | null> {
  const user = await getUser(userId);
  if (!user) return null;
  const invite: DeviceInviteRecord = {
    id: randomUUID(),
    createdAt: nowIso(),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
    claimedAt: null,
  };
  const next: UserRecord = {
    ...user,
    deviceInvites: [...user.deviceInvites, invite],
  };
  await saveUser(next);

  const lookup: InviteLookup = {
    userId,
    expiresAt: invite.expiresAt,
    claimedAt: null,
  };
  const kv = await openKv();
  if (kv) {
    await kv.set(["invite", invite.id], lookup);
  } else {
    const store = await readLocalStore();
    store.inviteIndex[invite.id] = lookup;
    await writeLocalStore(store);
  }
  return invite;
}

export async function getDeviceInvite(inviteId: string): Promise<InviteLookup | null> {
  const kv = await openKv();
  if (kv) {
    const entry = await kv.get<InviteLookup>(["invite", inviteId]);
    return entry.value;
  }
  const store = await readLocalStore();
  const value = store.inviteIndex[inviteId];
  return value ? (value as InviteLookup) : null;
}

export async function claimDeviceInvite(
  inviteId: string,
  passkey: PasskeyRecord,
): Promise<{ ok: true; user: UserRecord } | { ok: false; error: string }> {
  const invite = await getDeviceInvite(inviteId);
  if (!invite) return { ok: false, error: "Invite not found" };
  if (invite.claimedAt) return { ok: false, error: "Invite already used" };
  if (Date.parse(invite.expiresAt) < Date.now()) return { ok: false, error: "Invite expired" };

  const user = await addPasskeyToUser(invite.userId, passkey);
  if (!user) return { ok: false, error: "User not found" };

  const claimedAt = nowIso();
  const next: UserRecord = {
    ...user,
    deviceInvites: user.deviceInvites.map((entry) =>
      entry.id === inviteId ? { ...entry, claimedAt } : entry,
    ),
  };
  await saveUser(next);

  const lookup: InviteLookup = { ...invite, claimedAt };
  const kv = await openKv();
  if (kv) {
    await kv.set(["invite", inviteId], lookup);
  } else {
    const store = await readLocalStore();
    store.inviteIndex[inviteId] = lookup;
    await writeLocalStore(store);
  }

  return { ok: true, user: next };
}

export async function createUserApiToken(
  userId: string,
  name: string,
): Promise<{ ok: true; token: string; record: ApiTokenRecord } | { ok: false; error: string }> {
  const user = await getUser(userId);
  if (!user) return { ok: false, error: "User not found" };
  const trimmed = name.trim() || "default";
  const created = createApiTokenValue();
  const record: ApiTokenRecord = {
    id: randomUUID(),
    name: trimmed,
    tokenHash: created.tokenHash,
    prefix: created.prefix,
    createdAt: nowIso(),
  };
  const next: UserRecord = { ...user, apiTokens: [...user.apiTokens, record] };
  await saveUser(next);

  const lookup: TokenLookup = { userId, tokenId: record.id };
  const kv = await openKv();
  if (kv) {
    await kv.set(["apitoken", record.tokenHash], lookup);
  } else {
    const store = await readLocalStore();
    store.tokenIndex[record.tokenHash] = lookup;
    await writeLocalStore(store);
  }

  return { ok: true, token: created.token, record };
}

export async function revokeUserApiToken(
  userId: string,
  tokenId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser(userId);
  if (!user) return { ok: false, error: "User not found" };
  const existing = user.apiTokens.find((entry) => entry.id === tokenId);
  if (!existing) return { ok: false, error: "Token not found" };

  const next: UserRecord = {
    ...user,
    apiTokens: user.apiTokens.filter((entry) => entry.id !== tokenId),
  };
  await saveUser(next);

  const kv = await openKv();
  if (kv) {
    await kv.delete(["apitoken", existing.tokenHash]);
  } else {
    const store = await readLocalStore();
    delete store.tokenIndex[existing.tokenHash];
    await writeLocalStore(store);
  }
  return { ok: true };
}

export async function revokeDeviceInvite(
  userId: string,
  inviteId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser(userId);
  if (!user) return { ok: false, error: "User not found" };
  const existing = user.deviceInvites.find((entry) => entry.id === inviteId);
  if (!existing) return { ok: false, error: "Invite not found" };
  if (existing.claimedAt) return { ok: false, error: "Invite already used" };

  const next: UserRecord = {
    ...user,
    deviceInvites: user.deviceInvites.filter((entry) => entry.id !== inviteId),
  };
  await saveUser(next);

  const kv = await openKv();
  if (kv) {
    await kv.delete(["invite", inviteId]);
  } else {
    const store = await readLocalStore();
    delete store.inviteIndex[inviteId];
    await writeLocalStore(store);
  }
  return { ok: true };
}

/** Deletes the user record plus passkey, invite, API token, and usage indexes. */
export async function deleteUserAndData(
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getUser(userId);
  if (!user) return { ok: false, error: "User not found" };

  const kv = await openKv();
  if (kv) {
    for (const passkey of user.passkeys) {
      await kv.delete(["cred", passkey.credentialId]);
    }
    for (const invite of user.deviceInvites) {
      await kv.delete(["invite", invite.id]);
    }
    for (const token of user.apiTokens) {
      await kv.delete(["apitoken", token.tokenHash]);
    }
    await kv.delete(["usage", userId]);
    await kv.delete(["user", userId]);
    return { ok: true };
  }

  const store = await readLocalStore();
  for (const passkey of user.passkeys) {
    delete store.credIndex[passkey.credentialId];
  }
  for (const invite of user.deviceInvites) {
    delete store.inviteIndex[invite.id];
  }
  for (const token of user.apiTokens) {
    delete store.tokenIndex[token.tokenHash];
  }
  delete store.usage[userId];
  delete store.users[userId];
  await writeLocalStore(store);
  return { ok: true };
}

export async function resolveUserIdFromApiToken(token: string): Promise<string | null> {
  const tokenHash = hashApiToken(token);
  const kv = await openKv();
  if (kv) {
    const entry = await kv.get<TokenLookup>(["apitoken", tokenHash]);
    return entry.value?.userId ?? null;
  }
  const store = await readLocalStore();
  const value = store.tokenIndex[tokenHash] as TokenLookup | undefined;
  return value?.userId ?? null;
}

export async function loadUserUsage(userId: string): Promise<UsageSubscriptionsDocument> {
  const kv = await openKv();
  if (kv) {
    const entry = await kv.get<UsageSubscriptionsDocument>(["usage", userId]);
    if (entry.value?.subscriptions?.length) return entry.value;
    const seed = structuredClone(defaultUsageSubscriptionsDocument);
    await kv.set(["usage", userId], seed);
    return seed;
  }
  const store = await readLocalStore();
  const existing = store.usage[userId] as UsageSubscriptionsDocument | undefined;
  if (existing?.subscriptions?.length) return existing;
  const seed = structuredClone(defaultUsageSubscriptionsDocument);
  store.usage[userId] = seed;
  await writeLocalStore(store);
  return seed;
}

export async function saveUserUsage(
  userId: string,
  document: UsageSubscriptionsDocument,
): Promise<void> {
  const kv = await openKv();
  if (kv) {
    await kv.set(["usage", userId], document);
    return;
  }
  const store = await readLocalStore();
  store.usage[userId] = document;
  await writeLocalStore(store);
}

export function sampleUsageDocument(): UsageSubscriptionsDocument {
  return structuredClone(defaultUsageSubscriptionsDocument);
}

export function listPendingDeviceInvites(user: UserRecord): DeviceInviteRecord[] {
  return user.deviceInvites.filter(
    (invite) => invite.claimedAt == null && Date.parse(invite.expiresAt) >= Date.now(),
  );
}
