---
name: svn-to-git-03-push-gitlab
description: >-
  在本地 GitLab 建 Private 空项目，经 HTTP 隧道 push 全部分支与标签并验收网页历史。
  在 SVN 迁 Git 第 3 步、svn-to-git-03、推送到 GitLab 时使用。
---

# SVN → GitLab · 03 推送到 GitLab

## 前置

- 02 完成；本地 `%WORK_ROOT%\%LOCAL_DIR%` 可 `git log`。
- 变量：`TARGET_GROUP`（形如 `is20pro/PC`）、`TARGET_PROJECT`、`GIT_HTTP_TUNNEL`、`GITLAB_HOST`。
- 产品 Group 与子组 **`PC`/`MC`/`MX` 已预先建好**；有 Maintainer 或更高权限 + PAT。

## 步骤

### 0) 若子组尚未建立（批次开始时做一次）

网页：New Group → `<产品>`（Private）→ 在组内 New subgroup → 依次建 `PC`、`MC`、`MX`（Private）。  
确认路径可打开：`http://$GITLAB_HOST/<产品>/PC` 等。

### 1) 建空项目（Private，无 README）

网页：进入目标子组（如 `<产品>/MX`）→ New project → 空白 → Private → **不**初始化 README。

或 API（示例，Token 勿入库）：

```text
POST /api/v4/projects
{ "name": "<显示名>", "path": "<TARGET_PROJECT>", "namespace_id": <组ID>, "visibility": "private", "initialize_with_readme": false }
```

默认分支稍后以推送的 `main` 为准。

### 2) 开 HTTP 隧道（本环境必做）

开发机运行项目根目录 `git_http_tunnel.bat`，保持窗口不关。

推送 URL 基址：`%GIT_HTTP_TUNNEL%`（默认 `http://127.0.0.1:18173`），**不要**对 `http://%GITLAB_HOST%` 直连 `git.exe`（易 400）。

### 3) 添加 remote 并推送

```bat
cd /d "%WORK_ROOT%\%LOCAL_DIR%"
git remote remove origin 2>nul
git remote add origin "%GIT_HTTP_TUNNEL%/%TARGET_GROUP%/%TARGET_PROJECT%.git"
git push -u origin --all
git push origin --tags
```

认证：用户名 `oauth2`，密码 = PAT（`write_repository`）。

### 4) 保护分支（与现网一致）

Project → Settings → Repository → Protected branches：

- `main`：禁止 force push；Maintainer 合并
- `release/*`：同上

### 5) 验收

- [ ] 网页 Commits 能看到历史（不止 1 条初始提交）
- [ ] 文件树与 SVN trunk（或 L2 根）抽样一致
- [ ] 另开终端经隧道 `git clone` 成功（可选）

## 完成门槛

- [ ] Private 空仓已建且已 push `--all` / `--tags`
- [ ] 保护分支已设或已记录待设
- [ ] 网页历史验收通过

## 下一步

- 试迁：请用户确认后，对其余清单项重复 01→03  
- 全部迁完或试迁通过后 → `svn-to-git-04-cutover`
