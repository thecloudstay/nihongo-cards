// 일본어 카드모음 SW
//  · HTML  → 네트워크 우선 (배포 즉시 반영)
//  · 오디오 → 캐시 우선 (파일명이 해시라 불변)
//  · 큰 데이터(books/cards) → stale-while-revalidate
//      books.json이 3.6MB로 커져서, 매번 기다렸다 받으면 읽기 화면이 느리다.
//      캐시본을 즉시 내주고 뒤에서 조용히 갱신한다(다음 방문에 반영).
const VER = "v2";
const AUDIO_CACHE = "audio-" + VER;
const SHELL_CACHE = "shell-" + VER;
const DATA_CACHE  = "data-"  + VER;

const DATA_FILES = ["/books.json", "/cards_all.json", "/cards_free.json",
                    "/kids.json", "/audio_manifest.json"];

self.addEventListener("install", e => { self.skipWaiting(); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => ![AUDIO_CACHE, SHELL_CACHE, DATA_CACHE].includes(k))
                    .map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;              // 외부(결제 등) 미개입
  if (e.request.method !== "GET") return;

  // ① 오디오 — 캐시 우선
  if (url.pathname.startsWith("/audio/")) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(c => c.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })
      ))
    );
    return;
  }

  // ② 큰 데이터 — 캐시 즉시 응답 + 백그라운드 갱신 (stale-while-revalidate)
  if (DATA_FILES.includes(url.pathname)) {
    e.respondWith(
      caches.open(DATA_CACHE).then(c => c.match(e.request).then(hit => {
        const net = fetch(e.request).then(res => {
          if (res.ok) c.put(e.request, res.clone());
          return res;
        }).catch(() => hit);
        return hit || net;                                  // 캐시가 있으면 기다리지 않는다
      }))
    );
    return;
  }

  // ③ 그 외(HTML·아이콘) — 네트워크 우선, 실패 시 캐시
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL_CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
