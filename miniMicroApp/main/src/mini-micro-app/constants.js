/**
 * 常量定义模块
 *
 * 集中管理 mini-micro-app 运行时的所有常量，包括：
 * - 自定义元素标签名
 * - 跨域通信通道标识
 * - 父子应用消息类型
 * - 子应用生命周期状态
 * - 默认沙箱配置
 */

/** 自定义 HTML 元素的标签名，用于注册 <mini-micro-app> 组件 */
export const TAG_NAME = 'mini-micro-app'

/** postMessage 通信时的通道标识，用于区分 mini-micro-app 的消息与其他来源的消息 */
export const CHANNEL = '__mini_micro_app__'

/**
 * 父子应用之间的消息类型枚举
 *
 * READY       - 子应用加载完毕，通知父应用已就绪
 * CHILD_DATA  - 子应用向父应用发送数据
 * PARENT_DATA - 父应用向子应用发送数据
 * UNMOUNT     - 父应用通知子应用即将卸载
 */
export const MESSAGE_TYPE = {
  READY: 'ready',
  CHILD_DATA: 'child-data',
  PARENT_DATA: 'parent-data',
  UNMOUNT: 'unmount',
}

/**
 * 子应用生命周期状态枚举
 *
 * LOADING    - 正在加载子应用资源
 * MOUNTED    - 子应用已挂载并正常运行
 * UNMOUNTED  - 子应用已卸载
 * LOAD_ERROR - 子应用加载失败
 */
export const APP_STATUS = {
  LOADING: 'loading',
  MOUNTED: 'mounted',
  UNMOUNTED: 'unmounted',
  LOAD_ERROR: 'load-error',
}

/** 默认运行时选项：开启沙箱，并允许脚本执行 */
export const DEFAULT_OPTIONS = {
  sandbox: true,
  sandboxPermissions: ['allow-scripts'],
}
