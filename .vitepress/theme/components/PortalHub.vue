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
    window.open(sys.link, '_blank', 'noopener,noreferrer')
    return
  }
  router.go(sys.link)
}
</script>

<template>
  <div class="mx-portal">
    <header class="mx-portal__hero">
      <p class="mx-portal__hello">您好!</p>
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
</template>

<style scoped>
.mx-portal {
  --mx-font: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  --mx-display: "Outfit", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
  max-width: 980px;
  margin: 0 auto;
  padding: clamp(32px, 6vh, 64px) 20px 64px;
  font-family: var(--mx-font);
  color: #f8fafc;
  box-sizing: border-box;
}

.mx-portal__hero {
  max-width: 560px;
  animation: mx-in 0.5s ease both;
}

.mx-portal__hello {
  margin: 0;
  color: #5eead4;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.mx-portal__title {
  margin: 8px 0 12px;
  font-family: var(--mx-display);
  font-size: clamp(28px, 4.5vw, 40px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.2;
  color: #fff;
}

.mx-portal__sub {
  margin: 0;
  color: rgba(226, 232, 240, 0.78);
  line-height: 1.7;
  font-size: 15px;
}

.mx-portal__cards {
  display: grid;
  grid-template-columns: 1.2fr 1fr 1fr;
  gap: 14px;
  margin-top: 36px;
  animation: mx-in 0.55s ease 0.06s both;
}

.mx-portal__card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: #fff;
  border-radius: 18px;
  padding: 22px;
  min-height: 220px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.22);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.mx-portal__card::before {
  content: "";
  position: absolute;
  inset: 0;
  z-index: -1;
  opacity: 0.85;
}

.mx-portal__card.blog::before {
  background: linear-gradient(160deg, rgba(15, 43, 79, 0.95), rgba(37, 99, 235, 0.75));
}

.mx-portal__card.agent::before {
  background: linear-gradient(160deg, rgba(15, 47, 46, 0.95), rgba(15, 118, 110, 0.72));
}

.mx-portal__card.work::before {
  background: linear-gradient(160deg, rgba(41, 32, 22, 0.95), rgba(194, 65, 12, 0.7));
}

.mx-portal__card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.24);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

.mx-portal__card:focus-visible {
  outline: 2px solid #5eead4;
  outline-offset: 3px;
}

.mx-portal__card.featured {
  min-height: 240px;
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
  color: rgba(255, 255, 255, 0.78);
}

.mx-portal__card h2 {
  margin: 14px 0 8px;
  font-family: var(--mx-display);
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: #fff;
}

.mx-portal__card.featured h2 {
  font-size: 26px;
}

.mx-portal__card p {
  margin: 0;
  flex: 1;
  color: rgba(255, 255, 255, 0.82);
  font-size: 14px;
  line-height: 1.6;
}

.mx-portal__go {
  margin-top: 18px;
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
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .mx-portal__hero,
  .mx-portal__cards,
  .mx-portal__card {
    animation: none !important;
    transition: none !important;
  }
}

@media (max-width: 880px) {
  .mx-portal__cards {
    grid-template-columns: 1fr;
  }
  .mx-portal__card,
  .mx-portal__card.featured {
    min-height: 180px;
  }
}
</style>
