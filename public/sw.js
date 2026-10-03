/* v20261003-vpn-timeout — не зависать на VPN при открытии */
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return

  let url
  try {
    url = new URL(request.url)
  } catch {
    return
  }
  if (url.origin !== self.location.origin) return
  if (url.searchParams.has('swfail') || url.searchParams.get('recover') === '1') return

  const navigation = request.mode === 'navigate' || request.destination === 'document'
  const versioned =
    url.pathname.endsWith('/version.json') || url.pathname.endsWith('/index.html')
  if (!navigation && !versioned) return

  event.respondWith(safeFetch(url, navigation))
})

function fetchTimed(href, init, ms) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  return fetch(href, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
}

async function safeFetch(url, navigation) {
  const timeoutMs = navigation ? 8_000 : 6_000
  try {
    const fresh = await fetchTimed(url.href, { cache: 'reload', credentials: 'same-origin' }, timeoutMs)
    if (fresh && (fresh.ok || fresh.type === 'opaqueredirect')) return fresh
  } catch {
    /* таймаут / VPN / iOS Load failed */
  }
  try {
    const fallback = await fetchTimed(url.href, { credentials: 'same-origin' }, timeoutMs)
    if (fallback) return fallback
  } catch {
    /* сеть или баг Safari */
  }
  if (navigation) {
    return new Response(failHtml(url), {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    })
  }
  return new Response('', { status: 504, headers: { 'Cache-Control': 'no-store' } })
}

function failHtml(url) {
  const next = new URL(url.href)
  next.searchParams.set('swfail', '1')
  next.searchParams.set('recover', '1')
  next.searchParams.set('t', String(Date.now()))
  const href = JSON.stringify(next.pathname + next.search + next.hash)
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Возьми</title>
<style>body{font-family:system-ui,-apple-system,sans-serif;padding:32px 24px;background:#f4f7f5;color:#1a2e24}h1{font-size:22px;margin:0 0 12px}p{line-height:1.45;color:#3d5a4c;margin:0 0 20px}button{appearance:none;border:0;border-radius:12px;padding:14px 18px;font-size:16px;font-weight:600;background:#2a7a4f;color:#fff}</style>
<h1>Не удалось загрузить</h1>
<p>Часто мешает VPN. На время отключите VPN и нажмите кнопку. Когда программа откроется, VPN можно снова включить.</p>
<button type="button" id="go">Попробовать снова</button>
<script>
(function(){
  function go(){ location.replace(${href}) }
  var btn=document.getElementById('go')
  if(btn) btn.onclick=function(){
    var tasks=[]
    try{
      if('serviceWorker' in navigator){
        tasks.push(navigator.serviceWorker.getRegistrations().then(function(regs){
          return Promise.all(regs.map(function(reg){ return reg.unregister() }))
        }))
      }
      if(self.caches&&caches.keys){
        tasks.push(caches.keys().then(function(keys){
          return Promise.all(keys.map(function(key){ return caches.delete(key) }))
        }))
      }
    }catch(e){}
    Promise.all(tasks).then(go).catch(go)
  }
})()
</script></html>`
}
