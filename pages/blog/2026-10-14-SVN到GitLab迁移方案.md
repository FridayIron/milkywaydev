---
title: SVN → GitLab 迁移方案（保留历史）
description: git svn 全历史迁仓、产品组 PC/MC/MX 树、试迁→批量→SVN 只读切换
date: 2026-10-14
---

# SVN → GitLab 迁移方案（保留历史）

> 目标：在**保留提交历史（作者/时间/说明）**的前提下，把 SVN 项目迁到内网 GitLab。  
> 原则：**先盘点 → 先试迁 1 仓 → 再批量 → 约定日 SVN 只读**。

---

## 1. 技术路线

| 方案 | 适用 | 本环境 |
|---|---|---|
| **A. `git svn`** | 标准 trunk/branches/tags 或可映射 | **默认采用** |
| B. `svn2git` | 布局极乱 | 备用 |
| C. `svn export` | 不要历史 | 不采用 |
| D. SubGit 双写 | 长期双向 | 不采用（截止切换） |

**策略代号**

| 项 | 决定 |
|---|---|
| H1 历史 | 全量 revision；首迁不清洗 `git-svn-id` |
| G1 落组 | 每产品一顶层 Group；子组固定 **PC / MC / MX** |
| A1 作者 | 先扫作者 → 补 `authors.txt` → 再正式 clone |
| C1 切换 | 试迁 → 批量 → 约定日 SVN 只读 |
| L1/L2 布局 | 有 trunk 用 `-s`；无 trunk 不加 `-s` |

---

## 2. GitLab 目录树（先建组，再迁代码）

```text
<产品 Group>          例：program
├── PC/               上位机
│   └── <工程>.git
├── MC/               中位机
│   └── <工程>.git
└── MX/               下位机 / MCU
    └── <工程>.git
```

<div class="blog-flow-col">
  <div class="blog-flow-node accent">New Group（产品，Private）</div>
  <div class="blog-flow-down">▼</div>
  <div class="blog-flow-tri">
    <div class="blog-flow-node">子组 PC</div>
    <div class="blog-flow-node">子组 MC</div>
    <div class="blog-flow-node">子组 MX</div>
  </div>
  <div class="blog-flow-down">▼</div>
  <div class="blog-flow-node">子组内 New project（空白、Private、无 README）</div>
  <div class="blog-flow-down">▼</div>
  <div class="blog-flow-node">git svn clone → push</div>
</div>

推送 URL 形如：`http://127.0.0.1:<隧道端口>/<产品>/<PC|MC|MX>/<工程>.git`  
清单里的「目标 Group」填完整路径，例如 `Program/MX`。

---

## 3. 标准操作链

<div class="blog-flow-col">
  <div class="blog-flow-row">
    <div class="blog-flow-node">① 清单+作者</div>
    <div class="blog-flow-arrow">→</div>
    <div class="blog-flow-node">② git svn clone</div>
    <div class="blog-flow-arrow">→</div>
    <div class="blog-flow-node">③ trunk→main</div>
  </div>
  <div class="blog-flow-down">▼</div>
  <div class="blog-flow-row">
    <div class="blog-flow-node">④ 建空项目</div>
    <div class="blog-flow-arrow">→</div>
    <div class="blog-flow-node">⑤ 隧道 push</div>
    <div class="blog-flow-arrow">→</div>
    <div class="blog-flow-node accent">⑥ 验收/切换</div>
  </div>
</div>

### 3.1 环境

```bat
git --version
git svn --version
svn --version
```

### 3.2 作者映射（A1）

```bat
svn log -q <SVN_URL>
```

整理 UTF-8 `authors.txt`：

```text
zhangsan = 张三 <zhangsan@company.com>
```

### 3.3 转换（H1）

```bat
REM L1 标准布局
git svn clone -s --authors-file=authors.txt --prefix=origin/ <SVN_URL> <本地目录>

REM L2 无 trunk
REM git svn clone --authors-file=authors.txt <SVN_URL> <本地目录>

cd <本地目录>
git checkout trunk
git branch -m main
```

抽样对比 `git log` 与 `svn log`。

### 3.4 推送

若本机 `git` 直连 GitLab HTTP 易 400：先开 HTTP/SSH 隧道，再用 `127.0.0.1` 地址：

```bat
git remote add origin http://127.0.0.1:<PORT>/<GROUP>/<PROJECT>.git
git push -u origin --all
git push origin --tags
```

HTTP 认证：Username `oauth2`，Password = PAT（`write_repository`）。  
随后保护 `main`、`release/*`。

### 3.5 验收与切换（C1）

- [ ] 提交数量级与 SVN 大致一致  
- [ ] 抽样作者/日期/说明一致  
- [ ] 网页可见历史；建议 clone 后能编译  
- [ ] 末次 `git svn fetch` + 补推 → 通知 SVN 只读 → 文档改 Git URL  
- [ ] SVN 只读保留建议 ≥ 6 个月  

**未提供项目清单前：不执行 clone/push。**

---

## 4. 风险速览

| 风险 | 处理 |
|---|---|
| 作者未映射 | 补 `authors.txt` 再 clone |
| 巨大二进制在历史中 | 首迁保留；清理另开 `filter-repo` 任务 |
| `svn:externals` | 盘点记下；迁后 submodule 或约定拷贝 |
| 迁后 SVN 仍有人写 | 切换前再 fetch/补推 |
| git HTTP 400 | 必须走本机隧道/代理 |

---

## 附件 · Cursor Skills

| 附件 | 内容 |
|---|---|
| [svn-to-git-skills.zip](/assets/attachments/svn-to-git-skills.zip) | `svn-to-git-00`～`04` + 索引 |
| [project-list-template.md](/assets/attachments/gitlab-skills/svn-to-git-00-orchestrate/project-list-template.md) | 项目清单模板 |
| [env-template.md](/assets/attachments/gitlab-skills/svn-to-git-00-orchestrate/env-template.md) | 环境变量模板 |

话术示例：「读取 svn-to-git-00，这是项目清单…」「authors 已确认，开始 svn-to-git-02」。

<style>
.blog-flow-row { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; justify-content: center; }
.blog-flow-node {
  min-width: 100px; padding: 0.65rem 0.9rem; text-align: center;
  border: 1px solid #cbd5e1; border-radius: 12px; background: #f8fafc;
  font-size: 0.85rem; line-height: 1.35;
}
.blog-flow-node.accent { background: #ecfeff; border-color: #5eead4; font-weight: 600; }
.blog-flow-arrow, .blog-flow-down { color: #64748b; font-size: 0.8rem; }
.blog-flow-col { display: flex; flex-direction: column; align-items: center; gap: 0.45rem; margin: 1.25rem 0; }
.blog-flow-tri { display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
</style>
