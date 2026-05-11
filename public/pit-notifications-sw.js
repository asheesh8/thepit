self.addEventListener('notificationclick', event => {
  event.notification.close()
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
