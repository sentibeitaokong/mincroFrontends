import { registerApplication, start } from "single-spa";

registerApplication({
  name: "@single-spa/welcome",
  app: () =>
    import(
      /* webpackIgnore: true */ // @ts-ignore-next
      "https://unpkg.com/single-spa-welcome/dist/single-spa-welcome.js"
    ),
  activeWhen: (location) => location.pathname === "/",
});

registerApplication({
  name: "@xb/react",
  app: () =>
    import(
      /* webpackIgnore: true */ // @ts-ignore-next
      "@xb/react"
    ),
  activeWhen: (location) => location.pathname === "/react",
});

registerApplication({
  name: "@xb/vue",
  app: () =>
    import(
      /* webpackIgnore: true */ // @ts-ignore-next
      "@xb/vue"
    ),
  activeWhen: (location) => location.pathname.startsWith("/vue"),
});

// registerApplication({
//   name: "@xb/navbar",
//   app: () =>
//     import(
//       /* webpackIgnore: true */ // @ts-ignore-next
//       "@xb/navbar"
//     ),
//   activeWhen: ["/"],
// });

start({
  urlRerouteOnly: true,
});
