// Imported by the generated service worker (see vite.config.js workbox.importScripts).
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'CampusFlip', body: event.data?.text() || '' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'CampusFlip', {
    body: data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: data.tag || undefined,
    data: { url: data.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const win of windows) {
      if (new URL(win.url).origin === self.location.origin) {
        await win.focus();
        if ('navigate' in win) await win.navigate(target);
        return;
      }
    }
    await self.clients.openWindow(target);
  })());
});
