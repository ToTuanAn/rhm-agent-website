import "./styles.css";
import { initCopyBibtex } from "./copy-bibtex";
import { initDemo } from "./demo";
import { initHeroBackdrop } from "./hero-video";
import { initLightbox } from "./lightbox";
import { initNavHighlight } from "./nav";
import { initThemeToggle } from "./theme";
import { initVideo } from "./video";

// The module is deferred, so the DOM is already parsed when this runs.
initThemeToggle();
initHeroBackdrop();
initNavHighlight();
initVideo();
initLightbox();
initCopyBibtex();
initDemo();
