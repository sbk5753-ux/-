#!/usr/bin/env node
// script.json(밈 자막) + 실제 영상 클립 폴더를 세로형(1080x1920) 쇼츠로 합칩니다.
// simkoongzzal 스타일: 굵은 외곽선 자막 + (선택) 마스코트 워터마크, 나레이션 없음.
// ffmpeg가 로컬에 설치되어 있어야 합니다 (https://ffmpeg.org).
//
// 사전 준비: script.json의 footage_hint를 참고해 영상 클립을 준비하고,
// 클립 개수만큼 00.mp4, 01.mp4, ... 이름으로 한 폴더에 모아두세요.
// (저작권 관련 안내는 README.md 참고 — 남의 영상을 무단으로 재사용하지 마세요.)
//
// 사용법:
//   node assemble-video.mjs --script output/.../script.json --footage ./footage \
//     [--logo ./mascot.png] [--brand "채널명"] [--color yellow|white] [--mute]

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const args = parseArgs(process.argv.slice(2));
if (!args.script || !args.footage) {
  console.error(
    "사용법: node assemble-video.mjs --script <script.json> --footage <클립폴더> " +
      "[--logo <원형 PNG>] [--brand \"채널명\"] [--color yellow|white] [--mute]"
  );
  process.exit(1);
}

await assertFfmpeg();

const scriptPath = path.resolve(args.script);
const script = JSON.parse(await readFile(scriptPath, "utf8"));
const footageDir = path.resolve(args.footage);
const baseDir = path.dirname(scriptPath);
const workDir = path.join(baseDir, "video-work");
await mkdir(workDir, { recursive: true });

const captionColor = args.color === "white" ? "white" : "yellow";
const brand = args.brand || process.env.SHORTS_BRAND || "";
const logoPath = args.logo ? path.resolve(args.logo) : null;
if (args.logo && !existsSync(logoPath)) {
  console.error(`--logo 경로를 찾을 수 없습니다: ${logoPath}`);
  process.exit(1);
}

const fontPath = process.env.FFMPEG_FONT_PATH || (await guessFont());
if (!fontPath) {
  console.error(
    "자막을 표시할 폰트를 찾지 못했습니다. Noto Sans CJK / Pretendard 등을 설치한 뒤\n" +
      "FFMPEG_FONT_PATH 환경변수로 .ttf/.otf 경로를 지정해주세요."
  );
  process.exit(1);
}

// 클립 파일이 다 있는지 먼저 검증
const footageFiles = [];
const missing = [];
for (const clip of script.clips) {
  const padded = String(clip.index).padStart(2, "0");
  const found = ["mp4", "mov"]
    .map((ext) => path.join(footageDir, `${padded}.${ext}`))
    .find((p) => existsSync(p));
  if (found) footageFiles.push(found);
  else missing.push(`${padded}.mp4 (자막: "${clip.caption}")`);
}
if (missing.length) {
  console.error(`${footageDir} 에서 아래 클립을 찾지 못했습니다:\n` + missing.map((m) => `  - ${m}`).join("\n"));
  console.error("script.json의 footage_hint를 참고해서 영상을 준비한 뒤 같은 이름으로 넣어주세요.");
  process.exit(1);
}

const clipPaths = [];
for (let i = 0; i < script.clips.length; i++) {
  const clip = script.clips[i];
  const outClip = path.join(workDir, `clip-${String(i).padStart(2, "0")}.mp4`);

  const vf = [
    "scale=1080:1920:force_original_aspect_ratio=increase",
    "crop=1080:1920",
    captionFilter(clip.caption, captionColor, fontPath),
    ...(brand ? [brandFilter(brand, fontPath)] : []),
  ].join(",");

  const ffArgs = ["-y", "-i", footageFiles[i]];
  if (logoPath) {
    ffArgs.push("-i", logoPath);
    ffArgs.push(
      "-filter_complex",
      `[0:v]${vf}[base];[base][1:v]overlay=48:H-h-48`
    );
  } else {
    ffArgs.push("-vf", vf);
  }
  ffArgs.push("-c:v", "libx264");
  if (args.mute) ffArgs.push("-an");
  else ffArgs.push("-c:a", "aac");
  ffArgs.push(outClip);

  await run("ffmpeg", ffArgs);
  clipPaths.push(outClip);
  console.log(`클립 생성: ${outClip}`);
}

const concatListPath = path.join(workDir, "concat.txt");
await writeFile(concatListPath, clipPaths.map((p) => `file '${path.resolve(p)}'`).join("\n"), "utf8");

const outFile = path.join(baseDir, "short.mp4");
await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", outFile]);
console.log(`최종 영상 완성: ${outFile}`);
console.log("업로드 전 자막 오타/영상 저작권을 다시 한번 확인하세요 (README.md 참고).");

// ---- helpers ----

function captionFilter(text, color, font) {
  const escaped = escapeDrawtext(text || "");
  // 밈 스타일: 굵고 큰 글씨 + 검정 외곽선, 화면 중하단에 배치
  return (
    `drawtext=fontfile='${font}':text='${escaped}':fontcolor=${color}:fontsize=84:` +
    `borderw=8:bordercolor=black:line_spacing=10:` +
    `x=(w-text_w)/2:y=h*0.62-text_h/2`
  );
}

function brandFilter(brand, font) {
  const escaped = escapeDrawtext(brand);
  return (
    `drawtext=fontfile='${font}':text='${escaped}':fontcolor=white:fontsize=32:` +
    `box=1:boxcolor=black@0.5:boxborderw=14:x=48:y=H-text_h-160`
  );
}

async function assertFfmpeg() {
  try {
    await run("ffmpeg", ["-version"]);
  } catch {
    console.error("ffmpeg를 찾을 수 없습니다. https://ffmpeg.org 에서 설치 후 다시 실행하세요.");
    process.exit(1);
  }
}

async function guessFont() {
  const candidates = [
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJKkr-Bold.otf",
    "/usr/share/fonts/truetype/noto/NotoSansCJKkr-Regular.otf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "C:\\Windows\\Fonts\\malgunbd.ttf",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function escapeDrawtext(text) {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/\n/g, "\\n");
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--mute") {
      out.mute = true;
      continue;
    }
    if (argv[i].startsWith("--")) {
      out[argv[i].slice(2)] = argv[i + 1];
      i++;
    }
  }
  return out;
}
