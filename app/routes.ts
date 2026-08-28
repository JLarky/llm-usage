import { get, post, route } from "remix/routes";

export const routes = route({
  home: "/",
  login: "/login",
  logout: post("logout"),
  admin: "/admin",
  invite: "/invite/:inviteId",
  api: route("api", {
    usage: "usage",
    usagePlan: get("usage/plan"),
    auth: route("auth", {
      registerOptions: post("register/options"),
      registerVerify: post("register/verify"),
      loginOptions: post("login/options"),
      loginVerify: post("login/verify"),
      inviteOptions: post("invite/options"),
      inviteVerify: post("invite/verify"),
    }),
  }),
});
