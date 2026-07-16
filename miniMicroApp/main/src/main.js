/**
 * =========================================================
 *  Mini Micro App Demo — 主应用
 *  使用自定义实现的 mini-micro-app 框架（非第三方库）
 *  沙箱：基于 iframe sandbox 实现 JS/样式隔离
 *  通信：基于 postMessage + 自定义事件总线
 * =========================================================
 */

import {
  start,
  mountMicroApp,
  unmountApp,
  setData,
  addDataListener,
} from './mini-micro-app.js'

// =========================================================
//  启动 Mini Micro App 框架
// =========================================================

start()

// =========================================================
//  子应用配置
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

/** 当前激活的子应用名称 */
let currentAppName = apps[0].name

/** 最近一次从子应用收到的消息 */
let lastChildMessage = null

/**
 * 挂载指定子应用
 * @param {string} name
 */
async function mountChildApp(name) {
  const app = apps.find((item) => item.name === name)
  const container = document.querySelector(`[data-app-container="${name}"]`)
  if (!app || !container) return

  try {
    await mountMicroApp(container, app)
    console.log(`[主应用] 子应用 "${name}" 挂载成功`)
  } catch (err) {
    console.error(`[主应用] 子应用 "${name}" 挂载失败:`, err)
  }
}

// =========================================================
//  子应用切换
// =========================================================

/**
 * 切换到指定子应用
 *
 * 实现方式：
 *   两个 div 容器同时存在于 DOM 中，通过 display 切换。
 *   切换时挂载新应用、卸载旧应用。
 *
 * @param {string} name
 */
async function switchApp(name) {
  const nextApp = apps.find((app) => app.name === name)
  if (!nextApp || nextApp.name === currentAppName) return

  // 卸载当前子应用
  await unmountApp(currentAppName)

  // 更新状态
  currentAppName = nextApp.name

  // 更新导航激活样式
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.appName === nextApp.name)
  })

  // 切换容器显示
  document.querySelectorAll('.micro-panel').forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.appName === nextApp.name)
  })

  // 更新顶栏标签
  document.querySelector('#current-app-label').textContent = nextApp.label

  // 挂载新子应用
  await mountChildApp(nextApp.name)

  // 下发数据
  setData(nextApp.name, {
    from: 'main',
    message: `切换到 ${nextApp.label}`,
    updatedAt: new Date().toLocaleTimeString(),
    appName: nextApp.name,
  })
}

// =========================================================
//  子应用 → 主应用 通信
// =========================================================

/**
 * 更新侧边栏子应用消息展示
 * @param {Object} data
 */
function updateChildMessage(data) {
  lastChildMessage = data

  const msgEl = document.querySelector('#child-message')
  const metaEl = document.querySelector('#child-message-meta')
  if (!msgEl || !metaEl) return

  msgEl.textContent = data.message || '收到子应用消息'
  metaEl.textContent = `${data.from || '子应用'}${data.source ? ` / ${data.source}` : ''}，${data.updatedAt || new Date().toLocaleTimeString()}`
}

/**
 * 注册子应用消息监听
 */
function registerChildListeners() {
  apps.forEach((app) => {
    addDataListener(app.name, (data) => {
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
//  渲染主应用界面
// =========================================================

function renderShell() {
  const root = document.querySelector('#app')
  const initialApp = apps[0]

  root.innerHTML = `
    <main class="shell">
      <!-- ====== 左侧侧边栏 ====== -->
      <aside class="sidebar">
        <div class="brand">
          <span class="brand-mark">M</span>
          <div>
            <h1>Mini Micro App</h1>
            <p>自实现微前端框架 — 沙箱 + 通信</p>
          </div>
        </div>

        <!-- 导航按钮 -->
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

        <!-- 主应用数据下发面板 -->
        <section class="panel">
          <h2>主应用数据</h2>
          <label for="message">发送给当前子应用</label>
          <input id="message" value="来自主应用的数据" />
          <button class="send" type="button">发送数据</button>
        </section>

        <!-- 子应用消息接收面板 -->
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
        <header class="topbar">
          <div>
            <p class="eyebrow">当前挂载</p>
            <h2 id="current-app-label">${initialApp.label}</h2>
          </div>
        </header>

        <div class="micro-container">
          ${apps.map((item) => `
            <div class="micro-panel ${item.name === currentAppName ? 'active' : ''}" data-app-name="${item.name}">
              <div data-app-container="${item.name}" style="width:100%;height:620px;"></div>
            </div>
          `).join('')}
        </div>
      </section>
    </main>
  `

  // ====== 事件绑定 ======

  // 导航切换
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', async (event) => {
      event.preventDefault()
      event.stopPropagation()
      await switchApp(button.dataset.appName)
    })
  })

  // 发送数据
  document.querySelector('.send').addEventListener('click', () => {
    const message = document.querySelector('#message').value.trim() || '空消息'
    const activeApp = apps.find((a) => a.name === currentAppName)
    setData(currentAppName, {
      from: 'main',
      message,
      updatedAt: new Date().toLocaleTimeString(),
      appName: activeApp?.name || currentAppName,
    })
  })
}

// =========================================================
//  启动
// =========================================================

// 渲染界面
renderShell()

// 注册子应用消息监听
registerChildListeners()

// 挂载初始子应用
mountChildApp(apps[0].name)

// 下发初始数据
setData(apps[0].name, {
  from: 'main',
  message: '初始数据加载完毕',
  updatedAt: new Date().toLocaleTimeString(),
  appName: apps[0].name,
})
