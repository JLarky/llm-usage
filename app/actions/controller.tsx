import { createController } from "remix/router";

import { loadUsageSubscriptions } from "../data/usage-store.ts";
import { routes } from "../routes.ts";
import { HomePage } from "../ui/home-page.tsx";
import type { TimeHorizon } from "../utils/usage-budget.ts";
import { buildUsagePlanRows, parseTimeShift } from "../utils/usage-budget.ts";
import { toUsageSubscriptionView } from "../utils/usage-subscription-view.ts";

export default createController(routes, {
  actions: {
    async home(context) {
      const url = new URL(context.request.url);
      const horizonParam = url.searchParams.get("horizon");
      const horizon: TimeHorizon =
        horizonParam === "day" || horizonParam === "hour" ? horizonParam : "cycle";
      const shiftMs = parseTimeShift(url.searchParams.get("shift"));
      const now = new Date(Date.now() + shiftMs);
      const document = await loadUsageSubscriptions();
      const rows = buildUsagePlanRows(
        document.subscriptions.map(toUsageSubscriptionView),
        now,
        horizon,
      );
      return context.render(<HomePage rows={rows} horizon={horizon} now={now} shiftMs={shiftMs} />);
    },
  },
});
