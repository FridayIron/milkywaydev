# 博客

> 技术笔记与生活随笔

## 文章列表

- [内网 GitLab CE 部署与配置指南（精要）](/pages/blog/2026-10-14-内网GitLab-CE部署与配置指南)
- [GitLab 本地部署操作命令手册（按步执行）](/pages/blog/2026-10-14-GitLab本地部署操作命令手册)
- [SVN → GitLab 迁移方案（保留历史）](/pages/blog/2026-10-14-SVN到GitLab迁移方案)
- [Git 日常开发与团队培训手册](/pages/blog/2026-10-14-Git日常开发与培训手册)
- [测试文章](/pages/blog/2026-03-22-测试文章)（示例，可删除）

## 如何新增博客

1. 在项目根目录执行：`npm run new:blog "我的文章标题"`
2. 编辑生成的 `pages/blog/yyyy-mm-dd-文件名.md`
3. 在本文「文章列表」中添加该文章链接
4. 同步在 `.vitepress/config.mjs` 的侧栏 `博客.items` 中增加一条
5. 运行 `npm run deploy` 后上传到腾讯云
