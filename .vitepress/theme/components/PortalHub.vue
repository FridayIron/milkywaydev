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
      <p class="mx-portal__kicker">MilkyWay · 个人站点</p>
      <h1 class="mx-portal__title">选择要进入的系统</h1>
      <p class="mx-portal__sub">
        各大模块相互独立。博客已开放；Agent 助手与工作计划目前为框架占位，后续按模块接入。
      </p>
    </header>

    <div class="mx-portal__cards">
      <a
        v-for="sys in portalSystems"
        :key="sys.id"
        class="mx-portal__card"
        :class="[sys.variant, { disabled: !sys.enabled }]"
        :href="sys.enabled ? sys.link : '#'"
        @click="onEnter(sys, $event)"
      >
        <span class="mx-portal__tag">{{ sys.tag }}</span>
        <h2>{{ sys.title }}</h2>
        <p>{{ sys.desc }}</p>
        <span class="mx-portal__go">{{ sys.goText }}</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.mx-portal {
  --mx-font: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --mx-display: "Segoe UI Semibold", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  max-width: 1120px;
  margin: 0 auto;
  padding: 36px 20px 56px;
  font-family: var(--mx-font);
  color: #fafaf9;
  box-sizing: border-box;
}

.mx-portal__kicker {
  margin: 0;
  color: #5eead4;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.mx-portal__title {
  margin: 10px 0;
  font-size: clamp(26px, 3.6vw, 38px);
  font-family: var(--mx-display);
  font-weight: 700;
  letter-spacing: -0.04em;
  color: #fafaf9;
  line-height: 1.15;
}

.mx-portal__sub {
  margin: 0;
  color: #a8a29e;
  max-width: 640px;
  line-height: 1.6;
  font-size: 15px;
}

.mx-portal__cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-top: 36px;
}

.mx-portal__card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: #fff;
  border-radius: 22px;
  padding: 26px;
  min-height: 250px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.28);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.04);
}

.mx-portal__card:hover {
  transform: translateY(-5px);
  box-shadow: 0 22px 48px rgba(0, 0, 0, 0.38);
}

.mx-portal__card.blog {
  background: linear-gradient(160deg, #0f2b4f, #1e4e7a 58%, #2563eb);
}

.mx-portal__card.agent {
  background: linear-gradient(160deg, #1e1b4b, #4338ca 52%, #7c3aed);
}

.mx-portal__card.work {
  background: linear-gradient(160deg, #134e4a, #0f766e 52%, #c2410c);
}

.mx-portal__card.disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.22);
}

.mx-portal__card.disabled:hover {
  transform: none;
}

.mx-portal__tag {
  display: inline-flex;
  align-self: flex-start;
  font-size: 12px;
  font-weight: 700;
  padding: 5px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.mx-portal__card h2 {
  margin: 18px 0 10px;
  font-size: 24px;
  letter-spacing: -0.03em;
  color: #fff;
  font-family: var(--mx-display);
  font-weight: 700;
}

.mx-portal__card p {
  margin: 0;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.55;
  font-size: 14px;
  flex: 1;
}

.mx-portal__go {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  align-self: flex-start;
  margin-top: 22px;
  min-height: 42px;
  padding: 0 18px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
  color: #1c1917;
  background: #fef3c7;
}

.mx-portal__card:hover .mx-portal__go {
  filter: brightness(1.05);
}

.mx-portal__card.disabled .mx-portal__go {
  background: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.75);
}

@media (max-width: 1024px) {
  .mx-portal__cards {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .mx-portal {
    padding: 24px 16px 40px;
  }
  .mx-portal__cards {
    grid-template-columns: 1fr;
  }
  .mx-portal__title {
    font-size: 28px;
  }
  .mx-portal__card {
    min-height: 220px;
  }
}
</style>
