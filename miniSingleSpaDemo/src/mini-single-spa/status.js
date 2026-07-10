// 应用状态机，生命周期只能按这些状态向前流转。
export const NOT_LOADED = "NOT_LOADED";
export const LOADING_SOURCE_CODE = "LOADING_SOURCE_CODE";
export const NOT_BOOTSTRAPPED = "NOT_BOOTSTRAPPED";
export const BOOTSTRAPPING = "BOOTSTRAPPING";
export const NOT_MOUNTED = "NOT_MOUNTED";
export const MOUNTING = "MOUNTING";
export const MOUNTED = "MOUNTED";
export const UNMOUNTING = "UNMOUNTING";
export const LOAD_ERROR = "LOAD_ERROR";
export const SKIP_BECAUSE_BROKEN = "SKIP_BECAUSE_BROKEN";

// 已挂载的应用才认为是 active，可以参与后续卸载判断。
export function isActive(app) {
  return app.status === MOUNTED;
}

// 执行用户传入的 activeWhen，判断当前 location 是否命中应用路由。
export function shouldBeActive(app) {
  try {
    return app.activeWhen(window.location);
  } catch (error) {
    console.error(`[mini-single-spa] activeWhen failed for ${app.name}`, error);
    return false;
  }
}
