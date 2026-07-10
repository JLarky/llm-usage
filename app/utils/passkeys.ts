import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticatorTransportFuture,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
} from "@simplewebauthn/server";

import type { PasskeyRecord, UserRecord } from "../data/users.ts";

function configuredOrigins(): string[] {
  const configured = process.env.WEBAUTHN_ORIGIN;
  if (configured) {
    return configured
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  }
  return ["http://localhost:4576", "http://localhost:5173", "http://127.0.0.1:4576"];
}

function defaultRpID(hostname: string): string {
  if (hostname === "localhost" || hostname === "127.0.0.1") return "localhost";
  if (hostname === "jlarky.deno.net" || hostname.endsWith(".jlarky.deno.net")) {
    return "jlarky.deno.net";
  }
  return hostname;
}

export function isAllowedWebAuthnOrigin(origin: string): boolean {
  if (configuredOrigins().includes(origin)) return true;
  try {
    const url = new URL(origin);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      return url.protocol === "http:" || url.protocol === "https:";
    }
    if (url.hostname === "jlarky.deno.net" || url.hostname.endsWith(".jlarky.deno.net")) {
      return url.protocol === "https:";
    }
  } catch {
    return false;
  }
  return false;
}

export function resolveWebAuthnRequest(request: Request): { origin: string; rpID: string } | null {
  const requestUrl = new URL(request.url);
  const headerOrigin = request.headers.get("origin");
  const origin = headerOrigin && headerOrigin !== "null" ? headerOrigin : requestUrl.origin;
  if (!isAllowedWebAuthnOrigin(origin)) return null;

  const hostname = new URL(origin).hostname;
  const rpID = process.env.WEBAUTHN_RP_ID ?? defaultRpID(hostname);
  return { origin, rpID };
}

function rpName(): string {
  return process.env.WEBAUTHN_RP_NAME ?? "llm-usage";
}

export async function createRegistrationOptions(args: {
  userId: string;
  userName: string;
  rpID: string;
  excludeCredentials?: PasskeyRecord[];
}): Promise<PublicKeyCredentialCreationOptionsJSON> {
  return generateRegistrationOptions({
    rpName: rpName(),
    rpID: args.rpID,
    userName: args.userName,
    userID: new TextEncoder().encode(args.userId),
    attestationType: "none",
    excludeCredentials: (args.excludeCredentials ?? []).map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    // Sets hints: ["client-device"] and authenticatorAttachment: "platform"
    preferredAuthenticatorType: "localDevice",
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      residentKey: "preferred",
      userVerification: "required",
    },
  });
}

export async function createAuthenticationOptions(args: {
  rpID: string;
  allowCredentials?: PasskeyRecord[];
}): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const options = await generateAuthenticationOptions({
    rpID: args.rpID,
    userVerification: "required",
    allowCredentials: args.allowCredentials?.map((passkey) => ({
      id: passkey.credentialId,
      transports: passkey.transports as AuthenticatorTransportFuture[] | undefined,
    })),
  });

  return {
    ...options,
    // Prefer this Mac/phone authenticator over QR / security key UI
    hints: ["client-device"],
  };
}

export async function verifyRegistration(args: {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
  expectedOrigin: string;
  expectedRPID: string;
}): Promise<VerifiedRegistrationResponse> {
  return verifyRegistrationResponse({
    response: args.response,
    expectedChallenge: args.expectedChallenge,
    expectedOrigin: args.expectedOrigin,
    expectedRPID: args.expectedRPID,
  });
}

export async function verifyAuthentication(args: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  expectedOrigin: string;
  expectedRPID: string;
  passkey: PasskeyRecord;
}): Promise<VerifiedAuthenticationResponse> {
  return verifyAuthenticationResponse({
    response: args.response,
    expectedChallenge: args.expectedChallenge,
    expectedOrigin: args.expectedOrigin,
    expectedRPID: args.expectedRPID,
    credential: {
      id: args.passkey.credentialId,
      publicKey: Buffer.from(args.passkey.publicKey, "base64url"),
      counter: args.passkey.counter,
      transports: args.passkey.transports as AuthenticatorTransportFuture[] | undefined,
    },
  });
}

export function passkeyFromRegistration(
  verification: VerifiedRegistrationResponse,
  label: string,
): PasskeyRecord | null {
  const { registrationInfo } = verification;
  if (!registrationInfo) return null;
  const { credential, credentialDeviceType } = registrationInfo;
  return {
    credentialId: credential.id,
    publicKey: Buffer.from(credential.publicKey).toString("base64url"),
    counter: credential.counter,
    transports: credential.transports,
    label: label || (credentialDeviceType === "multiDevice" ? "Passkey" : "This device"),
    createdAt: new Date().toISOString(),
  };
}

export function findPasskey(user: UserRecord, credentialId: string): PasskeyRecord | null {
  return user.passkeys.find((entry) => entry.credentialId === credentialId) ?? null;
}
