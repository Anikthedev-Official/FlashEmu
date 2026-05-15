const CACHE_NAME = 'flash-emu-pro-v1';
const PRECACHE = [
    '/',
    '/index.html',
    '/app.js',
    '/style.css',
    '/games.json',
    '/layout-library.js',
    '/editor.html',
    '/engines/v2026/ruffle.js',
    '/engines/v2021/ruffle.js',
];

// Install — cache everything
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return Promise.allSettled(
                PRECACHE.map(url => cache.add(url).catch(() => {}))
            );
        })
    );
    self.skipWaiting();
});

// Activate — delete old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

// Fetch — cache first for engine files, network first for everything else
self.addEventListener('fetch', (e) => {
    const req = e.request;

    // 🚫 BLOCK unsupported schemes
    if (!req.url.startsWith('http')) return;

    e.respondWith(
        fetch(req)
            .then(response => {
                // 🚫 don't cache bad responses
                if (!response || response.status !== 200) {
                    return response;
                }

                const clone = response.clone();

                caches.open(CACHE_NAME).then(cache => {
                    cache.put(req, clone).catch(() => {});
                });

                return response;
            })
            .catch(() => caches.match(req))
    );
});