const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', '.vitepress', 'dist')
const dst = path.join(__dirname, '..', 'docs')

if (!fs.existsSync(src)) {
  console.error('请先执行 npm run build')
  process.exit(1)
}

if (fs.existsSync(dst)) {
  fs.rmSync(dst, { recursive: true })
}
fs.cpSync(src, dst, { recursive: true })
console.log('✓ 已复制构建结果到 docs/，请将 docs/ 上传到腾讯云 COS')
