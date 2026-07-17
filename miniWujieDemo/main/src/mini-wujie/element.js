import { MiniWujieSandbox } from './sandbox.js'

const ELEMENT_NAME = 'mini-wujie-app'

export class MiniWujieElement extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.sandbox = null
    this._props = {}
  }

  get props() {
    return this._props
  }

  set props(value) {
    this._props = value || {}
    if (this.sandbox?.iframe?.contentWindow?.$wujie) {
      this.sandbox.iframe.contentWindow.$wujie.props = this._props
    }
  }

  connectedCallback() {
    // Vue 会在元素插入后继续设置对象属性，延迟一拍以拿到完整 props。
    queueMicrotask(() => this.mount())
  }

  disconnectedCallback() {
    this.sandbox?.destroy()
  }

  async mount() {
    if (this.sandbox || !this.isConnected) return

    const name = this.getAttribute('name')
    const url = this.getAttribute('url')
    if (!name || !url) return

    this.shadowRoot.innerHTML = '<p class="mini-wujie-loading">正在加载子应用...</p>'
    this.sandbox = new MiniWujieSandbox({ name, url, props: this.props, shadowRoot: this.shadowRoot })

    try {
      await this.sandbox.start()
      this.dispatchEvent(new CustomEvent('ready'))
    } catch (error) {
      this.sandbox = null
      this.shadowRoot.innerHTML = `<p class="mini-wujie-error">${error.message}</p>`
      this.dispatchEvent(new CustomEvent('error', { detail: error }))
    }
  }
}

export function defineMiniWujieElement() {
  if (!customElements.get(ELEMENT_NAME)) customElements.define(ELEMENT_NAME, MiniWujieElement)
}
