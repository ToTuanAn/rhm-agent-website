import { defineConfig } from "vite";

// GitHub Pages serves project sites from https://<user>.github.io/<repo>/.
// Override with `VITE_BASE=/` when deploying to a user/org root site.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/rhm-agent-website/",
  build: {
    target: "es2022",
    assetsDir: "assets",
  },
});
