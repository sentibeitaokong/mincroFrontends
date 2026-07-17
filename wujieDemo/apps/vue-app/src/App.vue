<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const count = ref(0)
const wujie = window.$wujie
const isWujie = Boolean(wujie)
const hostName = wujie?.props?.hostName || '独立运行模式'
const hostMessage = ref('等待主应用广播')

function handleHostMessage(message) {
  if (!message.target || message.target === 'vue-app') {
    hostMessage.value = `${message.from}：${message.text}`
  }
}

function greetHost() {
  if (!wujie) {
    hostMessage.value = '当前为独立运行模式，未连接主应用'
    return
  }

  wujie.bus.$emit('child-message', {
    from: 'Vue 子应用',
    text: `计数器当前为 ${count.value}`,
  })
}

onMounted(() => wujie?.bus.$on('host-message', handleHostMessage))
onBeforeUnmount(() => wujie?.bus.$off('host-message', handleHostMessage))
</script>

<template>
  <main class="vue-page">
    <section class="hero-card">
      <div class="framework-icon">V</div>
      <p class="eyebrow">Vue 3 子应用</p>
      <h1>你好，{{ hostName }}</h1>
      <p class="intro">这个页面拥有独立的 Vue 实例、样式作用域和运行状态。</p>

      <div class="status-grid">
        <article>
          <span>运行环境</span>
          <strong>{{ isWujie ? 'Wujie 沙箱' : 'Standalone' }}</strong>
        </article>
        <article>
          <span>本地状态</span>
          <strong>{{ count }}</strong>
        </article>
      </div>

      <div class="actions">
        <button class="primary" type="button" @click="count++">增加计数</button>
        <button type="button" @click="greetHost">通知主应用</button>
      </div>

      <div class="message">
        <span>来自主应用</span>
        <p>{{ hostMessage }}</p>
      </div>
    </section>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  min-width: 320px;
  min-height: 100vh;
  margin: 0;
  color: #12372a;
  background: #f2fbf6;
  font-family: Inter, ui-sans-serif, system-ui, sans-serif;
}

.vue-page {
  position: relative;
  display: grid;
  min-height: 100vh;
  place-items: center;
  overflow: hidden;
}

.hero-card {
  margin-top: -80px;
  position: relative;
  z-index: 1;
  width: min(620px, 100%);
  padding: clamp(30px, 6vw, 58px);
  border: 1px solid rgb(66 184 131 / 20%);
  border-radius: 28px;
  background: rgb(255 255 255 / 82%);
  box-shadow: 0 30px 80px rgb(24 95 69 / 13%);
  backdrop-filter: blur(16px);
}

.framework-icon {
  display: grid;
  width: 52px;
  height: 52px;
  margin-bottom: 28px;
  place-items: center;
  border-radius: 16px;
  color: white;
  background: #42b883;
  box-shadow: 0 12px 30px rgb(66 184 131 / 28%);
  font-size: 24px;
  font-weight: 800;
}

.eyebrow {
  margin: 0 0 8px;
  color: #42a579;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(32px, 6vw, 52px);
  letter-spacing: -0.05em;
  line-height: 1.05;
}

.intro {
  max-width: 480px;
  margin: 18px 0 30px;
  color: #607c71;
  line-height: 1.7;
}

.status-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.status-grid article {
  padding: 16px 18px;
  border-radius: 14px;
  background: #edf8f2;
}

.status-grid span,
.status-grid strong {
  display: block;
}

.status-grid span {
  margin-bottom: 6px;
  color: #799187;
  font-size: 11px;
}

.actions {
  display: flex;
  gap: 10px;
}

button {
  padding: 11px 16px;
  border: 1px solid #cde5d9;
  border-radius: 10px;
  color: #245540;
  background: white;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

button.primary {
  border-color: #42b883;
  color: white;
  background: #42b883;
}

.message {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #e0eee7;
}

.message span {
  color: #799187;
  font-size: 11px;
  font-weight: 700;
}

.message p {
  margin: 5px 0 0;
  color: #315e4a;
}

@media (max-width: 560px) {
  .vue-page {
    padding: 18px;
  }

  .status-grid {
    grid-template-columns: 1fr;
  }
}
</style>
