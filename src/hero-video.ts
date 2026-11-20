import { introUrl } from "./media";

/** How much of the hero's height is scrolled before the backdrop is fully gone. */
const FADE_TRAVEL = 0.9;

export function initHeroBackdrop(): void {
  const backdrop = document.querySelector<HTMLElement>("#hero-backdrop");
  const hero = backdrop?.closest<HTMLElement>(".hero");
  if (!backdrop || !hero) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const video = document.createElement("video");
  video.src = introUrl;
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = "auto";
  video.tabIndex = -1;
  video.setAttribute("aria-hidden", "true");
  backdrop.append(video);

  const play = (): void => {
    if (reduceMotion.matches || document.hidden) return;
    void video.play().catch(() => {
      // Autoplay refused (power saving, data saver): the CSS gradient still reads as a hero.
    });
  };

  play();

  let frame = 0;

  const update = (): void => {
    frame = 0;
    const rect = hero.getBoundingClientRect();
    const travel = Math.max(rect.height * FADE_TRAVEL, 1);
    const progress = Math.min(1, Math.max(0, -rect.top / travel));

    backdrop.style.opacity = String(1 - progress);
    backdrop.style.transform = `translate3d(0, ${(progress * 3).toFixed(2)}rem, 0) scale(${(1 + progress * 0.06).toFixed(3)})`;
    backdrop.style.visibility = progress >= 1 ? "hidden" : "";
  };

  const schedule = (): void => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  update();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);

  let visible = true;

  const observer = new IntersectionObserver(([entry]) => {
    if (!entry) return;
    visible = entry.isIntersecting;
    if (visible) play();
    else video.pause();
  });
  observer.observe(hero);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) video.pause();
    else if (visible) play();
  });

  reduceMotion.addEventListener("change", () => {
    if (reduceMotion.matches) video.pause();
    else play();
  });
}
