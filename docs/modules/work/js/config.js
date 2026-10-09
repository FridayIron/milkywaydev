/* 后端与前端配置 —— 改地址只动这一处 */
window.APP_CONFIG = {
  API_BASE: window.location.port === '8000'
    ? ''
    : (window.location.protocol === 'file:'
      ? 'http://127.0.0.1:8000'
      : ''),
  APP_VERSION: 'v2.0.20260807',
  /** 知识库技术方向（总览主目录，顺序固定） */
  KB_TECH_DIRS: [
    'software', 'hardware', 'mech', 'system', 'transfer', 'aftersales', 'staff'
  ],
  CATEGORIES: [
    { id: 'default', label: '默认', tag: 'tag-gray' },
    { id: 'software', label: '软件', tag: 'tag-software' },
    { id: 'hardware', label: '硬件', tag: 'tag-hardware' },
    { id: 'mech', label: '机械', tag: 'tag-mech' },
    { id: 'system', label: '系统', tag: 'tag-optic' },
    { id: 'transfer', label: '设转', tag: 'tag-gray' },
    { id: 'aftersales', label: '售后', tag: 'tag-gray' },
    { id: 'staff', label: '人员知识资源', tag: 'tag-staff' },
    { id: 'fault', label: '故障案例库', tag: 'tag-error' },
    { id: 'report', label: '报告模版与案例', tag: 'tag-report' }
  ],
  ROLE_MAP: {
    developer: '开发者',
    super: '超级管理员',
    admin: '管理员',
    user: '普通用户',
    guest: '访客'
  }
};
