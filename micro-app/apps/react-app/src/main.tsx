import { createRoot } from 'react-dom/client'
import type { Root } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

declare global {
  interface Window {
    __MICRO_APP_ENVIRONMENT__?: boolean
    __MICRO_APP_NAME__?: string
    [key: `micro-app-${string}`]: unknown
  }
}

let root: Root | null = null

function render(container?: Element | Document | null) {
  const mountContainer = container ?? document
  let rootElement = mountContainer.querySelector('#root')

  if (!rootElement) {
    rootElement = document.createElement('div')
    rootElement.id = 'root'
    document.body.appendChild(rootElement)
  }

  if (root) return

  root = createRoot(rootElement)
  root.render(<App />)
}

function unmount() {
  root?.unmount()
  root = null
}

if (window.__MICRO_APP_ENVIRONMENT__ && window.__MICRO_APP_NAME__) {
  window[`micro-app-${window.__MICRO_APP_NAME__}`] = { mount: render, unmount }
} else {
  render()
}
