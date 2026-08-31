# site — 브랜드 허브 랜딩페이지

블로그·인스타그램 링크와 "온라인 스토어 오픈 예정" 신청 폼을 담은 정적 랜딩페이지입니다. 프레임워크 없이 순수 HTML/CSS/JS라 어디든 무료로 바로 배포할 수 있습니다.

## 로컬에서 보기
```bash
cd site
python3 -m http.server 8080
# http://localhost:8080 접속
```

## 채워야 할 부분
- `index.html`의 `YOUR_BLOG_ID`, `YOUR_INSTAGRAM_ID`를 실제 계정으로 변경
- `BRAND NAME`, `contact@example.com`을 실제 브랜드명/이메일로 변경
- 뉴스레터 신청 폼(`#subscribe-form`)은 지금은 콘솔 로그만 남기는 데모입니다. 실제 운영 시:
  - 가장 빠른 방법: Google Forms/Tally 폼 링크로 버튼을 교체
  - 직접 수집하려면: 폼 action을 간단한 서버리스 함수(Vercel/Netlify Functions)나 스프레드시트 연동(Google Apps Script 웹훅)으로 연결

## 배포 (무료, 셋 중 아무거나)
- **GitHub Pages**: 저장소 Settings > Pages에서 `site/`를 소스로 지정 (또는 `main` 브랜치의 `/site` 폴더)
- **Netlify**: 저장소 연결 후 base directory를 `site`로 설정, publish directory는 `.`
- **Vercel**: 저장소 import 후 Root Directory를 `site`로 설정

## 다음 단계 (2단계 쇼핑몰로 확장할 때)
`docs/AUTOMATION-GUIDE.md`의 "3. 온라인 쇼핑몰 자동화 로드맵" 참고. 이 랜딩페이지는 브랜드 허브로 유지하고, 실제 상품 판매/결제는 Cafe24 같은 쇼핑몰 빌더로 시작하거나, 이 저장소에 Next.js + 결제 모듈을 추가해 자체 스토어로 확장할 수 있습니다 (필요하시면 다음 작업으로 진행해 드립니다).
