// ellora service worker: телефонго орнотуу жана интернетсиз иштөө.
// Версияны өзгөртсөңүз, эски кэштер өчүрүлөт.
const VERSION = "v2";
const STATIC = `ellora-static-${VERSION}`; // _next/static, иконкалар, шрифттер — өзгөрбөйт
const PAGES = `ellora-pages-${VERSION}`; // ачылган барактар (окуучунун маалыматы бар — чыкканда тазаланат)
const PYODIDE = `ellora-pyodide-${VERSION}`; // Python (CDN) — бир жолу жүктөлөт
const OFFLINE_URL = "/offline";

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(STATIC)
      .then((c) => c.addAll([OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (e) => {
  const keep = new Set([STATIC, PAGES, PYODIDE]);
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("ellora-") && !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Колдонуучу чыкканда: анын барактары башка окуучуга көрүнбөсүн (мектептеги жалпы компьютер).
self.addEventListener("message", (e) => {
  if (e.data === "clear-pages") e.waitUntil(caches.delete(PAGES));
});

async function cacheFirst(cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(cacheName, req) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit || net;
}

async function networkFirstPage(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    // Кайра багыттоолорду (мисалы, кирүү барагына) сактабайбыз.
    if (res.ok && !res.redirected && res.type === "basic") cache.put(req, res.clone());
    return res;
  } catch {
    return (await cache.match(req)) || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return; // Server Actions (POST) — ар дайым тармак аркылуу
  const url = new URL(req.url);

  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/npm/pyodide@")) {
    e.respondWith(cacheFirst(PYODIDE, req));
    return;
  }
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(staleWhileRevalidate(STATIC, req));
    return;
  }
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname === "/pyodide-worker.js") {
    e.respondWith(cacheFirst(STATIC, req));
    return;
  }
  if (req.mode === "navigate") e.respondWith(networkFirstPage(req));
});
