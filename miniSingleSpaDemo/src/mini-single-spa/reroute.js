import { apps } from "./apps.js";
import { toBootstrapPromise, toLoadPromise, toMountPromise, toUnmountPromise } from "./lifecycles.js";
import { isActive, shouldBeActive } from "./status.js";

// start 之前只预加载源码；start 之后才真正执行 mount。
let started = false;
// 防止路由快速连续变化时，多个 reroute 流程并发执行导致状态错乱。
let appChangeUnderway = false;
let pendingReroute = false;

export function start() {
  started = true;
  return reroute();
}

export async function reroute() {
  if (appChangeUnderway) {
    pendingReroute = true;
    return;
  }

  appChangeUnderway = true;

  // 当前已挂载但新路由不再命中的应用，需要卸载。
  const appsToUnload = apps.filter((app) => isActive(app) && !shouldBeActive(app));
  // 当前未挂载但新路由命中的应用，需要加载并挂载。
  const appsToLoad = apps.filter((app) => !isActive(app) && shouldBeActive(app));

  try {
    await Promise.all(appsToUnload.map(toUnmountPromise));

    if (started) {
      await Promise.all(
        appsToLoad.map((app) => toLoadPromise(app).then(toBootstrapPromise).then(toMountPromise)),
      );
    } else {
      await Promise.all(appsToLoad.map(toLoadPromise));
    }
  } finally {
    appChangeUnderway = false;

    // 如果调度过程中又发生了路由变化，结束当前流程后再补跑一次。
    if (pendingReroute) {
      pendingReroute = false;
      await reroute();
    }
  }
}
