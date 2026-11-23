# RHM-Agent — project page

Static project page for **RHM-Agent: Teaching VLMs to Reinforce Hierarchical Memory**.

Built with Vite, TypeScript, and ESLint (flat config). No framework, no runtime
dependencies — the build output is plain HTML/CSS/JS that can be hosted anywhere.

## Sections

Hero · Video · Overview (teaser figure) · Method · Results · Compare · Citation

The results visualizer, the qualitative comparison, and the video are progressive enhancements: with
JavaScript disabled the page still reads as a normal paper page.

## Quick start

For anyone who already has `nvm` and `git`:

```bash
nvm install 20
nvm use
npm install
npm run dev
```

Then open `http://localhost:5173/`.

Everything below is the same steps in more detail, including installing Node.js from scratch.

## Requirements

| Tool | Version | Why |
| --- | --- | --- |
| Git | any recent version | To clone the repository. |
| Node.js | **20.19 or newer** (Node 20 LTS) | Vite 8 requires `^20.19.0 \|\| >=22.12.0`; this project targets Node 20. `.nvmrc` pins the major version to `20`. |
| npm | 10 or newer | Ships with Node.js 20 — you do not install it separately. |

Check what you have:

```bash
node -v    # should print v20.x.y (at least v20.19.0)
npm -v     # should print 10.x or newer
```

If `node -v` prints nothing, a version older than `v20.19.0`, or a different major version, follow
the next section to install and select Node 20. (Other versions outside the Vite engine range above
will fail on `npm install` or `npm run dev`.)

## Install Node 20 with nvm

`nvm` (Node Version Manager) installs Node.js per user, so you never need `sudo` and you can switch
versions per project. Use the commands for your operating system, then continue with **Select Node 20**.

### macOS and Linux

Install nvm with the official install script:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

The script appends a `nvm` loader block to your shell profile (`~/.bashrc`, `~/.zshrc`, …). Reload
that profile so the current terminal can see it:

```bash
source ~/.bashrc     # or: source ~/.zshrc
```

Verify the install:

```bash
command -v nvm      # should print nvm
nvm --version
```

On macOS you can install nvm with Homebrew instead, if you prefer:

```bash
brew install nvm
mkdir -p ~/.nvm
```

Then add these lines to `~/.zshrc` (or `~/.bashrc`) and reload it:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$(brew --prefix nvm)/nvm.sh" ] && . "$(brew --prefix nvm)/nvm.sh"
```

If `command -v nvm` prints nothing, close the terminal and open a new one — `nvm` is a shell
function, so it is only available after the profile has been loaded.

### Windows

Use nvm-windows:

1. Download the latest `nvm-setup.exe` from the nvm-windows GitHub releases page.
2. Run the installer and accept the defaults. Let it manage the Node.js symlink.
3. Open a **new** PowerShell or Command Prompt window and run `nvm version`.

If `nvm use` reports that it cannot create the symlink, open the terminal as **Administrator**
(Windows needs that permission to switch the `node` link) or enable Developer Mode.

### Select Node 20

From the project directory, `nvm use` reads `.nvmrc`; if you are not in the project directory yet,
name the version explicitly:

```bash
nvm install 20       # downloads and installs the latest Node 20 release
nvm use 20           # inside the repo you can run just: nvm use
nvm alias default 20 # make Node 20 the default in every new terminal
```

Confirm the right version is active:

```bash
node -v   # v20.20.x or another v20 release >= v20.19.0
npm -v    # 10.x
```

`nvm use` only affects the current terminal. That is why `nvm alias default 20` is useful, and why
you may need to run `nvm use` again after opening a new shell.

## Run the website locally

1. **Select Node 20** — see [Select Node 20](#select-node-20) above:

   ```bash
   nvm install 20
   nvm use
   ```

2. **Install dependencies** (once per checkout, and again after `package.json` changes):

   ```bash
   npm install
   ```

   Use `npm ci` instead if you want a clean, lockfile-exact install — for example in CI or after a
   broken `node_modules`.

3. **Start the development server:**

   ```bash
   npm run dev
   ```

   Vite prints the URL, normally `http://localhost:5173/`. Open it in a browser. Edits to
   `index.html`, `src/`, and `public/` reload the page automatically.

4. **Stop the server** with `Ctrl+C` in the terminal that is running it.

### Check the production build locally

```bash
npm run build     # typecheck + bundle into dist/
npm run preview   # serve dist/ at http://localhost:4173/
```

This is what CI deploys, so it is the best way to confirm a change works exactly as it will on the
live site. `dist/` is generated and git-ignored.

### If port 5173 is already in use

Vite picks the next free port automatically and prints it. To force one:

```bash
npm run dev -- --port 5174
```

## Available scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server with hot reload (`http://localhost:5173/`). |
| `npm run build` | Run `typecheck`, then bundle the site into `dist/`. |
| `npm run preview` | Serve the built `dist/` locally (`http://localhost:4173/`). |
| `npm run typecheck` | `tsc --noEmit` for `src/` plus `tsc -p tsconfig.node.json` for the Vite config. |
| `npm run lint` | Run ESLint over the repository. |
| `npm run lint:fix` | Run ESLint and apply safe autofixes. |
| `npm run frames` | Re-export the qualitative-comparison stills into `public/frames/`. |
| `npm run frames:results` | Re-export the results-visualizer stills into `public/frames/`. |
| `npm run clips` | Cut the comparison clips into `public/videos/` and posters into `public/posters/`. |

The three asset scripts read frame dumps from `data/`, which are **not** committed (they are
git-ignored and can be several GB). Only run them if you have those dumps; the site itself runs
without them because the exported stills and clips are committed under `public/`.

`npm run dev` and `npm run preview` serve from the root (`http://localhost:5173/`), matching the custom
domain. If you need to reproduce the `https://<user>.github.io/<repo>/` path locally, build with
`VITE_BASE=/rhm-agent-website/`.

## Troubleshooting

**`nvm: command not found`**
The shell profile has not been loaded. Run `source ~/.zshrc` (or `~/.bashrc`), or open a new
terminal. On Windows use the `nvm-windows` installer and open a new terminal.

**`npm ERR! code EBADENGINE` or `Vite requires Node.js version 20.19+`**
You are on the wrong Node version. Run `node -v`; if it is not `v20.19.0` or newer:

```bash
nvm install 20
nvm use 20
```

**The terminal still shows an old Node version after `nvm use`**
A system-wide Node (for example from `apt` or the official installer) may come earlier in `PATH`.
Check with `which node` (macOS/Linux) or `where node` (Windows) and remove or reorder the system
install, or start a shell where nvm's shim comes first.

**`EACCES: permission denied` during `npm install`**
Do not use `sudo npm install` — it leaves root-owned files in the project. Delete `node_modules` with
`sudo rm -rf node_modules`, switch to an nvm-managed Node 20 (`nvm use 20`), and run `npm install`
again as your normal user.

**Install or build fails after pulling changes**
Reinstall from the lockfile:

```bash
rm -rf node_modules package-lock.json   # Windows: rmdir /s /q node_modules & del package-lock.json
npm install
```

**PowerShell blocks `npm` / `nvm` scripts on Windows**
Run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then reopen the terminal.

## Content and assets

| What | Where | Notes |
| --- | --- | --- |
| Brand mark | `public/logo.png` | Used for the header logo and the favicon. |
| Hero footage | `src/assets/intro.mp4` | Imported through `src/media.ts` so Vite hashes it; it fades out on scroll (`src/hero-video.ts`). |
| Video section | `src/assets/summary.mp4` | Imported through `src/media.ts` (`summaryUrl`). The poster is `public/figures/video-poster.svg`. The player is click-to-load: set `data-video-embed` to a YouTube URL for an embed, or a direct `.mp4` / `.webm` / `.ogg` URL. Leave it empty to fall back to `summary.mp4`. |
| Paper figures | `public/figures/teaser.png`, `method.png`, `reward.png` | Rendered from `data/*.pdf` with `pdftoppm -png -r 200 -singlefile data/teaser.pdf public/figures/teaser`. |
| Memory-tree visualizer | `src/results-viz.ts`, `src/assets/correct_examples.json` | `#results`: four benchmark tabs, ten verified traces each, tidied tree with the final-k frames highlighted. The JSON concatenates `data/viz/qwen3-8b-ts-root/correct_examples.json` (LVBench, EgoSchema, Ego4D) with `data/viz_hmbench/qwen3-8b-ts-root/correct_examples.json` (HMBench), enriching the HMBench entries from `output_with_ultimate.json` so they carry `viz_format` and `final_k_image`. Each entry also carries `video_id`, which keys its node thumbnails. The HMBench tab round-robins Marine, Industry, Driving and Medical traces so every subset shows up; the inspector renders `<info>` actions (`expand_node("…")`, `prune_node("…")`) as plain “expand node” / “prune node”. |
| Results stills | `public/frames/<video_id>/<image_id>.jpg` | Exported by `npm run frames:results` from `data/output_folder/<video_id>/`. `image_id` is the 0-based index into that folder's sorted image listing, so the node thumbnails line up with the dumped frames. `data/output_folder` is git-ignored — only the referenced stills are committed. |
| Qualitative comparison | `src/comparison.ts`, `src/assets/qualitative-comparison.json` | `#comparison`: four queries only RHM-Agent answers correctly (the 03 Marine example, plus driving, industrial, and medical), with each method's top-k frames. |
| Comparison stills | `public/frames/<video_id>/<index>.jpg` | Exported by `npm run frames` from the dump folder named by the example's `frame_source` (`data/quant/` by default, `data/marine/` for the Marine examples). Frame ids are indices into the sorted fps=1 dump. Both dump folders are git-ignored — they are derived from the source videos. |
| Comparison clips | `public/videos/<video_id>.mp4`, `public/posters/<video_id>.jpg` | Cut by `npm run clips` from the same dumps: the dump files named by the example's `clip_frame_range`, else its `time_reference` window (narrowed by `clip_reference`), else the whole dump. `clip_width` narrows the encode (480 px for the full-length Marine clips, 640 px otherwise). |
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

The site is published at **.** (configured in **Settings → Pages → Custom
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
.nvmrc                     # pins Node 20 for `nvm use`
index.html                 # all page markup and content
src/main.ts                # entry point, wires up the interactive bits
src/theme.ts               # light/dark toggle (persisted, pre-paint script in index.html)
src/nav.ts                 # active-section highlighting in the header
src/hero-video.ts          # hero backdrop video fade-on-scroll
src/media.ts               # hashed URLs for the bundled videos
src/video.ts               # click-to-load video embed
src/lightbox.ts            # click a figure to enlarge it
src/figure-slider.ts       # before/after figure sliders
src/copy-bibtex.ts         # citation copy button
src/results-viz.ts         # memory-tree visualizer (#results)
src/comparison.ts          # qualitative comparison (#comparison)
src/styles.css             # design tokens, layout, responsive rules
scripts/build-comparison-frames.mjs  # exports comparison stills from the frame dumps
scripts/build-results-frames.mjs     # exports results stills from the frame dumps
scripts/build-comparison-clips.mjs   # cuts comparison clips and posters
public/                    # static assets copied as-is (frames, figures, favicon, CNAME)
.github/workflows/deploy.yml
```
