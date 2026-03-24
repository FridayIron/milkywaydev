/**
 * 访客记录 API - Cloudflare Worker
 * 接收访客信息并存储到 KV，提供仅管理员可访问的统计接口
 */
const VISITS_LIST_KEY = 'visits_list'
const MAX_VISITS = 5000

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const path = url.pathname

    // 跨域
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: cors })
    }

    try {
      // 上报访客信息（无需认证）
      if (request.method === 'POST' && (path === '/visit' || path === '/api/visit')) {
        const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
        const ua = request.headers.get('User-Agent') || ''
        let body = {}
        try {
          body = await request.json()
        } catch (_) {}
        const visit = {
          ts: Date.now(),
          ip,
          url: body.url || url.searchParams.get('url') || '',
          ref: body.referrer || body.ref || request.headers.get('Referer') || '',
          ua,
          lang: body.lang || request.headers.get('Accept-Language')?.slice(0, 50) || '',
          screen: body.screen || '',
          tz: body.tz || '',
        }
        const id = `${visit.ts}-${Math.random().toString(36).slice(2)}`
        await env.VISITS.put(id, JSON.stringify(visit))
        const list = JSON.parse((await env.VISITS.get(VISITS_LIST_KEY)) || '[]')
        list.unshift(id)
        if (list.length > MAX_VISITS) list.length = MAX_VISITS
        await env.VISITS.put(VISITS_LIST_KEY, JSON.stringify(list))
        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json', ...cors },
        })
      }

      // 获取访客列表（需管理员密钥）
      if (request.method === 'GET' && (path === '/stats' || path === '/api/stats')) {
        const key = url.searchParams.get('key')
        if (key !== env.ADMIN_KEY) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json', ...cors },
          })
        }
        const list = JSON.parse((await env.VISITS.get(VISITS_LIST_KEY)) || '[]')
        const visits = []
        for (const id of list) {
          const v = await env.VISITS.get(id)
          if (v) visits.push(JSON.parse(v))
        }
        return new Response(JSON.stringify({ visits }), {
          headers: { 'Content-Type': 'application/json', ...cors },
        })
      }

      return new Response('Not Found', { status: 404 })
    } catch (e) {
      return new Response(JSON.stringify({ error: String(e.message) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...cors },
      })
    }
  },
}
