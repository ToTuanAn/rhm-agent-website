/** Full-screen figure viewer built on the native <dialog> element. */
export function initLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>("#lightbox");
  const image = document.querySelector<HTMLImageElement>("#lightbox-img");
  if (!dialog || !image) return;

  const open = (source: HTMLImageElement): void => {
    image.src = source.currentSrc || source.src;
    image.alt = source.alt;
    dialog.showModal();
  };

  for (const trigger of document.querySelectorAll<HTMLButtonElement>(".figure-zoom")) {
    const source = trigger.querySelector("img");
    if (source) trigger.addEventListener("click", () => open(source));
  }

  // A click that lands on the dialog itself is a click on the backdrop.
  dialog.addEventListener("click", () => dialog.close());
}
