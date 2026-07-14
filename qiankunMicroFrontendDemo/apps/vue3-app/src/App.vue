<template>
  <section class="vue-card">
    <h2>{{ title }}</h2>
    <p>这是 Vue 3 子应用，运行在 qiankun 沙箱中。</p>

    <dl>
      <dt>来自主应用的 props</dt>
      <dd>{{ from }}</dd>
      <dt>全局用户</dt>
      <dd>{{ state.user }}</dd>
      <dt>全局主题</dt>
      <dd>{{ state.theme }}</dd>
    </dl>

    <button @click="updateGlobalState">Vue 子应用修改全局状态</button>
  </section>
</template>

<script setup>
import { reactive } from "vue";

const props = defineProps({
  title: {
    type: String,
    default: "Vue3 子应用",
  },
  from: {
    type: String,
    default: "standalone",
  },
  qiankunActions: {
    type: Object,
    default: null,
  },
});

const state = reactive({
  user: "Guest",
  theme: "light",
});

if (props.qiankunActions) {
  props.qiankunActions.onGlobalStateChange((nextState) => {
    state.user = nextState.user;
    state.theme = nextState.theme;
  }, true);
}

function updateGlobalState() {
  props.qiankunActions?.setGlobalState({
    user: "VueUser",
    theme: state.theme === "light" ? "dark" : "light",
    source: "vue3-app",
  });
}
</script>

<style scoped>
.vue-card {
  padding: 24px;
  border-radius: 14px;
  color: #064e3b;
  background: #d1fae5;
}

.vue-card h2 {
  margin-top: 0;
}

dl {
  display: grid;
  grid-template-columns: 150px 1fr;
  gap: 10px;
}

dt {
  font-weight: 700;
}

button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  color: white;
  background: #059669;
  cursor: pointer;
  font-weight: 700;
}
</style>
