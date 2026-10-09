<script setup>
defineProps({
  src: { type: String, required: true },
  title: { type: String, default: '模块演示' },
})
</script>

<template>
  <div class="module-demo-embed">
    <iframe class="module-demo-embed__frame" :src="src" :title="title" />
  </div>
</template>

<style scoped>
.module-demo-embed {
  position: fixed;
  inset: 0;
  z-index: 40;
  width: 100vw;
  height: 100vh;
  height: 100dvh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background: #f1f4f9;
}

.module-demo-embed__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: #f1f4f9;
}
</style>
