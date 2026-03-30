# 嵌入式工程师个人技术博客

基于 VitePress 的模块化个人博客，支持 Markdown、代码高亮、图片、视频、技能雷达图。

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（热更新）
npm run dev

# 构建静态站点
npm run build

# 预览构建结果
npm run preview
```

- **`npm run dev`**：终端里会打印实际地址，一般是 `http://localhost:5173`（若端口被占用会自动换端口，**以终端输出为准**）。
- **`npm run preview`**：预览的是已构建的站点，Vite 默认多为 **`http://localhost:4173`**，同样以终端输出为准。

若浏览器提示 **Connection failed**，多半是 **开发服务没在跑**，或 **端口号和终端不一致**。

## 目录结构（对应嵌入式逻辑）

```
├── index.md              # 首页
├── pages/                # 各模块页面（类似「功能模块」）
│   ├── about.md          # 关于我
│   ├── projects.md       # 项目经验
│   ├── tech.md           # 技术栈
│   ├── tools.md          # 工具链
│   ├── interview.md      # 嵌入式基础小知识
│   ├── skill.md          # 技能星图（含雷达图配置）
│   └── life.md           # 生活记录
├── public/               # 静态资源（图片、视频放这里）
│   ├── assets/img/       # 图片
│   └── assets/video/     # 视频
└── .vitepress/
    ├── config.mjs        # 菜单/导航配置（类似「主控配置」）
    └── theme/            # 主题与组件
```

## 自定义操作速查

| 操作 | 文件 | 说明 |
|------|------|------|
| 改内容 | `pages/*.md` | 直接编辑 Markdown，和写笔记一样 |
| 加/删模块 | `.vitepress/config.mjs` | 改 `sidebar` 和 `nav`，新建对应 `.md` |
| 改技能星图 | `pages/skill.md` | 改 frontmatter 里的 `indicator` 和 `skillValue` |
| 加图片 | `public/assets/img/` | 放图后 Markdown 里写 `![描述](/assets/img/xxx.jpg)` |
| 加视频 | `public/assets/video/` 或 B站嵌入 | 小视频放本地，大视频用 iframe 嵌 B站 |

## 部署

```bash
npm run deploy
```

构建结果在 `docs/` 目录，可上传到：
- 腾讯云 COS（对象存储 + 静态网站）
- 自建 Nginx 服务器

详见 `腾讯云部署说明.md`。

## 技术栈

- VitePress
- Vue 3
- ECharts（技能雷达图）
