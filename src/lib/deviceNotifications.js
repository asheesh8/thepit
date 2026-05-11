const NOTIFICATION_PERMISSION_KEY = 'pit-notifications-asked'

export async function registerDeviceNotifications() {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register('/pit-notifications-sw.js')
  } catch (_) {
    return null
  }
}

export async function requestDeviceNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'
  try {
    localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true')
    return await Notification.requestPermission()
  } catch (_) {
    return Notification.permission
  }
}

export function primeDeviceNotificationPermission() {
  if (!('Notification' in window)) return
  if (Notification.permission !== 'default') return
  if (localStorage.getItem(NOTIFICATION_PERMISSION_KEY)) return

  const ask = () => {
    requestDeviceNotificationPermission()
    window.removeEventListener('pointerdown', ask)
    window.removeEventListener('keydown', ask)
  }

  window.addEventListener('pointerdown', ask, { once: true })
  window.addEventListener('keydown', ask, { once: true })
}

export async function showDeviceNotification({ title, body, tag, url = '/' }) {
  if (!('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false

  const options = {
    body,
    tag,
    badge: '/icon-192.png',
    icon: '/icon-192.png',
    data: { url },
  }

  try {
    const registration = 'serviceWorker' in navigator
      ? await navigator.serviceWorker.ready
      : null
    if (registration?.showNotification) {
      await registration.showNotification(title, options)
      return true
    }
  } catch (_) {}

  try {
    const notification = new Notification(title, options)
    notification.onclick = () => {
      window.focus()
      if (url) window.location.href = url
    }
    return true
  } catch (_) {
    return false
  }
}
