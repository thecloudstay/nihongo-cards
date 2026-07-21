// 일본어 카드모음 SW — HTML/JSON은 네트워크 우선(배포 즉시 반영), 오디오는 캐시 우선(해시 불변)
const VER = "v1";
const AUDIO_CACHE = "audio-" + VER;
const SHELL_CACHE = "shell-" + VER;

self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== AUDIO_CACHE && k !== SHELL_CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;              // 외부(Paddle 등) 미개입
  if (url.pathname.startsWith("/audio/")) {                // 오디오: 캐시 우선 (파일명=해시라 불변)
    e.respondWith(
      caches.open(AUDIO_CACHE).then(c => c.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })
      ))
    );
    return;
  }
  // 그 외(HTML·JSON·아이콘): 네트워크 우선, 실패 시 캐시 폴백 (오프라인 지원 + stale 방지)
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok && e.request.method === "GET") {
        const copy = res.clone();
        caches.open(SHELL_CACHE).then(c => c.put(e.request, copy));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
