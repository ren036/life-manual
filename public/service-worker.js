const BUILD_VERSION = new URL(self.location.href).searchParams.get('v') || 'v11';
const CACHE_NAME = `life-manual-${BUILD_VERSION}`;
const APP_SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];
const DATABASE_NAME = 'life-manual';

function dateKey(date = new Date()) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function daysFromToday(value, today) {
  return Math.round(
    (new Date(`${value}T00:00:00`).getTime() - new Date(`${today}T00:00:00`).getTime()) / 86400000,
  );
}

function reminderText(title, date, days) {
  const day = new Date(`${date}T00:00:00`).toLocaleDateString('zh-CN', { dateStyle: 'long' });
  return `「${title}」${days < 0 ? '已于' : '将于'}${day}到期`;
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function claimReminderDate(database, today) {
  const transaction = database.transaction('settings', 'readwrite');
  const store = transaction.objectStore('settings');
  const key = 'last-reminder-date';
  const previous = await requestResult(store.get(key));
  if (previous === today) {
    await transactionComplete(transaction);
    return false;
  }
  store.put(today, key);
  await transactionComplete(transaction);
  return true;
}

async function showDueReminders() {
  const database = await openDatabase();
  if (!database.objectStoreNames.contains('settings')) return;
  const today = dateKey();
  const enabled = await requestResult(
    database.transaction('settings').objectStore('settings').get('reminders-enabled'),
  );
  if (enabled !== true) return;
  const [tasks, documents] = await Promise.all([
    requestResult(database.transaction('tasks').objectStore('tasks').getAll()),
    requestResult(database.transaction('documents').objectStore('documents').getAll()),
  ]);
  const taskParts = tasks.flatMap((item) => {
    if (item.deletedAt || item.completed || !item.dueDate) return [];
    const days = daysFromToday(item.dueDate, today);
    if (!Number.isFinite(days) || days > 7) return [];
    return [reminderText(item.title, item.dueDate, days)];
  });
  const documentParts = documents.flatMap((item) => {
    if (item.deletedAt || !item.expiryDate) return [];
    const days = daysFromToday(item.expiryDate, today);
    if (!Number.isFinite(days) || days > 7) return [];
    return [reminderText(item.title, item.expiryDate, days)];
  });
  if (!taskParts.length && !documentParts.length) return;
  if (!(await claimReminderDate(database, today))) return;
  await self.registration.showNotification('生活手册提醒', {
    body: [...taskParts, ...documentParts].join('，'),
    icon: '/icon.svg',
    tag: `life-manual-reminder-${today}`,
  });
}

async function cacheAppShell() {
  const cache = await caches.open(CACHE_NAME);
  await cache.addAll(APP_SHELL);
  const response = await fetch('/');
  const html = await response.text();
  const assets = [...html.matchAll(/(?:src|href)="(\/[^"#]+)"/g)].map((match) => match[1]);
  await Promise.allSettled([...new Set(assets)].map((asset) => cache.add(asset)));
}

self.addEventListener('install', (event) => {
  event.waitUntil(cacheAppShell());
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'life-manual-reminders') event.waitUntil(showDueReminders());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients[0];
      return existing
        ? existing.navigate('/#/tasks').then(() => existing.focus())
        : self.clients.openWindow('/#/tasks');
    }),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  const fetchAndCache = async () => {
    const response = await fetch(event.request);
    if (response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(event.request, response.clone());
    }
    return response;
  };

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cached = (await caches.match(event.request)) || (await caches.match('/'));
        if (cached) return cached;
        try {
          return await fetchAndCache();
        } catch {
          return Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(async (cached) => {
      if (cached) return cached;
      return fetchAndCache();
    }),
  );
});
