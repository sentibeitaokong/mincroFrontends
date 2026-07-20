/**
 * mini-wujie 沙箱 (Sandbox)
 *
 * 核心模块，实现子应用的隔离加载与运行。
 *
 * 工作原理：
 * 1. fetch 子应用的 HTML 入口文件
 * 2. 将 HTML 解析为 DOM，提取 <style>/<link> 样式注入到 Shadow DOM
 * 3. 将 <body> 的内容渲染到 Shadow DOM 中（样式隔离 + DOM 隔离）
 * 4. 创建一个隐藏的 iframe 作为 JavaScript 执行环境（JS 隔离）
 * 5. 在 iframe 中按序执行子应用的 <script>，使子应用代码运行在沙箱 Window 中
 * 6. 通过 patchIframeDocument 将 iframe 内的 DOM 查询代理到 Shadow DOM
 *
 * 架构要点：
 * - Shadow DOM 负责样式隔离和 DOM 渲染
 * - iframe 负责提供干净的 JS 全局环境
 * - 两者通过 document 查询代理桥接：子应用的 DOM 操作实际落在 Shadow DOM 上
 */

import { bus } from './bus.js'

/**
 * 需要转换为绝对路径的 HTML 属性列表
 * 这些属性通常包含资源引用，在子应用中使用相对路径，
 * 必须转换为基于子应用 URL 的绝对路径才能正确加载
 */
const URL_ATTRIBUTES = ['src', 'href', 'action', 'poster']

/**
 * 将相对路径或相对 URL 转换为绝对路径
 *
 * @param {string} value - 原始 URL 值
 * @param {string} baseUrl - 子应用的基础 URL
 * @returns {string} 绝对 URL，或原值（对于无需转换的值如 data: blob: # javascript: 等）
 */
function toAbsoluteUrl(value, baseUrl) {
  // 跳过空值、锚点链接、以及 data/blob/javascript/mailto/tel 协议的 URL
  if (!value || value.startsWith('#') || /^(data:|blob:|javascript:|mailto:|tel:)/i.test(value)) {
    return value
  }

  // 使用 URL 构造函数，基于 baseUrl 解析相对路径
  return new URL(value, baseUrl).href
}

/**
 * 重写 DOM 节点中的资源 URL
 * 遍历根节点下的所有元素，将指定的资源属性（src, href 等）转为绝对路径
 *
 * @param {Element} root - 待处理的 DOM 根节点
 * @param {string} baseUrl - 子应用的基础 URL
 */
function rewriteAssetUrls(root, baseUrl) {
  root.querySelectorAll('*').forEach((element) => {
    URL_ATTRIBUTES.forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        element.setAttribute(attribute, toAbsoluteUrl(element.getAttribute(attribute), baseUrl))
      }
    })
  })
}

/**
 * 重写 CSS 文本中的 url() 引用为绝对路径
 * 例如：url(./bg.png) → url(http://child-app.com/./bg.png)
 *
 * @param {string} css - 原始 CSS 文本
 * @param {string} baseUrl - 子应用的基础 URL
 * @returns {string} 处理后的 CSS 文本
 */
function rewriteCssUrls(css, baseUrl) {
  return css.replace(
    // 匹配 CSS 中的 url() 引用，排除 data: blob: # 开头的值
    /url\((['"]?)(?!data:|blob:|#)([^)'"\s]+)\1\)/gi,
    (_, quote, value) => (
      `url(${quote}${toAbsoluteUrl(value, baseUrl)}${quote})`
    ),
  )
}

/**
 * 重写 ES Module 中的 import 语句里的相对路径
 * 因为在 iframe 中执行模块脚本时，相对路径需要相对于子应用 URL 解析
 *
 * @param {string} code - 模块源代码
 * @param {string} baseUrl - 子应用的基础 URL
 * @returns {string} 重写 import 路径后的代码
 */
function rewriteModuleImports(code, baseUrl) {
  return code.replace(
    // 匹配 import ... from '...'、import('...')、import '...' 中的相对路径
    /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])((?:\/(?!\/)|\.\.?\/)[^'"]*)\2/g,
    (_, prefix, quote, specifier) => `${prefix}${quote}${toAbsoluteUrl(specifier, baseUrl)}${quote}`,
  )
}

/**
 * 将子应用 HTML 中的样式提取并注入到 Shadow DOM
 *
 * 处理两种样式来源：
 * 1. <style> 内联样式 — 直接提取并重写 url()
 * 2. <link rel="stylesheet"> 外部样式 — fetch 获取后重写 url() 再注入
 *
 * @param {Document} parsedDocument - 解析后的子应用 HTML 文档
 * @param {ShadowRoot} shadowRoot - 宿主 Shadow DOM
 * @param {string} baseUrl - 子应用的基础 URL
 */
async function appendStyles(parsedDocument, shadowRoot, baseUrl) {
  const styles = [...parsedDocument.querySelectorAll('style, link[rel="stylesheet"]')]

  // 并行加载所有样式
  await Promise.all(styles.map(async (node) => {
    const style = document.createElement('style')
    if (node.tagName === 'STYLE') {
      // 内联样式：直接重写 CSS 中的 url() 引用
      style.textContent = rewriteCssUrls(node.textContent, baseUrl)
    } else {
      // 外部样式表：fetch 获取内容后同样重写 url()
      const href = toAbsoluteUrl(node.getAttribute('href'), baseUrl)
      const response = await fetch(href)
      if (!response.ok) throw new Error(`样式加载失败: ${href}`)
      style.textContent = rewriteCssUrls(await response.text(), href)
    }
    shadowRoot.append(style)
  }))
}

/**
 * 代理 iframe 的 document 查询方法到 Shadow DOM
 *
 * 核心技巧：子应用的 JS 运行在 iframe 中，默认会操作 iframe 的 document。
 * 但子应用的真实 DOM 内容渲染在 Shadow DOM 里。
 * 这个函数将 iframe document 上的 DOM 查询方法（getElementById, querySelector 等）
 * 重定向到 Shadow DOM，使子应用的 DOM 操作能正确找到 Shadow DOM 中的元素。
 *
 * 此外，还拦截了 document.head.appendChild/insertBefore，
 * 将 Vite 开发模式下动态插入的 <style>/<link> 转发到 Shadow DOM。
 *
 * @param {Document} iframeDocument - iframe 内部的 document 对象
 * @param {ShadowRoot} shadowRoot - 宿主 Shadow DOM
 */
function patchIframeDocument(iframeDocument, shadowRoot) {
  // 缓存绑定后的查询方法，避免每次调用都重新 bind
  const query = shadowRoot.querySelector.bind(shadowRoot)
  const queryAll = shadowRoot.querySelectorAll.bind(shadowRoot)

  // 将关键 DOM 查询方法代理到 Shadow DOM
  iframeDocument.getElementById = (id) => shadowRoot.getElementById(id)
  iframeDocument.querySelector = query
  iframeDocument.querySelectorAll = queryAll

  // 保存原始的 head 操作方法
  const rawAppendChild = iframeDocument.head.appendChild.bind(iframeDocument.head)
  const rawInsertBefore = iframeDocument.head.insertBefore.bind(iframeDocument.head)

  /**
   * 拦截 appendChild：如果是样式节点则转发到 Shadow DOM
   * Vite 在 HMR 热更新时会动态往 document.head 中插入 <style>，
   * 这里确保这些样式落在正确的 Shadow DOM 上下文中
   */
  iframeDocument.head.appendChild = (node) => {
    if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
      shadowRoot.append(node)
      return node
    }
    return rawAppendChild(node)
  }

  /**
   * 拦截 insertBefore：逻辑同上
   */
  iframeDocument.head.insertBefore = (node, reference) => {
    if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
      shadowRoot.append(node)
      return node
    }
    return rawInsertBefore(node, reference)
  }
}

/**
 * 在 iframe 中按序执行子应用的脚本
 *
 * 处理三种脚本形式：
 * 1. 有 src 的外部脚本 → 设置 script.src 让浏览器加载执行
 * 2. type="module" 的内联模块 → 重写 import 路径后通过 Blob URL 执行
 * 3. 普通内联脚本 → 直接设置 textContent 执行
 *
 * 脚本按 HTML 中的顺序串行执行（通过 Promise 链），保证依赖顺序正确。
 *
 * @param {Document} parsedDocument - 解析后的子应用 HTML 文档
 * @param {Document} iframeDocument - iframe 内部的 document
 * @param {string} baseUrl - 子应用的基础 URL
 * @returns {Promise<void>}
 */
function runScripts(parsedDocument, iframeDocument, baseUrl) {
  const scripts = [...parsedDocument.querySelectorAll('script')]

  // 使用 reduce 构建 Promise 链，确保脚本按序串行执行
  return scripts.reduce((chain, sourceScript) => chain.then(() => new Promise((resolve, reject) => {
    const script = iframeDocument.createElement('script')
    const src = sourceScript.getAttribute('src')
    const isModule = sourceScript.getAttribute('type')?.toLowerCase() === 'module'
    let blobUrl = null

    // 复制原始 <script> 元素上的所有属性（除了 src，它需要特殊处理）
    for (const { name, value } of sourceScript.attributes) {
      if (name !== 'src') script.setAttribute(name, value)
    }

    if (src) {
      // 外部脚本：直接将 src 转为绝对路径
      script.src = toAbsoluteUrl(src, baseUrl)
    } else {
      // 内联脚本
      const code = isModule
        ? rewriteModuleImports(sourceScript.textContent, baseUrl) // 模块脚本需要重写 import 路径
        : sourceScript.textContent
      // 添加 sourceURL 注释，方便在 DevTools 中调试时看到正确的文件名
      const executableCode = `${code}\n//# sourceURL=${baseUrl}inline-script.js`

      if (isModule) {
        // ESM 模块不能通过 textContent 执行，需要创建 Blob URL
        // 注意：必须在 iframe 的 Window 上下文中创建 Blob，否则跨域隔离会出问题
        const sandboxWindow = iframeDocument.defaultView
        blobUrl = sandboxWindow.URL.createObjectURL(new sandboxWindow.Blob(
          [executableCode],
          { type: 'text/javascript' },
        ))
        script.src = blobUrl
      } else {
        // 普通脚本直接设置文本内容即可执行
        script.textContent = executableCode
      }
    }

    // 为外部脚本和模块脚本设置加载回调
    if (src || isModule) {
      script.onload = () => {
        // 清理 Blob URL 以释放内存
        if (blobUrl) iframeDocument.defaultView.URL.revokeObjectURL(blobUrl)
        resolve()
      }
      script.onerror = () => {
        if (blobUrl) iframeDocument.defaultView.URL.revokeObjectURL(blobUrl)
        reject(new Error(`脚本加载失败: ${script.src || baseUrl}`))
      }
    }

    // 将 script 元素添加到 iframe 的 head 中触发执行
    iframeDocument.head.appendChild(script)

    // 普通内联脚本是同步执行的，appendChild 后立即 resolve
    if (!src && !isModule) resolve()
  })), Promise.resolve())
}

/**
 * MiniWujieSandbox — 子应用沙箱
 *
 * 每个子应用对应一个沙箱实例，负责：
 * 1. 加载和解析子应用的 HTML
 * 2. 将样式和 DOM 内容注入到宿主 Shadow DOM
 * 3. 创建隐藏 iframe 作为 JS 执行环境
 * 4. 在 iframe 中执行子应用脚本
 * 5. 注入 $wujie 全局对象供子应用访问
 */
export class MiniWujieSandbox {
  /**
   * @param {Object} options
   * @param {string} options.name - 子应用唯一名称
   * @param {string} options.url - 子应用入口 HTML 的 URL
   * @param {ShadowRoot} options.shadowRoot - 宿主的 Shadow DOM 根节点
   * @param {Object} [options.props={}] - 传递给子应用的初始数据
   */
  constructor({ name, url, shadowRoot, props = {} }) {
    this.name = name
    this.url = url
    this.shadowRoot = shadowRoot
    this.props = props
    this.iframe = null
  }

  /**
   * 启动沙箱 — 加载并运行子应用
   *
   * 执行流程：
   * 1. fetch HTML 入口 → 解析 DOM
   * 2. 提取样式注入 Shadow DOM（CSS 隔离）
   * 3. 渲染 body 内容到 Shadow DOM（DOM 渲染）
   * 4. 创建隐藏 iframe（JS 隔离环境）
   * 5. 代理 iframe document 查询到 Shadow DOM
   * 6. 注入 $wujie 全局对象
   * 7. 按序执行子应用脚本
   */
  async start() {
    // 1. 获取子应用的 HTML 入口文件
    const response = await fetch(this.url)
    if (!response.ok) throw new Error(`子应用加载失败: ${this.url}`)

    const html = await response.text()
    // 使用 DOMParser 将 HTML 字符串解析为 DOM 树
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html')
    // 计算子应用的基础 URL（用于后续的相对路径解析）
    const baseUrl = new URL('.', response.url || this.url).href

    // 2. 清空 Shadow DOM 并注入样式
    this.shadowRoot.replaceChildren()
    await appendStyles(parsedDocument, this.shadowRoot, baseUrl)

    // 3. 渲染子应用的 body 内容到 Shadow DOM
    const content = document.createElement('main')
    content.className = 'mini-wujie-body'
    content.setAttribute('part', 'body') // CSS Shadow Parts 允许外部样式穿透
    content.innerHTML = parsedDocument.body.innerHTML
    // 移除内联 <script>，因为脚本会在 iframe 中执行而不是直接内嵌
    content.querySelectorAll('script').forEach((script) => script.remove())
    // 将资源引用（图片、链接等）的相对路径转为绝对路径
    rewriteAssetUrls(content, baseUrl)
    this.shadowRoot.append(content)

    // 4. 创建隐藏 iframe 作为 JS 沙箱
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    // sandbox 属性限制 iframe 的权限：只允许脚本执行和同源访问
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
    iframe.style.display = 'none'
    this.shadowRoot.append(iframe)
    this.iframe = iframe

    const sandboxWindow = iframe.contentWindow
    const sandboxDocument = iframe.contentDocument

    // 5. 为 about:blank 的 iframe 设置 base URL
    // 内联的 Vite 模块脚本（如 /@react-refresh）包含根相对路径的 import，
    // 需要通过 <base> 元素告诉浏览器正确的解析基准
    const base = sandboxDocument.createElement('base')
    base.href = baseUrl
    sandboxDocument.head.appendChild(base)

    // 6. 代理 iframe document 的 DOM 查询到 Shadow DOM
    patchIframeDocument(sandboxDocument, this.shadowRoot)

    // 7. 注入 $wujie 全局对象，供子应用访问主应用提供的 API
    sandboxWindow.$wujie = {
      bus, // 事件总线，用于跨应用通信
      props: this.props, // 主应用传递的数据
      name: this.name, // 子应用名称
      shadowRoot: this.shadowRoot, // Shadow DOM 根节点
      iframe, // iframe 元素引用
    }

    // 8. 在 iframe 中按 HTML 顺序执行子应用脚本
    await runScripts(parsedDocument, sandboxDocument, baseUrl)
  }

  /**
   * 销毁沙箱
   * 移除 iframe 并清空 Shadow DOM，释放所有资源
   */
  destroy() {
    this.iframe?.remove()
    this.iframe = null
    this.shadowRoot.replaceChildren()
  }
}
