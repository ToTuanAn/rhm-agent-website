/**
 * Cuts one clip per qualitative-comparison example out of the fps=1 frame dumps
 * in data/<frame_source>/<video_id>/ (data/quant by default) and writes
 * public/videos/<video_id>.mp4 plus the matching first-frame poster in
 * public/posters/<video_id>.jpg.
 *
 * The dumps sample the whole source video at 1 fps, so frame index == second.
 * `time_reference` therefore picks the [start, end] second range directly, and
 * an example may narrow the cut with `clip_reference` or address the dump
 * literally with `clip_frame_range: ["008100", "009960"]`; the driving example
 * sets `clip_frames: "all"` because its reference window is only two seconds
 * long. An example may also narrow the encode width with `clip_width` — the
 * whole-video Marine examples use 480 px to keep ~20 minute clips small.
 *
 * Usage: npm run clips
 */
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  existsSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = join(ROOT, "data", "qualitative-comparison.json");
const DATA_ROOT = join(ROOT, "data");
const DEFAULT_SOURCE = "quant";
const OUT_ROOT = join(ROOT, "public", "videos");
const POSTER_ROOT = join(ROOT, "public", "posters");

/** Seconds per source frame in the dumps. */
const FRAME_SECONDS = 1;
/** Playback frame rate of the encoded clip; frames are duplicated to reach it. */
const OUTPUT_FPS = 25;
const SCALE_WIDTH = 640;

/** Dump folder of one example: data/<frame_source>/<video_id>/. */
function sourceDir(example) {
  const root =
    typeof example.frame_source === "string"
      ? example.frame_source
      : DEFAULT_SOURCE;
  return join(DATA_ROOT, root, example.video_id);
}

/** Even width so the source is always encodable as yuv420p. */
function scaleFilter(width) {
  return `scale='2*trunc(min(${width},iw)/2)':-2:flags=lanczos,setsar=1`;
}

function frameFiles(dir) {
  if (!existsSync(dir)) return null;
  return readdirSync(dir)
    .filter((name) => name.toLowerCase().endsWith(".jpg"))
    .sort();
}

function parseClock(value) {
  return value
    .split(":")
    .map((part) => Number.parseInt(part, 10))
    .reduce((total, part) => total * 60 + part, 0);
}

function parseWindow(reference) {
  if (typeof reference !== "string") return null;
  const [rawStart, rawEnd] = reference.split("-");
  if (!rawStart || !rawEnd) return null;
  const start = parseClock(rawStart.trim());
  const end = parseClock(rawEnd.trim());
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start)
    return null;
  return { start, end };
}

/** `clip_reference` narrows the exported clip; `time_reference` stays the dataset's window. */
function clipWindow(example) {
  return (
    parseWindow(example.clip_reference) ?? parseWindow(example.time_reference)
  );
}

/** Position of a dump file named by its numeric stem, e.g. "008100". */
function frameIndex(files, name) {
  const stem = Number.parseInt(String(name).replace(/\D/g, ""), 10);
  if (!Number.isFinite(stem)) return -1;
  return files.findIndex(
    (file) => Number.parseInt(file.name.replace(/\D/g, ""), 10) === stem,
  );
}

function clipRange(example, files) {
  const explicit = example.clip_frame_range;
  if (Array.isArray(explicit) && explicit.length === 2) {
    const from = frameIndex(files, explicit[0]);
    const to = frameIndex(files, explicit[1]);
    if (from >= 0 && to >= from) return { from, to };
    console.warn(
      `· ${example.id}: clip_frame_range ${explicit.join("–")} not found, falling back`,
    );
  }

  if (example.clip_frames === "all") return { from: 0, to: files.length - 1 };

  const window = clipWindow(example);
  if (!window) return { from: 0, to: files.length - 1 };

  const from = Math.floor(window.start / FRAME_SECONDS);
  const to = Math.min(Math.ceil(window.end / FRAME_SECONDS), files.length - 1);
  return { from, to };
}

/** ffmpeg wants consecutive image names, the dumps are sparse, so link a sequence. */
function stageSequence(files, from, to, stage) {
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });

  for (let index = from; index <= to; index += 1) {
    const source = files[index];
    if (!source) break;
    symlinkSync(
      join(source.folder, source.name),
      join(stage, `${String(index - from).padStart(6, "0")}.jpg`),
    );
  }
}

const dataset = JSON.parse(readFileSync(DATASET, "utf8"));
const examples = Array.isArray(dataset.examples) ? dataset.examples : [];
mkdirSync(OUT_ROOT, { recursive: true });
mkdirSync(POSTER_ROOT, { recursive: true });

for (const example of examples) {
  const videoId = example.video_id;
  if (!videoId) {
    console.warn(`· ${example.id}: no video_id, skipped`);
    continue;
  }

  const dir = sourceDir(example);
  const names = frameFiles(dir);
  if (!names || names.length === 0) {
    console.warn(`· ${example.id}: no frames under ${relative(ROOT, dir)}`);
    continue;
  }

  const files = names.map((name) => ({ folder: dir, name }));
  const filter = scaleFilter(Number(example.clip_width) || SCALE_WIDTH);
  const { from, to } = clipRange(example, files);
  if (to < from) {
    console.warn(`· ${example.id}: empty range ${from}..${to}`);
    continue;
  }

  const stage = join(tmpdir(), `rhm-clip-${videoId}`);
  stageSequence(files, from, to, stage);

  const target = join(OUT_ROOT, `${videoId}.mp4`);
  execFileSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-framerate",
      String(1 / FRAME_SECONDS),
      "-i",
      join(stage, "%06d.jpg"),
      "-vf",
      filter,
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "28",
      "-pix_fmt",
      "yuv420p",
      "-profile:v",
      "main",
      "-level",
      "4.0",
      "-r",
      String(OUTPUT_FPS),
      "-movflags",
      "+faststart",
      "-an",
      target,
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  execFileSync(
    "ffmpeg",
    [
      "-loglevel",
      "error",
      "-y",
      "-i",
      join(stage, "000000.jpg"),
      "-vf",
      filter,
      "-q:v",
      "4",
      "-frames:v",
      "1",
      join(POSTER_ROOT, `${videoId}.jpg`),
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );

  rmSync(stage, { recursive: true, force: true });

  const seconds = to - from + 1;
  const window = example.clip_reference ?? example.time_reference;
  const source = Array.isArray(example.clip_frame_range)
    ? `files ${example.clip_frame_range.join("–")}`
    : example.clip_frames === "all"
      ? "whole video"
      : window
        ? `${window}${example.clip_reference ? ` inside ${example.time_reference}` : ""}`
        : "whole dump (no time reference)";
  console.log(
    `· ${example.id}: frames ${from}–${to} (${seconds}s, ${source}) -> public/videos/${videoId}.mp4`,
  );
}
