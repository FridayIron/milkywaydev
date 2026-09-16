/**
 * 站点级模块入口（个人博客门户）
 * 各模块彼此独立；文案保持个人站语气，避免产品发布口吻。
 */
export const portalSystems = [
  {
    id: 'blog',
    variant: 'blog',
    featured: true,
    tag: '博客',
    title: '技术博客',
    desc: '关于我、项目经历、技术栈、嵌入式笔记和生活记录。',
    link: '/pages/about',
    external: false,
    enabled: true,
    goText: '去看看',
  },
  {
    id: 'agent',
    variant: 'agent',
    featured: false,
    tag: '助手',
    title: 'Agent 助手',
    desc: '以后用来放问答和故障分析一类的能力，现在先占个位置。',
    link: '/pages/modules/agent',
    external: false,
    enabled: true,
    goText: '先逛逛',
  },
  {
    id: 'work',
    variant: 'work',
    featured: false,
    tag: '计划',
    title: '工作计划',
    desc: '排期和日志相关的小工作台，功能还在慢慢补。',
    link: '/pages/modules/work',
    external: false,
    enabled: true,
    goText: '先逛逛',
  },
]
