#!/usr/bin/env node
// 네이버 블로그 초안 생성기
// 사용법: node generate-blog.mjs "카페 원두 보관법"
//   ANTHROPIC_API_KEY가 설정되어 있으면 실제 초안까지 자동 생성합니다.
//   없으면 채워 넣을 빈 템플릿 파일을 생성합니다 (수동/Claude 대화창에 복사해서 사용).

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const keyword = process.argv.slice(2).join(" ").trim();
if (!keyword) {
  console.error('사용법: node generate-blog.mjs "키워드 또는 주제"');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const outDir = path.resolve("output", "blog");
await mkdir(outDir, { recursive: true });

// 한글/일본어 등 비ASCII 제목은 슬러그에서 제외 (일부 도구/셸에서 비ASCII 파일 경로가
// 깨지는 문제를 피하기 위함). 라틴 문자가 없으면 짧은 타임스탬프로 대체.
const asciiSlug = keyword
  .toLowerCase()
  .replace(/[^a-z0-9\s-]/g, "")
  .trim()
  .replace(/\s+/g, "-");
const slug = asciiSlug || `post-${Date.now().toString(36)}`;
const outFile = path.join(outDir, `${today}-${slug || "post"}.md`);

const apiKey = process.env.ANTHROPIC_API_KEY;

function templateSkeleton() {
  return `# [초안] ${keyword}

> 이 파일은 빈 템플릿입니다. ANTHROPIC_API_KEY를 tools/content-generator/.env 에 넣고
> 다시 실행하면 아래 항목이 AI로 자동 채워집니다. 지금은 이 구조를 그대로
> Claude 대화창에 붙여넣어 "이 구조로 블로그 글 초안 써줘"라고 요청해도 됩니다.

## 제목 후보 5개
1.
2.
3.
4.
5.

## 목차 (H2/H3)
-

## 본문 초안


## 추천 태그


## 필요한 이미지 (촬영 또는 AI 생성용 설명)
1.
`;
}

async function callClaude(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new Error(`Anthropic API 오류: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.content.map((c) => c.text ?? "").join("\n");
}

let content;
if (apiKey) {
  console.log("ANTHROPIC_API_KEY 감지됨 - AI 초안 생성 중...");
  const prompt = `너는 네이버 블로그 SEO 글쓰기 전문가야. "${keyword}"라는 주제로
네이버 블로그 글을 쓰려고 해. 아래 형식의 마크다운으로 정확히 작성해줘 (다른 설명 없이 이 형식만):

# [초안] ${keyword}

## 제목 후보 5개
(클릭률 높은 제목 5개, 각 40자 이내)

## 목차 (H2/H3)
(글의 목차 구조)

## 본문 초안
(1500~2000자 분량, 친근한 존댓말 톤, 실제 경험담처럼 자연스럽게, 과장 광고 표현 금지)

## 추천 태그
(네이버 블로그 태그 10개)

## 필요한 이미지 (촬영 또는 AI 생성용 설명)
(본문에 들어갈 이미지 3~5개에 대한 구체적인 설명)`;
  try {
    content = await callClaude(prompt);
  } catch (err) {
    console.error("AI 생성 실패, 빈 템플릿으로 대체:", err.message);
    content = templateSkeleton();
  }
} else {
  console.log("ANTHROPIC_API_KEY 없음 - 빈 템플릿 생성 (수동 작성용)");
  content = templateSkeleton();
}

await writeFile(outFile, content, "utf8");
console.log(`생성 완료: ${outFile}`);
