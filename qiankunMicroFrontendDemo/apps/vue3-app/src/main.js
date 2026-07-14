import { createApp } from "vue";
import { qiankunWindow, renderWithQiankun } from "vite-plugin-qiankun/dist/helper";
import App from "./App.vue";

let app = null;
let containerRoot = null;
let qiankunActions = null;

function ensureContainer(container, id) {
  const parent = container || document;
  let root = parent.querySelector(`#${id}`);

  if (!root) {
    root = document.createElement("div");
    root.id = id;
    parent.appendChild(root);
  }

  return root;
}

function render(props = {}) {
  containerRoot = ensureContainer(props.container, "vue3-root");

  app = createApp(App, {
    title: props.title,
    from: props.from,
    qiankunActions,
  });
  app.mount(containerRoot);
}

renderWithQiankun({
  async bootstrap() {
    console.log("[vue3-app] bootstrap");
  },

  async mount(props) {
    console.log("[vue3-app] mount", props);
    qiankunActions = {
      onGlobalStateChange: props.onGlobalStateChange,
      setGlobalState: props.setGlobalState,
    };
    render(props);
  },

  async unmount() {
    console.log("[vue3-app] unmount");
    app?.unmount();
    app = null;
    if (containerRoot) {
      containerRoot.innerHTML = "";
    }
  },

  async update(props) {
    console.log("[vue3-app] update", props);
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({
    title: "Vue3 独立运行",
    from: "standalone",
  });
}
