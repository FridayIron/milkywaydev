import { defineConfig } from 'vitepress'
import { visitorApiUrl } from './visitor-api-url.js'

export default defineConfig({
  title: '王桥 | 嵌入式工程师技术博客',
  description: '工作经历 | 项目经验 | 技术积累 | 嵌入式基础小知识 | 个人创新',
  base: '/',  // milkywaydev.cn 根目录
  ignoreDeadLinks: true,  // 忽略 localhost 等构建时不可达链接
  // 关闭主题深浅色切换，避免 localStorage 与 SSR 不一致导致 Hydration mismatch
  appearance: false,
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    [
      'link',
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Noto+Sans+SC:wght@400;500;600;700&display=swap',
      },
    ],
  ],
  router: {
    prefetchLinks: true,
  },
  themeConfig: {
    nav: [
      { text: '工作台', link: '/' },
      { text: '博客', link: '/pages/blog/' },
      { text: '关于我', link: '/pages/about' },
      { text: '项目经验', link: '/pages/projects' },
      { text: '技术栈', link: '/pages/tech' },
      { text: '工具链', link: '/pages/tools' },
      { text: '嵌入式基础', link: '/pages/interview' },
      {
        text: '技能星图',
        items: [
          { text: '技能雷达图', link: '/pages/skill' },
          /* 单层下拉，避免嵌套菜单在部分 CDN/缓存下不更新或交互异常 */
          { text: '个人项目 · 工具列表', link: '/pages/skill-tools' },
          { text: '个人项目 · SVG 转换', link: '/pages/skill-tools-svg' },
          { text: '个人项目 · MCU 上下文切换', link: '/pages/skill-tools-mcu-core' },
          { text: '个人项目 · 步进电机图表版', link: '/pages/skill-tools-step-motor-view' },
          { text: '个人项目 · 步进电机高级版', link: '/pages/skill-tools-step-motor' },
          { text: '个人项目 · IVD Agent（本地）', link: 'http://127.0.0.1:8000/' },
        ],
      },
      { text: '生活记录', link: '/pages/life' },
    ],
    sidebar: [
      { text: '工作台（模块入口）', link: '/' },
      { text: '博客', link: '/pages/blog/' },
      { text: '关于我', link: '/pages/about' },
      { text: '项目经验', link: '/pages/projects' },
      { text: '技术栈', link: '/pages/tech' },
      { text: '工具链', link: '/pages/tools' },
      { text: '嵌入式基础', link: '/pages/interview' },
      {
        text: '技能星图',
        items: [
          { text: '技能雷达图', link: '/pages/skill' },
          /* 单层下拉，避免嵌套菜单在部分 CDN/缓存下不更新或交互异常 */
          { text: '个人项目 · 工具列表', link: '/pages/skill-tools' },
          { text: '个人项目 · SVG 转换', link: '/pages/skill-tools-svg' },
          { text: '个人项目 · MCU 上下文切换', link: '/pages/skill-tools-mcu-core' },
          { text: '个人项目 · 步进电机图表版', link: '/pages/skill-tools-step-motor-view' },
          { text: '个人项目 · 步进电机高级版', link: '/pages/skill-tools-step-motor' },
          { text: '个人项目 · IVD Agent（本地）', link: 'http://127.0.0.1:8000/' },
        ],
      },
      { text: '生活记录', link: '/pages/life' },
    ],
    socialLinks: [],
  },
  vite: {
    resolve: {
      // Windows 下盘符大小写差异可能导致 VitePress 渲染阶段找不到 page chunk
      preserveSymlinks: true,
    },
    define: {
      __VISITOR_API_URL__: JSON.stringify(process.env.VITE_VISITOR_API_URL || visitorApiUrl || '')
    },
    optimizeDeps: {
      include: ['echarts']
    }
  }
})
