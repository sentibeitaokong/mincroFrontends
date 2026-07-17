/**
 * mini-micro-app — 一个精简的微前端运行时。
 *
 * 架构概览：
 * 每个子应用通过自定义元素 `<mini-micro-app>` 承载，元素内部维护一个 iframe。
 * - iframe 负责隔离子应用的 JavaScript 和 CSS，每个子应用运行在独立的沙箱中；
 * - 自定义元素负责管理子应用的加载、挂载、卸载以及主子应用之间的双向通信；
 * - 通信基于 postMessage，通过自定义的 channel 协议过滤无关消息。
 *
 * 使用方式：
 *   1. registerApp(name, container, url) — 注册子应用配置
 *   2. start()                        — 启动全局消息监听
 *   3. mountApp(name, initData)       — 挂载子应用到注册时指定的容器
 *
 * 也可直接使用 mountMicroApp(container, options, initData) 跳过注册步骤。
 */

// ============================================================
//  postMessage 消息协议常量
// ============================================================

// CHANNEL 作为消息命名空间，避免与页面中其他 postMessage 消息混淆。
const CHANNEL = '__mini_micro_app__'

// 子应用 → 主应用：桥接脚本已就绪，主应用可以安全下发初始化数据。
const BRIDGE_READY = 'ready'

// 子应用 → 主应用：子应用通过 window.microApp.dispatch() 向主应用派发数据。
const CHILD_DATA = 'child-data'

// 主应用 → 子应用：主应用向子应用下发数据。
const PARENT_DATA = 'parent-data'

// 主应用 → 子应用：通知子应用即将卸载，子应用应执行 unmount 生命周期钩子。
const PARENT_UNMOUNT = 'unmount'

// ============================================================
//  全局状态
// ============================================================

// 注册表：保存所有已注册的子应用配置，key 为应用名。
const registeredApps = new Map()

// 挂载表：保存当前运行中的 `<mini-micro-app>` 元素实例，key 为应用名。
const mountedApps = new Map()

// 主应用侧的数据监听器：key 为应用名，value 为 Set<function>。
// 当子应用通过 dispatch 派发数据时，这些监听器会被依次调用。
const mainListeners = new Map()

// 标记全局 message 监听是否已启动，确保 start() 只生效一次。
let started = false

// ============================================================
//  工具函数
// ============================================================

/**
 * 转义即将写入 srcdoc 的动态内容，避免破坏生成的 HTML 结构。
 * 处理 & < > " ' 五个特殊字符。
 *
 * @param {*} value - 需要转义的值，会先转换为字符串
 * @returns {string} 转义后的安全字符串
 */
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

/**
 * 生成一个简单的错误页面 HTML，用于在子应用加载失败时展示。
 *
 * @param {string} message - 错误信息
 * @returns {string} 完整的 HTML 文档字符串
 */
function errorDocument(message) {
  return '<!doctype html><meta charset="utf-8"><body style="font:16px sans-serif;padding:2rem;color:#b91c1c">' +
    escapeHtml(message) + '</body>'
}

/**
 * 生成注入子应用的通信桥接脚本。
 *
 * 该脚本会以 `<script>` 标签的形式注入到子应用的 HTML 中，
 * 先于子应用入口执行，因此子应用启动时即可通过 window.microApp
 * 接收主应用数据、向主应用派发数据，并响应卸载通知。
 *
 * 注入的脚本提供以下能力：
 * - window.__MICRO_APP_ENVIRONMENT__ 和 __MICRO_APP_NAME__ 标识运行环境
 * - window.microApp.getData()              获取主应用下发的数据
 * - window.microApp.addDataListener(fn)    注册数据变更监听器
 * - window.microApp.removeDataListener(fn) 移除数据变更监听器
 * - window.microApp.dispatch(data)         向主应用派发数据
 * - 兼容 window['micro-app-' + name] 的传统生命周期钩子形式
 *
 * @param {string} name - 子应用名称
 * @returns {string} 完整的 <script> 标签字符串
 */
function bridgeScript(name) {
  const safeName = JSON.stringify(name)
  const safeChannel = JSON.stringify(CHANNEL)
  return `<script>(function () {
    var name = ${safeName}, channel = ${safeChannel}, data = {}, listeners = [];
    window.__MICRO_APP_ENVIRONMENT__ = true;
    window.__MICRO_APP_NAME__ = name;
    // 暴露给子应用的最小通信 API。
    window.microApp = {
      getData: function () { return data; },
      addDataListener: function (fn, immediate) {
        if (typeof fn !== 'function' || listeners.indexOf(fn) !== -1) return;
        listeners.push(fn);
        // immediate 为 true 时，如果已有数据则立即回调一次，确保监听器能拿到初始状态。
        if (immediate && data && Object.keys(data).length) try { fn(data); } catch (_) {}
      },
      removeDataListener: function (fn) {
        var index = listeners.indexOf(fn); if (index !== -1) listeners.splice(index, 1);
      },
      dispatch: function (value) {
        window.parent.postMessage({ channel: channel, type: '${CHILD_DATA}', appName: name, data: value }, '*');
      }
    };
    // 更新子应用持有的数据快照，并通知所有数据监听器。
    function notify(value) {
      data = value == null ? {} : value;
      listeners.slice().forEach(function (fn) { try { fn(data); } catch (_) {} });
    }
    // 只接收当前 iframe 的父窗口通过本运行时协议发送的消息。
    window.addEventListener('message', function (event) {
      if (event.source !== window.parent || !event.data || event.data.channel !== channel) return;
      if (event.data.type === '${PARENT_DATA}') notify(event.data.data);
      if (event.data.type === '${PARENT_UNMOUNT}') {
        var lifecycle = window['micro-app-' + name];
        if (lifecycle && typeof lifecycle.unmount === 'function') try { lifecycle.unmount(); } catch (_) {}
      }
    });
    // 通知主应用桥接层已就绪，此后主应用可以安全地下发初始化数据。
    window.parent.postMessage({ channel: channel, type: '${BRIDGE_READY}', appName: name }, '*');
    // 兼容通过 window['micro-app-' + name] 暴露生命周期的现有示例应用。
    // 轮询检测 mount 方法，最多轮询 100 次（约 5 秒），超时则放弃。
    var attempts = 0, timer = setInterval(function () {
      var lifecycle = window['micro-app-' + name];
      if (lifecycle && typeof lifecycle.mount === 'function') {
        try { lifecycle.mount(document); } catch (_) {}
        clearInterval(timer);
      } else if (++attempts > 100) clearInterval(timer);
    }, 50);
  }());</script>`
}

/**
 * 对子应用 HTML 进行预处理：注入 base 标签和桥接脚本，移除 Vite HMR 客户端。
 *
 * 处理步骤：
 * 1. 注入 <base> 标签，使子应用 HTML 中的相对路径仍相对于子应用地址解析
 * 2. 移除 Vite 开发服务器的 HMR 客户端脚本（在 srcdoc 环境中无效）
 * 3. 注入桥接脚本到 <head> 或 <body> 之前
 *
 * @param {string} html - 子应用的原始 HTML 字符串
 * @param {string} url  - 子应用的入口 URL
 * @param {string} name - 子应用名称
 * @returns {string} 处理后的 HTML 字符串
 */
function prepareHtml(html, url, name) {
  // base 让子应用 HTML 中的相对路径仍相对于子应用地址解析。
  const base = `<base href="${escapeHtml(url.endsWith('/') ? url : url + '/')}">`
  // Vite HMR 客户端依赖子应用开发服务器，在 srcdoc 环境中无需保留。
  html = html.replace(/<script\b[^>]*\bsrc=["']\/@vite\/client["'][^>]*>\s*<\/script>/gi, '')
  const injected = base + bridgeScript(name)
  // 优先注入到 </head> 之前；如果没有 <head>，则注入到 <body> 之前；
  // 如果都没有，则直接拼接在 HTML 最前面。
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, injected + '</head>')
  if (/<body\b/i.test(html)) return html.replace(/<body\b/i, injected + '<body')
  return injected + html
}

// ============================================================
//  自定义元素：<mini-micro-app>
// ============================================================

/**
 * 微前端应用的自定义元素。
 *
 * 每个 `<mini-micro-app>` 元素内部维护一个 iframe，通过 srcdoc 加载子应用。
 * 元素提供以下生命周期和 API：
 * - 自动加载：插入 DOM 时自动调用 load() 拉取并渲染子应用
 * - 自动卸载：移出 DOM 时自动调用 destroy() 清理资源
 * - setData(data)：向子应用下发数据
 * - addDataListener / removeDataListener：监听子应用派发的数据
 * - datachange 事件：子应用数据变更时的 DOM 事件通知
 */
class MiniMicroAppElement extends HTMLElement {
  constructor() {
    super()
    // _ready 标记桥接层是否已就绪。就绪前主应用下发的数据暂存到 _pendingData。
    this._ready = false
    // _pendingData 只保留桥接层就绪前最后一次下发的数据。
    this._pendingData = undefined
    // 主应用侧注册的数据变更回调集合。
    this._listeners = new Set()
    // 缓存加载 Promise，避免重复发起 fetch 请求。
    this._loadPromise = null
    // 使用 Shadow DOM 封装内部结构，隐藏 iframe 实现细节。
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<style>:host{display:block;width:100%;height:100%;min-height:1px}iframe{display:block;width:100%;height:100%;min-height:1px;border:0}</style>' +
      '<iframe title="micro app" loading="eager"></iframe>'
    this._iframe = this.shadowRoot.querySelector('iframe')
  }

  /**
   * 自定义元素插入文档时自动触发，启动子应用加载流程。
   */
  connectedCallback() {
    this.load()
  }

  /**
   * 自定义元素移出文档时自动触发，释放 iframe 和监听器持有的资源。
   */
  disconnectedCallback() {
    this.destroy()
  }

  /** 从 HTML 属性读取应用名 */
  get appName() { return this.getAttribute('name') || '' }

  /** 从 HTML 属性读取应用入口 URL */
  get appUrl() { return this.getAttribute('url') || '' }

  /**
   * 加载子应用。
   *
   * 流程：
   * 1. 通过 fetch 拉取子应用入口 HTML
   * 2. 预处理 HTML（注入 base + 桥接脚本）
   * 3. 将 HTML 写入 iframe 的 srcdoc
   * 4. 等待桥接脚本就绪（或 8 秒超时）
   *
   * 复用 _loadPromise 避免 connectedCallback 和手动调用导致重复请求。
   *
   * @returns {Promise<void>}
   */
  async load() {
    if (this._loadPromise || !this.appUrl) return this._loadPromise
    const name = this.appName
    this._loadPromise = (async () => {
      let html
      try {
        const response = await fetch(this.appUrl)
        if (!response.ok) throw new Error('HTTP ' + response.status)
        html = await response.text()
      } catch (error) {
        // 加载失败时显示错误页面，而非让 iframe 一片空白。
        html = errorDocument('加载子应用失败: ' + error.message)
      }
      // 等待桥接脚本发来 BRIDGE_READY 消息或超时。
      await new Promise((resolve) => {
        let settled = false
        let timer
        let onMessage
        const finish = () => {
          if (settled) return
          settled = true
          clearTimeout(timer)
          window.removeEventListener('message', onMessage)
          resolve()
        }
        // 超时保护：即使桥接脚本未成功执行（如 JS 被禁用），
        // 也不能让 mountApp 永久处于 pending 状态。
        timer = setTimeout(() => {
          this._ready = true
          finish()
        }, 8000)
        onMessage = (event) => {
          const message = event.data
          // 同时校验消息来源（contentWindow）、协议（CHANNEL）和应用名，
          // 防止其他 iframe 冒充当前子应用。
          if (event.source !== this._iframe.contentWindow || !message ||
              message.channel !== CHANNEL || message.type !== BRIDGE_READY || message.appName !== name) return
          this._ready = true
          // 桥接就绪后立即发送等待中的数据。
          if (this._pendingData !== undefined) {
            this._postData(this._pendingData)
            this._pendingData = undefined
          }
          finish()
        }
        window.addEventListener('message', onMessage)
        // sandbox="allow-scripts"：授予脚本执行权限，
        // 但不授予 allow-same-origin，使子应用运行在独立的不透明源中，
        // 避免子应用访问主应用的 Cookie、localStorage 等。
        this._iframe.setAttribute('sandbox', 'allow-scripts')
        this._iframe.srcdoc = prepareHtml(html, this.appUrl, name)
      })
    })()
    return this._loadPromise
  }

  /**
   * 通过 postMessage 向子应用 iframe 发送数据。
   *
   * @param {*} data - 要发送的数据
   */
  _postData(data) {
    this._iframe.contentWindow?.postMessage({ channel: CHANNEL, type: PARENT_DATA, data }, '*')
  }

  /**
   * 向子应用下发数据。
   *
   * 如果桥接层尚未就绪，数据会被暂存到 _pendingData，
   * 待收到 BRIDGE_READY 消息后自动发送。
   *
   * @param {*} data - 要下发的数据
   */
  setData(data) {
    if (!this._ready || !this._iframe.contentWindow) this._pendingData = data
    else this._postData(data)
  }

  /**
   * 注册子应用数据变更监听器（回调形式）。
   *
   * @param {function} listener - 数据变更时的回调函数
   */
  addDataListener(listener) { if (typeof listener === 'function') this._listeners.add(listener) }

  /**
   * 移除子应用数据变更监听器。
   *
   * @param {function} listener - 要移除的回调函数
   */
  removeDataListener(listener) { this._listeners.delete(listener) }

  /**
   * 接收子应用派发的数据，同时触发回调监听和 DOM 事件。
   *
   * 两种消费方式：
   * 1. 通过 addDataListener 注册的回调函数
   * 2. 通过监听元素的 'datachange' 自定义事件
   *
   * @param {*} data - 子应用派发的数据
   */
  _receive(data) {
    this._listeners.forEach((listener) => { try { listener(data) } catch (_) {} })
    this.dispatchEvent(new CustomEvent('datachange', { detail: data }))
  }

  /**
   * 销毁子应用实例。
   *
   * 执行步骤：
   * 1. 通知子应用执行 unmount 生命周期钩子
   * 2. 将 iframe 重置为 about:blank，释放子应用占用的内存
   * 3. 重置所有内部状态
   *
   * 调用时机：元素从 DOM 中移除时自动调用，或通过 unmountApp() 手动触发。
   */
  destroy() {
    if (this._iframe?.contentWindow) {
      // 先通知子应用执行卸载钩子，再清空 iframe 文档。
      this._iframe.contentWindow.postMessage({ channel: CHANNEL, type: PARENT_UNMOUNT }, '*')
      this._iframe.src = 'about:blank'
    }
    this._ready = false
    this._loadPromise = null
    this._pendingData = undefined
    this._listeners.clear()
  }
}

// 防止模块被重复加载时再次注册同名自定义元素（如在 HMR 场景下）。
if (typeof customElements !== 'undefined' && !customElements.get('mini-micro-app')) {
  customElements.define('mini-micro-app', MiniMicroAppElement)
}

// ============================================================
//  全局消息处理
// ============================================================

/**
 * 全局 message 事件处理器。
 *
 * 接收所有子应用通过 postMessage 派发的 CHILD_DATA 类型消息，
 * 校验消息来源和协议后，分发给对应应用的主应用侧监听器和元素实例。
 *
 * @param {MessageEvent} event - postMessage 事件对象
 */
function handleMessage(event) {
  const message = event.data
  // 过滤：必须符合本运行时协议，且消息类型为子应用数据上报。
  if (!message || message.channel !== CHANNEL || message.type !== CHILD_DATA) return
  // 校验消息来源：必须来自已挂载应用的 iframe contentWindow。
  const element = mountedApps.get(message.appName)
  if (!element || event.source !== element.shadowRoot?.querySelector('iframe')?.contentWindow) return
  // 1. 通知主应用侧注册的全局数据监听器。
  const listeners = mainListeners.get(message.appName)
  listeners?.forEach((listener) => { try { listener(message.data) } catch (_) {} })
  // 2. 通知元素实例（触发回调监听器和 datachange 事件）。
  element._receive(message.data)
}

// ============================================================
//  对外 API
// ============================================================

/**
 * 启动微前端运行时。
 *
 * 注册全局 message 事件监听器，用于接收所有子应用的数据上报。
 * 只需调用一次，重复调用无副作用。
 * 应在注册和挂载应用之前调用。
 */
export function start() {
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('message', handleMessage)
}

/**
 * 注册一个子应用。
 *
 * 注册阶段只记录配置，真正的 DOM 创建在 mountApp 中完成。
 *
 * @param {string} name      - 应用名称，全局唯一标识
 * @param {string} container - 挂载容器的 CSS 选择器（如 "#app"）
 * @param {string} url       - 子应用入口 URL
 * @throws {TypeError} 参数不完整时抛出
 */
export function registerApp(name, container, url) {
  if (!name || !container || !url) throw new TypeError('registerApp(name, container, url) 参数不完整')
  registeredApps.set(name, { name, container, url })
  // 为每个应用预创建数据监听器集合，避免 addDataListener 调用时集合不存在。
  if (!mainListeners.has(name)) mainListeners.set(name, new Set())
}

/**
 * 根据注册表中的配置挂载子应用。
 *
 * 内部调用 mountMicroApp 完成实际挂载。已挂载的应用不会重复创建。
 *
 * @param {string} name     - 已注册的应用名称
 * @param {*}      initData - 可选的初始化数据，在桥接就绪后自动下发给子应用
 * @returns {Promise<HTMLElement|undefined>} 微应用自定义元素实例
 */
export async function mountApp(name, initData) {
  const config = registeredApps.get(name)
  if (!config || mountedApps.has(name)) return
  return mountMicroApp(config.container, config, initData)
}

/**
 * 不经过注册表，直接把微应用自定义元素挂载到指定容器。
 *
 * 适用于动态创建、无需预注册的场景。
 * 一个容器只承载一个微应用，挂载时会替换容器中的原有内容。
 *
 * @param {string|HTMLElement} container - 挂载容器（CSS 选择器字符串或 DOM 元素）
 * @param {{name: string, url: string}} options - 应用配置
 * @param {*}      initData - 可选的初始化数据
 * @returns {Promise<HTMLElement|undefined>} 微应用自定义元素实例
 */
export async function mountMicroApp(container, options, initData) {
  const { name, url } = options || {}
  if (!container || !name || !url || mountedApps.has(name)) return
  // 支持传入 CSS 选择器字符串，统一解析为 DOM 元素。
  if (typeof container === 'string') container = document.querySelector(container)
  if (!container) return
  const element = document.createElement('mini-micro-app')
  element.setAttribute('name', name)
  element.setAttribute('url', url)
  mountedApps.set(name, element)
  // 替换容器中的所有子节点，确保一个容器只承载一个微应用。
  container.replaceChildren(element)
  await element.load()
  // 桥接就绪后下发初始化数据。
  if (initData !== undefined) element.setData(initData)
  return element
}

/**
 * 卸载并移除一个已挂载的子应用。
 *
 * destroy 负责内部资源清理（通知子应用 unmount、清空 iframe、重置状态），
 * remove 负责从宿主 DOM 中移除自定义元素。
 *
 * @param {string} name - 要卸载的应用名称
 */
export function unmountApp(name) {
  const element = mountedApps.get(name)
  if (!element) return
  element.destroy()
  element.remove()
  mountedApps.delete(name)
}

/**
 * 向指定子应用下发数据。
 *
 * 内部调用 `<mini-micro-app>` 元素的 setData 方法。
 * 如果桥接层尚未就绪，数据会被暂存，就绪后自动发送。
 *
 * @param {string} name - 目标应用名称
 * @param {*}      data - 要下发的数据
 */
export function setData(name, data) { mountedApps.get(name)?.setData(data) }

/**
 * 注册全局数据监听器，监听指定子应用通过 window.microApp.dispatch 派发的数据。
 *
 * 与元素实例上的 addDataListener 不同，此监听器在全局层面注册，
 * 不依赖于具体的元素实例引用。
 *
 * @param {string}   name     - 目标应用名称
 * @param {function} listener - 数据回调函数
 */
export function addDataListener(name, listener) {
  if (!mainListeners.has(name)) mainListeners.set(name, new Set())
  mainListeners.get(name).add(listener)
}

/**
 * 移除全局数据监听器。
 *
 * @param {string}   name     - 目标应用名称
 * @param {function} listener - 要移除的回调函数
 */
export function removeDataListener(name, listener) { mainListeners.get(name)?.delete(listener) }

/**
 * 获取所有已注册应用的配置列表。
 *
 * @returns {Array<{name: string, container: string, url: string}>}
 */
export function getRegisteredApps() { return Array.from(registeredApps.values()) }

/**
 * 获取所有已挂载应用的名称列表。
 *
 * @returns {string[]}
 */
export function getMountedApps() { return Array.from(mountedApps.keys()) }

// 导出自定义元素类，便于外部继承或直接使用。
export { MiniMicroAppElement }

// 默认导出：将所有 API 聚合为一个对象，方便整体导入。
export default { start, registerApp, mountApp, mountMicroApp, unmountApp, setData, addDataListener, removeDataListener, getRegisteredApps, getMountedApps }
