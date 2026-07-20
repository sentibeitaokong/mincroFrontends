/**
 * mini-wujie — 无界微前端框架的精简实现
 *
 * 本文件是 mini-wujie 的统一入口，负责：
 * 1. 注册自定义元素 <mini-wujie-app>
 * 2. 导出 Vue 封装组件 MiniWujie
 * 3. 导出事件总线 bus，供主应用与子应用之间通信
 */

import MiniWujie from './MiniWujie.vue'
import { bus } from './bus.js'
import { defineMiniWujieElement } from './element.js'

// 在模块加载时立即注册 <mini-wujie-app> 自定义元素
// 确保在任何 Vue/React 组件使用它之前就已经可用
defineMiniWujieElement()

export { bus, MiniWujie }
