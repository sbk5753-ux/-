#!/usr/bin/env node
// 일본어 뉴스카드 생성기 (japna_issue 스타일: 어두운 배경 사진 + 카테고리 태그 +
// 빨간 강조 헤드라인 + 팩트 불릿, 게시물 1개 = 뉴스 1건인 단일 이미지 포스트)
//
// 사용법:
//   node generate-cardnews.mjs "다룰 소재/뉴스" [--category "スキャンダル"] [--photo ./사진.jpg]
//
//   ANTHROPIC_API_KEY가 있으면 카테고리/헤드라인/팩트를 일본어로 자동 생성합니다.
//   --photo로 실제 사진을 지정하지 않으면 자리표시자 배경으로 렌더링됩니다
//   (저작권 있는 뉴스/연예인 사진을 무단으로 캡처해 쓰지 마세요 — README 참고).

import { writeFile, mkdir, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const { topic, options } = parseArgs(process.argv.slice(2));
if (!topic) {
  console.error('사용법: node generate-cardnews.mjs "소재" [--category "카테고리"] [--photo <이미지경로>]');
  process.exit(1);
}

const today = new Date().toISOString().slice(0, 10);
const slug = topic.replace(/[^\p{L}\p{N}\s-]/gu, "").trim().replace(/\s+/g, "-").toLowerCase();
const outDir = path.resolve("output", "newscard", `${today}-${slug || "card"}`);
await mkdir(outDir, { recursive: true });

const apiKey = process.env.ANTHROPIC_API_KEY;
const BRAND = process.env.CARDNEWS_BRAND || "JAPAN ISSUE";

function fallbackCard() {
  return {
    category: options.category || "話題",
    headline_highlight: "ここに強調",
    headline_rest: "したい一言を入れてください",
    facts: ["ここに事実1を入力", "ここに事実2を入力", "ここに事実3を入力"],
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
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.content.map((c) => c.text ?? "").join("\n");
}

let card;
if (apiKey) {
  console.log("ANTHROPIC_API_KEY 감지됨 - 일본어 뉴스카드 생성 중...");
  const prompt = `あなたは日本のニュース系Instagramアカウントの編集者です。
「${topic}」というニュース/話題について、ニュースカード用のテキストを作ってください。
${options.category ? `カテゴリは「${options.category}」で固定してください。` : "カテゴリ(スキャンダル/天気/芸能/災害/話題 など2〜4文字の短い日本語ラベル)も決めてください。"}

条件:
- headline_highlight: 見出しの中で赤く強調したい一番インパクトのある一言(10文字以内)
- headline_rest: 見出しの残りの部分(15〜25文字程度、highlightの直後に自然につながる文)
- facts: 事実を淡々と伝える箇条書き3〜4個(各20〜35文字、誇張表現や未確認情報は避ける)

次のJSON形式だけで出力してください(説明文なし):
{"category": "...", "headline_highlight": "...", "headline_rest": "...", "facts": ["...", "...", "..."]}`;
  try {
    const raw = await callClaude(prompt);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    card = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
  } catch (err) {
    console.error("AI 생성 실패, 빈 템플릿으로 대체:", err.message);
    card = fallbackCard();
  }
} else {
  console.log("ANTHROPIC_API_KEY 없음 - 빈 템플릿 생성 (수동 작성용)");
  card = fallbackCard();
}

await writeFile(path.join(outDir, "card.json"), JSON.stringify(card, null, 2), "utf8");
console.log(`카드 콘텐츠 저장: ${outDir}/card.json`);

// HTML 렌더링
const templatePath = path.resolve("templates", "newscard-template.html");
const template = await readFile(templatePath, "utf8");

let photoTag;
if (options.photo) {
  const photoAbs = path.resolve(options.photo);
  if (!existsSync(photoAbs)) {
    console.error(`--photo 경로를 찾을 수 없습니다: ${photoAbs}`);
    process.exit(1);
  }
  photoTag = `<img class="photo" src="file://${photoAbs}" />`;
} else {
  photoTag = `<div class="photo-placeholder">写真を追加してください (--photo)</div>`;
  console.log("주의: --photo를 지정하지 않아 자리표시자 배경으로 생성됩니다. 실제 게시 전 관련 사진을 넣어주세요.");
}

const factsHtml = (card.facts || []).map((f) => `<li>${escapeHtml(f)}</li>`).join("\n      ");

const html = template
  .replaceAll("{{PHOTO_TAG}}", photoTag)
  .replaceAll("{{BRAND}}", escapeHtml(BRAND))
  .replaceAll("{{CATEGORY}}", escapeHtml(card.category || ""))
  .replaceAll("{{HEADLINE_HIGHLIGHT}}", escapeHtml(card.headline_highlight || ""))
  .replaceAll("{{HEADLINE_REST}}", escapeHtml(card.headline_rest || ""))
  .replaceAll("{{FACTS}}", factsHtml);

const htmlFile = path.join(outDir, "card.html");
await writeFile(htmlFile, html, "utf8");
console.log(`HTML 카드 생성 완료: ${htmlFile}`);

// PNG 렌더링: puppeteer가 있으면 그걸 쓰고, 없으면 로컬 Chrome/Chromium을 CLI로 직접 호출
const pngFile = path.join(outDir, "card.png");
try {
  await renderWithPuppeteer(htmlFile, pngFile);
} catch {
  const chrome = await findChromeBinary();
  if (chrome) {
    console.log(`puppeteer 미설치 - 로컬 Chrome(${chrome})으로 PNG 렌더링 중...`);
    await run(chrome, [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--hide-scrollbars",
      "--window-size=1080,1350",
      `--screenshot=${pngFile}`,
      `file://${htmlFile}`,
    ]);
    console.log(`PNG 생성 완료: ${pngFile}`);
    console.log("이 폴더를 tools/instagram-publish/publish.mjs 에 넘기면 바로 발행할 수 있습니다.");
  } else {
    console.log(
      "PNG 렌더링을 건너뜁니다 (puppeteer도, 로컬 Chrome/Chromium도 찾지 못했습니다).\n" +
        "`npm install` 로 puppeteer를 설치하거나, Chrome/Chromium을 설치한 뒤 다시 실행하세요."
    );
  }
}

// ---- helpers ----

async function renderWithPuppeteer(htmlFile, pngFile) {
  const puppeteer = await import("puppeteer");
  console.log("puppeteer 감지됨 - PNG 렌더링 중...");
  const browser = await puppeteer.default.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350 });
  await page.goto(`file://${htmlFile}`, { waitUntil: "networkidle0" });
  await page.screenshot({ path: pngFile });
  await browser.close();
  console.log(`PNG 생성 완료: ${pngFile}`);
}

async function findChromeBinary() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;

  const pwPath = process.env.PLAYWRIGHT_BROWSERS_PATH;
  if (pwPath && existsSync(pwPath)) {
    const dirs = await readdir(pwPath).catch(() => []);
    const chromiumDir = dirs.find((d) => d.startsWith("chromium-"));
    if (chromiumDir) {
      const candidate = path.join(pwPath, chromiumDir, "chrome-linux", "chrome");
      if (existsSync(candidate)) return candidate;
    }
  }

  for (const name of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable"]) {
    try {
      const { stdout } = await run("which", [name]);
      if (stdout.trim()) return stdout.trim();
    } catch {
      // 다음 후보 탐색
    }
  }
  return null;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}

function parseArgs(argv) {
  const options = {};
  const rest = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--category") options.category = argv[++i];
    else if (argv[i] === "--photo") options.photo = argv[++i];
    else rest.push(argv[i]);
  }
  return { topic: rest.join(" ").trim(), options };
}
