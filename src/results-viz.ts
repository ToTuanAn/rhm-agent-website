import datasetUrl from "./assets/correct_examples.json?url";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Cards per benchmark tab. Every tab has ten verified-correct traces, so the pad stays dormant. */
const EXAMPLES_PER_TAB = 10;

const CARD_W = 176;
const CARD_H = 54;
const COL_GAP = 44;
const ROW_GAP = 12;
const COL_W = CARD_W + COL_GAP;
const ROW_H = CARD_H + ROW_GAP;

const SOURCE_META: Record<string, { label: string; match: (source: string) => boolean }> = {
  lvbench: { label: "LVBench", match: (source) => source === "lvbench_test" },
  egoschema: { label: "EgoSchema", match: (source) => source === "egoschema" },
  ego4d: { label: "Ego4D", match: (source) => source === "ego4d_test" },
  hmbench: { label: "HMBench", match: (source) => source.startsWith("hm_") },
};

interface TreeNode {
  key: string;
  imageId: number;
  response: string;
  active: boolean;
  isLeaf: boolean;
  depth: number;
  children: TreeNode[];
}

interface Example {
  idx: string;
  question: string;
  source: string;
  groundtruth: string;
  finalK: number[];
  modelAnswer: string;
  modelDerived: boolean;
  root: TreeNode;
}

interface Position {
  x: number;
  y: number;
}

interface Layout {
  positions: Map<TreeNode, Position>;
  width: number;
  height: number;
}

interface View {
  example: Example;
  nodes: TreeNode[];
  cards: Map<TreeNode, HTMLButtonElement>;
  positions: Map<TreeNode, Position>;
  width: number;
  height: number;
  canvas: HTMLElement;
  scaler: HTMLElement;
  zoom: number;
  fit: boolean;
  selected: TreeNode | null;
}

type NodeKind = "root" | "answer" | "expand" | "prune" | "reason" | "idle";

interface ResponsePart {
  label: string;
  text: string;
  kind: "reason" | "answer" | "info" | "raw";
}

interface VizUi {
  tabs: HTMLButtonElement[];
  chipsEl: HTMLElement;
  noteEl: HTMLElement;
  viewportEl: HTMLElement;
  inspectorEl: HTMLElement;
  panelEl: HTMLElement;
  zoomInBtn: HTMLButtonElement;
  zoomOutBtn: HTMLButtonElement;
  zoomFitBtn: HTMLButtonElement;
  zoomLevelEl: HTMLElement;
  focusBtn: HTMLButtonElement;
}

/** Resolving the scaffold up front keeps the hoisted render helpers free of null checks. */
function collectUi(rootEl: HTMLElement): VizUi | null {
  const tabs = Array.from(rootEl.querySelectorAll<HTMLButtonElement>(".memviz-tab"));
  const query = <T extends HTMLElement>(selector: string): T | null =>
    rootEl.querySelector<T>(selector);

  const chipsEl = query<HTMLElement>("#memviz-chips");
  const noteEl = query<HTMLElement>("#memviz-note");
  const viewportEl = query<HTMLElement>("#memviz-viewport");
  const inspectorEl = query<HTMLElement>("#memviz-inspector");
  const panelEl = query<HTMLElement>("#memviz-panel");
  const zoomInBtn = query<HTMLButtonElement>("#memviz-zoom-in");
  const zoomOutBtn = query<HTMLButtonElement>("#memviz-zoom-out");
  const zoomFitBtn = query<HTMLButtonElement>("#memviz-zoom-fit");
  const zoomLevelEl = query<HTMLElement>("#memviz-zoom-level");
  const focusBtn = query<HTMLButtonElement>("#memviz-topk-toggle");

  if (
    !chipsEl ||
    !noteEl ||
    !viewportEl ||
    !inspectorEl ||
    !panelEl ||
    !zoomInBtn ||
    !zoomOutBtn ||
    !zoomFitBtn ||
    !zoomLevelEl ||
    !focusBtn ||
    tabs.length === 0
  ) {
    return null;
  }

  return {
    tabs,
    chipsEl,
    noteEl,
    viewportEl,
    inspectorEl,
    panelEl,
    zoomInBtn,
    zoomOutBtn,
    zoomFitBtn,
    zoomLevelEl,
    focusBtn,
  };
}

export function initResultsViz(): void {
  const rootEl = document.querySelector<HTMLElement>("#memory-viz");
  if (!rootEl) return;

  const ui = collectUi(rootEl);
  if (!ui) return;

  const {
    tabs,
    chipsEl,
    noteEl,
    viewportEl,
    inspectorEl,
    panelEl,
    zoomInBtn,
    zoomOutBtn,
    zoomFitBtn,
    zoomLevelEl,
    focusBtn,
  } = ui;

  let all: Example[] = [];
  const lists: Example[][] = [];
  const selected = new Map<number, number>();
  let activeTab = 0;
  let view: View | null = null;
  let focusOnly = false;

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => renderTab(index));
    tab.setAttribute("aria-pressed", String(index === 0));
  });

  zoomInBtn.addEventListener("click", () => {
    if (view) applyZoom(view.zoom + 0.1, false);
  });
  zoomOutBtn.addEventListener("click", () => {
    if (view) applyZoom(view.zoom - 0.1, false);
  });
  zoomFitBtn.addEventListener("click", () => {
    if (view) applyZoom(fitScale(), true);
  });
  focusBtn.addEventListener("click", () => {
    focusOnly = !focusOnly;
    focusBtn.setAttribute("aria-pressed", String(focusOnly));
    view?.canvas.classList.toggle("is-focus", focusOnly);
  });

  const observer = new ResizeObserver(() => {
    if (!view || !view.fit) return;
    const next = fitScale();
    if (Math.abs(next - view.zoom) > 0.001) applyZoom(next, true);
  });
  observer.observe(viewportEl);

  void load();

  async function load(): Promise<void> {
    try {
      const response = await fetch(datasetUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = normalizeDataset((await response.json()) as unknown);
      if (parsed.length === 0) throw new Error("No traces found");
      all = parsed;
      const tabKeys = tabs.map((tab) => tab.dataset.source ?? "");
      tabKeys.forEach((key, index) => {
        lists[index] = examplesFor(key, all, index);
      });
      renderTab(0);
    } catch {
      noteEl.textContent =
        "The memory-tree sample could not be loaded. Serve the page through Vite (npm run dev) so the JSON asset is available.";
      viewportEl.replaceChildren(el("p", "memviz-empty", "Trace data unavailable."));
    }
  }

  function renderTab(index: number): void {
    activeTab = index;
    tabs.forEach((tab, i) => {
      const on = i === index;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-pressed", String(on));
    });

    const list = lists[index] ?? [];
    if (list.length === 0) {
      noteEl.textContent = "No traces are available for this benchmark yet.";
      chipsEl.replaceChildren();
      viewportEl.replaceChildren(el("p", "memviz-empty", "No traces available."));
      panelEl.replaceChildren();
      return;
    }

    const pick = Math.min(selected.get(index) ?? 0, list.length - 1);
    selected.set(index, pick);
    renderChips(list, pick);
    updateNote(index);
    const example = list[pick];
    if (example) renderExample(example);
  }

  function updateNote(index: number): void {
    const key = tabs[index]?.dataset.source ?? "";
    const meta = SOURCE_META[key];
    const label = meta?.label ?? "benchmark";
    const own = meta ? all.filter((item) => meta.match(item.source)).length : 0;
    const reuse =
      own >= EXAMPLES_PER_TAB
        ? `${EXAMPLES_PER_TAB} verified-correct ${label} traces from the released sample.`
        : `${own} verified-correct ${label} trace${own === 1 ? "" : "s"} in the released sample; the remaining cards replay traces from other benchmarks.`;
    noteEl.textContent = `${reuse} Final-K frames are outlined in gold, click any node to read its policy response.`;
  }

  function renderChips(list: Example[], active: number): void {
    const buttons = list.map((example, index) => {
      const button = el("button", "memviz-chip");
      button.type = "button";
      button.classList.toggle("is-active", index === active);
      button.setAttribute("aria-pressed", String(index === active));
      button.title = collapse(example.question);

      const source = el("span", "chip-src", sourceLabel(example.source));
      button.append(
        el("span", "chip-num", String(index + 1).padStart(2, "0")),
        el("span", "chip-text", chipLabel(example)),
        source,
      );

      button.addEventListener("click", () => {
        selected.set(activeTab, index);
        buttons.forEach((other, i) => {
          other.classList.toggle("is-active", i === index);
          other.setAttribute("aria-pressed", String(i === index));
        });
        renderExample(example);
      });
      return button;
    });
    chipsEl.replaceChildren(...buttons);
  }

  function renderExample(example: Example): void {
    const topk = new Map<number, number>();
    example.finalK.forEach((imageId, index) => {
      if (!topk.has(imageId)) topk.set(imageId, index + 1);
    });

    const nodes = flattenTree(example.root);
    const layout = layoutTree(example.root);
    const cards = new Map<TreeNode, HTMLButtonElement>();

    const canvas = el("div", "mn-canvas");
    canvas.style.width = `${layout.width}px`;
    canvas.style.height = `${layout.height}px`;
    canvas.classList.toggle("is-focus", focusOnly);

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "mn-edges");
    svg.setAttribute("width", String(layout.width));
    svg.setAttribute("height", String(layout.height));
    svg.setAttribute("aria-hidden", "true");

    for (const node of nodes) {
      const parentPos = layout.positions.get(node);
      if (!parentPos) continue;
      for (const child of node.children) {
        const childPos = layout.positions.get(child);
        if (!childPos) continue;
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", connector(parentPos, childPos));
        path.setAttribute("class", `mn-edge${child.active ? "" : " is-pruned"}`);
        svg.append(path);
      }
    }
    canvas.append(svg);

    for (const node of nodes) {
      const position = layout.positions.get(node);
      if (!position) continue;
      const card = createNodeCard(node, position, topk, example);
      card.addEventListener("click", () => selectNode(node, true));
      cards.set(node, card);
      canvas.append(card);
    }

    const scaler = el("div", "mn-scaler");
    scaler.append(canvas);
    viewportEl.replaceChildren(scaler);

    view = {
      example,
      nodes,
      cards,
      positions: layout.positions,
      width: layout.width,
      height: layout.height,
      canvas,
      scaler,
      zoom: 1,
      fit: true,
      selected: null,
    };

    renderPanel(example);
    applyZoom(fitScale(), true);

    const auto =
      nodes.find((node) => node.imageId !== -1 && topk.has(node.imageId) && node.response) ??
      nodes.find((node) => node.imageId !== -1);
    if (auto) selectNode(auto, false);
    else renderInspector(null);
  }

  function layoutTree(rootNode: TreeNode): Layout {
    const positions = new Map<TreeNode, Position>();
    let row = 0;
    let maxDepth = 0;

    const place = (node: TreeNode, depth: number): Position => {
      maxDepth = Math.max(maxDepth, depth);
      let y: number;
      if (node.children.length === 0) {
        y = row * ROW_H;
        row += 1;
      } else {
        const placed = node.children.map((child) => place(child, depth + 1));
        const first = placed[0];
        const last = placed[placed.length - 1];
        y = first && last ? (first.y + last.y) / 2 : 0;
      }
      const position = { x: depth * COL_W, y };
      positions.set(node, position);
      return position;
    };

    place(rootNode, 0);

    return {
      positions,
      width: (maxDepth + 1) * COL_W - COL_GAP,
      height: Math.max(row * ROW_H - ROW_GAP, CARD_H),
    };
  }

  function createNodeCard(
    node: TreeNode,
    position: Position,
    topk: Map<number, number>,
    example: Example,
  ): HTMLButtonElement {
    const card = el("button", "mn-card");
    card.type = "button";
    card.style.left = `${position.x}px`;
    card.style.top = `${position.y}px`;
    card.setAttribute("aria-pressed", "false");
    card.dataset.kind = nodeKind(node);

    if (node.imageId === -1) {
      card.classList.add("is-root");
      const body = el("span", "mn-body");
      body.append(
        el("span", "mn-id", "Root"),
        el("span", "mn-preview", `${example.root.children.length} branches`),
      );
      card.append(el("span", "mn-root-mark", "◈"), body);
      card.setAttribute(
        "aria-label",
        `Root of the memory tree with ${example.root.children.length} branches`,
      );
      return card;
    }

    if (!node.active) card.classList.add("is-pruned");
    const rank = topk.get(node.imageId);
    if (rank) card.classList.add("is-topk");

    const thumb = createThumb(node.imageId);
    if (rank) thumb.append(el("span", "mn-thumb-rank", `K${rank}`));

    const body = el("span", "mn-body");
    body.append(
      el("span", "mn-id", `Frame ${node.imageId}`),
      el("span", "mn-preview", previewText(node)),
    );

    card.append(thumb, body);
    card.title = node.response ? collapse(node.response).slice(0, 260) : "No response recorded";
    card.setAttribute(
      "aria-label",
      `Frame ${node.imageId}, ${nodeKind(node)}${rank ? `, final-K number ${rank}` : ""}${
        node.active ? "" : ", pruned"
      }`,
    );
    return card;
  }

  function createThumb(imageId: number): HTMLSpanElement {
    const thumb = el("span", "mn-thumb");
    thumb.style.setProperty("--h", String(Math.round((imageId * 137.508) % 360)));
    thumb.style.setProperty("--sx", `${25 + ((imageId * 17) % 55)}%`);
    thumb.style.setProperty("--sy", `${20 + ((imageId * 29) % 50)}%`);
    thumb.setAttribute("aria-hidden", "true");
    thumb.append(el("span", "mn-thumb-id", `#${imageId}`));
    return thumb;
  }

  function selectNode(node: TreeNode, shouldScroll: boolean): void {
    if (!view) return;
    view.selected = node;
    for (const [candidate, card] of view.cards) {
      const on = candidate === node;
      card.classList.toggle("is-selected", on);
      card.setAttribute("aria-pressed", String(on));
    }
    renderInspector(node);
    if (!shouldScroll) return;

    const position = view.positions.get(node);
    if (!position) return;
    const left = position.x * view.zoom - viewportEl.clientWidth / 2 + (CARD_W * view.zoom) / 2;
    const top = position.y * view.zoom - viewportEl.clientHeight / 2 + (CARD_H * view.zoom) / 2;
    viewportEl.scrollTo({
      left: Math.max(0, left),
      top: Math.max(0, top),
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }

  function renderInspector(node: TreeNode | null): void {
    inspectorEl.replaceChildren();
    if (!node) {
      inspectorEl.append(el("p", "memviz-empty", "Select a node to read its response."));
      return;
    }

    const head = el("div", "mi-head");
    if (node.imageId === -1) {
      head.append(el("span", "mn-root-mark mi-root-mark", "◈"));
    } else {
      const thumb = createThumb(node.imageId);
      thumb.classList.add("mi-thumb");
      head.append(thumb);
    }

    const titleWrap = el("div", "mi-title-wrap");
    titleWrap.append(
      el("p", "mi-title", node.imageId === -1 ? "Root" : `Frame ${node.imageId}`),
    );
    const bits: string[] = [node.imageId === -1 ? "depth 0" : `depth ${node.depth}`];
    bits.push(node.active ? "active" : "pruned");
    if (node.imageId !== -1) {
      const rank = view ? view.example.finalK.indexOf(node.imageId) + 1 : 0;
      if (rank > 0) bits.push(`final-K #${rank}`);
      bits.push(node.isLeaf ? "leaf" : "expanded");
    }
    titleWrap.append(el("p", "mi-meta", bits.join(" · ")));
    head.append(titleWrap);
    inspectorEl.append(head);

    if (node.imageId === -1) {
      const count = view ? view.nodes.length - 1 : 0;
      inspectorEl.append(
        el(
          "p",
          "mi-part",
          `The root spans ${count} sampled nodes; its ${node.children.length} first-level branches each start from a frame.`,
        ),
      );
      return;
    }

    if (!node.response) {
      inspectorEl.append(el("p", "memviz-empty", "No response recorded — the policy never scored this frame."));
      return;
    }

    for (const part of parseResponse(node.response)) {
      const paragraph = el("p", "mi-part");
      paragraph.dataset.kind = part.kind;
      paragraph.append(el("b", undefined, part.label), document.createTextNode(part.text));
      inspectorEl.append(paragraph);
    }
  }

  function renderPanel(example: Example): void {
    panelEl.replaceChildren();
    const parsed = parseQuestion(example.question);

    const questionBlock = el("div", "rv-block");
    const questionLabel = el("p", "rv-label", "Question");
    questionLabel.append(el("span", "rv-source", sourceLabel(example.source)));
    questionBlock.append(questionLabel);
    if (parsed.stem) questionBlock.append(el("p", "rv-question", parsed.stem));
    if (parsed.options.length > 0) {
      const list = el("ul", "rv-options");
      for (const option of parsed.options) {
        const item = el("li");
        item.append(
          el("span", "rv-opt-label", option.label),
          el("span", "rv-opt-text", option.text),
        );
        list.append(item);
      }
      questionBlock.append(list);
    }
    panelEl.append(questionBlock);

    const answers = el("div", "rv-answers");
    answers.append(answerCard("Ground truth", example.groundtruth, false));
    const model = answerCard("RHM-Agent", example.modelAnswer || "No answer parsed", true);
    if (example.modelDerived && example.modelAnswer) {
      model.append(el("p", "rv-hint", "Consensus of <answer> tags on the final-K nodes."));
    }
    answers.append(model);
    panelEl.append(answers);

    const framesBlock = el("div", "rv-block");
    const framesLabel = el("p", "rv-label", "Final-K frames");
    framesLabel.append(el("span", "rv-count", String(example.finalK.length)));
    framesBlock.append(framesLabel);
    const frameList = el("div", "rv-kchips");
    for (const imageId of example.finalK) {
      const button = el("button", "rv-kchip", String(imageId));
      button.type = "button";
      button.title = `Inspect frame ${imageId}`;
      button.addEventListener("click", () => {
        const node = view?.nodes.find((candidate) => candidate.imageId === imageId);
        if (node) selectNode(node, true);
      });
      frameList.append(button);
    }
    framesBlock.append(frameList);
    panelEl.append(framesBlock);
  }

  function applyZoom(scale: number, fit: boolean): void {
    if (!view) return;
    const clamped = Math.min(1.6, Math.max(0.4, scale));
    view.zoom = clamped;
    view.fit = fit;
    view.canvas.style.transform = `scale(${clamped})`;
    view.scaler.style.width = `${view.width * clamped}px`;
    view.scaler.style.height = `${view.height * clamped}px`;
    zoomLevelEl.textContent = `${Math.round(clamped * 100)}%`;
  }

  function fitScale(): number {
    if (!view) return 1;
    const available = Math.max(viewportEl.clientWidth - 16, 200);
    // Depth-5 trees are ~1200px wide; stop shrinking before the labels turn unreadable and let
    // the viewport scroll instead of the fit factor going to 40%.
    return Math.max(0.62, Math.min(1, available / view.width));
  }
}

function normalizeDataset(raw: unknown): Example[] {
  if (!isRecord(raw)) return [];
  const data = raw["data"];
  if (!Array.isArray(data)) return [];

  const out: Example[] = [];
  data.forEach((entry, index) => {
    if (!isRecord(entry)) return;
    const viz = entry["viz_format"];
    const root = normalizeRoot(isRecord(viz) ? viz : null);
    if (root.children.length === 0) return;

    const nodes = flattenTree(root);
    const finalK = Array.isArray(entry["final_k_image"])
      ? entry["final_k_image"].filter((value): value is number => typeof value === "number")
      : [];
    const answer = resolveAnswer(entry, nodes, finalK);

    out.push({
      idx:
        typeof entry["question_idx"] === "string" && entry["question_idx"]
          ? entry["question_idx"]
          : `example-${index}`,
      question: typeof entry["question"] === "string" ? entry["question"] : "",
      source: typeof entry["data_source"] === "string" ? entry["data_source"] : "",
      groundtruth:
        typeof entry["groundtruth_answer"] === "string" ? entry["groundtruth_answer"].trim() : "",
      finalK,
      modelAnswer: answer.value,
      modelDerived: answer.derived,
      root,
    });
  });
  return out;
}

function normalizeRoot(raw: Record<string, unknown> | null): TreeNode {
  const children = raw ? childList(raw) : [];
  return {
    key: "root",
    imageId: -1,
    response: "",
    active: true,
    isLeaf: false,
    depth: 0,
    children: children.map((child, index) => normalizeNode(child, 1, `0.${index}`)),
  };
}

function normalizeNode(raw: Record<string, unknown>, depth: number, key: string): TreeNode {
  const children = childList(raw);
  return {
    key,
    imageId: typeof raw["image_id"] === "number" ? raw["image_id"] : -1,
    response: typeof raw["response_str"] === "string" ? raw["response_str"].trim() : "",
    active: raw["is_active"] !== false,
    isLeaf: raw["is_leaf"] === true || children.length === 0,
    depth,
    children: children.map((child, index) => normalizeNode(child, depth + 1, `${key}.${index}`)),
  };
}

function childList(raw: Record<string, unknown>): Record<string, unknown>[] {
  const value = raw["children"] ?? raw["childern"];
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord);
}

function flattenTree(root: TreeNode): TreeNode[] {
  const out: TreeNode[] = [];
  const walk = (node: TreeNode): void => {
    out.push(node);
    node.children.forEach(walk);
  };
  walk(root);
  return out;
}

function resolveAnswer(
  entry: Record<string, unknown>,
  nodes: TreeNode[],
  finalK: number[],
): { value: string; derived: boolean } {
  for (const field of ["model_answer", "ultimate_answer", "response"]) {
    const value = entry[field];
    if (typeof value !== "string" || !value.trim()) continue;
    const answers = extractAnswers(value);
    return { value: answers[answers.length - 1] ?? value.trim(), derived: false };
  }

  const topk = new Set(finalK);
  let counts = countAnswers(nodes.filter((node) => topk.has(node.imageId)));
  if (counts.size === 0) counts = countAnswers(nodes.filter((node) => node.imageId !== -1));

  let best = "";
  let bestCount = 0;
  for (const [answer, count] of counts) {
    if (count > bestCount) {
      best = answer;
      bestCount = count;
    }
  }
  return { value: best, derived: true };
}

function countAnswers(nodes: TreeNode[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of nodes) {
    const answers = extractAnswers(node.response);
    const answer = answers[answers.length - 1];
    if (!answer) continue;
    counts.set(answer, (counts.get(answer) ?? 0) + 1);
  }
  return counts;
}

function extractAnswers(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/<answer>([\s\S]*?)<\/answer>/gi)) {
    const value = collapse(match[1] ?? "");
    if (value) out.push(value);
  }
  return out;
}

function examplesFor(key: string, all: Example[], tabIndex: number): Example[] {
  const meta = SOURCE_META[key];
  const own = meta ? all.filter((item) => meta.match(item.source)) : [];
  const listed = own.slice(0, EXAMPLES_PER_TAB);
  let cursor = tabIndex;

  while (listed.length < EXAMPLES_PER_TAB && all.length > 0) {
    const candidate = all[cursor % all.length];
    cursor += 1;
    if (candidate) listed.push(candidate);
  }
  return listed;
}

function nodeKind(node: TreeNode): NodeKind {
  if (node.imageId === -1) return "root";
  if (/<answer>/i.test(node.response)) return "answer";
  if (/expand_node/i.test(node.response)) return "expand";
  if (/prune_node/i.test(node.response)) return "prune";
  if (node.response) return "reason";
  return "idle";
}

function previewText(node: TreeNode): string {
  const answers = extractAnswers(node.response);
  const answer = answers[answers.length - 1];
  if (answer) return `→ ${answer}`;
  if (/expand_node/i.test(node.response)) return "expand child nodes";
  if (/prune_node/i.test(node.response)) return "prune node";
  return collapse(stripTags(node.response)) || "no response";
}

function connector(parent: Position, child: Position): string {
  const x1 = parent.x + CARD_W;
  const y1 = parent.y + CARD_H / 2;
  const x2 = child.x;
  const y2 = child.y + CARD_H / 2;
  const mid = (x1 + x2) / 2;
  return `M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`;
}

function parseQuestion(text: string): {
  stem: string;
  options: { label: string; text: string }[];
} {
  const lines = text.replace(/\r/g, "").split("\n");
  const stem: string[] = [];
  const options: { label: string; text: string }[] = [];

  for (const line of lines) {
    const match = /^\s*(?:\(([A-Da-d])\)|([A-Da-d])[.)])\s+(.+)$/.exec(line);
    if (match) {
      options.push({
        label: (match[1] ?? match[2] ?? "").toUpperCase(),
        text: match[3] ?? "",
      });
      continue;
    }
    if (options.length > 0) {
      const last = options[options.length - 1];
      const trimmed = line.trim();
      if (last && trimmed) last.text = `${last.text} ${trimmed}`;
    } else {
      stem.push(line);
    }
  }

  return { stem: collapse(stem.join(" ")), options };
}

function parseResponse(text: string): ResponsePart[] {
  const parts: ResponsePart[] = [];
  const pattern = /<(reason|answer|info)>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = text.slice(lastIndex, match.index).trim();
    if (raw) parts.push({ label: "Response", text: raw, kind: "raw" });
    const tag = (match[1] ?? "").toLowerCase();
    const kind: ResponsePart["kind"] =
      tag === "reason" || tag === "answer" || tag === "info" ? tag : "raw";
    parts.push({
      label: kind === "raw" ? "Response" : kind[0]!.toUpperCase() + kind.slice(1),
      text: (match[2] ?? "").trim(),
      kind,
    });
    lastIndex = pattern.lastIndex;
  }

  const tail = text.slice(lastIndex).trim();
  if (tail) parts.push({ label: "Response", text: tail, kind: "raw" });
  if (parts.length === 0) parts.push({ label: "Response", text, kind: "raw" });
  return parts;
}

function answerCard(label: string, value: string, isModel: boolean): HTMLElement {
  const card = el("div", `rv-answer${isModel ? " is-model" : ""}`);
  card.append(el("p", "rv-label", label), el("p", "rv-value", value || "—"));
  return card;
}

function chipLabel(example: Example): string {
  const stem = parseQuestion(example.question).stem || collapse(example.question);
  return stem.length > 72 ? `${stem.slice(0, 71)}…` : stem;
}

function sourceLabel(source: string): string {
  if (source.startsWith("hm_")) {
    const domain = source.slice(3);
    return `HMBench · ${domain.charAt(0).toUpperCase()}${domain.slice(1)}`;
  }
  if (source === "ego4d_test") return "Ego4D";
  if (source === "lvbench_test") return "LVBench";
  if (source === "egoschema") return "EgoSchema";
  return source;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stripTags(text: string): string {
  return text.replace(/<[^>]+>/g, " ");
}

function collapse(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
