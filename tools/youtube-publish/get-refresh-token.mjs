#!/usr/bin/env node
// 최초 1회만 실행: 유튜브 업로드 권한을 위한 OAuth2 refresh token을 발급받습니다.
// 사용법: node get-refresh-token.mjs
// (실행 후 콘솔에 뜨는 URL을 브라우저에서 열고 로그인/동의하면 자동으로 완료됩니다)

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import http from "node:http";

await loadEnv();

const CLIENT_ID = process.env.YT_CLIENT_ID;
const CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const REDIRECT_URI = "http://127.0.0.1:53682/oauth2callback";
const SCOPE = "https://www.googleapis.com/auth/youtube.upload";

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("YT_CLIENT_ID / YT_CLIENT_SECRET이 .env에 없습니다. README.md를 참고해 먼저 발급받으세요.");
  process.exit(1);
}
console.error(
  "Google Cloud Console의 OAuth 클라이언트 설정에서 승인된 리디렉션 URI에\n" +
    `  ${REDIRECT_URI}\n` +
    "를 등록해두어야 합니다."
);

const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("scope", SCOPE);
authUrl.searchParams.set("access_type", "offline");
authUrl.searchParams.set("prompt", "consent");

console.log("아래 URL을 브라우저에서 열어 로그인/동의해주세요:\n");
console.log(authUrl.toString());
console.log("\n대기 중...");

const code = await new Promise((resolve, reject) => {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, REDIRECT_URI);
    if (url.pathname !== "/oauth2callback") {
      res.writeHead(404).end();
      return;
    }
    const code = url.searchParams.get("code");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<h1>인증 완료</h1>이 창은 닫으셔도 됩니다.");
    server.close();
    code ? resolve(code) : reject(new Error("인증 코드가 없습니다."));
  });
  server.listen(53682);
});

const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    grant_type: "authorization_code",
    redirect_uri: REDIRECT_URI,
  }),
});
const tokenData = await tokenRes.json();
if (!tokenData.refresh_token) {
  console.error("refresh_token을 받지 못했습니다:", tokenData);
  console.error("이미 한 번 동의한 계정이면 Google 계정 설정에서 앱 액세스를 제거하고 다시 시도해보세요.");
  process.exit(1);
}

console.log("\n발급 완료! 아래 값을 .env의 YT_REFRESH_TOKEN에 붙여넣으세요:\n");
console.log(tokenData.refresh_token);

// ---- helpers ----
async function loadEnv() {
  const envPath = path.resolve(".env");
  if (!existsSync(envPath)) return;
  const text = await readFile(envPath, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
