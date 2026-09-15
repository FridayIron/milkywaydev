# GitHub Pages 部署说明（当前正式方式）

> 本文记录 **通过 GitHub 把个人博客发布到公网** 的完整流程。  
> 域名：**milkywaydev.cn** / **www.milkywaydev.cn**（以你 DNS / Pages 实际绑定为准）  
> 仓库：`git@github.com:FridayIron/milkywaydev.git`  
> 发布分支：**main**，GitHub Pages 站点目录：**/docs**

> **说明**：仓库里的 `docs/` 是 `npm run deploy` 生成的**静态网站成品**，每次构建会整目录覆盖，不要手改里面的 HTML。  
> 本说明等 Markdown 写在**项目根目录**（与 `腾讯云部署说明.md` 同级），下次 `deploy` 后也会出现在站点里。

---

## 一、整体原理（忘掉细节时先看这里）

```
本地改 Markdown / 配置
        ↓
  npm run deploy
  （VitePress 构建 → 复制到 docs/）
        ↓
  git add / commit / push 到 GitHub（必须包含 docs/）
        ↓
  GitHub Pages 读取 main 分支的 /docs
        ↓
  公网可访问：https://milkywaydev.cn
```

这是**纯静态站**：没有服务器跑 Node/Python。访客打开的是 GitHub 托管的 HTML/CSS/JS。

---

## 二、当前仓库与 Pages 配置（已配好，一般不用再改）

| 项 | 当前值 |
|----|--------|
| 远程仓库 | `origin` → `git@github.com:FridayIron/milkywaydev.git` |
| 默认分支 | `main` |
| Pages 来源 | Deploy from a branch |
| Branch | `main` |
| Folder | `/docs`（不是根目录 `/`） |
| 自定义域名 | `milkywaydev.cn`（`docs/CNAME` / 根目录 `CNAME`） |
| 站点 base | `/`（见 `.vitepress/config.mjs` 的 `base: '/'`） |

### 2.1 在 GitHub 网页上核对（很久没部署时建议看一眼）

1. 打开仓库：https://github.com/FridayIron/milkywaydev  
2. **Settings → Pages**  
3. 确认：
   - Source = **Deploy from a branch**
   - Branch = **main**
   - Folder = **/docs**
   - Custom domain = **milkywaydev.cn**（若启用了 Enforce HTTPS，保持勾选）

### 2.2 域名 DNS（换过域名商或 DNS 时才需要）

GitHub Pages 自定义域名通常需要：

- **A 记录** 指向 GitHub Pages IP（以 GitHub 官方文档当前列表为准），或  
- **CNAME** 把 `www` / 根域指到 `FridayIron.github.io`（按你账号/仓库的 Pages 提示填写）

根目录 / `docs/` 里的 `CNAME` 文件内容应为：

```text
milkywaydev.cn
```

若执行 `npm run deploy` 后发现 `docs/CNAME` 没了：把项目根目录的 `CNAME` 再复制进 `docs/`，或长期放到 `public/CNAME`（构建时会自动带进成品）。

---

## 三、日常更新上线（最常用，记住这 4 步）

### 1. 本地改内容

例如改 `pages/*.md`、加工具、改 `.vitepress/config.mjs` 导航等。

### 2. 构建到 `docs/`

在项目根目录执行：

```bash
npm run deploy
```

Windows PowerShell 若提示禁止运行 `npm.ps1`，改用：

```powershell
npm.cmd run deploy
```

或：

```powershell
cmd /c "npm run deploy"
```

成功后会看到类似：`✓ 已复制构建结果到 docs/`。

### 3. 提交并推送到 GitHub（关键：要带上 `docs/`）

```bash
git status
git add .
git commit -m "更新站点内容"
git push origin main
```

只改了源码却**没 push `docs/`**，线上不会变。

### 4. 等 Pages 生效后访问

- 正式站：https://milkywaydev.cn  
- 备用查看：仓库 Settings → Pages 里显示的 `*.github.io` 地址  

一般几十秒到几分钟。若页面还是旧的：无痕窗口、强刷，或等 CDN/浏览器缓存过期。

---

## 四、首次从零配置（新电脑 / 新仓库才需要）

### 4.1 环境

- 安装 [Node.js](https://nodejs.org/)（建议 LTS）
- 安装 Git，并配置好对本仓库的 SSH 或 HTTPS 登录

### 4.2 拉代码与安装依赖

```bash
git clone git@github.com:FridayIron/milkywaydev.git
cd milkywaydev
npm install
```

### 4.3 本地预览

```bash
npm run dev
```

浏览器打开终端打印的地址（多为 `http://localhost:5173`）。

### 4.4 开启 GitHub Pages（若仓库还没开）

1. 先在本地执行一次 `npm run deploy`，并 push 含 `docs/` 的提交  
2. GitHub → Settings → Pages → Branch 选 `main`，Folder 选 `/docs` → Save  
3. 填入自定义域名 `milkywaydev.cn`，按提示配 DNS  
4. 勾选 HTTPS（证书签发可能要等一会儿）

---

## 五、命令速查

| 命令 | 作用 |
|------|------|
| `npm install` | 安装依赖（新环境 / 依赖变更后） |
| `npm run dev` | 本地开发预览 |
| `npm run build` | 只构建到 `.vitepress/dist` |
| `npm run deploy` | 构建并复制到 `docs/`（**上线前必做**） |
| `npm run preview` | 本地预览已构建站点（端口多为 4173） |
| `git push origin main` | 推送后 GitHub Pages 才会更新 |

`npm run deploy` 实际做了两件事：

1. `vitepress build` → 输出到 `.vitepress/dist`  
2. `node scripts/copy-to-docs.cjs` → 整目录覆盖复制到 `docs/`

---

## 六、线上不更新时怎么查

按顺序排查：

1. **本地是否执行了 `npm run deploy`？**  
   - 只改了 `.md` 却没 deploy，`docs/` 仍是旧 HTML。
2. **是否 push 了包含 `docs/` 的提交？**  
   - 在 GitHub 网页打开仓库，看 `docs/` 里文件时间/内容是否最新。
3. **Pages 是否指向 `/docs`？**  
   - Settings → Pages → Folder 必须是 **/docs**，不是根目录。
4. **分支是否是 `main`？**  
   - 推错分支 Pages 读不到。
5. **缓存**  
   - 无痕窗口 / `Ctrl+F5`；自定义域名偶发有短缓存。
6. **构建是否失败**  
   - 本地 `npm run deploy` 终端有没有报错；有错则 `docs/` 可能不完整。

---

## 七、和腾讯云 COS 的关系

| 方式 | 作用 | 是否当前主路径 |
|------|------|----------------|
| **GitHub Pages + `/docs`** | 推送后公网可访问 | **是（当前正式）** |
| 腾讯云 COS | 把 `docs/` 再上传到对象存储 | 可选备用，见 `腾讯云部署说明.md` |

日常以 **GitHub 推送 `docs/`** 为准即可。COS 只有在你刻意双写/切流量时才需要再上传一遍。

---

## 八、不要做的事

- 不要手改 `docs/` 里的 HTML 当「正式改站」——下次 `deploy` 会覆盖。  
- 不要只提交源码、不提交 `docs/` 却指望线上更新。  
- 不要把 Pages Folder 改成 `/`（根目录），除非同时改掉整套输出路径。  
- 不要把含密钥的 `.env` 之类提交进仓库（本博客静态站一般不需要）。

---

## 九、一句话备忘

**改完 → `npm run deploy` → `git push`（带上 `docs/`）→ 打开 https://milkywaydev.cn**
