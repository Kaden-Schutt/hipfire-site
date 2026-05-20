// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

// Swap this when you point your real domain at the site. All canonical URLs,
// the sitemap, and absolute OpenGraph image URLs derive from it.
const SITE = "https://hipfire.dev";

export default defineConfig({
  site: SITE,
  trailingSlash: "never",
  build: { format: "directory" },
  integrations: [mdx(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: "github-dark-default",
      wrap: false,
    },
  },
});
