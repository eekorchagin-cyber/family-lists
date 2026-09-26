/* v20260926-ios-nav — не рвать открытие с ярлыка iPhone */
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

async function safeFetch(url, navigation) {
  try {
    const fresh = await fetch(url.href, { cache: 'reload', credentials: 'same-origin' })
    if (fresh && (fresh.ok || fresh.type === 'opaqueredirect')) return fresh
  } catch {
    /* iOS: fetch(Request, { cache: 'no-store' }) даёт TypeError: Load failed */
  }
  try {
    const fallback = await fetch(url.href, { credentials: 'same-origin' })
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
  next.searchParams.set('t', String(Date.now()))
  const href = JSON.stringify(next.pathname + next.search + next.hash)
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Возьми</title><p>Загружаем…</p><script>
(function(){
  function go(){ location.replace(${href}) }
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
})()
</script></html>`
}
