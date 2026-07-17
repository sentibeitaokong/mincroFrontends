<script setup>
const props = defineProps({
  name: { type: String, required: true },
  url: { type: String, required: true },
  props: { type: Object, default: () => ({}) },
})
</script>

<template>
  <mini-wujie-app :name="name" :url="url" :props="props.props" />
</template>
