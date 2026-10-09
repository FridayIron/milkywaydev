/* 各功能页初始化逻辑 —— 改某页行为只动对应函数 */
window.initDashboard = async function () {
  var materialBtns = document.getElementById('dashboardMaterialBtns');
  if (materialBtns) {
    // 游客也显示快捷入口，点进后由路由提示无权
    materialBtns.style.display = '';
  }
  var guestTip = document.getElementById('guestDashTip');
  if (guestTip) {
    guestTip.style.display = Auth.isGuest() ? 'block' : 'none';
  }
  var guestChatBtn = document.getElementById('guestChatBtn');
  if (guestChatBtn) {
    guestChatBtn.style.display = 'none';
  }
  try {
    const stats = await API.stats();
    document.getElementById('statDocs').textContent = Auth.isGuest() ? '-' : (stats.documents ?? 0);
    document.getElementById('statFaults').textContent = Auth.isGuest() ? '-' : (stats.fault_cases ?? 0);
    document.getElementById('statChats').textContent = stats.chat_count ?? 0;
    document.getElementById('statReviews').textContent = Auth.isGuest() ? '-' : (stats.reviews ?? 0);
  } catch (e) {
    document.getElementById('statDocs').textContent = '0';
  }

  async function loadActivities() {
    const box = document.getElementById('activityList');
    const selectAll = document.getElementById('actSelectAll');
    const btnBatch = document.getElementById('btnBatchDelAct');
    if (selectAll) selectAll.checked = false;
    if (btnBatch) btnBatch.disabled = true;
    try {
      const acts = await API.listActivities();
      if (!acts || !acts.length) {
        box.innerHTML = '<div class="list-item loading-hint">暂无动态，上传知识或发起问答后会出现在这里</div>';
        return;
      }
      box.innerHTML = acts.map(function (a) {
        return '<div class="list-item batchable activity-item" data-aid="' + a.id + '">' +
          '<input type="checkbox" class="batch-item-check" data-aid="' + a.id + '" title="选择">' +
          '<div class="activity-main">' +
          '<div class="activity-title">' + escapeHtml(a.title) + '</div>' +
          '<span class="meta">' + escapeHtml(a.time || '') + '</span></div>' +
          '<div class="activity-actions">' +
          '<button type="button" class="btn btn-sm btn-outline" data-edit-act="' + a.id +
          '" style="padding:2px 8px;font-size:11px;">编辑</button>' +
          '<button type="button" class="btn btn-sm btn-outline" data-del-act="' + a.id +
          '" style="padding:2px 8px;font-size:11px;">删除</button></div></div>';
      }).join('');

      function refreshBatchBtn() {
        var n = box.querySelectorAll('.batch-item-check:checked').length;
        if (btnBatch) btnBatch.disabled = n === 0;
        if (selectAll) {
          var all = box.querySelectorAll('.batch-item-check');
          selectAll.checked = all.length > 0 && n === all.length;
        }
      }
      box.querySelectorAll('.batch-item-check').forEach(function (cb) {
        cb.onchange = refreshBatchBtn;
      });
      if (selectAll) {
        selectAll.onchange = function () {
          box.querySelectorAll('.batch-item-check').forEach(function (cb) {
            cb.checked = selectAll.checked;
          });
          refreshBatchBtn();
        };
      }
      if (btnBatch) {
        btnBatch.onclick = async function () {
          var ids = [];
          box.querySelectorAll('.batch-item-check:checked').forEach(function (cb) {
            ids.push(cb.getAttribute('data-aid'));
          });
          if (!ids.length) return;
          if (!confirm('确认删除选中的 ' + ids.length + ' 条动态？')) return;
          btnBatch.disabled = true;
          try {
            var res = await API.deleteActivitiesBatch(ids);
            var fail = (res && res.failed && res.failed.length) ? '\n失败 ' + res.failed.length + ' 条' : '';
            if (fail) alert('已删除 ' + (res.count || 0) + ' 条' + fail);
            await loadActivities();
          } catch (err) {
            alert(err.message || '批量删除失败');
            btnBatch.disabled = false;
          }
        };
      }

      box.querySelectorAll('[data-edit-act]').forEach(function (btn) {
        btn.onclick = async function () {
          var id = btn.getAttribute('data-edit-act');
          var row = box.querySelector('.activity-item[data-aid="' + id + '"] .activity-title');
          var cur = row ? row.textContent : '';
          var next = prompt('编辑动态内容：', cur);
          if (next == null) return;
          next = String(next).trim();
          if (!next) {
            alert('内容不能为空');
            return;
          }
          try {
            await API.updateActivity(id, next);
            await loadActivities();
          } catch (err) {
            alert(err.message || '保存失败');
          }
        };
      });
      box.querySelectorAll('[data-del-act]').forEach(function (btn) {
        btn.onclick = async function () {
          var id = btn.getAttribute('data-del-act');
          if (!confirm('确认删除这条动态？')) return;
          try {
            await API.deleteActivity(id);
            await loadActivities();
          } catch (err) {
            alert(err.message || '删除失败');
          }
        };
      });
    } catch (e) {
      box.innerHTML = '<div class="list-item loading-hint">动态加载失败</div>';
    }
  }

  await loadActivities();
};

window.initChat = function () {
  const roleSelect = document.getElementById('chatRole');
  const content = document.getElementById('chatContent');
  const input = document.getElementById('chatInput');
  const roleTag = document.getElementById('chatRoleTag');
  const SS_SID = 'ivd_chat_session_id';
  const SS_DRAFT = 'ivd_chat_draft';
  const SS_ROLE = 'ivd_chat_role';
  const SS_PENDING = 'ivd_chat_pending';
  const SS_FAILED_Q = 'ivd_chat_failed_q';
  let sessionId = null;
  let lastFailedQuestion = sessionStorage.getItem(SS_FAILED_Q) || null;
  let chatBusy = false;
  let chatAbort = null;
  let pendingQuestion = null;
  /** @type {{mime_type:string,data_base64:string,preview:string}[]} */
  let pendingImages = [];
  const MAX_CHAT_IMAGES = 3;

  const roleLabels = {
    auto: '自动匹配',
    software: '软件架构Agent',
    fault: '故障诊断Agent',
    hardware: '硬件电路Agent',
    mech: '机械光学Agent',
    clinical: '售后测试Agent'
  };

  function persistActive() {
    if (sessionId) sessionStorage.setItem(SS_SID, String(sessionId));
    else sessionStorage.removeItem(SS_SID);
    sessionStorage.setItem(SS_ROLE, roleSelect.value || 'auto');
    sessionStorage.setItem(SS_DRAFT, input.value || '');
  }

  roleSelect.addEventListener('change', function () {
    roleTag.textContent = '当前：' + (roleLabels[roleSelect.value] || roleSelect.value);
    persistActive();
  });
  input.addEventListener('input', function () { persistActive(); });

  document.getElementById('btnNewChat').onclick = function () {
    sessionId = null;
    lastFailedQuestion = null;
    sessionStorage.removeItem(SS_SID);
    sessionStorage.removeItem(SS_PENDING);
    sessionStorage.removeItem(SS_FAILED_Q);
    content.innerHTML = '<p class="loading-hint">新对话已开始，请输入问题。</p>';
    highlightSession(null);
  };

  function highlightSession(id) {
    document.querySelectorAll('#chatSessionList .list-item').forEach(function (el) {
      el.classList.toggle('active', String(el.getAttribute('data-sid')) === String(id || ''));
    });
  }

  function chatUserName() {
    var u = Auth.getUser();
    return (u && u.username) ? u.username : '我';
  }

  function chatImageUrl(name) {
    var base = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
    var token = Auth.getToken() || '';
    return base + '/api/chat/images/' + encodeURIComponent(name) +
      (token ? ('?access_token=' + encodeURIComponent(token)) : '');
  }

  // 图片接口走 Authorization；img src 无法带 header，改用 blob 拉取后展示
  function mountChatImageEls(root) {
    (root || document).querySelectorAll('img[data-chat-img]').forEach(function (img) {
      if (img.getAttribute('data-loaded') === '1') return;
      var name = img.getAttribute('data-chat-img');
      if (!name) return;
      img.setAttribute('data-loaded', '1');
      var base = (window.APP_CONFIG && window.APP_CONFIG.API_BASE) || '';
      fetch(base + '/api/chat/images/' + encodeURIComponent(name), {
        headers: { Authorization: 'Bearer ' + (Auth.getToken() || '') }
      }).then(function (res) {
        if (!res.ok) throw new Error('img ' + res.status);
        return res.blob();
      }).then(function (blob) {
        img.src = URL.createObjectURL(blob);
      }).catch(function () {
        img.alt = '图片加载失败';
      });
    });
  }

  function renderUserBubble(text, opts) {
    opts = opts || {};
    var pendingAttr = opts.pending ? ' id="chatPendingUserRow"' : '';
    var editBtn = opts.pending
      ? '<button type="button" class="btn btn-sm chat-edit-pending-btn" id="btnEditPendingQ">修改问题</button>'
      : '';
    var imgsHtml = '';
    var imgs = opts.images || opts.previewImages || [];
    if (imgs && imgs.length) {
      imgsHtml = '<div class="chat-bubble-imgs">' + imgs.map(function (it) {
        if (typeof it === 'string') {
          return '<img data-chat-img="' + escapeHtml(it) + '" alt="附图">';
        }
        return '<img src="' + escapeHtml(it.preview || '') + '" alt="附图">';
      }).join('') + '</div>';
    }
    return '<div class="chat-row chat-row-user"' + pendingAttr + '>' +
      '<div class="chat-bubble chat-bubble-user">' +
      '<div class="chat-bubble-name">' + escapeHtml(chatUserName()) + '</div>' +
      imgsHtml +
      '<div class="chat-bubble-body">' + escapeHtml(text || (imgs.length ? '（附图）' : '')) + '</div>' +
      editBtn + '</div></div>';
  }

  function renderAiBubble(text, sources, meta) {
    var cite = '';
    if (sources && sources.length) {
      cite = '<div class="cite">溯源：' +
        sources.map(function (s) { return escapeHtml(s); }).join('；') + '</div>';
    } else if (meta && meta.used_rag === false) {
      cite = '<div class="cite">未强依赖知识库（按普通对话回答）</div>';
    }
    return '<div class="chat-row chat-row-ai">' +
      '<div class="chat-bubble chat-bubble-ai">' +
      '<div class="chat-bubble-name">AI</div>' +
      '<div class="chat-bubble-body chat-md">' + formatAiContent(text) + '</div>' +
      cite + '</div></div>';
  }

  function setChatWaitingStatus(text) {
    var el = document.getElementById('chatWaitingText');
    if (el) el.textContent = text;
    var barText = document.getElementById('chatLiveStatusText');
    if (barText) barText.textContent = text;
    var bar = document.getElementById('chatLiveStatus');
    if (bar) bar.style.display = 'flex';
  }

  function startChatStatusTicker() {
    var stages = [
      { at: 0, text: '正在检索知识库…' },
      { at: 600, text: '正在整理检索结果与上文…' },
      { at: 1400, text: '正在调用大模型…' },
      { at: 3200, text: '模型生成回答中…' },
      { at: 9000, text: '仍在生成，请稍候…' }
    ];
    var t0 = Date.now();
    setChatWaitingStatus(stages[0].text);
    if (window.__chatStatusTimer) clearInterval(window.__chatStatusTimer);
    window.__chatStatusTimer = setInterval(function () {
      var elapsed = Date.now() - t0;
      var cur = stages[0].text;
      for (var i = 0; i < stages.length; i++) {
        if (elapsed >= stages[i].at) cur = stages[i].text;
      }
      setChatWaitingStatus(cur);
    }, 250);
  }

  function stopChatStatusTicker() {
    if (window.__chatStatusTimer) {
      clearInterval(window.__chatStatusTimer);
      window.__chatStatusTimer = null;
    }
    var bar = document.getElementById('chatLiveStatus');
    if (bar) bar.style.display = 'none';
  }

  function showWaitingBubble() {
    removeWaitingBubble();
    var tmp = document.createElement('div');
    tmp.innerHTML = '<div class="chat-row chat-row-ai" id="chatWaitingRow">' +
      '<div class="chat-bubble chat-bubble-ai chat-bubble-waiting">' +
      '<div class="chat-bubble-name">AI</div>' +
      '<div class="chat-waiting-line">' +
      '<span class="chat-waiting-dots" aria-hidden="true"><span></span><span></span><span></span></span>' +
      '<span id="chatWaitingText">正在检索知识库…</span>' +
      '</div>' +
      '<button type="button" class="btn btn-sm btn-outline chat-edit-pending-btn" id="btnEditPendingQ2">修改问题</button>' +
      '</div></div>';
    var node = tmp.firstChild;
    if (node) content.appendChild(node);
    startChatStatusTicker();
    bindEditPendingButtons();
    content.scrollTop = content.scrollHeight;
  }

  function removeWaitingBubble() {
    stopChatStatusTicker();
    var row = document.getElementById('chatWaitingRow');
    if (row) row.remove();
    var legacy = document.getElementById('chatWaiting');
    if (legacy) {
      var r = legacy.closest('.chat-row');
      if (r) r.remove();
      else legacy.remove();
    }
  }

  function renderSystemBubble(html, asError) {
    var cls = asError ? ' style="color:var(--error);"' : '';
    return '<div class="chat-row chat-row-system"><div class="chat-bubble chat-bubble-system"' +
      cls + '>' + html + '</div></div>';
  }

  function renderMessages(messages) {
    if (!messages || !messages.length) {
      content.innerHTML = '<p class="loading-hint">该对话暂无消息</p>';
      return;
    }
    content.innerHTML = messages.map(function (m) {
      if (m.role === 'user') return renderUserBubble(m.content, { images: m.images || [] });
      return renderAiBubble(m.content, m.sources);
    }).join('');
    mountMermaidIn(content);
    mountChatImageEls(content);
    content.scrollTop = content.scrollHeight;
  }

  function renderImagePreview() {
    var box = document.getElementById('chatImagePreview');
    if (!box) return;
    if (!pendingImages.length) {
      box.style.display = 'none';
      box.innerHTML = '';
      return;
    }
    box.style.display = 'flex';
    box.innerHTML = pendingImages.map(function (im, idx) {
      return '<div class="chat-image-thumb">' +
        '<img src="' + escapeHtml(im.preview) + '" alt="">' +
        '<button type="button" data-rm-img="' + idx + '" title="移除">×</button></div>';
    }).join('');
    box.querySelectorAll('[data-rm-img]').forEach(function (btn) {
      btn.onclick = function () {
        var i = Number(btn.getAttribute('data-rm-img'));
        pendingImages.splice(i, 1);
        renderImagePreview();
      };
    });
  }

  function fileToCompressedImage(file) {
    return new Promise(function (resolve, reject) {
      if (!file || !/^image\//i.test(file.type || '')) {
        reject(new Error('不是图片文件'));
        return;
      }
      var reader = new FileReader();
      reader.onerror = function () { reject(new Error('读取图片失败')); };
      reader.onload = function () {
        var dataUrl = reader.result;
        var img = new Image();
        img.onload = function () {
          var maxW = 1280;
          var scale = Math.min(1, maxW / Math.max(img.width, 1));
          var w = Math.max(1, Math.round(img.width * scale));
          var h = Math.max(1, Math.round(img.height * scale));
          var canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          var outType = (file.type === 'image/png') ? 'image/png' : 'image/jpeg';
          var quality = outType === 'image/jpeg' ? 0.85 : undefined;
          var outUrl = canvas.toDataURL(outType, quality);
          var b64 = outUrl.split(',')[1] || '';
          if (!b64) {
            reject(new Error('压缩图片失败'));
            return;
          }
          // 过大则再压一档
          if (b64.length > 3.5 * 1024 * 1024 && outType === 'image/jpeg') {
            outUrl = canvas.toDataURL('image/jpeg', 0.7);
            b64 = outUrl.split(',')[1] || b64;
            outType = 'image/jpeg';
          }
          resolve({
            mime_type: outType,
            data_base64: b64,
            preview: outUrl
          });
        };
        img.onerror = function () { reject(new Error('图片解码失败')); };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  }

  async function addChatImageFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || []);
    for (var i = 0; i < files.length; i++) {
      if (pendingImages.length >= MAX_CHAT_IMAGES) {
        alert('最多附 ' + MAX_CHAT_IMAGES + ' 张图片');
        break;
      }
      try {
        var im = await fileToCompressedImage(files[i]);
        pendingImages.push(im);
      } catch (err) {
        alert((files[i] && files[i].name ? files[i].name + '：' : '') + (err.message || '添加失败'));
      }
    }
    renderImagePreview();
  }

  async function openSession(sid) {
    try {
      const data = await API.getChatMessages(sid);
      sessionId = data.id;
      persistActive();
      renderMessages(data.messages);
      highlightSession(sid);
      return data;
    } catch (e) {
      content.innerHTML = renderSystemBubble('加载失败：' + escapeHtml(e.message), true);
      return null;
    }
  }

  function sleep(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  async function pollPending(sid) {
    showWaitingBubble();
    setChatWaitingStatus('上次回答仍在生成，正在恢复…');
    for (var i = 0; i < 90; i++) {
      await sleep(2000);
      try {
        var data = await API.getChatMessages(sid);
        var msgs = data.messages || [];
        var last = msgs.length ? msgs[msgs.length - 1] : null;
        if (last && last.role === 'assistant') {
          sessionStorage.removeItem(SS_PENDING);
          removeWaitingBubble();
          renderMessages(msgs);
          return;
        }
      } catch (e) { /* ignore */ }
    }
    sessionStorage.removeItem(SS_PENDING);
    removeWaitingBubble();
    content.innerHTML += renderSystemBubble('等待超时，请从历史中重新打开该对话查看。', true);
  }

  async function loadSessions() {
    try {
      const list = await API.listChatSessions();
      const box = document.getElementById('chatSessionList');
      const btnBatch = document.getElementById('btnBatchDelChat');
      const selectAll = document.getElementById('chatSelectAll');
      if (selectAll) selectAll.checked = false;
      if (btnBatch) btnBatch.disabled = true;
      if (!list.length) {
        box.innerHTML = '<div class="list-item loading-hint">暂无历史（仅显示本账号）</div>';
        return;
      }
      box.innerHTML = list.map(function (s) {
        var active = String(s.id) === String(sessionId) ? ' active' : '';
        return '<div class="list-item catalog-item session-item batchable' + active + '" data-sid="' + s.id + '">' +
          '<input type="checkbox" class="batch-item-check" data-sid="' + s.id + '" title="选择">' +
          '<span class="session-title" title="' + escapeHtml(s.title || '未命名对话') + '">' +
          escapeHtml(s.title || '未命名对话') + '</span>' +
          '<button type="button" class="session-del-btn" data-del="' + s.id + '" title="删除此对话">删除</button></div>';
      }).join('');

      function refreshBatchBtn() {
        var n = box.querySelectorAll('.batch-item-check:checked').length;
        if (btnBatch) btnBatch.disabled = n === 0;
        if (selectAll) {
          var all = box.querySelectorAll('.batch-item-check');
          selectAll.checked = all.length > 0 && n === all.length;
        }
      }

      box.querySelectorAll('.batch-item-check').forEach(function (cb) {
        cb.onclick = function (e) { e.stopPropagation(); };
        cb.onchange = refreshBatchBtn;
      });
      if (selectAll) {
        selectAll.onchange = function () {
          box.querySelectorAll('.batch-item-check').forEach(function (cb) {
            cb.checked = selectAll.checked;
          });
          refreshBatchBtn();
        };
      }
      if (btnBatch) {
        btnBatch.onclick = async function () {
          var ids = [];
          box.querySelectorAll('.batch-item-check:checked').forEach(function (cb) {
            ids.push(cb.getAttribute('data-sid'));
          });
          if (!ids.length) return;
          if (!confirm('确认批量删除选中的 ' + ids.length + ' 条历史对话？删除后不可恢复。')) return;
          btnBatch.disabled = true;
          try {
            var res = await API.deleteChatSessions(ids);
            if (ids.some(function (id) { return String(sessionId) === String(id); })) {
              sessionId = null;
              sessionStorage.removeItem(SS_SID);
              content.innerHTML = '<p class="loading-hint">对话已删除，可新建对话继续提问。</p>';
            }
            var fail = (res && res.failed && res.failed.length) ? '\n失败 ' + res.failed.length + ' 条' : '';
            alert('已删除 ' + ((res && res.count) || ids.length) + ' 条对话' + fail);
            await loadSessions();
          } catch (err) {
            alert(err.message || '批量删除失败');
            btnBatch.disabled = false;
          }
        };
      }

      box.querySelectorAll('.session-title').forEach(function (el) {
        el.onclick = function () {
          var sid = el.parentElement.getAttribute('data-sid');
          openSession(sid);
        };
      });
      box.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = async function (e) {
          e.preventDefault();
          e.stopPropagation();
          var sid = btn.getAttribute('data-del');
          if (!confirm('确认删除该历史对话？删除后不可恢复。')) return;
          btn.disabled = true;
          try {
            await API.deleteChatSession(sid);
            if (String(sessionId) === String(sid)) {
              sessionId = null;
              sessionStorage.removeItem(SS_SID);
              content.innerHTML = '<p class="loading-hint">对话已删除，可新建对话继续提问。</p>';
            }
            await loadSessions();
          } catch (err) {
            alert(err.message || '删除失败');
            btn.disabled = false;
          }
        };
      });
    } catch (e) {
      document.getElementById('chatSessionList').innerHTML =
        '<div class="list-item loading-hint">历史加载失败：' + escapeHtml(e.message || '') + '</div>';
    }
  }

  function renderErrorWithRetry(message) {
    return '<div class="chat-row chat-row-system chat-row-error" id="chatErrorRow">' +
      '<div class="chat-bubble chat-bubble-system chat-bubble-error">' +
      '<div class="chat-error-text">错误：' + escapeHtml(message) + '</div>' +
      '<div class="chat-error-actions">' +
      '<button type="button" class="btn btn-sm btn-outline chat-retry-btn" id="btnChatRetry">重试</button>' +
      '<button type="button" class="btn btn-sm btn-outline" id="btnEditFailedQ">修改问题</button>' +
      '</div></div></div>';
  }

  function removeChatError() {
    var row = document.getElementById('chatErrorRow');
    if (row) row.remove();
  }

  function bindEditPendingButtons() {
    function onEdit() {
      beginEditPendingQuestion();
    }
    var b1 = document.getElementById('btnEditPendingQ');
    var b2 = document.getElementById('btnEditPendingQ2');
    if (b1) b1.onclick = onEdit;
    if (b2) b2.onclick = onEdit;
  }

  async function beginEditPendingQuestion() {
    var q = pendingQuestion || lastFailedQuestion || '';
    if (chatAbort) {
      try { chatAbort.abort(); } catch (e0) { /* ignore */ }
      chatAbort = null;
    }
    if (sessionId) {
      try {
        await API.discardPendingChat(sessionId);
      } catch (e1) { /* 竞态时忽略 */ }
    }
    sessionStorage.removeItem(SS_PENDING);
    removeWaitingBubble();
    removeChatError();
    var pendingRow = document.getElementById('chatPendingUserRow');
    if (pendingRow) pendingRow.remove();
    // 去掉可能已画出的本轮用户气泡（非 pending id 的最后一条）
    var rows = content.querySelectorAll('.chat-row-user');
    if (rows.length && !document.getElementById('chatPendingUserRow')) {
      // 若最后一条用户气泡就是本轮刚发的，已在上面用 id 删掉；此处兜底
    }
    chatBusy = false;
    pendingQuestion = null;
    var btn = document.getElementById('btnSendChat');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '发送';
    }
    if (q) {
      input.value = q;
      persistActive();
      try { input.focus(); } catch (e2) { /* ignore */ }
    }
    setChatWaitingStatus('已取消生成本轮回答，请修改后重新发送');
    var bar = document.getElementById('chatLiveStatus');
    if (bar) {
      bar.style.display = 'flex';
      setTimeout(function () {
        if (!chatBusy && bar) bar.style.display = 'none';
      }, 2500);
    }
  }

  function bindRetryButton() {
    var btn = document.getElementById('btnChatRetry');
    if (!btn) return;
    btn.onclick = function () {
      var q = lastFailedQuestion;
      if (!q) return;
      sendQuestion(q, { retry: true });
    };
    var editBtn = document.getElementById('btnEditFailedQ');
    if (editBtn) {
      editBtn.onclick = function () {
        var q = lastFailedQuestion || '';
        removeChatError();
        var pendingRow = document.getElementById('chatPendingUserRow');
        if (pendingRow) pendingRow.remove();
        // 失败时用户气泡可能无 pending id：删掉末条用户气泡再填入输入框
        var userRows = content.querySelectorAll('.chat-row-user');
        if (userRows.length) userRows[userRows.length - 1].remove();
        input.value = q;
        persistActive();
        try { input.focus(); } catch (e) { /* ignore */ }
      };
    }
  }

  async function sendQuestion(q, opts) {
    opts = opts || {};
    var isRetry = !!opts.retry;
    q = (q || '').trim();
    var imagesPayload = (pendingImages || []).map(function (im) {
      return { mime_type: im.mime_type, data_base64: im.data_base64 };
    });
    var previewSnap = (pendingImages || []).map(function (im) {
      return { preview: im.preview };
    });
    if (!q && !imagesPayload.length && !isRetry) return;
    if (chatBusy) {
      alert('当前问题仍在回答中。若要改问题，请先点「修改问题」。');
      return;
    }
    const btn = document.getElementById('btnSendChat');
    btn.disabled = true;
    btn.textContent = '回答中…';
    chatBusy = true;
    pendingQuestion = q || '（附图）';
    lastFailedQuestion = pendingQuestion;
    sessionStorage.setItem(SS_FAILED_Q, pendingQuestion);

    if (content.querySelector('.loading-hint') && !content.querySelector('.chat-row')) {
      content.innerHTML = '';
    }
    removeChatError();
    if (!isRetry) {
      content.innerHTML += renderUserBubble(q, { pending: true, previewImages: previewSnap });
      bindEditPendingButtons();
    } else {
      // 重试：给最后一条用户气泡挂上修改入口
      var userRows = content.querySelectorAll('.chat-row-user');
      if (userRows.length) {
        var last = userRows[userRows.length - 1];
        last.id = 'chatPendingUserRow';
        var bubble = last.querySelector('.chat-bubble-user');
        if (bubble && !bubble.querySelector('.chat-edit-pending-btn')) {
          var eb = document.createElement('button');
          eb.type = 'button';
          eb.className = 'btn btn-sm chat-edit-pending-btn';
          eb.id = 'btnEditPendingQ';
          eb.textContent = '修改问题';
          bubble.appendChild(eb);
        }
        bindEditPendingButtons();
      }
    }
    showWaitingBubble();
    if (!isRetry) {
      input.value = '';
      persistActive();
    }

    chatAbort = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    try {
      if (!sessionId) {
        setChatWaitingStatus('正在创建会话…');
        var created = await API.createChatSession({
          title: (q || '图片识别').slice(0, 40)
        });
        sessionId = created.id;
        persistActive();
      }
      sessionStorage.setItem(SS_PENDING, '1');
      setChatWaitingStatus(imagesPayload.length ? '正在识图并检索…' : '正在检索知识库…');
      var chatBody = {
        question: q,
        role: roleSelect.value,
        session_id: sessionId,
        retry: isRetry
      };
      if (imagesPayload.length) chatBody.images = imagesPayload;
      const res = await API.chat(chatBody, { signal: chatAbort && chatAbort.signal });

      if (res && res.cancelled) {
        sessionStorage.removeItem(SS_PENDING);
        removeWaitingBubble();
        var pr = document.getElementById('chatPendingUserRow');
        if (pr) pr.remove();
        if (pendingQuestion) {
          input.value = pendingQuestion === '（附图）' ? '' : pendingQuestion;
          persistActive();
        }
        return;
      }

      sessionId = res.session_id;
      sessionStorage.removeItem(SS_PENDING);
      sessionStorage.removeItem(SS_FAILED_Q);
      lastFailedQuestion = null;
      pendingQuestion = null;
      persistActive();
      removeWaitingBubble();
      var pendingRow = document.getElementById('chatPendingUserRow');
      if (pendingRow) {
        pendingRow.removeAttribute('id');
        var oldBtn = pendingRow.querySelector('.chat-edit-pending-btn');
        if (oldBtn) oldBtn.remove();
      }
      content.innerHTML += renderAiBubble(res.answer, res.sources, {
        used_rag: res.used_rag
      });
      mountMermaidIn(content);
      pendingImages = [];
      renderImagePreview();
      loadSessions();
    } catch (e) {
      sessionStorage.removeItem(SS_PENDING);
      removeWaitingBubble();
      var aborted = (e && (e.name === 'AbortError' || /abort/i.test(String(e.message || ''))));
      if (aborted) {
        return;
      }
      content.innerHTML += renderErrorWithRetry(e.message || '请求失败');
      bindRetryButton();
    } finally {
      chatBusy = false;
      chatAbort = null;
      btn.disabled = false;
      btn.textContent = '发送';
      content.scrollTop = content.scrollHeight;
    }
  }

  async function send() {
    const q = input.value.trim();
    if (!q && !pendingImages.length) return;
    await sendQuestion(q, { fromInput: true });
  }

  document.getElementById('btnSendChat').onclick = send;
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });

  var btnPickImg = document.getElementById('btnChatPickImage');
  var fileImg = document.getElementById('chatImageInput');
  if (btnPickImg && fileImg) {
    btnPickImg.onclick = function () { fileImg.click(); };
    fileImg.onchange = function () {
      var files = Array.prototype.slice.call(fileImg.files || []);
      fileImg.value = '';
      addChatImageFiles(files);
    };
  }
  input.addEventListener('paste', function (e) {
    var items = (e.clipboardData && e.clipboardData.items) || [];
    var files = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) {
        var f = items[i].getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length) {
      e.preventDefault();
      addChatImageFiles(files);
    }
  });

  (async function restore() {
    var savedRole = sessionStorage.getItem(SS_ROLE);
    if (savedRole && roleSelect.querySelector('option[value="' + savedRole + '"]')) {
      roleSelect.value = savedRole;
      roleTag.textContent = '当前：' + (roleLabels[savedRole] || savedRole);
    }
    var draft = sessionStorage.getItem(SS_DRAFT);
    if (draft) input.value = draft;
    await loadSessions();
    var sid = sessionStorage.getItem(SS_SID);
    if (sid) {
      await openSession(sid);
      if (sessionStorage.getItem(SS_PENDING) === '1') {
        await pollPending(sid);
      } else if (lastFailedQuestion) {
        // 上次失败：补上重试按钮（不重复画用户气泡）
        content.innerHTML += renderErrorWithRetry('上次回答失败，可点击重试继续。');
        bindRetryButton();
      }
    } else if (lastFailedQuestion) {
      content.innerHTML = renderUserBubble(lastFailedQuestion) +
        renderErrorWithRetry('上次回答失败，可点击重试继续。');
      bindRetryButton();
    }
  })();
};

window.initDev = async function () {
  const denied = document.getElementById('devDenied');
  const content = document.getElementById('devContent');
  if (!Auth.isDeveloper()) {
    denied.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  denied.style.display = 'none';
  content.style.display = 'block';

  var btnOpenMap = document.getElementById('btnOpenFeatureMap');
  if (btnOpenMap) {
    btnOpenMap.onclick = function () {
      Router.switchPage('dev-map');
    };
  }

  // 开发者后台分区标签：懒加载，切到某分区才首次加载其数据
  var devSectionLoaded = { overview: false, monitor: false, llm: false, maint: false, users: false };

  function switchDevSection(section) {
    document.querySelectorAll('#devSectionTabs .dev-section-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-section') === section);
    });
    document.querySelectorAll('.dev-section-panel').forEach(function (p) {
      p.style.display = p.getAttribute('data-section') === section ? '' : 'none';
    });
    if (devSectionLoaded[section]) return;
    devSectionLoaded[section] = true;
    if (section === 'overview') loadOverview();
    else if (section === 'monitor') { loadSystemMonitor(); startSysMonAuto(); }
    else if (section === 'llm') loadLlmConfig();
    else if (section === 'maint') { loadMaintenance(); loadBackups(); }
    else if (section === 'users') loadUsers();
  }

  document.querySelectorAll('#devSectionTabs .dev-section-tab').forEach(function (btn) {
    btn.onclick = function () { switchDevSection(btn.getAttribute('data-section')); };
  });

  let currentDevUserId = null;
  let currentDevUsername = '';
  let currentDevSessionId = null;

  function formatTokens(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function formatDuration(sec) {
    sec = Number(sec) || 0;
    if (sec < 60) return sec + 's';
    if (sec < 3600) return (sec / 60).toFixed(1) + ' min';
    return (sec / 3600).toFixed(1) + ' h';
  }

  function renderUsageBars(items, valueKey) {
    valueKey = valueKey || 'tokens';
    if (!items || !items.length) {
      return '<div class="loading-hint">暂无数据</div>';
    }
    var max = 1;
    items.forEach(function (it) {
      max = Math.max(max, Number(it[valueKey]) || 0);
    });
    return '<div class="usage-bars">' + items.map(function (it) {
      var v = Number(it[valueKey]) || 0;
      var pct = Math.round((v / max) * 100);
      var label = it.day || it.feature || '-';
      return '<div class="usage-bar-row">' +
        '<span class="usage-bar-label" title="' + escapeHtml(label) + '">' + escapeHtml(label) + '</span>' +
        '<div class="usage-bar-track"><div class="usage-bar-fill" style="width:' + pct + '%;"></div></div>' +
        '<span class="usage-bar-num">' + formatTokens(v) + '</span></div>';
    }).join('') + '</div>';
  }

  async function loadOverview() {
    const ov = await API.devOverview();
    document.getElementById('devStatUsers').textContent = ov.user_count ?? 0;
    document.getElementById('devStatOnline').textContent = ov.online_count ?? 0;
    document.getElementById('devStatSessions').textContent = ov.session_count ?? 0;
    document.getElementById('devStatTokens').textContent = formatTokens(ov.total_tokens || 0);
  }

  function meterBar(pct, warnAt, dangerAt) {
    pct = Math.max(0, Math.min(100, Number(pct) || 0));
    warnAt = warnAt == null ? 70 : warnAt;
    dangerAt = dangerAt == null ? 90 : dangerAt;
    var level = pct >= dangerAt ? 'danger' : (pct >= warnAt ? 'warn' : 'ok');
    return '<div class="sys-meter">' +
      '<div class="sys-meter-track"><div class="sys-meter-fill sys-meter-' + level +
      '" style="width:' + pct + '%;"></div></div>' +
      '<span class="sys-meter-num">' + pct.toFixed(1) + '%</span></div>';
  }

  function formatMs(ms) {
    ms = Number(ms) || 0;
    if (ms < 1000) return ms + ' ms';
    return (ms / 1000).toFixed(1) + ' s';
  }

  function formatUptime(sec) {
    sec = Number(sec) || 0;
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) return h + 'h ' + m + 'm';
    if (m > 0) return m + 'm ' + s + 's';
    return s + 's';
  }

  async function loadSystemMonitor() {
    var box = document.getElementById('sysMonBody');
    var tsEl = document.getElementById('sysMonTs');
    if (!box) return;
    try {
      var data = await API.devSystem();
      if (tsEl) tsEl.textContent = '更新于 ' + (data.ts || '-');
      var host = data.host || {};
      var proc = data.process || {};
      var paths = data.paths || {};
      var llm = data.llm || {};
      var probe = data.llm_probe || {};
      var usage = data.llm_usage || {};
      var mem = host.memory || {};
      var disk = host.disk || {};
      var day = usage.last_24h || {};

      var tip = '';
      if ((usage.recent_avg_ms || 0) > 8000) {
        tip = '<div class="sys-tip warn">近期 LLM 平均耗时 ' + formatMs(usage.recent_avg_ms) +
          '，对话慢主要来自云端模型/网络，不是本机 Agent 进程本身。</div>';
      } else if ((mem.percent || 0) >= 90) {
        tip = '<div class="sys-tip warn">整机内存占用已超过 90%，可能拖慢本机响应，建议关闭不用的程序。</div>';
      }

      var featRows = (usage.by_feature_24h || []).map(function (f) {
        return '<tr><td>' + escapeHtml(f.feature) + '</td><td>' + f.calls +
          '</td><td>' + formatMs(f.avg_ms) + '</td><td>' + formatTokens(f.tokens) + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="loading-hint">近 24 小时暂无调用</td></tr>';

      var recentRows = (usage.recent || []).map(function (r) {
        return '<tr><td>' + escapeHtml(r.created_at || '') + '</td><td>' + escapeHtml(r.feature) +
          '</td><td>' + formatMs(r.duration_ms) + '</td><td>' + formatTokens(r.total_tokens) +
          '</td><td>' + (r.is_mock ? '演示' : '真实') + '</td></tr>';
      }).join('') || '<tr><td colspan="5" class="loading-hint">暂无记录</td></tr>';

      box.innerHTML =
        tip +
        '<div class="sys-grid">' +
        '<div class="sys-card"><h4>整机 CPU</h4>' + meterBar(host.cpu_percent) +
        '<div class="sys-meta">' + (host.cpu_count || '-') + ' 核 · ' + escapeHtml(host.hostname || '') + '</div></div>' +
        '<div class="sys-card"><h4>整机内存</h4>' + meterBar(mem.percent) +
        '<div class="sys-meta">' + (mem.used_gb || '-') + ' / ' + (mem.total_gb || '-') + ' GB</div></div>' +
        '<div class="sys-card"><h4>磁盘 ' + escapeHtml(disk.path || '') + '</h4>' + meterBar(disk.percent, 80, 95) +
        '<div class="sys-meta">' + (disk.used_gb || '-') + ' / ' + (disk.total_gb || '-') + ' GB</div></div>' +
        '<div class="sys-card"><h4>Agent 进程</h4>' +
        '<div class="sys-kv"><span>PID</span><b>' + (proc.pid || '-') + '</b></div>' +
        '<div class="sys-kv"><span>内存 RSS</span><b>' + (proc.rss_mb != null ? proc.rss_mb + ' MB' : '-') + '</b></div>' +
        '<div class="sys-kv"><span>进程 CPU</span><b>' + (proc.cpu_percent != null ? proc.cpu_percent + '%' : '-') + '</b></div>' +
        '<div class="sys-kv"><span>运行时长</span><b>' + formatUptime(proc.uptime_sec) + '</b></div>' +
        '<div class="sys-kv"><span>线程 / 连接</span><b>' + (proc.threads || '-') + ' / ' + (proc.connections != null ? proc.connections : '-') + '</b></div>' +
        '</div></div>' +

        '<div class="sys-grid" style="margin-top:12px;">' +
        '<div class="sys-card"><h4>大模型连通</h4>' +
        '<div class="sys-kv"><span>模型</span><b>' + escapeHtml(llm.model || '-') + '</b></div>' +
        '<div class="sys-kv"><span>Key</span><b>' + (llm.configured ? '已配置' : '未配置') + '</b></div>' +
        '<div class="sys-kv"><span>思考模式</span><b>' + (llm.thinking ? '开启' : '关闭') + '</b></div>' +
        '<div class="sys-kv"><span>探测</span><b style="color:' + (probe.ok ? 'var(--success,#059669)' : 'var(--error)') + ';">' +
        (probe.ok ? ('OK · DNS ' + probe.dns_ms + 'ms / TCP ' + probe.tcp_ms + 'ms') : escapeHtml(probe.error || '失败')) +
        '</b></div></div>' +
        '<div class="sys-card"><h4>近 24h LLM</h4>' +
        '<div class="sys-kv"><span>调用次数</span><b>' + (day.calls || 0) + '</b></div>' +
        '<div class="sys-kv"><span>Tokens</span><b>' + formatTokens(day.tokens) + '</b></div>' +
        '<div class="sys-kv"><span>累计耗时</span><b>' + formatDuration(day.duration_sec) + '</b></div>' +
        '<div class="sys-kv"><span>近次平均</span><b>' + formatMs(usage.recent_avg_ms) + '</b></div>' +
        '<div class="sys-kv"><span>近次最大</span><b>' + formatMs(usage.recent_max_ms) + '</b></div></div>' +
        '<div class="sys-card"><h4>数据文件</h4>' +
        '<div class="sys-kv"><span>数据库</span><b>' + (paths.db_size_mb != null ? paths.db_size_mb + ' MB' : '-') + '</b></div>' +
        '<div class="sys-kv"><span>data 目录</span><b>' + (paths.data_size_mb != null ? paths.data_size_mb + ' MB' : '-') + '</b></div>' +
        '<div class="sys-meta" style="margin-top:8px;word-break:break-all;">' + escapeHtml(paths.db_path || '') + '</div></div>' +
        '</div>' +

        '<div class="sys-two" style="margin-top:12px;">' +
        '<div><h4 style="margin:0 0 8px;font-size:13px;">按功能（24h）</h4>' +
        '<table class="sys-table"><thead><tr><th>功能</th><th>次数</th><th>平均耗时</th><th>Tokens</th></tr></thead><tbody>' +
        featRows + '</tbody></table></div>' +
        '<div><h4 style="margin:0 0 8px;font-size:13px;">最近调用</h4>' +
        '<table class="sys-table"><thead><tr><th>时间</th><th>功能</th><th>耗时</th><th>Tokens</th><th>模式</th></tr></thead><tbody>' +
        recentRows + '</tbody></table></div></div>';
    } catch (e) {
      box.innerHTML = '<div style="color:var(--error);">监控加载失败：' + escapeHtml(e.message || '') + '</div>';
    }
  }

  if (window.__sysMonTimer) {
    clearInterval(window.__sysMonTimer);
    window.__sysMonTimer = null;
  }

  function startSysMonAuto() {
    if (window.__sysMonTimer) {
      clearInterval(window.__sysMonTimer);
      window.__sysMonTimer = null;
    }
    var ck = document.getElementById('sysMonAuto');
    if (ck && ck.checked) {
      window.__sysMonTimer = setInterval(loadSystemMonitor, 5000);
    }
  }

  var btnSys = document.getElementById('btnSysMonRefresh');
  if (btnSys) btnSys.onclick = function () { loadSystemMonitor(); };
  var ckAuto = document.getElementById('sysMonAuto');
  if (ckAuto) ckAuto.onchange = startSysMonAuto;

  async function loadUsers() {
    const users = await API.devUsers();
    const tbody = document.getElementById('devUserTable');
    var filterEl = document.getElementById('devTechDirFilter');
    var groupEl = document.getElementById('devGroupByTech');
    var filterVal = filterEl ? filterEl.value : '';
    var doGroup = !groupEl || groupEl.checked;

    // 填充筛选下拉（保留当前选择）
    if (filterEl && !filterEl.getAttribute('data-bound')) {
      filterEl.setAttribute('data-bound', '1');
      filterEl.onchange = function () { loadUsers(); };
      if (groupEl) groupEl.onchange = function () { loadUsers(); };
    }
    if (filterEl) {
      var prev = filterVal;
      var dirMap = {};
      users.forEach(function (u) {
        if (u.tech_dir_id && u.tech_dir_name) dirMap[u.tech_dir_id] = u.tech_dir_name;
      });
      filterEl.innerHTML = '<option value="">全部</option><option value="__none__">未指定</option>' +
        Object.keys(dirMap).map(function (id) {
          return '<option value="' + id + '">' + escapeHtml(dirMap[id]) + '</option>';
        }).join('');
      filterEl.value = prev || '';
      filterVal = filterEl.value;
    }

    var list = users.slice();
    if (filterVal === '__none__') {
      list = list.filter(function (u) { return !u.tech_dir_id; });
    } else if (filterVal) {
      list = list.filter(function (u) { return String(u.tech_dir_id || '') === String(filterVal); });
    }

    function appendUserRow(u) {
      var badge = 'user';
      if (u.role === 'developer') badge = 'developer';
      else if (u.role === 'super') badge = 'super';
      else if (u.role === 'admin') badge = 'admin';
      else if (u.role === 'guest') badge = 'guest';
      var tr = document.createElement('tr');
      tr.style.borderBottom = '1px solid #f0f4f9';
      tr.innerHTML =
        '<td style="padding:10px 12px;font-weight:500;">' + escapeHtml(u.username) +
        (Auth.isSystemRootUser(u) ? ' <span class="perm-badge developer">系统</span>' : '') + '</td>' +
        '<td style="padding:10px 12px;font-size:12px;color:var(--text-muted);">' +
        escapeHtml(u.tech_dir_name || '—') + '</td>' +
        '<td style="padding:10px 12px;"><span class="perm-badge ' + badge + '">' +
        escapeHtml(u.role_label) + '</span></td>' +
        '<td style="padding:10px 8px;">' + (u.session_count || 0) + '</td>' +
        '<td style="padding:10px 8px;">' + formatTokens(u.total_tokens || 0) + '</td>' +
        '<td style="padding:10px 8px;">' + formatDuration(u.llm_duration_sec || 0) + '</td>' +
        '<td style="padding:10px 12px;font-size:12px;">' + escapeHtml(u.last_active_at || '-') + '</td>' +
        '<td style="padding:10px 12px;">' + escapeHtml(u.status || '-') + '</td>' +
        '<td style="padding:10px 12px;text-align:center;">' +
        '<button class="btn btn-sm btn-outline" data-uid="' + u.id + '" data-uname="' +
        escapeHtml(u.username) + '" style="padding:3px 12px;font-size:11px;">详情</button></td>';
      tbody.appendChild(tr);
    }

    tbody.innerHTML = '';
    if (doGroup && !filterVal) {
      var groups = {};
      var order = [];
      list.forEach(function (u) {
        var key = u.tech_dir_name || '未指定';
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(u);
      });
      order.sort(function (a, b) {
        if (a === '未指定') return 1;
        if (b === '未指定') return -1;
        return a.localeCompare(b, 'zh');
      });
      if (!window.__devOrgExpanded) window.__devOrgExpanded = {};
      order.forEach(function (g) {
        var open = !!window.__devOrgExpanded[g];
        var hr = document.createElement('tr');
        hr.className = 'org-dept-row';
        hr.innerHTML =
          '<td colspan="9" class="org-dept-cell">' +
          '<button type="button" class="org-dept-toggle" data-org-dept="' + escapeHtml(g) + '">' +
          '<span class="org-caret">' + (open ? '▾' : '▸') + '</span>' +
          '<span class="org-dept-name">' + escapeHtml(g) + '</span>' +
          '<span class="org-dept-count">' + groups[g].length + ' 人</span></button></td>';
        tbody.appendChild(hr);
        if (open) groups[g].forEach(appendUserRow);
      });
      tbody.querySelectorAll('[data-org-dept]').forEach(function (btn) {
        btn.onclick = function () {
          var key = btn.getAttribute('data-org-dept');
          window.__devOrgExpanded[key] = !window.__devOrgExpanded[key];
          loadUsers();
        };
      });
    } else {
      list.forEach(appendUserRow);
    }
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="padding:12px;color:var(--text-muted);">无匹配账号</td></tr>';
    }
    tbody.querySelectorAll('[data-uid]').forEach(function (btn) {
      btn.onclick = function () {
        sessionStorage.setItem('dev_edit_user_id', btn.getAttribute('data-uid'));
        sessionStorage.setItem('dev_edit_username', btn.getAttribute('data-uname') || '');
        Router.switchPage('dev-user');
      };
    });
  }

  function switchDevTab(tab) {
    document.querySelectorAll('#devTabs .dev-tab').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    var usage = document.getElementById('devUsagePanel');
    var sess = document.getElementById('devSessionList');
    var msg = document.getElementById('devMessageBox');
    if (tab === 'usage') {
      usage.style.display = '';
      sess.style.display = 'none';
      msg.innerHTML = '';
    } else {
      usage.style.display = 'none';
      sess.style.display = '';
    }
  }

  async function openUserDetail(userId, username) {
    currentDevUserId = userId;
    currentDevUsername = username;
    currentDevSessionId = null;
    document.getElementById('devDetailTitle').textContent = '账号 · ' + username;
    document.getElementById('devTabs').style.display = 'flex';
    switchDevTab('usage');
    document.getElementById('devUsagePanel').innerHTML = '<div class="loading-hint">加载用量…</div>';
    document.getElementById('devSessionList').innerHTML = '';
    document.getElementById('devMessageBox').innerHTML = '';
    var rootPrivate = Auth.isSystemRootUser(username) && !Auth.isSystemRootUser(Auth.getUser());
    if (rootPrivate) {
      // 隐藏对话 Tab，避免其他开发者进入
      document.querySelectorAll('#devTabs .dev-tab').forEach(function (b) {
        if (b.getAttribute('data-tab') === 'sessions') {
          b.style.display = 'none';
        }
      });
    } else {
      document.querySelectorAll('#devTabs .dev-tab').forEach(function (b) {
        b.style.display = '';
      });
    }
    try {
      const data = await API.devUserDetail(userId);
      const u = data.usage || {};
      document.getElementById('devUsagePanel').innerHTML =
        '<div class="usage-grid">' +
        '<div class="usage-metric"><div class="label">总 Tokens</div><div class="value">' +
        formatTokens(u.total_tokens) + '</div></div>' +
        '<div class="usage-metric"><div class="label">LLM 调用</div><div class="value">' +
        (u.llm_call_count || 0) + '</div></div>' +
        '<div class="usage-metric"><div class="label">LLM 耗时</div><div class="value">' +
        formatDuration(u.llm_duration_sec) + '</div></div>' +
        '<div class="usage-metric"><div class="label">会话跨度</div><div class="value">' +
        (u.session_duration_min || 0) + ' min</div></div>' +
        '<div class="usage-metric"><div class="label">对话 / 消息</div><div class="value">' +
        (u.session_count || 0) + ' / ' + (u.message_count || 0) + '</div></div>' +
        '<div class="usage-metric"><div class="label">最近活跃</div><div class="value" style="font-size:13px;">' +
        escapeHtml(u.last_active_at || '-') + '</div></div></div>' +
        (rootPrivate
          ? '<p style="margin:12px 0 0;font-size:12px;color:var(--error);">系统根账号对话受保护：不可查看或编辑根管理员的会话内容。</p>'
          : '') +
        '<p style="margin:14px 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">近 14 日 Tokens</p>' +
        renderUsageBars(u.daily || [], 'tokens') +
        '<p style="margin:14px 0 6px;font-size:12px;color:var(--text-muted);font-weight:600;">功能分布</p>' +
        renderUsageBars(u.by_feature || [], 'tokens');
      if (!rootPrivate) {
        await loadDevSessions(userId);
      } else {
        document.getElementById('devSessionList').innerHTML =
          '<div class="loading-hint" style="color:var(--error);">受保护：不可查看根管理员的对话</div>';
      }
    } catch (e) {
      document.getElementById('devUsagePanel').innerHTML =
        '<div style="color:var(--error);">' + escapeHtml(e.message) + '</div>';
    }
  }
  async function loadDevSessions(userId) {
    const box = document.getElementById('devSessionList');
    box.innerHTML = '<div class="loading-hint">加载对话…</div>';
    try {
      const data = await API.devUserSessions(userId);
      if (!data.sessions.length) {
        box.innerHTML = '<div class="loading-hint">该账号暂无对话</div>';
        return;
      }
      box.innerHTML = data.sessions.map(function (s) {
        return '<div class="list-item catalog-item session-item" data-sid="' + s.id + '">' +
          '<span class="session-title">' + escapeHtml(s.title) +
          '<span class="meta" style="margin-left:6px;">' + (s.msg_count || 0) + '条</span></span>' +
          '<button type="button" class="session-del-btn" data-delsess="' + s.id + '">删除</button></div>';
      }).join('');
      box.querySelectorAll('.session-title').forEach(function (el) {
        el.onclick = function () {
          openDevSession(el.parentElement.getAttribute('data-sid'));
        };
      });
      box.querySelectorAll('[data-delsess]').forEach(function (btn) {
        btn.onclick = async function (e) {
          e.stopPropagation();
          if (!confirm('删除该对话？将自动备份后删除。')) return;
          try {
            var res = await API.devDeleteSession(btn.getAttribute('data-delsess'));
            if (res.auto_backup) alert('已删除。备份：' + res.auto_backup);
            document.getElementById('devMessageBox').innerHTML = '';
            await loadDevSessions(userId);
            loadUsers();
            loadOverview();
          } catch (err) {
            alert(err.message);
          }
        };
      });
    } catch (e) {
      box.innerHTML = '<div style="color:var(--error);">' + escapeHtml(e.message) + '</div>';
    }
  }

  async function openDevSession(sessionId) {
    currentDevSessionId = sessionId;
    switchDevTab('sessions');
    const box = document.getElementById('devSessionList');
    box.querySelectorAll('.catalog-item').forEach(function (x) {
      x.classList.toggle('active', String(x.getAttribute('data-sid')) === String(sessionId));
    });
    const msgBox = document.getElementById('devMessageBox');
    msgBox.innerHTML = '<div class="loading-hint">加载消息…</div>';
    try {
      const detail = await API.devSessionMessages(sessionId);
      var sess = detail.session || {};
      var head =
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">' +
        '<strong style="flex:1;">' + escapeHtml(sess.title || '') + '</strong>' +
        '<button type="button" class="btn btn-sm btn-outline" id="btnRenameSess" style="padding:3px 10px;font-size:11px;">改标题</button>' +
        '<button type="button" class="btn btn-sm btn-outline" id="btnSaveSess" style="padding:3px 10px;font-size:11px;">导出保存</button>' +
        '<button type="button" class="session-del-btn" id="btnDelSess">删除会话</button></div>';
      var body = (detail.messages || []).map(function (m) {
        var who = m.role === 'user' ? '用户' : 'AI';
        return '<div class="chat-msg" data-mid="' + m.id + '"><strong>' + who +
          '：</strong><br><div class="dev-msg-body">' + formatMultiline(m.content) + '</div>' +
          '<div class="dev-msg-actions">' +
          '<button type="button" data-edit="' + m.id + '">编辑</button>' +
          '<button type="button" data-delmsg="' + m.id + '">删除</button></div></div>';
      }).join('') || '<div class="loading-hint">无消息</div>';
      msgBox.innerHTML = head + body;

      document.getElementById('btnRenameSess').onclick = async function () {
        var title = prompt('新标题', sess.title || '');
        if (title == null) return;
        try {
          await API.devUpdateSession(sessionId, title);
          await openDevSession(sessionId);
          await loadDevSessions(currentDevUserId);
        } catch (e) {
          alert(e.message);
        }
      };
      document.getElementById('btnSaveSess').onclick = function () {
        var lines = ['# ' + (sess.title || '对话'), '', '账号: ' + (sess.username || ''), '时间: ' + (sess.updated_at || ''), ''];
        (detail.messages || []).forEach(function (m) {
          lines.push((m.role === 'user' ? '【用户】' : '【AI】') + ' ' + (m.created_at || ''));
          lines.push(m.content || '');
          lines.push('');
        });
        var blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = (sess.title || 'chat').slice(0, 30) + '.md';
        a.click();
        URL.revokeObjectURL(url);
      };
      document.getElementById('btnDelSess').onclick = async function () {
        if (!confirm('删除整个会话？')) return;
        try {
          await API.devDeleteSession(sessionId);
          msgBox.innerHTML = '';
          await loadDevSessions(currentDevUserId);
          loadUsers();
        } catch (e) {
          alert(e.message);
        }
      };
      msgBox.querySelectorAll('[data-edit]').forEach(function (btn) {
        btn.onclick = async function () {
          var mid = btn.getAttribute('data-edit');
          var msgEl = msgBox.querySelector('[data-mid="' + mid + '"] .dev-msg-body');
          var oldText = (detail.messages || []).find(function (x) { return String(x.id) === String(mid); });
          var next = prompt('编辑消息内容', oldText ? oldText.content : '');
          if (next == null) return;
          try {
            await API.devUpdateMessage(mid, next);
            await openDevSession(sessionId);
          } catch (e) {
            alert(e.message);
          }
        };
      });
      msgBox.querySelectorAll('[data-delmsg]').forEach(function (btn) {
        btn.onclick = async function () {
          if (!confirm('删除该条消息？')) return;
          try {
            await API.devDeleteMessage(btn.getAttribute('data-delmsg'));
            await openDevSession(sessionId);
            await loadDevSessions(currentDevUserId);
          } catch (e) {
            alert(e.message);
          }
        };
      });
    } catch (e) {
      msgBox.innerHTML = '<div style="color:var(--error);">' + escapeHtml(e.message) + '</div>';
    }
  }

  document.getElementById('devTabs').onclick = function (e) {
    var tab = e.target.getAttribute('data-tab');
    if (!tab) return;
    switchDevTab(tab);
    if (tab === 'sessions' && currentDevUserId && !document.getElementById('devSessionList').innerHTML) {
      loadDevSessions(currentDevUserId);
    }
  };

  async function loadBackups() {
    const box = document.getElementById('backupList');
    if (!box) return;
    const selectAll = document.getElementById('backupSelectAll');
    const btnBatch = document.getElementById('btnBatchDelBackup');
    if (selectAll) selectAll.checked = false;
    if (btnBatch) btnBatch.disabled = true;
    box.innerHTML = '<div class="loading-hint">加载备份列表…</div>';
    try {
      const list = await API.devListBackups();
      if (!list.length) {
        box.innerHTML = '<div class="loading-hint">暂无备份，建议先点「立即备份」</div>';
        return;
      }
      box.innerHTML = list.map(function (b) {
        return '<div class="list-item batchable" style="align-items:flex-start;">' +
          '<input type="checkbox" class="batch-item-check" data-bak="' + escapeHtml(b.filename) + '" title="选择">' +
          '<div style="flex:1; min-width:0;">' +
          '<b>' + escapeHtml(b.filename) + '</b><br>' +
          '<span style="font-size:12px;color:var(--text-muted);">' +
          escapeHtml(b.created_at || '') +
          (b.created_by ? ' · ' + escapeHtml(b.created_by) : '') +
          (b.note ? ' · ' + escapeHtml(b.note) : '') +
          ' · ' + (b.size_kb || 0) + ' KB</span></div>' +
          '<div style="display:flex;gap:8px;flex-shrink:0;">' +
          '<button class="btn btn-sm" type="button" data-restore="' + escapeHtml(b.filename) +
          '" style="padding:3px 12px;font-size:11px;">恢复</button>' +
          '<button class="btn btn-sm btn-outline" type="button" data-delbak="' + escapeHtml(b.filename) +
          '" style="padding:3px 12px;font-size:11px;">删除</button></div></div>';
      }).join('');

      function refreshBatchBtn() {
        var n = box.querySelectorAll('.batch-item-check:checked').length;
        if (btnBatch) btnBatch.disabled = n === 0;
        if (selectAll) {
          var all = box.querySelectorAll('.batch-item-check');
          selectAll.checked = all.length > 0 && n === all.length;
        }
      }
      box.querySelectorAll('.batch-item-check').forEach(function (cb) {
        cb.onchange = refreshBatchBtn;
      });
      if (selectAll) {
        selectAll.onchange = function () {
          box.querySelectorAll('.batch-item-check').forEach(function (cb) {
            cb.checked = selectAll.checked;
          });
          refreshBatchBtn();
        };
      }
      if (btnBatch) {
        btnBatch.onclick = async function () {
          var names = [];
          box.querySelectorAll('.batch-item-check:checked').forEach(function (cb) {
            names.push(cb.getAttribute('data-bak'));
          });
          if (!names.length) return;
          if (!confirm('确认批量删除选中的 ' + names.length + ' 个备份文件？\n（删除前会自动快照一次）')) return;
          btnBatch.disabled = true;
          try {
            var res = await API.devDeleteBackupsBatch(names);
            var msg = '已删除 ' + ((res && res.count) || 0) + ' 个备份';
            if (res && res.auto_backup) msg += '\n自动快照：' + res.auto_backup;
            if (res && res.failed && res.failed.length) msg += '\n失败 ' + res.failed.length + ' 个';
            alert(msg);
            loadBackups();
          } catch (e) {
            alert(e.message);
            btnBatch.disabled = false;
          }
        };
      }

      box.querySelectorAll('[data-restore]').forEach(function (btn) {
        btn.onclick = async function () {
          var name = btn.getAttribute('data-restore');
          if (!confirm('确认恢复备份？\n' + name + '\n\n当前数据会先自动再备份一份，然后整体覆盖。')) return;
          var typed = prompt('请输入 RESTORE 确认恢复（大写）');
          if (typed !== 'RESTORE') {
            alert('已取消');
            return;
          }
          btn.disabled = true;
          try {
            var res = await API.devRestoreBackup(name);
            alert((res.message || '恢复完成') + '\n安全备份：' + (res.safety_backup || ''));
            location.reload();
          } catch (e) {
            alert(e.message);
            btn.disabled = false;
          }
        };
      });
      box.querySelectorAll('[data-delbak]').forEach(function (btn) {
        btn.onclick = async function () {
          var name = btn.getAttribute('data-delbak');
          if (!confirm('删除该备份文件？\n' + name)) return;
          try {
            await API.devDeleteBackup(name);
            loadBackups();
          } catch (e) {
            alert(e.message);
          }
        };
      });
    } catch (e) {
      box.innerHTML = '<div style="color:var(--error);">' + escapeHtml(e.message) + '</div>';
    }
  }

  var btnBak = document.getElementById('btnCreateBackup');
  if (btnBak) {
    btnBak.onclick = async function () {
      btnBak.disabled = true;
      try {
        var note = (document.getElementById('backupNote') || {}).value || '';
        var res = await API.devCreateBackup(note);
        alert('备份成功：' + res.filename);
        document.getElementById('backupNote').value = '';
        loadBackups();
      } catch (e) {
        alert(e.message);
      } finally {
        btnBak.disabled = false;
      }
    };
  }

  async function loadMaintenance() {
    try {
      var st = await API.devGetMaintenance();
      var on = !!st.maintenance;
      var statusEl = document.getElementById('maintStatusText');
      var metaEl = document.getElementById('maintMeta');
      if (statusEl) {
        statusEl.textContent = on ? '当前：维护中' : '当前：未开启';
        statusEl.className = on ? 'maint-status-on' : 'maint-status-off';
      }
      if (metaEl) {
        metaEl.textContent = (st.updated_at ? ('更新于 ' + st.updated_at) : '') +
          (st.updated_by ? (' · ' + st.updated_by) : '');
      }
      var msgInput = document.getElementById('maintMessage');
      if (msgInput && st.maintenance_message && !msgInput.value) {
        msgInput.value = st.maintenance_message;
      }
    } catch (e) {
      /* ignore */
    }
  }

  var btnOn = document.getElementById('btnMaintOn');
  var btnOff = document.getElementById('btnMaintOff');
  if (btnOn) {
    btnOn.onclick = async function () {
      if (!confirm('开启维护模式后，其他账号将无法使用系统，确认？')) return;
      try {
        var msg = (document.getElementById('maintMessage') || {}).value || '';
        await API.devSetMaintenance(true, msg);
        alert('已开启维护模式');
        loadMaintenance();
      } catch (e) {
        alert(e.message);
      }
    };
  }
  if (btnOff) {
    btnOff.onclick = async function () {
      try {
        var msg = (document.getElementById('maintMessage') || {}).value || '';
        await API.devSetMaintenance(false, msg);
        alert('已关闭维护模式');
        loadMaintenance();
      } catch (e) {
        alert(e.message);
      }
    };
  }

  async function loadLlmConfig() {
    var body = document.getElementById('llmCfgBody');
    var status = document.getElementById('llmCfgStatus');
    if (!body) return;
    try {
      var cfg = await API.devGetLlmConfig();
      var presets = [];
      try {
        var pr = await API.devLlmPresets();
        presets = (pr && pr.items) || [];
      } catch (pe) { presets = []; }
      var keyHint = cfg.llm_api_key_configured
        ? '<span style="color:var(--success,#059669);">已配置</span>（留空保存则保持不变，填入新值则覆盖）'
        : '<span style="color:var(--error);">未配置</span>';
      var presetOpts = presets.map(function (p, i) {
        return '<option value="' + escapeHtml(p.name) + '">' + escapeHtml(p.name) +
          ' · ' + escapeHtml(p.llm_model || '-') + ' @ ' + escapeHtml(p.llm_api_base || '-') +
          (p.llm_api_key ? '（含Key）' : '') + '</option>';
      }).join('');
      body.innerHTML =
        '<div class="kb-cfg-preset-row" style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:14px; padding:10px 12px; background:#f8fafc; border:1px solid var(--border); border-radius:10px;">' +
        '<span style="font-size:13px; font-weight:600; color:var(--text);">配置预设/历史：</span>' +
        '<select id="cfgLlmPreset" style="flex:1; min-width:240px; padding:7px 10px; border:1px solid var(--border); border-radius:8px; font-size:13px;">' +
        (presetOpts || '<option value="">（暂无预设）</option>') + '</select>' +
        '<button class="btn btn-sm" type="button" id="btnLlmPresetApply">应用预设</button>' +
        '<button class="btn btn-sm btn-outline" type="button" id="btnLlmPresetSave">存为预设</button>' +
        '<button class="btn btn-sm btn-outline" type="button" id="btnLlmPresetDel" style="color:var(--error);">删除预设</button>' +
        '</div>' +
        '<div class="kb-cfg-grid">' +
        '<div class="form-item"><label>API Base（不要带 /v1）</label>' +
        '<input id="cfgLlmBase" value="' + escapeHtml(cfg.llm_api_base || '') +
        '" placeholder="http://192.168.3.12:8000 或 https://api.deepseek.com"></div>' +
        '<div class="form-item"><label>API Key</label>' +
        '<input id="cfgLlmKey" type="password" placeholder="留空保持不变；填入则覆盖" autocomplete="off"></div>' +
        '<div class="form-item"><label>模型（chat）</label>' +
        '<input id="cfgLlmModel" value="' + escapeHtml(cfg.llm_model || '') +
        '" placeholder="deepseek-chat / yhlo / Qwen2.5-7B"></div>' +
        '<div class="form-item"><label>识图模型（可空，空则回退 chat 模型）</label>' +
        '<input id="cfgLlmVision" value="' + escapeHtml(cfg.llm_vision_model || '') +
        '" placeholder="支持 vision 的模型名"></div>' +
        '<div class="form-item"><label>最大 Tokens</label>' +
        '<input id="cfgLlmMaxTokens" type="number" min="256" max="32768" value="' +
        (cfg.llm_max_tokens || 2048) + '"></div>' +
        '<div class="form-item"><label>思考模式（V4 深度推理，业务问答建议关）</label>' +
        '<label class="batch-check-all"><input type="checkbox" id="cfgLlmThinking"' +
        (cfg.llm_enable_thinking ? ' checked' : '') + '> 开启 thinking</label></div>' +
        '</div>' +
        '<p class="meta" style="margin-top:10px;">当前 Key：' + keyHint +
        ' · .env 路径：<code>' + escapeHtml(cfg.env_path || '') + '</code></p>';
      if (status) status.textContent = '已加载配置';
      bindLlmPresetButtons();
    } catch (e) {
      body.innerHTML = '<div style="color:var(--error);">加载失败：' + escapeHtml(e.message || '') + '</div>';
    }
  }

  function bindLlmPresetButtons() {
    var btnApply = document.getElementById('btnLlmPresetApply');
    var btnSave = document.getElementById('btnLlmPresetSave');
    var btnDel = document.getElementById('btnLlmPresetDel');
    if (btnApply) {
      btnApply.onclick = async function () {
        var sel = document.getElementById('cfgLlmPreset');
        var name = sel && sel.value;
        if (!name) { alert('请先选择一个预设'); return; }
        if (!confirm('应用预设「' + name + '」到 .env 并即时生效？\n（预设含 Key 则一并覆盖；不含 Key 则保持当前 Key）')) return;
        var st = document.getElementById('llmCfgStatus');
        if (st) st.textContent = '应用中…';
        try {
          var res = await API.devApplyLlmPreset(name);
          alert('已应用预设并即时生效。\n' + (res.note || ''));
          loadLlmConfig();
          loadSystemMonitor();
        } catch (e) {
          if (st) st.textContent = '应用失败';
          alert(e.message || '应用失败');
        }
      };
    }
    if (btnSave) {
      btnSave.onclick = async function () {
        var name = prompt('请输入预设名称（同名将覆盖）\n例：DeepSeek 官方 / GPUStack / 我的本地');
        if (!name || !name.trim()) return;
        name = name.trim();
        var base = (document.getElementById('cfgLlmBase') || {}).value || '';
        var model = (document.getElementById('cfgLlmModel') || {}).value || '';
        var vision = (document.getElementById('cfgLlmVision') || {}).value || '';
        var maxTok = (document.getElementById('cfgLlmMaxTokens') || {}).value || 2048;
        var thinking = !!(document.getElementById('cfgLlmThinking') || {}).checked;
        var key = (document.getElementById('cfgLlmKey') || {}).value || '';
        var payload = {
          name: name,
          llm_api_base: base,
          llm_model: model,
          llm_vision_model: vision,
          llm_max_tokens: Number(maxTok || 2048),
          llm_enable_thinking: thinking,
          llm_api_key: key.trim()
        };
        try {
          await API.devSaveLlmPreset(payload);
          alert('预设「' + name + '」已保存' + (key.trim() ? '（含 Key）' : '（未存 Key）'));
          loadLlmConfig();
        } catch (e) {
          alert(e.message || '保存失败');
        }
      };
    }
    if (btnDel) {
      btnDel.onclick = async function () {
        var sel = document.getElementById('cfgLlmPreset');
        var name = sel && sel.value;
        if (!name) { alert('请先选择一个预设'); return; }
        if (!confirm('删除预设「' + name + '」？')) return;
        try {
          await API.devDeleteLlmPreset(name);
          loadLlmConfig();
        } catch (e) {
          alert(e.message || '删除失败');
        }
      };
    }
  }

  var btnSaveLlm = document.getElementById('btnLlmSave');
  if (btnSaveLlm) {
    btnSaveLlm.onclick = async function () {
      var base = (document.getElementById('cfgLlmBase') || {}).value;
      var key = (document.getElementById('cfgLlmKey') || {}).value;
      var model = (document.getElementById('cfgLlmModel') || {}).value;
      var vision = (document.getElementById('cfgLlmVision') || {}).value;
      var maxTok = (document.getElementById('cfgLlmMaxTokens') || {}).value;
      var thinking = !!(document.getElementById('cfgLlmThinking') || {}).checked;
      var payload = {
        llm_api_base: base,
        llm_model: model,
        llm_vision_model: vision,
        llm_enable_thinking: thinking,
        llm_max_tokens: Number(maxTok || 2048)
      };
      // Key：空字符串表示不改；用户若想清空则填一个空格——这里约定空=保持
      if (key && key.trim()) payload.llm_api_key = key.trim();
      if (!confirm('确认保存到 .env 并即时生效？')) return;
      try {
        var res = await API.devSaveLlmConfig(payload);
        alert('已保存并即时生效。\n' + (res.note || '') +
          (res.llm ? '\n模型：' + (res.llm.model || '-') : ''));
        loadLlmConfig();
        loadSystemMonitor();
      } catch (e) {
        alert(e.message || '保存失败');
      }
    };
  }

  var btnProbe = document.getElementById('btnLlmProbe');
  if (btnProbe) {
    btnProbe.onclick = async function () {
      var status = document.getElementById('llmCfgStatus');
      if (status) status.textContent = '探测中…';
      try {
        var r = await API.devProbeLlm();
        if (r.ok) {
          if (status) status.textContent = '连通 OK · DNS ' + (r.dns_ms || '-') +
            'ms / TCP ' + (r.tcp_ms || '-') + 'ms · ' + (r.ip || '');
          alert('连通正常\n主机：' + (r.host || '') + ':' + (r.port || '') +
            '\nIP：' + (r.ip || '-') + '\nDNS ' + (r.dns_ms || '-') + 'ms / TCP ' + (r.tcp_ms || '-') + 'ms');
        } else {
          if (status) status.textContent = '探测失败：' + (r.error || '');
          alert('探测失败：' + (r.error || '未知'));
        }
      } catch (e) {
        if (status) status.textContent = '探测失败';
        alert(e.message || '探测失败');
      }
    };
  }

  try {
    // 只加载当前激活分区（默认概览）；其余分区首次切换时再懒加载
    var openId = sessionStorage.getItem('dev_open_chats_user_id');
    if (openId) {
      var uname = sessionStorage.getItem('dev_open_chats_username') || '';
      sessionStorage.removeItem('dev_open_chats_user_id');
      sessionStorage.removeItem('dev_open_chats_username');
      // 从其它页面带「查看对话」跳来时，直接切到账号管理分区并展开该用户
      switchDevSection('users');
      await loadUsers();
      await openUserDetail(openId, uname);
      var rootPrivate = Auth.isSystemRootUser(uname) && !Auth.isSystemRootUser(Auth.getUser());
      if (!rootPrivate) {
        switchDevTab('sessions');
      }
    } else {
      switchDevSection('overview');
    }
  } catch (e) {
    content.innerHTML = '<div class="no-permission"><h3>加载失败</h3><p>' + escapeHtml(e.message) + '</p></div>';
  }
};

window.initDevMap = function () {
  var denied = document.getElementById('devMapDenied');
  var content = document.getElementById('devMapContent');
  if (!Auth.isDeveloper()) {
    denied.style.display = 'block';
    content.style.display = 'none';
    return;
  }
  denied.style.display = 'none';
  content.style.display = 'block';

  document.getElementById('btnGoDevOps').onclick = function () {
    Router.switchPage('dev');
  };

  document.querySelectorAll('#umlTabs .uml-tab').forEach(function (btn) {
    btn.onclick = function () {
      var key = btn.getAttribute('data-uml');
      document.querySelectorAll('#umlTabs .uml-tab').forEach(function (b) {
        b.classList.toggle('active', b === btn);
      });
      document.querySelectorAll('.uml-panel').forEach(function (p) {
        p.classList.toggle('active', p.id === 'uml-' + key);
      });
      // 切到可见面板后再渲染，避免隐藏态宽高为 0
      renderVisibleMermaid();
      if (key === 'design') {
        var frame = document.getElementById('aiDesignBoardFrame');
        if (frame && !frame.getAttribute('data-loaded')) {
          // 首次切入时强制刷新，避免缓存旧框图
          frame.src = 'pages/ai-design-board.html?t=' + Date.now();
          frame.setAttribute('data-loaded', '1');
        }
      }
    };
  });

  function renderOne(card) {
    var srcEl = card.querySelector('.mermaid-src');
    var out = card.querySelector('.mermaid-render');
    if (!srcEl || !out) return;
    var code = (srcEl.textContent || '').trim();
    if (!code) return;
    if (out.getAttribute('data-done') === '1') return;

    if (!window.mermaid) {
      out.innerHTML = '<pre class="uml-fallback-text">' + escapeHtml(code) +
        '</pre><p class="uml-hint">未加载到 Mermaid 库时显示源码。若内网无法访问 CDN，可将 mermaid 放到 frontend/js/vendor/。</p>';
      return;
    }
    var id = 'mmd_' + Math.random().toString(36).slice(2, 9);
    out.removeAttribute('data-processed');
    out.innerHTML = '';
    window.mermaid
      .render(id, code)
      .then(function (res) {
        out.innerHTML = res.svg;
        out.setAttribute('data-done', '1');
      })
      .catch(function (err) {
        out.innerHTML = '<pre class="uml-fallback-text">' + escapeHtml(code) +
          '</pre><p style="color:var(--error);font-size:12px;">渲染失败：' +
          escapeHtml(err.message || String(err)) + '</p>';
      });
  }

  function renderVisibleMermaid() {
    var panel = document.querySelector('.uml-panel.active');
    if (!panel) return;
    panel.querySelectorAll('.uml-card').forEach(renderOne);
  }

  function ensureMermaid(cb) {
    if (window.mermaid) {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: { curve: 'basis', htmlLabels: true },
        themeVariables: {
          primaryColor: '#eef6ff',
          primaryTextColor: '#1a2a3a',
          primaryBorderColor: '#93c5fd',
          lineColor: '#5e738a',
          secondaryColor: '#f8fafc',
          tertiaryColor: '#ffffff',
          fontSize: '13px'
        }
      });
      cb();
      return;
    }
    var urls = [
      'js/vendor/mermaid.min.js',
      'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
    ];
    var i = 0;
    function tryNext() {
      if (i >= urls.length) {
        cb();
        return;
      }
      var s = document.createElement('script');
      s.src = urls[i++];
      s.onload = function () {
        if (window.mermaid) {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            flowchart: { curve: 'basis', htmlLabels: true },
            themeVariables: {
              primaryColor: '#eef6ff',
              primaryTextColor: '#1a2a3a',
              primaryBorderColor: '#93c5fd',
              lineColor: '#5e738a',
              secondaryColor: '#f8fafc',
              tertiaryColor: '#ffffff',
              fontSize: '13px'
            }
          });
        }
        cb();
      };
      s.onerror = tryNext;
      document.head.appendChild(s);
    }
    tryNext();
  }

  ensureMermaid(function () {
    renderVisibleMermaid();
  });
};

window.initDevUser = async function () {
  const denied = document.getElementById('devUserDenied');
  const content = document.getElementById('devUserContent');
  if (!Auth.isDeveloper()) {
    denied.style.display = 'block';
    content.style.display = 'none';
    document.getElementById('btnBackDevDenied').onclick = function () {
      Router.switchPage('dev');
    };
    return;
  }
  denied.style.display = 'none';
  content.style.display = 'block';

  var userId = sessionStorage.getItem('dev_edit_user_id');
  if (!userId) {
    Router.switchPage('dev');
    return;
  }

  function applyKbCheckboxes(u) {
    var isDevRole = (u.role || '') === 'developer';
    var isGuestRole = (u.role || '') === 'guest';
    var dlCb = document.getElementById('duKbDownload');
    var delCb = document.getElementById('duKbDelete');
    if (!dlCb || !delCb) {
      console.warn('缺少下载/删除权限勾选框，请强制刷新页面 (Ctrl+F5)');
      return;
    }
    dlCb.checked = isDevRole || !!(u.kb_download === true || u.kb_download === 1 || u.kb_download === '1');
    delCb.checked = isDevRole || !!(u.kb_delete === true || u.kb_delete === 1 || u.kb_delete === '1');
    dlCb.disabled = isDevRole || isGuestRole;
    delCb.disabled = isDevRole || isGuestRole;
  }

  function fillPerms(selected) {
    var box = document.getElementById('duPerms');
    var sel = selected || [];
    var all = sel.indexOf('all') >= 0;
    box.innerHTML = APP_CONFIG.CATEGORIES.map(function (c) {
      var checked = all || sel.indexOf(c.id) >= 0 ? ' checked' : '';
      return '<label><input type="checkbox" value="' + c.id + '"' + checked + '> ' + c.label + '</label>';
    }).join('');
  }

  function readPerms() {
    var permissions = [];
    document.getElementById('duPerms').querySelectorAll('input:checked').forEach(function (cb) {
      permissions.push(cb.value);
    });
    return permissions;
  }

  function formatTokens(n) {
    n = Number(n) || 0;
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
  }

  function formatDuration(sec) {
    sec = Number(sec) || 0;
    if (sec < 60) return sec + 's';
    if (sec < 3600) return (sec / 60).toFixed(1) + ' min';
    return (sec / 3600).toFixed(1) + ' h';
  }

  document.getElementById('btnBackDevList').onclick = function () {
    Router.switchPage('dev');
  };

  function syncDuKbOpsByRole() {
    var role = document.getElementById('duRole').value;
    var isDevRole = role === 'developer';
    var isGuestRole = role === 'guest';
    var dlCb = document.getElementById('duKbDownload');
    var delCb = document.getElementById('duKbDelete');
    if (dlCb) {
      if (isDevRole) dlCb.checked = true;
      if (isGuestRole) dlCb.checked = false;
      dlCb.disabled = isDevRole || isGuestRole;
    }
    if (delCb) {
      if (isDevRole) delCb.checked = true;
      if (isGuestRole) delCb.checked = false;
      delCb.disabled = isDevRole || isGuestRole;
    }
  }
  document.getElementById('duRole').onchange = syncDuKbOpsByRole;

  async function loadDetail() {
    try {
      var data = await API.devUserDetail(userId);
      var u = data.user || {};
      var usage = data.usage || {};
      var rootLocked = Auth.isSystemRootUser(u);
      document.getElementById('duId').value = u.id;
      document.getElementById('duUsername').value = u.username || '';
      document.getElementById('duUsername').disabled = rootLocked;
      document.getElementById('duRole').value = u.role || 'user';
      document.getElementById('duRole').disabled = true;
      if (!rootLocked) {
        var me = Auth.getUser();
        document.getElementById('duRole').disabled =
          (me && Number(u.id) === Number(me.id));
      }
      try {
        var tdRes = await API.listStaffTechDirs();
        var dirs = (tdRes && tdRes.items) || [];
        var tdSel = document.getElementById('duTechDir');
        if (tdSel) {
          tdSel.innerHTML = '<option value="">未指定</option>' + dirs.map(function (d) {
            return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>';
          }).join('');
          tdSel.value = u.tech_dir_id != null ? String(u.tech_dir_id) : '';
          tdSel.disabled = false; // 根管理员也可改技术方向
        }
      } catch (eTd) {}
      fillPerms(u.permissions || []);
      applyKbCheckboxes(u);
      // 根账号：其它项只读，技术方向可改
      document.getElementById('duPerms').querySelectorAll('input').forEach(function (cb) {
        cb.disabled = rootLocked;
      });
      var dlCb = document.getElementById('duKbDownload');
      var delCb = document.getElementById('duKbDelete');
      if (dlCb) dlCb.disabled = true;
      if (delCb) delCb.disabled = true;
      if (rootLocked) {
        if (dlCb) dlCb.checked = true;
        if (delCb) delCb.checked = true;
      }
      var btnSave = document.getElementById('btnDuSave');
      var btnReset = document.getElementById('btnDuResetPwd');
      if (btnSave) {
        btnSave.disabled = false;
        btnSave.style.display = '';
        btnSave.textContent = rootLocked ? '保存技术方向' : '保存更改';
      }
      if (btnReset) {
        btnReset.disabled = rootLocked;
        btnReset.style.display = rootLocked ? 'none' : '';
      }
      var btnOpenChats = document.getElementById('btnDuOpenChats');
      if (btnOpenChats) {
        var meNow = Auth.getUser();
        // 根账号对话：仅根管理员本人可进；其他开发者隐藏入口
        if (rootLocked) {
          var canOpenChats = Auth.isSystemRootUser(meNow);
          btnOpenChats.style.display = canOpenChats ? '' : 'none';
          btnOpenChats.disabled = !canOpenChats;
        } else {
          btnOpenChats.style.display = '';
          btnOpenChats.disabled = false;
        }
      }
      document.getElementById('devUserPageTitle').textContent =
        (rootLocked ? '系统根管理员（可改技术方向） · ' : '账号详情 · ') + (u.username || '');
      // 重排后 id 可能变化，始终以接口返回为准
      if (u.id != null) {
        userId = String(u.id);
        sessionStorage.setItem('dev_edit_user_id', userId);
        document.getElementById('duId').value = u.id;
      }
      document.getElementById('duMeta').textContent =
        (rootLocked ? '内置根管理员：仅可改技术方向，不可改名/删除/重置密码。' : '') +
        '状态：' + (u.status || '-') +
        ' · 最近活跃：' + (usage.last_active_at || u.last_active_at || '-') +
        ' · 创建：' + (u.created_at || usage.created_at || '-');
      document.getElementById('duUsage').innerHTML =
        '<div class="usage-grid">' +
        '<div class="usage-metric"><div class="label">总 Tokens</div><div class="value">' +
        formatTokens(usage.total_tokens) + '</div></div>' +
        '<div class="usage-metric"><div class="label">LLM 调用</div><div class="value">' +
        (usage.llm_call_count || 0) + '</div></div>' +
        '<div class="usage-metric"><div class="label">LLM 耗时</div><div class="value">' +
        formatDuration(usage.llm_duration_sec) + '</div></div>' +
        '<div class="usage-metric"><div class="label">会话 / 消息</div><div class="value">' +
        (usage.session_count || 0) + ' / ' + (usage.message_count || 0) + '</div></div></div>' +
        (rootLocked
          ? '<p style="margin-top:12px;font-size:12px;color:var(--error);">系统管理员：不可改权限/密码重置。</p>'
          : '<p style="margin-top:12px;font-size:12px;color:var(--text-muted);">密码字段不可查看，仅支持恢复默认密码。</p>');
    } catch (e) {
      document.getElementById('duUsage').innerHTML =
        '<div style="color:var(--error);">' + escapeHtml(e.message) + '</div>';
    }
  }

  document.getElementById('btnDuSave').onclick = async function () {
    try {
      if (Auth.isSystemRootUser(document.getElementById('duUsername').value)) {
        // 根管理员：仅提交技术方向
        var rootPayload = {};
        var tdRoot = document.getElementById('duTechDir');
        if (tdRoot && tdRoot.value) rootPayload.tech_dir_id = Number(tdRoot.value);
        else rootPayload.clear_tech_dir = true;
        var resRoot = await API.updateUser(userId, rootPayload);
        var savedRoot = (resRoot && resRoot.user) || null;
        alert('技术方向已更新：' + ((savedRoot && savedRoot.tech_dir_name) || '未指定'));
        await loadDetail();
        return;
      }
      var role = document.getElementById('duRole').value;
      var dlEl = document.getElementById('duKbDownload');
      var delEl = document.getElementById('duKbDelete');
      if (!dlEl || !delEl) {
        alert('页面未加载下载/删除权限控件，请按 Ctrl+F5 强制刷新后再试');
        return;
      }
      var payload = {
        username: document.getElementById('duUsername').value.trim(),
        role: role,
        permissions: readPerms()
      };
      var tdSel = document.getElementById('duTechDir');
      if (tdSel) {
        if (tdSel.value) payload.tech_dir_id = Number(tdSel.value);
        else payload.clear_tech_dir = true;
      }
      if (role === 'guest') {
        payload.kb_download = false;
        payload.kb_delete = false;
      } else if (role === 'developer') {
        payload.kb_download = true;
        payload.kb_delete = true;
      } else {
        payload.kb_download = !!dlEl.checked;
        payload.kb_delete = !!delEl.checked;
      }
      var res = await API.updateUser(userId, payload);
      var saved = (res && res.user) || null;
      if (saved && saved.id != null) {
        userId = String(saved.id);
        sessionStorage.setItem('dev_edit_user_id', userId);
        applyKbCheckboxes(saved);
      }
      alert(
        '已保存' +
        (saved
          ? '\n下载：' + (saved.kb_download ? '已开通' : '关闭') +
            '　删除：' + (saved.kb_delete ? '已开通' : '关闭')
          : '')
      );
      await loadDetail();
    } catch (e) {
      alert(e.message);
    }
  };

  document.getElementById('btnDuResetPwd').onclick = async function () {
    var name = document.getElementById('duUsername').value.trim();
    if (Auth.isSystemRootUser(name)) {
      alert('系统内置根管理员不可重置密码');
      return;
    }
    if (!confirm('确认将「' + name + '」密码恢复为默认？\n规则：账号名+123\n（不会显示明文密码）')) return;
    try {
      var res = await API.resetUserPassword(userId);
      alert(res.hint || '已重置为默认密码（账号名+123）');
    } catch (e) {
      alert(e.message);
    }
  };

  document.getElementById('btnDuOpenChats').onclick = function () {
    var uname = document.getElementById('duUsername').value.trim();
    if (Auth.isSystemRootUser(uname) && !Auth.isSystemRootUser(Auth.getUser())) {
      alert('系统内置根管理员的对话不可被查看或编辑');
      return;
    }
    // 回到开发者列表并打开该账号对话管理（沿用原详情面板）
    sessionStorage.setItem('dev_open_chats_user_id', userId);
    sessionStorage.setItem('dev_open_chats_username', uname);
    Router.switchPage('dev');
  };

  await loadDetail();
};

window.initFault = function () {
  let lastReport = null;
  let activeId = null;
  const SS_ID = 'ivd_fault_case_id';

  function clearForm() {
    document.getElementById('faultSymptom').value = '';
    document.getElementById('faultVersion').value = '';
    document.getElementById('faultScene').value = '';
    document.getElementById('faultLog').value = '';
    document.getElementById('faultTags').innerHTML = '';
    document.getElementById('faultReport').innerHTML =
      '<p class="loading-hint">填写左侧信息后开始分析，报告将按：概括 / 根因 / 排查 / 修复 / 测试 输出。</p>';
    document.getElementById('faultActions').style.display = 'none';
    var fr0 = document.getElementById('faultReviseBox');
    if (fr0) fr0.style.display = 'none';
    var fh = document.getElementById('faultReviseHint');
    if (fh) fh.value = '';
    lastReport = null;
    activeId = null;
    sessionStorage.removeItem(SS_ID);
    highlight(null);
  }

  function highlight(id) {
    document.querySelectorAll('#faultHistoryList .list-item').forEach(function (el) {
      el.classList.toggle('active', String(el.getAttribute('data-id')) === String(id || ''));
    });
  }

  function renderCase(data) {
    activeId = data.id;
    sessionStorage.setItem(SS_ID, String(data.id));
    document.getElementById('faultSymptom').value = data.symptom || '';
    document.getElementById('faultVersion').value = data.version || '';
    document.getElementById('faultScene').value = data.scene || '';
    document.getElementById('faultLog').value = data.log_text || '';
    lastReport = { report: data.report, tags: data.tags || [] };
    var tags = (data.tags || []).map(function (t) {
      return '<span class="tag tag-error">' + escapeHtml(t) + '</span>';
    }).join(' ');
    document.getElementById('faultTags').innerHTML = tags;
    renderStructuredInto(document.getElementById('faultReport'), data.report);
    document.getElementById('faultActions').style.display = 'flex';
    var fr = document.getElementById('faultReviseBox');
    if (fr) fr.style.display = 'block';
    highlight(data.id);
  }

  async function openCase(id) {
    try {
      var data = await API.getFaultCase(id);
      renderCase(data);
    } catch (e) {
      document.getElementById('faultReport').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    }
  }

  async function loadHistory() {
    var box = document.getElementById('faultHistoryList');
    try {
      var list = await API.listFaultCases();
      if (!list.length) {
        box.innerHTML = '<div class="list-item loading-hint">暂无历史</div>';
        return;
      }
      box.innerHTML = list.map(function (s) {
        var active = String(s.id) === String(activeId) ? ' active' : '';
        return '<div class="list-item catalog-item session-item' + active + '" data-id="' + s.id + '">' +
          '<span class="session-title" title="' + escapeHtml(s.title || '') + '">' +
          escapeHtml(s.title || '故障分析') + '</span>' +
          '<button type="button" class="session-del-btn" data-del="' + s.id + '">删除</button></div>';
      }).join('');
      box.querySelectorAll('.session-title').forEach(function (el) {
        el.onclick = function () { openCase(el.parentElement.getAttribute('data-id')); };
      });
      box.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = async function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute('data-del');
          if (!confirm('确认删除该历史记录？')) return;
          try {
            await API.deleteFaultCase(id);
            if (String(activeId) === String(id)) clearForm();
            await loadHistory();
          } catch (err) {
            alert(err.message || '删除失败');
          }
        };
      });
    } catch (e) {
      box.innerHTML = '<div class="list-item loading-hint">加载失败：' + escapeHtml(e.message || '') + '</div>';
    }
  }

  document.getElementById('btnNewFault').onclick = clearForm;

  document.getElementById('btnAnalyzeFault').onclick = async function () {
    const payload = {
      symptom: document.getElementById('faultSymptom').value.trim(),
      version: document.getElementById('faultVersion').value.trim(),
      scene: document.getElementById('faultScene').value.trim(),
      log_text: document.getElementById('faultLog').value.trim()
    };
    if (!payload.symptom && !payload.log_text) {
      alert('请至少填写故障现象或日志');
      return;
    }
    const btn = this;
    btn.disabled = true;
    document.getElementById('faultReport').innerHTML = '<p class="loading-hint">分析中…</p>';
    try {
      const res = await API.analyzeFault(payload);
      lastReport = res;
      activeId = res.id;
      if (res.id) sessionStorage.setItem(SS_ID, String(res.id));
      const tags = (res.tags || []).map(function (t) {
        return '<span class="tag tag-error">' + escapeHtml(t) + '</span>';
      }).join(' ');
      document.getElementById('faultTags').innerHTML = tags;
      renderStructuredInto(
        document.getElementById('faultReport'),
        res.report,
        '<p class="loading-hint" style="margin-top:8px;">已自动保存到左侧历史；可在下方追问继续修改</p>'
      );
      document.getElementById('faultActions').style.display = 'flex';
      var frb = document.getElementById('faultReviseBox');
      if (frb) frb.style.display = 'block';
      await loadHistory();
      highlight(res.id);
    } catch (e) {
      document.getElementById('faultReport').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('btnReviseFault').onclick = async function () {
    if (!lastReport || !lastReport.report) {
      alert('请先完成一次分析');
      return;
    }
    var hint = (document.getElementById('faultReviseHint').value || '').trim();
    if (!hint) {
      alert('请填写追问或修改意见');
      return;
    }
    const payload = {
      symptom: document.getElementById('faultSymptom').value.trim(),
      version: document.getElementById('faultVersion').value.trim(),
      scene: document.getElementById('faultScene').value.trim(),
      log_text: document.getElementById('faultLog').value.trim(),
      case_id: activeId || null,
      previous_report: lastReport.report,
      revise_instruction: hint
    };
    const btn = this;
    btn.disabled = true;
    document.getElementById('faultReport').innerHTML = '<p class="loading-hint">按意见修订中…</p>';
    try {
      const res = await API.analyzeFault(payload);
      lastReport = res;
      activeId = res.id;
      if (res.id) sessionStorage.setItem(SS_ID, String(res.id));
      const tags = (res.tags || []).map(function (t) {
        return '<span class="tag tag-error">' + escapeHtml(t) + '</span>';
      }).join(' ');
      document.getElementById('faultTags').innerHTML = tags;
      renderStructuredInto(
        document.getElementById('faultReport'),
        res.report,
        '<p class="loading-hint" style="margin-top:8px;">已按意见更新并保存</p>'
      );
      document.getElementById('faultReviseHint').value = '';
      await loadHistory();
      highlight(res.id);
    } catch (e) {
      document.getElementById('faultReport').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('btnExportFault').onclick = function () {
    const text = document.getElementById('faultReport').innerText;
    navigator.clipboard.writeText(text).then(function () {
      alert('报告已复制到剪贴板');
    });
  };

  (async function () {
    await loadHistory();
    var sid = sessionStorage.getItem(SS_ID);
    if (sid) await openCase(sid);
  })();
};

window.initReview = function () {
  let lastResult = null;
  let activeId = null;
  const SS_ID = 'ivd_review_id';

  function clearForm() {
    document.getElementById('reviewName').value = '';
    document.getElementById('reviewType').selectedIndex = 0;
    document.getElementById('reviewDesc').value = '';
    document.getElementById('reviewResult').innerHTML =
      '<p class="loading-hint">提交需求后，将输出架构影响 / 改造点 / 协议 / 风险 / 测试方案。</p>';
    document.getElementById('reviewActions').style.display = 'none';
    var rr0 = document.getElementById('reviewReviseBox');
    if (rr0) rr0.style.display = 'none';
    var rh = document.getElementById('reviewReviseHint');
    if (rh) rh.value = '';
    lastResult = null;
    activeId = null;
    sessionStorage.removeItem(SS_ID);
    highlight(null);
  }

  function highlight(id) {
    document.querySelectorAll('#reviewHistoryList .list-item').forEach(function (el) {
      el.classList.toggle('active', String(el.getAttribute('data-id')) === String(id || ''));
    });
  }

  function renderReview(data) {
    activeId = data.id;
    sessionStorage.setItem(SS_ID, String(data.id));
    document.getElementById('reviewName').value = data.name || '';
    var typeEl = document.getElementById('reviewType');
    if (data.type) {
      for (var i = 0; i < typeEl.options.length; i++) {
        if (typeEl.options[i].value === data.type || typeEl.options[i].text === data.type) {
          typeEl.selectedIndex = i;
          break;
        }
      }
    }
    document.getElementById('reviewDesc').value = data.description || '';
    lastResult = { report: data.report };
    renderStructuredInto(document.getElementById('reviewResult'), data.report);
    document.getElementById('reviewActions').style.display = 'flex';
    var rrb = document.getElementById('reviewReviseBox');
    if (rrb) rrb.style.display = 'block';
    highlight(data.id);
  }

  async function openReview(id) {
    try {
      var data = await API.getReviewHistory(id);
      renderReview(data);
    } catch (e) {
      document.getElementById('reviewResult').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    }
  }

  async function loadHistory() {
    var box = document.getElementById('reviewHistoryList');
    try {
      var list = await API.listReviewHistory();
      if (!list.length) {
        box.innerHTML = '<div class="list-item loading-hint">暂无历史</div>';
        return;
      }
      box.innerHTML = list.map(function (s) {
        var active = String(s.id) === String(activeId) ? ' active' : '';
        return '<div class="list-item catalog-item session-item' + active + '" data-id="' + s.id + '">' +
          '<span class="session-title" title="' + escapeHtml(s.title || '') + '">' +
          escapeHtml(s.title || '需求评审') + '</span>' +
          '<button type="button" class="session-del-btn" data-del="' + s.id + '">删除</button></div>';
      }).join('');
      box.querySelectorAll('.session-title').forEach(function (el) {
        el.onclick = function () { openReview(el.parentElement.getAttribute('data-id')); };
      });
      box.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = async function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute('data-del');
          if (!confirm('确认删除该历史记录？')) return;
          try {
            await API.deleteReviewHistory(id);
            if (String(activeId) === String(id)) clearForm();
            await loadHistory();
          } catch (err) {
            alert(err.message || '删除失败');
          }
        };
      });
    } catch (e) {
      box.innerHTML = '<div class="list-item loading-hint">加载失败：' + escapeHtml(e.message || '') + '</div>';
    }
  }

  document.getElementById('btnNewReview').onclick = clearForm;

  document.getElementById('btnStartReview').onclick = async function () {
    const payload = {
      name: document.getElementById('reviewName').value.trim(),
      type: document.getElementById('reviewType').value,
      description: document.getElementById('reviewDesc').value.trim()
    };
    if (!payload.name || !payload.description) {
      alert('请填写需求名称和描述');
      return;
    }
    const btn = this;
    btn.disabled = true;
    document.getElementById('reviewResult').innerHTML = '<p class="loading-hint">评审中…</p>';
    try {
      const res = await API.reviewRequirement(payload);
      lastResult = res;
      activeId = res.id;
      if (res.id) sessionStorage.setItem(SS_ID, String(res.id));
      renderStructuredInto(
        document.getElementById('reviewResult'),
        res.report,
        '<p class="loading-hint" style="margin-top:8px;">已自动保存到左侧历史；可在下方追问继续修改</p>'
      );
      document.getElementById('reviewActions').style.display = 'flex';
      var rrb2 = document.getElementById('reviewReviseBox');
      if (rrb2) rrb2.style.display = 'block';
      await loadHistory();
      highlight(res.id);
    } catch (e) {
      document.getElementById('reviewResult').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('btnReviseReview').onclick = async function () {
    if (!lastResult || !lastResult.report) {
      alert('请先完成一次评审');
      return;
    }
    var hint = (document.getElementById('reviewReviseHint').value || '').trim();
    if (!hint) {
      alert('请填写追问或修改意见');
      return;
    }
    const payload = {
      name: document.getElementById('reviewName').value.trim(),
      type: document.getElementById('reviewType').value,
      description: document.getElementById('reviewDesc').value.trim(),
      review_id: activeId || null,
      previous_report: lastResult.report,
      revise_instruction: hint
    };
    if (!payload.name || !payload.description) {
      alert('请填写需求名称和描述');
      return;
    }
    const btn = this;
    btn.disabled = true;
    document.getElementById('reviewResult').innerHTML = '<p class="loading-hint">按意见修订中…</p>';
    try {
      const res = await API.reviewRequirement(payload);
      lastResult = res;
      activeId = res.id;
      if (res.id) sessionStorage.setItem(SS_ID, String(res.id));
      renderStructuredInto(
        document.getElementById('reviewResult'),
        res.report,
        '<p class="loading-hint" style="margin-top:8px;">已按意见更新并保存</p>'
      );
      document.getElementById('reviewReviseHint').value = '';
      await loadHistory();
      highlight(res.id);
    } catch (e) {
      document.getElementById('reviewResult').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('btnExportReview').onclick = function () {
    const text = document.getElementById('reviewResult').innerText;
    navigator.clipboard.writeText(text).then(function () {
      alert('方案已复制到剪贴板');
    });
  };

  (async function () {
    await loadHistory();
    var sid = sessionStorage.getItem(SS_ID);
    if (sid) await openReview(sid);
  })();
};

window.initReport = function () {
  let lastResult = null;
  let selectedTemplateId = null;
  let activeId = null;
  const SS_ID = 'ivd_report_draft_id';

  function highlight(id) {
    document.querySelectorAll('#reportHistoryList .list-item').forEach(function (el) {
      el.classList.toggle('active', String(el.getAttribute('data-id')) === String(id || ''));
    });
  }

  function clearForm() {
    document.getElementById('reportTitle').value = '';
    document.getElementById('reportType').selectedIndex = 0;
    document.getElementById('reportAudience').value = '';
    document.getElementById('reportRequirements').value = '';
    document.getElementById('reportOutline').value = '';
    document.getElementById('reportTemplateSelect').value = '';
    document.getElementById('reportReviseHint').value = '';
    document.getElementById('reportResult').innerHTML =
      '<p class="loading-hint">填写标题与编写要求后生成。系统将检索故障库等知识并调用 AI；右侧可按意见反复修订。</p>';
    document.getElementById('reportSources').innerHTML = '';
    document.getElementById('reportRetrievalMeta').textContent = '';
    document.getElementById('reportActions').style.display = 'none';
    document.getElementById('reportReviseBox').style.display = 'none';
    lastResult = null;
    activeId = null;
    selectedTemplateId = null;
    sessionStorage.removeItem(SS_ID);
    highlight(null);
    applyTemplate('');
  }

  function renderSources(sources) {
    var el = document.getElementById('reportSources');
    if (!el) return;
    if (!sources || !sources.length) {
      el.innerHTML = '<span class="meta">未命中知识库片段（请先上传故障案例 / 规范 / 模版）</span>';
      return;
    }
    el.innerHTML = '<span class="meta">溯源：</span>' + sources.map(function (s) {
      return '<span class="tag tag-report" style="color:#fff;margin:2px;">' + escapeHtml(s) + '</span>';
    }).join(' ');
  }

  function renderRetrievalMeta(res) {
    var el = document.getElementById('reportRetrievalMeta');
    if (!el) return;
    var ret = (res && res.retrieval) || {};
    var by = ret.by_category || {};
    var parts = [];
    if (res && res.used_template && res.template_name) {
      parts.push('结构加权模版：' + res.template_name);
    } else {
      parts.push('未使用模版');
    }
    if (ret.hit_count != null) parts.push('检索片段 ' + ret.hit_count + ' 条');
    var catBits = Object.keys(by).map(function (k) { return k + '=' + by[k]; });
    if (catBits.length) parts.push('分类：' + catBits.join('，'));
    el.textContent = parts.join(' · ');
  }

  function showResult(res) {
    lastResult = res;
    if (res.id) {
      activeId = res.id;
      sessionStorage.setItem(SS_ID, String(res.id));
    }
    renderStructuredInto(
      document.getElementById('reportResult'),
      res.report,
      '<p class="loading-hint" style="margin-top:8px;">已自动保存到左侧历史；可在下方追问继续修改</p>'
    );
    renderSources(res.sources);
    renderRetrievalMeta(res);
    document.getElementById('reportActions').style.display = 'flex';
    document.getElementById('reportReviseBox').style.display = 'block';
    highlight(activeId);
  }

  function collectBase() {
    var tid = document.getElementById('reportTemplateSelect').value;
    return {
      title: document.getElementById('reportTitle').value.trim(),
      report_type: document.getElementById('reportType').value,
      audience: document.getElementById('reportAudience').value.trim(),
      requirements: document.getElementById('reportRequirements').value.trim(),
      outline: document.getElementById('reportOutline').value.trim(),
      template_doc_id: tid ? Number(tid) : null
    };
  }

  function extractTemplateOutline(content) {
    var text = String(content || '').replace(/\r\n/g, '\n').trim();
    if (!text) return '';
    var lines = text.split('\n');
    var heads = [];
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (!line) continue;
      if (/^#{1,6}\s+/.test(line) ||
          /^第[一二三四五六七八九十百千0-9]+[章节条款部分]/.test(line) ||
          /^\d+(\.\d+)*[\.、)\s]/.test(line) ||
          /^[（(]?[一二三四五六七八九十]+[）)]/.test(line)) {
        heads.push(line.replace(/^#+\s*/, ''));
      }
      if (heads.length >= 40) break;
    }
    if (heads.length >= 3) {
      return heads.join('\n');
    }
    var preview = lines.filter(function (l) { return l.trim(); }).slice(0, 24).join('\n');
    if (preview.length > 1200) preview = preview.slice(0, 1200) + '\n…';
    return preview;
  }

  async function applyTemplate(docId) {
    var hint = document.getElementById('reportTemplateHint');
    if (!docId) {
      selectedTemplateId = null;
      if (hint) {
        hint.textContent = '未使用模版：将按编写要求检索知识库（含故障库）并由 AI 综合生成。';
      }
      return;
    }
    try {
      var data = await API.getReportTemplateContent(docId);
      selectedTemplateId = data.id;
      var outline = document.getElementById('reportOutline');
      if (outline && !(outline.value || '').trim()) {
        outline.value = extractTemplateOutline(data.content || '');
      }
      if (hint) {
        hint.textContent = '已选《' + (data.filename || '') + '》作结构加权；正文仍综合故障库等知识库与你的要求生成。';
      }
    } catch (e) {
      if (hint) hint.textContent = e.message;
    }
  }

  async function loadTemplates() {
    var sel = document.getElementById('reportTemplateSelect');
    var hint = document.getElementById('reportTemplateHint');
    try {
      var res = await API.listReportTemplates();
      var items = (res && res.items) || [];
      sel.innerHTML = '<option value="">不使用模版（按要求 + 知识库综合生成）</option>' +
        items.map(function (it) {
          return '<option value="' + it.id + '">' + escapeHtml(it.filename) + '</option>';
        }).join('');
      sel.value = '';
      await applyTemplate('');
      if (!items.length && hint) {
        hint.textContent = '暂无报告模版也可直接生成；需要结构加权时可上传「报告模版与案例」。';
      }
    } catch (e) {
      sel.innerHTML = '<option value="">不使用模版</option>';
      if (hint) hint.textContent = e.message || '模版列表加载失败，仍可不选模版直接生成。';
    }
  }

  async function openDraft(id) {
    try {
      var data = await API.getReportHistory(id);
      activeId = data.id;
      sessionStorage.setItem(SS_ID, String(data.id));
      document.getElementById('reportTitle').value = data.title || '';
      var typeEl = document.getElementById('reportType');
      if (data.report_type) {
        for (var i = 0; i < typeEl.options.length; i++) {
          if (typeEl.options[i].value === data.report_type || typeEl.options[i].text === data.report_type) {
            typeEl.selectedIndex = i;
            break;
          }
        }
      }
      document.getElementById('reportAudience').value = data.audience || '';
      document.getElementById('reportRequirements').value = data.requirements || '';
      document.getElementById('reportOutline').value = data.outline || '';
      lastResult = {
        id: data.id,
        report: data.report || {},
        draft_markdown: data.draft_markdown || '',
        sources: []
      };
      renderStructuredInto(document.getElementById('reportResult'), data.report);
      document.getElementById('reportSources').innerHTML = '';
      document.getElementById('reportRetrievalMeta').textContent = '来自历史草稿 · ' + (data.created_at || '');
      document.getElementById('reportActions').style.display = 'flex';
      document.getElementById('reportReviseBox').style.display = 'block';
      highlight(data.id);
    } catch (e) {
      document.getElementById('reportResult').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    }
  }

  async function loadHistory() {
    var box = document.getElementById('reportHistoryList');
    if (!box) return;
    try {
      var list = await API.listReportHistory();
      if (!list.length) {
        box.innerHTML = '<div class="list-item loading-hint">暂无历史</div>';
        return;
      }
      box.innerHTML = list.map(function (s) {
        var active = String(s.id) === String(activeId) ? ' active' : '';
        return '<div class="list-item catalog-item session-item' + active + '" data-id="' + s.id + '">' +
          '<span class="session-title" title="' + escapeHtml(s.title || '') + '">' +
          escapeHtml(s.title || '报告草稿') + '</span>' +
          '<button type="button" class="session-del-btn" data-del="' + s.id + '">删除</button></div>';
      }).join('');
      box.querySelectorAll('.session-title').forEach(function (el) {
        el.onclick = function () { openDraft(el.parentElement.getAttribute('data-id')); };
      });
      box.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = async function (e) {
          e.preventDefault();
          e.stopPropagation();
          var id = btn.getAttribute('data-del');
          if (!confirm('确认删除该历史记录？')) return;
          try {
            await API.deleteReportHistory(id);
            if (String(activeId) === String(id)) clearForm();
            await loadHistory();
          } catch (err) {
            alert(err.message || '删除失败');
          }
        };
      });
    } catch (e) {
      box.innerHTML = '<div class="list-item loading-hint">加载失败：' + escapeHtml(e.message || '') + '</div>';
    }
  }

  document.getElementById('btnNewReport').onclick = clearForm;

  document.getElementById('reportTemplateSelect').onchange = function () {
    applyTemplate(this.value);
  };

  document.getElementById('btnGenerateReport').onclick = async function () {
    var payload = collectBase();
    if (!payload.title || !payload.requirements) {
      alert('请填写报告标题和编写要求');
      return;
    }
    var btn = this;
    btn.disabled = true;
    document.getElementById('reportResult').innerHTML =
      '<p class="loading-hint">正在检索知识库（含故障库）并调用 AI 综合生成…</p>';
    try {
      var res = await API.generateReport(payload);
      showResult(res);
      await loadHistory();
    } catch (e) {
      document.getElementById('reportResult').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    } finally {
      btn.disabled = false;
    }
  };

  document.getElementById('btnReviseReport').onclick = async function () {
    if (!lastResult) {
      alert('请先生成一版草稿');
      return;
    }
    var hint = document.getElementById('reportReviseHint').value.trim();
    if (!hint) {
      alert('请填写修改意见');
      return;
    }
    var payload = collectBase();
    payload.previous_draft = lastResult.draft_markdown || '';
    payload.revise_instruction = hint;
    if (!payload.requirements && payload.previous_draft) {
      payload.requirements = '（基于上一稿修订）';
    }
    var btn = this;
    btn.disabled = true;
    document.getElementById('reportResult').innerHTML =
      '<p class="loading-hint">正在按意见修订（仍会检索知识库）…</p>';
    try {
      var res = await API.generateReport(payload);
      showResult(res);
      document.getElementById('reportReviseHint').value = '';
      await loadHistory();
    } catch (e) {
      document.getElementById('reportResult').innerHTML =
        '<p style="color:var(--error);">' + escapeHtml(e.message) + '</p>';
    } finally {
      btn.disabled = false;
    }
  };

  async function doExport(fmt) {
    if (!lastResult) return;
    try {
      var base = collectBase();
      await API.exportReport({
        title: base.title || '报告草稿',
        draft_markdown: lastResult.draft_markdown || '',
        report: lastResult.report || {},
        format: fmt
      });
    } catch (e) {
      alert(e.message);
    }
  }

  document.getElementById('btnExportDocx').onclick = function () {
    doExport('docx');
  };
  document.getElementById('btnExportMd').onclick = function () {
    doExport('md');
  };

  document.getElementById('btnCopyReport').onclick = function () {
    if (!lastResult) return;
    var text = lastResult.draft_markdown || (lastResult.report && lastResult.report['正文草稿']) || '';
    navigator.clipboard.writeText(text).then(function () {
      alert('正文草稿已复制到剪贴板');
    });
  };

  document.getElementById('btnCopyReportAll').onclick = function () {
    var text = document.getElementById('reportResult').innerText;
    navigator.clipboard.writeText(text).then(function () {
      alert('全部结果已复制到剪贴板');
    });
  };

  (async function () {
    await loadTemplates();
    await loadHistory();
    var sid = sessionStorage.getItem(SS_ID);
    if (sid) await openDraft(sid);
  })();
};

window.initKnowledge = function () {
  let currentCategory = '';
  let currentFolderId = null;
  let currentFolderName = '';
  // loadDocs 并发守卫：仅最后一次调用的结果才渲染，避免旧请求覆盖新列表（文件夹偶发不显示的根因）
  let loadDocsSeq = 0;
  let loadDocsInFlight = null;
  const cats = APP_CONFIG.CATEGORIES;
  const techDirSet = {};
  (APP_CONFIG.KB_TECH_DIRS || [
    'software', 'hardware', 'mech', 'system', 'transfer', 'aftersales', 'staff'
  ]).forEach(function (id) { techDirSet[id] = true; });
  const techCats = cats.filter(function (c) { return !!techDirSet[c.id]; });
  const otherCats = cats.filter(function (c) {
    return c.id !== 'default' && !techDirSet[c.id];
  });
  const catalog = document.getElementById('knowledgeCatalog');
  const uploadCat = document.getElementById('uploadCategory');
  const crumb = document.getElementById('kbBreadcrumb');
  const uploadTarget = document.getElementById('kbUploadTarget');
  const ACCEPT_HINT = 'PDF / MD / TXT / DOCX / CSV / LOG / XLSX / JSON / INI / LUA';

  function catLabel(id) {
    var hit = cats.find(function (c) { return c.id === id; });
    return hit ? hit.label : id;
  }

  /** 必须先拷贝 FileList：清空 input.value 后原 FileList 会变空，批量上传会「成功 0」 */
  function snapshotFiles(fileList) {
    return Array.prototype.slice.call(fileList || []);
  }

  function syncCatalogActive() {
    if (!catalog) return;
    catalog.querySelectorAll('.kb-section-tab').forEach(function (el) {
      el.classList.toggle(
        'active',
        (el.getAttribute('data-cat') || '') === (currentCategory || '')
      );
    });
  }

  function uploadDestination() {
    var category = currentFolderId
      ? (currentCategory || (uploadCat && uploadCat.value) || '')
      : ((uploadCat && uploadCat.value) || currentCategory || '');
    var folderId = currentFolderId || null;
    var folderName = currentFolderId ? (currentFolderName || '文件夹') : '';
    var where = catLabel(category) || category || '（未选分类）';
    if (folderId) where += ' / ' + folderName;
    else where += ' / 根目录';
    return { category: category, folderId: folderId, folderName: folderName, where: where };
  }

  function renderUploadTarget() {
    if (!uploadTarget) return;
    var dest = uploadDestination();
    uploadTarget.innerHTML =
      '目标 <strong>' + escapeHtml(dest.where) + '</strong>';
  }

  function renderBreadcrumb() {
    if (!crumb) return;
    if (!currentCategory) {
      crumb.innerHTML =
        '<span class="kb-finder-path">知识库</span>' +
        '<span class="kb-crumb-sep">›</span><span>总览</span>';
      return;
    }
    var html =
      '<a href="#" data-crumb="home">知识库</a>' +
      '<span class="kb-crumb-sep">›</span>' +
      '<a href="#" data-crumb="' + (currentFolderId ? 'up' : 'home') + '">' +
      escapeHtml(catLabel(currentCategory)) + '</a>';
    if (currentFolderId) {
      html +=
        '<span class="kb-crumb-sep">›</span>' +
        '<span>' + escapeHtml(currentFolderName || '文件夹') + '</span>';
    }
    crumb.innerHTML = html;
    crumb.querySelectorAll('[data-crumb]').forEach(function (a) {
      a.onclick = function (e) {
        e.preventDefault();
        var kind = a.getAttribute('data-crumb');
        if (kind === 'home') {
          currentCategory = '';
          currentFolderId = null;
          currentFolderName = '';
          syncCatalogActive();
        } else {
          currentFolderId = null;
          currentFolderName = '';
        }
        loadDocs();
      };
    });
  }

  function renderCatalogAndUpload(list) {
    var tech = list.filter(function (c) { return !!techDirSet[c.id]; });
    var other = list.filter(function (c) {
      return c.id !== 'default' && !techDirSet[c.id];
    });
    var def = list.filter(function (c) { return c.id === 'default'; });
    var html =
      '<button type="button" class="kb-section-tab' + (currentCategory ? '' : ' active') +
      '" data-cat="" role="tab">总览</button>' +
      tech.map(function (c) {
        var active = currentCategory === c.id ? ' active' : '';
        return '<button type="button" class="kb-section-tab' + active +
          '" data-cat="' + c.id + '" role="tab">' + escapeHtml(c.label) + '</button>';
      }).join('') +
      other.map(function (c) {
        var active = currentCategory === c.id ? ' active' : '';
        return '<button type="button" class="kb-section-tab' + active +
          '" data-cat="' + c.id + '" role="tab">' + escapeHtml(c.label) + '</button>';
      }).join('') +
      def.map(function (c) {
        var active = currentCategory === c.id ? ' active' : '';
        return '<button type="button" class="kb-section-tab kb-section-tab-default' + active +
          '" data-cat="' + c.id + '" role="tab">' + escapeHtml(c.label) + '</button>';
      }).join('');
    catalog.innerHTML = html;

    var prev = uploadCat.value;
    uploadCat.innerHTML = list.map(function (c) {
      return '<option value="' + c.id + '">' + escapeHtml(c.label) + '</option>';
    }).join('');
    if (prev && list.some(function (c) { return c.id === prev; })) {
      uploadCat.value = prev;
    } else if (currentCategory && list.some(function (c) { return c.id === currentCategory; })) {
      uploadCat.value = currentCategory;
    } else if (list.some(function (c) { return c.id === 'default'; })) {
      uploadCat.value = 'default';
    }

    catalog.querySelectorAll('.kb-section-tab').forEach(function (el) {
      el.onclick = function () {
        currentCategory = el.getAttribute('data-cat') || '';
        currentFolderId = null;
        currentFolderName = '';
        syncCatalogActive();
        if (currentCategory && uploadCat.querySelector('option[value="' + currentCategory + '"]')) {
          uploadCat.value = currentCategory;
        }
        loadDocs();
      };
    });
  }

  renderCatalogAndUpload(cats);

  API.listKnowledgeCategories().then(function (res) {
    var serverIds = (res && res.all) || [];
    if (!serverIds.length) return;
    var missing = cats.filter(function (c) { return serverIds.indexOf(c.id) < 0; });
    if (missing.length) {
      var tip = document.createElement('div');
      tip.className = 'list-item';
      tip.style.color = 'var(--error)';
      tip.style.fontSize = '12px';
      tip.style.marginBottom = '8px';
      tip.textContent = '后端未识别分类：' + missing.map(function (c) { return c.label; }).join('、') +
        '。请重启 启动Agent.bat 后再上传（当前 /api/health 需含最新 build）。';
      if (uploadCat.parentNode) uploadCat.parentNode.insertBefore(tip, uploadCat);
      var ok = cats.filter(function (c) { return serverIds.indexOf(c.id) >= 0; });
      if (ok.length) renderCatalogAndUpload(ok);
    }
  }).catch(function () { /* 忽略：旧后端无此接口 */ });

  async function loadDocs() {
    const box = document.getElementById('docList');
    const toolbar = document.getElementById('docBatchToolbar');
    const selectAll = document.getElementById('docSelectAll');
    const btnBatch = document.getElementById('btnBatchDelDocs');
    const btnNewFolder = document.getElementById('btnNewFolder');
    const mySeq = ++loadDocsSeq;
    try {
      var meKb = await API.me();
      if (meKb && meKb.id != null) Auth.updateCurrentUser(meKb);
    } catch (e0) { /* ignore */ }
    if (mySeq !== loadDocsSeq) return; // 已有更新的请求，丢弃本次
    var canDel = Auth.canDeleteKb();
    var canDl = Auth.canDownloadKb();
    var canWrite = !(Auth.isGuest && Auth.isGuest());
    if (toolbar) toolbar.style.display = (canWrite && currentCategory) ? 'flex' : 'none';
    if (selectAll) selectAll.checked = false;
    if (btnBatch) {
      btnBatch.disabled = true;
      btnBatch.style.display = canDel ? '' : 'none';
    }
    var btnRoot0 = document.getElementById('btnMoveToRoot');
    if (btnRoot0) btnRoot0.disabled = true;
    if (btnNewFolder) {
      // 仅进入某一技术方向/分类根后可新建文件夹；总览与子文件夹内不显示
      btnNewFolder.style.display = (currentCategory && !currentFolderId) ? '' : 'none';
      btnNewFolder.disabled = false;
    }
    if (uploadCat) {
      uploadCat.disabled = !!currentFolderId;
      if (currentFolderId && currentCategory) uploadCat.value = currentCategory;
      else if (currentCategory) uploadCat.value = currentCategory;
    }
    renderBreadcrumb();
    renderUploadTarget();
    if (typeof updateProtocolSyncVisibility === 'function') {
      updateProtocolSyncVisibility();
    }
    box.innerHTML = '<div class="list-item loading-hint">加载中…</div>';

    try {
      var folders = [];
      // 「全部分类」拉全部可见文件夹；指定分类只拉该分类。勿用 uploadCat 冒充浏览分类。
      if (!currentFolderId) {
        try {
          var fr = currentCategory
            ? await API.listKbFolders(currentCategory)
            : await API.listKbFolders();
          if (mySeq !== loadDocsSeq) return; // 丢弃过期结果
          folders = (fr && fr.items) || [];
        } catch (fe) {
          if (mySeq !== loadDocsSeq) return;
          folders = [];
        }
      }

      var docs;
      if (currentFolderId) {
        var inCat = currentCategory || (uploadCat && uploadCat.value) || '';
        if (!inCat) {
          if (mySeq === loadDocsSeq)
            box.innerHTML = '<div class="list-item" style="color:var(--error);">无法确定分类，请返回上级后重新进入文件夹</div>';
          return;
        }
        if (!currentCategory) currentCategory = inCat;
        docs = await API.listDocuments(inCat, currentFolderId);
      } else if (currentCategory) {
        docs = await API.listDocuments(currentCategory);
      } else {
        docs = await API.listDocuments();
      }
      if (mySeq !== loadDocsSeq) return; // 丢弃过期结果，防止旧请求覆盖新列表

      if (docs.length) {
        if (docs[0].can_download != null) canDl = !!docs[0].can_download;
        if (docs[0].can_delete != null) canDel = !!docs[0].can_delete;
        if (toolbar) toolbar.style.display = canDel ? 'flex' : 'none';
      }

      // ---- 紧凑文件管理器：总览用小图标网格，进入后文件夹与文件统一密列表 ----
      var FOLDER_GLYPH =
        '<svg class="kb-folder-glyph" viewBox="0 0 68 52" aria-hidden="true">' +
        '<path class="kb-folder-back" d="M6 12a3 3 0 0 1 3-3h15l5 6h30a3 3 0 0 1 3 3v3H6z" fill="#e0a93a" stroke="#b9821f" stroke-width="1"/>' +
        '<path class="kb-folder-front" d="M6 18h56v26a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="#f3c969" stroke="#b9821f" stroke-width="1"/>' +
        '</svg>';
      var FOLDER_GLYPH_SM =
        '<svg viewBox="0 0 68 52" aria-hidden="true">' +
        '<path class="kb-folder-back" d="M6 12a3 3 0 0 1 3-3h15l5 6h30a3 3 0 0 1 3 3v3H6z" fill="#e0a93a" stroke="#b9821f" stroke-width="1"/>' +
        '<path class="kb-folder-front" d="M6 18h56v26a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3z" fill="#f3c969" stroke="#b9821f" stroke-width="1"/>' +
        '</svg>';

      function fileExtClass(name) {
        var m = String(name || '').match(/\.([a-z0-9]+)$/i);
        var ext = m ? m[1].toLowerCase() : 'file';
        return 'ext-' + ext;
      }
      function fileExtLabel(name) {
        var m = String(name || '').match(/\.([a-z0-9]+)$/i);
        return m ? m[1].toUpperCase() : 'FILE';
      }

      function folderCard(opts) {
        var cls = 'kb-folder-card' + (opts.isCat ? ' is-cat' : '') + (opts.isDefault ? ' is-default' : '');
        var tint = opts.tint || opts.cat || '';
        var meta = opts.meta ? '<span class="kb-folder-card-meta">' + opts.meta + '</span>' : '';
        var del = opts.canDel
          ? '<button type="button" class="kb-folder-card-del" data-del-folder="' + opts.delId + '" title="删除文件夹">删</button>'
          : '';
        return '<div class="' + cls + '" data-open-folder="' + opts.openId +
          '" data-folder-name="' + escapeHtml(opts.name) +
          '" data-folder-cat="' + escapeHtml(opts.cat) +
          '" data-tint="' + escapeHtml(tint) + '">' + del +
          FOLDER_GLYPH +
          '<span class="kb-folder-card-name">' + escapeHtml(opts.name) + '</span>' +
          meta + '</div>';
      }

      function folderEntryRow(opts) {
        var tint = opts.tint || opts.cat || '';
        var del = opts.canDel
          ? '<button type="button" class="kb-entry-del" data-del-folder="' + opts.delId + '" title="删除文件夹">删</button>'
          : '';
        return '<div class="kb-entry-row" data-open-folder="' + opts.openId +
          '" data-folder-name="' + escapeHtml(opts.name) +
          '" data-folder-cat="' + escapeHtml(opts.cat) +
          '" data-tint="' + escapeHtml(tint) + '">' +
          '<span class="kb-entry-icon">' + FOLDER_GLYPH_SM + '</span>' +
          '<span class="kb-entry-name">' + escapeHtml(opts.name) + '</span>' +
          (opts.meta ? '<span class="kb-entry-meta">' + opts.meta + '</span>' : '') +
          del + '</div>';
      }

      var gridParts = [];
      // 总览：技术方向与「默认」同级；计数 = 根目录文件 + 夹内文件
      if (!currentCategory) {
        var foldersByCat = {};
        var docsInFoldersByCat = {};
        var rootDocsByCat = {};
        folders.forEach(function (f) {
          var c = f.category || '';
          foldersByCat[c] = (foldersByCat[c] || 0) + 1;
          docsInFoldersByCat[c] = (docsInFoldersByCat[c] || 0) + (Number(f.doc_count) || 0);
        });
        docs.forEach(function (d) {
          var c = d.category || 'default';
          rootDocsByCat[c] = (rootDocsByCat[c] || 0) + 1;
        });
        gridParts.push('<div class="kb-folder-section-title">技术方向</div><div class="kb-folder-grid">');
        techCats.forEach(function (c) {
          var nFold = foldersByCat[c.id] || 0;
          var nDoc = (rootDocsByCat[c.id] || 0) + (docsInFoldersByCat[c.id] || 0);
          gridParts.push(folderCard({
            openId: '__cat__' + c.id,
            name: c.label,
            cat: c.id,
            tint: c.id,
            isCat: true,
            meta: nDoc + ' 文件' + (nFold ? (' · ' + nFold + ' 夹') : ''),
            canDel: false
          }));
        });
        gridParts.push('</div>');
        if (otherCats.length) {
          gridParts.push('<div class="kb-folder-section-title">其它</div><div class="kb-folder-grid">');
          otherCats.forEach(function (c) {
            var nFold = foldersByCat[c.id] || 0;
            var nDoc = (rootDocsByCat[c.id] || 0) + (docsInFoldersByCat[c.id] || 0);
            gridParts.push(folderCard({
              openId: '__cat__' + c.id,
              name: c.label,
              cat: c.id,
              tint: c.id,
              isCat: true,
              meta: nDoc + ' 文件' + (nFold ? (' · ' + nFold + ' 夹') : ''),
              canDel: false
            }));
          });
          gridParts.push('</div>');
        }
        gridParts.push('<div class="kb-folder-section-title">未分类</div><div class="kb-folder-grid">');
        gridParts.push(folderCard({
          openId: '__cat__default',
          name: '默认',
          cat: 'default',
          tint: 'default',
          isCat: true,
          isDefault: true,
          meta: (rootDocsByCat.default || 0) + ' 文件' +
            ((foldersByCat.default || 0) ? (' · ' + foldersByCat.default + ' 夹') : ''),
          canDel: false
        }));
        gridParts.push('</div>');
      } else if (!currentFolderId) {
        // 进入某一技术方向/分类根：此处管理本目录下文件夹（系统夹不可删；可继续新建）
        if (folders.length) {
          gridParts.push('<div class="kb-folder-section-title">文件夹</div><div class="kb-entry-list">');
          folders.forEach(function (f) {
            var sys = !!f.is_system;
            gridParts.push(folderEntryRow({
              openId: f.id,
              name: f.name + (sys ? '（系统）' : ''),
              cat: f.category || currentCategory,
              tint: f.category || currentCategory,
              meta: (f.doc_count || 0) + ' 个文件',
              canDel: canDel && !sys,
              delId: f.id
            }));
          });
          gridParts.push('</div>');
        }
      }

      var showFileList = !!currentCategory || !!currentFolderId;
      var fileParts = [];
      if (showFileList) {
        docs.forEach(function (d) {
          var extCls = fileExtClass(d.filename);
          var extLab = fileExtLabel(d.filename);
          fileParts.push(
            '<div class="kb-file-row batchable" draggable="true" data-doc-id="' + d.id + '">' +
            (canWrite
              ? '<input type="checkbox" class="batch-item-check" data-doc="' + d.id + '" title="选择">'
              : '') +
            '<span class="kb-file-icon ' + extCls + '">' + escapeHtml(extLab.slice(0, 4)) + '</span>' +
            '<div class="kb-file-main">' +
            '<div class="kb-file-name"><a href="#" class="doc-link" data-view="' + d.id + '">' +
            escapeHtml(d.filename) + '</a></div>' +
            '<div class="kb-file-meta">' + escapeHtml(d.status || '已入库') + '</div></div>' +
            '<div class="kb-file-actions">' +
            '<a href="#" data-view="' + d.id + '">打开</a>' +
            (canDl
              ? '<a href="#" data-dl="' + d.id + '" data-name="' + escapeHtml(d.filename) + '">下载</a>'
              : '') +
            (canDel ? '<a href="#" class="danger" data-del="' + d.id + '">删除</a>' : '') +
            '</div></div>'
          );
        });
      }

      var gridHtml = gridParts.join('');
      var fileHtml = fileParts.join('');
      var hasContent = gridHtml || fileHtml;

      if (!hasContent) {
        box.innerHTML = '<div class="loading-hint">' +
          (currentFolderId
            ? '此文件夹为空，可点上方「上传 / 批量」导入文件'
            : (currentCategory === 'default'
              ? '「默认」为空。未归类文件请将「上传到」选为「默认」后再传。'
              : ('暂无内容，可上传 ' + ACCEPT_HINT +
                (currentCategory ? '，或新建文件夹' : '；点「默认」查看未分类')))) +
          '</div>';
        return;
      }
      var html = gridHtml;
      if (currentCategory && !currentFolderId && folders.length === 0 && docs.length === 0) {
        html += '<div class="loading-hint">' +
          (currentCategory === 'default'
            ? '「默认」为空。未归类文件请将「上传到」选为「默认」后再传。'
            : '该方向暂无内容，可新建文件夹或直接上传。') +
          '</div>';
      } else if (!fileHtml && showFileList) {
        html += '<div class="loading-hint">暂无本目录文件' +
          (folders.length ? '（点上方文件夹进入）' : '') + '</div>';
      } else if (fileHtml) {
        if (folders.length && !currentFolderId) {
          html += '<div class="kb-folder-section-title">文件</div>';
        }
        html += '<div class="kb-file-list">' + fileHtml + '</div>';
      }
      box.innerHTML = html;

      box.querySelectorAll('[data-open-folder]').forEach(function (el) {
        el.onclick = function (e) {
          if (e.target && e.target.getAttribute('data-del-folder')) return;
          var fcat = el.getAttribute('data-folder-cat') || currentCategory || '';
          var openId = el.getAttribute('data-open-folder');
          if (openId.indexOf('__cat__') === 0) {
            currentCategory = openId.slice('__cat__'.length);
            currentFolderId = null;
            currentFolderName = '';
            if (uploadCat) uploadCat.value = currentCategory;
            syncCatalogActive();
            loadDocs();
            return;
          }
          currentFolderId = Number(openId);
          currentFolderName = el.getAttribute('data-folder-name') || '';
          if (fcat) {
            currentCategory = fcat;
            if (uploadCat) uploadCat.value = fcat;
            syncCatalogActive();
          }
          loadDocs();
        };
      });
      box.querySelectorAll('[data-del-folder]').forEach(function (a) {
        a.onclick = async function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (!confirm('删除空文件夹？若夹内仍有文档将无法删除。')) return;
          try {
            await API.deleteKbFolder(a.getAttribute('data-del-folder'));
            loadDocs();
          } catch (err) {
            alert(err.message);
          }
        };
      });

      function refreshBatchBtn() {
        var n = box.querySelectorAll('.batch-item-check:checked').length;
        if (btnBatch) btnBatch.disabled = n === 0;
        var btnRoot = document.getElementById('btnMoveToRoot');
        if (btnRoot) btnRoot.disabled = n === 0 || !currentCategory;
        if (selectAll) {
          var all = box.querySelectorAll('.batch-item-check');
          selectAll.checked = all.length > 0 && n === all.length;
        }
      }
      // 有复选框即可批量移动（不要求删除权限）
      box.querySelectorAll('.batch-item-check').forEach(function (cb) {
        cb.onchange = refreshBatchBtn;
      });
      if (selectAll) {
        selectAll.onchange = function () {
          box.querySelectorAll('.batch-item-check').forEach(function (cb) {
            cb.checked = selectAll.checked;
          });
          refreshBatchBtn();
        };
      }
      if (canDel) {
        if (btnBatch) {
          btnBatch.onclick = async function () {
            var ids = [];
            box.querySelectorAll('.batch-item-check:checked').forEach(function (cb) {
              ids.push(cb.getAttribute('data-doc'));
            });
            if (!ids.length) return;
            if (!confirm('确认批量删除选中的 ' + ids.length + ' 个文档？\n（开发者删除前会自动备份一次）')) return;
            btnBatch.disabled = true;
            try {
              var res = await API.deleteDocumentsBatch(ids);
              var msg = '已删除 ' + ((res && res.count) || 0) + ' 个文档';
              if (res && res.auto_backup) msg += '\n自动备份：' + res.auto_backup;
              if (res && res.failed && res.failed.length) msg += '\n失败 ' + res.failed.length + ' 个';
              alert(msg);
              loadDocs();
            } catch (err) {
              alert(err.message);
              btnBatch.disabled = false;
            }
          };
        }
      }
      var btnMoveRoot = document.getElementById('btnMoveToRoot');
      if (btnMoveRoot) {
        btnMoveRoot.onclick = async function () {
          var ids = [];
          box.querySelectorAll('.batch-item-check:checked').forEach(function (cb) {
            ids.push(cb.getAttribute('data-doc'));
          });
          if (!ids.length || !currentCategory) return;
          if (!confirm('将选中的 ' + ids.length + ' 个文件移到「' + catLabel(currentCategory) + '」根目录？')) return;
          btnMoveRoot.disabled = true;
          var ok = 0;
          var fail = 0;
          for (var i = 0; i < ids.length; i++) {
            try {
              await API.moveDocument(ids[i], { category: currentCategory, clear_folder: true });
              ok += 1;
            } catch (e) { fail += 1; }
          }
          alert('已移动 ' + ok + ' 个' + (fail ? ('，失败 ' + fail + ' 个') : ''));
          loadDocs();
        };
      }

      bindKbDragDrop(box);

      async function openDoc(id) {
        var modal = document.getElementById('docPreviewModal');
        var body = document.getElementById('docPreviewBody');
        var title = document.getElementById('docPreviewTitle');
        var meta = document.getElementById('docPreviewMeta');
        modal.style.display = 'flex';
        body.textContent = '加载中…';
        title.textContent = '文档预览';
        meta.textContent = '';
        document.getElementById('btnDownloadDoc').setAttribute('data-id', id);
        try {
          var data = await API.previewDocument(id);
          title.textContent = data.filename || '文档预览';
          meta.textContent = (data.category_label || data.category || '') +
            (data.truncated ? ' · 已截断预览' : '') +
            (data.source === 'chunks' ? ' · 来自知识切片' : '');
          body.textContent = data.content || '';
          document.getElementById('btnDownloadDoc').setAttribute('data-name', data.filename || 'document');
          var dlBtnEl = document.getElementById('btnDownloadDoc');
          if (dlBtnEl) dlBtnEl.style.display = Auth.canDownloadKb() ? '' : 'none';
        } catch (err) {
          body.textContent = '打开失败：' + (err.message || '');
        }
      }

      box.querySelectorAll('[data-view]').forEach(function (a) {
        a.onclick = function (e) {
          e.preventDefault();
          openDoc(a.getAttribute('data-view'));
        };
      });
      box.querySelectorAll('[data-dl]').forEach(function (a) {
        a.onclick = async function (e) {
          e.preventDefault();
          try {
            await API.downloadDocument(a.getAttribute('data-dl'), a.getAttribute('data-name'));
          } catch (err) {
            alert(err.message);
          }
        };
      });
      box.querySelectorAll('[data-del]').forEach(function (a) {
        a.onclick = async function (e) {
          e.preventDefault();
          if (!confirm('确定删除该文档？\n（开发者删除前会自动备份）')) return;
          try {
            var res = await API.deleteDocument(a.getAttribute('data-del'));
            if (res && res.auto_backup) {
              alert('已删除。自动备份：' + res.auto_backup);
            }
            loadDocs();
          } catch (err) {
            alert(err.message);
          }
        };
      });

      var closeBtn = document.getElementById('btnCloseDocPreview');
      var modal = document.getElementById('docPreviewModal');
      if (closeBtn) {
        closeBtn.onclick = function () { modal.style.display = 'none'; };
      }
      if (modal) {
        modal.onclick = function (e) {
          if (e.target === modal) modal.style.display = 'none';
        };
      }
      var dlBtn = document.getElementById('btnDownloadDoc');
      if (dlBtn) {
        dlBtn.onclick = async function () {
          try {
            await API.downloadDocument(
              dlBtn.getAttribute('data-id'),
              dlBtn.getAttribute('data-name') || 'document'
            );
          } catch (err) {
            alert(err.message);
          }
        };
      }
    } catch (e) {
      box.innerHTML = '<div class="list-item" style="color:var(--error);">' + escapeHtml(e.message) + '</div>';
    }
  }

  async function doUpload(files, destOverride) {
    var list = snapshotFiles(files);
    if (!list.length) return;
    if (Auth.getUser() && Auth.getUser().role === 'guest') {
      alert('访客不可上传');
      return;
    }
    var dest = destOverride || uploadDestination();
    if (!dest.category) {
      alert('请先选择「上传到」分类，或把文件拖到某个分类/文件夹上');
      return;
    }
    if (!dest.where) {
      dest.where = (catLabel(dest.category) || dest.category) +
        (dest.folderId ? (' / ' + (dest.folderName || '文件夹')) : ' / 根目录');
    }
    var wrap = document.getElementById('uploadProgressWrap');
    var label = document.getElementById('uploadProgressLabel');
    var pctEl = document.getElementById('uploadProgressPct');
    var fill = document.getElementById('uploadProgressFill');
    if (wrap) wrap.style.display = 'block';

    function setProgress(name, pct, extra) {
      if (label) label.textContent = name + (extra ? ' · ' + extra : '');
      if (pctEl) pctEl.textContent = pct == null ? '…' : (pct + '%');
      if (fill) fill.style.width = (pct == null ? 30 : pct) + '%';
    }

    var ok = 0;
    var fail = 0;
    var lastFolderId = dest.folderId || null;
    var lastCategory = dest.category;
    var lastFolderName = dest.folderName || '';

    for (let i = 0; i < list.length; i++) {
      const fd = new FormData();
      var category = dest.category;
      if (uploadCat) uploadCat.value = category;
      fd.append('file', list[i]);
      fd.append('category', category);
      if (dest.folderId) {
        fd.append('folder_id', String(dest.folderId));
      }
      var prefix = list.length > 1
        ? ('(' + (i + 1) + '/' + list.length + ') ' + list[i].name)
        : list[i].name;
      setProgress(prefix, 0, '上传到「' + dest.where + '」');
      try {
        var upRes = await API.uploadDocument(fd, function (pct) {
          if (pct == null) {
            setProgress(prefix, null, '上传中');
          } else if (pct >= 100) {
            setProgress(prefix, 100, '解析入库中…');
          } else {
            setProgress(prefix, pct, '上传中');
          }
        });
        ok += 1;
        if (upRes && upRes.category) lastCategory = upRes.category;
        if (upRes && upRes.folder_id != null) lastFolderId = upRes.folder_id;
        setProgress(prefix, 100, '完成 → ' + dest.where);
        if (upRes && upRes.rebuild_error) {
          console.warn('索引重建警告', upRes.rebuild_error);
        }
      } catch (e) {
        fail += 1;
        setProgress(prefix, 0, '失败');
        alert(list[i].name + '（目标：' + dest.where + '）\n' + e.message);
      }
    }

    // 上传后跳到真实落库位置，避免仍停在总览根目录看不到文件
    if (ok > 0) {
      currentCategory = lastCategory || dest.category;
      if (lastFolderId) {
        currentFolderId = Number(lastFolderId);
        if (!currentFolderName) currentFolderName = lastFolderName || dest.folderName || '文件夹';
      } else {
        currentFolderId = null;
        currentFolderName = '';
      }
      if (uploadCat && currentCategory) uploadCat.value = currentCategory;
      syncCatalogActive();
    }

    setTimeout(function () {
      if (wrap) wrap.style.display = 'none';
      if (fill) fill.style.width = '0%';
    }, 800);
    await loadDocs();
    if (list.length > 1 || fail > 0) {
      alert('上传完成：成功 ' + ok + ' 个' + (fail ? ('，失败 ' + fail + ' 个') : '') +
        '\n当前位置：' + uploadDestination().where);
    }
  }

  function bindKbDragDrop(box) {
    if (!box || (Auth.isGuest && Auth.isGuest())) return;

    box.querySelectorAll('.kb-file-row[draggable="true"]').forEach(function (row) {
      row.ondragstart = function (e) {
        var id = row.getAttribute('data-doc-id');
        if (!id) return;
        e.dataTransfer.setData('application/x-kb-doc', id);
        e.dataTransfer.setData('text/plain', id);
        e.dataTransfer.effectAllowed = 'move';
        row.classList.add('is-dragging');
      };
      row.ondragend = function () {
        row.classList.remove('is-dragging');
        box.querySelectorAll('.kb-drop-over').forEach(function (el) {
          el.classList.remove('kb-drop-over');
        });
      };
    });

    function parseDropTarget(el) {
      var node = el;
      while (node && node !== box) {
        var openId = node.getAttribute && node.getAttribute('data-open-folder');
        if (openId) {
          var fcat = node.getAttribute('data-folder-cat') || currentCategory || '';
          if (openId.indexOf('__cat__') === 0) {
            return {
              category: openId.slice('__cat__'.length),
              folderId: null,
              folderName: '',
              where: catLabel(openId.slice('__cat__'.length)) + ' / 根目录',
              clearFolder: true
            };
          }
          return {
            category: fcat,
            folderId: Number(openId),
            folderName: node.getAttribute('data-folder-name') || '文件夹',
            where: catLabel(fcat) + ' / ' + (node.getAttribute('data-folder-name') || '文件夹'),
            clearFolder: false
          };
        }
        node = node.parentNode;
      }
      return null;
    }

    function onDragOver(e) {
      var t = parseDropTarget(e.target);
      var hasLocal = e.dataTransfer && e.dataTransfer.types &&
        (Array.prototype.indexOf.call(e.dataTransfer.types, 'Files') >= 0);
      var hasDoc = e.dataTransfer && e.dataTransfer.types &&
        (Array.prototype.indexOf.call(e.dataTransfer.types, 'application/x-kb-doc') >= 0 ||
          Array.prototype.indexOf.call(e.dataTransfer.types, 'text/plain') >= 0);
      if (!t || (!hasLocal && !hasDoc)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = hasLocal ? 'copy' : 'move';
      box.querySelectorAll('.kb-drop-over').forEach(function (el) {
        el.classList.remove('kb-drop-over');
      });
      var dropEl = e.target.closest('[data-open-folder]');
      if (dropEl) dropEl.classList.add('kb-drop-over');
    }

    box.ondragover = onDragOver;
    box.ondragleave = function (e) {
      if (!box.contains(e.relatedTarget)) {
        box.querySelectorAll('.kb-drop-over').forEach(function (el) {
          el.classList.remove('kb-drop-over');
        });
      }
    };
    box.ondrop = async function (e) {
      e.preventDefault();
      box.querySelectorAll('.kb-drop-over').forEach(function (el) {
        el.classList.remove('kb-drop-over');
      });
      var t = parseDropTarget(e.target);
      if (!t || !t.category) return;

      var files = e.dataTransfer && e.dataTransfer.files;
      if (files && files.length) {
        await doUpload(files, {
          category: t.category,
          folderId: t.folderId,
          folderName: t.folderName,
          where: t.where
        });
        return;
      }

      var docId = e.dataTransfer.getData('application/x-kb-doc') || e.dataTransfer.getData('text/plain');
      if (!docId) return;
      try {
        var payload = { category: t.category };
        if (t.clearFolder || !t.folderId) payload.clear_folder = true;
        else payload.folder_id = t.folderId;
        await API.moveDocument(docId, payload);
        // 若拖到另一分类，跟随过去
        currentCategory = t.category;
        currentFolderId = t.folderId || null;
        currentFolderName = t.folderName || '';
        if (uploadCat) uploadCat.value = t.category;
        syncCatalogActive();
        await loadDocs();
      } catch (err) {
        alert(err.message || '移动失败');
      }
    };
  }

  // 显示比例（默认较大，解决「太小」）
  (function initKbScale() {
    var page = document.getElementById('knowledgePage');
    var sel = document.getElementById('kbUiScale');
    if (!page || !sel) return;
    var saved = localStorage.getItem('kb_ui_scale') || '1.12';
    if (![].some.call(sel.options, function (o) { return o.value === saved; })) saved = '1.12';
    sel.value = saved;
    page.style.setProperty('--kb-zoom', saved);
    page.setAttribute('data-zoom', saved);
    sel.onchange = function () {
      var v = sel.value || '1.12';
      localStorage.setItem('kb_ui_scale', v);
      page.style.setProperty('--kb-zoom', v);
      page.setAttribute('data-zoom', v);
    };
  })();

  document.getElementById('btnUploadOne').onclick = function () {
    document.getElementById('fileInput').click();
  };
  document.getElementById('btnUploadBatch').onclick = function () {
    document.getElementById('fileInputBatch').click();
  };
  document.getElementById('fileInput').onchange = function () {
    var files = snapshotFiles(this.files);
    this.value = '';
    doUpload(files);
  };
  document.getElementById('fileInputBatch').onchange = function () {
    var files = snapshotFiles(this.files);
    this.value = '';
    doUpload(files);
  };
  var btnNf = document.getElementById('btnNewFolder');
  if (btnNf) {
    btnNf.onclick = async function () {
      if (currentFolderId) {
        alert('当前已在文件夹内；本期仅支持分类根下单层文件夹，请先返回上级');
        return;
      }
      var cat = currentCategory || '';
      if (!cat) {
        alert('请先进入某一技术方向（或「默认」）后再新建文件夹');
        return;
      }
      var name = prompt('新建文件夹名称（将创建在「' + catLabel(cat) + '」下）：');
      if (!name || !name.trim()) return;
      try {
        var created = await API.createKbFolder({ category: cat, name: name.trim() });
        currentFolderId = null;
        currentFolderName = '';
        if (uploadCat) uploadCat.value = cat;
        syncCatalogActive();
        await loadDocs();
        alert('已创建文件夹「' + ((created && created.name) || name.trim()) + '」');
      } catch (e) {
        alert(e.message);
      }
    };
  }

  if (uploadCat) {
    uploadCat.onchange = function () {
      renderUploadTarget();
      // 全部分类总览时文件夹列表与上传分类无关，不必因改下拉而误刷新成「只显示某一类夹」
    };
  }

  var updateProtocolSyncVisibility = function () {};

  (function initProtocolSyncBar() {
    var wrap = document.getElementById('kbProtocolSync');
    var sel = document.getElementById('protocolSyncProject');
    var hint = document.getElementById('kbProtocolSyncHint');
    var btnCheck = document.getElementById('btnProtocolCheck');
    var btnSync = document.getElementById('btnProtocolSync');
    var layerBox = document.getElementById('protocolSyncLayers');
    if (!wrap || !sel || !hint || !btnCheck || !btnSync) return;

    var loadedOnce = false;
    var loading = false;

    function setHint(text, kind) {
      hint.textContent = text || '';
      hint.classList.remove('is-ok', 'is-warn', 'is-err');
      if (kind) hint.classList.add(kind);
    }

    function selectedProjectId() {
      return (sel.value || '').trim();
    }

    function selectedLayers() {
      if (!layerBox) return ['base', 'component', 'modules', 'debug_combo'];
      var picked = [];
      layerBox.querySelectorAll('input[type="checkbox"]').forEach(function (el) {
        if (el.checked && el.value) picked.push(el.value);
      });
      return picked;
    }

    function hasProtocolApi() {
      return !!(window.API && typeof API.protocolSyncStatus === 'function');
    }

    async function refreshProjects(force) {
      if (!hasProtocolApi()) {
        setHint('前端脚本未更新，请 Ctrl+F5 强制刷新后再试', 'is-err');
        btnCheck.disabled = true;
        btnSync.disabled = true;
        return;
      }
      if (loading) return;
      if (loadedOnce && !force) return;
      loading = true;
      setHint('正在连接协议接口平台…');
      try {
        var st = await API.protocolSyncStatus();
        if (!st.configured || !st.protocol_api_base) {
          setHint('未配置 PROTOCOL_API_BASE（backend/.env）', 'is-err');
          sel.innerHTML = '';
          btnCheck.disabled = true;
          btnSync.disabled = true;
          loadedOnce = true;
          return;
        }
        var data = await API.protocolSyncProjects();
        var projects = (data && data.projects) || [];
        var saved = localStorage.getItem('kb_protocol_project_id') || '';
        sel.innerHTML = projects.length
          ? projects.map(function (p) {
              return '<option value="' + escapeHtml(p.id) + '">' +
                escapeHtml(p.name || p.id) + '</option>';
            }).join('')
          : '<option value="">（无项目）</option>';
        if (saved && [].some.call(sel.options, function (o) { return o.value === saved; })) {
          sel.value = saved;
        }
        btnCheck.disabled = !projects.length;
        btnSync.disabled = !projects.length;
        var last = null;
        (st.local_syncs || []).forEach(function (row) {
          if (!last && String(row.layer || '').indexOf('all:') === 0) last = row;
        });
        if (!last) last = (st.local_syncs || [])[0] || null;
        if (last) {
          setHint(
            '上次同步「' + (last.project_name || last.project_id) + '」· ' +
            (last.synced_at || '—') +
            ' · 可勾选层级后检查/同步',
            'is-ok'
          );
        } else {
          setHint('尚未同步；勾选层级后点「立即同步」（每单元独立文件夹）', 'is-warn');
        }
        loadedOnce = true;
      } catch (e) {
        setHint(e.message || '无法连接协议接口平台', 'is-err');
        btnCheck.disabled = true;
        btnSync.disabled = true;
      } finally {
        loading = false;
      }
    }

    updateProtocolSyncVisibility = function () {
      var show = currentCategory === 'software' && !(Auth.isGuest && Auth.isGuest());
      wrap.style.display = show ? '' : 'none';
      if (show) {
        wrap.removeAttribute('hidden');
        refreshProjects(false);
      } else {
        wrap.setAttribute('hidden', 'hidden');
      }
    };

    sel.onchange = function () {
      localStorage.setItem('kb_protocol_project_id', selectedProjectId());
    };

    btnCheck.onclick = async function () {
      if (!hasProtocolApi()) {
        return setHint('前端脚本未更新，请 Ctrl+F5 强制刷新后再试', 'is-err');
      }
      var pid = selectedProjectId();
      if (!pid) return alert('请选择项目');
      var layers = selectedLayers();
      if (!layers.length) return alert('请至少勾选一层（子命令库/组件组合/模块库/调试命令）');
      btnCheck.disabled = true;
      setHint('正在检查更新…');
      try {
        var r = await API.protocolSyncCheck({ project_id: pid, layers: layers });
        var remote = r.remote || {};
        var ls = r.layer_status || [];
        var stale = ls.filter(function (x) { return !x.up_to_date; }).length;
        if (r.up_to_date) {
          setHint(
            '已是最新 · 共 ' + (remote.op_count || 0) + ' 条命令 / ' +
            (remote.document_count || 0) + ' 份文档',
            'is-ok'
          );
        } else if (!r.has_local) {
          setHint(
            '尚未入库 · 远端约 ' + (remote.op_count || 0) + ' 条命令，可立即同步',
            'is-warn'
          );
        } else {
          setHint(
            '有更新 · ' + stale + '/' + ls.length + ' 层需同步 · 远端约 ' +
            (remote.op_count || 0) + ' 条命令',
            'is-warn'
          );
        }
      } catch (e) {
        setHint(e.message || '检查失败', 'is-err');
      } finally {
        btnCheck.disabled = !selectedProjectId();
      }
    };

    btnSync.onclick = async function () {
      if (!hasProtocolApi()) {
        return setHint('前端脚本未更新，请 Ctrl+F5 强制刷新后再试', 'is-err');
      }
      var pid = selectedProjectId();
      if (!pid) return alert('请选择项目');
      var layers = selectedLayers();
      if (!layers.length) return alert('请至少勾选一层');
      if (!confirm('将按勾选层级拉取，并为每个单元创建独立文件夹。继续？')) return;
      btnSync.disabled = true;
      btnCheck.disabled = true;
      setHint('正在同步（可能需十余秒）…');
      try {
        var r = await API.protocolSyncRun({
          project_id: pid,
          layers: layers,
          force: false
        });
        if (r.skipped) {
          setHint('已是最新，无需重复同步', 'is-ok');
        } else {
          var s = r.stats || {};
          setHint(
            '同步完成 · 文件夹' + (s.folders || 0) +
            ' · 新建' + (s.created || 0) +
            ' / 更新' + (s.updated || 0) +
            ' / 跳过' + (s.skipped_unchanged || 0) +
            ' · 命令' + (s.op_count || 0) + ' 条',
            'is-ok'
          );
        }
        currentCategory = 'software';
        currentFolderId = null;
        currentFolderName = '';
        if (uploadCat) uploadCat.value = 'software';
        syncCatalogActive();
        await loadDocs();
      } catch (e) {
        setHint(e.message || '同步失败', 'is-err');
      } finally {
        btnSync.disabled = !selectedProjectId();
        btnCheck.disabled = !selectedProjectId();
      }
    };
  })();

  loadDocs();
};

window.initUsers = function () {
  const denied = document.getElementById('permissionDenied');
  const content = document.getElementById('permissionContent');
  const user = Auth.getUser();
  const isDev = Auth.isDeveloper();
  const ROLE_ORDER = { developer: 0, super: 1, admin: 2, user: 3, guest: 4 };

  if (!Auth.canManageUsers()) {
    denied.style.display = 'block';
    content.style.display = 'none';
    document.getElementById('deniedRole').textContent = user ? user.role_label : '未登录';
    return;
  }
  denied.style.display = 'none';
  content.style.display = 'block';
  document.getElementById('profileUser').textContent = user.username;
  document.getElementById('profileRole').textContent = user.role_label;
  document.getElementById('profilePerm').textContent =
    (user.permissions || []).includes('all') ? '全权限 (读写/审计)' :
      ((user.permissions || []).length + '项分类权限');

  function roleRank(role) {
    return ROLE_ORDER[role] != null ? ROLE_ORDER[role] : 99;
  }

  /** 仅权限以下；不可同级、不可越级。开发者可分配全部 */
  function assignableRoles(actorRole) {
    var my = roleRank(actorRole);
    return Object.keys(ROLE_ORDER)
      .filter(function (r) {
        if (actorRole === 'developer') return ROLE_ORDER[r] >= my;
        return ROLE_ORDER[r] > my;
      })
      .sort(function (a, b) { return ROLE_ORDER[a] - ROLE_ORDER[b]; });
  }

  function canManageTargetRole(targetRole, targetId, targetUsername) {
    // 根管理员：开发者可打开编辑（仅技术方向）；不可删除
    if (Auth.isSystemRootUser(targetUsername) || Auth.isSystemRootUser({ id: targetId, username: targetUsername })) {
      return isDev;
    }
    if (user && targetId != null && Number(targetId) === Number(user.id)) {
      // 不可在权限页切换自己的身份；超管等非开发者也不开放对自己的账户编辑
      return isDev;
    }
    if (isDev) return true;
    return roleRank(targetRole) > roleRank(user.role);
  }

  function fillRoleSelect(selectId, selected, opts) {
    opts = opts || {};
    var el = document.getElementById(selectId);
    var roles = assignableRoles(user.role);
    // 新建账号不直接选开发者，避免误建；开发者可在编辑中提升
    if (opts.forCreate) {
      roles = roles.filter(function (r) { return r !== 'developer'; });
    }
    var map = APP_CONFIG.ROLE_MAP || {};
    el.innerHTML = roles.map(function (r) {
      return '<option value="' + r + '">' + escapeHtml(map[r] || r) + '</option>';
    }).join('');
    var pick = selected;
    if (!pick || roles.indexOf(pick) < 0) {
      pick = roles.indexOf('user') >= 0 ? 'user' : roles[0];
    }
    if (pick) el.value = pick;
  }

  function fillPermBox(boxId, selected) {
    var box = document.getElementById(boxId);
    var sel = selected || [];
    var all = sel.indexOf('all') >= 0;
    box.innerHTML = APP_CONFIG.CATEGORIES.map(function (c) {
      var checked = all || sel.indexOf(c.id) >= 0 ? ' checked' : '';
      return '<label><input type="checkbox" value="' + c.id + '"' + checked + '> ' + c.label + '</label>';
    }).join('');
  }

  function readPerms(boxId) {
    var permissions = [];
    document.getElementById(boxId).querySelectorAll('input:checked').forEach(function (cb) {
      permissions.push(cb.value);
    });
    return permissions;
  }

  var techDirCache = [];

  async function loadTechDirs() {
    try {
      var res = await API.listStaffTechDirs();
      techDirCache = res.items || [];
    } catch (e) {
      techDirCache = [];
    }
    fillTechDirSelect('newUserTechDir', '');
    fillTechDirSelect('editUserTechDir', '');
    renderTechDirChips();
    syncUserTechFilterOptions();
  }

  function syncUserTechFilterOptions() {
    var sel = document.getElementById('userTechDirFilter');
    if (!sel) return;
    var prev = sel.value;
    sel.innerHTML = '<option value="">全部</option><option value="__none__">未指定</option>' +
      techDirCache.map(function (d) {
        return '<option value="' + d.id + '">' + escapeHtml(d.name) + '</option>';
      }).join('');
    sel.value = prev || '';
  }

  function fillTechDirSelect(selectId, selected) {
    var el = document.getElementById(selectId);
    if (!el) return;
    el.innerHTML = '<option value="">未指定</option>' + techDirCache.map(function (d) {
      return '<option value="' + d.id + '"' +
        (String(selected) === String(d.id) ? ' selected' : '') + '>' +
        escapeHtml(d.name) + '</option>';
    }).join('');
    if (selected != null && selected !== '') el.value = String(selected);
  }

  function renderTechDirChips() {
    var box = document.getElementById('techDirList');
    if (!box) return;
    box.innerHTML = techDirCache.map(function (d) {
      return '<div style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:#f8fafc;font-size:13px;">' +
        '<span>' + escapeHtml(d.name) + '</span>' +
        '<button type="button" class="btn btn-sm btn-outline" data-rename-tech="' + d.id +
        '" style="padding:2px 8px;font-size:11px;">改名</button>' +
        '<button type="button" class="btn btn-sm btn-outline" data-del-tech="' + d.id +
        '" style="padding:2px 8px;font-size:11px;">删</button></div>';
    }).join('') || '<span style="color:var(--text-muted);font-size:13px;">暂无方向，请新增</span>';
    box.querySelectorAll('[data-rename-tech]').forEach(function (btn) {
      btn.onclick = async function () {
        var id = btn.getAttribute('data-rename-tech');
        var cur = techDirCache.filter(function (x) { return String(x.id) === String(id); })[0];
        var name = prompt('修改技术方向名称', cur ? cur.name : '');
        if (name == null) return;
        name = String(name).trim();
        if (!name) { alert('名称不能为空'); return; }
        try {
          await API.updateStaffTechDir(id, name);
          await loadTechDirs();
          renderTable();
        } catch (e) { alert(e.message || '改名失败'); }
      };
    });
    box.querySelectorAll('[data-del-tech]').forEach(function (btn) {
      btn.onclick = async function () {
        if (!confirm('删除该技术方向？已绑定账号将变为「未指定」。')) return;
        try {
          await API.deleteStaffTechDir(btn.getAttribute('data-del-tech'));
          await loadTechDirs();
          renderTable();
        } catch (e) { alert(e.message || '删除失败'); }
      };
    });
  }

  fillPermBox('newUserPerms', APP_CONFIG.CATEGORIES.map(function (c) { return c.id; }));
  fillRoleSelect('newUserRole', 'user', { forCreate: true });
  loadTechDirs();

  var btnAddTechDir = document.getElementById('btnAddTechDir');
  if (btnAddTechDir) {
    btnAddTechDir.onclick = async function () {
      var input = document.getElementById('newTechDirName');
      var name = input ? input.value.trim() : '';
      if (!name) { alert('请输入方向名称'); return; }
      try {
        await API.createStaffTechDir(name);
        if (input) input.value = '';
        await loadTechDirs();
      } catch (e) { alert(e.message || '新增失败'); }
    };
  }
  var btnBatchDelUsers = document.getElementById('btnBatchDelUsers');
  var userCheckColHead = document.getElementById('userCheckColHead');
  if (isDev && btnBatchDelUsers) {
    btnBatchDelUsers.style.display = '';
  }
  if (isDev && userCheckColHead) {
    userCheckColHead.innerHTML = '<input type="checkbox" id="userSelectAll" title="全选可删账号">';
  }

  function refreshUserBatchBtn() {
    if (!btnBatchDelUsers) return;
    var n = document.querySelectorAll('#userTableBody .user-batch-check:checked').length;
    btnBatchDelUsers.disabled = n === 0;
  }

  async function renderTable() {
    const tbody = document.getElementById('userTableBody');
    try {
      const users = await API.listUsers();
      var filterEl = document.getElementById('userTechDirFilter');
      var groupEl = document.getElementById('userGroupByTech');
      var filterVal = filterEl ? filterEl.value : '';
      var doGroup = !groupEl || groupEl.checked;
      var list = users.slice();
      if (filterVal === '__none__') {
        list = list.filter(function (u) { return !u.tech_dir_id; });
      } else if (filterVal) {
        list = list.filter(function (u) { return String(u.tech_dir_id || '') === String(filterVal); });
      }

      function appendUserRow(u) {
        const isSelf = user && u.id === user.id;
        const isRoot = Auth.isSystemRootUser(u);
        const manageable = canManageTargetRole(u.role, u.id, u.username);
        const canBatchDel = isDev && manageable && !isSelf && !isRoot;
        let badge = 'user';
        if (u.role === 'developer') badge = 'developer';
        else if (u.role === 'super') badge = 'super';
        else if (u.role === 'admin') badge = 'admin';
        else if (u.role === 'guest') badge = 'guest';
        const statusColor = u.status === '在线' ? '#16a34a' : '#94a3b8';
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid #f0f4f9';
        tr.innerHTML =
          '<td style="padding:10px 8px;text-align:center;">' +
          (canBatchDel
            ? '<input type="checkbox" class="user-batch-check" data-uid="' + u.id + '">'
            : '') +
          '</td>' +
          '<td style="padding:10px 12px;font-weight:500;">' + escapeHtml(u.username) +
          (isRoot ? ' <span class="perm-badge developer">系统</span>' : '') +
          (isSelf ? ' (当前)' : '') + '</td>' +
          '<td style="padding:10px 12px;font-size:13px;color:var(--text-muted);">' +
          escapeHtml(u.tech_dir_name || '—') + '</td>' +
          '<td style="padding:10px 12px;"><span class="perm-badge ' + badge + '">' +
          escapeHtml(u.role_label) + '</span></td>' +
          '<td style="padding:10px 12px;font-size:13px;">' +
          (isRoot
            ? '全权限 · 可改技术方向 · 不可删除'
            : (((u.permissions || []).includes('all') ? '全权限' : ((u.permissions || []).length + '项分类')) +
              (u.role === 'developer'
                ? ' · 下载/删除'
                : ((u.kb_download ? ' · 可下载' : '') + (u.kb_delete ? ' · 可删除' : ''))))) +
          '</td>' +
          '<td style="padding:10px 12px;color:' + statusColor + ';">● ' + escapeHtml(u.status || '离线') + '</td>' +
          '<td style="padding:10px 12px;text-align:center;white-space:nowrap;">' +
          (manageable
            ? '<button class="btn btn-sm btn-outline" data-edit="' + u.id +
              '" style="padding:3px 10px;font-size:11px;margin-right:6px;">' +
              (isRoot ? '改方向' : '编辑') + '</button>'
            : '') +
          (manageable && !isSelf && !isRoot
            ? '<button class="btn btn-sm btn-outline" data-del="' + u.id +
              '" style="padding:3px 10px;font-size:11px;">删除</button>'
            : '') +
          '</td>';
        tbody.appendChild(tr);
      }

      tbody.innerHTML = '';
      if (doGroup && !filterVal) {
        var groups = {};
        var order = [];
        list.forEach(function (u) {
          var key = u.tech_dir_name || '未指定';
          if (!groups[key]) { groups[key] = []; order.push(key); }
          groups[key].push(u);
        });
        order.sort(function (a, b) {
          if (a === '未指定') return 1;
          if (b === '未指定') return -1;
          return a.localeCompare(b, 'zh');
        });
        if (!window.__userOrgExpanded) window.__userOrgExpanded = {};
        order.forEach(function (g) {
          var open = !!window.__userOrgExpanded[g];
          var hr = document.createElement('tr');
          hr.className = 'org-dept-row';
          hr.innerHTML =
            '<td colspan="7" class="org-dept-cell">' +
            '<button type="button" class="org-dept-toggle" data-org-dept="' + escapeHtml(g) + '">' +
            '<span class="org-caret">' + (open ? '▾' : '▸') + '</span>' +
            '<span class="org-dept-name">' + escapeHtml(g) + '</span>' +
            '<span class="org-dept-count">' + groups[g].length + ' 人</span></button></td>';
          tbody.appendChild(hr);
          if (open) groups[g].forEach(appendUserRow);
        });
        tbody.querySelectorAll('[data-org-dept]').forEach(function (btn) {
          btn.onclick = function () {
            var key = btn.getAttribute('data-org-dept');
            window.__userOrgExpanded[key] = !window.__userOrgExpanded[key];
            renderTable();
          };
        });
      } else {
        list.forEach(appendUserRow);
      }
      if (!list.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="padding:12px;color:var(--text-muted);">无匹配账号</td></tr>';
      }
      tbody.querySelectorAll('.user-batch-check').forEach(function (cb) {
        cb.onchange = refreshUserBatchBtn;
      });
      var selectAll = document.getElementById('userSelectAll');
      if (selectAll) {
        selectAll.checked = false;
        selectAll.onchange = function () {
          tbody.querySelectorAll('.user-batch-check').forEach(function (cb) {
            cb.checked = selectAll.checked;
          });
          refreshUserBatchBtn();
        };
      }
      refreshUserBatchBtn();
      tbody.querySelectorAll('[data-edit]').forEach(function (btn) {
        btn.onclick = function () {
          openEditUser(btn.getAttribute('data-edit'));
        };
      });
      tbody.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.onclick = async function () {
          if (!confirm('确定删除该用户？\n（开发者删除前会自动备份数据库）')) return;
          try {
            var res = await API.deleteUser(btn.getAttribute('data-del'));
            if (res && res.auto_backup) {
              alert('已删除。自动备份：' + res.auto_backup);
            }
            renderTable();
          } catch (e) {
            alert(e.message);
          }
        };
      });
    } catch (e) {
      tbody.innerHTML = '<tr><td colspan="7" style="padding:12px;color:var(--error);">' +
        escapeHtml(e.message) + '</td></tr>';
    }
  }

  var userTechFilter = document.getElementById('userTechDirFilter');
  var userGroupByTech = document.getElementById('userGroupByTech');
  if (userTechFilter) userTechFilter.onchange = function () { renderTable(); };
  if (userGroupByTech) userGroupByTech.onchange = function () { renderTable(); };

  if (btnBatchDelUsers) {
    btnBatchDelUsers.onclick = async function () {
      if (!isDev) return;
      var ids = [];
      document.querySelectorAll('#userTableBody .user-batch-check:checked').forEach(function (cb) {
        ids.push(cb.getAttribute('data-uid'));
      });
      if (!ids.length) return;
      if (!confirm('确认批量删除选中的 ' + ids.length + ' 个账号？\n开发者操作前会自动备份一次。')) return;
      btnBatchDelUsers.disabled = true;
      try {
        var res = await API.deleteUsersBatch(ids);
        var msg = '已删除 ' + (res.count || 0) + ' 个账号';
        if (res.auto_backup) msg += '\n自动备份：' + res.auto_backup;
        if (res.failed && res.failed.length) {
          msg += '\n失败 ' + res.failed.length + ' 个：' +
            res.failed.map(function (f) { return f.id + ' ' + f.error; }).join('；');
        }
        alert(msg);
        renderTable();
      } catch (e) {
        alert(e.message);
        refreshUserBatchBtn();
      }
    };
  }

  async function openEditUser(userId) {
    try {
      var u = await API.getUser(userId);
      if (!canManageTargetRole(u.role, u.id, u.username)) {
        alert('无权管理该账号（仅可管理权限以下身份，且不可切换自己的身份）');
        return;
      }
      var isSelf = user && Number(u.id) === Number(user.id);
      var isRoot = Auth.isSystemRootUser(u);
      document.getElementById('editUserId').value = u.id;
      document.getElementById('editUserAccount').value = u.username;
      fillRoleSelect('editUserRole', u.role || 'user');
      fillPermBox('editUserPerms', u.permissions || []);
      fillTechDirSelect('editUserTechDir', u.tech_dir_id || '');
      var kbOps = document.getElementById('editUserKbOps');
      if (kbOps) kbOps.style.display = (isDev && !isRoot) ? 'block' : 'none';
      var isDevRole = (u.role || '') === 'developer';
      var isGuestRole = (u.role || '') === 'guest';
      var edl = document.getElementById('editKbDownload');
      var edel = document.getElementById('editKbDelete');
      if (edl) {
        edl.checked = isDevRole || !!(u.kb_download === true || u.kb_download === 1 || u.kb_download === '1');
        edl.disabled = isRoot || isDevRole || isGuestRole;
      }
      if (edel) {
        edel.checked = isDevRole || !!(u.kb_delete === true || u.kb_delete === 1 || u.kb_delete === '1');
        edel.disabled = isRoot || isDevRole || isGuestRole;
      }
      // 根管理员 / 编辑本人：角色与账号名锁定；根仅可改技术方向
      document.getElementById('editUserAccount').disabled = isRoot;
      document.getElementById('editUserRole').disabled = isRoot || !!isSelf;
      document.getElementById('editUserPerms').querySelectorAll('input').forEach(function (cb) {
        cb.disabled = isRoot;
      });
      var resetBtn = document.getElementById('btnResetPwd');
      if (resetBtn) resetBtn.style.display = isRoot ? 'none' : '';
      var hint = document.querySelector('#editUserModal .modal-hint');
      if (hint) {
        hint.textContent = isRoot
          ? '内置根管理员仅可修改技术方向；不可改名/改角色/删除/重置密码。'
          : '可改账号名、角色与知识库权限。角色仅能选权限以下身份（不可同级/越级）。密码不可查看，仅可重置为默认（账号名+123）。';
      }
      document.getElementById('editUserModal').style.display = 'flex';
    } catch (e) {
      alert(e.message);
    }
  }

  const modal = document.getElementById('addUserModal');
  document.getElementById('btnOpenAddUser').onclick = function () {
    fillRoleSelect('newUserRole', 'user', { forCreate: true });
    fillTechDirSelect('newUserTechDir', '');
    var kbOps = document.getElementById('newUserKbOps');
    if (kbOps) kbOps.style.display = isDev ? 'block' : 'none';
    var ndl = document.getElementById('newKbDownload');
    var ndel = document.getElementById('newKbDelete');
    if (ndl) { ndl.checked = false; ndl.disabled = false; }
    if (ndel) { ndel.checked = false; ndel.disabled = false; }
    modal.style.display = 'flex';
  };
  document.getElementById('btnCloseAddUser').onclick = function () {
    modal.style.display = 'none';
  };
  modal.onclick = function (e) {
    if (e.target === modal) modal.style.display = 'none';
  };
  document.getElementById('btnConfirmAddUser').onclick = async function () {
    const account = document.getElementById('newUserAccount').value.trim();
    const password = document.getElementById('newUserPassword').value.trim();
    const role = document.getElementById('newUserRole').value;
    const permissions = readPerms('newUserPerms');
    if (!account || !password) {
      alert('请填写完整信息');
      return;
    }
    try {
      var payload = { username: account, password: password, role: role, permissions: permissions };
      var techSel = document.getElementById('newUserTechDir');
      if (techSel && techSel.value) payload.tech_dir_id = Number(techSel.value);
      if (isDev && role !== 'developer' && role !== 'guest') {
        payload.kb_download = !!(document.getElementById('newKbDownload') &&
          document.getElementById('newKbDownload').checked);
        payload.kb_delete = !!(document.getElementById('newKbDelete') &&
          document.getElementById('newKbDelete').checked);
      }
      await API.createUser(payload);
      modal.style.display = 'none';
      renderTable();
      alert('用户添加成功');
    } catch (e) {
      alert(e.message);
    }
  };

  const editModal = document.getElementById('editUserModal');
  document.getElementById('btnCloseEditUser').onclick = function () {
    editModal.style.display = 'none';
  };
  editModal.onclick = function (e) {
    if (e.target === editModal) editModal.style.display = 'none';
  };
  document.getElementById('btnSaveEditUser').onclick = async function () {
    var id = document.getElementById('editUserId').value;
    var accountName = document.getElementById('editUserAccount').value.trim();
    var isRoot = Auth.isSystemRootUser(accountName);
    var techSel = document.getElementById('editUserTechDir');
    var payload;
    if (isRoot) {
      payload = {};
      if (techSel && techSel.value) payload.tech_dir_id = Number(techSel.value);
      else payload.clear_tech_dir = true;
    } else {
      var role = document.getElementById('editUserRole').value;
      payload = {
        username: accountName,
        role: role,
        permissions: readPerms('editUserPerms')
      };
      if (techSel) {
        if (techSel.value) payload.tech_dir_id = Number(techSel.value);
        else payload.clear_tech_dir = true;
      }
      if (isDev) {
        var edl = document.getElementById('editKbDownload');
        var edel = document.getElementById('editKbDelete');
        if (!edl || !edel) {
          alert('页面未加载下载/删除权限控件，请按 Ctrl+F5 强制刷新后再试');
          return;
        }
        if (role === 'guest') {
          payload.kb_download = false;
          payload.kb_delete = false;
        } else if (role === 'developer') {
          payload.kb_download = true;
          payload.kb_delete = true;
        } else {
          payload.kb_download = !!edl.checked;
          payload.kb_delete = !!edel.checked;
        }
      }
    }
    try {
      var res = await API.updateUser(id, payload);
      var saved = res && res.user;
      editModal.style.display = 'none';
      renderTable();
      alert(isRoot
        ? ('技术方向已更新：' + ((saved && saved.tech_dir_name) || '未指定'))
        : (
          '账号已更新' +
          (saved
            ? '\n下载：' + (saved.kb_download ? '已开通' : '关闭') +
              '　删除：' + (saved.kb_delete ? '已开通' : '关闭')
            : '')
        ));
    } catch (e) {
      alert(e.message);
    }
  };
  document.getElementById('btnResetPwd').onclick = async function () {
    var id = document.getElementById('editUserId').value;
    var name = document.getElementById('editUserAccount').value.trim();
    if (!confirm('确认将「' + name + '」的密码恢复为默认？\n规则：账号名+123\n（系统不会显示明文密码）')) return;
    try {
      var res = await API.resetUserPassword(id);
      alert(res.hint || '已重置为默认密码（账号名+123）');
    } catch (e) {
      alert(e.message);
    }
  };

  renderTable();
};

function escapeHtml(str) {
  return String(str == null ? '' : str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatMultiline(text) {
  return escapeHtml(text || '').replace(/\n/g, '<br>');
}

/** 行内：安全转义后再处理 **粗体** */
function formatInlineMd(escaped) {
  return String(escaped || '').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

/**
 * AI / 报告轻量 Markdown：代码围栏（含 mermaid）、标题、列表、分隔线、加粗。
 */
function formatAiContent(text) {
  var raw = String(text == null ? '' : text).replace(/\r\n/g, '\n');
  if (!raw) return '<p class="chat-md-p"></p>';

  var segments = splitMarkdownFences(raw);
  // 兜底：无围栏但整段像 mermaid
  if (segments.length === 1 && segments[0].type === 'text') {
    var t = segments[0].value.trim();
    if (/^(mermaid\s*\n)?\s*(graph\s+|flowchart\s+|sequenceDiagram|classDiagram|stateDiagram)/i.test(t)) {
      segments = [{ type: 'code', lang: 'mermaid', value: t.replace(/^mermaid\s*\n/i, '').trim() }];
    }
  }

  var html = [];
  for (var s = 0; s < segments.length; s++) {
    var seg = segments[s];
    if (seg.type === 'code') {
      if (seg.lang === 'mermaid') {
        html.push(buildMermaidOrCodeBlock(seg.value, !!seg.unclosed));
      } else {
        html.push(
          '<pre class="chat-md-code"><code>' + escapeHtml(seg.value) + '</code></pre>'
        );
      }
      continue;
    }
    html.push(formatAiTextBlock(seg.value));
  }
  return html.join('') || '<p class="chat-md-p"></p>';
}

/** 支持未闭合的 ```mermaid（模型常截断结尾） */
function splitMarkdownFences(raw) {
  var segments = [];
  var i = 0;
  var n = raw.length;
  while (i < n) {
    var open = raw.indexOf('```', i);
    if (open < 0) {
      if (i < n) segments.push({ type: 'text', value: raw.slice(i) });
      break;
    }
    if (open > i) segments.push({ type: 'text', value: raw.slice(i, open) });
    var after = open + 3;
    var nl = raw.indexOf('\n', after);
    var lang = (nl < 0 ? raw.slice(after) : raw.slice(after, nl)).trim().toLowerCase();
    var bodyStart = nl < 0 ? n : nl + 1;
    var close = raw.indexOf('```', bodyStart);
    if (close < 0) {
      segments.push({
        type: 'code',
        lang: lang,
        value: raw.slice(bodyStart).trim(),
        unclosed: true
      });
      break;
    }
    segments.push({
      type: 'code',
      lang: lang,
      value: raw.slice(bodyStart, close).trim(),
      unclosed: false
    });
    i = close + 3;
    if (raw.charAt(i) === '\n') i += 1;
  }
  return segments;
}

function buildMermaidOrCodeBlock(code, forceCode) {
  var original = String(code || '').trim();
  var cleaned = sanitizeMermaidCode(original);
  // 用原文+清洗后双重检测：半截箭头、未闭合围栏等直接降级为源码，避免 Parse error
  if (forceCode || isMermaidIncomplete(original) || isMermaidIncomplete(cleaned)) {
    return (
      '<div class="md-mermaid-fallback">' +
      '<p class="loading-hint" style="margin:0 0 8px;">流程图不完整或已截断，已按源码展示（建议追问：「删除流程图，改用文字步骤说明交互」）</p>' +
      '<pre class="chat-md-code"><code>' + escapeHtml(cleaned || original) + '</code></pre></div>'
    );
  }
  return (
    '<div class="md-mermaid-wrap">' +
    '<pre class="md-mermaid-src" style="display:none">' + escapeHtml(cleaned) + '</pre>' +
    '<div class="md-mermaid-out loading-hint">流程图渲染中…</div>' +
    '</div>'
  );
}

/** 检测半截时序图 / 未闭合 subgraph / 无消息箭头等 */
function isMermaidIncomplete(code) {
  var t = String(code || '').trim();
  if (!t) return true;
  var lines = t.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
  if (!lines.length) return true;
  var last = lines[lines.length - 1];

  // 最后一行是未写完的箭头
  if (/^[A-Za-z][\w-]*\s*(->>|-->>|-->|->|==>|--x|-\) )\s*[A-Za-z0-9_-]*\s*$/.test(last)) {
    return true;
  }
  if (/^[A-Za-z][\w-]*\s*(->>|-->>)\s*[A-Za-z0-9_-]*\s*:\s*$/.test(last)) {
    return true;
  }
  // participant 写到一半
  if (/^participant\s+\w+\s*$/i.test(last) || /^participant\s+\w+\s+as\s*$/i.test(last)) {
    return true;
  }
  // subgraph / end 不配对
  var sg = (t.match(/\bsubgraph\b/gi) || []).length;
  var ends = (t.match(/^\s*end\s*$/gim) || []).length;
  if (sg > ends) return true;

  // sequenceDiagram：存在箭头但缺少「: 消息」
  if (/sequenceDiagram/i.test(t)) {
    var arrowLines = lines.filter(function (l) {
      return /(->>|-->>|-->|->)/.test(l) && !/^participant\b/i.test(l);
    });
    if (arrowLines.length) {
      var bad = arrowLines.some(function (l) {
        return !/:\s*\S/.test(l);
      });
      if (bad) return true;
    }
    // 只有声明 participant、几乎没有交互
    if (arrowLines.length === 0 && /participant\b/i.test(t)) return true;
  }
  return false;
}

function formatAiTextBlock(text) {
  var lines = String(text || '').split('\n');
  var html = [];
  var inUl = false;
  var inOl = false;

  function closeLists() {
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (inOl) { html.push('</ol>'); inOl = false; }
  }

  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeLists();
      html.push('<hr class="chat-md-hr">');
      continue;
    }

    var hm = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (hm) {
      closeLists();
      var level = Math.min(hm[1].length, 3);
      html.push(
        '<div class="chat-md-h chat-md-h' + level + '">' +
        formatInlineMd(escapeHtml(hm[2])) + '</div>'
      );
      continue;
    }

    var ul = trimmed.match(/^[-*•]\s+(.+)$/);
    if (ul) {
      if (inOl) { html.push('</ol>'); inOl = false; }
      if (!inUl) { html.push('<ul class="chat-md-ul">'); inUl = true; }
      html.push('<li>' + formatInlineMd(escapeHtml(ul[1])) + '</li>');
      continue;
    }

    var ol = trimmed.match(/^(\d+)[.)、]\s+(.+)$/);
    if (ol) {
      if (inUl) { html.push('</ul>'); inUl = false; }
      if (!inOl) { html.push('<ol class="chat-md-ol">'); inOl = true; }
      html.push('<li>' + formatInlineMd(escapeHtml(ol[2])) + '</li>');
      continue;
    }

    closeLists();
    if (!trimmed) {
      html.push('<div class="chat-md-gap"></div>');
    } else {
      html.push('<p class="chat-md-p">' + formatInlineMd(escapeHtml(trimmed)) + '</p>');
    }
  }
  closeLists();
  return html.join('');
}

function formatStructured(report) {
  if (!report) return '';
  if (typeof report === 'string') return '<div class="chat-md">' + formatAiContent(report) + '</div>';
  const order = Object.keys(report);
  return order.map(function (k) {
    return '<div class="struct-block"><div class="struct-title">' + escapeHtml(k) +
      '</div><div class="chat-md">' + formatAiContent(report[k]) + '</div></div>';
  }).join('');
}

/** 写入结构化结果并挂载 mermaid 图 */
function renderStructuredInto(el, report, extraHtml) {
  if (!el) return;
  el.innerHTML = formatStructured(report) + (extraHtml || '');
  mountMermaidIn(el);
}

window.ensureMermaidLib = function (cb) {
  if (window.mermaid) {
    try {
      window.mermaid.initialize({
        startOnLoad: false,
        theme: 'base',
        securityLevel: 'loose',
        flowchart: { curve: 'basis', htmlLabels: true }
      });
    } catch (e0) { /* already inited */ }
    cb && cb();
    return;
  }
  var urls = [
    'js/vendor/mermaid.min.js',
    'https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js'
  ];
  var i = 0;
  function tryNext() {
    if (i >= urls.length) {
      cb && cb();
      return;
    }
    var s = document.createElement('script');
    s.src = urls[i++];
    s.onload = function () {
      if (window.mermaid) {
        try {
          window.mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            flowchart: { curve: 'basis', htmlLabels: true }
          });
        } catch (e1) { /* ignore */ }
        cb && cb();
      } else {
        tryNext();
      }
    };
    s.onerror = tryNext;
    document.head.appendChild(s);
  }
  tryNext();
};

/** 修复模型常输出的非法 mermaid */
function sanitizeMermaidCode(code) {
  var text = String(code || '').replace(/^\uFEFF/, '').trim();
  text = text.replace(/^mermaid\s*\n/i, '');
  text = text.replace(/（/g, '(').replace(/）/g, ')');
  var lines = text.split('\n');
  var out = [];
  var sg = 0;
  for (var i = 0; i < lines.length; i++) {
    var trimmed = lines[i].trim();
    if (!trimmed) {
      out.push('');
      continue;
    }

    // participant M as 中位机 (错误处理器) → 去掉括号，避免解析失败
    var pm = trimmed.match(/^participant\s+([A-Za-z][\w-]*)\s+as\s+(.+)$/i);
    if (pm) {
      var alias = pm[2]
        .replace(/[()]/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/["']/g, '')
        .trim();
      out.push('participant ' + pm[1] + ' as ' + alias);
      continue;
    }
    var am = trimmed.match(/^actor\s+([A-Za-z][\w-]*)\s+as\s+(.+)$/i);
    if (am) {
      var a2 = am[2].replace(/[()]/g, ' ').replace(/\s+/g, ' ').replace(/["']/g, '').trim();
      out.push('actor ' + am[1] + ' as ' + a2);
      continue;
    }

    // subgraph 上位机 (Host PC) → subgraph SG1["上位机 (Host PC)"]
    var sm = trimmed.match(/^subgraph\s+(.+)$/i);
    if (sm) {
      var rest = sm[1].trim();
      if (/^[A-Za-z][\w-]*\s*\[/.test(rest)) {
        out.push(trimmed);
        continue;
      }
      if (/^[A-Za-z][\w-]*$/.test(rest) && !/[\s(]/.test(rest)) {
        out.push(trimmed);
        continue;
      }
      var label = rest
        .replace(/^\[|\]$/g, '')
        .replace(/^["']|["']$/g, '')
        .replace(/"/g, "'");
      sg += 1;
      out.push('subgraph SG' + sg + '["' + label + '"]');
      continue;
    }

    // A1(含括号) → A1["含括号"]
    var roundNode = trimmed.match(/^([A-Za-z][\w-]*)\((.+)\)\s*(-->|---|===|-.->)?(.*)$/);
    if (roundNode && /[()]/.test(roundNode[2])) {
      var tail = (roundNode[3] || '') + (roundNode[4] || '');
      out.push(roundNode[1] + '["' + roundNode[2].replace(/"/g, "'") + '"]' + (tail ? ' ' + tail.trim() : ''));
      continue;
    }

    out.push(trimmed);
  }
  return out.join('\n');
}

function mountMermaidIn(root) {
  if (!root) return;
  var blocks = root.querySelectorAll('.md-mermaid-wrap');
  if (!blocks.length) return;
  window.ensureMermaidLib(function () {
    blocks.forEach(function (wrap) {
      if (wrap.getAttribute('data-done') === '1') return;
      var src = wrap.querySelector('.md-mermaid-src');
      var out = wrap.querySelector('.md-mermaid-out');
      if (!src || !out) return;
      var original = (src.textContent || '').trim();
      if (!original) {
        out.textContent = '';
        return;
      }
      var code = sanitizeMermaidCode(original);
      if (!window.mermaid) {
        out.innerHTML = '<pre class="chat-md-code">' + escapeHtml(code) +
          '</pre><p class="loading-hint">未加载到 Mermaid，已显示源码（可将 mermaid.min.js 放到 frontend/js/vendor/）</p>';
        wrap.setAttribute('data-done', '1');
        return;
      }
      var id = 'mmd_' + Math.random().toString(36).slice(2, 10);
      window.mermaid
        .render(id, code)
        .then(function (res) {
          out.innerHTML = res.svg;
          wrap.setAttribute('data-done', '1');
        })
        .catch(function (err) {
          out.innerHTML =
            '<p class="loading-hint" style="color:var(--error);margin:0 0 8px;">流程图语法不兼容，已改为展示源码（可追问「去掉流程图」或「用文字描述结构」）</p>' +
            '<pre class="chat-md-code">' + escapeHtml(code) + '</pre>' +
            '<p style="color:var(--text-muted);font-size:11px;margin:6px 0 0;">' +
            escapeHtml(err.message || String(err)) + '</p>';
          wrap.setAttribute('data-done', '1');
        });
    });
  });
}
