# Vite Module Federation Demo

一个由 Vite 驱动的 React 模块联邦示例，使用
[`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation)：

- **Host**：页面框架与购物车状态，开发地址为 <http://localhost:5173>。
- **Remote**：暴露商品卡片，并可独立预览，地址为 <http://localhost:4174>。
- **Shared**：`react` 和 `react-dom` 配置为共享单例。

## 运行

```bash
cd viteModuleFederationDemo
npm install
npm run dev
```

`npm run dev` 会先构建 Remote，再同时运行 Remote 构建监听、Remote 预览服务和
Host 开发服务。之所以采用这个流程，是因为该联邦插件的 Remote 在开发阶段也需要
生成 `remoteEntry.js`。

打开以下地址：

- Host：<http://localhost:5173>
- Remote 独立页面：<http://localhost:4174>
- 联邦入口：<http://localhost:4174/assets/remoteEntry.js>

## 构建

```bash
npm run build
```

产物分别生成到 `host/dist` 和 `remote/dist`。

## 核心代码

Remote 在 `remote/vite.config.js` 中暴露组件：

```js
federation({
  name: "productApp",
  filename: "remoteEntry.js",
  exposes: {
    "./ProductCard": "./src/ProductCard.jsx",
  },
});
```

Host 注册 Remote，并像导入本地模块一样异步加载：

```js
// host/vite.config.js
remotes: {
  productApp: "http://localhost:4174/assets/remoteEntry.js",
}

// host/src/App.jsx
const RemoteProductCard = React.lazy(
  () => import("productApp/ProductCard"),
);
```

通过环境变量可以覆盖远程入口，便于部署到不同环境：

```bash
VITE_REMOTE_ENTRY=https://cdn.example.com/assets/remoteEntry.js npm run build:host
```

Remote 可以独立构建和发布；只要入口地址与暴露模块名称不变，Host 无需同步发布。
