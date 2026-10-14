---
name: svn-to-git-02-convert
description: >-
  用 git svn clone 保留全历史转成本地 Git 仓，trunk 对齐 main，抽样核对 log。
  在 SVN 迁 Git 第 2 步、svn-to-git-02、git svn 转换时使用。
---

# SVN → GitLab · 02 转换（保留历史）

## 前置

- 01 完成；`LAYOUT`、正式 `authors.txt`（或用户书面接受 A2）已就绪。
- 变量：`SVN_URL`、`LOCAL_DIR`、`WORK_ROOT`、`AUTHORS_FILE`、`HISTORY_MODE=H1`。

## 步骤

### 1) 确认工具

```bat
git --version
git svn --version
```

无 `git svn` 则停：重装 Git for Windows 并勾选 svn 相关组件。

### 2) 全量 clone（H1）

在 `%WORK_ROOT%` 下执行。

**L1 标准布局：**

```bat
cd /d "%WORK_ROOT%"
git svn clone -s --authors-file="%AUTHORS_FILE%" --prefix=origin/ "%SVN_URL%" "%LOCAL_DIR%"
```

**L2 无 trunk：**

```bat
cd /d "%WORK_ROOT%"
git svn clone --authors-file="%AUTHORS_FILE%" "%SVN_URL%" "%LOCAL_DIR%"
```

说明：

- 大仓耗时长，保持网络稳定；勿并行压垮 SVN（批量时串行或限 1～2 路）。
- 仅当用户明确 H3 时加：`-r START:HEAD`。
- **首迁不**做 `git filter-repo` / 不剥 `git-svn-id`。

### 3) 默认分支对齐 `main`

```bat
cd /d "%WORK_ROOT%\%LOCAL_DIR%"
git branch
git checkout trunk
git branch -m main
```

若当前已是 `main`/`master`：

```bat
git branch -m master main
```

有 `origin/*` 远程跟踪分支时保持原样，push 时一并推送（见 03）。

### 4) 本地验收

```bat
git log --oneline -20
git log --format="%h %an <%ae> %ad %s" --date=short -5
svn log -l 5 "%SVN_URL%/trunk"
```

（L2 则 `svn log` 对 `SVN_URL`。）

核对：近期说明、作者、日期是否与 SVN 一致；提交总数数量级是否合理（空 revision 可略少）。

## 完成门槛

- [ ] 本地目录为有效 Git 仓且含 svn 历史
- [ ] 默认工作分支为 `main`（或已记录例外）
- [ ] 抽样 log 与 SVN 一致（记录比对的 revision/commit）

## 下一步

→ `svn-to-git-03-push-gitlab`
