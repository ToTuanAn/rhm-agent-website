type TraceKind = "observe" | "plan" | "write" | "retrieve" | "answer";

interface DemoStep {
  kind: TraceKind;
  /** Static, author-controlled markup (may contain <code> spans). */
  text: string;
}

const STEP_DELAY_MS = 700;

const STEPS: readonly DemoStep[] = [
  {
    kind: "observe",
    text: "Frame <code>t=0</code>: kitchen counter, drawer half open, mug on shelf S2.",
  },
  { kind: "observe", text: "Four recent frames appended to working memory (4/4 slots)." },
  { kind: "plan", text: "Goal: move the mug beside the kettle without toppling the stack." },
  {
    kind: "write",
    text: "<code>WRITE</code> semantic ← <code>grasp_point(drawer_handle) = (0.42, 0.71)</code>",
  },
  {
    kind: "write",
    text: "<code>COMPRESS</code> episodic 3 → “drawer → mug → traverse”, score 0.86",
  },
  {
    kind: "retrieve",
    text: "<code>RETRIEVE</code> “where did the mug rest last time?” → episodic #12 (sim 0.91)",
  },
  {
    kind: "plan",
    text: "Reuse the <code>traverse</code> skill; skip re-exploring the left cabinet.",
  },
  {
    kind: "answer",
    text: "Success in 41 steps · 8.9k context tokens (baseline 18.4k).",
  },
];

export function initDemo(): void {
  const list = document.querySelector<HTMLOListElement>("#demo-trace");
  const runButton = document.querySelector<HTMLButtonElement>("#demo-run");
  const resetButton = document.querySelector<HTMLButtonElement>("#demo-reset");
  const status = document.querySelector<HTMLElement>("#demo-status");
  if (!list || !runButton || !resetButton || !status) return;

  let runId = 0;

  runButton.addEventListener("click", async () => {
    const id = ++runId;
    list.replaceChildren();
    runButton.disabled = true;

    const delay = prefersReducedMotion() ? 0 : STEP_DELAY_MS;
    let shown = 0;
    status.textContent = `Running — 0 / ${STEPS.length}`;

    for (const step of STEPS) {
      if (id !== runId) return;
      list.append(renderStep(step));
      shown += 1;
      status.textContent = `Running — ${shown} / ${STEPS.length}`;
      if (delay > 0) await sleep(delay);
    }

    if (id === runId) {
      status.textContent = `Done — ${STEPS.length} steps, 8.9k tokens.`;
      runButton.disabled = false;
    }
  });

  resetButton.addEventListener("click", () => {
    runId += 1;
    list.replaceChildren();
    runButton.disabled = false;
    status.textContent = `Idle — ${STEPS.length} steps queued.`;
  });
}

function renderStep(step: DemoStep): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "trace-item";
  item.dataset.kind = step.kind;

  const kind = document.createElement("span");
  kind.className = "trace-kind";
  kind.textContent = step.kind;

  const text = document.createElement("span");
  text.className = "trace-text";
  text.innerHTML = step.text;

  item.append(kind, text);
  return item;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
