/**
 * 子应用实例模块
 *
 * CreateApp 是每个子应用的运行时实例，负责编排子应用的完整生命周期：
 * 加载 → 沙箱启动 → 数据通信 → 卸载。
 *
 * 它组合了 HTMLLoader（资源加载）和 IframeSandbox（沙箱隔离），
 * 向外暴露 mount() / setData() / unmount() 三个核心方法。
 */

import { APP_STATUS, MESSAGE_TYPE } from './constants.js'
import { eventCenter } from './event-center.js'
import { HTMLLoader } from './html-loader.js'
import { IframeSandbox } from './iframe-sandbox.js'

export class CreateApp {
  /**
   * @param {object} config - 子应用配置
   * @param {string} config.name - 子应用名称（唯一标识）
   * @param {string} config.url - 子应用入口 URL
   * @param {HTMLIFrameElement} config.iframe - 承载子应用的 iframe 元素
   * @param {object} config.options - 沙箱配置选项
   * @param {Function} config.onData - 子应用数据回调
   */
  constructor({ name, url, iframe, options, onData }) {
    this.name = name
    this.url = url
    this.status = APP_STATUS.LOADING // 初始状态为加载中
    this.pendingData = undefined // 缓存挂载前设置的数据，挂载完成后自动发送

    // 资源加载器：负责请求 HTML 并转换
    this.loader = new HTMLLoader()
    // 沙箱实例：管理 iframe 生命周期和跨域通信
    this.sandbox = new IframeSandbox({
      appName: name,
      iframe,
      options,
      onData: (data) => {
        // 子应用数据先经过事件中心广播，再触发元素级回调
        eventCenter.dispatch(name, data)
        onData(data)
      },
    })
  }

  /**
   * 挂载子应用：加载 HTML → 注入桥接代码 → 启动沙箱
   *
   * 流程：
   * 1. 通过网络请求加载子应用入口 HTML
   * 2. 转换 HTML（注入 base / 移除 HMR / 注入桥接代码）
   * 3. 将转换后的 HTML 通过 srcdoc 加载到 iframe 中
   * 4. 等待子应用桥接脚本就绪（READY 消息）
   * 5. 如果有 pendingData，在挂载完成后立即发送
   *
   * @returns {Promise<void>}
   */
  async mount() {
    try {
      // 1. 加载子应用 HTML
      const source = await this.loader.load(this.url)
      // 2. 转换 HTML 并注入桥接代码
      const html = this.loader.transform(source, this.url, this.sandbox.createBridgeCode())
      // 3. 启动沙箱（设置 srcdoc，等待 READY）
      await this.sandbox.start(html)
      this.status = APP_STATUS.MOUNTED

      // 4. 如果挂载前已调用 setData，在挂载完成后立即发送缓存的数据
      if (this.pendingData !== undefined) {
        this.sandbox.post(MESSAGE_TYPE.PARENT_DATA, this.pendingData)
        this.pendingData = undefined
      }
    } catch (error) {
      this.status = APP_STATUS.LOAD_ERROR
      throw error
    }
  }

  /**
   * 向子应用发送数据
   *
   * - 若子应用已挂载，立即通过 postMessage 发送
   * - 若子应用尚未挂载，先缓存数据，待 mount 完成后自动发送
   *
   * @param {*} data - 要发送的数据
   */
  setData(data) {
    if (this.status === APP_STATUS.MOUNTED) {
      this.sandbox.post(MESSAGE_TYPE.PARENT_DATA, data)
    } else {
      this.pendingData = data
    }
  }

  /**
   * 卸载子应用：停止沙箱 → 清除缓存数据 → 更新状态
   */
  unmount() {
    this.sandbox.stop()
    this.pendingData = undefined
    this.status = APP_STATUS.UNMOUNTED
  }
}
