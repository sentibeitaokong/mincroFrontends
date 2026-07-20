/**
 * mini-wujie 自定义元素 (Custom Element)
 *
 * 基于 Web Components 规范实现 <mini-wujie-app> 自定义标签。
 * 每个元素实例对应一个子应用的挂载容器，内部使用 Shadow DOM 隔离样式，
 * 并通过 MiniWujieSandbox 在隐藏 iframe 中执行子应用的 JavaScript。
 *
 * 使用方式：
 *   <mini-wujie-app name="react-app" url="http://localhost:5174" />
 *
 * 或通过 JavaScript 动态设置 props：
 *   const app = document.querySelector('mini-wujie-app')
 *   app.props = { userId: 123 }
 */

import { MiniWujieSandbox } from './sandbox.js'

/** 自定义元素的标签名 */
const ELEMENT_NAME = 'mini-wujie-app'

export class MiniWujieElement extends HTMLElement {
  constructor() {
    super()
    // 开启 Shadow DOM（open 模式允许外部通过 element.shadowRoot 访问）
    this.attachShadow({ mode: 'open' })
    this.sandbox = null
    this._props = {}
  }

  /**
   * 获取传递给子应用的 props 数据
   */
  get props() {
    return this._props
  }

  /**
   * 设置 props 数据，如果沙箱已经启动则同步更新到子应用
   * 子应用内通过 $wujie.props 读取这些数据
   */
  set props(value) {
    this._props = value || {}
    // 如果沙箱已在运行，直接将新 props 同步到子应用的 window.$wujie.props
    if (this.sandbox?.iframe?.contentWindow?.$wujie) {
      this.sandbox.iframe.contentWindow.$wujie.props = this._props
    }
  }

  /**
   * Web Components 生命周期 — 元素被插入 DOM 时触发
   * 使用 queueMicrotask 延迟挂载，等待 Vue 等框架完成属性绑定后再启动
   */
  connectedCallback() {
    // 延迟到微任务队列执行，确保框架（如 Vue）已经设置了元素的属性/Property
    queueMicrotask(() => this.mount())
  }

  /**
   * Web Components 生命周期 — 元素从 DOM 中移除时触发
   * 销毁沙箱，清理 iframe 和 Shadow DOM 内容
   */
  disconnectedCallback() {
    this.sandbox?.destroy()
  }

  /**
   * 挂载子应用
   * 1. 从元素属性读取 name 和 url
   * 2. 创建 MiniWujieSandbox 实例
   * 3. 启动沙箱（加载 HTML → 提取样式 → 执行脚本）
   */
  async mount() {
    // 防止重复挂载，或元素已被移除后仍然挂载
    if (this.sandbox || !this.isConnected) return

    const name = this.getAttribute('name')
    const url = this.getAttribute('url')
    if (!name || !url) return

    // 显示加载中的提示
    this.shadowRoot.innerHTML = '<p class="mini-wujie-loading">正在加载子应用...</p>'
    this.sandbox = new MiniWujieSandbox({ name, url, props: this.props, shadowRoot: this.shadowRoot })

    try {
      await this.sandbox.start()
      // 加载成功后派发 'ready' 事件
      this.dispatchEvent(new CustomEvent('ready'))
    } catch (error) {
      this.sandbox = null
      // 加载失败时显示错误信息
      this.shadowRoot.innerHTML = `<p class="mini-wujie-error">${error.message}</p>`
      // 派发 'error' 事件，方便外部监听处理
      this.dispatchEvent(new CustomEvent('error', { detail: error }))
    }
  }
}

/**
 * 注册 <mini-wujie-app> 自定义元素
 * 多次调用安全 — 如果已注册则跳过
 */
export function defineMiniWujieElement() {
  if (!customElements.get(ELEMENT_NAME)) customElements.define(ELEMENT_NAME, MiniWujieElement)
}
