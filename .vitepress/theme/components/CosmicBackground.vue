<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const canvasRef = ref(null)
let animationId = null
let particles = []
let planets = []
let meteors = []
let initialized = false

const PARTICLE_COUNT = 200
const ION_COUNT = 35
const METEOR_COUNT = 4

const PLANET_CONFIG = [
  { orbitRadius: 170, orbitSpeed: 0.0018, radius: 48, colors: ['#7dd3fc', '#60a5fa', '#2563eb'], rotSpeed: 0.018 },
  { orbitRadius: 250, orbitSpeed: 0.0011, radius: 30, colors: ['#a78bfa', '#8b5cf6', '#5b21b6'], rotSpeed: 0.014 },
  { orbitRadius: 320, orbitSpeed: 0.00075, radius: 58, colors: ['#60a5fa', '#34d399', '#16a34a'], rotSpeed: 0.02 },
  { orbitRadius: 135, orbitSpeed: 0.0026, radius: 24, colors: ['#fb7185', '#f43f5e', '#be123c'], rotSpeed: 0.026 },
  { orbitRadius: 385, orbitSpeed: 0.00052, radius: 38, colors: ['#34d399', '#22c55e', '#16a34a'], rotSpeed: 0.012 },
  { orbitRadius: 95, orbitSpeed: 0.0038, radius: 20, colors: ['#fbbf24', '#f59e0b', '#b45309'], rotSpeed: 0.03 },
]

function initParticles(w, h) {
  particles = []
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.6 + 0.7,
      vx: (Math.random() - 0.5) * 0.12,
      vy: (Math.random() - 0.5) * 0.12,
      alpha: Math.random() * 0.7 + 0.4,
      twinkle: Math.random() * Math.PI * 2
    })
  }
  for (let i = 0; i < ION_COUNT; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 3 + 1.5,
      vx: (Math.random() - 0.5) * 0.06,
      vy: (Math.random() - 0.5) * 0.06,
      alpha: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      ion: true
    })
  }
}

function initPlanets() {
  planets = PLANET_CONFIG.map((p, i) => ({
    orbitRadius: p.orbitRadius,
    orbitSpeed: p.orbitSpeed,
    radius: p.radius,
    colors: p.colors,
    rotSpeed: p.rotSpeed,
    orbitAngle: (i / PLANET_CONFIG.length) * Math.PI * 2,
    rotAngle: i * 0.5
  }))
}

function initMeteors(w, h) {
  meteors = []
  for (let i = 0; i < METEOR_COUNT; i++) {
    spawnMeteor(w, h)
  }
}

function spawnMeteor(w, h) {
  const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.25
  const speed = 2.2 + Math.random() * 1.5
  const len = 50 + Math.random() * 60
  meteors.push({
    x: Math.random() * w * 0.15 - 30,
    y: h - Math.random() * h * 0.4,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    length: len,
    alpha: 0.45 + Math.random() * 0.35
  })
}

function drawPlanet(ctx, x, y, radius, colors, rotAngle) {
  // 让行星在深色背景上更“透出来”
  ctx.save()
  ctx.globalCompositeOperation = 'lighter'

  const gradient = ctx.createRadialGradient(
    x - radius * 0.3, y - radius * 0.3, 0,
    x, y, radius * 1.2
  )
  gradient.addColorStop(0, colors[0])
  gradient.addColorStop(0.5, colors[1])
  gradient.addColorStop(0.85, colors[2])
  gradient.addColorStop(1, 'rgba(0,0,0,0.3)')

  ctx.beginPath()
  ctx.arc(x, y, radius * 1.1, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()

  const hx = x + Math.cos(rotAngle) * radius * 0.6
  const hy = y + Math.sin(rotAngle) * radius * 0.6
  const hg = ctx.createRadialGradient(hx, hy, 0, x, y, radius)
  hg.addColorStop(0, 'rgba(255,255,255,0.35)')
  hg.addColorStop(0.4, 'rgba(255,255,255,0.1)')
  hg.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = hg
  ctx.fill()

  ctx.beginPath()
  ctx.arc(x, y, radius, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1.2
  ctx.stroke()

  // 行星光环增强视觉
  ctx.beginPath()
  ctx.ellipse(x, y, radius * 1.25, radius * 0.55, rotAngle, 0, Math.PI * 2)
  ctx.strokeStyle = 'rgba(180,220,255,0.14)'
  ctx.lineWidth = 1.1
  ctx.stroke()

  ctx.restore()
}

function animate() {
  const canvas = canvasRef.value
  if (!canvas) {
    animationId = requestAnimationFrame(animate)
    return
  }

  const w = window.innerWidth
  const h = Math.max(window.innerHeight * 0.32, 280)

  if (!initialized) {
    initParticles(w, h)
    initPlanets()
    initMeteors(w, h)
    initialized = true
  }

  canvas.width = w
  canvas.height = h

  const ctx = canvas.getContext('2d')
  const centerX = w / 2
  const centerY = h * 0.42

  ctx.fillStyle = '#0f0f28'
  ctx.fillRect(0, 0, w, h)

  const bgGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, w * 0.9)
  bgGrad.addColorStop(0, 'rgba(35, 30, 70, 0.85)')
  bgGrad.addColorStop(0.4, 'rgba(25, 20, 55, 0.7)')
  bgGrad.addColorStop(0.7, 'rgba(18, 15, 45, 0.5)')
  bgGrad.addColorStop(1, 'rgba(12, 10, 35, 0.25)')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, w, h)

  const nebula1 = ctx.createRadialGradient(w * 0.2, h * 0.3, 0, w * 0.4, h * 0.5, w * 0.55)
  nebula1.addColorStop(0, 'rgba(100, 70, 180, 0.22)')
  nebula1.addColorStop(0.5, 'rgba(60, 45, 130, 0.12)')
  nebula1.addColorStop(0.8, 'rgba(40, 30, 90, 0.05)')
  nebula1.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = nebula1
  ctx.fillRect(0, 0, w, h)

  const nebula2 = ctx.createRadialGradient(w * 0.8, h * 0.25, 0, w * 0.75, h * 0.45, w * 0.5)
  nebula2.addColorStop(0, 'rgba(70, 100, 200, 0.18)')
  nebula2.addColorStop(0.5, 'rgba(45, 70, 150, 0.1)')
  nebula2.addColorStop(0.8, 'rgba(30, 50, 110, 0.04)')
  nebula2.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = nebula2
  ctx.fillRect(0, 0, w, h)

  const galaxyBand = ctx.createLinearGradient(0, 0, w, h)
  galaxyBand.addColorStop(0, 'rgba(0,0,0,0)')
  galaxyBand.addColorStop(0.35, 'rgba(90, 80, 160, 0.06)')
  galaxyBand.addColorStop(0.5, 'rgba(120, 100, 220, 0.12)')
  galaxyBand.addColorStop(0.65, 'rgba(90, 80, 160, 0.06)')
  galaxyBand.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.save()
  ctx.globalAlpha = 0.9
  ctx.fillStyle = galaxyBand
  ctx.fillRect(0, 0, w, h)
  ctx.restore()

  const scale = Math.min(1, h / 380)
  planets.forEach((p) => {
    p.orbitAngle += p.orbitSpeed
    p.rotAngle += p.rotSpeed
    const px = centerX + Math.cos(p.orbitAngle) * p.orbitRadius * scale
    const py = centerY + Math.sin(p.orbitAngle) * p.orbitRadius * 0.6 * scale
    drawPlanet(ctx, px, py, p.radius * scale, p.colors, p.rotAngle)
  })

  particles.forEach((p) => {
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0 || p.x > w) p.vx *= -1
    if (p.y < 0 || p.y > h) p.vy *= -1
    p.twinkle += 0.015

    const twinkle = Math.sin(p.twinkle) * 0.3 + 0.7
    const alpha = p.alpha * twinkle

    if (p.ion) {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5)
      g.addColorStop(0, `rgba(100, 150, 255, ${alpha * 0.5})`)
      g.addColorStop(0.5, `rgba(80, 120, 220, ${alpha * 0.15})`)
      g.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2)
      ctx.fill()
    }

    ctx.beginPath()
    ctx.fillStyle = p.ion ? `rgba(180, 200, 255, ${alpha})` : `rgba(255, 255, 255, ${alpha})`
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  })

  meteors.forEach((m, i) => {
    m.x += m.vx
    m.y += m.vy
    if (m.x > w + 80 || m.y < -50 || m.x < -100) {
      const angle = -Math.PI / 4 + (Math.random() - 0.5) * 0.25
      const speed = 2.2 + Math.random() * 1.5
      const len = 50 + Math.random() * 60
      meteors[i] = {
        x: Math.random() * w * 0.2 - 40,
        y: h - Math.random() * h * 0.35,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        length: len,
        alpha: 0.45 + Math.random() * 0.35
      }
      return
    }
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const tailLen = m.length * 1.2
    const tailX = m.x - m.vx * tailLen * 0.15
    const tailY = m.y - m.vy * tailLen * 0.15
    const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY)
    grad.addColorStop(0, `rgba(255, 255, 255, ${m.alpha})`)
    grad.addColorStop(0.2, `rgba(200, 220, 255, ${m.alpha * 0.6})`)
    grad.addColorStop(0.6, `rgba(150, 180, 255, ${m.alpha * 0.2})`)
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.strokeStyle = grad
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(m.x, m.y)
    ctx.lineTo(tailX, tailY)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(m.x, m.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${m.alpha})`
    ctx.fill()
    ctx.restore()
  })

  const fadeGrad = ctx.createLinearGradient(0, h * 0.55, 0, h)
  fadeGrad.addColorStop(0, 'rgba(15, 12, 35, 0)')
  fadeGrad.addColorStop(0.7, 'rgba(15, 12, 35, 0.05)')
  fadeGrad.addColorStop(1, 'rgba(15, 12, 35, 0)')
  ctx.fillStyle = fadeGrad
  ctx.fillRect(0, 0, w, h)

  animationId = requestAnimationFrame(animate)
}

function handleResize() {
  initialized = false
}

onMounted(() => {
  nextTick(() => {
    animate()
    window.addEventListener('resize', handleResize)
  })
})

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <canvas ref="canvasRef" class="cosmic-canvas" />
</template>

<style scoped>
.cosmic-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 32vh;
  display: block;
  z-index: 9999999;
  opacity: 0.42;
  mix-blend-mode: normal;
  border: none;
}
</style>
