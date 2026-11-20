const FEEDBACK_MS = 1800;

export function initCopyBibtex(): void {
  const button = document.querySelector<HTMLButtonElement>("#copy-bibtex");
  const code = document.querySelector<HTMLElement>("#bibtex");
  if (!button || !code) return;

  button.addEventListener("click", async () => {
    const text = code.textContent ?? "";
    const copied = await copyText(text);

    button.classList.toggle("is-copied", copied);
    button.textContent = copied ? "Copied" : "Press Ctrl+C";
    window.setTimeout(() => {
      button.classList.remove("is-copied");
      button.textContent = "Copy BibTeX";
    }, FEEDBACK_MS);
  });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopy(text);
  }
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.append(area);
  area.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
