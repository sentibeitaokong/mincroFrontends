# microFrontends

微前端方案与原理示例。

本仓库收录了多种微前端方案的使用示例，以及对部分框架核心能力的精简实现，适合用来比较不同方案的加载方式、隔离机制、通信方式和生命周期管理。

## 框架与构建工具示例

### [`iframeMicroFrontendDemo`](./iframeMicroFrontendDemo)

基于原生 `iframe` 的微前端示例。主应用负责切换 Todo、Profile 两个子应用，并通过 `postMessage` 同步用户和主题。该项目展示了 iframe 天然的 JavaScript/CSS 隔离能力，以及主子应用通信和消息来源校验。

### [`singleSpaDemo`](./singleSpaDemo)

基于 `single-spa` 的多框架组合示例。基座使用 Webpack 和 import map 管理应用，按路由加载 React 与 Vue 子应用，展示了子应用注册、路由激活和 `bootstrap`、`mount`、`unmount` 生命周期。

### [`qiankunMicroFrontendDemo`](./qiankunMicroFrontendDemo)

完整的 qiankun 使用示例。主应用接入 Vue 3、React 和原生 JavaScript 子应用，覆盖路由注册、手动挂载、预加载、全局状态通信、生命周期钩子和全局错误处理等常用能力。

### [`wujieDemo`](./wujieDemo)

基于 `wujie-vue3` 的微前端示例。Vue 3 主应用同时接入 React 和 Vue 子应用，展示子应用切换与保活、iframe JavaScript 沙箱、样式隔离、Props 传值和 EventBus 双向通信。

### [`micro-app`](./micro-app)

基于京东 `@micro-zoe/micro-app` 的示例。原生 Vite 主应用通过 `<micro-app>` 自定义元素接入 React 与 Vue 子应用，并演示子应用独立运行、生命周期适配和主应用数据下发。

### [`moduleFederationDemo`](./moduleFederationDemo)

基于 Webpack 5 `ModuleFederationPlugin` 的模块联邦示例。React Host 在运行时加载 Remote 暴露的商品卡片组件，并将 React、React DOM 配置为共享单例，展示远程组件独立构建和发布的方式。

### [`viteModuleFederationDemo`](./viteModuleFederationDemo)

基于 Vite 和 `@originjs/vite-plugin-federation` 的 React 模块联邦示例。项目同样由 Host 与 Remote 组成，重点展示 Vite 环境下远程模块的构建、预览、动态加载和共享依赖配置。

## 原理实现示例

以下项目是用于学习原理的精简实现，未覆盖对应成熟框架的全部能力，不建议直接用于生产环境。

### [`systemJsDemo`](./systemJsDemo)

手写 Mini SystemJS 模块加载器。项目实现了 import map 解析、`System.register`、`System.import`、依赖注入、导出收集和模块缓存，并通过 `mount`、`unmount` 生命周期切换 Dashboard 与 Orders 应用。

### [`miniSingleSpaDemo`](./miniSingleSpaDemo)

手写 single-spa 核心调度流程。项目实现应用注册、路由劫持、激活规则、状态管理和 `bootstrap`、`mount`、`unmount` 生命周期，可观察 Home、Orders、Profile 应用随路由变化进行挂载和卸载。

### [`miniQiankunDemo`](./miniQiankunDemo)

手写精简版 qiankun。项目实现 HTML 入口加载、路由匹配、生命周期管理、全局状态、手动挂载、资源预加载、错误处理和可选的 Proxy JavaScript 沙箱，并提供三个原生子应用验证这些能力。

### [`miniWujieDemo`](./miniWujieDemo)

手写精简版无界。项目使用 Web Component 和 Shadow DOM 承载页面，在 iframe 中执行子应用脚本，并实现 DOM/样式桥接、资源地址转换、Props 传值和 EventBus 通信，接入 React 与 Vue 子应用。

### [`miniMicroApp`](./miniMicroApp)

手写精简版 Micro App。项目使用 `<mini-micro-app>` 自定义元素管理 React、Vue 子应用，通过 iframe `srcdoc` 提供 JavaScript 与样式隔离，并通过 `postMessage` 和事件中心完成主子应用数据通信。

## 方案侧重点

| 方案 | 主要加载方式 | 隔离特点 | 适合了解 |
| --- | --- | --- | --- |
| iframe | 加载完整子页面 | 浏览器原生强隔离 | 最基础的微前端组合与通信 |
| single-spa / qiankun | 路由调度子应用生命周期 | 由框架或沙箱处理 | 多框架应用编排与生命周期 |
| Wujie | iframe 沙箱 + Web Component | JS 与渲染环境兼顾 | 强隔离、保活与通信 |
| Micro App | 自定义元素加载子应用 | 框架提供沙箱能力 | 类 Web Component 的接入体验 |
| Module Federation | 运行时加载远程模块 | 共享依赖，不提供页面级隔离 | 跨项目复用组件和模块 |
| SystemJS | import map + 运行时模块加载 | 取决于上层应用设计 | 模块解析、加载和依赖管理原理 |
