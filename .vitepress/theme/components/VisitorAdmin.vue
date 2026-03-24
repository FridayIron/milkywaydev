<script setup>
import { ref, onMounted } from 'vue'

const API_URL = __VISITOR_API_URL__ || ''
const key = ref('')
const entered = ref(false)
const visits = ref([])
const loading = ref(false)
const error = ref('')

async function load() {
  if (!key.value.trim()) return
  loading.value = true
  error.value = ''
  try {
    const res = await fetch(`${API_URL.replace(/\/$/, '')}/stats?key=${encodeURIComponent(key.value)}`)
    const data = await res.json()
    if (!res.ok) {
      error.value = data.error === 'unauthorized' ? '密钥错误' : (data.error || '请求失败')
      return
    }
    visits.value = data.visits || []
    entered.value = true
  } catch (e) {
    error.value = '网络错误，请检查 API 地址'
  } finally {
    loading.value = false
  }
}

function formatTime(ts) {
  return new Date(ts).toLocaleString('zh-CN')
}

function parseUA(ua) {
  const m = ua.match(/(Chrome|Firefox|Safari|Edge|MSIE|Opera)[\/\s][\d.]+/)
  return m ? m[0] : ua.slice(0, 50)
}
</script>

<template>
  <div class="visitor-admin">
    <template v-if="!entered">
      <div class="admin-form">
        <h3>访客统计 - 管理员入口</h3>
        <p class="hint">请输入管理员密钥查看访客记录</p>
        <input
          v-model="key"
          type="password"
          placeholder="管理员密钥"
          class="key-input"
          @keyup.enter="load"
        />
        <button class="btn" :disabled="loading" @click="load">
          {{ loading ? '验证中...' : '查看' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>
    </template>
    <template v-else>
      <div class="admin-header">
        <h3>访客记录 ({{ visits.length }} 条)</h3>
        <button class="btn small" @click="entered = false">退出</button>
      </div>
      <div class="visits-table-wrap">
        <table class="visits-table">
          <thead>
            <tr>
              <th>时间</th>
              <th>IP</th>
              <th>访问页面</th>
              <th>来源</th>
              <th>浏览器</th>
              <th>分辨率</th>
              <th>语言/时区</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(v, i) in visits" :key="i">
              <td>{{ formatTime(v.ts) }}</td>
              <td>{{ v.ip }}</td>
              <td class="url">{{ v.url || '-' }}</td>
              <td class="url">{{ v.ref || '-' }}</td>
              <td class="ua">{{ parseUA(v.ua) }}</td>
              <td>{{ v.screen || '-' }}</td>
              <td>{{ v.lang || '-' }} {{ v.tz ? ` | ${v.tz}` : '' }}</td>
            </tr>
          </tbody>
        </table>
        <p v-if="!visits.length" class="empty">暂无访客记录</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.visitor-admin {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}
.admin-form {
  max-width: 400px;
}
.admin-form h3,
.admin-header h3 {
  margin-top: 0;
}
.hint {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin: 0.5rem 0 1rem;
}
.key-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  font-size: 14px;
  margin-bottom: 12px;
  box-sizing: border-box;
}
.key-input:focus {
  outline: none;
  border-color: var(--vp-c-brand-1);
}
.btn {
  padding: 10px 24px;
  background: var(--vp-c-brand-1);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}
.btn:hover:not(:disabled) {
  opacity: 0.9;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn.small {
  padding: 6px 14px;
  font-size: 12px;
}
.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}
.error {
  color: var(--vp-c-red-1);
  font-size: 14px;
  margin-top: 12px;
}
.visits-table-wrap {
  overflow-x: auto;
}
.visits-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.visits-table th,
.visits-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}
.visits-table th {
  background: var(--vp-c-bg-soft);
  font-weight: 600;
  white-space: nowrap;
}
.visits-table .url {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.visits-table .ua {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.empty {
  text-align: center;
  color: var(--vp-c-text-2);
  padding: 2rem;
}
</style>
