/**
 * 事件中心模块
 *
 * 基于发布-订阅模式的事件总线，用于子应用与父应用之间的数据通信。
 * 每个子应用通过 appName 作为命名空间隔离监听器，互不干扰。
 *
 * 使用示例：
 *   eventCenter.on('app1', (data) => console.log(data))   // 订阅
 *   eventCenter.dispatch('app1', { key: 'value' })         // 发布
 *   eventCenter.off('app1', listener)                      // 取消订阅
 */

class EventCenter {
  /** 存储所有监听器：Map<appName, Set<listener>>，使用私有字段防止外部直接访问 */
  #listeners = new Map()

  /**
   * 为指定子应用注册数据监听器
   * @param {string} appName - 子应用名称
   * @param {Function} listener - 数据回调函数，接收子应用发送的数据
   */
  on(appName, listener) {
    if (typeof listener !== 'function') return
    if (!this.#listeners.has(appName)) this.#listeners.set(appName, new Set())
    this.#listeners.get(appName).add(listener)
  }

  /**
   * 取消指定子应用的某个监听器
   * @param {string} appName - 子应用名称
   * @param {Function} listener - 要移除的回调函数
   */
  off(appName, listener) {
    this.#listeners.get(appName)?.delete(listener)
  }

  /**
   * 向指定子应用的所有监听器派发数据
   * 每个监听器在独立的 try-catch 中执行，确保单个监听器异常不影响其他监听器
   * @param {string} appName - 子应用名称
   * @param {*} data - 要传递的数据
   */
  dispatch(appName, data) {
    this.#listeners.get(appName)?.forEach((listener) => {
      try {
        listener(data)
      } catch (error) {
        console.error(`[mini-micro-app] ${appName} 数据监听器执行失败`, error)
      }
    })
  }
}

/** 全局单例事件中心，供整个运行时共享使用 */
export const eventCenter = new EventCenter()
