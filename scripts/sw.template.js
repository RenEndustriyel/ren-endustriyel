/* Ren Endüstriyel — service worker
 * - Uygulama kabuğu (sayfalar, JS/CSS, ikonlar) önbelleğe alınır → çevrimdışı açılır
 * - Veriler Supabase'den gelir; çevrimdışı veri TanStack Query önbelleğinden (IndexedDB) okunur
 * - Web Push bildirimleri
 */
const VERSION = "__VERSION__";
/** Derleme sırasında scripts/gen-sw.mjs tarafından doldurulur */
const APP_ROUTES = __ROUTES__;
const SHELL_CACHE = `ren-shell-${VERSION}`;
const STATIC_CACHE = `ren-static-${VERSION}`;
const PAGE_CACHE = `ren-pages-${VERSION}`;

const SHELL_URLS = [...APP_ROUTES, "/manifest.webmanifest", "/icons/logo-mark.png", "/icons/icon-192.png", "/fonts/Roboto-Regular.ttf", "/fonts/Roboto-Bold.ttf"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => Promise.all(SHELL_URLS.map((u) => cache.add(u).catch(() => undefined))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ren-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const cached = (await cache.match(request)) || (await caches.match(request));
    if (cached) return cached;
    if (fallbackUrl) {
      const fb = await caches.match(fallbackUrl);
      if (fb) return fb;
    }
    throw err;
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) (await caches.open(cacheName)).put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase vb. dış istekler: dokunma

  // Next.js derlenmiş dosyaları (değişmez)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Sayfa gezinmeleri
  if (request.mode === "navigate") {
    // sorgu parametresiz sayfa önbellekte de aranır (?id=... sayfaları aynı kabuğu kullanır)
    event.respondWith(
      networkFirst(request, PAGE_CACHE).catch(async () => {
        const bare = await caches.match(url.pathname, { ignoreSearch: true });
        return bare || (await caches.match("/panel")) || Response.error();
      }),
    );
    return;
  }

  // İstemci tarafı gezinme verisi (RSC)
  if (request.headers.get("RSC") === "1" || url.searchParams.has("_rsc")) {
    event.respondWith(networkFirst(request, PAGE_CACHE));
    return;
  }

  // İkonlar, görseller, fontlar, manifest
  if (/\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/.test(url.pathname) || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
  }
});

// ---------------------------------------------------------------------------
// Web Push
// ---------------------------------------------------------------------------
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Ren Endüstriyel", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Ren Endüstriyel";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/panel" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/panel";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
