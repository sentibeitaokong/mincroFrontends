class EventBus {
  #events = new Map()

  $on(event, handler) {
    const handlers = this.#events.get(event) || new Set()
    handlers.add(handler)
    this.#events.set(event, handlers)
    return () => this.$off(event, handler)
  }

  $off(event, handler) {
    if (!handler) {
      this.#events.delete(event)
      return
    }

    const handlers = this.#events.get(event)
    handlers?.delete(handler)
    if (handlers?.size === 0) this.#events.delete(event)
  }

  $emit(event, ...args) {
    this.#events.get(event)?.forEach((handler) => handler(...args))
  }
}

export const bus = new EventBus()
