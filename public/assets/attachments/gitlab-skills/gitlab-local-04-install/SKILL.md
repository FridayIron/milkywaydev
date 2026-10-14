---
name: gitlab-local-04-install
description: >-
  用官方 Omnibus 安装 GitLab CE，设置 EXTERNAL_URL、落盘路径、首次管理员改密与服务检查。
  在本地 GitLab 部署第 4 步、gitlab-local-04、重装 GitLab CE 时使用。
---

# GitLab 本地部署 · 04 安装 GitLab CE

## 前置

- 02、03 已完成；`EXTERNAL_URL`、`GITLAB_HOST` 已知；服务器能访问外网拉包（或用户已备离线源）。

## 步骤

### 1) 添加源并安装

```bash
apt install -y curl ca-certificates
curl -fsSL https://packages.gitlab.com/install/repositories/gitlab/gitlab-ce/script.deb.sh | bash
EXTERNAL_URL="$EXTERNAL_URL" apt install -y gitlab-ce
```

首次 `reconfigure` 可能 5–15 分钟，属正常。

### 2) 应用数据路径（DISK_CASE=B/C 或自定义备份路径时）

编辑 `/etc/gitlab/gitlab.rb`：

```ruby
external_url 'http://GITLAB_HOST'

git_data_dirs({
  "default" => { "path" => "GIT_DATA_PATH" }
})

gitlab_rails['backup_path'] = "BACKUP_PATH"
```

```bash
mkdir -p "$GIT_DATA_PATH" "$BACKUP_PATH"
gitlab-ctl reconfigure
gitlab-ctl restart
chown -R git:git "$(dirname "$GIT_DATA_PATH")" 2>/dev/null || chown -R git:git "$GIT_DATA_PATH" "$BACKUP_PATH"
```

### 3) 健康检查

```bash
gitlab-ctl status
curl -I http://127.0.0.1
# 可选：gitlab-rake gitlab:check SANITIZE=true
```

关键进程应为 `run`（puma/gitaly/redis/postgresql/nginx 等）。

### 4) 首次管理员密码

```bash
cat /etc/gitlab/initial_root_password
```

指导用户浏览器打开 `$EXTERNAL_URL`，用户名 `root`，登录后**立即改密**。密码不写入任何项目文件。初始文件约 24 小时有效。

## 完成门槛

- [ ] `gitlab-ce` 已安装
- [ ] `gitlab-ctl status` 正常
- [ ] 本机或开发机可打开 `$EXTERNAL_URL`
- [ ] 管理员密码已由用户修改（口头确认即可）
- [ ] 若需落盘：`git_data_dirs` / `backup_path` 已 reconfigure

## 下一步

→ `gitlab-local-05-admin`
