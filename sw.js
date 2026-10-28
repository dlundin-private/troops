// Gör att spelet går att spela utan internet.
// Allt i FILES sparas vid installation. Vid varje besök visas den sparade versionen direkt
// och en ny hämtas i bakgrunden, så en push till main syns från andra öppningen.
// Lägg till nya filer i FILES och höj CACHE om en fil tas bort eller byter namn.
// Adressen kan delas med andra spel (t.ex. Lilla Byn), så rör bara cachar som börjar på 'truppen-'.
const CACHE = 'truppen-v2';
const FILES = ['./', 'index.html', 'style.css', 'game.js', 'manifest.webmanifest',
  'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'fonts/bungee.woff2', 'fonts/figtree.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('truppen-') && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(req, {ignoreSearch: true});
    const fresh = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; });
    if (hit){ e.waitUntil(fresh.catch(() => {})); return hit; }
    return fresh;
  }));
});
