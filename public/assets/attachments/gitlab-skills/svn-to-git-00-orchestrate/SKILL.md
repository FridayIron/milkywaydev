---
name: svn-to-git-00-orchestrate
description: >-
  编排 SVN→本地 GitLab 迁移全流程（编号 Skills 01–04），保留提交历史；参数化 SVN URL 与目标 Group。
  在用户说 SVN 迁 Git、svn-to-git、保留日志迁仓、按步骤迁 SVN 时使用。
---

# SVN → GitLab · 00 编排

## 目标

在**保留作者/时间/说明**的前提下，把 SVN 项目迁入内网 GitLab（默认 `http://192.168.1.173`），并完成试迁验收与切换约定。

本系列 Skills：`.cursor/skills/svn-to-git-*`。  
人类命令长文：项目根目录 `3.SVN到Git迁移方案与操作手册.md`。

## 已拍板默认策略（改口须用户明确说）

| 代号 | 决策 |
|---|---|
| 工具 | `git svn clone`（不用 svn export；不用长期 SubGit 双写） |
| H1 | 全历史 |
| G1 | 方案1：产品顶层 Group + 子组 `PC`/`MC`/`MX`；**先建组再迁仓** |
| A1 | 先 `authors.txt` 映射，再正式 clone |
| C1 | 试迁 1 仓 → 批量 → SVN 只读切换 |
| 布局 | 标准 trunk/branches/tags 用 `-s`；无 trunk 则该仓不加 `-s` |
| 首迁 | 不清洗 `git-svn-id`；验证后再谈 `filter-repo` |
| 推送 | 本机经 `git_http_tunnel.bat` → `http://127.0.0.1:18173/...` |

## 换批次/新清单时先做

1. 读取 [env-template.md](env-template.md) 与 [project-list-template.md](project-list-template.md)。
2. 回显变量与项目表（**不含 SVN/GitLab 密码**）请用户确认。
3. 从 **01** 开始；已完成步骤可跳过并记录原因。

## 执行顺序（强制）

| 序号 | Skill | 产出门槛（未达成不得进下一步） |
|---|---|---|
| 01 | `svn-to-git-01-inventory` | SVN 可达；布局 L1/L2 已判定；作者草稿已导出 |
| 02 | `svn-to-git-02-convert` | 本地 `git svn` 仓存在；`git log` 可抽样核对 |
| 03 | `svn-to-git-03-push-gitlab` | GitLab Private 空仓已建；`--all`/`--tags` 已推；网页可见历史 |
| 04 | `svn-to-git-04-cutover` | 切换清单已交付；SVN 只读动作已确认或明确延期 |

## Agent 行为规则

1. **一次只跑一个编号 Skill**，除非用户明确「按清单试迁/批量全跑」。
2. 每步结束输出：`完成项` / `未完成项` / `下一步 Skill 名`。
3. **未拿到项目清单与 authors 确认前，禁止正式 clone/push。**
4. 禁止把 SVN/GitLab 密码、PAT 写入 skill、手册、仓库。
5. 不批量改同事机器；不做长期 SVN/Git 双写；不大文件历史重写（另开任务）。
6. 推送前确认 `git_http_tunnel.bat` 已开（本环境 `git.exe` 直连 GitLab HTTP 易 400）。

## 全流程验收（04 之后）

- [ ] 至少一个试迁仓网页历史与 SVN 抽样一致
- [ ] 目标 Group/保护分支符合现网规范
- [ ] 切换日与 SVN 只读策略已书面约定
- [ ] 其余清单项目已迁或已排期

## 触发话术示例

- 「读取 svn-to-git-00，按清单试迁第 1 个项目」
- 「执行 svn-to-git-01-inventory，URL=…」
- 「authors 已确认，开始 svn-to-git-02」
