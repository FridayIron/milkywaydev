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
    id: 'riyue',
    variant: 'riyue',
    featured: false,
    tag: '日月AI',
    title: '日月AI',
    desc: '同域直达登录：/riyue/ → 邮箱 OTP / 运维密码 → HUD（私人助手）。',
    link: '/riyue/',
    // 反代路径须整页跳转，不能走 VitePress router
    hardNav: true,
    external: false,
    enabled: true,
    goText: '进入登录',
  },
  {
    id: 'work',
    variant: 'work',
    featured: false,
    tag: '计划',
    title: '工作计划',
    desc: '总览、待办、看板与甘特等界面已可预览，数据能力后续接入。',
    link: '/pages/modules/work',
    external: false,
    enabled: true,
    goText: '去看看',
  },
]
