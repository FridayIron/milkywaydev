<script setup>
import DefaultTheme from 'vitepress/theme'
import { useData, useRoute } from 'vitepress'
import { computed } from 'vue'
import CosmicBackground from './components/CosmicBackground.vue'
import VisitorTracker from './components/VisitorTracker.vue'

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
    <div v-if="isHome" class="cosmic-wrapper">
      <CosmicBackground />
    </div>
    <div class="layout-content" :class="{ 'layout-home-content': isHome }">
    <VPLayout>
      <template v-for="(_, name) in $slots" #[name]="slotData">
        <slot :name="name" v-bind="slotData" />
      </template>
    </VPLayout>
    </div>
  </div>
</template>

<style>
.layout-home .cosmic-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 32vh;
  min-height: 260px;
  z-index: 9999998;
  pointer-events: none;
}

@media (max-width: 768px) {
  .layout-home .cosmic-wrapper {
    height: 28vh;
    min-height: 180px;
  }
}

.layout-home .layout-content {
  position: relative;
  z-index: 9999997;
  background: transparent !important;
}

.layout-home .VPHero {
  position: relative;
  z-index: 1;
}

.layout-home .VPHome {
  --vp-home-hero-name-color: #a5d8ff;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #74c0fc, #b197fc);
  --vp-c-brand-1: #74c0fc;
  --vp-c-brand-2: #4dabf7;
  --vp-c-brand-3: #339af0;
}

.layout-home .VPHero .name {
  text-shadow: 0 0 20px rgba(116, 192, 252, 0.4);
}

.layout-home .VPHero .text {
  color: rgba(255, 255, 255, 0.95);
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.layout-home .VPHero .tagline {
  color: rgba(255, 255, 255, 0.8);
}

.layout-home .VPHero .actions .VPButton.brand {
  background: linear-gradient(135deg, #339af0 0%, #748ffc 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(51, 154, 240, 0.4);
}

.layout-home .VPHero .actions .VPButton.brand:hover {
  box-shadow: 0 6px 20px rgba(51, 154, 240, 0.5);
  transform: translateY(-1px);
}

.layout-home .VPFeatures {
  position: relative;
  z-index: 1;
  margin-top: 0;
  padding: 3rem 1.5rem 4rem;
  background: linear-gradient(to bottom, rgba(15, 12, 35, 0.25), #0f0f28) !important;
  border-radius: 24px 24px 0 0;
}

.layout-home .VPFeature {
  background: rgba(25, 30, 55, 0.75) !important;
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
