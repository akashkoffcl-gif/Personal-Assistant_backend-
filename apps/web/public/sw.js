const CACHE_NAME = 'assistant-pwa-v1';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install: Cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Pre-cache asset warning:', err);
      });
    }),
  );
  self.skipWaiting();
});

// Activate: Clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)),
      );
    }),
  );
  self.clients.claim();
});

// Push Event: Display Push Notification from Server
self.addEventListener('push', (event) => {
  let data = {
    title: 'Assistant Reminder',
    body: 'You have a scheduled task pending.',
    data: {},
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [
      { action: 'complete', title: '✓ Completed' },
      { action: 'snooze', title: '⏱ Snooze 15m' },
      { action: 'open', title: 'Open Task' },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Notification Click Event: Handle Interactive Actions
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const action = event.action;
  const taskId = event.notification.data?.taskId;

  if (action === 'complete' && taskId) {
    event.waitUntil(
      fetch(`/api/v1/tasks/${taskId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).catch((err) => console.error('Failed to complete from notification:', err)),
    );
  } else if (action === 'snooze' && taskId) {
    event.waitUntil(
      fetch(`/api/v1/tasks/${taskId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: 15, reason: 'Notification Snooze' }),
      }).catch((err) => console.error('Failed to snooze from notification:', err)),
    );
  } else {
    // Open app window
    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow('/?task=' + (taskId || ''));
          }
        }),
    );
  }
});
