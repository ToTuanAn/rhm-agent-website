import "./styles.css";
import { initComparison } from "./comparison";
import { initCopyBibtex } from "./copy-bibtex";
import { initFigureSliders } from "./figure-slider";
import { initHeroBackdrop } from "./hero-video";
import { initLightbox } from "./lightbox";
import { initNavHighlight } from "./nav";
import { initResultsViz } from "./results-viz";
import { initThemeToggle } from "./theme";
import { initVideo } from "./video";

// The module is deferred, so the DOM is already parsed when this runs.
initThemeToggle();
initHeroBackdrop();
initNavHighlight();
initVideo();
initLightbox();
initFigureSliders();
initCopyBibtex();
initResultsViz();
initComparison();
