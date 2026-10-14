---
name: svn-to-git-01-inventory
description: >-
  盘点 SVN：连通性、trunk/branches/tags 布局、作者列表草稿、externals 提示。
  在 SVN 迁 Git 第 1 步、svn-to-git-01、扫作者、确认布局时使用。
---

# SVN → GitLab · 01 盘点

## 前置

- 00 编排变量已填：`SVN_URL`、`WORK_ROOT`、`AUTHORS_FILE`。
- 本机有 `svn` 与 `git`（含 git-svn）；能访问 SVN 服务器。

## 步骤（开发机）

### 1) 连通

```bat
svn info "%SVN_URL%"
svn list "%SVN_URL%"
```

失败则停：检查 URL、VPN/账号、防火墙。

### 2) 判定布局

```bat
svn list "%SVN_URL%"
```

| 列表含 | 判定 | 后续 |
|---|---|---|
| `trunk/` 且通常有 `branches/`、`tags/` | **L1** | `git svn clone -s …` |
| 直接是源码/工程文件，无 trunk | **L2** | `git svn clone`（不加 `-s`） |
| 多个产品子目录 | 拆清单多行 | 回到 00 改 `project-list`，每子目录单独 `SVN_URL` |

把结果写入会话：`LAYOUT=L1|L2`。

### 3) 导出作者草稿

```bat
mkdir "%WORK_ROOT%" 2>nul
svn log -q "%SVN_URL%" > "%WORK_ROOT%\svn_log_q.txt"
```

从日志提取唯一作者，生成 `%AUTHORS_FILE%.draft`，格式：

```text
svnuser = svnuser <svnuser@szdrawray.com>
```

**交给用户改成真实姓名与公司邮箱**，另存为正式 `authors.txt`（UTF-8）：

```text
svnuser = 张三 <zhangsan@szdrawray.com>
```

未映射作者不得进入 02 正式全量 clone（除非用户明确接受 A2 原始账号）。

### 4) externals / 体积粗查

```bat
svn propget svn:externals -R "%SVN_URL%"
svn list -v -R "%SVN_URL%" | more
```

有 externals：记入备注，迁后用 submodule 或拷贝约定（本 Skill 不自动改）。  
明显超大二进制目录：记入备注，首迁仍全量纳入历史；清理另开任务。

## 完成门槛

- [ ] `svn info` 成功
- [ ] `LAYOUT` 已判定
- [ ] 作者草稿已生成；用户已确认正式 `authors.txt` 或书面接受 A2
- [ ] externals/大文件风险已记录

## 下一步

→ `svn-to-git-02-convert`
