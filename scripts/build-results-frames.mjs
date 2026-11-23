/**
 * Exports the stills referenced by src/assets/correct_examples.json (the Results
 * memory-tree traces) into public/frames/<video_id>/<image_id>.jpg.
 *
 * image_id is a 0-based index into the sorted image listing of
 * data/output_folder/<video_id>/ — the dump folder names are timestamped or
 * frame-numbered, so the index is what ties a memory-tree node to its frame.
 *
 * Usage: npm run frames:results
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "src", "assets", "correct_examples.json");
const SOURCE_ROOT = join(ROOT, "data", "output_folder");
const OUT_ROOT = join(ROOT, "public", "frames");
const MAX_WIDTH = 360;
const FFMPEG = "ffmpeg";

const IMAGE_RE = /\.(?:jpe?g|png|webp)$/i;

/** Frame ids referenced by the tree nodes and the final-K selection. */
function frameIds(example) {
  const ids = new Set();
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (typeof node.image_id === "number" && node.image_id >= 0) ids.add(node.image_id);
    const children = node.childern ?? node.children;
    if (Array.isArray(children)) children.forEach(walk);
  };
  walk(example.viz_format);
  if (Array.isArray(example.final_k_image)) {
    for (const id of example.final_k_image) {
      if (typeof id === "number" && id >= 0) ids.add(id);
    }
  }
  return [...ids].sort((a, b) => a - b);
}

function frameFiles(dir) {
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((name) => IMAGE_RE.test(name))
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
const examples = Array.isArray(dataset.data) ? dataset.data : [];

let written = 0;
let skipped = 0;
let missing = 0;

for (const example of examples) {
  const videoId = example.video_id;
  if (typeof videoId !== "string" || !videoId) {
    console.warn(`· ${example.question_idx}: no video_id, skipped`);
    continue;
  }

  const dir = join(SOURCE_ROOT, videoId);
  const files = frameFiles(dir);
  if (!files || files.length === 0) {
    console.warn(`· ${example.question_idx}: no frames under ${relative(ROOT, dir)}`);
    missing += 1;
    continue;
  }

  const outDir = join(OUT_ROOT, videoId);
  mkdirSync(outDir, { recursive: true });

  for (const id of frameIds(example)) {
    const source = files[id];
    if (!source) {
      console.warn(
        `· ${example.question_idx}: image_id ${id} out of range (${files.length} frames)`,
      );
      missing += 1;
      continue;
    }
    const target = join(outDir, `${id}.jpg`);
    if (existsSync(target)) {
      skipped += 1;
      continue;
    }
    encode(join(dir, source), target);
    written += 1;
  }
}

console.log(
  `\nExported ${written} results stills to public/frames` +
    `${skipped ? `, ${skipped} already present` : ""}${missing ? `, ${missing} unavailable` : ""}.`,
);
