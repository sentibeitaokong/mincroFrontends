/**
 * =========================================================
 *  Micro App Demo — 主应用入口
 *  基于 @micro-zoe/micro-app 框架（京东 Micro App）
 *  管理 React 与 Vue 3 两个 Vite 子应用
 * =========================================================
 *
 * 功能简介：
 *   1. 启动 Micro App 框架（iframe 模式，确保 Vite 子应用 HMR 正常）
 *   2. 左侧导航栏切换 React / Vue 子应用
 *   3. 主应用向下发送数据（setData）
 *   4. 接收子应用向上通知（addDataListener）
 *   5. 同时渲染两个 <micro-app>，通过 display:none/block 切换，
 *      避免 DOM 销毁重建导致需要重新加载脚本
 *
 * 端口规划：
 *   主应用  → http://localhost:3000
 *   React   → http://localhost:3001  (子应用独立访问端口)
 *   Vue 3   → http://localhost:3002  (子应用独立访问端口)
 */

import microApp from '@micro-zoe/micro-app'
import './style.css'

// =========================================================
//  启动 Micro App 框架
// =========================================================
//
// iframe: true  — 使用 iframe 模式加载子应用。
//    ✅ 子应用的 type="module" script 和 Vite HMR 完全正常工作
//    ✅ 子应用与主应用样式 / 全局变量完全隔离
//    ❌ 通信需要通过 microApp.setData / addDataListener API
//
// iframe: false — 使用 Web Component 模式（默认）。
//    ✅ 子应用 DOM 直接嵌入主应用页面，通信更直接
//    ❌ Vite 开发环境的 type="module" 脚本会报错：
//       "Cannot use import statement outside a module"
//
// 为了兼容 Vite 子应用的开发模式，这里使用 iframe: true。

microApp.start({
  iframe: true,
})

// =========================================================
//  子应用配置列表
// =========================================================

const apps = [
  {
    name: 'react-app',
    label: 'React 子应用',
    url: 'http://localhost:3001/',
  },
  {
    name: 'vue-app',
    label: 'Vue 子应用',
    url: 'http://localhost:3002/',
  },
]

// =========================================================
//  内部状态
// =========================================================

/** 当前激活的子应用名称，初始为配置列表第一项 (React) */
let currentAppName = apps[0].name

/** 最近一次从子应用收到的消息，用于侧边栏「子应用消息」面板展示 */
let lastChildMessage = null

// =========================================================
//  工具函数
// =========================================================

/**
 * 创建要发送给子应用的数据对象
 *
 * 这个对象会通过以下两种方式之一投递给子应用：
 *   - <micro-app data='...'>            （初次挂载）
 *   - microApp.setData(name, data)      （切换 / 点击发送按钮时）
 *
 * @param {Object} app     目标子应用的配置对象
 * @param {string} message 消息文本内容
 * @returns {Object} 统一结构的数据载荷
 */
function createMicroData(app, message) {
  return {
    from: 'main',                     // 来源标识
    message,                          // 消息内容
    updatedAt: new Date().toLocaleTimeString(), // 更新时间
    appName: app.name,                // 目标子应用名称
  }
}

/**
 * 获取当前正在激活的子应用配置
 *
 * 根据 currentAppName 从 apps 列表中匹配完整的配置对象，
 * 如果找不到则回退到第一个子应用。
 *
 * @returns {Object} 子应用配置 { name, label, url }
 */
function getCurrentApp() {
  return apps.find((app) => app.name === currentAppName) ?? apps[0]
}

// =========================================================
//  子应用切换
// =========================================================

/**
 * 切换到指定的子应用
 *
 * 实现方式是「显示 / 隐藏」而非「销毁 / 重建」：
 *   两个 <micro-app> 标签一开始就同时存在于 DOM 中，
 *   各自加载自己的子应用，切换时只改变 CSS display 属性。
 *
 * 优点：
 *   切换无需重新拉取子应用资源，瞬间完成。
 *   子应用内部状态（如 React 的 useState / Vue 的 ref）得以保留。
 *
 * @param {string} name 目标子应用的名称（对应 apps 数组中的 name）
 */
function switchApp(name) {
  const nextApp = apps.find((app) => app.name === name)
  if (!nextApp) return

  currentAppName = nextApp.name

  // 1. 更新左侧导航按钮的激活样式
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.appName === nextApp.name)
  })

  // 2. 切换右侧子应用面板的显示/隐藏
  document.querySelectorAll('.micro-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.appName === nextApp.name)
  })

  // 3. 更新顶栏标签
  document.querySelector('#current-app-label').textContent = nextApp.label

  // 4. 通知子应用已激活（子应用可在回调中刷新数据展示）
  microApp.setData(nextApp.name, createMicroData(nextApp, `切换到 ${nextApp.label}`))
}

// =========================================================
//  子应用 → 主应用 通信
// =========================================================

/**
 * 更新侧边栏「子应用消息」面板的内容
 *
 * 当子应用调用 microApp.dispatch() 时，这个函数会被触发，
 * 将子应用传来的数据显示在主应用左侧面板上。
 *
 * @param {Object} payload  子应用 dispatch 出来的数据对象
 */
function updateChildMessage(payload) {
  lastChildMessage = payload

  const message = document.querySelector('#child-message')
  const meta = document.querySelector('#child-message-meta')

  if (!message || !meta) return

  message.textContent = payload.message || '收到子应用消息'
  meta.textContent = `${payload.from || '子应用'}${payload.source ? ` / ${payload.source}` : ''}，${payload.updatedAt || new Date().toLocaleTimeString()}`
}

/**
 * 注册所有子应用的数据监听器
 *
 * 当任何一个子应用调用 microApp.dispatch({ ... }) 时，
 * 这里注册的监听器会被触发，从而将子应用消息展示在主应用面板。
 *
 * 注册时机：renderShell() 之后立即调用。
 */
function registerChildListeners() {
  apps.forEach((app) => {
    microApp.addDataListener(app.name, (data) => {
      updateChildMessage({
        from: data?.from || app.name,
        message: data?.message || `${app.label} 发来一条消息`,
        source: data?.source || app.label,
        updatedAt: data?.updatedAt || new Date().toLocaleTimeString(),
      })
    })
  })
}

// =========================================================
//  主应用页面渲染
// =========================================================

/**
 * 渲染主应用界面
 *
 * 布局结构（ASCII 图）：
 *
 * ┌──────────────────────────────────────────────────┐
 * │  侧边栏 (320px)           │  工作区 (flex: 1)      │
 * ├──────────────────────────┼───────────────────────┤
 * │  品牌标识                 │  当前应用标题           │
 * │  ┌────────────────────┐  │  ┌─────────────────┐  │
 * │  │  React 子应用  ← 激活│  │  │  <micro-app>    │  │
 * │  │  Vue 子应用         │  │  │  (显示激活的子应用)│  │
 * │  └────────────────────┘  │  └─────────────────┘  │
 * │  主应用数据               │                        │
 * │  [输入框] [发送按钮]     │                        │
 * │  子应用消息               │                        │
 * │  等待子应用通知...        │                        │
 * └──────────────────────────┴───────────────────────┘
 *
 * 关键设计：
 *   .micro-panel 默认 display: none
 *   .micro-panel.active 切换为 display: block
 *   从而实现在两个已经加载的子应用间快速切换。
 */
function renderShell() {
  const root = document.querySelector('#app')
  const initialApp = getCurrentApp()

  root.innerHTML = `
    <main class="shell">
      <!-- ====== 左侧侧边栏 ====== -->
      <aside class="sidebar">
        <!-- 品牌标识 -->
        <div class="brand">
          <span class="brand-mark">M</span>
          <div>
            <h1>Micro App Demo</h1>
            <p>JD Micro App — 微前端</p>
          </div>
        </div>

        <!-- 子应用导航按钮区 -->
        <nav class="nav" aria-label="子应用导航">
          ${apps.map((item) => `
            <button
              class="nav-item ${item.name === currentAppName ? 'active' : ''}"
              type="button"
              data-app-name="${item.name}"
            >
              <span>${item.label}</span>
            </button>
          `).join('')}
        </nav>

        <!-- 数据下发面板：主应用 → 子应用 -->
        <section class="panel">
          <h2>主应用数据</h2>
          <label for="message">发送给当前子应用</label>
          <input id="message" value="来自主应用的数据" />
          <button class="send" type="button">发送数据</button>
        </section>

        <!-- 消息接收面板：子应用 → 主应用 -->
        <section class="panel child-panel">
          <h2>子应用消息</h2>
          <p id="child-message">${lastChildMessage?.message || '等待子应用通知'}</p>
          <small id="child-message-meta">${
            lastChildMessage
              ? `${lastChildMessage.from}${lastChildMessage.source ? ` / ${lastChildMessage.source}` : ''}，${lastChildMessage.updatedAt}`
              : '点击子应用里的"通知主应用"按钮'
          }</small>
        </section>
      </aside>

      <!-- ====== 右侧工作区 ====== -->
      <section class="workspace">
        <!-- 顶栏：显示当前激活的子应用名称 -->
        <header class="topbar">
          <div>
            <p class="eyebrow">当前挂载</p>
            <h2 id="current-app-label">${initialApp.label}</h2>
          </div>
        </header>

        <!-- 子应用嵌入容器：两个 micro-app 同时存在，通过 css 切换显示 -->
        <div class="micro-container">
          ${apps.map((item) => `
            <div class="micro-panel ${item.name === currentAppName ? 'active' : ''}" data-app-name="${item.name}">
              <micro-app
                name="${item.name}"
                url="${item.url}"
                data='${JSON.stringify(createMicroData(item, '初始数据'))}'
              ></micro-app>
            </div>
          `).join('')}
        </div>
      </section>
    </main>
  `

  // =========================================================
  //  事件绑定
  // =========================================================

  // 左侧导航按钮 → 切换子应用
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      switchApp(button.dataset.appName)
    })
  })

  // 发送按钮 → 向当前子应用下发数据
  document.querySelector('.send').addEventListener('click', () => {
    const message = document.querySelector('#message').value.trim() || '空消息'
    const activeApp = getCurrentApp()
    microApp.setData(activeApp.name, createMicroData(activeApp, message))
  })
}

// =========================================================
//  启动
// =========================================================

// 渲染主应用界面
renderShell()

// 注册子应用数据监听器（必须在 renderShell 之后，因为需要 DOM 元素）
registerChildListeners()