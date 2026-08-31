#!/usr/bin/env node
// 인스타그램 캐러셀(카드뉴스) 자동 발행 - Meta Graph API 공식 방식
//
// 사용법:
//   node publish.mjs --images ../content-generator/output/cardnews/2026-08-31 --caption caption.txt
//
// 준비물 (README.md 참고):
//   1) 인스타그램 프로페셔널 계정 + 연결된 Facebook 페이지
//   2) Meta for Developers 앱에서 Instagram Graph API 권한/토큰 발급
//   3) .env 파일에 IG_BUSINESS_ACCOUNT_ID / IG_ACCESS_TOKEN 설정
//
// 이미지가 로컬 PNG뿐이면 IMGBB_API_KEY를 설정해 자동으로 공개 URL을 만듭니다.
// 이미 공개 URL이 있다면 이미지 폴더에 urls.txt (한 줄에 하나씩)를 넣어두면 업로드를 건너뜁니다.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { existsSync } from "node:fs";

await loadEnv();

const args = parseArgs(process.argv.slice(2));
if (!args.images) {
  console.error("사용법: node publish.mjs --images <카드뉴스 PNG 폴더> [--caption <파일 또는 텍스트>]");
  process.exit(1);
}

const IG_ID = process.env.IG_BUSINESS_ACCOUNT_ID;
const TOKEN = process.env.IG_ACCESS_TOKEN;
const IMGBB_KEY = process.env.IMGBB_API_KEY;
const GRAPH = "https://graph.facebook.com/v20.0";

if (!IG_ID || !TOKEN) {
  console.error("IG_BUSINESS_ACCOUNT_ID / IG_ACCESS_TOKEN이 설정되지 않았습니다. .env를 확인하세요.");
  process.exit(1);
}

const imagesDir = path.resolve(args.images);
const caption = await resolveCaption(args.caption);
const imageUrls = await resolveImageUrls(imagesDir);

if (imageUrls.length === 0) {
  console.error(`${imagesDir} 에서 사용할 이미지 URL을 찾지 못했습니다.`);
  process.exit(1);
}

console.log(`이미지 ${imageUrls.length}장 발행 시작...`);

let creationId;
if (imageUrls.length === 1) {
  creationId = await createMediaContainer({ image_url: imageUrls[0], caption });
} else {
  const childIds = [];
  for (const url of imageUrls) {
    const id = await createMediaContainer({ image_url: url, is_carousel_item: true });
    childIds.push(id);
    console.log(`  컨테이너 생성: ${id}`);
  }
  creationId = await createMediaContainer({
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption,
  });
}

const publishedId = await publish(creationId);
console.log(`발행 완료! media id: ${publishedId}`);

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

async function resolveCaption(captionArg) {
  if (!captionArg) return "";
  if (existsSync(captionArg)) return (await readFile(captionArg, "utf8")).trim();
  return captionArg;
}

async function resolveImageUrls(dir) {
  const urlsFile = path.join(dir, "urls.txt");
  if (existsSync(urlsFile)) {
    const text = await readFile(urlsFile, "utf8");
    return text.split("\n").map((l) => l.trim()).filter(Boolean);
  }

  const files = (await readdir(dir))
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();

  if (files.length === 0) return [];

  if (!IMGBB_KEY) {
    console.error(
      `공개 URL이 없고 IMGBB_API_KEY도 없습니다.\n` +
        `- 옵션 A: ${dir}/urls.txt 에 이미 호스팅된 공개 이미지 URL을 한 줄에 하나씩 넣으세요.\n` +
        `- 옵션 B: .env에 IMGBB_API_KEY를 설정해서 자동 업로드하세요 (https://api.imgbb.com).`
    );
    process.exit(1);
  }

  const urls = [];
  for (const file of files) {
    const url = await uploadToImgbb(path.join(dir, file));
    console.log(`  업로드: ${file} -> ${url}`);
    urls.push(url);
  }
  return urls;
}

async function uploadToImgbb(filePath) {
  const buf = await readFile(filePath);
  const form = new FormData();
  form.append("key", IMGBB_KEY);
  form.append("image", new Blob([buf]), path.basename(filePath));
  const res = await fetch("https://api.imgbb.com/1/upload", { method: "POST", body: form });
  const data = await res.json();
  if (!data.success) throw new Error(`imgbb 업로드 실패: ${JSON.stringify(data)}`);
  return data.data.url;
}

async function createMediaContainer(params) {
  const url = new URL(`${GRAPH}/${IG_ID}/media`);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") url.searchParams.set(k, v);
  }
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(`media 컨테이너 생성 실패: ${JSON.stringify(data)}`);
  return data.id;
}

async function publish(creationId) {
  const url = new URL(`${GRAPH}/${IG_ID}/media_publish`);
  url.searchParams.set("creation_id", creationId);
  url.searchParams.set("access_token", TOKEN);
  const res = await fetch(url, { method: "POST" });
  const data = await res.json();
  if (!res.ok) throw new Error(`발행 실패: ${JSON.stringify(data)}`);
  return data.id;
}
