import './assets/main.css'

import { createApp, h } from 'vue'
import singleSpaVue from 'single-spa-vue'
import App from './App.vue'

const lifecycles = singleSpaVue({
  createApp,
  appOptions: {
    render() {
      return h(App)
    },
  },
})

export const { bootstrap, mount, unmount } = lifecycles
