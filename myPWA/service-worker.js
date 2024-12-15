const CACHE_NAME = 'twitter-app-cache-v1';
const urlsToCache = [
    '/myPWA/frontend/index.html',
    '/myPWA/frontend/login.html',
    '/myPWA/frontend/signup.html',
    '/myPWA/frontend/welcome.html',
    '/myPWA/frontend/style.css',
    '/myPWA/frontend/app.js',
    // Add additional assets if needed
];

// Install the service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Fetch requests
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            // Return the cached response if found, otherwise fetch from network
            return response || fetch(event.request).catch(() => caches.match('/myPWA/frontend/index.html'));
        })
    );
});

// Activate the service worker
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (!cacheWhitelist.includes(cacheName)) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
