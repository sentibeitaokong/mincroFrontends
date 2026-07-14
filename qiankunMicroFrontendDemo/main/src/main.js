import {
  addGlobalUncaughtErrorHandler,
  initGlobalState,
  loadMicroApp,
  prefetchApps,
  registerMicroApps,
  runAfterFirstMounted,
  setDefaultMountApp,
  start,
} from "qiankun";

const MICRO_CONTAINER = "#micro-container";
const userBadge = document.getElementById("global-user");
const toggleUserButton = document.getElementById("toggle-user");
const manualMountButton = document.getElementById("manual-mount");
const manualUnmountButton = document.getElementById("manual-unmount");

const microApps = [
  {
    name: "vue3-app",
    entry: "http://localhost:7101/",
    container: MICRO_CONTAINER,
    activeRule: "/vue3",
    props: {
      title: "Vue3 子应用",
      from: "qiankun main app",
    },
  },
  {
    name: "react-app",
    entry: "http://localhost:7102/",
    container: MICRO_CONTAINER,
    activeRule: "/react",
    props: {
      title: "React 子应用",
      from: "qiankun main app",
    },
  },
  {
    name: "vanilla-app",
    entry: "http://localhost:7103/index.html",
    container: MICRO_CONTAINER,
    activeRule: "/vanilla",
    props: {
      title: "非 webpack 原生 JS 子应用",
      from: "qiankun main app",
    },
  },
];

let manualMicroApp = null;
let globalState = {
  user: "Guest",
  theme: "light",
  source: "main",
};

function renderGlobalState(state) {
  userBadge.textContent = `当前用户：${state.user}，主题：${state.theme}`;
}

const actions = initGlobalState(globalState);

actions.onGlobalStateChange((state, prev) => {
  console.log("[main] global state changed", state, prev);
  globalState = state;
  renderGlobalState(state);
}, true);

registerMicroApps(microApps, {
  beforeLoad: [
    async (app) => {
      console.log("[main] beforeLoad", app.name);
    },
  ],
  beforeMount: [
    async (app) => {
      console.log("[main] beforeMount", app.name);
    },
  ],
  afterMount: [
    async (app) => {
      console.log("[main] afterMount", app.name);
    },
  ],
  beforeUnmount: [
    async (app) => {
      console.log("[main] beforeUnmount", app.name);
    },
  ],
  afterUnmount: [
    async (app) => {
      console.log("[main] afterUnmount", app.name);
    },
  ],
});

setDefaultMountApp("/vue3");

runAfterFirstMounted(() => {
  console.log("[main] first micro app mounted");
});

addGlobalUncaughtErrorHandler((event) => {
  console.error("[main] qiankun uncaught error", event);
});

prefetchApps([
  { name: "vue3-app", entry: "http://localhost:7101/" },
  { name: "react-app", entry: "http://localhost:7102/" },
  { name: "vanilla-app", entry: "http://localhost:7103/" },
]);

start({
  prefetch: "all",
  sandbox: {
    strictStyleIsolation: false,
    experimentalStyleIsolation: true,
  },
  singular: false,
  getPublicPath: (entry) => `${entry}/`,
});

toggleUserButton.addEventListener("click", () => {
  const nextUser = globalState.user === "Guest" ? "QiankunAdmin" : "Guest";
  const nextTheme = globalState.theme === "light" ? "dark" : "light";

  actions.setGlobalState({
    user: nextUser,
    theme: nextTheme,
    source: "main",
  });
});

manualMountButton.addEventListener("click", () => {
  if (manualMicroApp) {
    return;
  }

  manualMicroApp = loadMicroApp(
    {
      name: "react-app-manual",
      entry: "http://localhost:7102/",
      container: "#manual-container",
      props: {
        title: "手动挂载的 React 子应用",
        from: "loadMicroApp",
      },
    },
    {
      // sandbox: {
      //   experimentalStyleIsolation: true,
      // },
    },
  );
});

manualUnmountButton.addEventListener("click", async () => {
  if (!manualMicroApp) {
    return;
  }

  await manualMicroApp.unmount();
  manualMicroApp = null;
});

renderGlobalState(globalState);
