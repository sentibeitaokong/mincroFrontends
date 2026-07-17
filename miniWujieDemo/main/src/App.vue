<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { bus, MiniWujie } from './mini-wujie/index.js'

const apps = [
  {
    id: 'react-app',
    name: 'React 子应用',
    stack: 'React 19',
    url: import.meta.env.VITE_REACT_APP_URL || 'http://localhost:5174/',
    color: '#61dafb',
  },
  {
    id: 'vue-app',
    name: 'Vue 子应用',
    stack: 'Vue 3',
    url: import.meta.env.VITE_VUE_APP_URL || 'http://localhost:5175/',
    color: '#42b883',
  },
]

const activeId = ref(apps[0].id)
const activeApp = computed(() => apps.find((app) => app.id === activeId.value))
const lastMessage = ref('等待子应用发送消息')
const childProps = { hostName: 'Mini Wujie 主应用' }

function sendToChild() {
  bus.$emit('host-message', {
    from: 'Mini Wujie 主应用',
    target: activeId.value,
    text: `你好，${activeApp.value.name}`,
  })
}

function handleChildMessage(message) {
  lastMessage.value = `${message.from}：${message.text}`
}

bus.$on('child-message', handleChildMessage)
onBeforeUnmount(() => bus.$off('child-message', handleChildMessage))
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span>M</span>
        <div>
          <strong>Mini Wujie</strong>
          <small>Vue 3 微前端</small>
        </div>
      </div>

      <p class="nav-title">子应用</p>
      <nav aria-label="子应用导航">
        <button
          v-for="app in apps"
          :key="app.id"
          type="button"
          class="nav-item"
          :class="{ active: activeId === app.id }"
          :style="{ '--app-color': app.color }"
          @click="activeId = app.id"
        >
          <i></i>
          <span><strong>{{ app.name }}</strong><small>{{ app.stack }} + Vite</small></span>
        </button>
      </nav>

      <div class="feature-list">
        <span>Shadow DOM</span>
        <span>iframe Sandbox</span>
        <span>EventBus</span>
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <small>当前运行</small>
          <h1>{{ activeApp.name }}</h1>
        </div>
        <div class="actions">
          <button type="button" @click="sendToChild">向当前子应用发消息</button>
          <a :href="activeApp.url" target="_blank" rel="noreferrer">独立打开 ↗</a>
        </div>
      </header>

      <div class="message" aria-live="polite">
        <b>EventBus</b>
        <span>{{ lastMessage }}</span>
      </div>

      <section class="viewport" :aria-label="`${activeApp.name}内容`">
        <MiniWujie
          v-for="app in apps"
          v-show="activeId === app.id"
          :key="app.id"
          class="micro-app"
          :name="app.id"
          :url="app.url"
          :props="childProps"
        />
      </section>
    </main>
  </div>
</template>
