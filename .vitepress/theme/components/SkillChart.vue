<script setup>
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from 'vue'
import { useData } from 'vitepress'
import * as echarts from 'echarts'

// 默认配置（当 frontmatter 未定义时使用）
const DEFAULT_INDICATOR = [
  { name: 'C/C++', max: 10 },
  { name: 'STM32', max: 10 },
  { name: 'RTOS', max: 10 },
  { name: 'Linux驱动', max: 10 },
  { name: 'CAN/EtherCAT', max: 10 },
  { name: '机器人控制', max: 10 },
]
const DEFAULT_VALUE = [9, 9, 8, 6, 7, 5]

const { page } = useData()
const chartRef = ref(null)
let chartInstance = null

const chartOption = computed(() => {
  const frontmatter = page.value?.frontmatter || {}
  const indicator = frontmatter.indicator || DEFAULT_INDICATOR
  const value = frontmatter.skillValue || frontmatter.value || DEFAULT_VALUE
  const name = frontmatter.skillName || '我的技能'

  return {
    title: {
      text: frontmatter.skillTitle || '嵌入式技能雷达图',
      textStyle: { color: 'var(--vp-c-text-1, #1a1a2e)' }
    },
    color: ['#4dabf7', '#74c0fc', '#69db7c'],
    radar: {
      indicator,
      axisName: {
        color: 'var(--vp-c-text-1, #1a1a2e)',
        fontSize: 14
      },
      axisLine: { lineStyle: { color: 'rgba(77, 171, 247, 0.5)' } },
      splitLine: { lineStyle: { color: 'rgba(77, 171, 247, 0.35)' } },
      splitArea: { areaStyle: { color: ['rgba(77, 171, 247, 0.08)', 'rgba(77, 171, 247, 0.15)'] } }
    },
    series: [{
      type: 'radar',
      data: [{ value, name }],
      lineStyle: { color: '#4dabf7', width: 2 },
      areaStyle: { color: 'rgba(77, 171, 247, 0.4)' },
      itemStyle: { color: '#4dabf7' }
    }]
  }
})

function bindResize() {
  if (!chartInstance || typeof window === 'undefined') return
  chartInstance.resize()
}

onMounted(async () => {
  await nextTick()
  const el = chartRef.value
  if (!el || typeof window === 'undefined') return
  chartInstance = echarts.init(el)
  chartInstance.setOption(chartOption.value)
  window.addEventListener('resize', bindResize)
})

watch(chartOption, (opt) => {
  if (chartInstance && opt) {
    chartInstance.setOption(opt)
    nextTick(() => chartInstance?.resize())
  }
}, { deep: true })

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', bindResize)
  }
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div class="skill-chart-container" ref="chartRef" style="width:100%;height:450px;"></div>
</template>
