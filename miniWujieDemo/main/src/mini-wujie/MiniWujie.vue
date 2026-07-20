<!--
  MiniWujie.vue — mini-wujie 的 Vue 3 封装组件

  将自定义元素 <mini-wujie-app> 包装为 Vue 组件，方便在 Vue 应用中声明式使用。
  组件接收 name、url 和 props 三个属性，并透传给底层的自定义元素。

  使用示例：
    <MiniWujie name="react-app" url="http://localhost:5174" :props="{ userId: 1 }" />
-->
<script setup>
/**
 * 组件 Props 定义
 * - name: 子应用唯一标识（必填）
 * - url: 子应用的入口 HTML 地址（必填）
 * - props: 传递给子应用的初始数据（可选）
 */
const props = defineProps({
  name: { type: String, required: true },
  url: { type: String, required: true },
  props: { type: Object, default: () => ({}) },
})
</script>

<template>
  <!--
    直接渲染自定义元素 <mini-wujie-app>
    Vue 会将属性值绑定到元素的 attribute 和 property 上
    注意：:props="props.props" 将组件的 props 对象的 .props 属性传给自定义元素
  -->
  <mini-wujie-app :name="name" :url="url" :props="props.props" />
</template>
