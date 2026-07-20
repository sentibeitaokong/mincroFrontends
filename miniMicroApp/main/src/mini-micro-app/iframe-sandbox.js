/**
 * iframe 沙箱模块
 *
 * 基于 iframe.srcdoc 实现的子应用沙箱隔离方案：
 * - 样式隔离：iframe 天然提供样式隔离
 * - JS 隔离：通过 iframe sandbox 属性限制子应用能力
 * - 通信隔离：通过 postMessage + 自定义 channel 实现安全的父子通信
 *
 * 沙箱会在子应用 HTML 中注入一段桥接代码（bridge code），
 * 该代码在子应用 window 上下文中执行，负责：
 * 1. 暴露 microApp API 供子应用调用（getData / dispatch / addDataListener 等）
 * 2. 监听父应用通过 postMessage 发来的数据和卸载指令
 * 3. 轮询检测子应用生命周期挂载点（micro-app-{name}.mount()）
 */

import { CHANNEL, MESSAGE_TYPE } from './constants.js'

/**
 * 生成注入到子应用 iframe 中的桥接代码（IIFE 自执行）
 *
 * 桥接代码注入到子应用 window 上下文中运行，提供以下能力：
 * - window.__MICRO_APP_ENVIRONMENT__ 标志位，告知子应用当前运行在微前端环境中
 * - window.microApp 通信 API：
 *   - getData()            获取父应用传递的最新数据
 *   - addDataListener()    注册数据变化监听器
 *   - removeDataListener() 移除数据监听器
 *   - dispatch()           向父应用发送数据
 * - 自动检测子应用生命周期：轮询 window['micro-app-{name}']，找到后调用 mount()
 *
 * @param {string} appName - 子应用名称
 * @returns {string} 桥接代码字符串
 */
function createBridgeCode(appName) {
  return `(() => {
    const appName = ${JSON.stringify(appName)}
    const channel = ${JSON.stringify(CHANNEL)}
    let data = {}
    const listeners = new Set()

    // 注入环境标记，子应用可据此判断是否处于微前端环境
    window.__MICRO_APP_ENVIRONMENT__ = true
    window.__MICRO_APP_NAME__ = appName

    // 暴露给子应用的通信 API
    window.microApp = {
      // 获取当前数据快照
      getData: () => data,
      // 注册数据监听器，autoTrigger 为 true 时立即用当前数据触发一次回调
      addDataListener(listener, autoTrigger) {
        if (typeof listener !== 'function') return
        listeners.add(listener)
        if (autoTrigger) listener(data)
      },
      // 移除数据监听器
      removeDataListener: (listener) => listeners.delete(listener),
      // 子应用主动向父应用发送数据
      dispatch(value) {
        window.parent.postMessage({ channel, type: '${MESSAGE_TYPE.CHILD_DATA}', appName, data: value }, '*')
      },
    }

    // 监听父应用通过 postMessage 发来的消息
    window.addEventListener('message', (event) => {
      const message = event.data
      // 安全检查：仅处理来自父窗口且 channel 匹配的消息
      if (event.source !== window.parent || message?.channel !== channel) return
      // 接收父应用数据并通知所有监听器
      if (message.type === '${MESSAGE_TYPE.PARENT_DATA}') {
        data = message.data ?? {}
        listeners.forEach((listener) => listener(data))
      }
      // 接收卸载指令，调用子应用暴露的 unmount 生命周期
      if (message.type === '${MESSAGE_TYPE.UNMOUNT}') {
        window['micro-app-' + appName]?.unmount?.()
      }
    })

    // 告知父应用：桥接脚本已执行完毕，子应用已就绪
    window.parent.postMessage({ channel, type: '${MESSAGE_TYPE.READY}', appName }, '*')

    // 轮询检测子应用是否已暴露生命周期对象 micro-app-{name}
    // 检测到 mount 方法后立即调用，最多等待 5 秒（200 次 × 25ms）
    let attempts = 0
    const mountTimer = setInterval(() => {
      const lifecycle = window['micro-app-' + appName]
      if (typeof lifecycle?.mount === 'function') {
        clearInterval(mountTimer)
        lifecycle.mount(document)
      } else if (++attempts >= 200) {
        clearInterval(mountTimer)
      }
    }, 25)
  })()`
}

export class IframeSandbox {
  /**
   * @param {object} config - 沙箱配置
   * @param {string} config.appName - 子应用名称
   * @param {HTMLIFrameElement} config.iframe - 用于挂载子应用的 iframe 元素
   * @param {object} config.options - 沙箱选项（sandbox / sandboxPermissions）
   * @param {Function} config.onData - 子应用数据回调
   */
  constructor({ appName, iframe, options, onData }) {
    this.appName = appName
    this.iframe = iframe
    this.options = options
    this.onData = onData
    this.active = false // 沙箱是否处于活跃状态
    this.handleMessage = this.handleMessage.bind(this) // 绑定 this，确保可用作事件回调
  }

  /** 生成桥接代码（委托给 createBridgeCode） */
  createBridgeCode() {
    return createBridgeCode(this.appName)
  }

  /**
   * 启动沙箱：应用安全策略 → 注册消息监听 → 设置 srcdoc 加载子应用
   * 返回一个 Promise，在收到子应用 READY 消息或 8 秒超时后 resolve
   *
   * @param {string} html - 要注入 iframe.srcdoc 的完整 HTML
   * @returns {Promise<void>}
   */
  start(html) {
    // 应用 iframe sandbox 属性（限制子应用能力）
    this.applyPolicy()
    this.active = true
    window.addEventListener('message', this.handleMessage)

    // 创建 readyPromise，超时 8 秒兜底（防止子应用不发送 READY 导致永久挂起）
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve
      this.readyTimer = window.setTimeout(resolve, 8000)
    })

    // 通过 srcdoc 加载子应用 HTML（而非 src 加载，避免跨域限制）
    this.iframe.srcdoc = html
    return this.readyPromise
  }

  /**
   * 根据选项设置 iframe 的 sandbox 属性
   * sandbox 属性用于限制 iframe 内页面的能力（如禁止弹窗、禁止表单提交等）
   */
  applyPolicy() {
    if (this.options.sandbox) {
      this.iframe.setAttribute('sandbox', this.options.sandboxPermissions.join(' '))
    } else {
      this.iframe.removeAttribute('sandbox')
    }
  }

  /**
   * 处理来自子应用 iframe 的 postMessage 消息
   *
   * 消息类型处理：
   * - READY：子应用桥接脚本就绪，清除超时计时器，resolve readyPromise
   * - CHILD_DATA：子应用主动发送数据，转发给 onData 回调
   *
   * 安全检查：仅处理来自当前 iframe、channel 和 appName 均匹配的消息
   *
   * @param {MessageEvent} event - postMessage 事件对象
   */
  handleMessage(event) {
    const message = event.data
    // 安全检查：非活跃状态、非当前 iframe、channel 不匹配、appName 不匹配则忽略
    if (!this.active || event.source !== this.iframe.contentWindow) return
    if (message?.channel !== CHANNEL || message.appName !== this.appName) return

    if (message.type === MESSAGE_TYPE.READY) {
      window.clearTimeout(this.readyTimer)
      this.resolveReady?.()
    } else if (message.type === MESSAGE_TYPE.CHILD_DATA) {
      this.onData(message.data)
    }
  }

  /**
   * 向子应用发送 postMessage
   * @param {string} type - 消息类型（使用 MESSAGE_TYPE 枚举）
   * @param {*} data - 要发送的数据
   */
  post(type, data) {
    if (!this.active) return
    this.iframe.contentWindow?.postMessage({ channel: CHANNEL, type, data }, '*')
  }

  /**
   * 停止沙箱：发送卸载指令 → 移除事件监听 → 清除 iframe 内容
   * 安全地销毁子应用运行环境，防止内存泄漏
   */
  stop() {
    if (!this.active) return
    // 先通知子应用即将卸载，让其有机会执行清理逻辑
    this.post(MESSAGE_TYPE.UNMOUNT)
    this.active = false
    window.clearTimeout(this.readyTimer)
    window.removeEventListener('message', this.handleMessage)
    // 清除 srcdoc 并重置为 about:blank，释放子应用内存
    this.iframe.removeAttribute('srcdoc')
    this.iframe.src = 'about:blank'
  }
}
