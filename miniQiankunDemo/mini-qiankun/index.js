/**
 * ======================================================
 *  mini-qiankun — 精简版乾坤微前端框架核心实现
 * ======================================================
 *
 * 本文件实现了一个迷你版的 qiankun 微前端框架，包含以下核心功能：
 *
 * 1. 子应用注册  —— registerMicroApps()
 * 2. 应用启动    —— start()
 * 3. 路由匹配    —— matchActiveRule()
 * 4. 应用加载    —— loadApp() —— 拉取 HTML，解析脚本和样式
 * 5. 应用挂载    —— mountApp() —— 执行子应用生命周期
 * 6. 应用卸载    —— unmountApp()
 * 7. 全局状态    —— initGlobalState() —— 跨应用通信
 * 8. 手动挂载    —— loadMicroApp()
 * 9. 资源预加载  —— prefetchApps()
 * 10. 生命周期   —— beforeLoad / beforeMount / afterMount / beforeUnmount / afterUnmount
 * 11. 错误处理   —— addGlobalUncaughtErrorHandler()
 * 12. JS 沙箱    —— ProxySandbox —— 基于 Proxy 的全局变量隔离
 *                  - 白名单透传（globalWhiteList）
 *                  - 自动绑定窗口方法（WINDOW_BOUND_FUNCTIONS）
 *                  - 副作用自动回收（SANDBOX_SIDE_EFFECT_KEYS）
 */

// ====================================================================
//  内部状态
// ====================================================================

/** 所有已注册的子应用配置列表 */
const appRegistry = [];

/** 当前已挂载的子应用 Map，key=应用名，value=应用实例对象 */
const mountedApps = new Map();

/** 框架是否已启动（防止重复 start） */
let started = false;

/** 全局共享状态对象 */
let globalState = {};

/** 全局状态变更监听器集合 */
const globalStateListeners = new Set();

/** 全局错误处理函数集合 */
const errorHandlers = new Set();

/** 存储所有子应用的沙箱实例，key=appName */
const sandboxInstances = new Map();

/** 框架启动配置，由 start(options) 写入，loadApp() 读取 */
let frameworkOptions = {
  sandbox: false,
};

/** 沙箱白名单：这些全局变量需要写回真实 window，供框架和主子应用共享 */
const DEFAULT_GLOBAL_WHITE_LIST = ["__POWERED_BY_QIANKUN__"];

/** 这些浏览器 API 读取后需要绑定真实 window，否则调用时可能出现 Illegal invocation */
const WINDOW_BOUND_FUNCTIONS = new Set([
  "addEventListener",
  "removeEventListener",
  "dispatchEvent",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
  "fetch",
  "getComputedStyle",
  "matchMedia",
  "open",
  "close",
  "alert",
  "confirm",
  "prompt",
  "atob",
  "btoa",
]);

/** 需要由沙箱托管并在卸载时自动清理的副作用 API */
const SANDBOX_SIDE_EFFECT_KEYS = new Set([
  "addEventListener",
  "removeEventListener",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "requestAnimationFrame",
  "cancelAnimationFrame",
]);

// ====================================================================
//  对外暴露的 API
// ====================================================================

/**
 * 注册微应用
 * @param {Array} apps           子应用配置数组
 * @param {Object} lifeCycles    全局生命周期钩子
 */
export function registerMicroApps(apps, lifeCycles = {}) {
  apps.forEach((app) => {
    appRegistry.push({
      ...app,
      lifeCycles,
    });
  });
}

/**
 * 启动微前端框架
 *
 * @param {Object} options  启动配置
 * @param {boolean|Object} options.sandbox  JS 沙箱配置（默认 false）
 *                                           true  — 使用默认 ProxySandbox
 *                                           false — 子应用脚本直接运行在 window 上
 *                                           Object — 启用沙箱并传入高级配置
 * @param {Array<string>} options.sandbox.globalWhiteList  沙箱白名单，白名单属性写入真实 window
 *
 * 功能：
 * - 监听 hashchange 和 popstate 事件
 * - 触发首次路由匹配，激活当前路径对应的子应用
 * - 将沙箱配置保存到全局，供 loadApp 中创建子应用沙箱时使用
 *
 * 使用示例：
 *   start()                      // 不使用沙箱
 *   start({ sandbox: true })     // 使用默认沙箱
 *   start({ sandbox: { globalWhiteList: ["MY_GLOBAL"] } })  // 自定义白名单
 */
export function start(options = {}) {
  // 防止重复启动
  if (started) {
    return;
  }

  started = true;

  // 保存启动配置，供 loadApp 中创建子应用沙箱使用
  frameworkOptions = {
    ...options,
  };

  // 保留到 window 上方便调试，也模拟 qiankun 运行时的全局配置感知
  window.__QIANKUN_OPTIONS__ = frameworkOptions;

  window.addEventListener("hashchange", reroute);
  window.addEventListener("popstate", reroute);
  reroute();
}

/**
 * 设置默认启动的子应用路由
 * @param {string} path  默认子应用路径
 */
export function setDefaultMountApp(path) {
  if (location.pathname === "/" && !location.hash) {
    history.replaceState(null, "", path);
  }
}

/**
 * 当首个微应用挂载完成后执行回调
 * @param {Function} callback  回调函数
 */
export function runAfterFirstMounted(callback) {
  const timer = window.setInterval(() => {
    if (mountedApps.size > 0) {
      window.clearInterval(timer);
      callback();
    }
  }, 16);
}

/**
 * 注册全局未捕获错误处理器
 * @param {Function} handler  错误处理函数
 */
export function addGlobalUncaughtErrorHandler(handler) {
  errorHandlers.add(handler);
}

/**
 * 初始化全局状态，提供跨应用通信能力
 * @param {Object} initialState  初始状态
 * @returns {{ onGlobalStateChange, setGlobalState, getGlobalState }}
 */
export function initGlobalState(initialState = {}) {
  globalState = { ...initialState };

  return {
    /**
     * 监听全局状态变化
     * @param {Function}  listener         监听回调 (state, prevState) => void
     * @param {boolean}   fireImmediately  是否立即触发一次回调
     * @returns {Function}  取消监听的函数
     */
    onGlobalStateChange(listener, fireImmediately = false) {
      // 注册监听器
      globalStateListeners.add(listener);
      if (fireImmediately) {
        // (state, prevState) — 首次触发时 prevState 等于 state
        listener(globalState, globalState);
      }
      // 返回取消监听的函数
      return () => globalStateListeners.delete(listener);
    },

    /**
     * 设置全局状态（浅合并），并通知所有监听器
     * @param {Object} nextState  要更新的状态
     */
    setGlobalState(nextState) {
      const prev = globalState;
      // 浅合并：保留旧状态中未变更的字段，用新值覆盖
      globalState = {
        ...globalState,
        ...nextState,
      };
      // 逐个通知监听器：listener(newState, prevState)
      globalStateListeners.forEach((listener) => listener(globalState, prev));
    },

    /**
     * 获取当前全局状态
     * @returns {Object} 返回 globalState 的引用，可直接读取
     */
    getGlobalState() {
      return globalState;
    },
  };
}

/**
 * 预加载子应用资源（提前 fetch，浏览器会缓存）
 * @param {Array} apps  子应用列表
 */
export function prefetchApps(apps) {
  apps.forEach((app) => fetch(app.entry).catch(callErrorHandlers));
}

/**
 * 手动加载一个微应用（不依赖路由匹配）
 * @param {Object} app          子应用配置
 * @param {Object} lifeCycles   生命周期钩子
 * @returns {Promise<{ getStatus, unmount }>}
 */
export async function loadMicroApp(app, lifeCycles = {}) {
  // 不走路由匹配，直接加载并挂载
  const microApp = await loadApp({
    ...app,
    lifeCycles,
  });
  await mountApp(microApp);

  // 返回控制句柄，调用者可通过 .getStatus() / .unmount() 管理
  return {
    getStatus() {
      return mountedApps.has(app.name) ? "MOUNTED" : "NOT_MOUNTED";
    },
    unmount() {
      return unmountApp(microApp);
    },
  };
}

// ====================================================================
//  Proxy 沙箱 —— 隔离子应用全局变量
// ====================================================================

/**
 * ProxySandbox —— 基于 Proxy 的增强版 JS 沙箱
 *
 * 工作原理：
 * 1. 创建 fakeWindow 作为子应用的“假 window”
 * 2. 通过 Proxy 拦截 window 属性读写，子应用写入默认落到 fakeWindow
 * 3. 通过 with(proxy) 执行脚本，让 window.xxx 和未声明变量赋值都进入沙箱
 * 4. 对事件监听、定时器、requestAnimationFrame 做副作用记录，卸载时自动清理
 * 5. 对 fetch、alert 等原生方法自动绑定真实 window，避免 Illegal invocation
 * 6. 支持 globalWhiteList，把少量必须共享的全局变量透传到真实 window
 * 7. 子应用卸载时清空 fakeWindow，避免全局变量污染其他子应用
 *
 * 这样不同子应用之间的全局变量（如 window.myVar）不会互相污染。
 *
 * 使用方式：
 *   const sandbox = new ProxySandbox(appName);
 *   sandbox.active();   // 激活沙箱，后续脚本在沙箱中执行
 *   sandbox.inactive(); // 停用沙箱，清理子应用写入的属性
 */
class ProxySandbox {
  constructor(appName, options = {}) {
    this.appName = appName;
    this.isActive = false;
    this.globalWhiteList = new Set([
      ...DEFAULT_GLOBAL_WHITE_LIST,
      ...(options.globalWhiteList || []),
    ]);

    // 子应用运行的“假 window”容器，存储子应用自己的全局变量
    this.fakeWindow = Object.create(null);

    // 记录沙箱运行期间新增/修改过的属性，用于卸载时清理
    this.modifiedProps = new Set();

    // 记录子应用注册的事件监听和异步任务，卸载时统一清理
    this.eventListeners = new Set();
    this.timeoutIds = new Set();
    this.intervalIds = new Set();
    this.animationFrameIds = new Set();

    this.proxy = new Proxy(this.fakeWindow, {
      get: (target, key) => this.get(target, key),
      set: (target, key, value) => this.set(target, key, value),
      has: () => true,
      deleteProperty: (target, key) => this.deleteProperty(target, key),
      defineProperty: (target, key, descriptor) => this.defineProperty(target, key, descriptor),
      getOwnPropertyDescriptor: (target, key) => this.getOwnPropertyDescriptor(target, key),
      ownKeys: (target) => Reflect.ownKeys(target),
    });
  }

  get(target, key) {
    // Symbol.unscopables 用于 with 语句告知哪些属性不应被绑定到作用域
    if (key === Symbol.unscopables) {
      return undefined;
    }

    // 确保子应用拿到的 window/self/globalThis 都是沙箱代理对象
    // 防止子应用通过 window.xxx = yyy 绕过沙箱写入真实全局
    if (key === "window" || key === "self" || key === "globalThis") {
      return this.proxy;
    }

    // top/parent 在同窗口场景下也返回代理，避免绕过沙箱写真实 window
    if ((key === "top" || key === "parent") && window[key] === window) {
      return this.proxy;
    }

    // 如果子应用自己在 fakeWindow 中定义了该属性，优先返回
    if (key in target) {
      return target[key];
    }

    // addEventListener 等副作用 API 走代理记录，便于卸载时自动清理
    if (SANDBOX_SIDE_EFFECT_KEYS.has(key)) {
      return this.createSideEffectProxy(key);
    }

    // 从真实 window 读取
    const value = window[key];

    // 部分原生方法要求 this 必须是真实 window，需要绑定后再返回
    if (typeof value === "function" && WINDOW_BOUND_FUNCTIONS.has(key)) {
      return value.bind(window);
    }

    return value;
  }

  set(target, key, value) {
    // 白名单属性直接写回真实 window，供框架或主子应用共享
    if (this.globalWhiteList.has(key)) {
      window[key] = value;
      return true;
    }

    // 非白名单属性写入 fakeWindow，不污染真实 window
    target[key] = value;
    this.modifiedProps.add(key);
    return true;
  }

  deleteProperty(target, key) {
    // 仅删除 fakeWindow 上的属性，不操作真实 window
    if (key in target) {
      delete target[key];
      this.modifiedProps.delete(key);
    }
    return true;
  }

  defineProperty(target, key, descriptor) {
    // 白名单属性定义到真实 window 上
    if (this.globalWhiteList.has(key)) {
      Object.defineProperty(window, key, descriptor);
      return true;
    }

    // 非白名单属性定义到 fakeWindow 上
    this.modifiedProps.add(key);
    return Reflect.defineProperty(target, key, descriptor);
  }

  getOwnPropertyDescriptor(target, key) {
    // 优先返回 fakeWindow 上的属性描述符
    if (key in target) {
      return Object.getOwnPropertyDescriptor(target, key);
    }

    // 从真实 window 获取描述符时需标记 configurable
    // 因为 Proxy 的 getOwnPropertyDescriptor 必须返回 configurable
    // 否则可能触发 Proxy 不变量（Invariant）异常
    const descriptor = Object.getOwnPropertyDescriptor(window, key);
    if (descriptor) {
      return {
        ...descriptor,
        configurable: true,
      };
    }

    return undefined;
  }

  createSideEffectProxy(key) {
    // 为每个副作用 API 创建一个代理函数，记录执行痕迹
    // 这样子应用卸载时可以自动清理，防止内存泄漏
    const sideEffectHandlers = {
      addEventListener: (type, listener, options) => {
        // 真实注册到 window，同时记录以便卸载时移除
        window.addEventListener(type, listener, options);
        this.eventListeners.add({ type, listener, options });
      },
      removeEventListener: (type, listener, options) => {
        // 移除真实监听，同时删除记录
        window.removeEventListener(type, listener, options);
        this.removeRecordedEventListener(type, listener, options);
      },
      setTimeout: (handler, timeout, ...args) => {
        // 包装回调，执行时自动从记录中移除已完成的任务
        const timerId = window.setTimeout(() => {
          this.timeoutIds.delete(timerId);
          if (typeof handler === "function") {
            handler(...args);
          } else {
            // setTimeout 也支持字符串代码
            new Function(String(handler))();
          }
        }, timeout);
        this.timeoutIds.add(timerId);
        return timerId;
      },
      clearTimeout: (timerId) => {
        window.clearTimeout(timerId);
        this.timeoutIds.delete(timerId);
      },
      setInterval: (handler, timeout, ...args) => {
        const timerId = window.setInterval(handler, timeout, ...args);
        this.intervalIds.add(timerId);
        return timerId;
      },
      clearInterval: (timerId) => {
        window.clearInterval(timerId);
        this.intervalIds.delete(timerId);
      },
      requestAnimationFrame: (callback) => {
        // 包装回调，执行时自动从记录中移除已完成的帧
        const frameId = window.requestAnimationFrame((time) => {
          this.animationFrameIds.delete(frameId);
          callback(time);
        });
        this.animationFrameIds.add(frameId);
        return frameId;
      },
      cancelAnimationFrame: (frameId) => {
        window.cancelAnimationFrame(frameId);
        this.animationFrameIds.delete(frameId);
      },
    };

    return sideEffectHandlers[key];
  }

  /**
   * 从记录中移除指定的事件监听
   * 在子应用自己调用 removeEventListener 时触发，避免重复记录
   */
  removeRecordedEventListener(type, listener, options) {
    for (const record of this.eventListeners) {
      if (record.type === type && record.listener === listener && record.options === options) {
        this.eventListeners.delete(record);
        return;
      }
    }
  }

  /**
   * 清理所有已记录的副作用
   * 包括：事件监听、setTimeout、setInterval、requestAnimationFrame
   * 在沙箱停用时由 inactive() 调用
   */
  clearSideEffects() {
    // 移除所有通过沙箱注册的事件监听
    this.eventListeners.forEach(({ type, listener, options }) => {
      window.removeEventListener(type, listener, options);
    });
    this.eventListeners.clear();

    // 清除所有尚未执行的定时器
    this.timeoutIds.forEach((timerId) => window.clearTimeout(timerId));
    this.timeoutIds.clear();

    this.intervalIds.forEach((timerId) => window.clearInterval(timerId));
    this.intervalIds.clear();

    this.animationFrameIds.forEach((frameId) => window.cancelAnimationFrame(frameId));
    this.animationFrameIds.clear();
  }

  /**
   * 激活沙箱
   * 标记沙箱为激活状态，后续该子应用的脚本将在沙箱中执行
   */
  active() {
    if (this.isActive) {
      return;
    }
    this.isActive = true;
    console.log("[sandbox] " + this.appName + " activated");
  }

  /**
   * 停用沙箱
   * 清空子应用在沙箱中写入的所有属性，释放内存
   */
  inactive() {
    if (!this.isActive) {
      return;
    }

    // 清理事件监听、定时器、requestAnimationFrame 等运行时副作用
    this.clearSideEffects();

    // 清空子应用在沙箱中设置的所有非白名单属性
    this.modifiedProps.forEach((key) => {
      delete this.fakeWindow[key];
    });
    this.modifiedProps.clear();
    this.isActive = false;
    console.log("[sandbox] " + this.appName + " inactivated");
  }
}

// ====================================================================
//  内部核心逻辑
// ====================================================================

/**
 * 路由重匹配 —— 核心调度函数
 *
 * 工作流程：
 * 1. 根据当前 URL 找出所有应激活的子应用
 * 2. 卸载已挂载但不再匹配的子应用
 * 3. 挂载新匹配但尚未挂载的子应用
 */
async function reroute() {
  if (!started) {
    return;
  }
  // 找出当前 URL 下应激活的所有子应用
  const activeApps = appRegistry.filter((app) => matchActiveRule(app.activeRule));
  const activeNames = new Set(activeApps.map((app) => app.name));

  // 卸载已挂载但不再激活的子应用
  for (const mountedApp of mountedApps.values()) {
    if (!activeNames.has(mountedApp.name)) {
      await unmountApp(mountedApp);
    }
  }
  // 挂载新匹配且尚未挂载的子应用
  for (const app of activeApps) {
    if (!mountedApps.has(app.name)) {
      const loadedApp = await loadApp(app);
      await mountApp(loadedApp);
    }
  }
}

/**
 * 判断当前 URL 是否匹配子应用的激活规则
 * @param {string|Function} activeRule  激活规则（路径前缀 或 函数）
 * @returns {boolean}
 */
function matchActiveRule(activeRule) {
  if (typeof activeRule === "function") {
    return activeRule(location);
  }
  return location.pathname.startsWith(activeRule) || location.hash.startsWith(activeRule);
}

/**
 * 加载子应用（核心实现）
 *
 * 工作流程：
 * 1. 触发 beforeLoad 生命周期钩子
 * 2. 如果启用了沙箱，创建 ProxySandbox 实例并激活
 * 3. 通过 fetch 获取子应用的 HTML
 * 4. 解析 HTML，提取脚本和样式
 * 5. 加载样式（动态创建 <link> 插入到主文档）
 * 6. 将 HTML body 内容插入到主应用的容器中
 * 7. 设置 __POWERED_BY_QIANKUN__ 标记
 * 8. 执行子应用的脚本（沙箱模式下在 sandbox.proxy 中执行）
 * 9. 从 window（或沙箱）上读取子应用暴露的生命周期函数
 *
 * @param {Object} app  子应用配置
 * @returns {Promise<Object>}  加载完成的应用实例，包含沙箱引用
 */
async function loadApp(app) {
  try {
    // ----- 步骤 0：触发 beforeLoad 生命周期钩子 -----
    await callLifeCycle(app.lifeCycles?.beforeLoad, app);

    // ----- 步骤 1：判断是否启用沙箱，创建或复用 ProxySandbox 实例 -----
    const sandboxOptions = normalizeSandboxOptions(frameworkOptions.sandbox);

    let sandbox = null;
    if (sandboxOptions.enabled) {
      // 复用已存在的沙箱实例（同一个子应用切出再切回时）
      sandbox = sandboxInstances.get(app.name);
      if (!sandbox) {
        sandbox = new ProxySandbox(app.name, sandboxOptions);
        sandboxInstances.set(app.name, sandbox);
        console.log("[sandbox] " + app.name + " sandbox created");
      }
      sandbox.active();
    }

    // ----- 步骤 2：通过 fetch 获取子应用的 HTML 源码 -----
    const html = await fetch(app.entry).then((res) => res.text());

    // ----- 步骤 3：将 HTML 解析为 DOM 文档，提取并移除 <script> -----
    const doc = new DOMParser().parseFromString(html, "text/html");
    const scripts = [...doc.querySelectorAll("script")];
    scripts.forEach((script) => script.remove());

    // ----- 步骤 4：提取 <link rel="stylesheet">，动态加载到主文档 -----
    const styles = [...doc.querySelectorAll("link[rel='stylesheet']")];
    await Promise.all(styles.map((style) => loadStyle(resolveAssetUrl(app.entry, style.getAttribute("href")))));
    styles.forEach((style) => style.remove());

    // ----- 步骤 5：将子应用的 body 内容插入到主应用的容器中 -----
    const container = document.querySelector(app.container);
    if (!container) {
      throw new Error("container " + app.container + " not found");
    }
    container.innerHTML = doc.body.innerHTML;

    // ----- 步骤 6：设置 __POWERED_BY_QIANKUN__ 标记 -----
    // 沙箱开启时写入 fakeWindow；未开启时写入真实 window
    const runtimeGlobal = sandbox ? sandbox.proxy : window;
    runtimeGlobal.__POWERED_BY_QIANKUN__ = true;

    // ----- 步骤 7：依次执行子应用的 JavaScript 脚本 -----
    for (const script of scripts) {
      await execScript(resolveAssetUrl(app.entry, script.getAttribute("src")), sandbox);
    }

    // ----- 步骤 8：从沙箱（或 window）上读取子应用暴露的生命周期钩子 -----
    const sandboxGlobal = sandbox ? sandbox.proxy : window;
    const lifecycles = sandboxGlobal[app.name] || window[app.name];

    if (!lifecycles?.bootstrap || !lifecycles?.mount || !lifecycles?.unmount) {
      throw new Error("micro app " + app.name + " must expose bootstrap, mount and unmount");
    }

    return {
      ...app,
      lifecycles,
      container,
      sandbox, // 将沙箱引用挂在应用实例上，供 unmount 时清理
    };
  } catch (error) {
    callErrorHandlers(error);
    throw error;
  }
}

/**
 * 挂载子应用
 *
 * 工作流程：
 * 1. 触发 beforeMount 生命周期钩子
 * 2. 调用子应用的 bootstrap（初始化）
 * 3. 调用子应用的 mount（渲染挂载）
 * 4. 记录到 mountedApps
 * 5. 触发 afterMount 生命周期钩子
 *
 * @param {Object} app  应用实例
 */
async function mountApp(app) {
  await callLifeCycle(app.lifeCycles?.beforeMount, app);
  await app.lifecycles.bootstrap?.();
  await app.lifecycles.mount?.(createProps(app));
  mountedApps.set(app.name, app);
  await callLifeCycle(app.lifeCycles?.afterMount, app);
}

/**
 * 卸载子应用
 *
 * 工作流程：
 * 1. 触发 beforeUnmount 生命周期钩子
 * 2. 调用子应用的 unmount（清理副作用）
 * 3. 清空容器内容
 * 4. 如果启用了沙箱，停用并清理沙箱（清空 fakeWindow）
 * 5. 从 mountedApps 中移除
 * 6. 触发 afterUnmount 生命周期钩子
 *
 * @param {Object} app  应用实例
 */
async function unmountApp(app) {
  // ----- 步骤 1：触发 beforeUnmount 生命周期钩子 -----
  await callLifeCycle(app.lifeCycles?.beforeUnmount, app);

  // ----- 步骤 2：调用子应用自身的 unmount 清理内部状态 -----
  await app.lifecycles.unmount?.(createProps(app));

  // ----- 步骤 3：清空容器 DOM 内容 -----
  app.container.innerHTML = "";

  // ----- 步骤 4：如果启用了沙箱，停用并清理（清空 fakeWindow + 移除副作用）-----
  if (app.sandbox) {
    app.sandbox.inactive();
  }

  // ----- 步骤 5：从已挂载列表中移除 -----
  mountedApps.delete(app.name);

  // ----- 步骤 6：触发 afterUnmount 生命周期钩子 -----
  await callLifeCycle(app.lifeCycles?.afterUnmount, app);
}

/**
 * 创建传给子应用 props 的对象
 * 包含：自定义 props、container、全局状态 API
 *
 * @param {Object} app  应用实例
 * @returns {Object}    props
 */
function createProps(app) {
  return {
    ...app.props,
    container: app.container,
    onGlobalStateChange(listener, fireImmediately) {
      globalStateListeners.add(listener);
      if (fireImmediately) {
        listener(globalState, globalState);
      }
      return () => globalStateListeners.delete(listener);
    },
    setGlobalState(nextState) {
      const prev = globalState;
      globalState = {
        ...globalState,
        ...nextState,
      };
      globalStateListeners.forEach((listener) => listener(globalState, prev));
    },
  };
}

// ====================================================================
//  工具函数
// ====================================================================

/**
 * 将相对路径的静态资源解析为基于入口 URL 的绝对路径
 *
 * 例如：entry=http://localhost:7200/apps/vue-like/index.html
 *       assetPath=./app.js
 *       => http://localhost:7200/apps/vue-like/app.js
 *
 * @param {string} entry      子应用入口 URL
 * @param {string} assetPath  资源相对路径
 * @returns {string}          解析后的绝对 URL
 */
function resolveAssetUrl(entry, assetPath) {
  if (!assetPath) {
    return "";
  }
  return new URL(assetPath, entry).toString();
}

/**
 * 动态加载样式文件
 * 创建 <link rel="stylesheet"> 标签插入到 document.head
 *
 * @param {string} url  样式文件的绝对 URL
 * @returns {Promise}
 */
function loadStyle(url) {
  return new Promise((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.onload = resolve;
    link.onerror = reject;
    document.head.appendChild(link);
  });
}

/**
 * 执行远程脚本
 *
 * 通过 fetch 获取脚本内容，然后用 new Function 创建执行环境。
 *
 * 沙箱模式下：
 *   - 使用 with(window) 让 window.xxx 和未声明变量赋值都进入 sandbox.proxy
 *   - 将 window/self/globalThis 都指向 sandbox.proxy
 *   - 子应用的全局变量写入 fakeWindow，不影响真实 window
 *   - 不同子应用之间的全局变量互相隔离
 *
 * 非沙箱模式下：
 *   - 直接将脚本执行在真实 window 上（原有行为）
 *
 * @param {string} url      脚本文件的绝对 URL
 * @param {Object} sandbox  可选的沙箱实例，如果传入则在沙箱中执行
 */
async function execScript(url, sandbox = null) {
  if (!url) {
    return;
  }

  // ----- 步骤 A：通过网络请求拉取远程脚本源码 -----
  const code = await fetch(url).then((res) => res.text());

  if (sandbox && sandbox.isActive) {
    // ----- 沙箱模式 -----
    // 1. with(window) 配合 Proxy.has 始终返回 true，让未声明的变量赋值也进入沙箱
    //    （否则 var str = "hello" 由于作用域提升会变成 window.str，绕过 Proxy.set）
    // 2. IIFE 包裹并使 this = window（即 sandbox.proxy），贴近浏览器全局脚本行为
    // 3. window / self / globalThis 三个形参都指向 sandbox.proxy
    const sandboxGlobal = sandbox.proxy;
    const run = new Function(
      "window",
      "self",
      "globalThis",
      "with(window){\n;(function(){\n" + code + "\n}).call(window);\n}\n//# sourceURL=" + url
    );
    run.call(sandboxGlobal, sandboxGlobal, sandboxGlobal, sandboxGlobal);
  } else {
    // ----- 非沙箱模式：直接在真实 window 上执行（原有逻辑）-----
    const run = new Function("window", code + "\n//# sourceURL=" + url);
    run(window);
  }
}

/**
 * 标准化沙箱配置
 *
 * 处理三种调用方式：
 *   1. undefined / false → { enabled: false }
 *   2. true              → { enabled: true, 使用默认白名单 }
 *   3. { ... }           → { enabled: true, 合并自定义白名单 }
 *
 * @param {boolean|Object} sandbox  原始沙箱配置
 * @returns {{ enabled: boolean, globalWhiteList: string[] }}
 */
function normalizeSandboxOptions(sandbox) {
  if (!sandbox) {
    return {
      enabled: false,
      globalWhiteList: DEFAULT_GLOBAL_WHITE_LIST,
    };
  }

  if (sandbox === true) {
    return {
      enabled: true,
      globalWhiteList: DEFAULT_GLOBAL_WHITE_LIST,
    };
  }

  return {
    enabled: true,
    ...sandbox,
    globalWhiteList: Array.from(new Set([
      ...DEFAULT_GLOBAL_WHITE_LIST,
      ...(sandbox.globalWhiteList || []),
    ])),
  };
}

/**
 * 依次调用生命周期钩子函数（支持数组形式）
 *
 * @param {Array|Function} lifeCycle  生命周期钩子
 * @param {Object} app                应用实例
 */
async function callLifeCycle(lifeCycle, app) {
  const fns = Array.isArray(lifeCycle) ? lifeCycle : lifeCycle ? [lifeCycle] : [];
  for (const fn of fns) {
    await fn(app);
  }
}

/**
 * 调用所有已注册的全局错误处理器
 *
 * @param {Error} error  错误对象
 */
function callErrorHandlers(error) {
  errorHandlers.forEach((handler) => handler(error));
}
