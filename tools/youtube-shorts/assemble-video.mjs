#!/usr/bin/env node
// audio-manifest.json(대사별 wav + 자막)을 세로형(1080x1920) 쇼츠 영상으로 합칩니다.
// ffmpeg가 로컬에 설치되어 있어야 합니다 (https://ffmpeg.org).
//
// 기본 배경은 저작권 문제 없는 그라데이션 색상 + 큰 자막입니다.
// 더 퀄리티를 높이고 싶으면 --backgrounds <폴더> 옵션으로 세그먼트 수만큼의
// mp4/png 파일(00.mp4, 01.mp4, ...)을 직접 넣어 배경으로 쓸 수 있습니다.
// (저작권 프리 소스: Pexels, Pixabay, Coverr 등. 라이선스 꼭 확인하세요.)
//
// 사용법: node assemble-video.mjs --manifest output/2026-08-31-xxx/audio-manifest.json

import { readFile, mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

const args = parseArgs(process.argv.slice(2));
if (!args.manifest) {
  console.error("사용법: node assemble-video.mjs --manifest <audio-manifest.json 경로> [--backgrounds <폴더>]");
  process.exit(1);
}

await assertFfmpeg();

const manifestPath = path.resolve(args.manifest);
const baseDir = path.dirname(manifestPath);
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const fontPath = process.env.FFMPEG_FONT_PATH || (await guessFont());
if (!fontPath) {
  console.error(
    "일본어를 표시할 폰트를 찾지 못했습니다. Noto Sans JP 등을 설치한 뒤\n" +
      "FFMPEG_FONT_PATH 환경변수로 .ttf/.otf 경로를 지정해주세요."
  );
  process.exit(1);
}

const workDir = path.join(baseDir, "video-work");
await mkdir(workDir, { recursive: true });

// 세그먼트마다 색상을 바꿔가며 리듬감을 줌 (저작권 없는 기본 배경)
const palette = ["#2b2118", "#5c4632", "#a67c52", "#c0653f", "#3a3a3a", "#1f2937"];

const clipPaths = [];
for (let i = 0; i < manifest.length; i++) {
  const seg = manifest[i];
  const audioPath = path.join(baseDir, seg.audio);
  const bgOverride = args.backgrounds
    ? findBackground(args.backgrounds, i)
    : null;
  const clipPath = path.join(workDir, `${seg.id}.mp4`);

  const text = escapeDrawtext(seg.onscreen_text || "");
  const drawtext =
    `drawtext=fontfile='${fontPath}':text='${text}':fontcolor=white:fontsize=72:` +
    `line_spacing=12:box=1:boxcolor=black@0.45:boxborderw=24:x=(w-text_w)/2:y=(h-text_h)/2`;

  if (bgOverride) {
    await run("ffmpeg", [
      "-y",
      "-stream_loop", "-1",
      "-i", bgOverride,
      "-i", audioPath,
      "-vf", `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,${drawtext}`,
      "-c:v", "libx264", "-c:a", "aac",
      "-shortest",
      clipPath,
    ]);
  } else {
    const color = palette[i % palette.length].replace("#", "0x");
    await run("ffmpeg", [
      "-y",
      "-f", "lavfi",
      "-i", `color=c=${color}:s=1080x1920:d=${Math.max(seg.duration_sec, 0.5)}`,
      "-i", audioPath,
      "-vf", drawtext,
      "-c:v", "libx264", "-c:a", "aac",
      "-shortest",
      clipPath,
    ]);
  }
  clipPaths.push(clipPath);
  console.log(`클립 생성: ${clipPath}`);
}

const concatListPath = path.join(workDir, "concat.txt");
await writeFile(concatListPath, clipPaths.map((p) => `file '${path.resolve(p)}'`).join("\n"), "utf8");

const outFile = path.join(baseDir, "short.mp4");
await run("ffmpeg", ["-y", "-f", "concat", "-safe", "0", "-i", concatListPath, "-c", "copy", outFile]);
console.log(`최종 영상 완성: ${outFile}`);
console.log("업로드 전에 반드시 자막/구성을 검수하고, docs/AUTOMATION-GUIDE.md 3-2절의 정책 유의사항을 확인하세요.");

// ---- helpers ----

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
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/truetype/noto/NotoSansCJKjp-Regular.otf",
    "/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc",
    "C:\\Windows\\Fonts\\meiryo.ttc",
  ];
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

function findBackground(dir, index) {
  const padded = String(index).padStart(2, "0");
  for (const ext of ["mp4", "mov", "png", "jpg"]) {
    const p = path.join(dir, `${padded}.${ext}`);
    if (existsSync(p)) return p;
  }
  return null;
}

function escapeDrawtext(text) {
  return text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");
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
