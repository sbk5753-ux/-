#!/usr/bin/env node
// 밈 자막 컴필레이션 쇼츠 대본 생성기 (simkoongzzal 스타일: 실제 영상 클립 +
// 굵은 외곽선 자막, 나레이션 없음, 테마별 컴필레이션)
//
// 사용법: node generate-script.mjs "안 웃을 수 없는 동물들" [--count 6]
//   ANTHROPIC_API_KEY가 있으면 클립별 밈 자막을 한국어로 자동 생성합니다.
//   없으면 채워 넣을 빈 템플릿을 생성합니다.
//
// 결과물은 "대본"이 아니라 "자막 + 어떤 영상을 구해야 하는지"입니다.
// 실제 영상 클립은 직접 촬영하거나, 라이선스가 명확한 소스에서 구해서
// tools/youtube-shorts/assemble-video.mjs 에 넘기세요 (README.md 저작권 안내 참고).

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
const countIdx = args.indexOf("--count");
const count = countIdx >= 0 ? parseInt(args[countIdx + 1], 10) : 6;
const theme = args.filter((_, i) => i !== countIdx && i !== countIdx + 1).join(" ").trim();

if (!theme) {
  console.error('사용법: node generate-script.mjs "테마 (예: 안 웃을 수 없는 동물들)" [--count 6]');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
// 한글 등 비ASCII 테마명은 슬러그에서 제외 (일부 도구/셸에서 비ASCII 파일 경로가
// 깨지는 문제를 피하기 위함). 라틴 문자가 없으면 짧은 타임스탬프로 대체.
const asciiSlug = theme.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
const slug = asciiSlug || `short-${Date.now().toString(36)}`;
const outDir = path.resolve("output", `${today}-${slug || "short"}`);
await mkdir(outDir, { recursive: true });

const apiKey = process.env.ANTHROPIC_API_KEY;

function fallbackScript() {
  return {
    series_title: theme,
    clips: Array.from({ length: count }, (_, i) => ({
      index: i,
      caption: "여기에 짧고 임팩트 있는 자막을 입력하세요",
      footage_hint: "여기에 이 자막과 어울리는 영상 소재를 설명하세요 (예: 강아지가 놀라는 장면)",
    })),
  };
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
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content.map((c) => c.text ?? "").join("\n");
}

let script;
if (apiKey) {
  console.log("ANTHROPIC_API_KEY 감지됨 - 밈 자막 생성 중...");
  const prompt = `너는 한국 유튜브 쇼츠 밈 계정의 자막 작가야. "${theme}"라는 테마로
영상 클립 ${count}개에 들어갈 짧고 웃긴 자막을 만들어줘.

스타일 참고 (이런 톤으로): "국가권력급 사슴", "이 것은 '홀'이라는 것이다", "범 내려온다",
"파리를 길들이면 생기는 일", "이러다가는 다 죽어" — 반말체, 과장·아이러니·드립 섞은
짧은 한 줄(10자 내외), 영상 속 상황을 재치있게 리액션하는 느낌.

각 클립마다 어떤 영상 소재가 필요한지(footage_hint)도 구체적으로 설명해줘
(실제로 이 소재를 촬영하거나 구해야 하니까 상황을 명확하게).

다음 JSON 형식으로만 출력해줘 (설명 없이):
{
  "series_title": "${theme}",
  "clips": [
    {"index": 0, "caption": "...", "footage_hint": "..."},
    ...
  ]
}`;
  try {
    const raw = await callClaude(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    script = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    console.error("AI 생성 실패, 빈 템플릿으로 대체:", err.message);
    script = fallbackScript();
  }
} else {
  console.log("ANTHROPIC_API_KEY 없음 - 빈 템플릿 생성 (수동 작성용)");
  script = fallbackScript();
}

const outFile = path.join(outDir, "script.json");
await writeFile(outFile, JSON.stringify(script, null, 2), "utf8");
console.log(`대본 생성 완료: ${outFile}`);
console.log(`\n다음 단계:`);
console.log(`1. script.json의 footage_hint를 참고해서 영상 클립을 준비하세요 (직접 촬영 또는 라이선스 명확한 소스)`);
console.log(`2. 클립을 00.mp4, 01.mp4, ... 이름으로 폴더 하나에 모으세요 (클립 개수 = ${script.clips.length}개)`);
console.log(`3. node assemble-video.mjs --script ${outFile} --footage <클립폴더>`);
