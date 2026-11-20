import { summaryUrl } from "./media";

const FILE_PATTERN = /\.(mp4|webm|ogg)(?:[?#]|$)/i;

/**
 * Click-to-load player. The overview clip is only requested once the user asks
 * for it, so the initial page load stays light.
 */
export function initVideo(): void {
  const frame = document.querySelector<HTMLElement>("[data-video-embed]");
  const button = document.querySelector<HTMLButtonElement>("#video-play");
  if (!frame || !button) return;

  button.addEventListener("click", () => {
    const source = (frame.dataset.videoEmbed ?? "").trim() || summaryUrl;
    frame.append(FILE_PATTERN.test(source) ? createVideo(source) : createIframe(source));
    frame.classList.add("is-playing");
  });
}

function createIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Paper summary video for RHM-Agent";
  iframe.allow =
    "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
  iframe.allowFullscreen = true;
  iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  return iframe;
}

function createVideo(src: string): HTMLVideoElement {
  const video = document.createElement("video");
  video.src = src;
  video.controls = true;
  video.autoplay = true;
  video.playsInline = true;
  video.setAttribute("aria-label", "Paper summary video for RHM-Agent");
  return video;
}
