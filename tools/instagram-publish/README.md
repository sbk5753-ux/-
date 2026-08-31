# instagram-publish

Meta 공식 **Instagram Graph API**로 카드뉴스를 캐러셀(여러 장) 게시물로 자동 발행하는 스크립트입니다. Buffer/Later 같은 예약 발행 서비스가 쓰는 것과 동일한 공식 API라서 계정 정지 리스크가 없습니다.

## 1. 최초 1회 설정
1. 인스타그램 계정 → **프로페셔널(비즈니스/크리에이터) 계정**으로 전환
2. Facebook 페이지 생성 후 인스타그램 계정과 연결 (설정 > 계정 센터 > 연결된 계정)
3. https://developers.facebook.com 에서 앱 생성 → 제품 추가에서 "Instagram Graph API" 추가
4. Graph API Explorer 또는 앱 대시보드에서 아래 권한을 포함한 액세스 토큰 발급
   - `instagram_basic`, `instagram_content_publish`, `pages_show_list`, `pages_read_engagement`
5. 토큰을 **장기 액세스 토큰(60일)** 으로 교환 (단기 토큰은 1시간 만에 만료됨)
   ```
   GET https://graph.facebook.com/v20.0/oauth/access_token
       ?grant_type=fb_exchange_token
       &client_id={app-id}&client_secret={app-secret}
       &fb_exchange_token={단기-토큰}
   ```
6. `GET /me/accounts` 로 페이지 ID 확인 → `GET /{page-id}?fields=instagram_business_account` 로 인스타그램 비즈니스 계정 ID 확인

토큰과 계정 ID를 `.env`에 넣으세요 (`.env.example` 참고). **토큰은 60일마다 갱신이 필요합니다** — 만료 전 알림을 캘린더에 등록해두세요.

## 2. 실행
```bash
cp .env.example .env   # 값 채우기
node publish.mjs --images ../content-generator/output/cardnews/2026-08-31 --caption caption.txt
```
- `--images`: PNG/JPG가 들어있는 폴더 (파일명 순서대로 캐러셀에 들어감)
- `--caption`: 캡션 텍스트가 담긴 파일 경로 또는 직접 문자열

이미지가 로컬 파일뿐이면 Graph API가 요구하는 "공개 URL"이 없으므로:
- `.env`에 `IMGBB_API_KEY`(무료, https://api.imgbb.com/ 가입 후 발급)를 넣으면 스크립트가 자동 업로드 후 발행합니다.
- 이미 다른 곳에 이미지를 올려뒀다면 이미지 폴더에 `urls.txt`를 만들고 공개 URL을 한 줄씩 넣으세요.

## 3. 예약 자동 발행 (선택)
GitHub Actions로 매일 정해진 시각에 실행하도록 cron 워크플로를 추가할 수 있습니다. 필요하시면 `.github/workflows/instagram-publish.yml`을 만들어 드리겠습니다 (레포 Secrets에 토큰 등록 필요).

## 참고
- 캐러셀은 최대 10장까지 지원됩니다.
- 이미지 규격: 정사각형(1080x1080) 또는 세로형(1080x1350) 권장. `content-generator`에서 생성한 PNG는 1080x1350입니다.
- 광고/협찬 콘텐츠는 캡션에 `#PR` `#広告` 등 광고 표시를 반드시 포함하세요 (일본 경품표시법).
