# Mini Wujie Vue 3

一个不依赖 `wujie` / `wujie-vue3` 的极简教学实现。主应用使用 Vue 3，并接入
`apps` 下的 React 与 Vue 两个 Vite 子应用。

## 包含的核心能力

- `mini-wujie-app` Web Component：每个子应用使用独立 Shadow DOM 承载页面
- iframe JavaScript 沙箱：子应用脚本在独立 `window` 中执行
- DOM 桥接：把沙箱内的 `document` 查询和 Vite 样式注入转发到 Shadow DOM
- 资源加载：抓取子应用 HTML，转换脚本、样式和静态资源地址
- EventBus：通过 `window.$wujie.bus` 实现主子应用双向通信
- Props：通过 `window.$wujie.props` 从主应用向子应用传值

> 这是用于理解无界核心原理的最小实现，不包含官方 Wujie 的预加载、降级模式、路由
> 同步、插件系统和完整浏览器兼容处理，不建议直接用于生产环境。

## 运行

需要 Node.js 22.18 或更高版本。

```bash
npm install
npm run dev
```

访问 <http://localhost:5173>。主应用、React 子应用和 Vue 子应用分别使用 `5173`、
`5174`、`5175` 端口。

```bash
npm run build
```

核心源码位于 `main/src/mini-wujie`：

- `element.js`：Web Component 生命周期
- `sandbox.js`：iframe 沙箱、HTML 解析、DOM 与样式桥接
- `bus.js`：基础发布订阅通信
- `MiniWujie.vue`：Vue 3 组件封装
