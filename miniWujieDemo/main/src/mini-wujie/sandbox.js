import { bus } from './bus.js'

const URL_ATTRIBUTES = ['src', 'href', 'action', 'poster']

function toAbsoluteUrl(value, baseUrl) {
  if (!value || value.startsWith('#') || /^(data:|blob:|javascript:|mailto:|tel:)/i.test(value)) {
    return value
  }

  return new URL(value, baseUrl).href
}

function rewriteAssetUrls(root, baseUrl) {
  root.querySelectorAll('*').forEach((element) => {
    URL_ATTRIBUTES.forEach((attribute) => {
      if (element.hasAttribute(attribute)) {
        element.setAttribute(attribute, toAbsoluteUrl(element.getAttribute(attribute), baseUrl))
      }
    })
  })
}

function rewriteCssUrls(css, baseUrl) {
  return css.replace(/url\((['"]?)(?!data:|blob:|#)([^)'"\s]+)\1\)/gi, (_, quote, value) => (
    `url(${quote}${toAbsoluteUrl(value, baseUrl)}${quote})`
  ))
}

function rewriteModuleImports(code, baseUrl) {
  return code.replace(
    /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)(['"])((?:\/(?!\/)|\.\.?\/)[^'"]*)\2/g,
    (_, prefix, quote, specifier) => `${prefix}${quote}${toAbsoluteUrl(specifier, baseUrl)}${quote}`,
  )
}

async function appendStyles(parsedDocument, shadowRoot, baseUrl) {
  const styles = [...parsedDocument.querySelectorAll('style, link[rel="stylesheet"]')]

  await Promise.all(styles.map(async (node) => {
    const style = document.createElement('style')
    if (node.tagName === 'STYLE') {
      style.textContent = rewriteCssUrls(node.textContent, baseUrl)
    } else {
      const href = toAbsoluteUrl(node.getAttribute('href'), baseUrl)
      const response = await fetch(href)
      if (!response.ok) throw new Error(`样式加载失败: ${href}`)
      style.textContent = rewriteCssUrls(await response.text(), href)
    }
    shadowRoot.append(style)
  }))
}

function patchIframeDocument(iframeDocument, shadowRoot) {
  const query = shadowRoot.querySelector.bind(shadowRoot)
  const queryAll = shadowRoot.querySelectorAll.bind(shadowRoot)

  iframeDocument.getElementById = (id) => shadowRoot.getElementById(id)
  iframeDocument.querySelector = query
  iframeDocument.querySelectorAll = queryAll

  // Vite 在开发模式下把 CSS 写入 document.head，这里将其转发到 Shadow DOM。
  const rawAppendChild = iframeDocument.head.appendChild.bind(iframeDocument.head)
  const rawInsertBefore = iframeDocument.head.insertBefore.bind(iframeDocument.head)
  iframeDocument.head.appendChild = (node) => {
    if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
      shadowRoot.append(node)
      return node
    }
    return rawAppendChild(node)
  }
  iframeDocument.head.insertBefore = (node, reference) => {
    if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
      shadowRoot.append(node)
      return node
    }
    return rawInsertBefore(node, reference)
  }
}

function runScripts(parsedDocument, iframeDocument, baseUrl) {
  const scripts = [...parsedDocument.querySelectorAll('script')]

  return scripts.reduce((chain, sourceScript) => chain.then(() => new Promise((resolve, reject) => {
    const script = iframeDocument.createElement('script')
    const src = sourceScript.getAttribute('src')
    const isModule = sourceScript.getAttribute('type')?.toLowerCase() === 'module'
    let blobUrl = null

    for (const { name, value } of sourceScript.attributes) {
      if (name !== 'src') script.setAttribute(name, value)
    }

    if (src) {
      script.src = toAbsoluteUrl(src, baseUrl)
    } else {
      const code = isModule
        ? rewriteModuleImports(sourceScript.textContent, baseUrl)
        : sourceScript.textContent
      const executableCode = `${code}\n//# sourceURL=${baseUrl}inline-script.js`

      if (isModule) {
        const sandboxWindow = iframeDocument.defaultView
        blobUrl = sandboxWindow.URL.createObjectURL(new sandboxWindow.Blob(
          [executableCode],
          { type: 'text/javascript' },
        ))
        script.src = blobUrl
      } else {
        script.textContent = executableCode
      }
    }

    if (src || isModule) {
      script.onload = () => {
        if (blobUrl) iframeDocument.defaultView.URL.revokeObjectURL(blobUrl)
        resolve()
      }
      script.onerror = () => {
        if (blobUrl) iframeDocument.defaultView.URL.revokeObjectURL(blobUrl)
        reject(new Error(`脚本加载失败: ${script.src || baseUrl}`))
      }
    }

    iframeDocument.head.appendChild(script)
    if (!src && !isModule) resolve()
  })), Promise.resolve())
}

export class MiniWujieSandbox {
  constructor({ name, url, shadowRoot, props = {} }) {
    this.name = name
    this.url = url
    this.shadowRoot = shadowRoot
    this.props = props
    this.iframe = null
  }

  async start() {
    const response = await fetch(this.url)
    if (!response.ok) throw new Error(`子应用加载失败: ${this.url}`)

    const html = await response.text()
    const parsedDocument = new DOMParser().parseFromString(html, 'text/html')
    const baseUrl = new URL('.', response.url || this.url).href

    this.shadowRoot.replaceChildren()
    await appendStyles(parsedDocument, this.shadowRoot, baseUrl)

    const content = document.createElement('main')
    content.className = 'mini-wujie-body'
    content.setAttribute('part', 'body')
    content.innerHTML = parsedDocument.body.innerHTML
    content.querySelectorAll('script').forEach((script) => script.remove())
    rewriteAssetUrls(content, baseUrl)
    this.shadowRoot.append(content)

    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin')
    iframe.style.display = 'none'
    this.shadowRoot.append(iframe)
    this.iframe = iframe

    const sandboxWindow = iframe.contentWindow
    const sandboxDocument = iframe.contentDocument

    // Inline Vite modules contain root-relative imports such as /@react-refresh.
    // Give the about:blank iframe the child application's URL base before they run.
    const base = sandboxDocument.createElement('base')
    base.href = baseUrl
    sandboxDocument.head.appendChild(base)

    patchIframeDocument(sandboxDocument, this.shadowRoot)

    sandboxWindow.$wujie = {
      bus,
      props: this.props,
      name: this.name,
      shadowRoot: this.shadowRoot,
      iframe,
    }

    await runScripts(parsedDocument, sandboxDocument, baseUrl)
  }

  destroy() {
    this.iframe?.remove()
    this.iframe = null
    this.shadowRoot.replaceChildren()
  }
}
