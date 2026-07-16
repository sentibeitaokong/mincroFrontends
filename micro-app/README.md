# 京东 Micro App 微前端 Demo

这个示例基于 `@micro-zoe/micro-app`，包含一个主应用和两个子应用：

- `main`: 原生 Vite 主应用，负责启动 micro-app、导航切换和全局数据下发。
- `apps/react-app`: React 子应用。
- `apps/vue-app`: Vue 子应用。

## 启动

```bash
cd micro-app
npm run install:all
npm run dev
```

打开 `http://localhost:3000`。

## 端口

- 主应用: `3000`
- React 子应用: `3001`
- Vue 子应用: `3002`

子应用也可以单独访问对应端口独立运行。

## 关键点

- 主应用在 `main/src/main.js` 中调用 `microApp.start()`。
- 主应用通过 `<micro-app name="..." url="...">` 挂载子应用。
- 子应用 Vite 配置开启 CORS，并固定端口，方便主应用跨端口加载。
- React/Vue 子应用入口都兼容 Micro App 生命周期和独立运行。
