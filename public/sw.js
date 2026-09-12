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
  const url = new URL(request.url)
  const navigation = request.mode === 'navigate' || request.destination === 'document'
  const versioned =
    url.pathname.endsWith('/version.json') || url.pathname.endsWith('/index.html')
  if (!navigation && !versioned) return
  event.respondWith(fetch(request, { cache: 'no-store' }))
})
