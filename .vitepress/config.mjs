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
    /*
     * VitePress getSidebarGroups：没有 items 的项会被塞进「匿名分组」变成二级。
     * 一级栏必须带 items（单页用 items: []），才能和「博客」同级同样式。
     */
    sidebar: [
      { text: '工作台（模块入口）', link: '/', items: [] },
      {
        text: '博客',
        link: '/pages/blog/',
        collapsed: false,
        items: [
          { text: '文章列表', link: '/pages/blog/' },
          {
            text: '软件版本管理',
            collapsed: false,
            items: [
              { text: 'GitLab 部署与配置指南', link: '/pages/blog/2026-10-14-内网GitLab-CE部署与配置指南' },
              { text: 'GitLab 部署操作命令手册', link: '/pages/blog/2026-10-14-GitLab本地部署操作命令手册' },
              { text: 'SVN → GitLab 迁移方案', link: '/pages/blog/2026-10-14-SVN到GitLab迁移方案' },
              { text: 'Git 日常开发与培训手册', link: '/pages/blog/2026-10-14-Git日常开发与培训手册' },
            ],
          },
          {
            text: '嵌入式驱动',
            collapsed: false,
            items: [
              { text: '面试手册目录', link: '/pages/blog/2026-10-20-嵌入式驱动面试手册' },
              { text: 'CAN 总线', link: '/pages/blog/2026-10-20-CAN总线' },
              { text: 'I2C 总线', link: '/pages/blog/2026-10-20-I2C总线' },
              { text: 'SPI 总线', link: '/pages/blog/2026-10-20-SPI总线' },
              { text: 'UART 串口', link: '/pages/blog/2026-10-20-UART串口' },
              { text: '网络 · TCP 与 UDP', link: '/pages/blog/2026-10-20-嵌入式网络TCP与UDP' },
              { text: '定时器', link: '/pages/blog/2026-10-20-定时器' },
              { text: 'PWM', link: '/pages/blog/2026-10-20-PWM' },
              { text: '内存、启动与链接', link: '/pages/blog/2026-10-20-内存启动与链接' },
              { text: 'DMA', link: '/pages/blog/2026-10-20-DMA' },
              { text: 'Cache 与 DMA', link: '/pages/blog/2026-10-20-Cache与DMA一致性' },
              { text: '中断与抢占', link: '/pages/blog/2026-10-20-中断与抢占' },
              { text: '手册前提与深水区', link: '/pages/blog/2026-10-21-手册前提与深水区' },
              { text: '中断优先级与 FreeRTOS', link: '/pages/blog/2026-10-21-中断优先级与FreeRTOS' },
              { text: 'ADC 驱动', link: '/pages/blog/2026-10-21-ADC驱动' },
              { text: 'USB 驱动', link: '/pages/blog/2026-10-21-USB驱动' },
              { text: 'RTOS 线程与多轴', link: '/pages/blog/2026-10-21-RTOS线程与多轴' },
              { text: '插补与速度规划', link: '/pages/blog/2026-10-21-插补与速度规划' },
            ],
          },
        ],
      },
      { text: '关于我', link: '/pages/about', items: [] },
      { text: '项目经验', link: '/pages/projects', items: [] },
      { text: '技术栈', link: '/pages/tech', items: [] },
      { text: '工具链', link: '/pages/tools', items: [] },
      { text: '嵌入式基础', link: '/pages/interview', items: [] },
      {
        text: '技能星图',
        link: '/pages/skill',
        collapsed: false,
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
      { text: '生活记录', link: '/pages/life', items: [] },
    ],
    socialLinks: [],
  },
  vite: {
    server: {
      watch: {
        // 开发服务不要盯着成品目录，否则 Windows 上 deploy 删除 docs 会 EPERM
        ignored: ['**/docs/**', '**/.vitepress/dist/**', '**/.vitepress/cache/**'],
      },
    },
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
