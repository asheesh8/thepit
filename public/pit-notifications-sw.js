self.addEventListener('push', event => {
  const payload = event.data?.json?.() || {}
  const title = payload.title || 'The Pit'
  const options = {
    body: payload.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: payload.tag || 'pit-push',
    data: { url: payload.url || '/' },
    requireInteraction: payload.type === 'call',
    renotify: payload.type === 'call',
    vibrate: payload.type === 'call' ? [220, 90, 220, 90, 420] : [80, 40, 80],
    actions: payload.type === 'call'
      ? [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' },
      ]
      : [],
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  if (event.action === 'decline') return
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil((async () => {
    const allClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    const existing = allClients.find(client => 'focus' in client)
    if (existing) {
      await existing.focus()
      if ('navigate' in existing) await existing.navigate(targetUrl)
      return
    }
    if (clients.openWindow) await clients.openWindow(targetUrl)
  })())
})
