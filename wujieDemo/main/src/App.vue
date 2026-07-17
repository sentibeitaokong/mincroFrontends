<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import WujieVue from 'wujie-vue3'

const apps = [
  {
    id: 'react-app',
    name: 'React 子应用',
    description: 'React 19 + Vite',
    url: import.meta.env.VITE_REACT_APP_URL || 'http://localhost:5174/',
    color: '#61dafb',
  },
  {
    id: 'vue-app',
    name: 'Vue 子应用',
    description: 'Vue 3 + Vite',
    url: import.meta.env.VITE_VUE_APP_URL || 'http://localhost:5175/',
    color: '#42b883',
  },
]

const activeId = ref(apps[0].id)
const activeApp = computed(() => apps.find((app) => app.id === activeId.value))
const childProps = { hostName: 'Wujie 主应用' }
const lastMessage = ref('等待子应用发送消息')

function handleChildMessage(message) {
  lastMessage.value = `${message.from}：${message.text}`
}

function broadcastMessage() {
  WujieVue.bus.$emit('host-message', {
    from: '主应用',
    text: `你好，${activeApp.value.name}`,
    target: activeId.value,
  })
}

WujieVue.bus.$on('child-message', handleChildMessage)
onBeforeUnmount(() => WujieVue.bus.$off('child-message', handleChildMessage))
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">W</span>
        <div>
          <strong>Wujie Demo</strong>
          <small>Micro Frontend</small>
        </div>
      </div>

      <nav aria-label="子应用导航">
        <p class="nav-label">应用列表</p>
        <button
          v-for="app in apps"
          :key="app.id"
          class="nav-item"
          :class="{ active: activeId === app.id }"
          :style="{ '--app-color': app.color }"
          type="button"
          @click="activeId = app.id"
        >
          <span class="app-dot"></span>
          <span>
            <strong>{{ app.name }}</strong>
            <small>{{ app.description }}</small>
          </span>
        </button>
      </nav>

      <div class="framework-badge">
        <span class="status-dot"></span>
        Powered by Wujie
      </div>
    </aside>

    <main class="workspace">
      <header class="topbar">
        <div>
          <p class="eyebrow">当前运行</p>
          <h1>{{ activeApp.name }}</h1>
        </div>
        <div class="topbar-actions">
          <button type="button" @click="broadcastMessage">向子应用广播</button>
          <a :href="activeApp.url" target="_blank" rel="noreferrer">独立打开 ↗</a>
        </div>
      </header>

      <div class="message-bar" aria-live="polite">
        <span>EventBus</span>
        {{ lastMessage }}
      </div>

      <section class="app-viewport" :aria-label="`${activeApp.name}内容`">
        <WujieVue
          v-for="app in apps"
          v-show="activeId === app.id"
          :key="app.id"
          class="micro-app"
          width="100%"
          height="100%"
          :name="app.id"
          :url="app.url"
          :props="childProps"
          :sync="true"
          :alive="true"
        />
      </section>
    </main>
  </div>
</template>
