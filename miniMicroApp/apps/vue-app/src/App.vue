<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const stockItems = [
  { sku: 'SKU-1007', name: '智能门锁 Pro', warehouse: '上海一仓', count: 128 },
  { sku: 'SKU-1121', name: '机械键盘 K8', warehouse: '北京二仓', count: 64 },
  { sku: 'SKU-1388', name: '无线耳机 Air', warehouse: '广州三仓', count: 216 },
]

const dashboardImage =
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 540"%3E%3Cdefs%3E%3ClinearGradient id="bg" x1="0" x2="1" y1="0" y2="1"%3E%3Cstop offset="0" stop-color="%23ede9fe"/%3E%3Cstop offset="1" stop-color="%23bae6fd"/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width="960" height="540" fill="url(%23bg)"/%3E%3Crect x="92" y="86" width="776" height="368" rx="30" fill="%23ffffff" opacity=".92"/%3E%3Cpath d="M174 350c80-106 146-116 232-48 94 74 172 48 266-92 36-54 78-88 126-100" fill="none" stroke="%237c3aed" stroke-width="18" stroke-linecap="round"/%3E%3Ccircle cx="174" cy="350" r="22" fill="%237c3aed"/%3E%3Ccircle cx="406" cy="302" r="22" fill="%2314b8a6"/%3E%3Ccircle cx="672" cy="210" r="22" fill="%23f59e0b"/%3E%3Crect x="170" y="388" width="620" height="10" rx="5" fill="%23cbd5e1"/%3E%3Crect x="170" y="142" width="176" height="22" rx="11" fill="%23a78bfa"/%3E%3C/svg%3E'

const microData = ref(window.microApp?.getData?.() ?? {})
const syncCount = ref(12)

function handleData(data) {
  microData.value = data
}

function notifyMain() {
  window.microApp?.dispatch?.({
    from: 'vue-app',
    message: `Vue 子应用已同步库存批次 ${syncCount.value}`,
    updatedAt: new Date().toLocaleTimeString(),
    source: '库存看板',
  })
}

onMounted(() => {
  window.microApp?.addDataListener?.(handleData, true)
})

onBeforeUnmount(() => {
  window.microApp?.removeDataListener?.(handleData)
})
</script>

<template>
  <section class="vue-page">
    <header class="app-head">
      <div>
        <p class="eyebrow">Vue micro app</p>
        <h1>库存看板</h1>
      </div>
      <div class="head-actions">
        <button type="button" @click="syncCount += 1">同步批次 {{ syncCount }}</button>
        <button class="ghost-button" type="button" @click="notifyMain">通知主应用</button>
      </div>
    </header>

    <section class="image-card">
      <img :src="dashboardImage" alt="库存趋势图表" />
      <div>
        <span>图片展示</span>
        <strong>库存周转趋势</strong>
        <small>子应用内部资源展示，可随子应用独立运行。</small>
      </div>
    </section>

    <div class="metric-grid">
      <article>
        <span>库存 SKU</span>
        <strong>408</strong>
      </article>
      <article>
        <span>预警商品</span>
        <strong>9</strong>
      </article>
      <article>
        <span>周转天数</span>
        <strong>18.4</strong>
      </article>
    </div>

    <section class="message-box">
      <span>主应用消息</span>
      <strong>{{ microData.message || '独立运行中，暂无主应用数据' }}</strong>
      <small v-if="microData.updatedAt">来自 {{ microData.from }}，{{ microData.updatedAt }}</small>
      <small v-else>访问 3000 端口可查看通信效果</small>
    </section>

    <section class="table-card">
      <h2>库存明细</h2>
      <div class="stock-list">
        <div v-for="item in stockItems" :key="item.sku" class="stock-row">
          <span>{{ item.sku }}</span>
          <span>{{ item.name }}</span>
          <span>{{ item.warehouse }}</span>
          <strong>{{ item.count }}</strong>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.vue-page {
  min-height: 620px;
  padding: 28px;
  color: #182033;
  background: #f8fafc;
  font: 16px/1.5 Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

* {
  box-sizing: border-box;
}

.app-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 18px;
  margin-bottom: 24px;
}

.app-head h1,
.app-head p,
.image-card strong,
.image-card small,
.message-box strong,
.message-box small,
.table-card h2 {
  margin: 0;
}

.eyebrow {
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
}

.app-head h1 {
  font-size: 30px;
  line-height: 1.2;
}

.head-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.head-actions button {
  min-height: 40px;
  border: 0;
  border-radius: 6px;
  padding: 0 14px;
  color: #fff;
  background: #7c3aed;
  font-weight: 800;
  cursor: pointer;
}

.head-actions .ghost-button {
  border: 1px solid #7c3aed;
  color: #7c3aed;
  background: #fff;
}

.image-card {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  align-items: center;
  gap: 18px;
  margin-bottom: 16px;
  padding: 14px;
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #fff;
}

.image-card img {
  width: 100%;
  aspect-ratio: 16 / 9;
  display: block;
  object-fit: cover;
  border-radius: 6px;
}

.image-card div {
  display: grid;
  gap: 6px;
}

.image-card span {
  color: #7c3aed;
  font-size: 13px;
  font-weight: 800;
}

.image-card strong {
  color: #0f172a;
  font-size: 20px;
}

.image-card small {
  color: #64748b;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.metric-grid article,
.message-box,
.table-card {
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  background: #fff;
}

.metric-grid article {
  min-height: 110px;
  padding: 18px;
  display: grid;
  align-content: space-between;
}

.metric-grid span,
.message-box span,
.stock-row span {
  color: #64748b;
}

.metric-grid strong {
  color: #0f172a;
  font-size: 28px;
}

.message-box {
  padding: 18px;
  display: grid;
  gap: 6px;
  margin-bottom: 16px;
  border-left: 5px solid #7c3aed;
}

.message-box strong {
  color: #0f172a;
  font-size: 18px;
}

.message-box small {
  color: #64748b;
}

.table-card {
  padding: 18px;
}

.table-card h2 {
  font-size: 18px;
  margin-bottom: 14px;
}

.stock-list {
  display: grid;
  gap: 10px;
}

.stock-row {
  min-height: 52px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  border-radius: 6px;
  background: #f1f5f9;
}

.stock-row strong {
  color: #7c3aed;
}

@media (max-width: 760px) {
  .vue-page {
    padding: 18px;
  }

  .app-head,
  .metric-grid {
    grid-template-columns: 1fr;
    flex-direction: column;
  }

  .head-actions {
    justify-content: flex-start;
  }

  .image-card {
    grid-template-columns: 1fr;
  }

  .stock-row {
    grid-template-columns: 1fr;
    padding: 12px;
  }
}
</style>
