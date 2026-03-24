/**
 * 在首页空闲时预取常用页面的 lean JS，改善手机端无 hover 时的后续跳转速度。
 * （VitePress 自带预取用 IntersectionObserver；2G/省流会被跳过，此处同样尊重。）
 */
const INVALID_CHAR_REGEX = /[\u0000-\u001F"#$&*+,:;<=>?[\]^`{|}\u007F]/g
const DRIVE_LETTER_REGEX = /^[a-z]:/i

function sanitizeFileName(name) {
  const match = DRIVE_LETTER_REGEX.exec(name)
  const driveLetter = match ? match[0] : ''
  return (
    driveLetter +
    name
      .slice(driveLetter.length)
      .replace(INVALID_CHAR_REGEX, '_')
      .replace(/(^|\/)_+(?=[^/]*$)/, '$1')
  )
}

function pathToLeanChunkHref(pathname) {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return null
  const map = window.__VP_HASH_MAP__
  if (!map) return null

  const base = import.meta.env.BASE_URL || '/'
  let pagePath = pathname.replace(/\.html$/i, '')
  pagePath = decodeURIComponent(pagePath)
  pagePath = pagePath.replace(/\/$/, '/index')

  let rel = pagePath.startsWith(base) ? pagePath.slice(base.length) : pagePath
  rel = rel.replace(/^\/+/, '')
  let fileKey = sanitizeFileName(rel.replace(/\//g, '_') || 'index') + '.md'

  let hash = map[fileKey.toLowerCase()]
  if (!hash) {
    fileKey = fileKey.endsWith('_index.md')
      ? fileKey.slice(0, -9) + '.md'
      : fileKey.slice(0, -3) + '_index.md'
    hash = map[fileKey.toLowerCase()]
  }
  if (!hash) return null

  const assetsDir = 'assets'
  return `${base}${assetsDir}/${fileKey}.${hash}.js`
}

const PRIORITY_PATHS = [
  '/pages/about.html',
  '/pages/skill.html',
  '/pages/skill-tools.html',
  '/pages/skill-tools-svg.html',
  '/pages/projects.html',
  '/pages/tech.html',
  '/pages/blog/index.html',
]

const prefetched = new Set()

function prefetchUrl(href) {
  if (!href || prefetched.has(href)) return
  prefetched.add(href)
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

export function startPriorityPrefetch() {
  if (typeof window === 'undefined' || !import.meta.env.PROD) return

  const conn = navigator.connection
  if (conn && (conn.saveData || /2g/i.test(conn.effectiveType || ''))) return

  const run = () => {
    for (const p of PRIORITY_PATHS) {
      const chunk = pathToLeanChunkHref(p)
      if (chunk) prefetchUrl(chunk)
    }
  }

  const rIC = window.requestIdleCallback || ((cb) => setTimeout(cb, 800))
  rIC(run, { timeout: 5000 })
}
