---
title: 日月AI
description: 博客外壳入口 · 同域进入私人助手 HUD
aside: false
outline: false
---

# 日月AI

私人长期助手的**博客外壳**。公开站只做门面；登录后的 HUD / 日记 / 记忆 / RAG 跑在独立日月进程，**数据永不进本仓**。

## 进入方式

- **公网短链（推荐记这个）**：[`https://milkywaydev.cn/riyue/`](https://milkywaydev.cn/riyue/)  
  不进 Cloudflare；跳到板上当前公网隧道。隧道域名变了跑 `deploy/update-short-entry.ps1` 再推博客即可。  
- **本机开发**：Vite 把 `/riyue/` 反代到 `127.0.0.1:18765`，先 `start.bat`。  
- **板上局域网**：`http://192.168.137.2/riyue/`

<p class="riyue-actions">
  <a class="riyue-enter" href="/riyue/">进入日月（本机反代 / 公网短入口）</a>
  <a class="riyue-enter riyue-enter--ghost" href="http://192.168.137.2/riyue/">板上局域网</a>
  <a class="riyue-enter riyue-enter--ghost" href="https://milkywaydev.cn/riyue/">公网短链</a>
</p>

本机运维密码默认：`riyue-admin`（与 OTP 二选一）。说明见日月仓 `deploy/PUBLIC_ACCESS.md`。

| 路径 | 作用 |
|------|------|
| 工作台门户卡片「日月AI」 | 回到本外壳页 |
| `/riyue/` | 同域真实登录 + HUD（推荐） |
| `/pages/modules/riyue` | 博客布局内 iframe 嵌同一套 HUD |

默认登录邮箱：`2390253187@qq.com`（OTP；局域网可用运维密码旁路）。

## 分域关系

| | 技术博客 | 日月 |
|--|----------|------|
| 职责 | 公开履历、笔记、工具页 | 私人助手 HUD + 本地数据 |
| 仓库 | 本 VitePress 站 | 独立 `2_riyue_code/` |
| 浏览器路径 | `/`、`/pages/*` | 同域 `/riyue/` |
| 数据 | 公开内容 | `data/{account_id}/`，禁止互通 |

## 硬约束

1. 不把博客改造成聊天站；不把私有记忆写进 VitePress。  
2. 进程可共机，**数据严禁混库**。  
3. 禁止桌宠形态；不依赖 DSH。  
4. 板上目录 / Nginx 生产反代：**本机同域入口验收后再做**。

---

<small>约定见日月仓 `BLOG_SHELL.md`；进度 `1_riyue_/PROGRESS.md`。</small>

<style scoped>
.riyue-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin: 1rem 0 1.5rem;
}
.riyue-enter {
  display: inline-block;
  padding: 0.65rem 1.25rem;
  border: 1px solid rgba(54, 147, 255, 0.45);
  color: var(--vp-c-brand-1, #3693ff);
  text-decoration: none;
  letter-spacing: 0.08em;
  font-weight: 600;
}
.riyue-enter:hover {
  background: rgba(54, 147, 255, 0.08);
}
.riyue-enter--ghost {
  border-color: rgba(148, 163, 184, 0.45);
  color: var(--vp-c-text-2, #94a3b8);
  font-weight: 500;
}
</style>
