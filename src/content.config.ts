import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Blog: posts live in src/content/blog as .md or .mdx. Empty for now; first
// post is a drop-in with the frontmatter below.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    updated: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Docs: the canonical markdown lives in <repo-root>/docs/. We point the loader
// at it via a relative path so the source of truth stays in the engine repo
// and Astro just renders it. Schema is permissive because the existing files
// don't have frontmatter — title falls back to the H1 / filename at render
// time (see src/pages/docs/[...slug].astro).
//
// What we publish: top-level reference docs (ARCHITECTURE, CLI, MODELS, ...)
// and the quant-formats reference. Explicitly excluded:
//   - docs/perf-checkpoints/   — dated engineering writeups, not user-facing
//   - docs/methodology/        — contributor process docs
//   - docs/plans/              — internal planning
//   - docs/investigations/     — internal research
//   - docs/skills/, docs/superpowers/ — agent/tooling notes
// To promote any of those to the public site, lift the file into a real
// blog post under src/content/blog/ with proper frontmatter.
const docs = defineCollection({
  loader: glob({
    base: "../docs",
    pattern: [
      "*.md",
      "quant-formats/**/*.md",
    ],
    // Preserve original filename casing in entry.id so the edit-on-github
    // link in src/pages/docs/[...slug].astro can resolve files like
    // "CLI.md" or "GETTING_STARTED.md" correctly. The user-facing URL is
    // lowercased separately in [...slug].astro's getStaticPaths.
    generateId: ({ entry }) => entry.replace(/\.md$/, ""),
  }),
  schema: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
});

export const collections = { blog, docs };
