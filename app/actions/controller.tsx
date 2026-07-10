import { createController } from "remix/router";
import { redirect } from "remix/response/redirect";

import { parseUsageSubscriptionsForm } from "../data/usage-form.ts";
import {
  createDeviceInvite,
  createUserApiToken,
  getDeviceInvite,
  getUser,
  listPendingDeviceInvites,
  loadUserUsage,
  revokeUserApiToken,
  sampleUsageDocument,
  saveUserUsage,
} from "../data/users.ts";
import { normalizeReturnTo, redirectToLogin, requireUserId } from "../middleware/auth-session.ts";
import { routes } from "../routes.ts";
import { AdminPage } from "../ui/admin-page.tsx";
import { HomePage } from "../ui/home-page.tsx";
import { InvitePage } from "../ui/invite-page.tsx";
import { LoginPage } from "../ui/login-page.tsx";
import type { TimeHorizon } from "../utils/usage-budget.ts";
import { buildUsagePlanRows, parseTimeShift } from "../utils/usage-budget.ts";
import { toUsageSubscriptionView } from "../utils/usage-subscription-view.ts";

function textField(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function withQuery(href: string, params: Record<string, string | null | undefined>): string {
  const url = new URL(href, "http://local");
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    url.searchParams.set(key, value);
  }
  return `${url.pathname}${url.search}`;
}

function adminNotice(url: URL): string | null {
  if (url.searchParams.get("saved") === "1") return "Saved usage subscriptions.";
  const invite = url.searchParams.get("deviceInvite");
  if (invite) {
    return `Device invite ready. Share this link once: /invite/${invite}`;
  }
  const token = url.searchParams.get("token");
  if (token) return `API token created. Copy it now — it will not be shown again: ${token}`;
  if (url.searchParams.get("revoked") === "1") return "API token revoked.";
  return null;
}

export default createController(routes, {
  actions: {
    async home(context) {
      const url = new URL(context.request.url);
      const horizonParam = url.searchParams.get("horizon");
      const horizon: TimeHorizon =
        horizonParam === "day" || horizonParam === "hour" ? horizonParam : "cycle";
      const shiftMs = parseTimeShift(url.searchParams.get("shift"));
      const now = new Date(Date.now() + shiftMs);
      const userId = requireUserId(context.session);
      const document = userId ? await loadUserUsage(userId) : sampleUsageDocument();
      const rows = buildUsagePlanRows(
        document.subscriptions.map(toUsageSubscriptionView),
        now,
        horizon,
      );
      return context.render(
        <HomePage
          rows={rows}
          horizon={horizon}
          now={now}
          shiftMs={shiftMs}
          signedIn={userId != null}
          userId={userId}
        />,
      );
    },

    async login(context) {
      const url = new URL(context.request.url);
      const returnTo = normalizeReturnTo(url.searchParams.get("returnTo"));
      const userId = requireUserId(context.session);
      if (userId) return redirect(returnTo);
      return context.render(
        <LoginPage error={url.searchParams.get("error")} returnTo={returnTo} />,
      );
    },

    async logout(context) {
      context.session.unset("userId");
      context.session.regenerateId();
      return redirect(routes.home.href());
    },

    async invite(context) {
      const inviteId = context.params.inviteId;
      const userId = requireUserId(context.session);
      if (userId) return redirect(routes.admin.href());

      const invite = await getDeviceInvite(inviteId);
      if (!invite) {
        return context.render(<InvitePage error="Invite not found" inviteId={inviteId} />, {
          status: 404,
        });
      }
      if (invite.claimedAt) {
        return context.render(<InvitePage error="Invite already used" inviteId={inviteId} />, {
          status: 400,
        });
      }
      if (Date.parse(invite.expiresAt) < Date.now()) {
        return context.render(<InvitePage error="Invite expired" inviteId={inviteId} />, {
          status: 400,
        });
      }

      return context.render(<InvitePage error={null} inviteId={inviteId} />);
    },

    async admin(context) {
      const userId = requireUserId(context.session);
      if (!userId) return redirectToLogin(routes.admin.href());
      const user = await getUser(userId);
      if (!user) return redirectToLogin(routes.admin.href());

      if (context.request.method === "GET") {
        const document = await loadUserUsage(userId);
        return context.render(
          <AdminPage
            user={user}
            pendingInvites={listPendingDeviceInvites(user)}
            subscriptions={document.subscriptions}
            error={null}
            notice={adminNotice(new URL(context.request.url))}
            createdToken={new URL(context.request.url).searchParams.get("token")}
          />,
        );
      }

      if (context.request.method !== "POST") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      const formData = await context.request.formData();
      const intent = textField(formData, "intent");
      const document = await loadUserUsage(userId);

      if (intent === "create-device-invite") {
        const invite = await createDeviceInvite(userId);
        if (!invite) {
          return context.render(
            <AdminPage
              user={user}
              pendingInvites={listPendingDeviceInvites(user)}
              subscriptions={document.subscriptions}
              error="Could not create invite"
              notice={null}
              createdToken={null}
            />,
            { status: 500 },
          );
        }
        return redirect(withQuery(routes.admin.href(), { deviceInvite: invite.id }));
      }

      if (intent === "create-api-token") {
        const created = await createUserApiToken(userId, textField(formData, "tokenName"));
        if (!created.ok) {
          return context.render(
            <AdminPage
              user={user}
              pendingInvites={listPendingDeviceInvites(user)}
              subscriptions={document.subscriptions}
              error={created.error}
              notice={null}
              createdToken={null}
            />,
            { status: 400 },
          );
        }
        return redirect(withQuery(routes.admin.href(), { token: created.token }));
      }

      if (intent === "revoke-api-token") {
        const revoked = await revokeUserApiToken(userId, textField(formData, "tokenId"));
        if (!revoked.ok) {
          return context.render(
            <AdminPage
              user={user}
              pendingInvites={listPendingDeviceInvites(user)}
              subscriptions={document.subscriptions}
              error={revoked.error}
              notice={null}
              createdToken={null}
            />,
            { status: 400 },
          );
        }
        return redirect(withQuery(routes.admin.href(), { revoked: "1" }));
      }

      const parsed = parseUsageSubscriptionsForm(formData);
      if (!parsed.ok) {
        return context.render(
          <AdminPage
            user={user}
            pendingInvites={listPendingDeviceInvites(user)}
            subscriptions={document.subscriptions}
            error={parsed.error}
            notice={null}
            createdToken={null}
          />,
          { status: 400 },
        );
      }

      await saveUserUsage(userId, parsed.value);
      return redirect(`${routes.admin.href()}?saved=1`);
    },
  },
});
