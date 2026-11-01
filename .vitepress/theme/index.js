import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import SkillChart from './components/SkillChart.vue'
import VisitorTracker from './components/VisitorTracker.vue'
import VisitorAdmin from './components/VisitorAdmin.vue'
import ModuleDemoEmbed from './components/ModuleDemoEmbed.vue'
import { startPriorityPrefetch } from './prefetch-priority.js'
import './custom.css'

function applyPageTheme(path) {
  if (typeof document === 'undefined') return
  const norm = (path || '/').replace(/\/$/, '') || '/'
  const isHome = norm === '/' || norm === '/index' || norm === '/index.html'
  const isModuleDemo = norm.startsWith('/pages/modules/')
  document.documentElement.classList.toggle('vp-module-demo', isModuleDemo)
  document.body.classList.toggle('vp-module-demo', isModuleDemo)
  if (isHome) {
    document.documentElement.classList.add('vp-home-cosmic')
    document.documentElement.classList.remove('vp-page-light')
    document.body.classList.add('vp-home-cosmic')
    document.body.classList.remove('vp-page-light')
  } else {
    document.documentElement.classList.remove('vp-home-cosmic')
    document.documentElement.classList.add('vp-page-light')
    document.body.classList.remove('vp-home-cosmic')
    document.body.classList.add('vp-page-light')
    /* 不移除 dark 类，尊重用户的深色/浅色模式偏好 */
  }
}

function suppressAnchorFlash() {
  if (typeof document === 'undefined') return
  document.documentElement.classList.add('vp-suppress-anchor')
  setTimeout(() => {
    document.documentElement.classList.remove('vp-suppress-anchor')
  }, 350)
}

const DEMO_EMBED_CSS = [
  'html.is-embed body{background:#f8fafc!important}',
  'html.is-embed .topbar{display:none!important}',
  'html.is-embed .wrap{max-width:none!important;margin:0!important;padding:10px 12px 14px!important}',
  'html.is-embed .hero{margin-bottom:10px!important;padding:12px 14px!important;box-shadow:none!important}',
  'html.is-embed .hero h1{font-size:1.2rem!important;margin-bottom:4px!important}',
  'html.is-embed .lead{font-size:.9rem!important}',
  'html.is-embed section{margin:10px 0!important;padding:12px 14px 6px!important;box-shadow:none!important}',
  'html.is-embed h2{font-size:1.05rem!important;margin:2px 0 8px!important}',
  'html.is-embed header{padding:.75rem 1rem .4rem!important}',
].join('')

function polishDemoIframe(frame) {
  try {
    const doc = frame.contentDocument
    if (!doc?.documentElement) return
    doc.documentElement.classList.add('is-embed')
    if (!doc.getElementById('demo-embed-style')) {
      const style = doc.createElement('style')
      style.id = 'demo-embed-style'
      style.textContent = DEMO_EMBED_CSS
      doc.head.appendChild(style)
    }
    const h = Math.max(doc.documentElement.scrollHeight || 0, doc.body?.scrollHeight || 0)
    if (h > 120) frame.style.height = `${Math.ceil(h)}px`
  } catch (_) { /* cross-origin */ }
}

/** 根据演示页 postMessage 把 iframe 撑到完整内容高度；并兜底注入内嵌样式 */
function bindDemoEmbedResize() {
  if (window.__demoEmbedBound) return
  window.__demoEmbedBound = true
  window.addEventListener('message', (event) => {
    const data = event.data
    if (!data || data.type !== 'demo-embed-size' || !data.height) return
    const frames = document.querySelectorAll('.blog-demo-frame iframe')
    frames.forEach((frame) => {
      if (frame.contentWindow !== event.source) return
      polishDemoIframe(frame)
      const next = Math.ceil(Number(data.height))
      if (!Number.isFinite(next) || next < 120) return
      frame.style.height = `${next}px`
    })
  })
  const watch = () => {
    document.querySelectorAll('.blog-demo-frame iframe').forEach((frame) => {
      if (frame.dataset.embedBound) return
      frame.dataset.embedBound = '1'
      const run = () => polishDemoIframe(frame)
      frame.addEventListener('load', run)
      if (frame.contentDocument?.readyState === 'complete') run()
      ;[200, 600, 1200].forEach((ms) => setTimeout(run, ms))
    })
  }
  watch()
  const mo = new MutationObserver(watch)
  mo.observe(document.documentElement, { childList: true, subtree: true })
}

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    app.component('SkillChart', SkillChart)
    app.component('VisitorTracker', VisitorTracker)
    app.component('VisitorAdmin', VisitorAdmin)
    app.component('ModuleDemoEmbed', ModuleDemoEmbed)
    if (typeof window !== 'undefined') {
      const prevBefore = router.onBeforeRouteChange
      const prevAfter = router.onAfterRouteChange
      router.onBeforeRouteChange = async (to) => {
        // /demos 静态页不能走 SPA，否则会落在空壳页面
        try {
          const path = decodeURIComponent(new URL(to, window.location.origin).pathname)
          if (path === '/demos' || path.startsWith('/demos/')) {
            window.location.assign(to)
            return false
          }
        } catch (_) { /* ignore */ }
        suppressAnchorFlash()
        return prevBefore?.(to)
      }
      router.onAfterRouteChange = (to) => {
        const path = new URL(to, 'http://a').pathname
        applyPageTheme(path)
        prevAfter?.(to)
      }
      applyPageTheme(window.location.pathname)
      bindDemoEmbedResize()
      startPriorityPrefetch()
    }
  }
}
