import { defineConfig } from 'vitepress'
import { visitorApiUrl } from './visitor-api-url.js'

export default defineConfig({
  title: '王桥 | 嵌入式工程师技术博客',
  description: '工作经历 | 项目经验 | 技术积累 | 面试总结 | 个人创新',
  base: '/',  // milkywaydev.cn 根目录
  ignoreDeadLinks: true,  // 忽略 localhost 等构建时不可达链接
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/pages/blog/' },
      { text: '关于我', link: '/pages/about' },
      { text: '项目经验', link: '/pages/projects' },
      { text: '技术栈', link: '/pages/tech' },
      { text: '工具链', link: '/pages/tools' },
      { text: '面试总结', link: '/pages/interview' },
      {
        text: '技能星图',
        items: [
          { text: '技能雷达图', link: '/pages/skill' },
          {
            text: '个人项目与工具',
            items: [
              { text: '工具列表', link: '/pages/skill-tools' },
              { text: 'SVG 转换工具', link: '/pages/skill-tools-svg' },
            ],
          },
        ],
      },
      { text: '生活记录', link: '/pages/life' },
    ],
    sidebar: [
      { text: '首页', link: '/' },
      { text: '博客', link: '/pages/blog/' },
      { text: '关于我', link: '/pages/about' },
      { text: '项目经验', link: '/pages/projects' },
      { text: '技术栈', link: '/pages/tech' },
      { text: '工具链', link: '/pages/tools' },
      { text: '面试总结', link: '/pages/interview' },
      {
        text: '技能星图',
        items: [
          { text: '技能雷达图', link: '/pages/skill' },
          {
            text: '个人项目与工具',
            items: [
              { text: '工具列表', link: '/pages/skill-tools' },
              { text: 'SVG 转换工具', link: '/pages/skill-tools-svg' },
            ],
          },
        ],
      },
      { text: '生活记录', link: '/pages/life' },
    ],
    socialLinks: [],
  },
  vite: {
    define: {
      __VISITOR_API_URL__: JSON.stringify(process.env.VITE_VISITOR_API_URL || visitorApiUrl || '')
    },
    optimizeDeps: {
      include: ['echarts']
    }
  }
})
