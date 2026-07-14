# qiankunMicroFrontendDemo

一个完整的 qiankun 微前端示例，包含：

- `main`：乾坤主应用
- `apps/vue3-app`：Vue 3 子应用
- `apps/react-app`：React 子应用
- `apps/vanilla-app`：非 webpack 构建的原生 JS 微应用

## 运行

```bash
cd qiankunMicroFrontendDemo
npm install
npm run install:all
npm run start
```

访问主应用：

```text
http://localhost:7100
```

## 端口

- 主应用：`7100`
- Vue 3 子应用：`7101`
- React 子应用：`7102`
- 原生 JS 子应用：`7103`

## 覆盖的 qiankun API

主应用中使用：

- `registerMicroApps`
- `start`
- `runAfterFirstMounted`
- `setDefaultMountApp`
- `addGlobalUncaughtErrorHandler`
- `initGlobalState`
- `loadMicroApp`
- `prefetchApps`

子应用中使用或适配：

- `bootstrap`
- `mount`
- `unmount`
- `update`
- `props.onGlobalStateChange`
- `props.setGlobalState`

## 说明

- Vue 和 React 子应用使用 Vite 构建，并通过 UMD 形式暴露 qiankun 生命周期。
- `vanilla-app` 不依赖 webpack，也不使用框架，直接在全局对象上暴露生命周期。
- 主应用同时演示了路由注册微应用和手动 `loadMicroApp` 挂载微应用。
