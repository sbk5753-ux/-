#!/usr/bin/env node
// [실험적] 네이버 오픈 API 글쓰기 권한 승인을 받은 경우에만 사용하세요.
// 대부분의 개인 블로거는 승인이 나지 않으므로, 기본 권장 경로는
// tools/content-generator (초안 생성) + 수동 발행입니다. README.md 참고.
//
// 사용법: node post.mjs --title "제목" --body body.md --category 12345

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

await loadEnv();

const args = parseArgs(process.argv.slice(2));
const CLIENT_ID = process.env.NAVER_CLIENT_ID;
const ACCESS_TOKEN = process.env.NAVER_ACCESS_TOKEN;

if (!CLIENT_ID || !ACCESS_TOKEN) {
  console.error(
    "NAVER_CLIENT_ID / NAVER_ACCESS_TOKEN이 없습니다.\n" +
      "네이버 개발자센터에서 글쓰기 API 승인을 받지 못했다면 이 스크립트는 사용할 수 없습니다.\n" +
      "README.md의 '권장: 반자동화' 방법을 사용하세요."
  );
  process.exit(1);
}

if (!args.title || !args.body) {
  console.error('사용법: node post.mjs --title "제목" --body <본문파일.md> [--category <카테고리번호>]');
  process.exit(1);
}

const body = existsSync(args.body) ? await readFile(args.body, "utf8") : args.body;

console.log("주의: 이 엔드포인트는 네이버가 승인 시 안내하는 실제 스펙에 맞춰 수정이 필요할 수 있습니다.");

// NOTE: 네이버는 개인 개발자용 공개된 표준 "블로그 글쓰기 REST 엔드포인트" 문서를
// 상시 제공하지 않습니다. 아래는 승인받은 경우 네이버가 안내하는 문서를 참고해
// endpoint/파라미터를 맞춰 넣는 자리입니다.
const ENDPOINT = process.env.NAVER_BLOG_POST_ENDPOINT; // 승인 시 발급받은 문서의 엔드포인트를 .env에 입력

if (!ENDPOINT) {
  console.error("NAVER_BLOG_POST_ENDPOINT가 .env에 없습니다. 승인 문서의 엔드포인트를 입력하세요.");
  process.exit(1);
}

const res = await fetch(ENDPOINT, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    "X-Naver-Client-Id": CLIENT_ID,
    "content-type": "application/json",
  },
  body: JSON.stringify({
    title: args.title,
    contents: body,
    categoryNo: args.category,
  }),
});

if (!res.ok) {
  console.error(`발행 실패: ${res.status} ${await res.text()}`);
  process.exit(1);
}

console.log("발행 요청 완료:", await res.json());

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

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}
