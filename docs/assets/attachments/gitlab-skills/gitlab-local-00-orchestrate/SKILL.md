---
name: gitlab-local-00-orchestrate
description: >-
  编排内网 GitLab CE Omnibus 本地部署全流程（编号 Skills 01–07），参数化主机与数据路径以便换服务器复用。
  在用户说本地 GitLab 部署、换服务器重装、执行 gitlab-local、按步骤搭仓时使用。
---

# GitLab 本地部署 · 00 编排

## 目标

按固定顺序驱动可复用模块，在 **Ubuntu 22.04 + Omnibus GitLab CE + 内网 HTTP** 上完成「可登录、可建仓、可 clone/push、有备份」。

本系列 Skills 位于项目：`.cursor/skills/gitlab-local-*`。

## 换服务器时先做

1. 读取 [env-template.md](env-template.md)，让用户填写/确认变量（至少 `GITLAB_HOST`、`EXTERNAL_URL`、`SSH_USER`）。
2. 将会话内生效的变量列表回显给用户确认（**不含密码**）。
3. 从 **01** 开始执行；已完成的步骤可跳过，但须记录跳过原因。

## 执行顺序（强制）

| 序号 | Skill | 产出门槛（未达成不得进下一步） |
|---|---|---|
| 01 | `gitlab-local-01-probe` | SSH 可达；已记录 CPU/内存/磁盘形态 `DISK_CASE` |
| 02 | `gitlab-local-02-sysprep` | 依赖包、时区、防火墙/80 端口就绪 |
| 03 | `gitlab-local-03-datadisk` | 数据落盘策略确定；B/C 时目录存在 |
| 04 | `gitlab-local-04-install` | `gitlab-ctl status` 正常；Web 可开；管理员已改密 |
| 05 | `gitlab-local-05-admin` | 关公开注册；Group/角色/保护分支约定落地 |
| 06 | `gitlab-local-06-client` | 至少一台开发机 SSH Key + clone/push 成功 |
| 07 | `gitlab-local-07-backup` | 手动备份成功；cron 或等价策略已设 |

权威长文（人类阅读）：项目根目录 `1.gitlab本地配置指南.md`。**执行以各编号 Skill 为准。**

## Agent 行为规则

1. **一次只跑一个编号 Skill**，除非用户明确说「从头跑完全流程」。
2. 每步结束输出：`完成项` / `未完成项` / `下一步 Skill 名`。
3. 破坏性操作（`mkfs`、删数据、restore）必须二次确认设备名/路径。
4. 禁止把密码写入 skill、指南、git 仓库；口令只口头/密钥管理传递。
5. 默认 `EXTERNAL_URL=http://$GITLAB_HOST`；不上公网、本期不做 Runner/HTTPS/LDAP。
6. 服务器命令经 SSH：`ssh $SSH_USER@$GITLAB_HOST '...'`；开发机命令在本地执行。

## 全流程验收（07 之后）

- [ ] Web：`$EXTERNAL_URL` 可登录
- [ ] 公开注册已关
- [ ] 数据盘策略与 `git_data_dirs`/`backup_path` 一致（若适用）
- [ ] 保护分支已设
- [ ] 开发机 `git clone` / `push` OK
- [ ] `gitlab-backup create` 有产物；`gitlab.rb` + `gitlab-secrets.json` 有副本

## 触发话术示例

- 「用 gitlab-local 从 01 开始」
- 「换服务器，HOST=x.x.x.x，按编排重装」
- 「执行 gitlab-local-04-install」
