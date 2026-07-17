# Wujie 微前端示例

该示例使用 Vue 3 作为主应用，通过 `wujie-vue3` 同时接入 React 和 Vue 两个子应用。

示例包含子应用切换与保活、样式和 JavaScript 沙箱、主应用 Props 下发，以及基于
Wujie EventBus 的主子应用双向通信。两个子应用也可以独立打开运行。

## 启动

项目需要 Node.js 22.18 或更高版本。

```bash
npm run install:all
npm run dev
```

启动后访问 <http://localhost:5173>。主应用、React 子应用和 Vue 子应用分别运行在
`5173`、`5174`、`5175` 端口。

如需修改子应用地址，可在启动主应用时设置 `VITE_REACT_APP_URL` 和
`VITE_VUE_APP_URL` 环境变量。
