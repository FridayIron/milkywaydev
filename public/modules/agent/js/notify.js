/* 站内消息中心 */
window.NotifyCenter = (function () {
  var state = {
    tab: 'inbox',
    selectedId: null,
    replyToId: null,
    items: [],
    recipients: [],
    toPicker: null
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function refreshBadge() {
    var badge = document.getElementById('notifyBadge');
    if (!badge) return;
    if (Auth.isGuest && Auth.isGuest()) {
      badge.style.display = 'none';
      return;
    }
    try {
      var r = await API.unreadNotifications();
      var n = (r && r.unread) || 0;
      if (n > 0) {
        badge.style.display = '';
        badge.textContent = n > 99 ? '99+' : String(n);
      } else {
        badge.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.notify-tab').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-tab') === tab);
    });
    var browse = document.getElementById('notifyBrowsePane');
    var compose = document.getElementById('notifyComposePane');
    var delBtn = document.getElementById('btnNotifyDelThread');
    if (tab === 'compose') {
      browse.style.display = 'none';
      compose.style.display = 'grid';
      if (delBtn) delBtn.style.display = 'none';
      loadRecipients();
    } else {
      browse.style.display = 'flex';
      compose.style.display = 'none';
      loadList();
    }
  }

  async function loadRecipients() {
    var hint = document.getElementById('notifyPingHint');
    try {
      var st = await API.pingcodeStatus();
      if (hint) {
        hint.textContent = st.configured_base
          ? ('PingCode 基址已配置：' + (st.base_url || '') + '；可填工作项 ID 自动生成深链。')
          : (st.hint || '未配置 PingCode：可粘贴完整链接。');
      }
    } catch (e) {}
    try {
      var rec = await API.notificationRecipients();
      state.recipients = rec.items || [];
      var box = document.getElementById('notifyToUserPicker');
      if (!box) return;
      var cur = state.toPicker ? state.toPicker.getValue() : null;
      if (state.toPicker) state.toPicker.destroy();
      state.toPicker = UserPicker.mount(box, {
        users: state.recipients,
        value: cur,
        placeholder: '选择接收人…',
        emptyLabel: '请选择接收人',
        allowEmpty: true
      });
    } catch (e) {
      if (hint) hint.textContent = e.message || '接收人加载失败';
    }
  }

  async function loadList() {
    var listEl = document.getElementById('notifyList');
    var delBtn = document.getElementById('btnNotifyDelThread');
    if (!listEl) return;
    listEl.innerHTML = '<div class="notify-item-meta" style="padding:12px;">加载中…</div>';
    var box = state.tab === 'sent' ? 'sent' : 'inbox';
    try {
      var data = await API.listNotifications(50, box);
      var items = data.items || [];
      state.items = items;
      if (!items.length) {
        listEl.innerHTML = '<div class="notify-item-meta" style="padding:12px;">暂无消息</div>';
        state.selectedId = null;
        document.getElementById('notifyThread').innerHTML =
          '<div class="notify-thread-empty">暂无消息</div>';
        document.getElementById('notifyReplyBar').style.display = 'none';
        if (delBtn) delBtn.style.display = 'none';
      } else {
        listEl.innerHTML = items.map(function (it) {
          var peer = box === 'sent'
            ? ('发给 ' + (it.to_username || '#'))
            : (it.from_username || '系统');
          var active = String(it.id) === String(state.selectedId) ? ' active' : '';
          var unread = (!it.is_read && box === 'inbox') ? ' unread' : '';
          return '<div class="notify-row-item' + unread + active + '" data-id="' + it.id + '">' +
            '<div class="notify-item-title">' + esc(it.title || '') + '</div>' +
            '<div class="notify-item-meta">' + esc(peer) + ' · ' + esc(it.created_at || '') + '</div>' +
            '<div class="notify-row-actions">' +
            '<button type="button" data-del-thread="' + it.id + '">删除会话</button></div>' +
            '</div>';
        }).join('');
        listEl.querySelectorAll('.notify-row-item').forEach(function (el) {
          el.addEventListener('click', function (ev) {
            if (ev.target && ev.target.getAttribute('data-del-thread')) return;
            openThread(el.getAttribute('data-id'));
          });
        });
        listEl.querySelectorAll('[data-del-thread]').forEach(function (btn) {
          btn.onclick = function (ev) {
            ev.stopPropagation();
            deleteThread(btn.getAttribute('data-del-thread'));
          };
        });
        if (state.selectedId) {
          var still = items.some(function (x) { return String(x.id) === String(state.selectedId); });
          if (!still && items[0]) openThread(items[0].id);
          else if (still) openThread(state.selectedId);
        } else if (items[0]) {
          openThread(items[0].id);
        }
      }
      refreshBadge();
    } catch (e) {
      listEl.innerHTML = '<div class="notify-item-meta" style="padding:12px;">' +
        esc(e.message || '加载失败') + '</div>';
    }
  }

  async function deleteThread(id) {
    if (!confirm('确认删除该会话的全部消息？')) return;
    try {
      await API.deleteNotificationThread(id);
      if (String(state.selectedId) === String(id)) {
        state.selectedId = null;
        state.replyToId = null;
      }
      loadList();
      refreshBadge();
    } catch (e) {
      alert(e.message || '删除失败');
    }
  }

  async function deleteOne(id) {
    if (!confirm('确认删除这条消息？')) return;
    try {
      await API.deleteNotification(id);
      if (state.selectedId) await openThread(state.selectedId);
      loadList();
      refreshBadge();
    } catch (e) {
      alert(e.message || '删除失败');
    }
  }

  async function openThread(id) {
    state.selectedId = id;
    var delBtn = document.getElementById('btnNotifyDelThread');
    if (delBtn) delBtn.style.display = '';
    document.querySelectorAll('.notify-row-item').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-id') === String(id));
    });
    var threadEl = document.getElementById('notifyThread');
    var replyBar = document.getElementById('notifyReplyBar');
    threadEl.innerHTML = '<div class="notify-thread-empty">加载会话…</div>';
    try {
      var data = await API.notificationThread(id);
      var items = data.items || [];
      var meId = Auth.getUser && Auth.getUser() ? Auth.getUser().id : null;
      if (!items.length) {
        threadEl.innerHTML = '<div class="notify-thread-empty">会话为空</div>';
        replyBar.style.display = 'none';
        state.selectedId = null;
        if (delBtn) delBtn.style.display = 'none';
        loadList();
        return;
      }
      threadEl.innerHTML = items.map(function (it) {
        var mine = meId != null && Number(it.from_user_id) === Number(meId);
        var canDel = meId != null && (
          Number(it.from_user_id) === Number(meId) || Number(it.to_user_id) === Number(meId)
        );
        var links = '';
        if (it.link_url) links += '<a href="' + esc(it.link_url) + '" target="_blank" rel="noopener">本站链接</a> ';
        if (it.pingcode_url) links += '<a href="' + esc(it.pingcode_url) + '" target="_blank" rel="noopener">PingCode</a>';
        return '<div class="notify-bubble ' + (mine ? 'mine' : 'theirs') + '">' +
          '<div class="notify-bubble-title">' + esc(it.title || '') + '</div>' +
          '<div class="notify-bubble-meta">' +
            esc((mine ? '我' : (it.from_username || '系统')) + ' → ' + (it.to_username || '')) +
            ' · ' + esc(it.created_at || '') +
          '</div>' +
          (it.body ? '<div class="notify-bubble-body">' + esc(it.body) + '</div>' : '') +
          (links ? '<div class="notify-item-links">' + links + '</div>' : '') +
          (canDel ? '<div class="notify-bubble-actions"><button type="button" data-del-one="' +
            it.id + '">删除这条</button></div>' : '') +
          '</div>';
      }).join('');
      threadEl.scrollTop = threadEl.scrollHeight;
      threadEl.querySelectorAll('[data-del-one]').forEach(function (btn) {
        btn.onclick = function () { deleteOne(btn.getAttribute('data-del-one')); };
      });
      var last = items[items.length - 1];
      state.replyToId = last.id;
      replyBar.style.display = last.from_user_id != null ? 'flex' : 'none';
      document.getElementById('notifyReplyBody').value = '';
      document.querySelectorAll('.notify-row-item.unread').forEach(function (el) {
        if (el.getAttribute('data-id') === String(id)) el.classList.remove('unread');
      });
      refreshBadge();
    } catch (e) {
      threadEl.innerHTML = '<div class="notify-thread-empty">' +
        esc(e.message || '加载失败') + '</div>';
      replyBar.style.display = 'none';
    }
  }

  function bind() {
    document.querySelectorAll('.notify-tab').forEach(function (btn) {
      btn.onclick = function () { setTab(btn.getAttribute('data-tab')); };
    });
    var readAll = document.getElementById('btnNotifyReadAll');
    if (readAll) {
      readAll.onclick = async function () {
        try {
          await API.markAllNotificationsRead();
          loadList();
          refreshBadge();
        } catch (e) {
          alert(e.message || '操作失败');
        }
      };
    }
    var delThread = document.getElementById('btnNotifyDelThread');
    if (delThread) {
      delThread.onclick = function () {
        if (!state.selectedId) return;
        deleteThread(state.selectedId);
      };
    }
    var replyBtn = document.getElementById('btnNotifyReply');
    if (replyBtn) {
      replyBtn.onclick = async function () {
        var body = document.getElementById('notifyReplyBody').value.trim();
        if (!body) { alert('请输入回复内容'); return; }
        if (!state.replyToId) { alert('请先选择一条消息'); return; }
        replyBtn.disabled = true;
        try {
          await API.replyNotification(state.replyToId, { body: body });
          document.getElementById('notifyReplyBody').value = '';
          await openThread(state.selectedId || state.replyToId);
          if (state.tab === 'sent') loadList();
        } catch (e) {
          alert(e.message || '回复失败');
        } finally {
          replyBtn.disabled = false;
        }
      };
    }
    var sendBtn = document.getElementById('btnNotifySend');
    if (sendBtn) {
      sendBtn.onclick = async function () {
        var toId = state.toPicker ? state.toPicker.getValue() : null;
        var title = document.getElementById('notifyTitle').value.trim();
        if (!toId) { alert('请选择接收人'); return; }
        if (!title) { alert('请填写标题'); return; }
        sendBtn.disabled = true;
        try {
          var created = await API.createNotification({
            to_user_id: Number(toId),
            title: title,
            body: document.getElementById('notifyBody').value || '',
            link_url: document.getElementById('notifyLink').value || null,
            pingcode_work_item_id: document.getElementById('notifyPingcodeId').value || null,
            pingcode_url: document.getElementById('notifyPingcodeUrl').value || null
          });
          document.getElementById('notifyTitle').value = '';
          document.getElementById('notifyBody').value = '';
          document.getElementById('notifyLink').value = '';
          document.getElementById('notifyPingcodeId').value = '';
          document.getElementById('notifyPingcodeUrl').value = '';
          if (state.toPicker) state.toPicker.setValue(null);
          state.selectedId = created.item && created.item.id ? created.item.id : null;
          setTab('sent');
        } catch (e) {
          alert(e.message || '发送失败');
        } finally {
          sendBtn.disabled = false;
        }
      };
    }
  }

  function bootPage() {
    if (Auth.isGuest && Auth.isGuest()) {
      alert('游客不可使用站内消息');
      location.href = 'app.html';
      return;
    }
    var u = Auth.getUser() || {};
    var label = document.getElementById('msgUserLabel');
    if (label) label.textContent = (u.username || '-') + ' · ' + (u.role_label || u.role || '');
    bind();
    setTab('inbox');
    refreshBadge();
    setInterval(refreshBadge, 60000);
  }

  return {
    bootPage: bootPage,
    refreshBadge: refreshBadge
  };
})();
