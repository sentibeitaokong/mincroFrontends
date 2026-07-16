/**
 * 一个精简的微前端运行时。
 *
 * 每个自定义元素内部维护一个 iframe：iframe 负责隔离子应用的 JavaScript 和 CSS，
 * 自定义元素负责管理子应用的加载、卸载以及主子应用之间的通信。
 */

// postMessage 消息协议，channel 用于避免处理页面中的其他消息。
const CHANNEL = '__mini_micro_app__'
const BRIDGE_READY = 'ready'
const CHILD_DATA = 'child-data'
const PARENT_DATA = 'parent-data'
const PARENT_UNMOUNT = 'unmount'

// 注册表保存应用配置，挂载表保存当前运行中的自定义元素实例。
const registeredApps = new Map()
const mountedApps = new Map()
const mainListeners = new Map()
let started = false

// 转义即将写入 srcdoc 的动态内容，避免破坏生成的 HTML 结构。
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character])
}

function errorDocument(message) {
  return '<!doctype html><meta charset="utf-8"><body style="font:16px sans-serif;padding:2rem;color:#b91c1c">' +
    escapeHtml(message) + '</body>'
}

/**
 * 生成注入子应用的通信桥接脚本。
 *
 * 脚本会先于子应用入口执行，因此子应用启动时即可通过 window.microApp
 * 接收主应用数据、向主应用派发数据，并响应卸载通知。
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
    var attempts = 0, timer = setInterval(function () {
      var lifecycle = window['micro-app-' + name];
      if (lifecycle && typeof lifecycle.mount === 'function') {
        try { lifecycle.mount(document); } catch (_) {}
        clearInterval(timer);
      } else if (++attempts > 100) clearInterval(timer);
    }, 50);
  }());</script>`
}

function prepareHtml(html, url, name) {
  // base 让子应用 HTML 中的相对路径仍相对于子应用地址解析。
  const base = `<base href="${escapeHtml(url.endsWith('/') ? url : url + '/')}">`
  // Vite HMR 客户端依赖子应用开发服务器，在 srcdoc 环境中无需保留。
  html = html.replace(/<script\b[^>]*\bsrc=["']\/@vite\/client["'][^>]*>\s*<\/script>/gi, '')
  const injected = base + bridgeScript(name)
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, injected + '</head>')
  if (/<body\b/i.test(html)) return html.replace(/<body\b/i, injected + '<body')
  return injected + html
}

class MiniMicroAppElement extends HTMLElement {
  constructor() {
    super()
    // _pendingData 只保留桥接层就绪前最后一次下发的数据。
    this._ready = false
    this._pendingData = undefined
    this._listeners = new Set()
    this._loadPromise = null
    this.attachShadow({ mode: 'open' }).innerHTML =
      '<style>:host{display:block;width:100%;height:100%;min-height:1px}iframe{display:block;width:100%;height:100%;min-height:1px;border:0}</style>' +
      '<iframe title="micro app" loading="eager"></iframe>'
    this._iframe = this.shadowRoot.querySelector('iframe')
  }

  connectedCallback() {
    // 元素插入文档后自动加载子应用。
    this.load()
  }

  disconnectedCallback() {
    // 元素移出文档时释放 iframe 和监听器持有的资源。
    this.destroy()
  }

  get appName() { return this.getAttribute('name') || '' }
  get appUrl() { return this.getAttribute('url') || '' }

  async load() {
    // 复用同一次加载任务，避免 connectedCallback 和手动调用导致重复请求。
    if (this._loadPromise || !this.appUrl) return this._loadPromise
    const name = this.appName
    this._loadPromise = (async () => {
      let html
      try {
        const response = await fetch(this.appUrl)
        if (!response.ok) throw new Error('HTTP ' + response.status)
        html = await response.text()
      } catch (error) {
        html = errorDocument('加载子应用失败: ' + error.message)
      }
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
        timer = setTimeout(() => {
          // 即使页面未成功执行桥接脚本，也不能让 mountApp 永久处于 pending 状态。
          this._ready = true
          finish()
        }, 8000)
        onMessage = (event) => {
          const message = event.data
          // 同时校验消息来源、协议和应用名，防止其他 iframe 冒充当前子应用。
          if (event.source !== this._iframe.contentWindow || !message ||
              message.channel !== CHANNEL || message.type !== BRIDGE_READY || message.appName !== name) return
          this._ready = true
          if (this._pendingData !== undefined) {
            this._postData(this._pendingData)
            this._pendingData = undefined
          }
          finish()
        }
        window.addEventListener('message', onMessage)
        // 不授予 allow-same-origin，使子应用运行在独立的不透明源中。
        this._iframe.setAttribute('sandbox', 'allow-scripts')
        this._iframe.srcdoc = prepareHtml(html, this.appUrl, name)
      })
    })()
    return this._loadPromise
  }

  _postData(data) {
    this._iframe.contentWindow?.postMessage({ channel: CHANNEL, type: PARENT_DATA, data }, '*')
  }

  setData(data) {
    // 桥接层尚未就绪时暂存数据，ready 后再发送。
    if (!this._ready || !this._iframe.contentWindow) this._pendingData = data
    else this._postData(data)
  }

  addDataListener(listener) { if (typeof listener === 'function') this._listeners.add(listener) }
  removeDataListener(listener) { this._listeners.delete(listener) }

  _receive(data) {
    // 同时支持回调监听和 DOM datachange 事件两种消费方式。
    this._listeners.forEach((listener) => { try { listener(data) } catch (_) {} })
    this.dispatchEvent(new CustomEvent('datachange', { detail: data }))
  }

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

if (typeof customElements !== 'undefined' && !customElements.get('mini-micro-app')) {
  // 防止模块被重复加载时再次注册同名自定义元素。
  customElements.define('mini-micro-app', MiniMicroAppElement)
}

// 接收子应用派发的数据，并转交给对应应用的主应用监听器。
function handleMessage(event) {
  const message = event.data
  if (!message || message.channel !== CHANNEL || message.type !== CHILD_DATA) return
  const element = mountedApps.get(message.appName)
  if (!element || event.source !== element.shadowRoot?.querySelector('iframe')?.contentWindow) return
  const listeners = mainListeners.get(message.appName)
  listeners?.forEach((listener) => { try { listener(message.data) } catch (_) {} })
  element._receive(message.data)
}

export function start() {
  // 全局 message 监听器只需注册一次。
  if (started || typeof window === 'undefined') return
  started = true
  window.addEventListener('message', handleMessage)
}

export function registerApp(name, container, url) {
  // 注册阶段只记录配置，真正的 DOM 创建在 mountApp 中完成。
  if (!name || !container || !url) throw new TypeError('registerApp(name, container, url) 参数不完整')
  registeredApps.set(name, { name, container, url })
  if (!mainListeners.has(name)) mainListeners.set(name, new Set())
}

export async function mountApp(name, initData) {
  // 根据预先注册的配置挂载应用；已挂载的应用不会重复创建。
  const config = registeredApps.get(name)
  if (!config || mountedApps.has(name)) return
  return mountMicroApp(config.container, config, initData)
}

/** 不经过注册表，直接把微应用自定义元素挂载到指定容器。 */
export async function mountMicroApp(container, options, initData) {
  const { name, url } = options || {}
  if (!container || !name || !url || mountedApps.has(name)) return
  const element = document.createElement('mini-micro-app')
  element.setAttribute('name', name)
  element.setAttribute('url', url)
  mountedApps.set(name, element)
  // 一个容器只承载一个微应用，挂载时替换容器中的原有内容。
  container.replaceChildren(element)
  await element.load()
  if (initData !== undefined) element.setData(initData)
  return element
}

export function unmountApp(name) {
  // destroy 负责内部资源清理，remove 负责从宿主 DOM 中移除元素。
  const element = mountedApps.get(name)
  if (!element) return
  element.destroy()
  element.remove()
  mountedApps.delete(name)
}

export function setData(name, data) { mountedApps.get(name)?.setData(data) }

// 主应用监听指定子应用通过 window.microApp.dispatch 派发的数据。
export function addDataListener(name, listener) {
  if (!mainListeners.has(name)) mainListeners.set(name, new Set())
  mainListeners.get(name).add(listener)
}
export function removeDataListener(name, listener) { mainListeners.get(name)?.delete(listener) }
export function getRegisteredApps() { return Array.from(registeredApps.values()) }
export function getMountedApps() { return Array.from(mountedApps.keys()) }

export { MiniMicroAppElement }
export default { start, registerApp, mountApp, mountMicroApp, unmountApp, setData, addDataListener, removeDataListener, getRegisteredApps, getMountedApps }
