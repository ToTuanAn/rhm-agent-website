const FILE_PATTERN = /\.(mp4|webm|ogg)$/i;

/**
 * Click-to-load video player. Keeps the page light until the user asks for the
 * video by only creating the iframe/video element on demand.
 */
export function initVideo(): void {
  const frame = document.querySelector<HTMLElement>("[data-video-embed]");
  const button = document.querySelector<HTMLButtonElement>("#video-play");
  const hint = document.querySelector<HTMLElement>("#video-hint");
  if (!frame || !button) return;

  button.addEventListener("click", () => {
    const source = (frame.dataset.videoEmbed ?? "").trim();

    if (!isHttpUrl(source)) {
      if (hint) {
        hint.hidden = false;
        hint.textContent =
          "No video linked yet — set data-video-embed on .video-frame in index.html.";
      }
      return;
    }

    frame.classList.add("is-loading");
    frame.append(FILE_PATTERN.test(source) ? createVideo(source) : createIframe(source));
    frame.classList.add("is-playing");
    frame.classList.remove("is-loading");
  });
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function createIframe(src: string): HTMLIFrameElement {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Five-minute overview of RHM-Agent";
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
  video.setAttribute("aria-label", "Five-minute overview of RHM-Agent");
  return video;
}
