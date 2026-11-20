import { defineConfig } from "vite";

// The site is published on the custom domain https://rhm-agent.site/, so it is served from the
// domain root and every asset URL must start at "/".
// When deploying to a GitHub Pages *project* site (https://<user>.github.io/<repo>/) instead,
// build with `VITE_BASE=/<repo>/`.
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
  build: {
    target: "es2022",
    assetsDir: "assets",
  },
});
