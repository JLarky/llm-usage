import { createRouter, type MiddlewareContext } from "remix/router";
import { staticFiles } from "remix/middleware/static";

import controller from "./actions/controller.tsx";
import apiController from "./actions/api/controller.tsx";
import authApiController from "./actions/api/auth/controller.tsx";
import { authSession } from "./middleware/auth-session.ts";
import { render } from "./middleware/render.tsx";
import { routes } from "./routes.ts";

type AppContext = MiddlewareContext<[ReturnType<typeof authSession>, ReturnType<typeof render>]>;

declare module "remix/router" {
  interface RouterTypes {
    context: AppContext;
  }
}

export const router = createRouter<AppContext>({
  middleware: [staticFiles("./public", { index: false }), authSession(), render()],
});

router.map(routes, controller);
router.map(routes.api, apiController);
router.map(routes.api.auth, authApiController);
