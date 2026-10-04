/* v20261004-no-sw — не перехватываем сеть; сразу снимаем себя. */
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
      try {
        await self.registration.unregister()
      } catch {
        /* ignore */
      }
    })(),
  )
})
