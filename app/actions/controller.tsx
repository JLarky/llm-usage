import { createController } from "remix/router";

import { loadUsageSubscriptions } from "../data/usage-store.ts";
import { routes } from "../routes.ts";
import { HomePage } from "../ui/home-page.tsx";
import { buildUsagePlanRows } from "../utils/usage-budget.ts";
import { toUsageSubscriptionView } from "../utils/usage-subscription-view.ts";

export default createController(routes, {
  actions: {
    async home(context) {
      const document = await loadUsageSubscriptions();
      const rows = buildUsagePlanRows(document.subscriptions.map(toUsageSubscriptionView));
      return context.render(<HomePage rows={rows} />);
    },
  },
});
