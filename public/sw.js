/* v20261003-drop-sw — убираем SW: старый перехват навигации вешал ярлык при VPN. */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((key) => caches.delete(key)))
      } catch {
        /* ignore */
      }
      await self.clients.claim()
      try {
        await self.registration.unregister()
      } catch {
        /* ignore */
      }
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of clients) {
        try {
          client.postMessage({ type: 'pokupki-sw-cleared' })
        } catch {
          /* ignore */
        }
      }
    })(),
  )
})
