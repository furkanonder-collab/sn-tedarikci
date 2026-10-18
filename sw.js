// Tedarikçi Paneli - çevrimdışı önbellek (service worker)
// Önbellek adı BU YAYINA özel (SCOPE'a göre) — aynı origin'deki diğer repoların önbelleğine dokunmaz.
var SCOPE = self.location.pathname.replace(/\/[^\/]*$/, '');
var PREFIX = 'tedarikci' + SCOPE.replace(/\//g, '-') + '-';
var CACHE = PREFIX + 'v1';
var ASSETS = ['./', './index.html'];

self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE).then(function(c) {
            return Promise.all(ASSETS.map(function(a) { return c.add(a).catch(function() {}); }));
        }).then(function() { return self.skipWaiting(); }).catch(function() { return self.skipWaiting(); })
    );
});

self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(keys.map(function(k) {
                if (k === CACHE) return null;
                // SADECE kendi yayınımızın eski sürümlerini temizle; başka repoların önbelleğine DOKUNMA
                if (k.indexOf(PREFIX) === 0) return caches.delete(k);
                return null;
            }));
        }).then(function() { return self.clients.claim(); })
    );
});

// Önce internet dene, güncel sürümü önbelleğe al; internet yoksa önbellekten ver
self.addEventListener('fetch', function(e) {
    if (e.request.method !== 'GET') return;
    // Sadece kendi origin'imizdeki dosyaları yönet; Firebase / gstatic DIŞ isteklerine DOKUNMA
    var _u = new URL(e.request.url);
    if (_u.origin !== self.location.origin) return;
    e.respondWith(
        fetch(e.request).then(function(resp) {
            if (resp && resp.ok) {
                var copy = resp.clone();
                caches.open(CACHE).then(function(c) { c.put(e.request, copy).catch(function() {}); }).catch(function() {});
            }
            return resp;
        }).catch(function() {
            return caches.match(e.request).then(function(r) {
                return r || caches.match('./index.html');
            });
        })
    );
});
