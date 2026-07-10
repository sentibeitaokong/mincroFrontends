import {
  BOOTSTRAPPING,
  LOAD_ERROR,
  LOADING_SOURCE_CODE,
  MOUNTED,
  MOUNTING,
  NOT_BOOTSTRAPPED,
  NOT_LOADED,
  NOT_MOUNTED,
  SKIP_BECAUSE_BROKEN,
  UNMOUNTING,
} from "./status.js";

// single-spa 允许生命周期是函数数组；这里统一包装成串行执行的 Promise 函数。
function flattenLifecycle(lifecycle) {
  const fns = Array.isArray(lifecycle) ? lifecycle : [lifecycle];

  if (!fns.every((fn) => typeof fn === "function")) {
    throw new Error("Lifecycle must be a function or an array of functions");
  }
  //循环异步执行生命周期函数
  return (props) => fns.reduce((promise, fn) => promise.then(() => fn(props)), Promise.resolve());
}

// 每次执行生命周期时都传入相同结构的 props，包含应用名和注册时的 customProps。
function toProps(app) {
  return {
    name: app.name,
    ...app.customProps,
  };
}

// 加载应用源码，并从模块中提取 bootstrap / mount / unmount 生命周期。
export async function toLoadPromise(app) {
  if (app.status !== NOT_LOADED) {
    return app;
  }

  app.status = LOADING_SOURCE_CODE;

  try {
    const lifecycles = await app.loadApp(toProps(app));

    app.bootstrap = flattenLifecycle(lifecycles.bootstrap || (() => Promise.resolve()));
    app.mount = flattenLifecycle(lifecycles.mount);
    app.unmount = flattenLifecycle(lifecycles.unmount);
    app.status = NOT_BOOTSTRAPPED;
  } catch (error) {
    app.status = LOAD_ERROR;
    console.error(`[mini-single-spa] failed to load ${app.name}`, error);
  }

  return app;
}

// 首次挂载前执行 bootstrap，通常用于一次性的初始化工作。
export async function toBootstrapPromise(app) {
  if (app.status !== NOT_BOOTSTRAPPED) {
    return app;
  }

  app.status = BOOTSTRAPPING;

  try {
    await app.bootstrap(toProps(app));
    app.status = NOT_MOUNTED;
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
    console.error(`[mini-single-spa] failed to bootstrap ${app.name}`, error);
  }

  return app;
}

// 激活应用：执行 mount，将子应用渲染到页面上。
export async function toMountPromise(app) {
  if (app.status !== NOT_MOUNTED) {
    return app;
  }

  app.status = MOUNTING;

  try {
    await app.mount(toProps(app));
    app.status = MOUNTED;
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
    console.error(`[mini-single-spa] failed to mount ${app.name}`, error);
  }

  return app;
}

// 失活应用：执行 unmount，清理 DOM、事件监听等副作用。
export async function toUnmountPromise(app) {
  if (app.status !== MOUNTED) {
    return app;
  }

  app.status = UNMOUNTING;

  try {
    await app.unmount(toProps(app));
    app.status = NOT_MOUNTED;
  } catch (error) {
    app.status = SKIP_BECAUSE_BROKEN;
    console.error(`[mini-single-spa] failed to unmount ${app.name}`, error);
  }

  return app;
}
