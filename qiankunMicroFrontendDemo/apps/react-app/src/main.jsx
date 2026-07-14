import React from "react";
import { createRoot } from "react-dom/client";
import { qiankunWindow, renderWithQiankun } from "vite-plugin-qiankun/dist/helper";
import App from "./App.jsx";

let root = null;
let containerRoot = null;
let qiankunActions = null;

function ensureContainer(container, id) {
  const parent = container || document;
  let rootElement = parent.querySelector(`#${id}`);

  if (!rootElement) {
    rootElement = document.createElement("div");
    rootElement.id = id;
    parent.appendChild(rootElement);
  }

  return rootElement;
}

function render(props = {}) {
  containerRoot = ensureContainer(props.container, "react-root");
  root = createRoot(containerRoot);
  root.render(
    <React.StrictMode>
      <App title={props.title} from={props.from} qiankunActions={qiankunActions} />
    </React.StrictMode>,
  );
}

renderWithQiankun({
  async bootstrap() {
    console.log("[react-app] bootstrap");
  },

  async mount(props) {
    console.log("[react-app] mount", props);
    qiankunActions = {
      onGlobalStateChange: props.onGlobalStateChange,
      setGlobalState: props.setGlobalState,
    };
    render(props);
  },

  async unmount() {
    console.log("[react-app] unmount");
    root?.unmount();
    root = null;
    if (containerRoot) {
      containerRoot.innerHTML = "";
    }
  },

  async update(props) {
    console.log("[react-app] update", props);
  },
});

if (!qiankunWindow.__POWERED_BY_QIANKUN__) {
  render({
    title: "React 独立运行",
    from: "standalone",
  });
}
