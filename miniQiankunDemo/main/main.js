import {
  addGlobalUncaughtErrorHandler,
  initGlobalState,
  loadMicroApp,
  prefetchApps,
  registerMicroApps,
  runAfterFirstMounted,
  setDefaultMountApp,
  start,
} from "/mini-qiankun/index.js";

const stateView = document.querySelector("#state-view");
const changeStateButton = document.querySelector("#change-state");
const manualMountButton = document.querySelector("#manual-mount");
const manualUnmountButton = document.querySelector("#manual-unmount");
let manualApp = null;

const actions = initGlobalState({
  user: "Guest",
  theme: "light",
});

actions.onGlobalStateChange((state) => {
  stateView.textContent = `user: ${state.user}, theme: ${state.theme}`;
}, true);

registerMicroApps(
  [
    {
      name: "vue-like-app",
      entry: "http://localhost:7200/apps/vue-like/index.html",
      container: "#micro-container",
      activeRule: "/vue-like",
      props: {
        title: "Vue-like 子应用",
      },
    },
    {
      name: "react-like-app",
      entry: "http://localhost:7200/apps/react-like/index.html",
      container: "#micro-container",
      activeRule: "/react-like",
      props: {
        title: "React-like 子应用",
      },
    },
    {
      name: "vanilla-app",
      entry: "http://localhost:7200/apps/vanilla/index.html",
      container: "#micro-container",
      activeRule: "/vanilla",
      props: {
        title: "Vanilla 子应用",
      },
    },
  ],
  {
    beforeLoad: [(app) => console.log("[main] beforeLoad", app.name)],
    beforeMount: [(app) => console.log("[main] beforeMount", app.name)],
    afterMount: [(app) => console.log("[main] afterMount", app.name)],
    beforeUnmount: [(app) => console.log("[main] beforeUnmount", app.name)],
    afterUnmount: [(app) => console.log("[main] afterUnmount", app.name)],
  },
);

setDefaultMountApp("/vue-like");

runAfterFirstMounted(() => {
  console.log("[main] first micro app mounted");
});

addGlobalUncaughtErrorHandler((error) => {
  console.error("[main] mini qiankun error", error);
});

prefetchApps([
  { entry: "http://localhost:7200/apps/vue-like/index.html" },
  { entry: "http://localhost:7200/apps/react-like/index.html" },
  { entry: "http://localhost:7200/apps/vanilla/index.html" },
]);

changeStateButton.addEventListener("click", () => {
  const current = actions.getGlobalState();
  actions.setGlobalState({
    user: current.user === "Guest" ? "Admin" : "Guest",
    theme: current.theme === "light" ? "dark" : "light",
  });
});

manualMountButton.addEventListener("click", async () => {
  if (manualApp) {
    return;
  }

  manualApp = await loadMicroApp({
    name: "vanilla-app",
    entry: "http://localhost:7200/apps/vanilla/index.html",
    container: "#manual-container",
    props: {
      title: "手动挂载 Vanilla",
    },
  });
});

manualUnmountButton.addEventListener("click", async () => {
  if (!manualApp) {
    return;
  }

  await manualApp.unmount();
  manualApp = null;
});

/**
 * ======================================================
 *  start() 启动微前端框架
 * ======================================================
 *
 * 可选参数 { sandbox: true } 启用 JS 沙箱：
 *   - true  — 子应用运行在 ProxySandbox 中，全局变量相互隔离
 *   - false — 子应用直接运行在 window 上（默认，与原有行为一致）
 *
 * 启用沙箱后，不同子应用的全局变量不会互相污染。
 * 例如：vue-like-app 设置的 window.myVar 不会影响 react-like-app。
 */
start();

// 如需启用沙箱，替换上面为：
// start({ sandbox: true });
