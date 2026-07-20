/**
 * mini-wujie 事件总线 (EventBus)
 *
 * 提供主应用与子应用之间的发布-订阅通信机制。
 * 子应用通过 iframe 内注入的 $wujie.bus 访问同一个 bus 实例，
 * 从而实现跨应用的事件传递。
 *
 * 使用示例：
 *   bus.$on('message', (data) => { ... })   // 订阅
 *   bus.$emit('message', payload)           // 发布
 *   bus.$off('message')                     // 取消订阅
 */

class EventBus {
  /**
   * 使用私有字段存储事件映射表
   * 结构：Map<eventName, Set<handler>>
   * 每个事件名对应一组处理函数，使用 Set 保证唯一性并支持高效增删
   */
  #events = new Map()

  /**
   * 订阅事件
   * @param {string} event - 事件名称
   * @param {Function} handler - 事件处理函数
   * @returns {Function} 返回取消订阅的函数，调用即可解绑
   */
  $on(event, handler) {
    const handlers = this.#events.get(event) || new Set()
    handlers.add(handler)
    this.#events.set(event, handlers)
    // 返回解绑函数，方便在组件卸载时清理
    return () => this.$off(event, handler)
  }

  /**
   * 取消订阅事件
   * @param {string} event - 事件名称
   * @param {Function} [handler] - 要移除的特定处理函数；若不传则清空该事件的所有订阅
   */
  $off(event, handler) {
    if (!handler) {
      // 未指定 handler 时，删除整个事件的所有订阅
      this.#events.delete(event)
      return
    }

    const handlers = this.#events.get(event)
    handlers?.delete(handler)
    // 如果该事件已无任何订阅者，清理 Map 中的空条目
    if (handlers?.size === 0) this.#events.delete(event)
  }

  /**
   * 发布事件
   * @param {string} event - 事件名称
   * @param {...any} args - 传递给处理函数的参数
   */
  $emit(event, ...args) {
    this.#events.get(event)?.forEach((handler) => handler(...args))
  }
}

// 导出单例 — 整个应用共享同一个事件总线实例
export const bus = new EventBus()
