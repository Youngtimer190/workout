/* ═══════════════════════════════════════════════════════════════════════════
   Service worker FitPlanner — TYLKO powiadomienia push.

   Świadomie NIC NIE cache’ujemy: aplikacja budowana jest jako jeden plik
   HTML i ma zawsze pobierać świeżą wersję (po aktualizacji na serwerze
   użytkownik nie powinien dostać starej powłoki). Service worker obsługuje
   wyłącznie zdarzenia powiadomień — nie ma `fetch`, więc nie zakłóca
   ładowania strony.
   ═══════════════════════════════════════════════════════════════════════════ */

self.addEventListener('push', event => {
  let payload = {
    title: 'Czas!',
    body: 'Przerwa minęła — możesz zacząć kolejną serię.',
  };

  try {
    if (event.data) {
      const parsed = event.data.json();
      if (parsed && typeof parsed === 'object') payload = { ...payload, ...parsed };
    }
  } catch {
    /* payload nie jest JSON — zostaje komunikat domyślny */
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      // Tag: kolejne powiadomienia o tej samej przerwie zastępują się
      // zamiast piętrzyć się na ekranie.
      tag: 'fitplanner-rest-timer',
      renotify: false,
      requireInteraction: true,
      vibrate: [120, 90, 120],
      data: { url: '/' },
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    (async () => {
      // Jeśli aplikacja już jest otwarta — po prostu ją pokażemy.
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow('/');
      }
    })()
  );
});
