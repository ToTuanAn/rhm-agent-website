/**
 * Exports the stills referenced by src/assets/qualitative-comparison.json into
 * public/frames/<video_id>/<index>.jpg so the comparison section can load them
 * with a predictable URL.
 *
 * Frame ids in the dataset are 0-based indices into the sorted file listing of
 * data/<frame_source>/<video_id>/ — data/quant by default, or the example's own
 * dump folder (e.g. `frame_source: "marine"` → data/marine). VideoAgent ships
 * 1-based ids, flagged by frame_base. Only the few hundred referenced frames are
 * copied — the dumps themselves stay out of the build.
 *
 * Usage: npm run frames
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "src", "assets", "qualitative-comparison.json");
const DATA_ROOT = join(ROOT, "data");
const DEFAULT_SOURCE = "quant";
const OUT_ROOT = join(ROOT, "public", "frames");
const MAX_WIDTH = 360;
const FFMPEG = "ffmpeg";

/** Dump folder of one example: data/<frame_source>/<video_id>/. */
function sourceDir(example) {
  const root =
    typeof example.frame_source === "string"
      ? example.frame_source
      : DEFAULT_SOURCE;
  return join(DATA_ROOT, root, example.video_id);
}

function frameFiles(dir) {
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".jpg"))
    .sort();
}

function encode(source, target) {
  execFileSync(
    FFMPEG,
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      source,
      "-vf",
      `scale='min(${MAX_WIDTH},iw)':-2`,
      "-q:v",
      "3",
      target,
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
}

const dataset = JSON.parse(readFileSync(DATASET, "utf8"));
const examples = Array.isArray(dataset.examples) ? dataset.examples : [];

let written = 0;
let skipped = 0;

for (const example of examples) {
  const videoId = example.video_id;
  if (!videoId) {
    console.warn(`· ${example.id}: no video_id, skipped`);
    continue;
  }

  const dir = sourceDir(example);
  const files = frameFiles(dir);
  if (!files || files.length === 0) {
    console.warn(`· ${example.id}: no frames under ${relative(ROOT, dir)}`);
    continue;
  }

  const outDir = join(OUT_ROOT, videoId);
  mkdirSync(outDir, { recursive: true });

  for (const method of example.methods ?? []) {
    const base = Number(method.frame_base ?? 0);
    for (const frame of method.frames ?? []) {
      const index = Number(frame) - base;
      const source = files[index];
      if (!source) {
        console.warn(
          `· ${example.id}/${method.id}: frame ${frame} out of range (${files.length})`,
        );
        skipped += 1;
        continue;
      }
      encode(join(dir, source), join(outDir, `${index}.jpg`));
      written += 1;
    }
  }

  console.log(`· ${example.id}: ${videoId} (${files.length} frames available)`);
}

console.log(
  `\nExported ${written} stills to public/frames${skipped ? `, ${skipped} out of range` : ""}.`,
);
