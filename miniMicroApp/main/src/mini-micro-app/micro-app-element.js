/**
 * 自定义元素模块
 *
 * MiniMicroAppElement 是一个 Custom Element（Web Component），
 * 对应 HTML 中的 <mini-micro-app name="xxx" url="xxx"></mini-micro-app> 标签。
 *
 * 它使用 Shadow DOM 封装内部结构（iframe + 样式），提供：
 * - 声明式使用：直接在 HTML 中写标签即可挂载子应用
 * - 自动生命周期：插入 DOM 时自动挂载，移除时自动销毁
 * - 数据通信：支持 setData / addDataListener / datachange 事件
 */

import { CreateApp } from './create-app.js'
import { mountedApps, runtime } from './runtime.js'

export class MiniMicroAppElement extends HTMLElement {
  constructor() {
    super()

    this.app = null        // CreateApp 实例，管理子应用生命周期
    this.mountPromise = null // 挂载 Promise，防止重复挂载
    this.pendingData = undefined // 缓存挂载前设置的数据
    this.elementListeners = new Set() // 元素级别的数据监听器集合

    // 创建 Shadow DOM，封装内部结构和样式
    // mode: 'open' 允许外部通过 element.shadowRoot 访问内部 DOM
    this.attachShadow({ mode: 'open' }).innerHTML = `
      <style>
        :host { display: block; width: 100%; height: 100%; min-height: 1px; }
        iframe { display: block; width: 100%; height: 100%; min-height: 1px; border: 0; }
        .error { padding: 24px; color: #b91c1c; font: 16px/1.5 sans-serif; }
      </style>
      <iframe title="micro app" loading="eager"></iframe>
    `
    // 缓存 iframe 引用，后续沙箱操作需要使用
    this.iframe = this.shadowRoot.querySelector('iframe')
  }

  /**
   * Web Component 生命周期：元素被插入 DOM 时触发
   * 自动开始挂载子应用
   */
  connectedCallback() {
    this.mount()
  }

  /**
   * Web Component 生命周期：元素从 DOM 中移除时触发
   * 自动销毁子应用，释放资源
   */
  disconnectedCallback() {
    this.destroy()
  }

  /** 从 HTML 属性中读取子应用名称 */
  get appName() {
    return this.getAttribute('name') || ''
  }

  /** 从 HTML 属性中读取子应用入口 URL */
  get appUrl() {
    return this.getAttribute('url') || ''
  }

  /**
   * 挂载子应用
   *
   * 流程：
   * 1. 防重复挂载检查（已挂载则返回缓存的 Promise）
   * 2. 参数校验（name 和 url 必须存在）
   * 3. 创建 CreateApp 实例
   * 4. 如果有挂载前设置的 pendingData，传递给 app
   * 5. 执行 app.mount()，失败时渲染错误界面
   *
   * @returns {Promise<void>}
   */
  mount() {
    // 防止重复挂载：如果已有挂载进行中，直接返回其 Promise
    if (this.mountPromise) return this.mountPromise
    if (!this.appName || !this.appUrl) return Promise.reject(new Error('子应用缺少 name 或 url'))

    // 创建子应用实例
    this.app = new CreateApp({
      name: this.appName,
      url: this.appUrl,
      iframe: this.iframe,
      options: runtime.options,
      onData: (data) => this.receiveData(data), // 子应用数据回调
    })
    // 传递挂载前缓存的初始数据
    if (this.pendingData !== undefined) this.app.setData(this.pendingData)

    // 执行挂载，捕获错误并渲染错误界面
    this.mountPromise = this.app.mount().catch((error) => {
      this.renderError(error)
      this.dispatchEvent(new CustomEvent('error', { detail: error }))
      throw error
    })
    return this.mountPromise
  }

  /**
   * 向子应用发送数据
   * 缓存数据并在 app 存在时立即发送，确保挂载前后的数据都能到达子应用
   *
   * @param {*} data - 要发送的数据
   */
  setData(data) {
    this.pendingData = data
    this.app?.setData(data)
  }

  /**
   * 注册元素级别的数据监听器
   * @param {Function} listener - 回调函数
   */
  addDataListener(listener) {
    if (typeof listener === 'function') this.elementListeners.add(listener)
  }

  /**
   * 移除元素级别的数据监听器
   * @param {Function} listener - 要移除的回调函数
   */
  removeDataListener(listener) {
    this.elementListeners.delete(listener)
  }

  /**
   * 接收子应用数据并分发给所有元素级监听器
   * 同时触发 'datachange' 自定义事件，支持通过 addEventListener 监听
   *
   * @param {*} data - 子应用发送的数据
   */
  receiveData(data) {
    this.elementListeners.forEach((listener) => listener(data))
    this.dispatchEvent(new CustomEvent('datachange', { detail: data }))
  }

  /**
   * 渲染错误界面：移除 iframe，显示错误信息
   * @param {Error} error - 错误对象
   */
  renderError(error) {
    this.iframe.remove()
    const message = document.createElement('div')
    message.className = 'error'
    message.textContent = `加载子应用失败: ${error.message}`
    this.shadowRoot.append(message)
  }

  /**
   * 销毁子应用：卸载沙箱 → 清除引用 → 清理全局注册表
   * 确保无内存泄漏和残留的事件监听
   */
  destroy() {
    this.app?.unmount()
    this.app = null
    this.mountPromise = null
    this.pendingData = undefined
    this.elementListeners.clear()
    // 从全局挂载表中移除自己
    if (mountedApps.get(this.appName) === this) mountedApps.delete(this.appName)
  }
}
