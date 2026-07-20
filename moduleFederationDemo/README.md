# Module Federation Demo

一个基于 Webpack 5 原生 `ModuleFederationPlugin` 的最小商城示例：

- **Host**（`http://localhost:3000`）：提供页面框架，在运行时加载远程组件。
- **Remote**（`http://localhost:3001`）：暴露 `productApp/ProductCard`，也可以独立运行。
- **Shared**：Host 和 Remote 将 `react`、`react-dom` 配置为单例，避免重复加载和 Hooks 冲突。

## 启动

```bash
cd moduleFederationDemo
npm install
npm run dev
```

然后访问：

- Host：http://localhost:3000
- Remote 独立页面：http://localhost:3001
- Remote 清单：http://localhost:3001/remoteEntry.js

## 构建

```bash
npm run build
```

构建结果分别位于 `host/dist` 和 `remote/dist`。

## 核心配置

Remote 通过 `exposes` 对外发布组件：

```js
new ModuleFederationPlugin({
  name: "productApp",
  filename: "remoteEntry.js",
  exposes: {
    "./ProductCard": "./src/ProductCard.jsx"
  }
});
```

Host 声明远程入口，然后像本地模块一样异步导入：

```js
// webpack.config.cjs
remotes: {
  // 完整配置会根据 Host 当前 hostname 动态加载 3001 端口的入口。
  productApp: "productApp@http://localhost:3001/remoteEntry.js"
}

// React 代码
const RemoteProductCard = React.lazy(() => import("productApp/ProductCard"));
```

生产环境中，可以将 Host 配置里的动态地址改为 Remote 的 CDN 地址，或从运行时配置中心获取。Remote 可以独立构建和发布，Host 不需要重新编译即可获取该入口下的新版本。
