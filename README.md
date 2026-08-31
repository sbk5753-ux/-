# 콘텐츠·커머스 자동화 프로젝트

**네이버 블로그 / 일본어 뉴스카드 인스타그램 / 유튜브 쇼츠(밈 자막 컴필레이션) / 온라인 사업(아이템 미정)**, 이 네 축을 자동화된 수익 파이프라인으로 키우기 위한 프로젝트입니다. 특정 오프라인 업종과는 무관한 독립 콘텐츠·커머스 사업입니다.

**지금 바로 시작하려면 → [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md)**
4개 채널을 순서대로 오늘부터 실행할 수 있는 체크리스트입니다.

## 이 저장소 구성

| 폴더 | 내용 |
|---|---|
| [`docs/GETTING-STARTED.md`](docs/GETTING-STARTED.md) | **지금 시작하기** — 4채널 순서별 실행 체크리스트 |
| [`docs/AUTOMATION-GUIDE.md`](docs/AUTOMATION-GUIDE.md) | 전체 전략·실행 가이드 |
| [`docs/NAVER-BLOG-SEO.md`](docs/NAVER-BLOG-SEO.md) | 네이버 블로그 조회수 올리는 법 (C-Rank/D.I.A. 알고리즘 기준) |
| [`docs/PRODUCT-IDEAS.md`](docs/PRODUCT-IDEAS.md) | 온라인 사업 아이템 기획 가이드 + 2026 트렌드 기반 아이디어 뱅크 |
| [`tools/content-generator/`](tools/content-generator) | 블로그 글·일본어 뉴스카드 초안 생성 (AI 보조) |
| [`tools/instagram-publish/`](tools/instagram-publish) | 인스타그램 뉴스카드 자동 발행 (Meta Graph API) |
| [`tools/naver-blog/`](tools/naver-blog) | 네이버 블로그 연동 가이드 + 실험적 발행 스크립트 |
| [`tools/youtube-shorts/`](tools/youtube-shorts) | 밈 자막 생성 → 영상 클립 합성(ffmpeg, 마스코트 워터마크 포함) |
| [`tools/youtube-publish/`](tools/youtube-publish) | 유튜브 자동 업로드/예약 (YouTube Data API v3) |
| [`site/`](site) | 4채널 브랜드 허브 랜딩페이지 |

## 가장 빠른 시작 방법
```bash
# 블로그 / 일본어 뉴스카드 초안
cd tools/content-generator
cp .env.example .env   # ANTHROPIC_API_KEY 넣으면 AI 초안 자동 생성
node generate-blog.mjs "오늘 쓰고 싶은 블로그 주제"
node generate-cardnews.mjs "다룰 뉴스/소재" --category "話題" --photo ./사진.jpg

# 유튜브 쇼츠 밈 자막
cd ../youtube-shorts
cp .env.example .env
node generate-script.mjs "테마 (예: 안 웃을 수 없는 동물들)" --count 6
```

랜딩페이지 미리보기:
```bash
cd site && python3 -m http.server 8080
```

## 다음 단계
- [ ] Meta 앱 등록 후 `tools/instagram-publish`로 첫 자동 발행 테스트
- [ ] ffmpeg + 한국어 폰트 설치 후 `tools/youtube-shorts`로 쇼츠 1편 시험 제작 (영상 클립은 직접 준비)
- [ ] Google Cloud OAuth 설정 후 `tools/youtube-publish`로 첫 업로드 테스트
- [ ] 매일 콘텐츠 생성을 자동 알림으로 받도록 GitHub Actions cron 추가 (요청 시 진행)
- [ ] `docs/PRODUCT-IDEAS.md`를 참고해 온라인 사업 아이템 방향 좁히기
