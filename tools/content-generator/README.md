# content-generator

블로그·카드뉴스 **초안 생성** 도구입니다. 발행은 하지 않습니다 (발행은 `tools/instagram-publish`, 네이버는 `tools/naver-blog` 참고).

## 설치
```bash
cd tools/content-generator
cp .env.example .env # ANTHROPIC_API_KEY 입력 시 AI 자동 초안 생성
```
`npm install`(puppeteer)은 선택입니다 — 없어도 로컬에 Chrome/Chromium이 설치되어 있으면 카드뉴스 PNG까지 자동으로 렌더링됩니다 (`CHROME_PATH` 환경변수로 직접 경로를 지정할 수도 있음). 아무것도 없으면 HTML까지만 생성됩니다.

## 블로그 초안 생성
```bash
node generate-blog.mjs "카페 원두 보관법"
# -> output/blog/2026-08-31-카페-원두-보관법.md
```
제목 후보 / 목차 / 본문 초안 / 태그 / 이미지 가이드가 담긴 마크다운이 생성됩니다. 검수 후 네이버 블로그 에디터에 붙여넣어 발행하세요.

## 일본어 뉴스카드 생성 (japna_issue 스타일)
어두운 배경 사진 + 빨간 카테고리 태그 + 빨간 강조 헤드라인 + 팩트 불릿으로 구성된
**단일 이미지 뉴스카드**입니다 (게시물 1개 = 뉴스/이슈 1건, 캐러셀 아님).
```bash
node generate-cardnews.mjs "台風14号が九州地方を直撃へ" --category "天気" --photo ./photos/typhoon.jpg
# -> output/newscard/2026-08-31-.../card.json  (카테고리/헤드라인/팩트, 일본어)
# -> output/newscard/2026-08-31-.../card.html
# -> output/newscard/2026-08-31-.../card.png   (1080x1350)
```
- `--category`: 생략하면 AI가 알아서 정합니다 (`スキャンダル` `天気` `芸能` `災害` `話題` 등)
- `--photo`: 카드 배경으로 쓸 사진 경로. **생략하면 자리표시자 배경으로 생성되니, 게시 전에는 반드시 실제 사진을 넣으세요.**
- PNG는 puppeteer가 있으면 그걸 쓰고, 없으면 로컬 Chrome/Chromium을 자동으로 찾아 렌더링합니다.

생성된 `card.png`는 `tools/instagram-publish/publish.mjs`로 바로 발행할 수 있습니다.

### ⚠️ 사진 사용 시 주의 (중요)
연예인/뉴스 인물 사진을 다른 매체나 SNS에서 무단으로 캡처해 쓰면 **저작권 및 초상권(肖像権) 문제**가 생길 수 있습니다.
- 가능하면 소속사·공식 계정이 배포한 공식 이미지, 보도자료용 프레스 이미지, 또는 라이선스를 구매한 이미지(Getty, 연합뉴스 등)를 사용하세요.
- 날씨/재난처럼 인물이 등장하지 않는 소재는 기상청 공식 이미지, 직접 제작한 그래픽/지도로 대체하는 게 안전합니다.
- 확실하지 않으면 사진 없이(자리표시자) 텍스트 정보만으로 발행하는 것도 방법입니다.

## AI 없이 사용하기
`ANTHROPIC_API_KEY`를 설정하지 않으면 빈 템플릿 파일이 생성됩니다. 이 템플릿 구조를 Claude 대화창에 붙여넣고 "이 구조로 채워줘"라고 요청해도 동일하게 활용할 수 있습니다.
