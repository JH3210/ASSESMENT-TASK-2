const CACHE_NAME = 'sharely-cache-v1';
const urlsToCache = [
    '/myPWA/frontend/',
    '/myPWA/frontend/welcome.html',
    '/myPWA/frontend/style.css',
    '/myPWA/frontend/app.js',
    '/myPWA/frontend/welcome-style.css',
    '/myPWA/frontend/background.png',
    '/myPWA/frontend/logo.png'
];


// Install the service worker
// Install event
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
            return response || fetch(event.request).catch(() => caches.match('/myPWA/frontend/welcome.html'));
        })
    );
});


// Activate the service worker


// Activate event
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

