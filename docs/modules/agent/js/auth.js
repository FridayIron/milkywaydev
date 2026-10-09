/* 多账号登录态：可同时保留多个账号，切换不互相覆盖 */
window.Auth = (function () {
  const ACCOUNTS_KEY = 'ivd_agent_accounts';
  const CURRENT_KEY = 'ivd_agent_current';
  // 兼容旧版单账号 key
  const LEGACY_TOKEN = 'ivd_agent_token';
  const LEGACY_USER = 'ivd_agent_user';

  function _readAccounts() {
    try {
      return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function _writeAccounts(map) {
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(map));
  }

  function _migrateLegacy() {
    var legacyToken = localStorage.getItem(LEGACY_TOKEN);
    var legacyUser = null;
    try {
      legacyUser = JSON.parse(localStorage.getItem(LEGACY_USER) || 'null');
    } catch (e) {
      legacyUser = null;
    }
    if (legacyToken && legacyUser && legacyUser.id != null) {
      var map = _readAccounts();
      var id = String(legacyUser.id);
      if (!map[id]) {
        map[id] = { token: legacyToken, user: legacyUser };
        _writeAccounts(map);
        if (!localStorage.getItem(CURRENT_KEY)) {
          localStorage.setItem(CURRENT_KEY, id);
        }
      }
      localStorage.removeItem(LEGACY_TOKEN);
      localStorage.removeItem(LEGACY_USER);
    }
  }

  _migrateLegacy();

  function listAccounts() {
    var map = _readAccounts();
    return Object.keys(map).map(function (id) {
      return map[id];
    });
  }

  function getCurrentId() {
    return localStorage.getItem(CURRENT_KEY) || '';
  }

  function getSession() {
    var id = getCurrentId();
    if (!id) return null;
    var map = _readAccounts();
    return map[id] || null;
  }

  function getToken() {
    var s = getSession();
    return (s && s.token) || '';
  }

  function getUser() {
    var s = getSession();
    return (s && s.user) || null;
  }

  /** 登录或游客进入：写入账号列表并切到该账号（不覆盖其他已登录账号） */
  function setSession(token, user) {
    if (!user || user.id == null) return;
    var map = _readAccounts();
    var id = String(user.id);
    map[id] = { token: token, user: user };
    _writeAccounts(map);
    localStorage.setItem(CURRENT_KEY, id);
  }

  /** 更新当前账号本地缓存的用户资料（改名等） */
  function updateCurrentUser(user) {
    if (!user || user.id == null) return;
    var map = _readAccounts();
    var id = String(user.id);
    if (!map[id]) return;
    map[id].user = Object.assign({}, map[id].user || {}, user);
    _writeAccounts(map);
    localStorage.setItem(CURRENT_KEY, id);
  }

  /** 仅退出当前账号；若还有其他账号则自动切到其中一个 */
  function clearSession() {
    var id = getCurrentId();
    var map = _readAccounts();
    if (id && map[id]) {
      delete map[id];
      _writeAccounts(map);
    }
    var remain = Object.keys(map);
    if (remain.length) {
      localStorage.setItem(CURRENT_KEY, remain[0]);
      return true; // 仍有账号在线
    }
    localStorage.removeItem(CURRENT_KEY);
    return false;
  }

  function switchAccount(userId) {
    var map = _readAccounts();
    var id = String(userId);
    if (!map[id]) return false;
    localStorage.setItem(CURRENT_KEY, id);
    return true;
  }

  function isLoggedIn() {
    return !!getToken() && !!getUser();
  }

  function isSuperAdmin() {
    var u = getUser();
    return !!(u && u.role === 'super');
  }

  function isDeveloper() {
    var u = getUser();
    return !!(u && u.role === 'developer');
  }

  /** 系统内置根管理员（wangqiao / yudaijun）：不可删除；仅可改技术方向 */
  var SYSTEM_ROOT_NAMES = { wangqiao: 1, yudaijun: 1 };
  function isSystemRootUser(userOrName) {
    if (userOrName && typeof userOrName === 'object') {
      if (userOrName.is_system_root) return true;
      return !!SYSTEM_ROOT_NAMES[String(userOrName.username || '').toLowerCase()];
    }
    return !!SYSTEM_ROOT_NAMES[String(userOrName || '').toLowerCase()];
  }

  function canManageUsers() {
    return isSuperAdmin() || isDeveloper();
  }

  function isAdmin() {
    var u = getUser();
    return !!(u && (u.role === 'developer' || u.role === 'super' || u.role === 'admin'));
  }

  function canAccessCategory(categoryId) {
    var u = getUser();
    if (!u) return false;
    if (u.permissions && u.permissions.includes('all')) return true;
    return (u.permissions || []).includes(categoryId);
  }

  function isGuest() {
    var u = getUser();
    return !!(u && (u.role === 'guest' || u.is_guest));
  }

  function canAccessMaterials() {
    return isLoggedIn() && !isGuest();
  }

  /** 知识库下载：开发者始终可；其他账号需管理员开通 kb_download */
  function truthyFlag(v) {
    return v === true || v === 1 || v === '1' || v === 'true';
  }

  function canDownloadKb() {
    var u = getUser();
    if (!u || isGuest()) return false;
    if (u.role === 'developer') return true;
    return truthyFlag(u.kb_download);
  }

  /** 知识库删除：开发者始终可；其他账号需管理员开通 kb_delete */
  function canDeleteKb() {
    var u = getUser();
    if (!u || isGuest()) return false;
    if (u.role === 'developer') return true;
    return truthyFlag(u.kb_delete);
  }

  function requireLogin() {
    if (!isLoggedIn()) {
      window.location.href = 'index.html';
      return false;
    }
    return true;
  }

  return {
    getToken,
    getUser,
    setSession,
    updateCurrentUser,
    clearSession,
    switchAccount,
    listAccounts,
    getCurrentId,
    isLoggedIn,
    isSuperAdmin,
    isDeveloper,
    isSystemRootUser,
    canManageUsers,
    isAdmin,
    isGuest,
    canAccessMaterials,
    canAccessCategory,
    canDownloadKb,
    canDeleteKb,
    requireLogin
  };
})();
