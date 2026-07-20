/**
 * 运行时状态模块
 *
 * 管理 mini-micro-app 的全局运行时状态，包括：
 * - 已注册的子应用配置表
 * - 已挂载的子应用实例表
 * - 运行时启动状态与全局选项
 */

import { DEFAULT_OPTIONS } from './constants.js'

/**
 * 已注册的子应用配置表
 * Map<appName, { name, container, url }>
 * 通过 registerApp() 注册后存入，mountApp() 时读取配置
 */
export const registeredApps = new Map()

/**
 * 已挂载的子应用实例表
 * Map<appName, MiniMicroAppElement>
 * 用于跟踪当前已挂载的子应用 DOM 元素，防止重复挂载
 */
export const mountedApps = new Map()

/**
 * 全局运行时状态对象
 * @property {boolean} started - 是否已调用 start() 完成初始化
 * @property {object} options - 当前生效的运行时选项（已合并默认值）
 */
export const runtime = {
  started: false,
  options: { ...DEFAULT_OPTIONS },
}

/**
 * 设置运行时选项，会与默认选项合并
 *
 * 合并规则：
 * - sandbox: 显式传 false 才关闭沙箱，否则默认开启
 * - sandboxPermissions: 与 DEFAULT_OPTIONS 合并去重
 *
 * @param {object} [options={}] - 用户传入的运行时选项
 * @param {boolean} [options.sandbox] - 是否开启 iframe sandbox 隔离
 * @param {string[]} [options.sandboxPermissions] - iframe sandbox 允许的权限列表
 */
export function setRuntimeOptions(options = {}) {
  runtime.options = {
    sandbox: options.sandbox !== false,
    sandboxPermissions: Array.isArray(options.sandboxPermissions)
      ? [...new Set(options.sandboxPermissions)]
      : [...DEFAULT_OPTIONS.sandboxPermissions],
  }
}
