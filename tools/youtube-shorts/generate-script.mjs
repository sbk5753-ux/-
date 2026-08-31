#!/usr/bin/env node
// 일본 랭킹형 유튜브 쇼츠 대본 생성기
// 사용법: node generate-script.mjs "고양이가 사람보다 뛰어난 능력 TOP5"
//   ANTHROPIC_API_KEY가 있으면 일본어 대본을 AI로 생성합니다.
//   없으면 채워 넣을 빈 템플릿을 생성합니다.
//
// 주의: 여기서 나온 대본은 "초안"입니다. docs/AUTOMATION-GUIDE.md 3-2절의
// 유튜브 2026 정책(반복/비authentic 콘텐츠 규제)에 따라, 업로드 전에
// 반드시 채널만의 코멘트/관점/편집을 더해서 사용하세요.

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('사용법: node generate-script.mjs "랭킹 주제"');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const slug = topic.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-").toLowerCase();
const outDir = path.resolve("output", `${today}-${slug || "short"}`);
await mkdir(outDir, { recursive: true });

const apiKey = process.env.ANTHROPIC_API_KEY;
const RANK_COUNT = 5;

function fallbackScript() {
  return {
    title: topic,
    hook: "ここにフック(最初の3秒で興味を引く一言)を入力してください。",
    items: Array.from({ length: RANK_COUNT }, (_, i) => ({
      rank: RANK_COUNT - i,
      narration: "ここにナレーションを入力してください。",
      onscreen_text: `第${RANK_COUNT - i}位`,
    })),
    outro: {
      narration: "最後まで見てくれてありがとうございます。チャンネル登録よろしくお願いします。",
      onscreen_text: "チャンネル登録お願いします！",
    },
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
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content.map((c) => c.text ?? "").join("\n");
}

let script;
if (apiKey) {
  console.log("ANTHROPIC_API_KEY 감지됨 - 랭킹 쇼츠 대본 생성 중...");
  const prompt = `あなたは日本向けYouTubeショート(ランキング形式)の脚本家です。
「${topic}」というテーマで、${RANK_COUNT}位から1位までのカウントダウン形式のショート動画台本を作ってください。

条件:
- hook: 最初の3秒で視聴者の興味を引く一言(誇張しすぎない)
- 各順位のnarrationは2〜3文、話し言葉、丁寧語
- onscreen_textは画面に大きく出す短いテキスト(10文字以内)
- outroでチャンネル登録を促す

次のJSON形式だけで出力してください(説明文なし):
{
  "title": "動画タイトル",
  "hook": "...",
  "items": [
    {"rank": ${RANK_COUNT}, "narration": "...", "onscreen_text": "..."},
    ...
    {"rank": 1, "narration": "...", "onscreen_text": "..."}
  ],
  "outro": {"narration": "...", "onscreen_text": "..."}
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
console.log(`다음 단계: node tts-voicevox.mjs --script ${outFile}`);
