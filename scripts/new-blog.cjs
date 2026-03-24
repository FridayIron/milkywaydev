/**
 * 新建博客文章
 * 用法: node scripts/new-blog.cjs "文章标题"
 * 或: npm run new:blog "文章标题"
 */
const fs = require('fs')
const path = require('path')

const title = process.argv[2] || '未命名文章'
const slug = title
  .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')
  .toLowerCase() || 'untitled'

const date = new Date().toISOString().slice(0, 10)
const filename = `${date}-${slug}.md`
const filepath = path.join(__dirname, '..', 'pages', 'blog', filename)

const template = `---
title: ${title}
description: ${title}
date: ${date}
---

# ${title}

> 在此填写文章摘要...

（正文内容）

<!-- 添加图片：![描述](/assets/img/blog/图片名.jpg) -->
`

const imgDir = path.join(__dirname, '..', 'public', 'assets', 'img', 'blog')
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir, { recursive: true })
  fs.writeFileSync(path.join(imgDir, '.gitkeep'), '')
}

fs.writeFileSync(filepath, template, 'utf8')
console.log(`✓ 已创建: pages/blog/${filename}`)
console.log(`  编辑后运行 npm run deploy 发布`)
console.log(`  图片放至: public/assets/img/blog/`)
