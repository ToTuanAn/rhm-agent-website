# RHM-Agent — project page

Static project page for **RHM-Agent: Teaching VLMs to Reinforce Hierarchical Memory**.

Built with [Vite](https://vite.dev/), TypeScript, and ESLint (flat config). No framework, no runtime
dependencies — the build output is plain HTML/CSS/JS that can be hosted anywhere.

## Sections

Hero · Video · Overview (teaser figure) · Method · Results · Demo · Citation

The demo and the video are progressive enhancements: with JavaScript disabled the page still reads as
a normal paper page.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173/
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit on src/ + vite.config.ts
npm run lint       # eslint .
npm run lint:fix   # eslint . --fix
npm run build      # typecheck + vite build -> dist/
npm run preview    # serve dist/ locally
```

`npm run dev` and `npm run preview` serve from the root (`http://localhost:5173/`), matching the custom
domain. If you need to reproduce the `https://<user>.github.io/<repo>/` path locally, build with
`VITE_BASE=/rhm-agent-website/`.

## Content and assets

| What | Where | Notes |
| --- | --- | --- |
| Brand mark | `public/logo.png` | Used for the header logo and the favicon. |
| Hero footage | `data/intro.mp4` | Imported through `src/media.ts` so Vite hashes it; it fades out on scroll (`src/hero-video.ts`). |
| Video section | `data/summary.mp4` | Imported through `src/media.ts` (`summaryUrl`). The poster is `public/figures/video-poster.svg`. The player is click-to-load: set `data-video-embed` to a YouTube URL for an embed, or a direct `.mp4` / `.webm` / `.ogg` URL. Leave it empty to fall back to `summary.mp4`. |
| Paper figures | `public/figures/teaser.png`, `method.png`, `reward.png` | Rendered from `data/*.pdf` with `pdftoppm -png -r 200 -singlefile data/teaser.pdf public/figures/teaser`. |
| Results tables | `index.html` → `#results` | Two tables: long-form/egocentric VideoQA and HMBench-2K per domain. |
| Demo trace | `src/demo.ts` | The `STEPS` array drives the animated trace. |
| Citation | `index.html` → `#bibtex` | BibTeX shown by the "Copy" button. |
| Authors / affiliation | `index.html` → `.hero-authors` | Currently "Anonymous authors". |

The site opens in dark blue by default; `src/theme.ts` only switches to light when the visitor has
explicitly chosen it, stored under the `rhm-theme` key.

## Deployment to GitHub Pages

This repo ships with `.github/workflows/deploy.yml`, which on every push to `main` (and on manual
dispatch) runs lint → typecheck/build → upload `dist/` → deploy.

One-time setup:

1. Push this repository to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

### Custom domain

The site is published at **https://rhm-agent.site/** (configured in **Settings → Pages → Custom
domain**). Two things make that work and must stay in place:

- `vite.config.ts` has `base: "/"` — on a custom domain the site is served from the domain root, so
  assets must be requested as `/assets/...`, not `/rhm-agent-website/assets/...`.
- `public/CNAME` contains `rhm-agent.site`, which is copied into `dist/` on every build. Without it a
  new deployment would drop the custom domain and the site would fall back to
  `https://<user>.github.io/<repo>/`. The workflow also passes `cname: rhm-agent.site` to
  `actions/configure-pages` as a second safeguard.

DNS (at your registrar):

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| CNAME | `www` | `<user>.github.io.` |

Then tick **Enforce HTTPS** once the certificate is issued.

### Building for the `github.io/<repo>/` path instead

The base path is overridable, which is what you need if the custom domain is ever removed:

```bash
VITE_BASE=/rhm-agent-website/ npm run build
```

To make the GitHub Actions build use it, set it on the build step:

```yaml
- name: Build
  run: npm run build
  env:
    VITE_BASE: /rhm-agent-website/
```

The site is then served from `https://<user>.github.io/<repo>/` (remove `public/CNAME` and the
`cname:` input in that case).

## Project layout

```
index.html                 # all page markup and content
src/main.ts                # entry point, wires up the interactive bits
src/theme.ts               # light/dark toggle (persisted, pre-paint script in index.html)
src/nav.ts                 # active-section highlighting in the header
src/video.ts               # click-to-load video embed
src/lightbox.ts            # click a figure to enlarge it
src/copy-bibtex.ts         # citation copy button
src/demo.ts                # scripted memory-trace demo
src/styles.css             # design tokens, layout, responsive rules
public/                    # static assets copied as-is (PDF, figures, favicon, CNAME)
.github/workflows/deploy.yml
```
