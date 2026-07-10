import { createController } from "remix/router";
import { randomUUID } from "node:crypto";

import {
  claimDeviceInvite,
  createUserWithPasskey,
  findUserIdByCredential,
  getDeviceInvite,
  getUser,
  updatePasskeyCounter,
} from "../../../data/users.ts";
import { setWebAuthnChallenge, takeWebAuthnChallenge } from "../../../middleware/auth-session.ts";
import { routes } from "../../../routes.ts";
import { jsonResponse } from "../../../utils/usage-api.ts";
import {
  createAuthenticationOptions,
  createRegistrationOptions,
  findPasskey,
  passkeyFromRegistration,
  resolveWebAuthnRequest,
  verifyAuthentication,
  verifyRegistration,
} from "../../../utils/passkeys.ts";

function badOrigin() {
  return jsonResponse({ error: "WebAuthn origin not allowed" }, 400);
}

export default createController(routes.api.auth, {
  actions: {
    async registerOptions({ request, session }) {
      const webauthn = resolveWebAuthnRequest(request);
      if (!webauthn) return badOrigin();

      const provisionalUserId = randomUUID();
      const options = await createRegistrationOptions({
        userId: provisionalUserId,
        userName: `user-${provisionalUserId.slice(0, 8)}`,
        rpID: webauthn.rpID,
      });
      setWebAuthnChallenge(session, "register", options.challenge, {
        userId: provisionalUserId,
      });
      return jsonResponse(options);
    },

    async registerVerify({ request, session }) {
      const webauthn = resolveWebAuthnRequest(request);
      if (!webauthn) return badOrigin();

      const pending = takeWebAuthnChallenge(session);
      if (!pending || pending.kind !== "register" || !pending.userId) {
        return jsonResponse({ error: "Missing registration challenge" }, 400);
      }

      let body: { response?: unknown; label?: string };
      try {
        body = (await request.json()) as { response?: unknown; label?: string };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      if (!body.response) return jsonResponse({ error: "Missing response" }, 400);

      const verification = await verifyRegistration({
        response: body.response as never,
        expectedChallenge: pending.challenge,
        expectedOrigin: webauthn.origin,
        expectedRPID: webauthn.rpID,
      });
      if (!verification.verified) {
        return jsonResponse({ error: "Registration verification failed" }, 400);
      }

      const passkey = passkeyFromRegistration(verification, body.label?.trim() || "Primary device");
      if (!passkey) return jsonResponse({ error: "Missing registration info" }, 400);

      const { user } = await createUserWithPasskey(passkey, pending.userId);
      session.regenerateId();
      session.set("userId", user.id);
      return jsonResponse({ ok: true, userId: user.id });
    },

    async loginOptions({ request, session }) {
      const webauthn = resolveWebAuthnRequest(request);
      if (!webauthn) return badOrigin();

      const options = await createAuthenticationOptions({ rpID: webauthn.rpID });
      setWebAuthnChallenge(session, "authenticate", options.challenge);
      return jsonResponse(options);
    },

    async loginVerify({ request, session }) {
      const webauthn = resolveWebAuthnRequest(request);
      if (!webauthn) return badOrigin();

      const pending = takeWebAuthnChallenge(session);
      if (!pending || pending.kind !== "authenticate") {
        return jsonResponse({ error: "Missing login challenge" }, 400);
      }

      let body: { response?: { id?: string } };
      try {
        body = (await request.json()) as { response?: { id?: string } };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const credentialId = body.response?.id;
      if (!credentialId || !body.response) {
        return jsonResponse({ error: "Missing response" }, 400);
      }

      const userId = await findUserIdByCredential(credentialId);
      if (!userId) return jsonResponse({ error: "Unknown passkey" }, 401);
      const user = await getUser(userId);
      if (!user) return jsonResponse({ error: "Unknown user" }, 401);
      const passkey = findPasskey(user, credentialId);
      if (!passkey) return jsonResponse({ error: "Unknown passkey" }, 401);

      const verification = await verifyAuthentication({
        response: body.response as never,
        expectedChallenge: pending.challenge,
        expectedOrigin: webauthn.origin,
        expectedRPID: webauthn.rpID,
        passkey,
      });
      if (!verification.verified) {
        return jsonResponse({ error: "Authentication verification failed" }, 401);
      }

      const newCounter = verification.authenticationInfo.newCounter;
      await updatePasskeyCounter(userId, credentialId, newCounter);
      session.regenerateId();
      session.set("userId", userId);
      return jsonResponse({ ok: true, userId });
    },

    async inviteOptions({ request, session }) {
      const webauthn = resolveWebAuthnRequest(request);
      if (!webauthn) return badOrigin();

      let body: { inviteId?: string };
      try {
        body = (await request.json()) as { inviteId?: string };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
      const inviteId = body.inviteId?.trim();
      if (!inviteId) return jsonResponse({ error: "Missing inviteId" }, 400);

      const invite = await getDeviceInvite(inviteId);
      if (!invite) return jsonResponse({ error: "Invite not found" }, 404);
      if (invite.claimedAt) return jsonResponse({ error: "Invite already used" }, 400);
      if (Date.parse(invite.expiresAt) < Date.now()) {
        return jsonResponse({ error: "Invite expired" }, 400);
      }

      const user = await getUser(invite.userId);
      if (!user) return jsonResponse({ error: "User not found" }, 404);

      const options = await createRegistrationOptions({
        userId: invite.userId,
        userName: `user-${invite.userId.slice(0, 8)}`,
        rpID: webauthn.rpID,
        excludeCredentials: user.passkeys,
      });
      setWebAuthnChallenge(session, "invite", options.challenge, { inviteId });
      return jsonResponse(options);
    },

    async inviteVerify({ request, session }) {
      const webauthn = resolveWebAuthnRequest(request);
      if (!webauthn) return badOrigin();

      const pending = takeWebAuthnChallenge(session);
      if (!pending || pending.kind !== "invite" || !pending.inviteId) {
        return jsonResponse({ error: "Missing invite challenge" }, 400);
      }

      let body: { response?: unknown; label?: string };
      try {
        body = (await request.json()) as { response?: unknown; label?: string };
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }
      if (!body.response) return jsonResponse({ error: "Missing response" }, 400);

      const verification = await verifyRegistration({
        response: body.response as never,
        expectedChallenge: pending.challenge,
        expectedOrigin: webauthn.origin,
        expectedRPID: webauthn.rpID,
      });
      if (!verification.verified) {
        return jsonResponse({ error: "Invite verification failed" }, 400);
      }

      const passkey = passkeyFromRegistration(verification, body.label?.trim() || "Linked device");
      if (!passkey) return jsonResponse({ error: "Missing registration info" }, 400);

      const claimed = await claimDeviceInvite(pending.inviteId, passkey);
      if (!claimed.ok) return jsonResponse({ error: claimed.error }, 400);

      session.regenerateId();
      session.set("userId", claimed.user.id);
      return jsonResponse({ ok: true, userId: claimed.user.id });
    },
  },
});
