# youtube-publish

**YouTube Data API v3(공식)** 로 쇼츠를 업로드/예약 발행합니다. 서드파티 매크로가 아니라 구글 공식 API라 계정 정지 리스크가 없습니다.

## 1. 최초 1회 설정
1. [Google Cloud Console](https://console.cloud.google.com)에서 프로젝트 생성
2. "API 및 서비스 > 라이브러리"에서 **YouTube Data API v3** 활성화
3. "API 및 서비스 > OAuth 동의 화면" 설정 (테스트 모드로 시작해도 충분— 본인 계정만 사용할 거라면)
4. "사용자 인증정보 > 사용자 인증정보 만들기 > OAuth 클라이언트 ID" 생성
   - 애플리케이션 유형: **데스크톱 앱**
   - 승인된 리디렉션 URI에 `http://127.0.0.1:53682/oauth2callback` 추가
5. 발급된 클라이언트 ID/보안 비밀을 `.env`에 입력

```bash
cp .env.example .env   # YT_CLIENT_ID, YT_CLIENT_SECRET 입력
node get-refresh-token.mjs
# 콘솔에 뜨는 URL을 브라우저에서 열고 로그인/동의
# 완료되면 refresh token이 출력됨 -> .env의 YT_REFRESH_TOKEN에 붙여넣기
```

## 2. 업로드
```bash
node publish.mjs \
  --file ../youtube-shorts/output/2026-08-31-xxx/short.mp4 \
  --title "고양이가 사람보다 뛰어난 능력 TOP5 #shorts" \
  --description "설명란 텍스트\n#shorts #猫" \
  --tags "猫,ランキング,雑学" \
  --privacy public
```

## 3. 예약 발행
`--publishAt`에 미래 시각(ISO 8601, UTC)을 넣으면 그 시각까지 비공개로 저장했다가 자동 공개됩니다.
```bash
node publish.mjs --file short.mp4 --title "..." --publishAt 2026-09-01T09:00:00Z
```

## 4. 자동 예약 업로드 (선택)
GitHub Actions cron으로 `generate-script.mjs` → `tts-voicevox.mjs`(VOICEVOX는 로컬 실행이 필요해 GitHub Actions에서는 어려움 — 이 단계는 로컬/자체 서버에서 실행 권장) → `assemble-video.mjs` → `publish.mjs`를 순서대로 실행하도록 스케줄링할 수 있습니다. 필요하시면 워크플로를 만들어 드리겠습니다.

## 참고
- 쇼츠로 인식되려면 세로 비율(9:16) + 60초 이하 + 제목/설명에 `#shorts` 포함을 권장합니다.
- 업로드 전에 `docs/AUTOMATION-GUIDE.md` 3-2절의 2026년 유튜브 정책을 꼭 확인하세요.
