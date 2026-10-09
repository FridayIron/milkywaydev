<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import { computed } from 'vue'
import CosmicBackground from './components/CosmicBackground.vue'
import VisitorTracker from './components/VisitorTracker.vue'
import PortalHub from './components/PortalHub.vue'

const { page } = useData()
const route = useRoute()
const isHome = computed(() => {
  const p = route.path
  if (p === '/' || p === '/index.html' || p === '/index') return true
  return page.value?.frontmatter?.layout === 'home'
})
const VPLayout = DefaultTheme.Layout
</script>

<template>
  <div class="custom-layout" :class="{ 'layout-home': isHome, 'layout-page-light': !isHome }">
    <VisitorTracker />
    <ClientOnly>
      <div v-if="isHome" class="cosmic-wrapper" aria-hidden="true">
        <CosmicBackground />
      </div>
    </ClientOnly>
    <div class="layout-content" :class="{ 'layout-home-content': isHome }">
      <VPLayout>
        <template v-for="(_, name) in $slots" #[name]="slotData">
          <slot :name="name" v-bind="slotData" />
        </template>
        <template v-if="isHome" #home-hero-before>
          <PortalHub />
        </template>
      </VPLayout>
    </div>
  </div>
</template>

<style>
.cosmic-wrapper {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
}

.layout-home-content {
  position: relative;
  z-index: 1;
}

/* ===== 门户页：星空底 + Agent 式入口 ===== */
.layout-home {
  min-height: 100vh;
  background: #0f0f28 !important;
}

.layout-home .layout-content {
  position: relative;
  z-index: 1;
  background: transparent !important;
}

.layout-home .VPNav,
html.vp-home-cosmic .VPNav {
  background: rgba(10, 12, 28, 0.94) !important;
  backdrop-filter: blur(14px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.layout-home .VPNavBarTitle .title,
.layout-home .VPNavBarTitle span {
  color: #ffffff !important;
}

.layout-home .VPNavBar .link,
.layout-home .VPNavBarMenuLink,
html.vp-home-cosmic .VPFlyout .button .text,
html.vp-home-cosmic .VPNavBarMenuGroup .text {
  color: rgba(255, 255, 255, 0.95) !important;
}

.layout-home .VPNavBar .link:hover,
html.vp-home-cosmic .VPFlyout:hover .text {
  color: #5eead4 !important;
}

.layout-home .VPNavBarExtra,
.layout-home .VPNavBarAppearance,
.layout-home .VPNavBarSocialLinks,
.layout-home .VPNavBar .divider {
  display: none !important;
}

html.vp-home-cosmic .VPMenu {
  background-color: rgba(28, 25, 23, 0.98) !important;
  border-color: rgba(255, 255, 255, 0.14) !important;
}

html.vp-home-cosmic .VPMenu .link,
html.vp-home-cosmic .VPMenu a {
  color: rgba(255, 255, 255, 0.9) !important;
}

html.vp-home-cosmic .VPMenu .link:hover,
html.vp-home-cosmic .VPMenu a:hover {
  color: #5eead4 !important;
  background-color: rgba(94, 234, 212, 0.1) !important;
}

.layout-home .VPHero,
.layout-home .VPFeatures {
  display: none !important;
}

.layout-home .VPHome {
  padding: 0 !important;
  margin: 0 !important;
  background: transparent !important;
}

/* 避开固定导航栏遮挡 */
.layout-home .VPContent,
.layout-home .VPContent.is-home {
  padding-top: var(--vp-nav-height, 64px) !important;
  background: transparent !important;
}

.layout-home .VPFooter {
  border-top-color: rgba(255, 255, 255, 0.08) !important;
  background: transparent !important;
  color: rgba(255, 255, 255, 0.45) !important;
}
</style>
