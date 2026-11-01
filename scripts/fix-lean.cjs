/**
 * VitePress 首次加载用 *.lean.js（正文为空壳，靠 SSR 水合填入）。
 * 自定义 Layout 一旦与 SSR 节点错位，水合失败后正文永久变成 <div></div>。
 * 构建后把对应全量 *.js 覆盖到 *.lean.js，客户端即使重渲染也能带上正文 HTML。
 */
const fs = require('fs')
const path = require('path')

const assetsDir = path.join(__dirname, '..', '.vitepress', 'dist', 'assets')
if (!fs.existsSync(assetsDir)) {
  console.error('fix-lean: 未找到 .vitepress/dist/assets，请先 build')
  process.exit(1)
}

let fixed = 0
for (const name of fs.readdirSync(assetsDir)) {
  if (!name.endsWith('.lean.js')) continue
  const fullName = name.replace(/\.lean\.js$/, '.js')
  const leanPath = path.join(assetsDir, name)
  const fullPath = path.join(assetsDir, fullName)
  if (!fs.existsSync(fullPath)) continue
  fs.copyFileSync(fullPath, leanPath)
  fixed += 1
}

console.log(`✓ fix-lean: 已用全量页面模块覆盖 ${fixed} 个 lean.js`)
