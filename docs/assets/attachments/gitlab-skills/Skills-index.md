# GitLab / SVN 迁移 · Skills 索引

本目录下的可复用执行模块（Cursor Agent Skills）位于：

`.cursor/skills/`

---

## A. 本地 GitLab 部署（`gitlab-local-*`）

换服务器时：先填 `gitlab-local-00-orchestrate/env-template.md` 中的变量，再按序号让 Agent 执行。

| 顺序 | 目录 | 作用 |
|---|---|---|
| 00 | `.cursor/skills/gitlab-local-00-orchestrate` | 编排全流程 + 环境变量模板 |
| 01 | `.cursor/skills/gitlab-local-01-probe` | 连通与硬件/磁盘摸底 |
| 02 | `.cursor/skills/gitlab-local-02-sysprep` | 系统包、时区、防火墙、80 端口 |
| 03 | `.cursor/skills/gitlab-local-03-datadisk` | 数据盘挂载与路径规划 |
| 04 | `.cursor/skills/gitlab-local-04-install` | Omnibus 安装 GitLab CE |
| 05 | `.cursor/skills/gitlab-local-05-admin` | 关注册、Group/权限/保护分支 |
| 06 | `.cursor/skills/gitlab-local-06-client` | 开发机 SSH / clone / push |
| 07 | `.cursor/skills/gitlab-local-07-backup` | 备份、cron、升级注意 |

人类阅读长文：`1.gitlab本地配置指南.md`。  
**自己动手命令清单**：`2.GitLab部署操作命令手册.md`。

话术示例：

- 「读取 gitlab-local-00，用当前 HOST=… 从 01 开始」
- 「执行 gitlab-local-03-datadisk」

---

## B. SVN → GitLab 迁移（`svn-to-git-*`）

保留提交历史迁仓。先填 `svn-to-git-00-orchestrate/env-template.md` 与 `project-list-template.md`，确认后再执行。

| 顺序 | 目录 | 作用 |
|---|---|---|
| 00 | `.cursor/skills/svn-to-git-00-orchestrate` | 编排 + 环境/清单模板 |
| 01 | `.cursor/skills/svn-to-git-01-inventory` | SVN 连通、布局、作者草稿 |
| 02 | `.cursor/skills/svn-to-git-02-convert` | `git svn clone`、对齐 `main` |
| 03 | `.cursor/skills/svn-to-git-03-push-gitlab` | 建空仓、隧道 push、保护分支 |
| 04 | `.cursor/skills/svn-to-git-04-cutover` | SVN 只读切换与通知 |

人类命令长文：`3.SVN到Git迁移方案与操作手册.md`。  
迁仓后的日常开发 / 同事培训：`4.Git日常开发与培训手册.md`（clone → 分支 → 提交 → MR → 合并）。  
**实际上机以编号 Skill + 手册为准；未提供项目清单前不执行 clone/push。**

话术示例：

- 「读取 svn-to-git-00，按清单试迁第 1 个项目」
- 「执行 svn-to-git-01-inventory，URL=…」
- 「authors 已确认，开始 svn-to-git-02」
