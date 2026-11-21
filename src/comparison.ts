import dataUrl from "./assets/qualitative-comparison.json?url";

/**
 * `npm run frames` exports stills to public/frames/<video_id>/<index>.jpg and
 * `npm run clips` cuts public/videos/<video_id>.mp4 with a public/posters/<video_id>.jpg still.
 */
const ASSET_BASE = import.meta.env.BASE_URL;

interface AnswerOption {
  label: string;
  text: string;
}

interface MethodResult {
  id: string;
  name: string;
  answer: string | null;
  frames: number[];
  /** VideoAgent reports 1-based frame numbers, every other dump is 0-based. */
  frameBase: number;
}

interface Comparison {
  id: string;
  benchmark: string;
  question: string;
  timeReference?: string;
  /** Dump file names the clip is cut from, e.g. ["008100", "009960"]. */
  clipFrameRange?: string[];
  videoId?: string;
  options: AnswerOption[];
  groundtruth: string;
  video?: string;
  methods: MethodResult[];
}

interface CmpUi {
  tabsEl: HTMLElement;
  noteEl: HTMLElement;
  videoEl: HTMLElement;
  sourceEl: HTMLElement;
  questionEl: HTMLElement;
  optionsEl: HTMLElement;
  timeEl: HTMLElement;
  answersEl: HTMLElement;
  stripsEl: HTMLElement;
}

/** Resolving the scaffold up front keeps the render helpers free of null checks. */
function collectUi(rootEl: HTMLElement): CmpUi | null {
  const query = <T extends HTMLElement>(selector: string): T | null => rootEl.querySelector<T>(selector);

  const tabsEl = query<HTMLElement>("#cmp-tabs");
  const noteEl = query<HTMLElement>("#cmp-note");
  const videoEl = query<HTMLElement>("#cmp-video");
  const sourceEl = query<HTMLElement>("#cmp-source");
  const questionEl = query<HTMLElement>("#cmp-question");
  const optionsEl = query<HTMLElement>("#cmp-options");
  const timeEl = query<HTMLElement>("#cmp-time");
  const answersEl = query<HTMLElement>("#cmp-answers");
  const stripsEl = query<HTMLElement>("#cmp-strips");

  if (
    !tabsEl ||
    !noteEl ||
    !videoEl ||
    !sourceEl ||
    !questionEl ||
    !optionsEl ||
    !timeEl ||
    !answersEl ||
    !stripsEl
  ) {
    return null;
  }

  return {
    tabsEl,
    noteEl,
    videoEl,
    sourceEl,
    questionEl,
    optionsEl,
    timeEl,
    answersEl,
    stripsEl,
  };
}

export function initComparison(): void {
  const rootEl = document.querySelector<HTMLElement>("#qualitative-comparison");
  if (!rootEl) return;
  const ui = collectUi(rootEl);
  if (!ui) return;
  void load(ui);
}

async function load(ui: CmpUi): Promise<void> {
  try {
    const response = await fetch(dataUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const examples = normalizeDataset(await response.json());
    if (examples.length === 0) throw new Error("no examples");

    renderTabs(ui, examples);
    ui.noteEl.textContent = `Below is the ground-truth video segment extracted from the longer video.`;
  } catch {
    ui.noteEl.textContent =
      "Could not load the qualitative comparison dataset — run the page through Vite.";
  }
}

function renderTabs(ui: CmpUi, examples: Comparison[]): void {
  ui.tabsEl.replaceChildren();

  examples.forEach((example, index) => {
    const tab = el("button", "cmp-tab");
    tab.type = "button";
    tab.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    if (index === 0) tab.classList.add("is-active");

    const num = el("span", "cmp-tab-num", String(index + 1).padStart(2, "0"));
    const text = el("span", "cmp-tab-text", shortBenchmark(example.benchmark));
    tab.append(num, text);

    tab.addEventListener("click", () => {
      for (const other of ui.tabsEl.querySelectorAll<HTMLButtonElement>(".cmp-tab")) {
        const active = other === tab;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-pressed", active ? "true" : "false");
      }
      renderExample(ui, example);
    });

    ui.tabsEl.append(tab);
  });

  const first = examples[0];
  if (first) renderExample(ui, first);
}

function renderExample(ui: CmpUi, example: Comparison): void {
  ui.sourceEl.textContent = example.benchmark;
  ui.questionEl.textContent = example.question;
  const clipLabel = frameRangeLabel(example.clipFrameRange);
  const meta = [clipLabel ? `Frames ${clipLabel}` : "", example.timeReference ?? ""].filter(Boolean).join(" · ");
  ui.timeEl.textContent = meta;
  ui.timeEl.hidden = meta === "";
  mountVideo(ui.videoEl, example);
  renderOptions(ui.optionsEl, example);
  renderAnswers(ui.answersEl, example);
  renderStrips(ui.stripsEl, example);
}

function renderOptions(host: HTMLElement, example: Comparison): void {
  host.replaceChildren();

  const pickers = new Map<string, string[]>();
  for (const method of example.methods) {
    if (!method.answer) continue;
    const list = pickers.get(method.answer) ?? [];
    list.push(method.name);
    pickers.set(method.answer, list);
  }

  for (const option of example.options) {
    const isTruth = option.label === example.groundtruth;
    const item = el("li", `cmp-option${isTruth ? " is-truth" : ""}`);
    item.append(el("span", "cmp-option-label", option.label), el("span", "cmp-option-text", option.text));

    const marks = el("span", "cmp-option-marks");
    for (const name of pickers.get(option.label) ?? []) {
      const mark = el("span", `cmp-mark${name.includes("ours") ? " is-ours" : ""}`);
      mark.title = name;
      marks.append(mark);
    }
    item.append(marks);
    host.append(item);
  }
}

function renderAnswers(host: HTMLElement, example: Comparison): void {
  host.replaceChildren();

  const truth = el("div", "cmp-truth");
  truth.append(
    el("span", "cmp-truth-label", "Ground truth"),
    el("span", "cmp-truth-value", optionText(example, example.groundtruth)),
  );
  host.append(truth, el("p", "cmp-label", "Method answers"));

  const list = el("ol", "cmp-answer-list");
  for (const method of example.methods) {
    const correct = method.answer === example.groundtruth;
    const ours = isOurs(method);
    const row = el("li", `cmp-answer${ours ? " is-ours" : ""}`);

    const name = el("span", "cmp-answer-name", method.name);
    const verdict = el(
      "span",
      `cmp-verdict ${correct ? "is-right" : "is-wrong"}`,
      correct ? "Correct" : "Wrong",
    );
    const value = el("span", "cmp-answer-value", optionText(example, method.answer));

    row.append(name, verdict, value);
    list.append(row);
  }
  host.append(list);
}

function renderStrips(host: HTMLElement, example: Comparison): void {
  host.replaceChildren();

  for (const method of example.methods) {
    const correct = method.answer === example.groundtruth;
    const row = el("article", `cmp-row${isOurs(method) ? " is-ours" : ""}`);

    const head = el("header", "cmp-row-head");
    head.append(el("h3", "cmp-row-name", method.name));
    head.append(
      el(
        "span",
        `cmp-pill ${correct ? "is-right" : "is-wrong"}`,
        method.answer ? `Picked ${method.answer}` : "No answer",
      ),
    );
    head.append(el("span", "cmp-row-count", `${method.frames.length} frames`));

    const strip = el("ol", "cmp-strip");
    strip.setAttribute("aria-label", `Frames kept by ${method.name}`);
    // Strips read left to right in time.
    const picks = method.frames.map((frame) => frame - method.frameBase).sort((a, b) => a - b);
    for (const index of picks) {
      const cell = el("li", "cmp-frame");
      const hue = Math.round((index * 137.508) % 360);
      cell.style.setProperty("--h", String(hue));
      cell.style.setProperty("--sx", `${24 + ((index * 37) % 56)}%`);
      cell.style.setProperty("--sy", `${18 + ((index * 53) % 62)}%`);
      cell.title = `Frame ${index}`;

      if (example.videoId) {
        const img = el("img", "cmp-frame-img");
        img.src = `${ASSET_BASE}frames/${example.videoId}/${index}.jpg`;
        img.alt = `Frame ${index} kept by ${method.name}`;
        img.loading = "lazy";
        img.decoding = "async";
        img.addEventListener("error", () => img.remove(), { once: true });
        cell.append(img);
      }

      cell.append(el("span", "cmp-frame-idx", String(index)));
      strip.append(cell);
    }

    row.append(head, strip);
    host.append(row);
  }
}

function mountVideo(host: HTMLElement, example: Comparison): void {
  const src = example.video ? `${ASSET_BASE}${example.video}` : "";
  if (!src) {
    showVideoPlaceholder(host, example);
    return;
  }

  const video = el("video", "cmp-video-el");
  video.controls = true;
  video.preload = "metadata";
  video.playsInline = true;
  if (example.videoId) video.poster = `${ASSET_BASE}posters/${example.videoId}.jpg`;
  video.addEventListener("loadedmetadata", () => {
    if (video.videoWidth > 0 && video.videoHeight > 0) {
      host.style.setProperty("--cmp-ar", `${video.videoWidth} / ${video.videoHeight}`);
    }
  });
  video.src = src;
  video.addEventListener("error", () => showVideoPlaceholder(host, example), { once: true });
  host.classList.remove("is-empty");
  host.replaceChildren(video);
}

function showVideoPlaceholder(host: HTMLElement, example: Comparison): void {
  host.classList.add("is-empty");
  host.replaceChildren(videoPlaceholder(example));
}

function videoPlaceholder(example: Comparison): HTMLElement {
  const wrap = el("div", "cmp-video-empty");
  wrap.append(
    el("span", "cmp-video-icon", "▶"),
    el(
      "span",
      "cmp-video-text",
      frameRangeLabel(example.clipFrameRange)
        ? `Clip frames ${frameRangeLabel(example.clipFrameRange)} of ${example.timeReference ?? "the source"}`
        : example.timeReference
          ? `Clip ${example.timeReference}`
          : "Clip not bundled",
    ),
    el("code", "", example.video ? `public/${example.video}` : `public/videos/${example.videoId ?? example.id}.mp4`),
  );
  return wrap;
}

function optionText(example: Comparison, label: string | null): string {
  if (!label) return "—";
  const option = example.options.find((item) => item.label === label);
  return option ? `${option.label}. ${option.text}` : label;
}

function shortBenchmark(benchmark: string): string {
  const tail = benchmark.split("·").pop() ?? benchmark;
  return tail.trim();
}

function isOurs(method: MethodResult): boolean {
  return method.id === "ours";
}

function normalizeDataset(raw: unknown): Comparison[] {
  if (!isRecord(raw)) return [];
  const rows = raw["examples"];
  if (!Array.isArray(rows)) return [];

  const examples: Comparison[] = [];
  for (const row of rows) {
    if (!isRecord(row)) continue;
    const id = typeof row["id"] === "string" ? row["id"] : "";
    const question = typeof row["question"] === "string" ? row["question"] : "";
    const groundtruth = typeof row["groundtruth"] === "string" ? row["groundtruth"] : "";
    if (!id || !question || !groundtruth) continue;

    examples.push({
      id,
      benchmark: typeof row["benchmark"] === "string" ? row["benchmark"] : "HMBench-2K",
      question,
      timeReference: typeof row["time_reference"] === "string" ? row["time_reference"] : undefined,
      clipFrameRange: normalizeFrameRange(row["clip_frame_range"]),
      videoId: typeof row["video_id"] === "string" ? row["video_id"] : undefined,
      options: normalizeOptions(row["options"]),
      groundtruth,
      video: typeof row["video"] === "string" ? row["video"] : undefined,
      methods: normalizeMethods(row["methods"]),
    });
  }
  return examples;
}

function normalizeFrameRange(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw) || raw.length !== 2) return undefined;
  const [from, to] = raw;
  if (typeof from !== "string" || typeof to !== "string") return undefined;
  return [from, to];
}

function frameRangeLabel(range: string[] | undefined): string {
  return range ? `${range[0]}–${range[1]}` : "";
}

function normalizeOptions(raw: unknown): AnswerOption[] {
  if (!Array.isArray(raw)) return [];
  const options: AnswerOption[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const label = typeof row["label"] === "string" ? row["label"] : "";
    const text = typeof row["text"] === "string" ? row["text"] : "";
    if (label) options.push({ label, text });
  }
  return options;
}

function normalizeMethods(raw: unknown): MethodResult[] {
  if (!Array.isArray(raw)) return [];
  const methods: MethodResult[] = [];
  for (const row of raw) {
    if (!isRecord(row)) continue;
    const id = typeof row["id"] === "string" ? row["id"] : "";
    const name = typeof row["name"] === "string" ? row["name"] : id;
    if (!id) continue;

    const answer = row["answer"];
    const base = row["frame_base"];
    const frames = Array.isArray(row["frames"])
      ? row["frames"].filter((value): value is number => typeof value === "number")
      : [];

    methods.push({
      id,
      name,
      answer: typeof answer === "string" ? answer : null,
      frames,
      frameBase: typeof base === "number" ? base : 0,
    });
  }
  return methods;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
