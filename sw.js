// 일본어 카드모음 SW
//  · HTML  → 네트워크 우선 (배포 즉시 반영)
//  · 오디오 → 캐시 우선 (파일명이 해시라 불변)
//  · 큰 데이터(books/cards/매니페스트) → 네트워크 우선, 끊겼을 때만 캐시
//
// ⚠ v2 는 books.json·audio_manifest.json 을 stale-while-revalidate 로 내줬다.
//    그 결과 **한 쪽만 먼저 갱신되는 순간 짝이 깨져** 음성이 안 붙었다.
//    (문장 텍스트가 바뀌면 mp3 해시도 바뀌는데, 매니페스트가 옛것이면 못 찾는다.)
//    PC 는 개발 중 캐시를 자주 지워 드러나지 않고, 모바일에서만 "발음이 이상하다"로 나타났다.
//    두 파일은 항상 같은 시점의 것이어야 하므로 네트워크 우선으로 되돌린다.
//    ETag 재검증이라 안 바뀌었으면 304(0바이트)로 끝나 느려지지 않는다.
const VER = "v3";
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

  // ① 오디오 — 캐시 우선 (파일명이 내용 해시라 한 번 받으면 영원히 유효)
  if (url.pathname.startsWith("/audio/")) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(c => c.match(e.request).then(hit =>
        hit || fetch(e.request).then(res => { if (res.ok) c.put(e.request, res.clone()); return res; })
      ))
    );
    return;
  }

  // ② 큰 데이터 — 네트워크 우선, 실패(오프라인)할 때만 캐시
  if (DATA_FILES.includes(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(DATA_CACHE).then(c => c.put(e.request, copy)); }
        return res;
      }).catch(() => caches.open(DATA_CACHE).then(c => c.match(e.request)))
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
