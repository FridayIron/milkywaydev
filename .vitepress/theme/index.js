import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import { defineAsyncComponent } from 'vue'
import VisitorTracker from './components/VisitorTracker.vue'
import VisitorAdmin from './components/VisitorAdmin.vue'
import './custom.css'

function applyPageTheme(path) {
  if (typeof document === 'undefined') return
  const norm = (path || '/').replace(/\/$/, '') || '/'
  const isHome = norm === '/' || norm === '/index' || norm === '/index.html'
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

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app, router }) {
    app.component('SkillChart', defineAsyncComponent(() => import('./components/SkillChart.vue')))
    app.component('VisitorTracker', VisitorTracker)
    app.component('VisitorAdmin', VisitorAdmin)
    if (typeof window !== 'undefined') {
      const prevBefore = router.onBeforeRouteChange
      const prevAfter = router.onAfterRouteChange
      router.onBeforeRouteChange = async (to) => {
        suppressAnchorFlash()
        return prevBefore?.(to)
      }
      router.onAfterRouteChange = (to) => {
        const path = new URL(to, 'http://a').pathname
        applyPageTheme(path)
        prevAfter?.(to)
      }
      applyPageTheme(window.location.pathname)
    }
  }
}
