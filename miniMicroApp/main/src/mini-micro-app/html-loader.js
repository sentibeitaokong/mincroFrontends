/**
 * HTML 加载器模块
 *
 * 负责通过网络请求获取子应用的 HTML 入口文件，并进行运行时转换：
 * 1. 注入 <base> 标签，确保子应用的相对资源路径正确指向其服务端
 * 2. 移除 Vite HMR 客户端脚本（避免开发模式下 HMR WebSocket 连接干扰）
 * 3. 注入沙箱桥接代码（通信脚本），建立父子应用通信通道
 */

/**
 * 根据入口 URL 计算子应用的 base 路径
 *
 * 示例：
 *   getBaseUrl('http://localhost:5173/')      → 'http://localhost:5173/'
 *   getBaseUrl('http://localhost:5173/app')    → 'http://localhost:5173/app/'
 *   getBaseUrl('http://localhost:5173/app/')   → 'http://localhost:5173/app/'
 *
 * @param {string} entry - 子应用入口 URL
 * @returns {string} 计算后的 base URL（以 / 结尾）
 */
function getBaseUrl(entry) {
  const url = new URL(entry, window.location.href)
  return url.pathname.endsWith('/') ? url.href : new URL('.', url).href
}

export class HTMLLoader {
  /**
   * 加载子应用的 HTML 入口文件
   * @param {string} entry - 子应用入口 URL
   * @returns {Promise<string>} HTML 文本内容
   */
  async load(entry) {
    const response = await fetch(entry)
    if (!response.ok) throw new Error(`请求入口失败: HTTP ${response.status}`)
    return response.text()
  }

  /**
   * 转换 HTML：注入 base 标签、移除 Vite HMR、注入沙箱桥接代码
   *
   * 转换流程：
   * 1. 解析 HTML 字符串为 DOM 树
   * 2. 在 <head> 最前面插入 <base> 标签，修正资源路径
   * 3. 移除 @vite/client 的 <script> 标签，避免开发环境 HMR 干扰
   * 4. 在 <base> 之后插入沙箱桥接脚本
   * 5. 序列化回 HTML 字符串（使用 srcdoc 加载，确保样式隔离）
   *
   * @param {string} html - 原始 HTML 字符串
   * @param {string} entry - 子应用入口 URL
   * @param {string} bridgeCode - 要注入的沙箱桥接 JS 代码
   * @returns {string} 转换后的 HTML 字符串
   */
  transform(html, entry, bridgeCode) {
    const document = new DOMParser().parseFromString(html, 'text/html')

    // srcdoc 依靠 base 将 HTML 内的绝对/相对资源都指回子应用服务。
    const base = document.createElement('base')
    base.href = getBaseUrl(entry)
    document.head.prepend(base)

    // HMR 客户端不影响业务运行，极简运行时不代理它的 WebSocket。
    document.querySelectorAll('script[src]').forEach((script) => {
      const src = script.getAttribute('src') || ''
      if (new URL(src, base.href).pathname === '/@vite/client') script.remove()
    })

    // 注入桥接脚本，放在 base 之后确保 base 先生效
    const bridge = document.createElement('script')
    bridge.textContent = bridgeCode
    base.after(bridge)

    return `<!doctype html>${document.documentElement.outerHTML}`
  }
}
