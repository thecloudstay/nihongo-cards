# -*- coding: utf-8 -*-
"""
generate_audio.py — 카드 かな 오디오 1회 사전 생성 (Google Cloud TTS Neural2)

사용법 (로컬, Windows):
  set GOOGLE_TTS_KEY=발급받은키
  python generate_audio.py

사용법 (GitHub Actions): .github/workflows/generate_audio.yml (시크릿 GOOGLE_TTS_KEY)

동작:
  1. CSV_GLOB에 걸리는 모든 CSV에서 reading / example_reading 고유값 추출
  2. 훈/음 슬래시 표기("あら/せん")는 첫 번째 읽기만 합성 (앱 speak 규칙과 동일)
  3. 파일명 = md5(합성텍스트 + 보이스) → 같은 읽기는 자동 중복제거
  4. audio/ 에 이미 있는 해시는 스킵 (증분 생성)
  5. MP3(mono) 저장 + audio_manifest.json 갱신
     manifest 키 = 원본 텍스트와 첫읽기 둘 다 등록. 앱은 어느 쪽으로든 조회 가능.
표준 라이브러리만 사용 — pip 설치 불필요.
"""

import csv, glob, hashlib, json, os, sys, time, base64, re
import urllib.request

# ===== 설정 =====
CSV_GLOB   = "*.csv"                 # 카드 CSV 위치
AUDIO_DIR  = "audio"
MANIFEST   = "audio_manifest.json"
VOICE      = "ja-JP-Neural2-B"       # 여성 B / 남성 C·D
SPEAK_RATE = 0.9                     # 학습용 약간 느리게
COLUMNS    = ("reading", "example_reading")
API_KEY    = os.environ.get("GOOGLE_TTS_KEY", "")

KANA_RE = re.compile(r'[ぁ-ゖァ-ヺー]')

def speak_text(text: str) -> str:
    """훈/음 슬래시 표기는 첫 읽기만 발음 (예: 'あら/せん' → 'あら')"""
    return text.split("/")[0].strip()

def key_of(text: str) -> str:
    return hashlib.md5((speak_text(text) + "|" + VOICE).encode("utf-8")).hexdigest()

def synthesize(text: str) -> bytes:
    body = json.dumps({
        "input": {"text": speak_text(text)},
        "voice": {"languageCode": "ja-JP", "name": VOICE},
        "audioConfig": {"audioEncoding": "MP3", "speakingRate": SPEAK_RATE},
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://texttospeech.googleapis.com/v1/text:synthesize?key=" + API_KEY,
        data=body, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as res:
        return base64.b64decode(json.load(res)["audioContent"])

def collect_texts() -> list:
    texts = set()
    files = sorted(glob.glob(CSV_GLOB))
    if not files:
        sys.exit("CSV 파일이 없습니다: " + CSV_GLOB)
    for path in files:
        with open(path, encoding="utf-8-sig", newline="") as f:
            for row in csv.DictReader(f):
                for col in COLUMNS:
                    t = (row.get(col) or "").strip()
                    if t and KANA_RE.search(t):
                        texts.add(t)
    return sorted(texts)

def main():
    if not API_KEY:
        sys.exit("환경변수 GOOGLE_TTS_KEY가 없습니다.")
    os.makedirs(AUDIO_DIR, exist_ok=True)

    manifest = {}
    if os.path.exists(MANIFEST):
        with open(MANIFEST, encoding="utf-8") as f:
            manifest = json.load(f)

    texts = collect_texts()
    todo = [t for t in texts if not os.path.exists(
        os.path.join(AUDIO_DIR, key_of(t) + ".mp3"))]
    print(f"고유 텍스트 {len(texts)}개 / 신규 생성 {len(todo)}개")

    done = fail = 0
    seen = set()
    for i, t in enumerate(todo, 1):
        h = key_of(t)
        if h in seen:                      # 같은 첫읽기 공유 → 파일 1개
            manifest[t] = h
            manifest[speak_text(t)] = h    # 앱이 첫읽기로 조회해도 매칭
            continue
        try:
            mp3 = synthesize(t)
            with open(os.path.join(AUDIO_DIR, h + ".mp3"), "wb") as f:
                f.write(mp3)
            manifest[t] = h
            manifest[speak_text(t)] = h    # 앱이 첫읽기로 조회해도 매칭
            seen.add(h)
            done += 1
        except Exception as e:
            print(f"  실패: {t} — {e}")
            fail += 1
            time.sleep(2)
        if i % 50 == 0:
            print(f"  진행 {i}/{len(todo)}")
            with open(MANIFEST, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=1)
        time.sleep(0.15)

    for t in texts:
        h = key_of(t)
        if os.path.exists(os.path.join(AUDIO_DIR, h + ".mp3")):
            manifest.setdefault(t, h)
            manifest.setdefault(speak_text(t), h)

    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=1)
    print(f"완료: 성공 {done}, 실패 {fail}, manifest {len(manifest)}건")

if __name__ == "__main__":
    main()
