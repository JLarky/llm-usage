import { createController } from "remix/router";

import {
  loadUserUsage,
  resolveUserIdFromApiToken,
  sampleUsageDocument,
  saveUserUsage,
} from "../../data/users.ts";
import { requireUserId } from "../../middleware/auth-session.ts";
import { routes } from "../../routes.ts";
import { jsonResponse, parseUsageSubscriptionsDocument } from "../../utils/usage-api.ts";

async function resolveUsageUserId(request: Request, session: { get(key: string): unknown }) {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length).trim();
    if (!token) return null;
    return resolveUserIdFromApiToken(token);
  }
  return requireUserId(session);
}

export default createController(routes.api, {
  actions: {
    async usage({ request, session }) {
      if (request.method === "GET") {
        const userId = await resolveUsageUserId(request, session);
        if (!userId) return jsonResponse(sampleUsageDocument());
        return jsonResponse(await loadUserUsage(userId));
      }

      if (request.method !== "POST") {
        return jsonResponse({ error: "Method Not Allowed" }, 405);
      }

      const userId = await resolveUsageUserId(request, session);
      if (!userId) return jsonResponse({ error: "Unauthorized" }, 401);

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON body" }, 400);
      }

      const parsed = parseUsageSubscriptionsDocument(body);
      if (!parsed.ok) {
        return jsonResponse({ error: parsed.error }, 400);
      }

      await saveUserUsage(userId, parsed.value);
      return jsonResponse({ ok: true, subscriptions: parsed.value.subscriptions.length });
    },
  },
});
