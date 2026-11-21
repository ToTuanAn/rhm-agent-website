/**
 * Swipeable figure stack for the method section: dragging Figure 2 sideways slides Figure 3 in.
 *
 * The track is translated horizontally and the viewport clips the overflow. The viewport keeps
 * its natural height (the tallest slide), so the card does not resize while sliding.
 */

const DRAG_SLOP_PX = 6;
const MAX_SWIPE_RATIO = 0.12;
const MAX_SWIPE_PX = 120;
/** How far past the first or last slide a drag may travel, as a fraction of the pointer motion. */
const EDGE_RESISTANCE = 0.3;

function initSlider(slider: HTMLElement): void {
  const viewport = slider.querySelector<HTMLElement>(".figure-slider-viewport");
  const track = slider.querySelector<HTMLElement>(".figure-slider-track");
  if (!viewport || !track) return;

  // Alias keeps the non-null narrowing inside the hoisted helpers below.
  const rail = track;

  const slides = Array.from(slider.querySelectorAll<HTMLElement>(".figure-slide"));
  if (slides.length < 2) return;

  const dots = Array.from(slider.querySelectorAll<HTMLButtonElement>(".figure-slider-dot"));
  const navButtons = Array.from(slider.querySelectorAll<HTMLButtonElement>(".figure-slider-btn"));

  let index = 0;
  let dragging = false;
  let startX = 0;
  let dragX = 0;
  let pointerId: number | null = null;
  // Set once a drag travels far enough that the following click must not open the lightbox.
  let swallowClick = false;

  function place(offsetPx: number, animate: boolean): void {
    rail.classList.toggle("is-animating", animate);
    rail.style.transform = `translate3d(calc(${-index * 100}% + ${offsetPx}px), 0, 0)`;
  }

  function show(next: number): void {
    index = Math.min(Math.max(next, 0), slides.length - 1);
    place(0, true);

    slides.forEach((slide, i) => {
      const active = i === index;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      const zoom = slide.querySelector<HTMLButtonElement>(".figure-zoom");
      if (zoom) zoom.tabIndex = active ? 0 : -1;
    });

    dots.forEach((dot, i) => {
      if (i === index) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });

    for (const button of navButtons) {
      const direction = Number(button.dataset.dir ?? "1");
      button.disabled = direction < 0 ? index === 0 : index === slides.length - 1;
    }
  }

  viewport.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragging = true;
    swallowClick = false;
    startX = event.clientX;
    dragX = 0;
    pointerId = event.pointerId;
    slider.classList.add("is-dragging");
    rail.classList.remove("is-animating");
    viewport.setPointerCapture(event.pointerId);
  });

  viewport.addEventListener("pointermove", (event) => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragX = event.clientX - startX;
    if (Math.abs(dragX) > DRAG_SLOP_PX) swallowClick = true;
    const pastStart = index === 0 && dragX > 0;
    const pastEnd = index === slides.length - 1 && dragX < 0;
    place(pastStart || pastEnd ? dragX * EDGE_RESISTANCE : dragX, false);
  });

  const endDrag = (event: PointerEvent): void => {
    if (!dragging || event.pointerId !== pointerId) return;
    dragging = false;
    pointerId = null;
    slider.classList.remove("is-dragging");
    if (viewport.hasPointerCapture(event.pointerId)) viewport.releasePointerCapture(event.pointerId);

    const threshold = Math.min(MAX_SWIPE_PX, viewport.clientWidth * MAX_SWIPE_RATIO);
    const step = Math.abs(dragX) > threshold ? (dragX < 0 ? 1 : -1) : 0;
    dragX = 0;
    show(index + step);

    if (swallowClick) {
      // Release the flag after the click that follows this pointerup has been discarded.
      setTimeout(() => {
        swallowClick = false;
      }, 0);
    }
  };

  viewport.addEventListener("pointerup", endDrag);
  viewport.addEventListener("pointercancel", endDrag);

  viewport.addEventListener(
    "click",
    (event) => {
      if (!swallowClick) return;
      event.preventDefault();
      event.stopPropagation();
    },
    true,
  );

  for (const button of navButtons) {
    button.addEventListener("click", () => show(index + Number(button.dataset.dir ?? "1")));
  }

  dots.forEach((dot, i) => dot.addEventListener("click", () => show(i)));

  slider.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      show(index + 1);
    }
  });

  show(0);
}

export function initFigureSliders(): void {
  for (const slider of document.querySelectorAll<HTMLElement>(".figure-slider")) {
    initSlider(slider);
  }
}
