/**
 * mini-micro-app 入口模块
 *
 * 这是 mini-micro-app 微前端框架的对外 API 入口，提供：
 *
 * 核心 API：
 * - start(options)           启动微前端运行时
 * - registerApp(name, el, url) 注册子应用配置
 * - mountApp(name, data)     根据注册名称挂载子应用
 * - mountMicroApp(el, opts, data) 直接挂载子应用（无需预注册）
 * - unmountApp(name)         卸载指定子应用
 * - setData(name, data)      向指定子应用发送数据
 * - addDataListener(name, fn) 添加子应用数据监听器
 * - removeDataListener(name, fn) 移除子应用数据监听器
 *
 * 使用示例：
 *   import { start, registerApp, mountApp, setData } from 'mini-micro-app'
 *
 *   start({ sandbox: true })
 *   registerApp('app1', '#container', 'http://localhost:5173')
 *   mountApp('app1', { userId: 123 })
 *   setData('app1', { theme: 'dark' })
 *
 * 架构说明：
 *   MicroApp（运行时门面）→ MiniMicroAppElement（自定义元素）
 *     → CreateApp（子应用实例）→ HTMLLoader（资源加载）+ IframeSandbox（沙箱）
 *     → EventCenter（数据通信总线）
 */

import { TAG_NAME } from './constants.js'
import { eventCenter } from './event-center.js'
import { MiniMicroAppElement } from './micro-app-element.js'
import {
  mountedApps,
  registeredApps,
  runtime,
  setRuntimeOptions,
} from './runtime.js'

/**
 * MicroApp 运行时门面类
 *
 * 负责框架的一次性初始化：
 * - 设置运行时选项
 * - 注册 <mini-micro-app> 自定义元素
 * - 防止重复启动
 */
class MicroApp {
  /**
   * 启动微前端运行时（幂等操作——多次调用只有第一次生效）
   * @param {object} [options={}] - 运行时选项
   */
  start(options = {}) {
    if (runtime.started) return
    setRuntimeOptions(options)
    // 注册自定义元素（全局只需一次）
    if (!customElements.get(TAG_NAME)) customElements.define(TAG_NAME, MiniMicroAppElement)
    runtime.started = true
  }
}

/** 全局 MicroApp 单例 */
export const microApp = new MicroApp()

/**
 * 启动微前端运行时
 * @param {object} [options] - 运行时选项，见 setRuntimeOptions
 */
export function start(options) {
  microApp.start(options)
}

/**
 * 注册子应用配置（不立即挂载，仅保存配置）
 *
 * @param {string} name - 子应用唯一名称
 * @param {string|HTMLElement} container - 挂载容器（CSS 选择器或 DOM 元素）
 * @param {string} url - 子应用入口 URL
 */
export function registerApp(name, container, url) {
  if (!name || !container || !url) throw new TypeError('registerApp(name, container, url) 参数不完整')
  registeredApps.set(name, { name, container, url })
}

/**
 * 根据已注册的名称挂载子应用
 *
 * @param {string} name - 子应用名称（需先通过 registerApp 注册）
 * @param {*} [initData] - 可选的初始数据，挂载后发送给子应用
 * @returns {MiniMicroAppElement|undefined} 挂载后的自定义元素实例
 */
export function mountApp(name, initData) {
  const options = registeredApps.get(name)
  return options ? mountMicroApp(options.container, options, initData) : undefined
}

/**
 * 直接挂载子应用（不需要预注册即可使用）
 *
 * 挂载流程：
 * 1. 确保运行时已启动（懒初始化）
 * 2. 校验配置参数
 * 3. 防重复挂载检查
 * 4. 解析挂载容器
 * 5. 创建 <mini-micro-app> 元素并挂载
 *
 * @param {string|HTMLElement} container - 挂载容器
 * @param {object} options - 子应用配置 { name, url }
 * @param {*} [initData] - 初始数据
 * @returns {Promise<MiniMicroAppElement>} 挂载后的自定义元素实例
 */
export async function mountMicroApp(container, options, initData) {
  // 懒初始化：如果尚未调用 start()，自动启动运行时
  if (!runtime.started) microApp.start()
  const { name, url } = options || {}
  if (!name || !url) throw new TypeError('子应用配置缺少 name 或 url')
  // 防止重复挂载
  if (mountedApps.has(name)) return mountedApps.get(name)

  // 解析容器：支持 CSS 选择器字符串和 DOM 元素两种方式
  const target = typeof container === 'string' ? document.querySelector(container) : container
  if (!target) throw new Error(`找不到子应用 ${name} 的挂载容器`)

  // 创建自定义元素，设置属性，挂载到 DOM
  const element = document.createElement(TAG_NAME)
  element.setAttribute('name', name)
  element.setAttribute('url', url)
  if (initData !== undefined) element.setData(initData)
  mountedApps.set(name, element)
  target.replaceChildren(element) // 清空容器并插入元素，触发 connectedCallback → mount()
  await element.mount()
  return element
}

/**
 * 卸载指定子应用
 * @param {string} name - 子应用名称
 */
export function unmountApp(name) {
  const element = mountedApps.get(name)
  if (!element) return
  element.destroy()
  element.remove()
  mountedApps.delete(name)
}

/**
 * 向指定子应用发送数据
 * @param {string} name - 子应用名称
 * @param {*} data - 要发送的数据
 */
export function setData(name, data) {
  mountedApps.get(name)?.setData(data)
}

/**
 * 添加全局级别的子应用数据监听器（通过 EventCenter）
 * @param {string} name - 子应用名称
 * @param {Function} listener - 数据回调函数
 */
export function addDataListener(name, listener) {
  eventCenter.on(name, listener)
}

/**
 * 移除全局级别的子应用数据监听器
 * @param {string} name - 子应用名称
 * @param {Function} listener - 要移除的回调函数
 */
export function removeDataListener(name, listener) {
  eventCenter.off(name, listener)
}
