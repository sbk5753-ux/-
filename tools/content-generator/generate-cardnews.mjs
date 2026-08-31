#!/usr/bin/env node
// 일본어 카드뉴스 생성기
// 사용법: node generate-cardnews.mjs "카페 라떼 아트 팁"
//   1) ANTHROPIC_API_KEY가 있으면 카드별 일본어 카피를 AI로 생성
//   2) puppeteer가 설치되어 있으면 카드마다 PNG(1080x1350)까지 렌더링
//      (없으면 HTML/JSON까지만 생성 - 직접 열어서 스크린샷하거나 Canva에 옮겨 써도 됩니다)

import { writeFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";

const topic = process.argv.slice(2).join(" ").trim();
if (!topic) {
  console.error('사용법: node generate-cardnews.mjs "주제"');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const outDir = path.resolve("output", "cardnews", today);
await mkdir(outDir, { recursive: true });

const apiKey = process.env.ANTHROPIC_API_KEY;
const CARD_COUNT = 6;

function fallbackCards() {
  return Array.from({ length: CARD_COUNT }, (_, i) => ({
    badge: i === 0 ? "JAPAN ISSUE" : `TIP ${i}`,
    title: i === 0 ? topic : `見出し ${i}`,
    body: "ここに本文を入力してください。",
  }));
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
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content.map((c) => c.text ?? "").join("\n");
}

let cards;
if (apiKey) {
  console.log("ANTHROPIC_API_KEY 감지됨 - 일본어 카드뉴스 카피 생성 중...");
  const prompt = `あなたは日本向けInstagramカード ニュースのコピーライターです。
「${topic}」というテーマで、日本の読者向けに投稿する
${CARD_COUNT}枚のカードニュースを作ってください。
1枚目は表紙（フックの効いた見出し）、2〜${CARD_COUNT - 1}枚目は内容、最後の1枚はまとめ/CTAにしてください。
丁寧語で、誇大広告表現（絶対、No.1など）は避けてください。
必ず次のJSON配列の形式だけで出力してください（説明文なし）:
[{"badge":"短いラベル","title":"見出し(20文字以内)","body":"本文(40〜60文字)"}, ...]`;
  try {
    const raw = await callClaude(prompt);
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    cards = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    console.error("AI 생성 실패, 빈 템플릿으로 대체:", err.message);
    cards = fallbackCards();
  }
} else {
  console.log("ANTHROPIC_API_KEY 없음 - 빈 템플릿 생성 (수동 작성용)");
  cards = fallbackCards();
}

await writeFile(path.join(outDir, "cards.json"), JSON.stringify(cards, null, 2), "utf8");
console.log(`카드 콘텐츠 저장: ${outDir}/cards.json`);

// HTML 렌더링
const templatePath = path.resolve("templates", "cardnews-template.html");
const template = await readFile(templatePath, "utf8");

const htmlFiles = [];
for (let i = 0; i < cards.length; i++) {
  const c = cards[i];
  const html = template
    .replaceAll("{{BADGE}}", c.badge ?? "")
    .replaceAll("{{TITLE}}", c.title ?? "")
    .replaceAll("{{BODY}}", c.body ?? "")
    .replaceAll("{{PAGE}}", String(i + 1))
    .replaceAll("{{TOTAL}}", String(cards.length));
  const htmlFile = path.join(outDir, `card-${i + 1}.html`);
  await writeFile(htmlFile, html, "utf8");
  htmlFiles.push(htmlFile);
}
console.log(`HTML 카드 ${htmlFiles.length}장 생성 완료`);

// puppeteer가 있으면 PNG로 렌더링
try {
  const puppeteer = await import("puppeteer");
  console.log("puppeteer 감지됨 - PNG 렌더링 중...");
  const browser = await puppeteer.default.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350 });
  for (let i = 0; i < htmlFiles.length; i++) {
    await page.goto(`file://${htmlFiles[i]}`, { waitUntil: "networkidle0" });
    const pngFile = path.join(outDir, `card-${i + 1}.png`);
    await page.screenshot({ path: pngFile });
    console.log(`  -> ${pngFile}`);
  }
  await browser.close();
  console.log("PNG 렌더링 완료. 이 폴더를 tools/instagram-publish/publish.mjs 에 넘기면 바로 발행할 수 있습니다.");
} catch (err) {
  console.log("puppeteer 미설치 - PNG는 건너뜁니다. (tools/content-generator 폴더에서 `npm install` 후 다시 실행하면 PNG까지 생성됩니다)");
}
