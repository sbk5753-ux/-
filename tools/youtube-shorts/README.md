# youtube-shorts

일본 랭킹형 유튜브 쇼츠(예: @doubutsu_urabanashi 스타일의 "TOP5 카운트다운") **대본 → 일본어 음성 → 영상**까지 만드는 파이프라인입니다.

## 파이프라인
```
generate-script.mjs   주제 → 대본(JSON: 훅+랭킹5개+아웃트로)
tts-voicevox.mjs       대본 → 일본어 음성(wav) + 자막 매니페스트
assemble-video.mjs     음성+자막 → 세로형(1080x1920) mp4
```

## 설치
```bash
cd tools/youtube-shorts
cp .env.example .env
```
- `ANTHROPIC_API_KEY`: 대본 자동 생성용 (선택, 없으면 빈 템플릿)
- **VOICEVOX**: https://voicevox.hiroshiba.jp 에서 무료 앱 다운로드 후 실행 (실행하면 로컬 API 서버가 자동으로 뜸)
- **ffmpeg**: https://ffmpeg.org 설치 (영상 합성에 필요)
- **일본어 폰트**: 자막 렌더링에 Noto Sans JP 등 CJK 폰트 필요. 안 잡히면 `.env`에 `FFMPEG_FONT_PATH`로 직접 지정

## 실행
```bash
node generate-script.mjs "고양이가 사람보다 뛰어난 능력 TOP5"
# -> output/2026-08-31-xxx/script.json

node tts-voicevox.mjs --script output/2026-08-31-xxx/script.json
# -> output/2026-08-31-xxx/audio/*.wav, audio-manifest.json

node assemble-video.mjs --manifest output/2026-08-31-xxx/audio-manifest.json
# -> output/2026-08-31-xxx/short.mp4
```

기본 배경은 저작권 문제 없는 단색/그라데이션 + 큰 자막입니다. 퀄리티를 높이려면 `--backgrounds <폴더>` 옵션으로 세그먼트 개수만큼(`00.mp4`, `01.mp4`, ...) 저작권 프리 영상/이미지를 넣어 배경으로 쓸 수 있습니다 (Pexels, Pixabay, Coverr 등 — 라이선스 꼭 확인).

## 업로드 전 반드시 확인하세요
**2026년 유튜브 "비authentic 콘텐츠" 정책**으로 인해, 이 파이프라인이 만든 결과물을 그대로(변주 없이) 반복 업로드하면 수익화가 제외될 수 있습니다. `docs/AUTOMATION-GUIDE.md`의 3-2절을 꼭 읽고, 업로드 전에:
- 훅/아웃트로에 채널만의 말투·캐릭터를 더하세요
- 랭킹 선정 기준이나 코멘트에 실제 의견/리서치를 추가하세요
- AI 활용 사실을 채널 정보나 설명란에 고지하세요 (필요한 경우)

## 다음 단계
발행 자동화는 `tools/youtube-publish` 참고 (YouTube Data API v3 공식 업로드).
