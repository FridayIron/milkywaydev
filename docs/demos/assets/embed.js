/**
 * 博客 iframe 内嵌模式：收起顶栏/多余留白，并向父页上报完整高度，避免固定高度裁切。
 */
(function () {
  var EMBED_CSS = [
    'html.is-embed body{background:#f8fafc!important}',
    'html.is-embed .topbar{display:none!important}',
    'html.is-embed .wrap{max-width:none!important;margin:0!important;padding:10px 12px 14px!important}',
    'html.is-embed .hero{margin-bottom:10px!important;padding:12px 14px!important;box-shadow:none!important}',
    'html.is-embed .hero h1{font-size:1.2rem!important;margin-bottom:4px!important}',
    'html.is-embed .lead{font-size:.9rem!important}',
    'html.is-embed section{margin:10px 0!important;padding:12px 14px 6px!important;box-shadow:none!important}',
    'html.is-embed h2{font-size:1.05rem!important;margin:2px 0 8px!important}',
    'html.is-embed .wave-box{margin:4px 0 10px!important}',
    'html.is-embed header{padding:.75rem 1rem .4rem!important}',
    'html.is-embed header h1{font-size:1.1rem!important}',
    'html.is-embed header p{font-size:.85rem!important}',
  ].join('')

  function isEmbed() {
    try {
      if (window.self !== window.top) return true
    } catch (_) {
      return true
    }
    return /(?:^|[?&])embed=1(?:&|$)/.test(location.search)
  }

  function reportHeight() {
    if (!isEmbed()) return
    var h = Math.max(
      document.documentElement.scrollHeight || 0,
      document.body ? document.body.scrollHeight : 0
    )
    if (!h) return
    try {
      parent.postMessage({ type: 'demo-embed-size', height: h, href: location.href }, '*')
    } catch (_) { /* ignore */ }
  }

  function boot() {
    if (!isEmbed()) return
    document.documentElement.classList.add('is-embed')
    if (!document.getElementById('demo-embed-style')) {
      var style = document.createElement('style')
      style.id = 'demo-embed-style'
      style.textContent = EMBED_CSS
      document.head.appendChild(style)
    }
    reportHeight()
    if (typeof ResizeObserver !== 'undefined' && document.body) {
      new ResizeObserver(function () { reportHeight() }).observe(document.body)
    }
    window.addEventListener('load', reportHeight)
    window.addEventListener('resize', reportHeight)
    ;[80, 250, 700, 1500].forEach(function (ms) {
      setTimeout(reportHeight, ms)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot)
  } else {
    boot()
  }
})()
