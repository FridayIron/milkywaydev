/* 主壳路由：动态加载 pages/*.html */
window.Router = (function () {
  const PAGE_MAP = {
    dashboard: { file: 'pages/dashboard.html', title: '工作台', init: 'initDashboard' },
    chat: { file: 'pages/chat.html', title: 'AI 智能问答', init: 'initChat' },
    fault: { file: 'pages/fault.html', title: '故障 AI 分析', init: 'initFault' },
    review: { file: 'pages/review.html', title: '需求 AI 评审', init: 'initReview' },
    report: { file: 'pages/report.html', title: '报告编写', init: 'initReport' },
    knowledge: { file: 'pages/knowledge.html', title: '知识库管理', init: 'initKnowledge' },
    users: { file: 'pages/users.html', title: '账户与权限', init: 'initUsers' },
    'dev-map': { file: 'pages/dev-map.html', title: '功能总览', init: 'initDevMap' },
    dev: { file: 'pages/dev.html', title: '开发者后台', init: 'initDev' },
    'dev-user': { file: 'pages/dev-user.html', title: '账号详情', init: 'initDevUser' }
  };

  let current = null;
  const cache = {};

  async function loadPage(name) {
    const res = await fetch(PAGE_MAP[name].file + '?t=' + Date.now());
    if (!res.ok) throw new Error('无法加载页面: ' + name);
    return await res.text();
  }

  async function switchPage(name, liDom) {
    if (!PAGE_MAP[name]) return;

    function markActive() {
      document.querySelectorAll('.sidebar-menu li').forEach(function (item) {
        item.classList.remove('active');
      });
      if (liDom) liDom.classList.add('active');
      else {
        // 账号详情/功能总览高亮对应开发者菜单
        var pageKey = name;
        if (name === 'dev-user') pageKey = 'dev';
        var target = document.querySelector('.sidebar-menu li[data-page="' + pageKey + '"]');
        if (target) target.classList.add('active');
      }
    }

    // 游客：菜单可点，资料相关页显示无权提示
    if (window.Auth.isGuest()) {
      var guestBlocked = ['knowledge', 'fault', 'review', 'report', 'users', 'dev', 'dev-user', 'dev-map'];
      if (guestBlocked.indexOf(name) >= 0) {
        markActive();
        var tip =
          name === 'users' || name === 'dev' || name === 'dev-user' || name === 'dev-map'
            ? '该功能仅正式权限账号可使用。可在右上角切换回已登录的正式账号。'
            : '知识库、故障分析、需求评审、报告编写等资料功能需使用正式账号。可在右上角切换回已登录的正式账号。';
        document.getElementById('pageContainer').innerHTML =
          '<div class="no-permission"><div class="icon">🔒</div><h3>游客无权使用</h3><p>' + tip + '</p></div>';
        return;
      }
    }

    markActive();

    const container = document.getElementById('pageContainer');
    container.innerHTML = '<div class="loading-hint" style="padding:40px;">加载中…</div>';
    try {
      const html = await loadPage(name);
      container.innerHTML = html;
      current = name;
      const initName = PAGE_MAP[name].init;
      if (initName && typeof window[initName] === 'function') {
        window[initName]();
      }
    } catch (e) {
      container.innerHTML = '<div class="no-permission"><h3>页面加载失败</h3><p>' + e.message + '</p></div>';
    }
  }

  return { switchPage, PAGE_MAP };
})();
