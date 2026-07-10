import { NOT_LOADED } from "./status.js";
import { reroute } from "./reroute.js";

// 保存所有已注册的子应用，reroute 会基于这个列表做调度。
export const apps = [];

// 注册子应用：收集加载函数、激活规则、自定义参数，并初始化应用状态。
export function registerApplication(appConfig) {
  const { name, loadApp, activeWhen, customProps = {} } = appConfig;

  if (!name || typeof loadApp !== "function" || typeof activeWhen !== "function") {
    throw new Error("registerApplication requires name, loadApp and activeWhen");
  }

  if (apps.some((app) => app.name === name)) {
    throw new Error(`Application '${name}' is already registered`);
  }

  apps.push({
    name,
    loadApp,
    activeWhen,
    customProps,
    status: NOT_LOADED,
    bootstrap: null,
    mount: null,
    unmount: null,
  });

  // 注册后尝试重新计算当前路由下应该激活哪些应用。
  reroute();
}
