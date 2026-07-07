import { post, route } from "remix/routes";

export const routes = route({
  home: "/",
  api: route("api", {
    usage: post("usage"),
  }),
});
