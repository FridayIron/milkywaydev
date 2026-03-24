<script setup>
import { onMounted } from 'vue'

const API_URL = __VISITOR_API_URL__ || '' // 构建时替换

onMounted(() => {
  if (!API_URL || typeof navigator === 'undefined') return
  const data = {
    url: location.href,
    referrer: document.referrer || '',
    ua: navigator.userAgent,
    lang: navigator.language || '',
    screen: `${screen.width}x${screen.height}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
  }
  fetch(`${API_URL.replace(/\/$/, '')}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => {})
})
</script>

<template></template>
