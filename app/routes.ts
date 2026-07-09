import { route } from "remix/routes";

export const routes = route({
  home: "/",
  api: route("api", {
    usage: "usage",
  }),
});
