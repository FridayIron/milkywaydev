---
name: gitlab-local-05-admin
description: >-
  GitLab 管理侧最小可用配置：关闭公开注册、建 Group/Project、角色与保护分支约定。
  在本地 GitLab 部署第 5 步、gitlab-local-05、组织权限初始化时使用。
---

# GitLab 本地部署 · 05 管理与组织

## 前置

- 04 完成；管理员可登录 `$EXTERNAL_URL`。
- 变量：`DEFAULT_GROUP`（默认 `embedded`）、`DEFAULT_BRANCH`（默认 `main`）、`REPO_SIZE_LIMIT_MB`（可选）。

## 步骤（Web 管理后台，路径因版本略有差异）

### 1) 关闭公开注册

Admin → Settings → General → Sign-up restrictions：关闭 Sign-up enabled（或改为仅邀请）。

账号由管理员创建：Admin → Users。

### 2) 建组织

```text
Group: $DEFAULT_GROUP
└── Project: <按产品/模块命名，Private>
```

- 一独立编译单元一仓；可见性 **Private**。
- 角色：Maintainer=模块负责人；Developer=日常开发；Reporter=只读。

### 3) 保护默认分支

Project → Settings → Repository → Protected branches：

| 分支 | 建议 |
|---|---|
| `$DEFAULT_BRANCH` | 禁止 force push；仅 Maintainer 合并 |
| `release/*` | Protected |
| `feature/*` | 不保护 |

全组统一 `main` 或 `master`，名称一致优先。

### 4) 可选：仓库大小

Admin → Settings → Repository：单仓上限约 `$REPO_SIZE_LIMIT_MB` MB（如 5120）。

### 5) 本期明确不做

HTTPS、CI Runner、LDAP、SMTP——需要时另开任务，不阻塞本 Skill。

## 完成门槛

- [ ] 公开注册已关
- [ ] 至少 1 个 Group + 1 个 Private Project
- [ ] 默认分支已保护
- [ ] 角色约定已向用户确认（可先只建管理员自己的 Developer 测试账号）

## 下一步

→ `gitlab-local-06-client`
