import { createController } from "remix/router";

import { loadUsageSubscriptions } from "../data/usage-store.ts";
import { routes } from "../routes.ts";
import { HomePage } from "../ui/home-page.tsx";
import type { TimeHorizon } from "../utils/usage-budget.ts";
import { buildUsagePlanRows } from "../utils/usage-budget.ts";
import { toUsageSubscriptionView } from "../utils/usage-subscription-view.ts";

export default createController(routes, {
  actions: {
    async home(context) {
      const url = new URL(context.request.url);
      const horizonParam = url.searchParams.get("horizon");
      const horizon: TimeHorizon =
        horizonParam === "day" || horizonParam === "hour" ? horizonParam : "cycle";
      const document = await loadUsageSubscriptions();
      const rows = buildUsagePlanRows(
        document.subscriptions.map(toUsageSubscriptionView),
        new Date(),
        horizon,
      );
      return context.render(<HomePage rows={rows} horizon={horizon} />);
    },
  },
});
