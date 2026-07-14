(function bootstrapVanillaApp(global) {
  const appName = "vanilla-app";
  let root = null;
  let propsCache = null;
  let state = {
    user: "Guest",
    theme: "light",
  };

  function render(props = {}) {
    const container = props.container || document;
    root = container.querySelector("#vanilla-root");

    if (!root) {
      root = document.createElement("div");
      root.id = "vanilla-root";
      container.appendChild(root);
    }

    root.innerHTML = `
      <section class="vanilla-card">
        <h2>${props.title || "非 webpack 原生 JS 子应用"}</h2>
        <p>这是没有 webpack 打包的微应用，直接通过全局变量暴露 qiankun 生命周期。</p>
        <dl>
          <dt>来自主应用的 props</dt>
          <dd>${props.from || "standalone"}</dd>
          <dt>全局用户</dt>
          <dd>${state.user}</dd>
          <dt>全局主题</dt>
          <dd>${state.theme}</dd>
        </dl>
        <button id="vanilla-update-state">原生子应用修改全局状态</button>
      </section>
    `;

    root.querySelector("#vanilla-update-state").addEventListener("click", () => {
      propsCache?.setGlobalState?.({
        user: "VanillaUser",
        theme: state.theme === "light" ? "dark" : "light",
        source: appName,
      });
    });
  }

  global[appName] = {
    async bootstrap() {
      console.log("[vanilla-app] bootstrap");
    },

    async mount(props) {
      console.log("[vanilla-app] mount", props);
      propsCache = props;

      props.onGlobalStateChange?.((nextState) => {
        state = {
          user: nextState.user,
          theme: nextState.theme,
        };
        render(propsCache);
      }, true);

      render(props);
    },

    async unmount() {
      console.log("[vanilla-app] unmount");
      if (root) {
        root.innerHTML = "";
      }
      root = null;
    },

    async update(props) {
      console.log("[vanilla-app] update", props);
      propsCache = {
        ...propsCache,
        ...props,
      };
      render(propsCache);
    },
  };

  if (!global.__POWERED_BY_QIANKUN__) {
    global[appName].mount({
      title: "原生 JS 独立运行",
      from: "standalone",
    });
  }
})(window);
