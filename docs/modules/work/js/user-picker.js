/* 可搜索人员下拉（消息 / 工作计划 / 账号指派共用） */
window.UserPicker = (function () {
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function labelOf(u) {
    if (!u) return '';
    var bits = [u.username || ('#' + u.id)];
    if (u.tech_dir_name) bits.push(u.tech_dir_name);
    else if (u.role_label || u.role) bits.push(u.role_label || u.role);
    return bits.join(' · ');
  }

  /**
   * @param {HTMLElement|string} el
   * @param {{
   *   users: Array,
   *   value?: string|number|null,
   *   placeholder?: string,
   *   emptyLabel?: string,
   *   allowEmpty?: boolean,
   *   disabled?: boolean,
   *   onChange?: function
   * }} opts
   */
  function mount(el, opts) {
    opts = opts || {};
    var root = typeof el === 'string' ? document.querySelector(el) : el;
    if (!root) return null;
    var users = (opts.users || []).slice();
    var value = opts.value == null || opts.value === '' ? '' : String(opts.value);
    var placeholder = opts.placeholder || '选择人员…';
    var emptyLabel = opts.emptyLabel || '不选择';
    var allowEmpty = opts.allowEmpty !== false;
    var disabled = !!opts.disabled;
    var uid = 'up_' + Math.random().toString(36).slice(2, 9);

    root.classList.add('user-picker');
    root.innerHTML =
      '<button type="button" class="user-picker-btn" id="' + uid + '_btn"' +
      (disabled ? ' disabled style="opacity:.65;cursor:not-allowed;"' : '') + '>' +
      '<span class="user-picker-label" id="' + uid + '_label">' + esc(placeholder) + '</span>' +
      '<span class="user-picker-caret">▾</span></button>' +
      '<input type="hidden" id="' + uid + '_val" value="' + esc(value) + '">' +
      '<div class="user-picker-drop" id="' + uid + '_drop" hidden>' +
      '<input type="search" class="user-picker-search" id="' + uid + '_search" placeholder="输入姓名或技术方向…" autocomplete="off">' +
      '<div class="user-picker-list" id="' + uid + '_list"></div></div>';

    var btn = document.getElementById(uid + '_btn');
    var labelEl = document.getElementById(uid + '_label');
    var drop = document.getElementById(uid + '_drop');
    var search = document.getElementById(uid + '_search');
    var list = document.getElementById(uid + '_list');
    var hidden = document.getElementById(uid + '_val');

    function selectedUser() {
      if (!value) return null;
      for (var i = 0; i < users.length; i++) {
        if (String(users[i].id) === String(value)) return users[i];
      }
      return null;
    }

    function syncLabel() {
      var u = selectedUser();
      labelEl.textContent = u ? labelOf(u) : (allowEmpty && !value ? emptyLabel : placeholder);
      hidden.value = value;
    }

    function renderList(kw) {
      kw = String(kw || '').trim().toLowerCase();
      var rows = [];
      if (allowEmpty) {
        rows.push({ id: '', username: emptyLabel, _empty: true });
      }
      users.forEach(function (u) {
        var hay = ((u.username || '') + ' ' + (u.tech_dir_name || '') + ' ' +
          (u.role_label || u.role || '')).toLowerCase();
        if (!kw || hay.indexOf(kw) >= 0) rows.push(u);
      });
      list.innerHTML = rows.map(function (u) {
        var id = u._empty ? '' : String(u.id);
        var active = String(value) === id ? ' active' : '';
        return '<button type="button" class="user-picker-item' + active + '" data-id="' + esc(id) + '">' +
          esc(u._empty ? emptyLabel : labelOf(u)) + '</button>';
      }).join('') || '<div class="user-picker-empty">无匹配人员</div>';
      list.querySelectorAll('[data-id]').forEach(function (b) {
        b.onclick = function () {
          value = b.getAttribute('data-id') || '';
          syncLabel();
          drop.hidden = true;
          if (opts.onChange) opts.onChange(value ? Number(value) : null, selectedUser());
        };
      });
    }

    function open() {
      drop.hidden = false;
      search.value = '';
      renderList('');
      setTimeout(function () { search.focus(); }, 0);
    }

    btn.onclick = function (ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if (disabled) return;
      if (drop.hidden) open();
      else drop.hidden = true;
    };
    search.oninput = function () { renderList(search.value); };
    search.onclick = function (ev) { ev.stopPropagation(); };

    if (!window.__userPickerDocBound) {
      window.__userPickerDocBound = true;
      document.addEventListener('click', function () {
        document.querySelectorAll('.user-picker-drop').forEach(function (d) {
          d.hidden = true;
        });
      });
    }
    drop.onclick = function (ev) { ev.stopPropagation(); };

    syncLabel();
    return {
      getValue: function () { return value ? Number(value) : null; },
      setValue: function (v) {
        value = v == null || v === '' ? '' : String(v);
        syncLabel();
      },
      setUsers: function (arr) {
        users = (arr || []).slice();
        syncLabel();
        if (!drop.hidden) renderList(search.value);
      },
      destroy: function () { root.innerHTML = ''; }
    };
  }

  return { mount: mount, labelOf: labelOf };
})();
