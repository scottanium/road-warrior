const C = "pool-trainer-v19";
const FILES = ["./", "./index.html", "./legal.js", "./install.js", "./update.js", "./theme.js", "./LICENSE.txt", "./app.js", "./data.js", "./extra.js", "./videos.js", "./rightcut.js", "./geometry.js", "./shotlab.js", "./adaptive.js", "./timer.js", "./tourdata.js", "./tripcost.js", "./profit.js", "./history.js", "./money.js", "./tournaments.js", "./layouts.js", "./tablecapture.js", "./rulesets.js", "./rulescmp.js", "./manifest.json", "./icons/apple-touch-icon.png", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open(C).then((c) => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== C).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open(C).then((c) => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request, { ignoreSearch: true }).then((m) => m || caches.match("./index.html"))));
});
self.addEventListener("notificationclick", (e) => { e.notification.close(); e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => { for (const c of cs) { if ("focus" in c) return c.focus(); } return self.clients.openWindow ? self.clients.openWindow("./#today") : null; })); });
self.addEventListener("message", (e) => { if (e.data && (e.data === "SKIP_WAITING" || e.data.type === "SKIP_WAITING")) self.skipWaiting(); });
