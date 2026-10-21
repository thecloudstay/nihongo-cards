# 일본어 카드모음 (nihongo-cards)

일본어 단어·한자 암기 웹앱 — 4지선다 퀴즈 + 타이머 + 오답복습 + 원어민 발음.

- 앱: `index.html` (단일 파일, GitHub Pages 서빙)
- 무료 데이터: `cards_free.json` (무료 팩 전체 + 유료 팩 미리보기 20장)
- 유료 데이터: Google Apps Script API (email+라이선스키 검증 후 응답)
- 오디오: `generate_audio.py` — Google Cloud TTS로 사전 생성, `.github/workflows/generate_audio.yml`이 CSV push 시 자동 실행 (시크릿 `GOOGLE_TTS_KEY` 필요)
- 결제: Paddle (팩당 1회 구매 = 영구 소유)

## 남녀 대화 반복 읽기 (말하기 > 남녀 대화 반복 읽기)
- 대화 원본: `dialogues.json` (후리가나 마크업 `{표기|읽기}`, 줄마다 `w`=F 여자 / M 남자, 한국어·로마자 포함). 대화를 추가하려면 배열에 항목만 더하면 된다.
- 음성: `generate_audio.py`가 여자 `ja-JP-Neural2-B`, 남자 `ja-JP-Neural2-C`로 만들고 `dialogues_audio.json`(`"F|문장"`/`"M|문장"` → 해시)에 기록. `dialogues.json`이 바뀌면 `generate-audio` 작업이 자동 실행된다.
- 음성이 아직 없을 때는 브라우저 음성으로 대신 읽는다(여자 높게·남자 낮게).

## 자동 오디오 생성
1. Settings > Secrets and variables > Actions > New repository secret → `GOOGLE_TTS_KEY`
2. Actions 탭 > generate-audio > Run workflow (또는 CSV push 시 자동)
