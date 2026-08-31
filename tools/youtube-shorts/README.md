# youtube-shorts

**simkoongzzal 스타일**: 실제 영상 클립을 테마별로 모아서, 클립마다 굵은 외곽선 밈 자막(한국어)을 얹는 **컴필레이션 쇼츠**입니다. 나레이션 없음 — 자막이 콘텐츠의 전부입니다.

## 파이프라인
```
generate-script.mjs   테마 → 클립별 밈 자막 + 필요한 영상 소재 설명(footage_hint)
(직접 촬영/소싱)        footage_hint를 참고해서 실제 영상 클립을 00.mp4, 01.mp4 ... 로 준비
assemble-video.mjs     클립 + 자막 → 세로형(1080x1920) 쇼츠, 마스코트 워터마크 포함 가능
```

## 설치
```bash
cd tools/youtube-shorts
cp .env.example .env   # ANTHROPIC_API_KEY 있으면 자막 자동 생성
```
- **ffmpeg** 필요 (https://ffmpeg.org)
- **한국어 폰트** 필요 (Noto Sans CJK, 나눔고딕 등). 자동으로 못 찾으면 `.env`의 `FFMPEG_FONT_PATH`로 직접 지정

## 1. 대본(자막) 생성
```bash
node generate-script.mjs "안 웃을 수 없는 동물들" --count 6
# -> output/2026-08-31-xxx/script.json
```
`series_title`(영상 제목)과 `clips[].caption`(클립별 밈 자막), `clips[].footage_hint`(그 자막에 어울리는 영상 소재 설명)가 나옵니다.

## 2. 영상 클립 준비 (직접 해야 하는 부분)
`footage_hint`를 참고해서 클립 개수만큼 영상을 준비하고, 한 폴더에 `00.mp4`, `01.mp4`, ... 순서로 이름 붙여 넣으세요.

### ⚠️ 영상 소스 저작권 (중요)
다른 사람이 올린 바이럴 영상을 허락 없이 그대로 가져다 쓰면 **저작권 문제 + 2026년 유튜브 "비authentic 콘텐츠" 정책 위반**(원저작자 표시 없는 무단 재사용은 대량생산형 콘텐츠로 분류될 수 있음) 리스크가 있습니다. 안전한 순서로 소싱하세요.
1. **직접 촬영**한 영상 (가장 안전, 오리지널리티도 인정받음)
2. 라이선스가 명확한 **로열티 프리 스톡 영상** (Pexels, Pixabay, Storyblocks 등 상업적 이용 허용 여부 확인)
3. 원저작자에게 **직접 사용 허락**을 받은 영상 (출처/크레딧 표기)
4. 위 셋 다 안 될 때만, 공정이용 범위 내에서 짧게 인용 + 명확한 출처 표기 — 이 경우도 채널 성장 리스크가 있다는 걸 감안하세요

## 3. 영상 합성
```bash
node assemble-video.mjs --script output/2026-08-31-xxx/script.json --footage ./footage \
  [--logo ./mascot.png] [--brand "@내채널"] [--color yellow|white] [--mute]
```
- `--logo`: 좌하단에 표시할 마스코트/로고 (원형으로 미리 잘라둔 투명 배경 PNG 권장)
- `--brand`: 좌하단에 표시할 채널 워터마크 텍스트 (로고 없이 텍스트만 써도 됨)
- `--color`: 자막 색상 (기본 yellow, 반전 배경엔 white 추천)
- `--mute`: 원본 클립 소리를 없애고 싶을 때 (배경음악을 따로 입힐 계획이면 사용)

결과물은 `script.json`과 같은 폴더에 `short.mp4`로 저장됩니다.

## 나레이션이 필요한 경우 (선택, 기본 파이프라인 아님)
말로 설명하는 랭킹형 콘텐츠를 만들고 싶다면 `tts-voicevox.mjs`(일본어 TTS)로 나레이션을 따로 만들 수 있습니다. 다만 simkoongzzal 스타일은 나레이션 없이 자막만으로 완성되는 형식이니, 특별한 이유가 없다면 이 기본 파이프라인을 그대로 쓰는 걸 권장합니다.

## 업로드 전 반드시 확인하세요
**2026년 유튜브 "비authentic 콘텐츠" 정책**을 `docs/AUTOMATION-GUIDE.md` 3-2절에서 꼭 읽어보세요. 이 형식(직접 소싱한 영상 + 오리지널 자막)은 AI 생성 슬라이드쇼보다 훨씬 안전하지만, 그래도:
- 매 영상마다 자막에 진짜 재치나 관점을 담으세요 (뻔한 설명 반복 금지)
- 영상 소스 출처를 스스로 관리하세요 (나중에 저작권 클레임이 들어와도 답할 수 있도록)

## 다음 단계
발행 자동화는 `tools/youtube-publish` 참고 (YouTube Data API v3 공식 업로드).
