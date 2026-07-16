import { createApp } from 'vue'
import App from './App.vue'

let app = null

function render(container = document) {
  const mountContainer = container || document
  let root = mountContainer.querySelector('#app')

  if (!root) {
    root = document.createElement('div')
    root.id = 'app'
    document.body.appendChild(root)
  }

  if (app) return

  app = createApp(App)
  app.mount(root)
}

function unmount() {
  app?.unmount()
  app = null
}

if (window.__MICRO_APP_ENVIRONMENT__) {
  window[`micro-app-${window.__MICRO_APP_NAME__}`] = { mount: render, unmount }
} else {
  render()
}
