self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET') return
  const navigation = request.mode === 'navigate' || request.destination === 'document'
  if (!navigation) return
  event.respondWith(fetch(request, { cache: 'no-store' }))
})
