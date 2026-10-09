/* 个人工作计划前端 — 任务编辑 / 审核点评 / 甘特操作 / 钉钉式团队日报 */
window.WorkbenchApp = (function () {
  var state = {
    view: 'home',
    isManager: false,
    users: [],
    filterUserId: '',
    filterPriority: '',
    filterStatus: '',
    filterProject: '',
    filterAssignee: '',
    filterTechDir: '',
    searchQ: '',
    meta: null,
    expandPlanId: null,
    editPlanId: null,
    editPlanDraft: null,
    ganttEditId: null,
    ganttFrom: null,
    ganttTo: null,
    dailyTab: 'mine',
    dailyTeamDate: null,
    handoverUserId: '',
    planAssigneePicker: null,
    filterAssigneePicker: null,
    handoverPicker: null
  };

  var STATUS_LABEL = {
    planned: '待开始',
    in_progress: '进行中',
    done: '已完成',
    cancelled: '已取消',
    draft: '草稿',
    submitted: '已提交',
    reviewed: '已审核'
  };
  var PRIORITY_LABEL = { p0: '紧急', p1: '高', p2: '中', p3: '低' };
  var ACTION_LABEL = {
    comment: '评论',
    approve: '通过',
    reject: '驳回',
    request_changes: '退回修改'
  };
  var BOARD_COLS = [
    { key: 'planned', title: '待开始' },
    { key: 'in_progress', title: '进行中' },
    { key: 'done', title: '已完成' },
    { key: 'cancelled', title: '已取消' }
  ];
  var DAILY_SECTIONS = [
    { key: 'done', title: '今日完成', marker: '【今日完成】' },
    { key: 'risk', title: '问题与风险', marker: '【问题与风险】' },
    { key: 'next', title: '明日计划', marker: '【明日计划】' }
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function today() { return ymdLocal(new Date()); }

  function ymdLocal(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function thisMonth() { return today().slice(0, 7); }
  function defaultGanttRange() {
    var from = new Date();
    from.setHours(12, 0, 0, 0);
    from.setDate(1);
    from.setMonth(from.getMonth() - 1);
    var to = new Date();
    to.setHours(12, 0, 0, 0);
    to.setMonth(to.getMonth() + 2);
    to.setDate(0);
    return { from: ymdLocal(from), to: ymdLocal(to) };
  }
  function userParam() {
    return state.filterUserId ? Number(state.filterUserId) : undefined;
  }
  function isOwn(userId) {
    return String(userId) === String((Auth.getUser() || {}).id);
  }
  function canEditPlan(p) {
    if (!p) return false;
    var me = Auth.getUser() || {};
    if (String(p.user_id) === String(me.id)) return true;
    if (p.assignee_id != null && String(p.assignee_id) === String(me.id)) return true;
    return false;
  }
  function tagStatus(status) {
    return '<span class="wb-tag ' + esc(status) + '">' + esc(STATUS_LABEL[status] || status) + '</span>';
  }
  function tagPriority(p) {
    p = p || 'p2';
    return '<span class="wb-tag priority ' + esc(p) + '">' + esc(PRIORITY_LABEL[p] || p) + '</span>';
  }

  function packDailyContent(done, risk, next) {
    return DAILY_SECTIONS.map(function (s) {
      var val = s.key === 'done' ? done : (s.key === 'risk' ? risk : next);
      return s.marker + '\n' + String(val || '').trim();
    }).join('\n\n');
  }

  function parseDailyContent(content) {
    var text = String(content || '');
    var out = { done: '', risk: '', next: '', raw: text };
    var hasMarker = DAILY_SECTIONS.some(function (s) { return text.indexOf(s.marker) >= 0; });
    if (!hasMarker) {
      out.done = text;
      return out;
    }
    DAILY_SECTIONS.forEach(function (s, idx) {
      var start = text.indexOf(s.marker);
      if (start < 0) return;
      start += s.marker.length;
      var end = text.length;
      for (var j = idx + 1; j < DAILY_SECTIONS.length; j++) {
        var ni = text.indexOf(DAILY_SECTIONS[j].marker, start);
        if (ni >= 0) { end = ni; break; }
      }
      out[s.key] = text.slice(start, end).replace(/^\s+|\s+$/g, '');
    });
    return out;
  }

  function statusOptions(selected) {
    return BOARD_COLS.map(function (c) {
      return '<option value="' + c.key + '"' + (selected === c.key ? ' selected' : '') + '>' +
        esc(c.title) + '</option>';
    }).join('');
  }

  function priorityOptions(selected) {
    selected = selected || 'p2';
    return ['p0', 'p1', 'p2', 'p3'].map(function (k) {
      return '<option value="' + k + '"' + (selected === k ? ' selected' : '') + '>' +
        esc((PRIORITY_LABEL[k] || k) + ' ' + k.toUpperCase()) + '</option>';
    }).join('');
  }

  function usersForPicker(filterTechDir) {
    var list = state.users || [];
    if (!filterTechDir) return list;
    return list.filter(function (u) {
      return String(u.tech_dir_id || '') === String(filterTechDir);
    });
  }

  function techDirFilterOptions() {
    var seen = {};
    var opts = '<option value="">全部技术方向</option>';
    (state.users || []).forEach(function (u) {
      if (!u.tech_dir_id || seen[u.tech_dir_id]) return;
      seen[u.tech_dir_id] = true;
      opts += '<option value="' + u.tech_dir_id + '"' +
        (String(state.filterTechDir) === String(u.tech_dir_id) ? ' selected' : '') + '>' +
        esc(u.tech_dir_name || ('#' + u.tech_dir_id)) + '</option>';
    });
    return opts;
  }

  function mountAssigneePicker(boxId, value, disabled) {
    var box = document.getElementById(boxId);
    if (!box || !window.UserPicker) return null;
    return UserPicker.mount(box, {
      users: usersForPicker(state.filterTechDir),
      value: value,
      allowEmpty: true,
      emptyLabel: '不指派（仅本人）',
      placeholder: '搜索并选择指派…',
      disabled: !!disabled
    });
  }

  function isoWeek(d) {
    // ISO 8601 周编号：YYYY-Www
    var date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    var yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    var week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return date.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  }
  function thisWeek() { return isoWeek(new Date()); }

  async function boot() {
    if (!Auth.requireLogin()) return;
    if (Auth.isGuest && Auth.isGuest()) {
      alert('游客不可使用工作计划模块');
      if (window.parent && window.parent !== window) window.parent.location.href = '/';
      else location.href = '/';
      return;
    }
    var u = Auth.getUser() || {};
    document.getElementById('wbUserLabel').textContent =
      (u.username || '-') + ' · ' + (u.role_label || u.role || '');
    document.getElementById('btnWbLogout').onclick = async function () {
      try { await API.logout(); } catch (e) {}
      try { Auth.clearSession(); } catch (e2) {}
      if (window.parent && window.parent !== window) window.parent.location.href = '/';
      else location.href = '/';
    };
    try {
      state.meta = await API.workbenchMeta();
      state.isManager = !!state.meta.is_manager;
    } catch (e) {
      alert(e.message || '无法加载工作台');
      return;
    }
    if (state.isManager) document.getElementById('navReview').style.display = '';
    state.users = (await API.workbenchUsers()).items || [];
    state.dailyTeamDate = today();

    document.querySelectorAll('#wbNav button').forEach(function (btn) {
      btn.onclick = function () {
        document.querySelectorAll('#wbNav button').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        state.view = btn.getAttribute('data-view');
        state.expandPlanId = null;
        state.ganttEditId = null;
        render();
      };
    });
    render();
  }

  function filterBar(extraHtml, opts) {
    opts = opts || {};
    var showMembers = opts.forceMembers || state.isManager || (state.users && state.users.length > 1);
    var html = '<div class="wb-toolbar">';
    if (showMembers) {
      html += memberPickerHtml();
      html += '<div class="field"><label>技术方向</label><select id="wbFilterTechDir">' +
        techDirFilterOptions() + '</select></div>';
    }
    html += (extraHtml || '') + '</div>';
    return html;
  }

  function memberPickerLabel() {
    if (!state.filterUserId) return '团队全部';
    var hit = state.users.filter(function (u) {
      return String(u.id) === String(state.filterUserId);
    })[0];
    if (!hit) return '团队全部';
    return hit.tech_dir_name
      ? (hit.username + ' · ' + hit.tech_dir_name)
      : hit.username;
  }

  function memberPickerHtml() {
    return '<div class="field wb-member-field">' +
      '<label>成员</label>' +
      '<div class="wb-member-picker" id="wbMemberPicker">' +
      '<button type="button" class="wb-member-btn" id="wbMemberBtn">' +
      '<span id="wbMemberLabel">' + esc(memberPickerLabel()) + '</span>' +
      '<span class="wb-member-caret">▾</span></button>' +
      '<div class="wb-member-drop" id="wbMemberDrop" hidden>' +
      '<input type="search" id="wbMemberSearch" placeholder="搜索姓名或技术方向…" autocomplete="off">' +
      '<div class="wb-member-list" id="wbMemberList"></div>' +
      '</div></div></div>';
  }

  function fillMemberList(keyword) {
    var box = document.getElementById('wbMemberList');
    if (!box) return;
    var kw = String(keyword || '').trim().toLowerCase();
    var rows = [{ id: '', username: '团队全部' }].concat(state.users || []);
    if (state.filterTechDir) {
      rows = rows.filter(function (u) {
        return !u.id || String(u.tech_dir_id || '') === String(state.filterTechDir);
      });
    }
    if (kw) {
      rows = rows.filter(function (u) {
        if (!u.id) return String(u.username || '').toLowerCase().indexOf(kw) >= 0;
        var hay = ((u.username || '') + ' ' + (u.tech_dir_name || '')).toLowerCase();
        return hay.indexOf(kw) >= 0;
      });
    }
    box.innerHTML = rows.map(function (u) {
      var active = String(state.filterUserId || '') === String(u.id || '');
      var label = u.id && u.tech_dir_name
        ? (u.username + ' · ' + u.tech_dir_name)
        : u.username;
      return '<button type="button" class="wb-member-item' + (active ? ' active' : '') +
        '" data-staff="' + esc(u.id) + '">' + esc(label) + '</button>';
    }).join('') || '<div class="wb-muted" style="padding:8px 10px;">无匹配人员</div>';
    box.querySelectorAll('[data-staff]').forEach(function (btn) {
      btn.onclick = function () {
        state.filterUserId = btn.getAttribute('data-staff') || '';
        render();
      };
    });
  }

  function bindMemberPicker(root) {
    var picker = (root || document).querySelector('#wbMemberPicker');
    if (!picker) return;
    var btn = document.getElementById('wbMemberBtn');
    var drop = document.getElementById('wbMemberDrop');
    var search = document.getElementById('wbMemberSearch');
    fillMemberList('');
    btn.onclick = function (ev) {
      ev.stopPropagation();
      var open = drop.hasAttribute('hidden');
      if (open) {
        drop.removeAttribute('hidden');
        fillMemberList(search.value);
        search.focus();
      } else {
        drop.setAttribute('hidden', 'hidden');
      }
    };
    search.oninput = function () { fillMemberList(search.value); };
    search.onclick = function (ev) { ev.stopPropagation(); };
    drop.onclick = function (ev) { ev.stopPropagation(); };
    if (!window.__wbMemberPickerDocBound) {
      window.__wbMemberPickerDocBound = true;
      document.addEventListener('click', function () {
        var d = document.getElementById('wbMemberDrop');
        if (d) d.setAttribute('hidden', 'hidden');
      });
    }
  }

  function bindFilters() {
    bindMemberPicker(document);
    var sp = document.getElementById('wbFilterPriority');
    if (sp) sp.onchange = function () { state.filterPriority = sp.value; render(); };
    var ss = document.getElementById('wbFilterStatus');
    if (ss) ss.onchange = function () { state.filterStatus = ss.value; render(); };
    var sj = document.getElementById('wbFilterProject');
    if (sj) sj.onchange = function () { state.filterProject = sj.value; render(); };
    var std = document.getElementById('wbFilterTechDir');
    if (std) std.onchange = function () {
      state.filterTechDir = std.value || '';
      if (state.filterUserId) {
        var hit = (state.users || []).filter(function (u) {
          return String(u.id) === String(state.filterUserId);
        })[0];
        if (hit && state.filterTechDir &&
            String(hit.tech_dir_id || '') !== String(state.filterTechDir)) {
          state.filterUserId = '';
        }
      }
      render();
    };
  }

  async function render() {
    var el = document.getElementById('wbContent');
    el.innerHTML = '<div class="wb-empty">加载中…</div>';
    try {
      if (state.view === 'home') await renderHome(el);
      else if (state.view === 'focus') await renderFocus(el);
      else if (state.view === 'plans') await renderPlans(el);
      else if (state.view === 'board') await renderBoard(el);
      else if (state.view === 'daily') await renderDaily(el);
      else if (state.view === 'weekly') await renderWeekly(el);
      else if (state.view === 'monthly') await renderMonthly(el);
      else if (state.view === 'gantt') await renderGantt(el);
      else if (state.view === 'handover') await renderHandover(el);
      else if (state.view === 'review') await renderReview(el);
    } catch (e) {
      el.innerHTML = '<div class="wb-empty">' + esc(e.message || '加载失败') + '</div>';
    }
    bindFilters();
  }

  async function renderHome(el) {
    var ov = await API.workbenchOverview(userParam());
    var c = ov.counts || {};
    var d = ov.dashboard || {};
    var byS = d.by_status || {};
    var byP = d.by_priority || {};
    var focus = { today_due: 0, assigned: 0 };
    try {
      var f = await API.workbenchFocus();
      focus.today_due = (f.today_due || []).length;
      focus.assigned = (f.assigned_to_me || []).length;
    } catch (e) { /* ignore */ }
    el.innerHTML =
      '<div class="wb-panel-title"><h2>工作台总览</h2></div>' +
      '<p class="wb-hint">任务、看板、甘特与钉钉式团队日报协同；数据在独立库 <code>workbench.db</code>，不进知识库。</p>' +
      filterBar() +
      '<div class="wb-stats">' +
      '<div class="wb-stat"><div class="n">' + (d.active != null ? d.active : ((byS.planned || 0) + (byS.in_progress || 0))) + '</div><div class="l">进行中任务</div></div>' +
      '<div class="wb-stat warn"><div class="n">' + (d.overdue || 0) + '</div><div class="l">已逾期</div></div>' +
      '<div class="wb-stat"><div class="n">' + focus.today_due + '</div><div class="l">今日到期</div></div>' +
      '<div class="wb-stat"><div class="n">' + focus.assigned + '</div><div class="l">指派给我</div></div>' +
      '<div class="wb-stat"><div class="n">' + (c.daily_logs || 0) + '</div><div class="l">日报数</div></div>' +
      '<div class="wb-stat"><div class="n">' + (c.weekly_summaries || 0) + '</div><div class="l">周报数</div></div>' +
      '<div class="wb-stat"><div class="n">' + (c.pending_review || 0) + '</div><div class="l">待审提交</div></div>' +
      '</div>' +
      '<div class="wb-grid-2">' +
      '<div class="wb-card"><h3 class="wb-h3">状态分布</h3>' +
      '<div class="wb-bars">' +
      ['planned', 'in_progress', 'done', 'cancelled'].map(function (k) {
        var n = byS[k] || 0;
        var max = Math.max(1, d.total_plans || 1);
        return '<div class="wb-bar-row"><span>' + esc(STATUS_LABEL[k]) + '</span>' +
          '<div class="wb-bar-track"><i style="width:' + Math.round(100 * n / max) + '%"></i></div>' +
          '<b>' + n + '</b></div>';
      }).join('') +
      '</div></div>' +
      '<div class="wb-card"><h3 class="wb-h3">优先级</h3>' +
      '<div class="wb-prio-grid">' +
      ['p0', 'p1', 'p2', 'p3'].map(function (k) {
        return '<div class="wb-prio-chip ' + k + '"><strong>' + (byP[k] || 0) + '</strong><span>' +
          esc(PRIORITY_LABEL[k]) + '</span></div>';
      }).join('') +
      '</div><p class="wb-hint" style="margin-top:14px;">项目数：' + (d.project_count || 0) +
      ' · 计划总数：' + (d.total_plans || 0) + '</p></div></div>';
  }

  function planMetaLine(p) {
    var ck = p.checklist || {};
    return tagPriority(p.priority) + ' ' + tagStatus(p.status) +
      (p.overdue ? ' <span class="wb-tag overdue">逾期</span>' : '') +
      (p.project ? ' <span class="wb-tag project">' + esc(p.project) + '</span>' : '') +
      ' <span class="wb-muted">' + esc(p.progress) + '%' +
      (ck.total ? (' · 清单 ' + ck.done + '/' + ck.total) : '') + '</span>';
  }

  function planFormHtml(projects, draft) {
    var editing = !!(draft && draft.id);
    return '<form class="wb-form" id="formPlan">' +
      '<strong>' + (editing ? ('编辑任务 ' + (draft.task_key || ('#' + draft.id))) : '新建任务') + '</strong>' +
      (editing ? '<input type="hidden" name="id" value="' + draft.id + '">' : '') +
      '<label>标题</label><input name="title" required maxlength="200" value="' + esc(draft.title || '') +
      '" placeholder="例：IS-2110 装载扫码修复">' +
      '<label>说明</label><textarea name="description" placeholder="目标 / 验收要点">' +
      esc(draft.description || '') + '</textarea>' +
      '<div class="wb-form-row"><div><label>开始</label><input type="date" name="start_date" required value="' +
      esc(draft.start_date || today()) + '"></div>' +
      '<div><label>截止</label><input type="date" name="end_date" required value="' +
      esc(draft.end_date || today()) + '"></div></div>' +
      '<div class="wb-form-row"><div><label>优先级</label><select name="priority">' +
      priorityOptions(draft.priority) + '</select></div>' +
      '<div><label>状态</label><select name="status">' + statusOptions(draft.status || 'planned') +
      '</select></div></div>' +
      '<div class="wb-form-row"><div><label>负责人</label><input name="owner_readonly" readonly value="' +
      esc(draft.username || (Auth.getUser() || {}).username || '') +
      '" title="创建者即负责人"></div>' +
      '<div><label>指派给</label><div id="planAssigneePicker"></div></div></div>' +
      '<div class="wb-form-row"><div><label>项目/分组</label><input name="project" list="projList" value="' +
      esc(draft.project || '') + '" placeholder="例：系统单 / 指尖血"></div>' +
      '<div><label>进度%</label><input type="number" name="progress" min="0" max="100" value="' +
      esc(draft.progress != null ? draft.progress : 0) + '"></div></div>' +
      '<datalist id="projList">' + projects.map(function (p) {
        return '<option value="' + esc(p) + '">';
      }).join('') + '</datalist>' +
      '<label>标签（逗号分隔）</label><input name="tags" value="' + esc(draft.tags || '') +
      '" placeholder="硬件,联调,回归">' +
      '<div class="wb-form-actions">' +
      '<button class="wb-btn" type="submit">' + (editing ? '保存修改' : '创建任务') + '</button>' +
      (editing ? '<button class="wb-btn secondary" type="button" id="btnCancelEdit">取消编辑</button>' : '') +
      '</div></form>';
  }

  async function renderPlans(el) {
    var data = await API.workbenchPlans({
      user_id: userParam(),
      priority: state.filterPriority || undefined,
      status: state.filterStatus || undefined,
      project: state.filterProject || undefined,
      assignee_id: state.filterAssignee || undefined,
      q: state.searchQ || undefined
    });
    var projects = (await API.workbenchProjects(userParam())).items || [];
    var items = data.items || [];
    if (state.filterTechDir) {
      items = items.filter(function (p) {
        var owner = (state.users || []).filter(function (u) {
          return String(u.id) === String(p.user_id);
        })[0];
        var assignee = p.assignee_id != null
          ? (state.users || []).filter(function (u) {
            return String(u.id) === String(p.assignee_id);
          })[0]
          : null;
        var oid = owner && owner.tech_dir_id;
        var aid = assignee && assignee.tech_dir_id;
        return String(oid || '') === String(state.filterTechDir) ||
          String(aid || '') === String(state.filterTechDir);
      });
    }
    var projOpts = '<option value="">全部项目</option>' + projects.map(function (p) {
      return '<option value="' + esc(p) + '"' + (state.filterProject === p ? ' selected' : '') + '>' + esc(p) + '</option>';
    }).join('');

    if (state.editPlanId && !state.editPlanDraft) {
      var found = items.filter(function (p) { return String(p.id) === String(state.editPlanId); })[0];
      if (found && canEditPlan(found)) state.editPlanDraft = found;
      else { state.editPlanId = null; state.editPlanDraft = null; }
    }

    var rows = items.map(function (p) {
      var own = isOwn(p.user_id);
      var editable = canEditPlan(p);
      var editing = editable && String(state.editPlanId) === String(p.id);
      var ownerUser = (state.users || []).filter(function (u) {
        return String(u.id) === String(p.user_id);
      })[0];
      var ownerTech = ownerUser && ownerUser.tech_dir_name
        ? ' <span class="wb-tag">' + esc(ownerUser.tech_dir_name) + '</span>'
        : '';
      var assigneeTag = p.assignee_name
        ? ' <span class="wb-tag assignee">@' + esc(p.assignee_name) + '</span>'
        : '';
      return '<tr class="' + (p.overdue ? 'is-overdue' : '') + (editing ? ' is-editing' : '') + '">' +
        '<td><span class="wb-taskkey">' + esc(p.task_key || ('P-' + String(p.id).padStart(4, '0'))) + '</span>' +
        '<strong>' + esc(p.title) + '</strong>' +
        '<div class="wb-muted">' + esc(p.description || '') + '</div>' +
        (p.tags ? '<div class="wb-tags-line">' + esc(p.tags).split(/[,，]/).filter(Boolean).map(function (t) {
          return '<span class="wb-tag">' + esc(t.trim()) + '</span>';
        }).join(' ') + '</div>' : '') +
        '</td>' +
        '<td>' + esc(p.username || '') + ownerTech + assigneeTag + '</td>' +
        '<td>' + esc(p.start_date) + '<br>~ ' + esc(p.end_date) + '</td>' +
        '<td>' + planMetaLine(p) + '</td>' +
        '<td class="wb-actions-cell">' +
        (editable ? '<button type="button" class="wb-btn small" data-edit-plan="' + p.id + '">' +
          (editing ? '编辑中' : '编辑') + '</button> ' : '') +
        '<button type="button" class="wb-btn small" data-open-ck="' + p.id + '">清单/评论</button> ' +
        (own ? '<button type="button" class="wb-btn small secondary" data-del-plan="' + p.id + '">删除</button>' : '') +
        '</td></tr>' +
        (String(state.expandPlanId) === String(p.id)
          ? '<tr><td colspan="5"><div class="wb-check-panel" data-ck-panel="' + p.id + '">加载清单与评论…</div></td></tr>'
          : '');
    }).join('') || '<tr><td colspan="5" class="wb-empty">暂无计划，请在右侧新建</td></tr>';

    el.innerHTML =
      '<div class="wb-panel-title"><h2>任务列表</h2></div>' +
      filterBar(
        '<div class="field"><label>搜索</label><input type="search" id="wbSearchQ" value="' +
        esc(state.searchQ || '') + '" placeholder="标题/说明/编号/标签"></div>' +
        '<div class="field"><label>优先级</label><select id="wbFilterPriority">' +
        '<option value="">全部</option><option value="p0">紧急</option><option value="p1">高</option>' +
        '<option value="p2">中</option><option value="p3">低</option></select></div>' +
        '<div class="field"><label>状态</label><select id="wbFilterStatus">' +
        '<option value="">全部</option><option value="planned">待开始</option><option value="in_progress">进行中</option>' +
        '<option value="done">已完成</option><option value="cancelled">已取消</option></select></div>' +
        '<div class="field"><label>项目</label><select id="wbFilterProject">' + projOpts + '</select></div>' +
        '<div class="field"><label>指派</label><div id="wbFilterAssigneePicker" style="min-width:180px;"></div></div>'
      ) +
      '<div class="wb-grid-2">' +
      '<div class="wb-card"><table class="wb-table"><thead><tr>' +
      '<th>任务</th><th>负责人 / 指派</th><th>周期</th><th>优先级/状态</th><th></th></tr></thead><tbody>' +
      rows + '</tbody></table></div>' +
      '<div class="wb-card">' + planFormHtml(projects, state.editPlanDraft || {}) + '</div></div>';

    var fp = document.getElementById('wbFilterPriority');
    var fs = document.getElementById('wbFilterStatus');
    var fj = document.getElementById('wbFilterProject');
    var sq = document.getElementById('wbSearchQ');
    if (fp) fp.value = state.filterPriority || '';
    if (fs) fs.value = state.filterStatus || '';
    if (fj) fj.value = state.filterProject || '';
    var faBox = document.getElementById('wbFilterAssigneePicker');
    if (faBox && window.UserPicker) {
      state.filterAssigneePicker = UserPicker.mount(faBox, {
        users: usersForPicker(state.filterTechDir),
        value: state.filterAssignee || '',
        allowEmpty: true,
        emptyLabel: '全部指派',
        placeholder: '搜索指派人…',
        onChange: function (v) {
          state.filterAssignee = v == null ? '' : String(v);
          render();
        }
      });
    }
    if (sq) {
      sq.oninput = function () {
        state.searchQ = sq.value || '';
        clearTimeout(window.__wbSearchTimer);
        window.__wbSearchTimer = setTimeout(render, 280);
      };
      sq.onkeydown = function (ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); clearTimeout(window.__wbSearchTimer); render(); }
      };
    }

    var draft = state.editPlanDraft || {};
    state.planAssigneePicker = mountAssigneePicker(
      'planAssigneePicker',
      draft.assignee_id,
      !!(draft.id && !isOwn(draft.user_id))
    );

    document.getElementById('formPlan').onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = new FormData(ev.target);
      var assigneeVal = state.planAssigneePicker
        ? state.planAssigneePicker.getValue()
        : null;
      var payload = {
        title: fd.get('title'),
        description: fd.get('description'),
        start_date: fd.get('start_date'),
        end_date: fd.get('end_date'),
        status: fd.get('status'),
        progress: Number(fd.get('progress') || 0),
        priority: fd.get('priority'),
        project: fd.get('project'),
        tags: fd.get('tags'),
        assignee_id: assigneeVal
      };
      try {
        var id = fd.get('id');
        if (id) await API.workbenchUpdatePlan(id, payload);
        else await API.workbenchCreatePlan(payload);
        state.editPlanId = null;
        state.editPlanDraft = null;
        render();
      } catch (e) { alert(e.message || '保存失败'); }
    };
    var cancelBtn = document.getElementById('btnCancelEdit');
    if (cancelBtn) {
      cancelBtn.onclick = function () {
        state.editPlanId = null;
        state.editPlanDraft = null;
        render();
      };
    }
    el.querySelectorAll('[data-edit-plan]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-edit-plan');
        var plan = items.filter(function (p) { return String(p.id) === String(id); })[0];
        if (!plan || !canEditPlan(plan)) return;
        state.editPlanId = id;
        state.editPlanDraft = plan;
        render();
      };
    });
    el.querySelectorAll('[data-del-plan]').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('确认删除该任务？')) return;
        try {
          await API.workbenchDeletePlan(btn.getAttribute('data-del-plan'));
          if (String(state.editPlanId) === String(btn.getAttribute('data-del-plan'))) {
            state.editPlanId = null;
            state.editPlanDraft = null;
          }
          render();
        } catch (e) { alert(e.message || '删除失败'); }
      };
    });
    el.querySelectorAll('[data-open-ck]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-open-ck');
        state.expandPlanId = String(state.expandPlanId) === String(id) ? null : id;
        render();
      };
    });
    if (state.expandPlanId) loadChecklistPanel(state.expandPlanId);
  }

  async function loadChecklistPanel(planId) {
    var box = document.querySelector('[data-ck-panel="' + planId + '"]');
    if (!box) return;
    try {
      var data = await API.workbenchChecklist(planId);
      var items = data.items || [];
      var comments = [];
      try { comments = (await API.workbenchComments(planId)).items || []; } catch (ce) { comments = []; }
      var me = Auth.getUser() || {};
      box.innerHTML = '<div class="wb-check-head"><strong>子任务清单</strong>' +
        '<span class="wb-muted">勾选后自动刷新进度</span></div>' +
        '<ul class="wb-check-list">' +
        items.map(function (it) {
          return '<li><label><input type="checkbox" data-ck-toggle="' + it.id + '"' +
            (it.done ? ' checked' : '') + '> ' + esc(it.title) + '</label>' +
            '<button type="button" class="wb-linkish" data-ck-del="' + it.id + '">删</button></li>';
        }).join('') + '</ul>' +
        '<form class="wb-form wb-check-add" data-ck-add="' + planId + '">' +
        '<input name="title" placeholder="新增子任务，回车保存" required>' +
        '<button class="wb-btn small" type="submit">添加</button></form>' +
        '<div class="wb-comments">' +
        '<div class="wb-check-head"><strong>任务讨论</strong>' +
        '<span class="wb-muted">' + comments.length + ' 条</span></div>' +
        '<ul class="wb-comment-list">' +
        (comments.map(function (c) {
          var mine = String(c.user_id) === String(me.id);
          return '<li><div class="wb-comment-meta"><strong>' + esc(c.username || '') +
            '</strong> · ' + esc(c.created_at) +
            (mine || state.isManager
              ? ' <button type="button" class="wb-linkish" data-cmt-del="' + c.id + '">删</button>'
              : '') +
            '</div><pre class="wb-pre wb-comment-body">' + esc(c.content) + '</pre></li>';
        }).join('') || '<li class="wb-muted">暂无讨论</li>') +
        '</ul>' +
        '<form class="wb-form wb-comment-add" data-cmt-add="' + planId + '">' +
        '<textarea name="content" rows="2" placeholder="参与讨论（回车 Ctrl+Enter 发送）" required></textarea>' +
        '<button class="wb-btn small" type="submit">发表</button></form>' +
        '</div>';

      box.querySelectorAll('[data-ck-toggle]').forEach(function (cb) {
        cb.onchange = async function () {
          try {
            await API.workbenchUpdateChecklist(cb.getAttribute('data-ck-toggle'), { done: cb.checked });
            render();
          } catch (e) { alert(e.message || '更新失败'); }
        };
      });
      box.querySelectorAll('[data-ck-del]').forEach(function (btn) {
        btn.onclick = async function () {
          try { await API.workbenchDeleteChecklist(btn.getAttribute('data-ck-del')); loadChecklistPanel(planId); }
          catch (e) { alert(e.message || '删除失败'); }
        };
      });
      var form = box.querySelector('[data-ck-add]');
      form.onsubmit = async function (ev) {
        ev.preventDefault();
        var title = new FormData(form).get('title');
        try {
          await API.workbenchAddChecklist(planId, title);
          loadChecklistPanel(planId);
        } catch (e) { alert(e.message || '添加失败'); }
      };
      box.querySelectorAll('[data-cmt-del]').forEach(function (btn) {
        btn.onclick = async function () {
          if (!confirm('删除该评论？')) return;
          try { await API.workbenchDeleteComment(btn.getAttribute('data-cmt-del')); loadChecklistPanel(planId); }
          catch (e) { alert(e.message || '删除失败'); }
        };
      });
      var cform = box.querySelector('[data-cmt-add]');
      if (cform) {
        cform.onsubmit = async function (ev) {
          ev.preventDefault();
          var ta = cform.querySelector('[name="content"]');
          var content = (ta.value || '').trim();
          if (!content) return;
          try {
            await API.workbenchAddComment(planId, content);
            loadChecklistPanel(planId);
          } catch (e) { alert(e.message || '发表失败'); }
        };
        var ta = cform.querySelector('[name="content"]');
        if (ta) {
          ta.onkeydown = function (ev) {
            if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) {
              ev.preventDefault();
              cform.requestSubmit();
            }
          };
        }
      }
    } catch (e) {
      box.innerHTML = '<div class="wb-empty">' + esc(e.message || '加载失败') + '</div>';
    }
  }

  async function renderBoard(el) {
    var data = await API.workbenchBoard(userParam());
    var cols = data.columns || {};
    var html = '<div class="wb-panel-title"><h2>看板</h2></div>' +
      '<p class="wb-hint">一键「移至」改状态；本人负责或指派给自己的任务可直接流转。</p>' +
      filterBar() +
      '<div class="wb-board">';
    BOARD_COLS.forEach(function (col) {
      var list = cols[col.key] || [];
      html += '<div class="wb-board-col" data-col="' + col.key + '">' +
        '<div class="wb-board-col-head"><strong>' + esc(col.title) + '</strong><span>' + list.length + '</span></div>' +
        '<div class="wb-board-cards">';
      list.forEach(function (p) {
        html += '<div class="wb-board-card' + (p.overdue ? ' is-overdue' : '') + '">' +
          '<div class="wb-board-card-title">' + esc(p.title) + '</div>' +
          '<div class="wb-board-card-meta">' + tagPriority(p.priority) +
          (p.project ? ' <span class="wb-tag project">' + esc(p.project) + '</span>' : '') +
          (p.overdue ? ' <span class="wb-tag overdue">逾期</span>' : '') + '</div>' +
          '<div class="wb-muted">' + esc(p.username || '') + ' · ' + esc(p.end_date) +
          ' · ' + esc(p.progress) + '%</div>';
        if (canEditPlan(p)) {
          html += '<div class="wb-board-moves">';
          BOARD_COLS.forEach(function (c2) {
            if (c2.key === p.status) return;
            html += '<button type="button" class="wb-btn small ghost" data-move="' + p.id + ':' + c2.key + '">' +
              esc(c2.title) + '</button>';
          });
          html += '</div>';
        }
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
    el.innerHTML = html;
    el.querySelectorAll('[data-move]').forEach(function (btn) {
      btn.onclick = async function () {
        var parts = btn.getAttribute('data-move').split(':');
        try {
          await API.workbenchUpdatePlan(parts[0], { status: parts[1] });
          render();
        } catch (e) { alert(e.message || '更新失败'); }
      };
    });
  }

  function reviewPanelHtml(item, type, opts) {
    opts = opts || {};
    var reviews = item.reviews || [];
    var list = reviews.map(function (r) {
      return '<div class="review-item"><span class="meta">' + esc(r.reviewer_username) + ' · ' +
        esc(ACTION_LABEL[r.action] || r.action) + ' · ' + esc(r.created_at) + '</span>' +
        (r.comment ? '<div class="review-comment">' + esc(r.comment) + '</div>' : '') + '</div>';
    }).join('') || '<div class="review-item meta">暂无点评</div>';

    var mgr = '';
    var canReview = state.isManager && !isOwn(item.user_id) && opts.allowManager !== false;
    if (canReview) {
      mgr =
        '<div class="review-ops">' +
        '<div class="review-ops-title">管理者点评</div>' +
        '<textarea class="review-comment-input" data-rv-input="' + type + ':' + item.id +
        '" rows="3" placeholder="写点评意见（钉钉式内联评论）…"></textarea>' +
        '<div class="wb-form-actions">' +
        '<button type="button" class="wb-btn small" data-rv="' + type + ':' + item.id + ':approve">通过</button>' +
        '<button type="button" class="wb-btn small warn" data-rv="' + type + ':' + item.id +
        ':request_changes">退回修改</button>' +
        '<button type="button" class="wb-btn small secondary" data-rv="' + type + ':' + item.id +
        ':comment">仅评论</button>' +
        '</div></div>';
    }
    return '<div class="review-box">' +
      '<div class="review-list-title">审核记录</div>' + list + mgr + '</div>';
  }

  function bindReviewButtons(root) {
    root.querySelectorAll('[data-rv]').forEach(function (btn) {
      btn.onclick = async function () {
        var parts = btn.getAttribute('data-rv').split(':');
        var input = root.querySelector('[data-rv-input="' + parts[0] + ':' + parts[1] + '"]');
        var comment = input ? String(input.value || '').trim() : '';
        if (parts[2] === 'comment' && !comment) {
          alert('请先填写评论内容');
          if (input) input.focus();
          return;
        }
        try {
          await API.workbenchReview({
            target_type: parts[0],
            target_id: Number(parts[1]),
            action: parts[2],
            comment: comment
          });
          render();
        } catch (e) { alert(e.message || '操作失败'); }
      };
    });
  }

  function dailyCardHtml(d, showOwnerActions) {
    var parsed = parseDailyContent(d.content);
    var body = '';
    if (parsed.done || parsed.risk || parsed.next) {
      body = '<div class="daily-sections">' +
        DAILY_SECTIONS.map(function (s) {
          var val = parsed[s.key];
          if (!val) return '';
          return '<div class="daily-sec"><div class="daily-sec-title">' + esc(s.title) +
            '</div><pre class="wb-pre">' + esc(val) + '</pre></div>';
        }).join('') + '</div>';
    } else {
      body = '<pre class="wb-pre">' + esc(d.content) + '</pre>';
    }
    return '<div class="wb-card daily-card">' +
      '<div class="daily-card-head">' +
      '<div><strong>' + esc(d.username || '') + '</strong> · ' + esc(d.log_date) + '</div>' +
      tagStatus(d.status) + '</div>' + body + reviewPanelHtml(d, 'daily') +
      (showOwnerActions && isOwn(d.user_id)
        ? '<div class="wb-form-actions" style="margin-top:8px;">' +
          (d.status === 'draft' ? '<button type="button" class="wb-btn small" data-sub-daily="' + d.id +
            '">提交审核</button>' : '') +
          (d.status !== 'reviewed'
            ? '<button type="button" class="wb-btn small" data-load-daily="' + d.id + '">载入编辑</button>'
            : '') +
          '<button type="button" class="wb-btn small secondary" data-del-daily="' + d.id + '">删除</button></div>'
        : '') + '</div>';
  }

  async function renderDaily(el) {
    var day = state.dailyTeamDate || today();
    var mineData = await API.workbenchDaily({ user_id: userParam() });
    var mineItems = mineData.items || [];
    var teamData = await API.workbenchDailyTeam(day);
    var teamItems = teamData.items || [];
    var missingHtml = '';
    if (state.isManager) {
      try {
        var miss = await API.workbenchDailyMissing(day);
        missingHtml =
          '<div class="wb-card daily-missing">' +
          '<div class="daily-missing-head"><strong>今日提交进度</strong>' +
          '<span>' + (miss.submitted_count || 0) + ' / ' + (miss.total || 0) + ' 已提交</span></div>' +
          '<div class="daily-missing-cols">' +
          '<div><div class="wb-muted">未交</div>' +
          ((miss.missing || []).map(function (u) {
            return '<span class="wb-tag overdue">' + esc(u.username) + '</span>';
          }).join(' ') || '<span class="wb-muted">无</span>') +
          '</div><div><div class="wb-muted">仅草稿</div>' +
          ((miss.draft_only || []).map(function (u) {
            return '<span class="wb-tag submitted">' + esc(u.username) + '</span>';
          }).join(' ') || '<span class="wb-muted">无</span>') +
          '</div></div></div>';
      } catch (e) {
        missingHtml = '';
      }
    }

    var tabs =
      '<div class="wb-tabs">' +
      '<button type="button" class="wb-tab' + (state.dailyTab === 'mine' ? ' active' : '') +
      '" data-daily-tab="mine">我的日报</button>' +
      '<button type="button" class="wb-tab' + (state.dailyTab === 'team' ? ' active' : '') +
      '" data-daily-tab="team">团队动态</button></div>';

    var form =
      '<div class="wb-card"><form class="wb-form" id="formDaily">' +
      '<strong>写日报（钉钉模板）</strong>' +
      '<label>日期</label><input type="date" name="log_date" required value="' + today() + '" id="dailyFormDate">' +
      '<label>今日完成</label><textarea name="done" rows="4" placeholder="完成了哪些事项…"></textarea>' +
      '<label>问题与风险</label><textarea name="risk" rows="3" placeholder="阻塞、风险、需协调…"></textarea>' +
      '<label>明日计划</label><textarea name="next" rows="3" placeholder="明天优先做什么…"></textarea>' +
      '<div class="wb-form-actions">' +
      '<button class="wb-btn secondary" type="submit" data-as="draft">存草稿</button>' +
      '<button class="wb-btn" type="submit" data-as="submitted">保存并提交</button></div></form></div>';

    var left = '';
    if (state.dailyTab === 'team') {
      left =
        '<div class="wb-toolbar"><div class="field"><label>查看日期</label>' +
        '<input type="date" id="dailyTeamDate" value="' + esc(day) + '"></div></div>' +
        missingHtml +
        '<div class="daily-feed">' +
        (teamItems.map(function (d) { return dailyCardHtml(d, false); }).join('') ||
          '<div class="wb-empty">该日暂无已提交日报</div>') +
        '</div>';
    } else {
      left =
        '<div class="daily-feed">' +
        (mineItems.map(function (d) { return dailyCardHtml(d, true); }).join('') ||
          '<div class="wb-empty">暂无日报，请在右侧填写</div>') +
        '</div>';
    }

    el.innerHTML =
      '<div class="wb-panel-title"><h2>每日记录</h2></div>' +
      '<p class="wb-hint">参考钉钉日报：结构化模板、团队动态、管理者内联点评；管理者可看未交名单。</p>' +
      (state.dailyTab === 'mine' ? filterBar() : '') +
      tabs +
      '<div class="wb-grid-2"><div>' + left + '</div>' + form + '</div>';

    el.querySelectorAll('[data-daily-tab]').forEach(function (btn) {
      btn.onclick = function () {
        state.dailyTab = btn.getAttribute('data-daily-tab');
        render();
      };
    });
    var dateInput = document.getElementById('dailyTeamDate');
    if (dateInput) {
      dateInput.onchange = function () {
        state.dailyTeamDate = dateInput.value || today();
        render();
      };
    }

    var formEl = document.getElementById('formDaily');
    formEl.querySelectorAll('button[type="submit"]').forEach(function (b) {
      b.onclick = function () { formEl.setAttribute('data-status', b.getAttribute('data-as')); };
    });
    formEl.onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = new FormData(formEl);
      var content = packDailyContent(fd.get('done'), fd.get('risk'), fd.get('next'));
      if (!String(fd.get('done') || '').trim() && !String(fd.get('risk') || '').trim() &&
          !String(fd.get('next') || '').trim()) {
        alert('请至少填写一项内容');
        return;
      }
      try {
        await API.workbenchUpsertDaily({
          log_date: fd.get('log_date'),
          content: content,
          status: formEl.getAttribute('data-status') || 'draft'
        });
        state.dailyTab = 'mine';
        render();
      } catch (e) { alert(e.message || '保存失败'); }
    };

    el.querySelectorAll('[data-load-daily]').forEach(function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute('data-load-daily');
        var d = mineItems.filter(function (x) { return String(x.id) === String(id); })[0];
        if (!d) return;
        var parsed = parseDailyContent(d.content);
        formEl.log_date.value = d.log_date;
        formEl.done.value = parsed.done || '';
        formEl.risk.value = parsed.risk || '';
        formEl.next.value = parsed.next || '';
        formEl.done.focus();
        window.scrollTo({ top: formEl.offsetTop - 80, behavior: 'smooth' });
      };
    });
    el.querySelectorAll('[data-sub-daily]').forEach(function (btn) {
      btn.onclick = async function () {
        try { await API.workbenchDailyStatus(btn.getAttribute('data-sub-daily'), 'submitted'); render(); }
        catch (e) { alert(e.message || '提交失败'); }
      };
    });
    el.querySelectorAll('[data-del-daily]').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('删除该日报？')) return;
        try { await API.workbenchDeleteDaily(btn.getAttribute('data-del-daily')); render(); }
        catch (e) { alert(e.message || '删除失败'); }
      };
    });
    bindReviewButtons(el);
  }

  async function renderMonthly(el) {
    var data = await API.workbenchMonthly({ user_id: userParam() });
    var items = data.items || [];
    var cards = items.map(function (m) {
      return '<div class="wb-card" style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<strong>' + esc(m.year_month) + '</strong>' + tagStatus(m.status) +
        '<span class="wb-muted">' + esc(m.username || '') + '</span></div>' +
        '<pre class="wb-pre">' + esc(m.content) + '</pre>' + reviewPanelHtml(m, 'monthly') +
        (isOwn(m.user_id)
          ? '<div class="wb-form-actions" style="margin-top:8px;">' +
            (m.status === 'draft' ? '<button type="button" class="wb-btn small" data-sub-m="' + m.id +
              '">提交审核</button>' : '') +
            '<button type="button" class="wb-btn small secondary" data-del-m="' + m.id + '">删除</button></div>'
          : '') + '</div>';
    }).join('') || '<div class="wb-empty">暂无月报</div>';

    el.innerHTML =
      '<div class="wb-panel-title"><h2>月度总结</h2></div>' +
      filterBar() +
      '<div class="wb-grid-2"><div>' + cards + '</div>' +
      '<div class="wb-card"><form class="wb-form" id="formMonthly">' +
      '<strong>写月报</strong>' +
      '<label>月份</label><input type="month" name="year_month" required value="' + thisMonth() + '">' +
      '<label>内容</label><textarea name="content" required placeholder="目标达成 / 风险 / 下月重点"></textarea>' +
      '<div class="wb-form-actions">' +
      '<button class="wb-btn secondary" type="submit" data-as="draft">存草稿</button>' +
      '<button class="wb-btn" type="submit" data-as="submitted">保存并提交</button></div></form></div></div>';

    var form = document.getElementById('formMonthly');
    form.querySelectorAll('button[type="submit"]').forEach(function (b) {
      b.onclick = function () { form.setAttribute('data-status', b.getAttribute('data-as')); };
    });
    form.onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      try {
        await API.workbenchUpsertMonthly({
          year_month: fd.get('year_month'), content: fd.get('content'),
          status: form.getAttribute('data-status') || 'draft'
        });
        render();
      } catch (e) { alert(e.message || '保存失败'); }
    };
    el.querySelectorAll('[data-sub-m]').forEach(function (btn) {
      btn.onclick = async function () {
        try { await API.workbenchMonthlyStatus(btn.getAttribute('data-sub-m'), 'submitted'); render(); }
        catch (e) { alert(e.message || '提交失败'); }
      };
    });
    el.querySelectorAll('[data-del-m]').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('删除该月报？')) return;
        try { await API.workbenchDeleteMonthly(btn.getAttribute('data-del-m')); render(); }
        catch (e) { alert(e.message || '删除失败'); }
      };
    });
    bindReviewButtons(el);
  }

  async function renderFocus(el) {
    var data = await API.workbenchFocus();
    function planCard(p) {
      return '<div class="wb-card' + (p.overdue ? ' is-overdue' : '') + '" style="margin-bottom:8px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<strong>' + esc(p.task_key || ('P-' + String(p.id).padStart(4, '0'))) + ' · ' + esc(p.title) + '</strong>' +
        planMetaLine(p) + '</div>' +
        '<div class="wb-muted">' + esc(p.username || '') +
        (p.assignee_name ? ' · @' + esc(p.assignee_name) : '') +
        ' · ' + esc(p.start_date) + ' ~ ' + esc(p.end_date) + ' · ' + esc(p.progress) + '%</div>' +
        '<div class="wb-form-actions" style="margin-top:6px;">' +
        (canEditPlan(p)
          ? '<button type="button" class="wb-btn small" data-focus-edit="' + p.id + '">去编辑</button>' +
            '<button type="button" class="wb-btn small ghost" data-focus-status="' + p.id + ':in_progress">开始</button>' +
            '<button type="button" class="wb-btn small ghost" data-focus-status="' + p.id + ':done">完成</button>'
          : '<span class="wb-muted">仅查看</span>') +
        '</div></div>';
    }
    function block(title, list, emptyHint) {
      return '<div class="wb-card" style="margin-bottom:12px;"><h3 class="wb-h3">' + esc(title) +
        ' <span class="wb-muted">(' + list.length + ')</span></h3>' +
        (list.length ? list.map(planCard).join('') :
          '<div class="wb-empty">' + esc(emptyHint) + '</div>') + '</div>';
    }
    el.innerHTML =
      '<div class="wb-panel-title"><h2>我的待办 / 聚焦</h2></div>' +
      '<p class="wb-hint">聚合「今日到期、本周进行中、指派给我」三类；对标 Linear「My issues / This week」。点「去编辑」跳转任务列表并展开编辑。</p>' +
      block('今日到期', data.today_due || [], '今日无到期任务，安心推进') +
      block('本周进行中', data.week_active || [], '本周窗口内无进行中任务') +
      block('指派给我且未完成', data.assigned_to_me || [], '没有被指派给你的待办');
    el.querySelectorAll('[data-focus-edit]').forEach(function (btn) {
      btn.onclick = function () {
        state.view = 'plans';
        state.editPlanId = btn.getAttribute('data-focus-edit');
        state.editPlanDraft = null;
        document.querySelectorAll('#wbNav button').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-view') === 'plans');
        });
        render();
      };
    });
    el.querySelectorAll('[data-focus-status]').forEach(function (btn) {
      btn.onclick = async function () {
        var parts = btn.getAttribute('data-focus-status').split(':');
        var payload = { status: parts[1] };
        if (parts[1] === 'done') payload.progress = 100;
        try { await API.workbenchUpdatePlan(parts[0], payload); render(); }
        catch (e) { alert(e.message || '更新失败'); }
      };
    });
  }

  async function renderWeekly(el) {
    var data = await API.workbenchWeekly({ user_id: userParam() });
    var items = data.items || [];
    var cards = items.map(function (w) {
      return '<div class="wb-card" style="margin-bottom:10px;">' +
        '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">' +
        '<strong>' + esc(w.year_week) + '</strong>' + tagStatus(w.status) +
        '<span class="wb-muted">' + esc(w.username || '') + '</span></div>' +
        '<pre class="wb-pre">' + esc(w.content) + '</pre>' + reviewPanelHtml(w, 'weekly') +
        (isOwn(w.user_id)
          ? '<div class="wb-form-actions" style="margin-top:8px;">' +
            (w.status === 'draft' ? '<button type="button" class="wb-btn small" data-sub-w="' + w.id +
              '">提交审核</button>' : '') +
            '<button type="button" class="wb-btn small secondary" data-del-w="' + w.id + '">删除</button></div>'
          : '') + '</div>';
    }).join('') || '<div class="wb-empty">暂无周报</div>';

    el.innerHTML =
      '<div class="wb-panel-title"><h2>周报</h2></div>' +
      '<p class="wb-hint">介于日报与月报之间，研发团队最常用周期；草稿→提交→管理者审核，与日报/月报一致。</p>' +
      filterBar() +
      '<div class="wb-grid-2"><div>' + cards + '</div>' +
      '<div class="wb-card"><form class="wb-form" id="formWeekly">' +
      '<strong>写周报</strong>' +
      '<label>周（ISO 周编号，如 2026-W32）</label><input name="year_week" required value="' + thisWeek() +
      '" placeholder="2026-W32" pattern="\\d{4}-W\\d{2}">' +
      '<label>内容</label><textarea name="content" required placeholder="本周进展 / 风险 / 下周重点"></textarea>' +
      '<div class="wb-form-actions">' +
      '<button class="wb-btn secondary" type="submit" data-as="draft">存草稿</button>' +
      '<button class="wb-btn" type="submit" data-as="submitted">保存并提交</button></div></form></div></div>';

    var form = document.getElementById('formWeekly');
    form.querySelectorAll('button[type="submit"]').forEach(function (b) {
      b.onclick = function () { form.setAttribute('data-status', b.getAttribute('data-as')); };
    });
    form.onsubmit = async function (ev) {
      ev.preventDefault();
      var fd = new FormData(form);
      try {
        await API.workbenchUpsertWeekly({
          year_week: fd.get('year_week'), content: fd.get('content'),
          status: form.getAttribute('data-status') || 'draft'
        });
        render();
      } catch (e) { alert(e.message || '保存失败'); }
    };
    el.querySelectorAll('[data-sub-w]').forEach(function (btn) {
      btn.onclick = async function () {
        try { await API.workbenchWeeklyStatus(btn.getAttribute('data-sub-w'), 'submitted'); render(); }
        catch (e) { alert(e.message || '提交失败'); }
      };
    });
    el.querySelectorAll('[data-del-w]').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('删除该周报？')) return;
        try { await API.workbenchDeleteWeekly(btn.getAttribute('data-del-w')); render(); }
        catch (e) { alert(e.message || '删除失败'); }
      };
    });
    bindReviewButtons(el);
  }

  function parseYmd(s) {
    var p = String(s).split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2], 12, 0, 0, 0);
  }

  function daysBetween(a, b) {
    var a0 = new Date(a.getFullYear(), a.getMonth(), a.getDate(), 12, 0, 0, 0);
    var b0 = new Date(b.getFullYear(), b.getMonth(), b.getDate(), 12, 0, 0, 0);
    return Math.round((b0.getTime() - a0.getTime()) / 86400000);
  }

  function addDays(d, n) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    x.setDate(x.getDate() + n);
    return x;
  }

  function buildGanttAxis(fromStr, toStr) {
    var from = parseYmd(fromStr);
    var to = parseYmd(toStr);
    if (to < from) { var t = from; from = to; to = t; }
    var totalDays = Math.max(1, daysBetween(from, to) + 1);
    var dayPx = 44;
    if (totalDays <= 10) dayPx = 68;
    else if (totalDays <= 21) dayPx = 56;
    else if (totalDays <= 45) dayPx = 48;
    else if (totalDays <= 75) dayPx = 40;
    else dayPx = 34;

    // getDay(): 0=周日 … 6=周六，与当日日期严格对应
    var WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    var days = [];
    for (var i = 0; i < totalDays; i++) {
      var d = addDays(from, i);
      var wd = d.getDay();
      days.push({
        index: i,
        date: d,
        ymd: ymdLocal(d),
        label: (d.getMonth() + 1) + '/' + d.getDate(),
        weekLabel: WEEK[wd],
        month: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'),
        weekday: wd,
        leftPx: i * dayPx,
        widthPx: dayPx
      });
    }
    var todayStr = ymdLocal(new Date());
    var todayLeft = null;
    if (todayStr >= ymdLocal(from) && todayStr <= ymdLocal(to)) {
      todayLeft = daysBetween(from, parseYmd(todayStr)) * dayPx + dayPx / 2;
    }
    return {
      from: from,
      to: to,
      totalDays: totalDays,
      dayPx: dayPx,
      trackWidth: totalDays * dayPx,
      days: days,
      todayLeft: todayLeft
    };
  }

  function ganttBarGeom(axis, startStr, endStr) {
    var s = parseYmd(startStr);
    var e = parseYmd(endStr);
    if (e < s) { var t = s; s = e; e = t; }
    var clipS = s < axis.from ? axis.from : s;
    var clipE = e > axis.to ? axis.to : e;
    if (clipE < axis.from || clipS > axis.to) {
      return null;
    }
    var startOff = Math.max(0, daysBetween(axis.from, clipS));
    var dur = Math.max(1, daysBetween(clipS, clipE) + 1);
    var pad = dur === 1 ? Math.max(6, Math.round(axis.dayPx * 0.12)) : 3;
    return {
      leftPx: startOff * axis.dayPx + pad,
      widthPx: Math.max(dur === 1 ? 28 : 16, dur * axis.dayPx - pad * 2),
      days: dur,
      oneDay: dur === 1
    };
  }

  function ganttAxisHtml(axis) {
    var months = [];
    var lastM = '';
    axis.days.forEach(function (d) {
      if (d.month !== lastM) {
        months.push({ month: d.month, leftPx: d.leftPx });
        lastM = d.month;
      }
    });
    var monthRow = months.map(function (m, idx) {
      var next = months[idx + 1];
      var w = next ? (next.leftPx - m.leftPx) : (axis.trackWidth - m.leftPx);
      return '<div class="gantt-axis-month" style="left:' + m.leftPx + 'px;width:' + w + 'px;">' +
        esc(m.month) + '</div>';
    }).join('');

    // 日期与星期同一格子，避免两行绝对定位错位
    var dayCells = axis.days.map(function (d) {
      var weekend = d.weekday === 0 || d.weekday === 6 ? ' weekend' : '';
      return '<div class="gantt-axis-cell' + weekend + '" style="left:' + d.leftPx +
        'px;width:' + d.widthPx + 'px;" title="' + esc(d.ymd + ' ' + d.weekLabel) + '">' +
        '<span class="gantt-axis-date">' + esc(d.label) + '</span>' +
        '<span class="gantt-axis-week">' + esc(d.weekLabel) + '</span></div>';
    }).join('');

    var grid = axis.days.map(function (d) {
      var weekend = d.weekday === 0 || d.weekday === 6 ? ' weekend' : '';
      return '<i class="gantt-grid-col' + weekend + '" style="left:' + d.leftPx +
        'px;width:' + axis.dayPx + 'px"></i>';
    }).join('');
    var todayLine = axis.todayLeft != null
      ? '<i class="gantt-today" style="left:' + axis.todayLeft + 'px" title="今天"></i>'
      : '';
    return {
      header:
        '<div class="gantt-axis" style="width:' + axis.trackWidth + 'px;">' +
        '<div class="gantt-axis-months">' + monthRow + '</div>' +
        '<div class="gantt-axis-cells">' + dayCells + '</div></div>',
      grid: grid + todayLine,
      trackWidth: axis.trackWidth
    };
  }

  function ganttEditorHtml(b) {
    if (!canEditPlan(b)) {
      return '<div class="gantt-editor"><span class="wb-muted">仅负责人或被指派人可改任务；可切换到任务列表查看详情。</span></div>';
    }
    return '<div class="gantt-editor" data-gantt-form="' + b.id + '">' +
      '<div class="wb-form-row">' +
      '<div><label>开始</label><input type="date" name="start_date" value="' + esc(b.start_date) + '"></div>' +
      '<div><label>截止</label><input type="date" name="end_date" value="' + esc(b.end_date) + '"></div></div>' +
      '<div class="wb-form-row">' +
      '<div><label>状态</label><select name="status">' + statusOptions(b.status) + '</select></div>' +
      '<div><label>进度%</label><input type="number" name="progress" min="0" max="100" value="' +
      esc(b.progress) + '"></div></div>' +
      '<div class="wb-form-actions">' +
      '<button type="button" class="wb-btn small" data-gantt-save="' + b.id + '">保存</button> ' +
      BOARD_COLS.map(function (c) {
        if (c.key === b.status) return '';
        return '<button type="button" class="wb-btn small ghost" data-gantt-status="' + b.id + ':' + c.key +
          '">' + esc(c.title) + '</button>';
      }).join('') +
      '<button type="button" class="wb-btn small secondary" data-gantt-close="' + b.id + '">收起</button>' +
      '</div></div>';
  }

  async function renderGantt(el) {
    if (!state.ganttFrom || !state.ganttTo) {
      var def = defaultGanttRange();
      state.ganttFrom = def.from;
      state.ganttTo = def.to;
    }
    var from = state.ganttFrom;
    var to = state.ganttTo;
    var axis = buildGanttAxis(from, to);
    var axisUi = ganttAxisHtml(axis);
    var data = await API.workbenchGantt({
      user_id: userParam(), date_from: from, date_to: to
    });
    var items = data.items || [];
    var tw = axisUi.trackWidth;
    var labelW = 210;
    var canvasW = labelW + tw;

    var rows = items.map(function (b) {
      var geom = ganttBarGeom(axis, b.start_date, b.end_date);
      if (!geom) return '';
      var prog = Math.max(0, Math.min(100, Number(b.progress) || 0));
      if (b.status === 'done') prog = 100;
      var open = String(state.ganttEditId) === String(b.id);
      var barText = geom.oneDay
        ? (prog >= 100 ? '✓' : (prog + '%'))
        : (prog + '% · ' + geom.days + '天');
      return '<div class="gantt-block' + (open ? ' is-open' : '') + '">' +
        '<div class="gantt-line">' +
        '<div class="gantt-label" style="width:' + labelW + 'px;">' +
        '<strong>' + esc(b.title) + '</strong>' +
        '<span>' + esc(b.username) + ' · ' + esc(b.start_date) + ' ~ ' + esc(b.end_date) +
        '（' + geom.days + '天）</span>' +
        '<span>' + esc(PRIORITY_LABEL[b.priority] || b.priority) +
        (b.overdue ? ' · 逾期' : '') + ' · 进度 ' + prog + '%</span>' +
        '<div class="gantt-quick">' +
        '<button type="button" class="wb-btn small" data-gantt-open="' + b.id + '">' +
        (open ? '收起' : '操作') + '</button>' +
        (canEditPlan(b)
          ? ' <button type="button" class="wb-btn small ghost" data-gantt-status="' + b.id +
            ':in_progress">进行中</button>' +
            ' <button type="button" class="wb-btn small ghost" data-gantt-status="' + b.id +
            ':done">完成</button>'
          : '') +
        '</div></div>' +
        '<div class="gantt-track" style="width:' + tw + 'px;">' + axisUi.grid +
        '<div class="gantt-bar ' + esc(b.status) + (b.overdue ? ' overdue-bar' : '') +
        (geom.oneDay ? ' is-oneday' : '') +
        (canEditPlan(b) ? ' is-clickable' : '') +
        '" data-gantt-open="' + b.id + '" style="left:' + geom.leftPx + 'px;width:' + geom.widthPx +
        'px;" title="' + esc(b.start_date + ' ~ ' + b.end_date + ' · ' + geom.days + '天 · 进度 ' + prog + '%') + '">' +
        '<i class="gantt-bar-fill" style="width:' + prog + '%"></i>' +
        '<span class="gantt-bar-text">' + esc(barText) + '</span></div></div>' +
        '</div>' +
        (open ? ganttEditorHtml(b) : '') +
        '</div>';
    }).join('') || '<div class="wb-empty">当前时间窗口无计划条，请调整起止日期或成员</div>';

    el.innerHTML =
      '<div class="wb-panel-title"><h2>甘特 / 时间线</h2></div>' +
      '<p class="wb-hint">横坐标：月份 + 日期/星期（同列对齐）。底部<strong>一条</strong>横向滚动条；成员可搜索筛选。</p>' +
      filterBar(
        '<div class="field"><label>从</label><input type="date" id="ganttFrom" value="' + esc(from) + '"></div>' +
        '<div class="field"><label>到</label><input type="date" id="ganttTo" value="' + esc(to) + '"></div>',
        { forceMembers: true }
      ) +
      '<div class="gantt-wrap"><div class="gantt-scroll">' +
      '<div class="gantt-canvas" style="width:' + canvasW + 'px;">' +
      '<div class="gantt-head gantt-line">' +
      '<div class="gantt-label gantt-label-head" style="width:' + labelW + 'px;">任务 / 负责人</div>' +
      '<div class="gantt-track gantt-track-head" style="width:' + tw + 'px;">' + axisUi.header + '</div>' +
      '</div>' + rows +
      '</div></div></div>';

    var gf = document.getElementById('ganttFrom');
    var gt = document.getElementById('ganttTo');
    function applyRange() {
      if (!gf || !gt) return;
      state.ganttFrom = gf.value || from;
      state.ganttTo = gt.value || to;
      if (state.ganttFrom > state.ganttTo) {
        var swap = state.ganttFrom;
        state.ganttFrom = state.ganttTo;
        state.ganttTo = swap;
      }
      render();
    }
    if (gf) gf.onchange = applyRange;
    if (gt) gt.onchange = applyRange;

    el.querySelectorAll('[data-gantt-open]').forEach(function (btn) {
      btn.onclick = function (ev) {
        ev.stopPropagation();
        var id = btn.getAttribute('data-gantt-open');
        state.ganttEditId = String(state.ganttEditId) === String(id) ? null : id;
        render();
      };
    });
    el.querySelectorAll('[data-gantt-close]').forEach(function (btn) {
      btn.onclick = function () { state.ganttEditId = null; render(); };
    });
    el.querySelectorAll('[data-gantt-status]').forEach(function (btn) {
      btn.onclick = async function (ev) {
        ev.stopPropagation();
        var parts = btn.getAttribute('data-gantt-status').split(':');
        var payload = { status: parts[1] };
        if (parts[1] === 'done') payload.progress = 100;
        try {
          await API.workbenchUpdatePlan(parts[0], payload);
          state.ganttEditId = parts[0];
          render();
        } catch (e) { alert(e.message || '更新失败'); }
      };
    });
    el.querySelectorAll('[data-gantt-save]').forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute('data-gantt-save');
        var box = el.querySelector('[data-gantt-form="' + id + '"]');
        if (!box) return;
        var st = box.querySelector('[name="status"]').value;
        var prog = Number(box.querySelector('[name="progress"]').value || 0);
        if (st === 'done') prog = 100;
        try {
          await API.workbenchUpdatePlan(id, {
            start_date: box.querySelector('[name="start_date"]').value,
            end_date: box.querySelector('[name="end_date"]').value,
            status: st,
            progress: prog
          });
          state.ganttEditId = id;
          render();
        } catch (e) { alert(e.message || '保存失败'); }
      };
    });
  }

  async function renderHandover(el) {
    var targetId = state.handoverUserId
      ? Number(state.handoverUserId)
      : (Auth.getUser() || {}).id;

    var profile = await API.workbenchStyleProfile(targetId);
    var pack = await API.workbenchHandoverPreview({
      user_id: targetId, daily_limit: 30, monthly_limit: 12
    });
    var st = pack.stats || {};
    var targetUser = (state.users || []).filter(function (u) {
      return String(u.id) === String(targetId);
    })[0];

    el.innerHTML =
      '<div class="wb-panel-title"><h2>交接沉淀</h2></div>' +
      '<p class="wb-hint">维护风格画像 → 预览交接包 → 管理者审核入库到知识库「人员知识资源」。离职后可在 Agent 问答中按人名检索。</p>' +
      '<div class="wb-toolbar"><div class="field" style="min-width:260px;"><label>人员</label>' +
      '<div id="handoverUserPicker"></div></div>' +
      (targetUser && targetUser.tech_dir_name
        ? '<div class="field"><label>技术方向</label><div class="wb-muted" style="padding-top:8px;">' +
          esc(targetUser.tech_dir_name) + '</div></div>'
        : '') +
      '</div>' +
      '<div class="wb-grid-2">' +
      '<div class="wb-card"><form class="wb-form" id="formStyle">' +
      '<strong>风格画像</strong>' +
      (profile.can_edit ? '' : '<p class="wb-muted">只读（仅本人或管理者可改）</p>') +
      '<label>技术方向 / 负责域</label>' +
      '<textarea name="tech_focus" rows="3" ' + (profile.can_edit ? '' : 'readonly ') +
      'placeholder="例：下位机驱动、装载扫码、指尖血联调…">' + esc(profile.tech_focus || '') + '</textarea>' +
      '<label>工作风格与习惯</label>' +
      '<textarea name="work_style" rows="3" ' + (profile.can_edit ? '' : 'readonly ') +
      'placeholder="例：先复现再改、偏好写接口说明…">' + esc(profile.work_style || '') + '</textarea>' +
      '<label>文档与沟通习惯</label>' +
      '<textarea name="doc_habits" rows="3" ' + (profile.can_edit ? '' : 'readonly ') +
      'placeholder="例：Markdown、关键群同步结论…">' + esc(profile.doc_habits || '') + '</textarea>' +
      '<label>领域备注 / 易踩坑</label>' +
      '<textarea name="domain_notes" rows="3" ' + (profile.can_edit ? '' : 'readonly ') +
      'placeholder="例：ACK 超时需查中位周期日志…">' + esc(profile.domain_notes || '') + '</textarea>' +
      (profile.can_edit
        ? '<div class="wb-form-actions"><button class="wb-btn" type="submit">保存画像</button></div>'
        : '') +
      '</form></div>' +
      '<div class="wb-card">' +
      '<strong>交接包预览</strong>' +
      '<p class="wb-muted" style="margin:8px 0;">计划 ' + (st.plans || 0) +
      '（进行中 ' + (st.active_plans || 0) + '）· 日报 ' + (st.daily || 0) +
      ' · 周报 ' + (st.weekly || 0) +
      ' · 月报 ' + (st.monthly || 0) +
      (st.has_profile ? ' · 已填画像' : ' · 画像未填') + '</p>' +
      '<pre class="wb-pre handover-preview">' + esc(pack.content || '') + '</pre>' +
      '<div class="wb-form-actions">' +
      (state.isManager
        ? '<button type="button" class="wb-btn" id="btnPublishHandover">审核并入库知识库</button>'
        : '<span class="wb-muted">入库需管理者操作</span>') +
      '<a class="wb-btn secondary" href="app.html#knowledge" style="text-decoration:none;">打开知识库</a>' +
      '</div></div></div>';

    var huBox = document.getElementById('handoverUserPicker');
    if (huBox && window.UserPicker) {
      state.handoverPicker = UserPicker.mount(huBox, {
        users: state.users || [],
        value: targetId,
        allowEmpty: false,
        placeholder: '搜索并选择人员…',
        onChange: function (v) {
          state.handoverUserId = v == null ? '' : String(v);
          render();
        }
      });
    }
    var form = document.getElementById('formStyle');
    if (form && profile.can_edit) {
      form.onsubmit = async function (ev) {
        ev.preventDefault();
        var fd = new FormData(form);
        try {
          await API.workbenchSaveStyleProfile({
            user_id: targetId,
            tech_focus: fd.get('tech_focus'),
            work_style: fd.get('work_style'),
            doc_habits: fd.get('doc_habits'),
            domain_notes: fd.get('domain_notes')
          });
          render();
        } catch (e) { alert(e.message || '保存失败'); }
      };
    }
    var pub = document.getElementById('btnPublishHandover');
    if (pub) {
      pub.onclick = async function () {
        if (!confirm('确认将「' + (pack.username || '') + '」交接包写入知识库「人员知识资源」？写入后 Agent 可检索。')) return;
        try {
          var res = await API.workbenchHandoverPublish({
            user_id: targetId,
            daily_limit: 30,
            monthly_limit: 12,
            confirm: true
          });
          alert('已入库：' + ((res.document && res.document.filename) || '') +
            '（切片 ' + ((res.document && res.document.chunk_count) || 0) + '）');
        } catch (e) { alert(e.message || '入库失败'); }
      };
    }
  }

  async function renderReview(el) {
    if (!state.isManager) {
      el.innerHTML = '<div class="wb-empty">无权限</div>';
      return;
    }
    var data = await API.workbenchPending();

    function dailyBlock(list) {
      if (!list.length) {
        return '<div class="wb-card" style="margin-bottom:10px;"><strong>待审日报</strong>' +
          '<div class="wb-empty">无待审</div></div>';
      }
      return '<div class="wb-card" style="margin-bottom:10px;"><strong>待审日报（' + list.length +
        '）</strong><div class="daily-feed" style="margin-top:10px;">' +
        list.map(function (it) {
          var parsed = parseDailyContent(it.content);
          var structured = !!(parsed.done || parsed.risk || parsed.next);
          var body;
          if (structured) {
            body = '<div class="daily-sections">' +
              DAILY_SECTIONS.map(function (s) {
                var val = parsed[s.key];
                if (!val) return '';
                return '<div class="daily-sec"><div class="daily-sec-title">' + esc(s.title) +
                  '</div><pre class="wb-pre">' + esc(val) + '</pre></div>';
              }).join('') + '</div>';
          } else {
            body = '<pre class="wb-pre">' + esc(it.content) + '</pre>';
          }
          return '<div class="review-pending-item">' +
            '<div class="daily-card-head"><div><strong>' + esc(it.username) + '</strong> · ' +
            esc(it.log_date) + '</div>' + tagStatus(it.status) + '</div>' +
            body + reviewPanelHtml(it, 'daily') + '</div>';
        }).join('') + '</div></div>';
    }

    function monthlyBlock(list) {
      if (!list.length) {
        return '<div class="wb-card" style="margin-bottom:10px;"><strong>待审月报</strong>' +
          '<div class="wb-empty">无待审</div></div>';
      }
      return '<div class="wb-card" style="margin-bottom:10px;"><strong>待审月报（' + list.length +
        '）</strong>' +
        list.map(function (it) {
          return '<div class="review-pending-item">' +
            '<div class="daily-card-head"><div><strong>' + esc(it.username) + '</strong> · ' +
            esc(it.year_month) + '</div>' + tagStatus(it.status) + '</div>' +
            '<pre class="wb-pre">' + esc(it.content) + '</pre>' +
            reviewPanelHtml(it, 'monthly') + '</div>';
        }).join('') + '</div>';
    }

    function weeklyBlock(list) {
      if (!list.length) {
        return '<div class="wb-card" style="margin-bottom:10px;"><strong>待审周报</strong>' +
          '<div class="wb-empty">无待审</div></div>';
      }
      return '<div class="wb-card" style="margin-bottom:10px;"><strong>待审周报（' + list.length +
        '）</strong>' +
        list.map(function (it) {
          return '<div class="review-pending-item">' +
            '<div class="daily-card-head"><div><strong>' + esc(it.username) + '</strong> · ' +
            esc(it.year_week) + '</div>' + tagStatus(it.status) + '</div>' +
            '<pre class="wb-pre">' + esc(it.content) + '</pre>' +
            reviewPanelHtml(it, 'weekly') + '</div>';
        }).join('') + '</div>';
    }

    el.innerHTML =
      '<div class="wb-panel-title"><h2>审核中心</h2></div>' +
      '<p class="wb-hint">对已提交日报/周报/月报直接写点评，一键通过或退回（无需弹窗）。</p>' +
      dailyBlock(data.daily || []) +
      weeklyBlock(data.weekly || []) +
      monthlyBlock(data.monthly || []);
    bindReviewButtons(el);
  }

  return { boot: boot };
})();

document.addEventListener('DOMContentLoaded', function () {
  WorkbenchApp.boot();
});
