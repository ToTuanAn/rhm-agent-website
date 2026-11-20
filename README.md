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
npm run dev        # http://localhost:5173/rhm-agent-website/
```

Other scripts:

```bash
npm run typecheck  # tsc --noEmit on src/ + vite.config.ts
npm run lint       # eslint .
npm run lint:fix   # eslint . --fix
npm run build      # typecheck + vite build -> dist/
npm run preview    # serve dist/ locally
```

`npm run dev` and `npm run preview` serve under the `/rhm-agent-website/` base path. To develop at the
root (`http://localhost:5173/`), run with `VITE_BASE=/ npm run dev`.

## Replacing the placeholders

Everything below is currently filler and should be swapped for the real material.

| What | Where | Notes |
| --- | --- | --- |
| Paper PDF | `public/paper.pdf` | Linked from the header "Paper" button and the hero. |
| Video | `index.html` → `.video-frame` | Set `data-video-embed="https://www.youtube.com/embed/<ID>"` for an embed, or a direct `.mp4` / `.webm` / `.ogg` URL. Remove the attribute to show the "video coming soon" hint. |
| Figures | `public/figures/teaser.svg`, `method.svg`, `results.svg`, `video-poster.svg` | Drop in `.png`/`.svg` files and update the `src` in `index.html` (they go through `%BASE_URL%`). Keep the `alt` text accurate. |
| Results table | `index.html` → `#results` table | Values are placeholders; the caption says so — update both. |
| Demo trace | `src/demo.ts` | The `STEPS` array drives the animated trace. |
| Citation | `index.html` → `#bibtex` | BibTeX shown by the "Copy" button. |
| Code link | `index.html` → hero actions | Commented out for blind review — uncomment once the repo is public. |
| Authors / affiliation | `index.html` → `.hero-authors` | Currently "Anonymous authors". |

## Deployment to GitHub Pages

This repo ships with `.github/workflows/deploy.yml`, which on every push to `main` (and on manual
dispatch) runs lint → typecheck/build → upload `dist/` → deploy.

One-time setup:

1. Push this repository to GitHub.
2. Go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main` (or run the workflow manually from the **Actions** tab).

The site is then served from `https://<user>.github.io/<repo>/`. The `base` path in `vite.config.ts`
defaults to `/rhm-agent-website/` to match the repository name.

### Different base path

`vite.config.ts` reads the base from the `VITE_BASE` environment variable:

```bash
VITE_BASE=/ npm run build   # user/org site (https://<user>.github.io/) or a custom domain
```

To make the GitHub Actions build use a different base, add it to the build step:

```yaml
- name: Build
  run: npm run build
  env:
    VITE_BASE: /
```

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
public/                    # static assets copied as-is (PDF, figures, favicon)
.github/workflows/deploy.yml
```
