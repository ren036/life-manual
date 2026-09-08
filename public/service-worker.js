const CACHE_NAME = 'life-manual-v9';
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

async function showDueReminders() {
  const database = await openDatabase();
  if (!database.objectStoreNames.contains('settings')) return;
  const today = dateKey();
  const [enabled, lastReminder] = await Promise.all([
    requestResult(
      database.transaction('settings').objectStore('settings').get('reminders-enabled'),
    ),
    requestResult(
      database.transaction('settings').objectStore('settings').get('last-background-reminder-date'),
    ),
  ]);
  if (enabled !== true) return;
  if (lastReminder === today) return;
  const [tasks, documents] = await Promise.all([
    requestResult(database.transaction('tasks').objectStore('tasks').getAll()),
    requestResult(database.transaction('documents').objectStore('documents').getAll()),
  ]);
  const reminderDays = new Set([0, 3, 7]);
  const taskDays = tasks
    .filter((item) => !item.deletedAt && !item.completed && item.dueDate)
    .map((item) => daysFromToday(item.dueDate, today));
  const documentDays = documents
    .filter((item) => !item.deletedAt && item.expiryDate)
    .map((item) => daysFromToday(item.expiryDate, today));
  const dueTasks = taskDays.filter((days) => reminderDays.has(days)).length;
  const overdueTasks = taskDays.filter((days) => days < 0).length;
  const expiring = documentDays.filter((days) => reminderDays.has(days)).length;
  const expired = documentDays.filter((days) => days < 0).length;
  if (!dueTasks && !overdueTasks && !expiring && !expired) return;
  const parts = [
    dueTasks ? `${dueTasks} 个待办将在 7 天内到期` : '',
    overdueTasks ? `${overdueTasks} 个待办已逾期` : '',
    expiring ? `${expiring} 份资料将在 7 天内到期` : '',
    expired ? `${expired} 份资料已过期` : '',
  ].filter(Boolean);
  await self.registration.showNotification('生活手册提醒', {
    body: parts.join('，'),
    icon: '/icon.svg',
    tag: `life-manual-reminder-${today}`,
  });
  const transaction = database.transaction('settings', 'readwrite');
  transaction.objectStore('settings').put(today, 'last-background-reminder-date');
  await transactionComplete(transaction);
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

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'life-manual-reminders') event.waitUntil(showDueReminders());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients[0];
      return existing
        ? existing.navigate('/#tasks').then(() => existing.focus())
        : self.clients.openWindow('/#tasks');
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
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(event.request)
          .then(
            (cached) =>
              cached || (event.request.mode === 'navigate' ? caches.match('/') : undefined),
          ),
      ),
  );
});
