# miniSingleSpaDemo — mini single-spa core 精简实现

一个精简版 single-spa 核心源码示例，用原生 ES Module 展示微前端运行时的关键流程：

- `registerApplication`：注册子应用及其激活规则
- `start`：启动应用调度
- `reroute`：根据当前路由决定加载、挂载、卸载哪些应用
- 生命周期：`bootstrap → mount → unmount`
- 路由劫持：监听 `hashchange` / `popstate`，并包装 `pushState` / `replaceState`

## 运行

```bash
cd miniSingleSpaDemo
npm install
npm run start
```

然后打开 Vite 输出的地址，点击顶部导航（Home / Orders / Profile）观察不同子应用的挂载与卸载效果。

## 目录结构

```text
miniSingleSpaDemo
├── apps/                      # 示例子应用（home / orders / profile）
│   ├── home.js
│   ├── orders.js
│   └── profile.js
├── src/
│   ├── main.js                # 注册应用并启动
│   └── mini-single-spa/       # 精简版 single-spa 核心
│       ├── index.js           # 入口，导出 registerApplication 和 start
│       ├── apps.js            # 应用注册表
│       ├── status.js          # 应用状态常量及辅助判断函数
│       ├── navigation.js      # 路由事件劫持（hashchange / popstate / pushState / replaceState）
│       ├── reroute.js         # 调度核心：根据路由计算需要加载/卸载/挂载的应用
│       └── lifecycles.js      # 生命周期执行器（load / bootstrap / mount / unmount）
├── index.html                 # 页面入口，包含容器 DOM 和导航链接
├── package.json
└── README.md
```

## 核心流程

1. `registerApplication` 保存应用配置，并设置初始状态为 `NOT_LOADED`。
2. `start` 将运行时切到 started 状态，并触发一次 `reroute`。
3. `reroute` 计算需要卸载和挂载的应用：
   - 已挂载但新路由不再命中的应用 → 执行 `unmount`
   - 未挂载但新路由命中的应用 → 依次执行 `loadApp → bootstrap → mount`
4. 每次路由变化（hash / popstate / pushState / replaceState）都会重新触发 `reroute`。
