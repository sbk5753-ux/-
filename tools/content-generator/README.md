# content-generator

블로그·카드뉴스 **초안 생성** 도구입니다. 발행은 하지 않습니다 (발행은 `tools/instagram-publish`, 네이버는 `tools/naver-blog` 참고).

## 설치
```bash
cd tools/content-generator
npm install          # puppeteer (카드뉴스 PNG 렌더링용, 없어도 HTML까지는 생성됨)
cp .env.example .env # ANTHROPIC_API_KEY 입력 시 AI 자동 초안 생성
```

## 블로그 초안 생성
```bash
node generate-blog.mjs "카페 원두 보관법"
# -> output/blog/2026-08-31-카페-원두-보관법.md
```
제목 후보 / 목차 / 본문 초안 / 태그 / 이미지 가이드가 담긴 마크다운이 생성됩니다. 검수 후 네이버 블로그 에디터에 붙여넣어 발행하세요.

## 일본어 카드뉴스 생성
```bash
node generate-cardnews.mjs "라떼아트 팁"
# -> output/cardnews/2026-08-31/cards.json
# -> output/cardnews/2026-08-31/card-1.html ~ card-6.html
# -> (puppeteer 설치 시) card-1.png ~ card-6.png (1080x1350, 인스타 세로형)
```
생성된 PNG 폴더는 그대로 `tools/instagram-publish/publish.mjs`에 전달해서 자동 발행할 수 있습니다.

## AI 없이 사용하기
`ANTHROPIC_API_KEY`를 설정하지 않으면 빈 템플릿 파일이 생성됩니다. 이 템플릿 구조를 Claude 대화창에 붙여넣고 "이 구조로 채워줘"라고 요청해도 동일하게 활용할 수 있습니다.
