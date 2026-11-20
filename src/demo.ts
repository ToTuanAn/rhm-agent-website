type TraceKind = "select" | "expand" | "exploit" | "answer";

interface DemoStep {
  kind: TraceKind;
  /** Static, author-controlled markup (may contain <code> spans). */
  text: string;
}

const STEP_DELAY_MS = 700;

/** Traced from the marine example in Fig. 6 of the paper. */
const STEPS: readonly DemoStep[] = [
  {
    kind: "select",
    text: "Iteration 1 — rank the 16 sampled start frames by <code>Nscore</code>; keep <em>N</em> = 3.",
  },
  {
    kind: "expand",
    text: "Node <code>A2</code> → expand into <code>B1</code> and <code>B2</code> (descent toward the wreck).",
  },
  {
    kind: "exploit",
    text: "Node <code>B3</code> exploited: the seabed handling already sits inside <code>B4</code>'s interval.",
  },
  {
    kind: "expand",
    text: "Node <code>A3</code> → expand into <code>C3</code> and <code>C4</code> around the retrieval moment.",
  },
  {
    kind: "exploit",
    text: "Node <code>C2</code> exploited: the diver grips a small metallic object at the seabed.",
  },
  {
    kind: "expand",
    text: "Node <code>C1</code> → expand into <code>D1</code> and <code>D2</code> to cover the ascent.",
  },
  {
    kind: "answer",
    text: 'Leaf <code>&lt;answer&gt;</code> “The diver resurfaces with the find” — node marked inactive.',
  },
  {
    kind: "answer",
    text: "Root answer from the top-K scored frames: same option, 6 of 16 frames carried the evidence.",
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
      status.textContent = `Done — ${STEPS.length} steps, 6 of 16 frames kept.`;
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
