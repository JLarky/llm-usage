import { createCookie } from "remix/cookie";
import { session } from "remix/middleware/session";
import { redirect } from "remix/response/redirect";
import { createCookieSessionStorage } from "remix/session-storage/cookie";

const FALLBACK_SECRET = "llm-usage-local-dev-session-secret";
const LOGIN_PATH = "/login";
const ADMIN_PATH = "/admin";

const sessionSecret = process.env.SESSION_SECRET ?? FALLBACK_SECRET;
const authSessionCookie = createCookie("__llm_usage_session", {
  secrets: [sessionSecret],
  httpOnly: true,
  sameSite: "Lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
});
const authSessionStorage = createCookieSessionStorage();

export function authSession() {
  return session(authSessionCookie, authSessionStorage);
}

export function normalizeReturnTo(value: FormDataEntryValue | string | null | undefined): string {
  const raw = typeof value === "string" ? value : "";
  if (!raw.startsWith("/")) return ADMIN_PATH;
  if (raw.startsWith("//")) return ADMIN_PATH;
  return raw;
}

export function loginHref(returnTo?: string): string {
  const href = new URL(LOGIN_PATH, "http://local");
  const normalized = normalizeReturnTo(returnTo ?? ADMIN_PATH);
  if (normalized !== ADMIN_PATH) href.searchParams.set("returnTo", normalized);
  return `${href.pathname}${href.search}`;
}

export function requireUserId(sessionState: { get(key: string): unknown }): string | null {
  const value = sessionState.get("userId");
  return typeof value === "string" && value.trim() ? value : null;
}

export function redirectToLogin(returnTo?: string): Response {
  return redirect(loginHref(returnTo));
}

export type WebAuthnChallengeKind = "register" | "authenticate" | "invite";

export function setWebAuthnChallenge(
  sessionState: { set(key: string, value: unknown): void },
  kind: WebAuthnChallengeKind,
  challenge: string,
  extra?: Record<string, string>,
): void {
  sessionState.set("webauthn", { kind, challenge, ...extra });
}

export function takeWebAuthnChallenge(sessionState: {
  get(key: string): unknown;
  unset(key: string): void;
}): { kind: WebAuthnChallengeKind; challenge: string; inviteId?: string; userId?: string } | null {
  const value = sessionState.get("webauthn");
  sessionState.unset("webauthn");
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.challenge !== "string") return null;
  if (record.kind !== "register" && record.kind !== "authenticate" && record.kind !== "invite") {
    return null;
  }
  return {
    kind: record.kind,
    challenge: record.challenge,
    inviteId: typeof record.inviteId === "string" ? record.inviteId : undefined,
    userId: typeof record.userId === "string" ? record.userId : undefined,
  };
}
