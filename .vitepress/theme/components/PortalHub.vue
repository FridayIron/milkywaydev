<script setup>
import { useRouter } from 'vitepress'
import { portalSystems } from '../portal-modules.js'

const router = useRouter()

function onEnter(sys, e) {
  if (!sys.enabled) {
    e.preventDefault()
    return
  }
  if (sys.external) {
    e.preventDefault()
    window.open(sys.link, '_blank', 'noopener,noreferrer')
    return
  }
  // /riyue/ 等反代路径必须整页跳转；VitePress router 会当成站内路由导致进不去登录页
  if (sys.hardNav || String(sys.link || '').startsWith('/riyue')) {
    e.preventDefault()
    window.location.assign(sys.link)
    return
  }
  router.go(sys.link)
}
</script>

<template>
  <div class="mx-portal">
    <div class="mx-portal__inner">
      <header class="mx-portal__hero">
        <p class="mx-portal__hello">您好！</p>
        <h1 class="mx-portal__title">欢迎来到我的个人博客</h1>
        <p class="mx-portal__sub">
          四年+嵌入式开发，持续成长、朝着极客方向前进。
        </p>
      </header>

      <div class="mx-portal__cards">
        <a
          v-for="sys in portalSystems"
          :key="sys.id"
          class="mx-portal__card"
          :class="[sys.variant, { featured: sys.featured, disabled: !sys.enabled }]"
          :href="sys.enabled ? sys.link : '#'"
          @click="onEnter(sys, $event)"
        >
          <span class="mx-portal__tag">{{ sys.tag }}</span>
          <h2>{{ sys.title }}</h2>
          <p>{{ sys.desc }}</p>
          <span class="mx-portal__go">{{ sys.goText }} →</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mx-portal {
  --mx-font: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --mx-display: "Outfit", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  box-sizing: border-box;
  width: 100%;
  min-height: calc(100vh - var(--vp-nav-height, 64px) - 48px);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 整体略上移，避免视觉落在正中偏下 */
  padding: clamp(12px, 2.5vh, 28px) 24px clamp(72px, 12vh, 120px);
  transform: translateY(calc(-1 * clamp(28px, 5vh, 56px)));
  font-family: var(--mx-font);
  color: #f8fafc;
  position: relative;
  z-index: 2;
}

.mx-portal__inner {
  width: 100%;
  max-width: min(1120px, 100%);
  animation: mx-in 0.5s ease both;
}

.mx-portal__hero {
  max-width: 720px;
}

.mx-portal__hello {
  margin: 0;
  color: #5eead4;
  font-family: var(--mx-display);
  font-size: clamp(26px, 3.6vw, 36px);
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.mx-portal__title {
  margin: 18px 0 16px;
  font-family: var(--mx-display);
  font-size: clamp(28px, 4vw, 42px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.25;
  color: #fff;
}

.mx-portal__sub {
  margin: 0;
  color: rgba(226, 232, 240, 0.8);
  line-height: 1.75;
  font-size: clamp(15px, 1.45vw, 17px);
  max-width: 28em;
}

.mx-portal__cards {
  display: grid;
  /* 4 卡自适应：宽屏 2×2 / 更宽可 4 列，避免固定 3 列掉单卡 */
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
  gap: 18px;
  margin-top: clamp(28px, 3.5vh, 40px);
}

.mx-portal__card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: #fff;
  border-radius: 16px;
  padding: 22px 22px 20px;
  min-height: 200px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.42);
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.mx-portal__card.featured {
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.26);
  border-color: rgba(147, 197, 253, 0.35);
}

.mx-portal__card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.9;
}

.mx-portal__card.blog::before {
  background: linear-gradient(160deg, rgba(15, 43, 79, 0.95), rgba(37, 99, 235, 0.72));
}

.mx-portal__card.riyue::before {
  background: linear-gradient(160deg, rgba(12, 22, 48, 0.96), rgba(54, 147, 255, 0.55));
}

.mx-portal__card.work::before {
  background: linear-gradient(160deg, rgba(41, 32, 22, 0.95), rgba(194, 65, 12, 0.68));
}

.mx-portal__card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.26);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
}

.mx-portal__card:focus-visible {
  outline: 2px solid #5eead4;
  outline-offset: 3px;
}

.mx-portal__card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
}

.mx-portal__tag {
  align-self: flex-start;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.78);
}

.mx-portal__card h2 {
  margin: 14px 0 10px;
  font-family: var(--mx-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
}

.mx-portal__card.featured h2 {
  font-size: 24px;
}

.mx-portal__card p {
  margin: 0;
  flex: 1;
  color: rgba(255, 255, 255, 0.82);
  font-size: 13.5px;
  line-height: 1.7;
}

.mx-portal__go {
  margin-top: 22px;
  font-size: 14px;
  font-weight: 600;
  color: #fef3c7;
}

.mx-portal__card:hover .mx-portal__go {
  color: #fff;
}

@keyframes mx-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mx-portal__inner,
  .mx-portal__card {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 1100px) and (min-width: 641px) {
  .mx-portal__cards {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .mx-portal {
    min-height: auto;
    padding-top: 28px;
    transform: none;
  }
  .mx-portal__cards {
    grid-template-columns: 1fr;
    margin-top: 32px;
  }
  .mx-portal__card {
    min-height: 160px;
  }
}
</style>
