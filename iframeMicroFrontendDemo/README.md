# iframeMicroFrontendDemo

一个基于 iframe 的微前端示例，包含一个主应用和两个子应用：

- `main`：主应用，负责加载 iframe、切换子应用、维护全局用户和主题
- `apps/todo`：Todo 子应用
- `apps/profile`：Profile 子应用
- `shared/message.js`：主应用和子应用复用的消息协议

## 运行

```bash
cd iframeMicroFrontendDemo
npm install
npm run start
```

打开 Vite 输出的地址即可，根路径会自动跳转到主应用：

```text
/
```

也可以直接访问：

```text
/main/index.html
```

## 通信方式

主应用和子应用通过 `window.postMessage` 通信。

### 主应用发送给子应用

- `host:init`：iframe 加载完成后同步当前主题和用户
- `host:theme`：主应用切换主题并广播给当前子应用
- `host:user`：主应用切换用户并发送给当前子应用

### 子应用发送给主应用

- `child:ready`：子应用启动完成，请求主应用同步状态
- `child:log`：子应用向主应用发送日志
- `child:set-user`：子应用修改用户，并通知主应用更新全局状态

## 目录结构

```text
iframeMicroFrontendDemo
├── main/                 # 主应用
├── apps/
│   ├── todo/             # Todo 子应用
│   └── profile/          # Profile 子应用
└── shared/message.js     # 通信消息协议
```

## 关键点

1. 主应用通过修改 iframe 的 `src` 切换子应用。
2. 子应用使用 `window.parent.postMessage` 向主应用发消息。
3. 主应用使用 `iframe.contentWindow.postMessage` 向子应用发消息。
4. 双方都校验 `event.origin` 和消息来源字段，避免接收未知消息。
5. iframe 天然提供 JS 和 CSS 隔离，但会带来路由、通信和性能方面的额外成本。
