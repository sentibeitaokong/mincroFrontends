/**
 * ======================================================
 *  React-like 子应用
 * ======================================================
 *
 * 这是一个不依赖 React 框架的"模拟 React"子应用，用于演示微应用生命周期。
 * 实际项目中这里会是真正的 React 应用。
 *
 * 关键点：
 * 1. 使用 IIFE（立即执行函数）包裹，避免污染全局变量
 * 2. 将 { bootstrap, mount, unmount, update } 挂载到 window[appName] 上
 *    供 mini-qiankun 框架读取和调用
 * 3. 通过 window.__POWERED_BY_QIANKUN__ 判断运行环境
 */

(function registerReactLikeApp(global) {
  const appName = "react-like-app";
  let root = null;
  let propsCache = null;
  let state = {
    user: "Guest",
    theme: "light",
  };

  /**
   * 渲染函数 —— 将子应用 UI 渲染到容器中
   * @param {Object} props  从主应用传来的属性
   */
  function render(props = {}) {
    // 确定渲染容器：作为子应用时使用传入的 container，独立运行时使用 document
    const container = props.container || document;
    root = container.querySelector("#react-like-root");

    // 如果容器不存在则创建
    if (!root) {
      root = document.createElement("div");
      root.id = "react-like-root";
      container.appendChild(root);
    }

    // 渲染 HTML 模板
    root.innerHTML = `
      <section class="react-like-card">
        <h3>${props.title || "React-like 子应用"}</h3>
        <p>这是一个不依赖 React 的模拟 React 子应用，用于演示微应用生命周期。</p>
        <p>全局用户：${state.user}</p>
        <p>全局主题：${state.theme}</p>
        <button id="react-like-update-state">子应用修改全局状态</button>
      </section>
    `;

    // 绑定子应用内按钮事件 —— 子应用修改全局状态
    root.querySelector("#react-like-update-state").onclick = () => {
      propsCache?.setGlobalState?.({
        user: "ReactLikeUser",
        theme: state.theme === "light" ? "dark" : "light",
      });
    };
  }

  // ================================================================
  //  暴露给 mini-qiankun 框架的生命周期钩子
  // ================================================================

  global[appName] = {
    /**
     * bootstrap —— 初始化
     * 只在子应用首次加载时调用一次，适合做一些全局配置
     */
    async bootstrap() {
      console.log("[react-like-app] bootstrap");
    },

    /**
     * mount —— 挂载
     * 每次子应用激活时调用，负责 UI 渲染和事件绑定
     * @param {Object} props  主应用传来的 props，包含:
     *   - title: 标题
     *   - container: 容器 DOM
     *   - onGlobalStateChange: 监听全局状态
     *   - setGlobalState: 修改全局状态
     */
    async mount(props) {
      console.log("[react-like-app] mount", props);
      propsCache = props;

      // 监听全局状态变化，同步更新 UI
      props.onGlobalStateChange?.((nextState) => {
        state = {
          user: nextState.user,
          theme: nextState.theme,
        };
      render(propsCache);
      }, true);

      render(props);
    },

    /**
     * unmount —— 卸载
     * 子应用失活时调用，负责清理 DOM 和事件监听，防止内存泄漏
     */
    async unmount() {
      console.log("[react-like-app] unmount");
      if (root) {
        root.innerHTML = "";
      }
      root = null;
      propsCache = null;
    },

    /**
     * update —— 更新
     * 当 props 发生变化时调用（由 loadMicroApp 手动更新场景使用）
     * @param {Object} props  新的属性
     */
    async update(props) {
      console.log("[react-like-app] update", props);
      propsCache = {
        ...propsCache,
        ...props,
  };
      render(propsCache);
    },
  };

  // ================================================================
  //  独立运行模式
  // ================================================================

  /**
   * __POWERED_BY_QIANKUN__ 是 mini-qiankun 框架在加载子应用时设置的环境标记
   * 如果未设置该标记，说明子应用是独立运行的（没有主应用框架）
   * 此时子应用应自行调用 mount 来完成渲染
   */
  if (!global.__POWERED_BY_QIANKUN__) {
    global[appName].mount({
      title: "React-like 独立运行",
    });
  }
})(window);
