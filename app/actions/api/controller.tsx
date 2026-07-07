import { createController } from "remix/router";

import { saveUsageSubscriptions } from "../../data/usage-store.ts";
import { routes } from "../../routes.ts";
import { jsonResponse, parseUsageSubscriptionsDocument } from "../../utils/usage-api.ts";

function isAuthorized(request: Request): Response | null {
  const token = process.env.USAGE_API_TOKEN;
  if (!token) {
    return jsonResponse({ error: "API token not configured" }, 503);
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${token}`) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  return null;
}

export default createController(routes.api, {
  actions: {
    async usage({ request }) {
      const authError = isAuthorized(request);
      if (authError) return authError;

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

      await saveUsageSubscriptions(parsed.value);
      return jsonResponse({ ok: true, subscriptions: parsed.value.subscriptions.length });
    },
  },
});
