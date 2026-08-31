# 카페 사장님을 위한 콘텐츠·커머스 자동화 프로젝트

네이버 블로그 + 일본어 카드뉴스 인스타그램 운영에서 시작해, 온라인 쇼핑몰까지 자동화된 수익 파이프라인으로 키우기 위한 프로젝트입니다. 카페 운영을 하면서 이 사업을 점진적으로 주업무로 전환하는 것이 목표입니다.

**먼저 읽어보세요 → [`docs/AUTOMATION-GUIDE.md`](docs/AUTOMATION-GUIDE.md)**
채널별 자동화 방법, 수익화 전략, 6개월 전환 로드맵이 상세히 정리되어 있습니다.

## 이 저장소 구성

| 폴더 | 내용 |
|---|---|
| [`docs/`](docs/AUTOMATION-GUIDE.md) | 전체 전략·실행 가이드 (필독) |
| [`docs/PRODUCT-IDEAS.md`](docs/PRODUCT-IDEAS.md) | 자체 상품 기획 가이드 + 2026 트렌드 기반 아이디어 뱅크 |
| [`tools/content-generator/`](tools/content-generator) | 블로그 글·일본어 카드뉴스 초안 생성 (AI 보조) |
| [`tools/instagram-publish/`](tools/instagram-publish) | 인스타그램 카드뉴스 자동 발행 (Meta Graph API) |
| [`tools/naver-blog/`](tools/naver-blog) | 네이버 블로그 연동 가이드 + 실험적 발행 스크립트 |
| [`site/`](site) | 쇼핑몰/브랜드 허브 랜딩페이지 (블로그·인스타 링크, 오픈 알림 신청) |

## 가장 빠른 시작 방법
```bash
cd tools/content-generator
npm install
cp .env.example .env   # ANTHROPIC_API_KEY 넣으면 AI 초안 자동 생성

node generate-blog.mjs "오늘 쓰고 싶은 블로그 주제"
node generate-cardnews.mjs "카드뉴스로 만들 주제"
```

랜딩페이지 미리보기:
```bash
cd site && python3 -m http.server 8080
```

## 다음 단계
- [ ] 실제 블로그/인스타 계정 정보로 `site/index.html`의 링크 채우기
- [ ] Meta 앱 등록 후 `tools/instagram-publish`로 첫 자동 발행 테스트
- [ ] 매일 콘텐츠 생성을 자동 알림으로 받도록 GitHub Actions cron 추가 (요청 시 진행)
- [ ] 마켓플레이스(스마트스토어 등)로 첫 상품 테스트 판매 후, 자사몰 확장 여부 결정
- [ ] `docs/PRODUCT-IDEAS.md`에서 아이디어 하나 선정 후 상세 상품 기획서 작성 (요청 시 진행)
