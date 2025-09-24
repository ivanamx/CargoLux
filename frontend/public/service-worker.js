self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Notificación';
  const options = {
    body: data.body || '',
    icon: '/vite.svg',
    tag: data.tag || undefined
  };
  event.waitUntil(self.registration.showNotification(title, options));
}); 