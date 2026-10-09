/**
 * 博客内嵌演示用 API Mock（不连真实后端）
 * 保持与 Agent 前端 API 方法名兼容，返回可渲染的示例数据。
 */
(function () {
  /* super/developer 才能打开「账户与权限」（Auth.canManageUsers） */
  var DEMO_USER = {
    id: 1,
    username: 'demo',
    role: 'super',
    role_label: '超级管理员',
    permissions: ['all'],
    is_guest: false,
    kb_download: true,
    kb_delete: true
  };

  function today() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + day;
  }

  function ok(data) {
    return Promise.resolve(data);
  }

  var plans = [
    {
      id: 101, user_id: 1, task_key: 'P-0101', title: '门户三模块联调', status: 'in_progress', priority: 'p1',
      project: '个人博客', start_date: today(), end_date: today(),
      progress: 60, username: 'demo', assignee_id: 1, assignee_name: 'demo',
      overdue: false, checklist: { done: 1, total: 2 }, description: '联调门户与演示壳'
    },
    {
      id: 102, user_id: 1, task_key: 'P-0102', title: 'Agent 演示壳接入', status: 'done', priority: 'p2',
      project: '个人博客', start_date: today(), end_date: today(),
      progress: 100, username: 'demo', assignee_id: 1, assignee_name: 'demo',
      overdue: false, checklist: { done: 2, total: 2 }, description: ''
    },
    {
      id: 103, user_id: 1, task_key: 'P-0103', title: '工作计划数据层', status: 'planned', priority: 'p2',
      project: '个人博客', start_date: today(), end_date: today(),
      progress: 0, username: 'demo', assignee_id: 1, assignee_name: 'demo',
      overdue: false, checklist: { done: 0, total: 1 }, description: '后续接真实 API'
    }
  ];

  var docs = [
    { id: 1, title: 'CAN 通信排障手册', category: 'software', filename: 'can.md', chunk_count: 12, created_at: today() },
    { id: 2, title: '液位检测标定流程', category: 'hardware', filename: 'level.md', chunk_count: 8, created_at: today() },
    { id: 3, title: '测试报告模版示例', category: 'report', filename: 'report.md', chunk_count: 5, created_at: today() }
  ];

  var handlers = {
    me: function () { return ok(DEMO_USER); },
    logout: function () { return ok({ ok: true }); },
    myPassword: function () { return ok({ password: '******', hint: '演示模式不显示真实密码' }); },
    systemStatus: function () { return ok({ maintenance: false, message: '' }); },
    stats: function () {
      return ok({ documents: 128, fault_cases: 36, chat_count: 214, reviews: 19 });
    },
    listActivities: function () {
      return ok([
        { id: 1, title: '问答：STM32 中断优先级如何配置？', time: '今天 10:21' },
        { id: 2, title: '故障分析：液位检测偶发超时', time: '昨天 16:08' },
        { id: 3, title: '评审：样本臂时序需求草案', time: '前天 09:40' }
      ]);
    },
    deleteActivitiesBatch: function () { return ok({ count: 0, failed: [] }); },
    updateActivity: function () { return ok({ ok: true }); },
    deleteActivity: function () { return ok({ ok: true }); },
    unreadNotifications: function () { return ok({ unread: 0 }); },
    listNotifications: function () { return ok({ items: [] }); },
    listChatSessions: function () {
      return ok([
        { id: 11, title: 'CAN 通信排查', updated_at: today(), message_count: 4 },
        { id: 12, title: 'RTOS 任务优先级', updated_at: today(), message_count: 2 }
      ]);
    },
    createChatSession: function () { return ok({ id: 99, title: '新会话' }); },
    getChatMessages: function () {
      return ok({
        messages: [
          { id: 1, role: 'user', content: '帮我概括一下 CAN 通信排查思路？' },
          { id: 2, role: 'assistant', content: '（演示）可先确认波特率、终端电阻与帧过滤，再观察错误帧与总线负载。' }
        ]
      });
    },
    chat: function (payload) {
      var q = (payload && (payload.message || payload.query || payload.content)) || '';
      return ok({
        reply: '（演示模式）已收到：' + q + '\n\n后续将接入真实 Agent / RAG。',
        answer: '（演示模式）已收到：' + q,
        sources: []
      });
    },
    discardPendingChat: function () { return ok({ ok: true }); },
    deleteChatSession: function () { return ok({ ok: true }); },
    deleteChatSessions: function () { return ok({ count: 0 }); },
    listDocuments: function () { return ok(docs); },
    listKnowledgeCategories: function () {
      return ok({ items: (window.APP_CONFIG && window.APP_CONFIG.CATEGORIES) || [] });
    },
    listKbFolders: function () { return ok({ items: [] }); },
    previewDocument: function () {
      return ok({ title: '演示文档', content: '# 演示预览\n\n当前为界面演示，未连接知识库后端。' });
    },
    downloadDocument: function () { return ok({ ok: true }); },
    uploadDocument: function () { return ok({ id: 4, title: '上传演示' }); },
    deleteDocument: function () { return ok({ ok: true }); },
    deleteDocumentsBatch: function () { return ok({ count: 0, failed: [] }); },
    moveDocument: function () { return ok({ ok: true }); },
    createKbFolder: function () { return ok({ id: 1, name: '新文件夹' }); },
    deleteKbFolder: function () { return ok({ ok: true }); },
    protocolSyncStatus: function () { return ok({ enabled: false }); },
    listFaultCases: function () {
      return ok([
        { id: 1, title: '液位检测偶发超时', module: '液路', created_at: today() },
        { id: 2, title: '泵电机异响 E102', module: '运动控制', created_at: today() }
      ]);
    },
    getFaultCase: function () {
      return ok({
        id: 1, title: '液位检测偶发超时', module: '液路',
        phenomenon: '偶发超时告警', analysis: '（演示）建议检查探头与滤波参数。', created_at: today()
      });
    },
    analyzeFault: function () {
      return ok({
        summary: '演示分析结果',
        possible_causes: ['探头接触不良', '滤波阈值过紧', '供电波动'],
        suggestions: ['复现并抓日志', '对比标定参数', '检查线缆屏蔽'],
        answer: '（演示）故障分析示意：优先排查传感器链路与阈值配置。'
      });
    },
    deleteFaultCase: function () { return ok({ ok: true }); },
    saveFaultCase: function () { return ok({ id: 3 }); },
    listReviewHistory: function () {
      return ok([{ id: 1, title: '样本臂时序需求草案', created_at: today() }]);
    },
    getReviewHistory: function () {
      return ok({
        id: 1, title: '样本臂时序需求草案',
        result: '（演示）建议补充异常分支与超时策略。', created_at: today()
      });
    },
    reviewRequirement: function () {
      return ok({
        summary: '演示评审结论',
        risks: ['缺少超时处理', '未定义重试次数'],
        suggestions: ['补充状态机图', '明确异常码'],
        answer: '（演示）需求评审示意完成。'
      });
    },
    deleteReviewHistory: function () { return ok({ ok: true }); },
    saveReview: function () { return ok({ id: 2 }); },
    listReportTemplates: function () {
      return ok({ items: [{ id: 3, title: '测试报告模版示例' }] });
    },
    getReportTemplateContent: function () {
      return ok({ content: '# 测试报告模版（演示）\n\n## 概述\n## 过程\n## 结论\n' });
    },
    listReportHistory: function () { return ok([]); },
    getReportHistory: function () { return ok({ id: 1, content: '演示报告' }); },
    generateReport: function () {
      return ok({
        draft: '（演示）报告草稿正文……',
        missing: ['补充测试数据', '补充结论依据'],
        tips: ['可按模版章节继续完善']
      });
    },
    deleteReportHistory: function () { return ok({ ok: true }); },
    exportReport: function () { return ok({ ok: true }); },
    listUsers: function () {
      return ok([
        Object.assign({}, DEMO_USER, { status: '在线', tech_dir_id: null, tech_dir_name: '' }),
        {
          id: 2, username: 'guest', role: 'guest', role_label: '访客',
          permissions: [], status: '离线', tech_dir_id: null, tech_dir_name: ''
        },
        {
          id: 3, username: 'alice', role: 'user', role_label: '普通用户',
          permissions: ['software'], status: '离线', tech_dir_id: null, tech_dir_name: ''
        }
      ]);
    },
    getUser: function () { return ok(DEMO_USER); },
    updateUser: function () { return ok(DEMO_USER); },
    createUser: function () { return ok(DEMO_USER); },
    resetUserPassword: function () { return ok({ password: 'demo123' }); },
    deleteUser: function () { return ok({ ok: true }); },
    deleteUsersBatch: function () { return ok({ count: 0 }); },
    updateProfile: function () { return ok(DEMO_USER); },
    listStaffTechDirs: function () { return ok({ items: [] }); },
    devOverview: function () { return ok({ users: 2, documents: 128, sessions: 40 }); },
    devSystem: function () { return ok({ build: 'blog-demo', features: ['demo'] }); },
    devUsers: function () { return ok({ items: [DEMO_USER] }); },
    devUserDetail: function () { return ok({ user: DEMO_USER, stats: {} }); },
    devUserSessions: function () { return ok({ items: [] }); },
    devListBackups: function () { return ok({ items: [] }); },
    devGetMaintenance: function () { return ok({ enabled: false, message: '' }); },
    devSetMaintenance: function () { return ok({ ok: true }); },
    devGetLlmConfig: function () { return ok({ provider: 'demo', model: 'mock' }); },
    devLlmPresets: function () { return ok({ items: [] }); },
    devSaveLlmConfig: function () { return ok({ ok: true }); },
    devProbeLlm: function () { return ok({ ok: true, latency_ms: 12 }); },

    /* ===== 工作计划（字段形状对齐 work.js） ===== */
    workbenchMeta: function () {
      return ok({ is_manager: true, can_review: true });
    },
    workbenchUsers: function () { return ok({ items: [DEMO_USER] }); },
    workbenchOverview: function () {
      return ok({
        counts: { daily_logs: 12, weekly_summaries: 4, pending_review: 1 },
        dashboard: {
          active: 2,
          overdue: 0,
          total_plans: plans.length,
          project_count: 2,
          by_status: { planned: 1, in_progress: 1, done: 1, cancelled: 0 },
          by_priority: { p0: 0, p1: 1, p2: 2, p3: 0 }
        }
      });
    },
    workbenchFocus: function () {
      return ok({
        today_due: plans.filter(function (p) { return p.status !== 'done'; }),
        week_active: plans.filter(function (p) { return p.status === 'in_progress'; }),
        assigned_to_me: plans.filter(function (p) { return p.status !== 'done'; })
      });
    },
    workbenchPlans: function () { return ok({ items: plans.slice() }); },
    workbenchProjects: function () { return ok({ items: ['个人博客', '嵌入式工具'] }); },
    workbenchBoard: function () {
      return ok({
        planned: plans.filter(function (p) { return p.status === 'planned'; }),
        in_progress: plans.filter(function (p) { return p.status === 'in_progress'; }),
        done: plans.filter(function (p) { return p.status === 'done'; }),
        columns: {
          planned: plans.filter(function (p) { return p.status === 'planned'; }),
          in_progress: plans.filter(function (p) { return p.status === 'in_progress'; }),
          done: plans.filter(function (p) { return p.status === 'done'; })
        }
      });
    },
    workbenchDashboard: function () { return ok({ items: plans }); },
    workbenchCreatePlan: function (payload) {
      var p = Object.assign({
        id: Date.now(), task_key: 'P-' + String(Date.now()).slice(-4),
        status: 'planned', priority: 'p2', progress: 0, username: 'demo',
        start_date: today(), end_date: today(), overdue: false,
        checklist: { done: 0, total: 0 }
      }, payload || {});
      plans.unshift(p);
      return ok(p);
    },
    workbenchUpdatePlan: function (id, payload) {
      plans.forEach(function (p) {
        if (String(p.id) === String(id)) Object.assign(p, payload || {});
      });
      return ok({ ok: true });
    },
    workbenchDeletePlan: function (id) {
      for (var i = plans.length - 1; i >= 0; i--) {
        if (String(plans[i].id) === String(id)) plans.splice(i, 1);
      }
      return ok({ ok: true });
    },
    workbenchChecklist: function () {
      return ok({ items: [
        { id: 1, title: '写演示说明', done: true },
        { id: 2, title: '联调入口', done: false }
      ] });
    },
    workbenchAddChecklist: function (_pid, title) {
      return ok({ id: Date.now(), title: title || '新项', done: false });
    },
    workbenchUpdateChecklist: function () { return ok({ ok: true }); },
    workbenchDeleteChecklist: function () { return ok({ ok: true }); },
    workbenchComments: function () {
      return ok({ items: [{ id: 1, content: '演示评论', username: 'demo', created_at: today() }] });
    },
    workbenchAddComment: function () { return ok({ id: Date.now() }); },
    workbenchDeleteComment: function () { return ok({ ok: true }); },
    workbenchGantt: function () { return ok({ items: plans.slice() }); },
    workbenchDaily: function () {
      return ok({
        items: [{
          id: 1, log_date: today(), content: '完成 Agent / 工作计划演示壳接入',
          status: 'draft', username: 'demo'
        }]
      });
    },
    workbenchDailyTeam: function () { return ok({ items: [] }); },
    workbenchDailyMissing: function () { return ok({ items: [] }); },
    workbenchUpsertDaily: function () { return ok({ id: 1 }); },
    workbenchDailyStatus: function () { return ok({ ok: true }); },
    workbenchDeleteDaily: function () { return ok({ ok: true }); },
    workbenchWeekly: function () {
      return ok({
        items: [{
          id: 1, year_week: '2026-W41', progress: '门户模块化',
          risk: '后端未接入', next: '接 API', status: 'draft', username: 'demo'
        }]
      });
    },
    workbenchUpsertWeekly: function () { return ok({ id: 1 }); },
    workbenchWeeklyStatus: function () { return ok({ ok: true }); },
    workbenchDeleteWeekly: function () { return ok({ ok: true }); },
    workbenchMonthly: function () {
      return ok({
        items: [{
          id: 1, year_month: '2026-10', content: '完成三大模块骨架',
          status: 'draft', username: 'demo'
        }]
      });
    },
    workbenchUpsertMonthly: function () { return ok({ id: 1 }); },
    workbenchMonthlyStatus: function () { return ok({ ok: true }); },
    workbenchDeleteMonthly: function () { return ok({ ok: true }); },
    workbenchPending: function () { return ok({ items: [] }); },
    workbenchReview: function () { return ok({ ok: true }); },
    workbenchStyleProfile: function () {
      return ok({ writing_style: '简洁务实', notes: '演示画像', keywords: '嵌入式,联调' });
    },
    workbenchSaveStyleProfile: function () { return ok({ ok: true }); },
    workbenchHandoverPreview: function () {
      return ok({
        markdown: '# 交接沉淀（演示）\n\n- 博客 Pages 需 deploy 后再 push docs/\n- 模块边界：博客 / Agent / 工作计划相互独立\n',
        preview: '交接沉淀（演示）'
      });
    },
    workbenchHandoverPublish: function () { return ok({ ok: true, id: 1 }); }
  };

  window.API = new Proxy(handlers, {
    get: function (target, prop) {
      if (prop in target) return target[prop];
      return function () {
        console.info('[demo-api] stub:', prop);
        return ok({ ok: true, items: [], message: '演示模式占位：' + String(prop) });
      };
    }
  });

  window.__DEMO_USER__ = DEMO_USER;
})();
