#!/usr/bin/env node
// YouTube Data API v3(공식)로 쇼츠 영상을 업로드/예약 발행합니다.
//
// 사전 준비: get-refresh-token.mjs를 먼저 1회 실행해 YT_REFRESH_TOKEN을 발급받으세요.
//
// 사용법:
//   node publish.mjs --file short.mp4 --title "제목" --description "설명" \
//     [--tags "태그1,태그2"] [--privacy private|unlisted|public] [--publishAt 2026-09-01T09:00:00Z]

import { readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

await loadEnv();

const args = parseArgs(process.argv.slice(2));
const CLIENT_ID = process.env.YT_CLIENT_ID;
const CLIENT_SECRET = process.env.YT_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YT_REFRESH_TOKEN;

if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
  console.error("YT_CLIENT_ID / YT_CLIENT_SECRET / YT_REFRESH_TOKEN이 없습니다. README.md를 참고하세요.");
  process.exit(1);
}
if (!args.file || !args.title) {
  console.error('사용법: node publish.mjs --file <영상.mp4> --title "제목" [--description ...] [--tags "a,b"] [--privacy private|unlisted|public] [--publishAt <ISO시각>]');
  process.exit(1);
}

const filePath = path.resolve(args.file);
if (!existsSync(filePath)) {
  console.error(`파일을 찾을 수 없습니다: ${filePath}`);
  process.exit(1);
}

const accessToken = await getAccessToken();
const fileBuf = await readFile(filePath);
const fileSize = (await stat(filePath)).size;

const publishAt = args.publishAt;
const privacyStatus = publishAt ? "private" : args.privacy || "private";
// publishAt을 쓰려면 privacyStatus가 private이어야 하고, 지정 시각에 유튜브가 자동으로 공개 전환합니다.

const snippet = {
  title: args.title,
  description: args.description || "",
  tags: args.tags ? args.tags.split(",").map((t) => t.trim()) : undefined,
  categoryId: "24", // Entertainment
};
const status = { privacyStatus, selfDeclaredMadeForKids: false };
if (publishAt) status.publishAt = publishAt;

console.log("업로드 세션 시작 중...");
const initRes = await fetch(
  "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      "X-Upload-Content-Type": "video/mp4",
      "X-Upload-Content-Length": String(fileSize),
    },
    body: JSON.stringify({ snippet, status }),
  }
);
if (!initRes.ok) throw new Error(`업로드 세션 생성 실패: ${initRes.status} ${await initRes.text()}`);
const uploadUrl = initRes.headers.get("location");

console.log(`업로드 중... (${(fileSize / 1024 / 1024).toFixed(1)}MB)`);
const uploadRes = await fetch(uploadUrl, {
  method: "PUT",
  headers: { "content-type": "video/mp4", "content-length": String(fileSize) },
  body: fileBuf,
});
if (!uploadRes.ok) throw new Error(`업로드 실패: ${uploadRes.status} ${await uploadRes.text()}`);

const video = await uploadRes.json();
console.log(`업로드 완료! https://youtube.com/watch?v=${video.id}`);
if (publishAt) console.log(`예약 공개 시각: ${publishAt} (그 전까지는 비공개로 보관됩니다)`);

// ---- helpers ----

async function getAccessToken() {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: REFRESH_TOKEN,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error(`액세스 토큰 갱신 실패: ${JSON.stringify(data)}`);
  return data.access_token;
}

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
