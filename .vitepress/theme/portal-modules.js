/**
 * 站点级「大模块」入口（对齐 Agent portal.html）
 * 每个大模块彼此独立；模块内部页面仍在 pages/ 等目录维护。
 * 后续完善功能：改对应模块页即可，不必动门户结构。
 */
export const portalSystems = [
  {
    id: 'blog',
    variant: 'blog',
    tag: '内容与作品',
    title: '个人技术博客',
    desc: '简历、项目经验、技术栈、技能星图、嵌入式基础与生活记录；模块内页面独立维护。',
    link: '/pages/about',
    external: false,
    enabled: true,
    goText: '进入博客',
  },
  {
    id: 'agent',
    variant: 'agent',
    tag: '知识与 AI',
    title: 'Agent 助手',
    desc: '问答、故障分析、评审与知识库能力预留入口。当前为框架占位，后续接入实际 Agent。',
    link: '/pages/modules/agent',
    external: false,
    enabled: true,
    goText: '进入框架',
  },
  {
    id: 'work',
    variant: 'work',
    tag: '计划与日志',
    title: '工作计划',
    desc: '计划排期、每日记录、月度总结预留入口。当前为框架占位，后续接入实际工作台。',
    link: '/pages/modules/work',
    external: false,
    enabled: true,
    goText: '进入框架',
  },
]
