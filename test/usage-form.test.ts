import assert from "node:assert/strict";
import test from "node:test";

import { parseUsageSubscriptionsForm } from "../app/data/usage-form.ts";
import { loginHref, normalizeReturnTo } from "../app/middleware/auth-session.ts";
import {
  createApiTokenValue,
  hashApiToken,
  listPendingDeviceInvites,
  type UserRecord,
} from "../app/data/users.ts";

void test("parses admin usage form into subscriptions document", () => {
  const formData = new FormData();
  formData.append("id", "cursor");
  formData.append("provider", "Cursor");
  formData.append("emoji", "🟢");
  formData.append("used", "18");
  formData.append("total", "20");
  formData.append("cycle", "weekly");
  formData.append("resetsAt", "2026-07-11T16:00:00");

  const parsed = parseUsageSubscriptionsForm(formData);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.value.subscriptions[0]?.id, "cursor");
    assert.equal(parsed.value.subscriptions[0]?.used, 18);
    assert.equal(parsed.value.subscriptions[0]?.cycle, "weekly");
  }
});

void test("rejects incomplete admin usage form submissions", () => {
  const formData = new FormData();
  formData.append("id", "cursor");
  formData.append("provider", "Cursor");

  const parsed = parseUsageSubscriptionsForm(formData);
  assert.equal(parsed.ok, false);
  if (!parsed.ok) {
    assert.match(parsed.error, /Incomplete subscription form submission/);
  }
});

void test("normalizes returnTo to safe local paths", () => {
  assert.equal(normalizeReturnTo("/admin?tab=users"), "/admin?tab=users");
  assert.equal(normalizeReturnTo("https://evil.example"), "/admin");
  assert.equal(normalizeReturnTo("//evil.example"), "/admin");
  assert.equal(loginHref("/admin?tab=users"), "/login?returnTo=%2Fadmin%3Ftab%3Dusers");
});

void test("hashes API tokens stably", () => {
  const created = createApiTokenValue();
  assert.match(created.token, /^llu_/);
  assert.equal(hashApiToken(created.token), created.tokenHash);
});

void test("lists only pending unexpired device invites", () => {
  const user: UserRecord = {
    id: "u1",
    createdAt: "2026-07-10T00:00:00.000Z",
    passkeys: [],
    apiTokens: [],
    deviceInvites: [
      {
        id: "a",
        createdAt: "2026-07-10T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        claimedAt: null,
      },
      {
        id: "b",
        createdAt: "2026-07-10T00:00:00.000Z",
        expiresAt: "2099-01-01T00:00:00.000Z",
        claimedAt: "2026-07-10T01:00:00.000Z",
      },
      {
        id: "c",
        createdAt: "2026-07-01T00:00:00.000Z",
        expiresAt: "2026-07-02T00:00:00.000Z",
        claimedAt: null,
      },
    ],
  };

  const pending = listPendingDeviceInvites(user);
  assert.deepEqual(
    pending.map((invite) => invite.id),
    ["a"],
  );
});
