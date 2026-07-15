# 일본어 카드모음 (nihongo-cards)

일본어 단어·한자 암기 웹앱 — 4지선다 퀴즈 + 타이머 + 오답복습 + 원어민 발음.

- 앱: `index.html` (단일 파일, GitHub Pages 서빙)
- 무료 데이터: `cards_free.json` (무료 팩 전체 + 유료 팩 미리보기 20장)
- 유료 데이터: Google Apps Script API (email+라이선스키 검증 후 응답)
- 오디오: `generate_audio.py` — Google Cloud TTS로 사전 생성, `.github/workflows/generate_audio.yml`이 CSV push 시 자동 실행 (시크릿 `GOOGLE_TTS_KEY` 필요)
- 결제: Paddle (팩당 1회 구매 = 영구 소유)

## 자동 오디오 생성
1. Settings > Secrets and variables > Actions > New repository secret → `GOOGLE_TTS_KEY`
2. Actions 탭 > generate-audio > Run workflow (또는 CSV push 시 자동)
