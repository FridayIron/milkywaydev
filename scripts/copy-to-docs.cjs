const fs = require('fs')
const path = require('path')

const src = path.join(__dirname, '..', '.vitepress', 'dist')
const dst = path.join(__dirname, '..', 'docs')

if (!fs.existsSync(src)) {
  console.error('请先执行 npm run build')
  process.exit(1)
}

fs.mkdirSync(dst, { recursive: true })

// 不删除 docs 目录本身。Windows 上只要有进程把当前目录停在 docs，
// 整夹删除就会报 EPERM。
function removeChild(target) {
  try {
    fs.rmSync(target, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 })
  } catch (err) {
    if (err.code === 'EPERM' || err.code === 'EBUSY') {
      err.message += `\n无法删除：${target}\n请先关掉正在占用它的程序（docs 预览、已打开的 docs 页面），再重新 deploy。`
    }
    throw err
  }
}

for (const name of fs.readdirSync(dst)) {
  removeChild(path.join(dst, name))
}

fs.cpSync(src, dst, { recursive: true })
console.log('✓ 已复制构建结果到 docs/，请将 docs/ 上传到腾讯云 COS')
