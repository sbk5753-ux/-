#!/usr/bin/env node
// script.json의 각 대사를 VOICEVOX(무료 오픈소스 일본어 TTS)로 음성 변환합니다.
//
// 사전 준비: https://voicevox.hiroshiba.jp 에서 앱을 다운로드해 실행해두세요.
// 앱을 실행하면 로컬에 http://127.0.0.1:50021 API 서버가 자동으로 뜹니다.
//
// 사용법: node tts-voicevox.mjs --script output/2026-08-31-xxx/script.json

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

await loadEnv();

const args = parseArgs(process.argv.slice(2));
if (!args.script) {
  console.error("사용법: node tts-voicevox.mjs --script <script.json 경로>");
  process.exit(1);
}

const ENDPOINT = process.env.VOICEVOX_ENDPOINT || "http://127.0.0.1:50021";
const SPEAKER = process.env.VOICEVOX_SPEAKER_ID || "3";

const scriptPath = path.resolve(args.script);
const script = JSON.parse(await readFile(scriptPath, "utf8"));
const outDir = path.join(path.dirname(scriptPath), "audio");
await mkdir(outDir, { recursive: true });

// hook -> 각 랭킹 항목(높은 번호=먼저 나오는 순서로 정렬) -> outro
const segments = [
  { id: "00-hook", text: script.hook, onscreen_text: script.hook },
  ...[...script.items]
    .sort((a, b) => b.rank - a.rank)
    .map((item, i) => ({
      id: `${String(i + 1).padStart(2, "0")}-rank${item.rank}`,
      text: item.narration,
      onscreen_text: item.onscreen_text,
    })),
  { id: `${String(script.items.length + 1).padStart(2, "0")}-outro`, text: script.outro.narration, onscreen_text: script.outro.onscreen_text },
];

const manifest = [];
for (const seg of segments) {
  console.log(`합성 중: ${seg.id} - "${seg.text.slice(0, 20)}..."`);
  const wavBuf = await synthesize(seg.text);
  const wavPath = path.join(outDir, `${seg.id}.wav`);
  await writeFile(wavPath, wavBuf);
  manifest.push({
    id: seg.id,
    text: seg.text,
    onscreen_text: seg.onscreen_text,
    audio: path.relative(path.dirname(scriptPath), wavPath),
    duration_sec: wavDurationSeconds(wavBuf),
  });
}

const manifestPath = path.join(path.dirname(scriptPath), "audio-manifest.json");
await writeFile(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
console.log(`음성 합성 완료: ${manifestPath}`);
console.log(`다음 단계: node assemble-video.mjs --manifest ${manifestPath}`);

// ---- helpers ----

async function synthesize(text) {
  const queryUrl = new URL(`${ENDPOINT}/audio_query`);
  queryUrl.searchParams.set("text", text);
  queryUrl.searchParams.set("speaker", SPEAKER);
  const queryRes = await fetch(queryUrl, { method: "POST" });
  if (!queryRes.ok) {
    throw new Error(
      `VOICEVOX audio_query 실패 (${queryRes.status}). VOICEVOX 앱이 실행 중인지, ` +
        `.env의 VOICEVOX_ENDPOINT가 맞는지 확인하세요.`
    );
  }
  const query = await queryRes.json();

  const synthUrl = new URL(`${ENDPOINT}/synthesis`);
  synthUrl.searchParams.set("speaker", SPEAKER);
  const synthRes = await fetch(synthUrl, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`VOICEVOX synthesis 실패 (${synthRes.status})`);
  return Buffer.from(await synthRes.arrayBuffer());
}

// WAV(PCM) 헤더를 직접 파싱해서 길이(초)를 계산 (ffprobe 없이도 동작)
function wavDurationSeconds(buf) {
  const byteRate = buf.readUInt32LE(28);
  const dataSize = buf.readUInt32LE(40);
  if (!byteRate) return 0;
  return dataSize / byteRate;
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
