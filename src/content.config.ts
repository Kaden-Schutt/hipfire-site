import { defineCollection, z } from "astro:content";
import type { Loader } from "astro/loaders";
import { glob } from "astro/loaders";
import { createHash } from "node:crypto";
import { posix as posixPath } from "node:path";

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

const RAW_BASE = "https://raw.githubusercontent.com/warpfront/hipfire/beta/";
const BLOB_BASE = "https://github.com/warpfront/hipfire/blob/beta/";

const navGroupEnum = z.enum(["start", "operate", "understand", "reference", "formats"]);

type DocsMeta = {
  title: string;
  description: string;
  sourcePath: string;
  navGroup: z.infer<typeof navGroupEnum>;
  navOrder: number;
};

// Curated beta docs manifest. sourcePath is repo-root-relative on the
// warpfront/hipfire beta branch. IDs derive as sourcePath without the
// leading `docs/` and trailing `.md`, preserving source casing.
const MANIFEST: DocsMeta[] = [
  {
    title: "Getting started",
    description: "Install hipfire and complete your first run.",
    sourcePath: "docs/GETTING_STARTED.md",
    navGroup: "start",
    navOrder: 1,
  },
  {
    title: "CLI",
    description: "Every hipfire subcommand and flag.",
    sourcePath: "docs/CLI.md",
    navGroup: "operate",
    navOrder: 1,
  },
  {
    title: "Models",
    description: "Curated model tags and bring-your-own weights.",
    sourcePath: "docs/MODELS.md",
    navGroup: "operate",
    navOrder: 2,
  },
  {
    title: "Quantize",
    description: "Convert HF, safetensors, and GGUF weights to hipfire formats.",
    sourcePath: "docs/QUANTIZE.md",
    navGroup: "operate",
    navOrder: 3,
  },
  {
    title: "Serve",
    description: "OpenAI-compatible HTTP serving.",
    sourcePath: "docs/SERVE.md",
    navGroup: "operate",
    navOrder: 4,
  },
  {
    title: "Config",
    description: "Configuration file, per-model settings, and precedence.",
    sourcePath: "docs/CONFIG.md",
    navGroup: "operate",
    navOrder: 5,
  },
  {
    title: "Chat",
    description: "Interactive chat sessions, history, and options.",
    sourcePath: "docs/CHAT.md",
    navGroup: "operate",
    navOrder: 6,
  },
  {
    title: "Image generation",
    description: "Text-to-image generation with supported image models.",
    sourcePath: "docs/IMAGEGEN.md",
    navGroup: "operate",
    navOrder: 7,
  },
  {
    title: "Containers",
    description: "Running hipfire from container images.",
    sourcePath: "docs/CONTAINER.md",
    navGroup: "operate",
    navOrder: 8,
  },
  {
    title: "NixOS",
    description: "Installing and running hipfire on NixOS.",
    sourcePath: "docs/NIXOS.md",
    navGroup: "operate",
    navOrder: 9,
  },
  {
    title: "Architecture",
    description: "Engine, dispatch, and model execution paths.",
    sourcePath: "docs/ARCHITECTURE.md",
    navGroup: "understand",
    navOrder: 1,
  },
  {
    title: "Quantization",
    description: "MQ V2, HFQ, asymmetric KV caching, and FWHT.",
    sourcePath: "docs/QUANTIZATION.md",
    navGroup: "understand",
    navOrder: 2,
  },
  {
    title: "Multi-GPU",
    description: "Pipeline and expert parallelism with memory budgeting.",
    sourcePath: "docs/multi-gpu.md",
    navGroup: "understand",
    navOrder: 3,
  },
  {
    title: "Environment variables",
    description: "Full environment variable reference.",
    sourcePath: "docs/env-vars.md",
    navGroup: "reference",
    navOrder: 1,
  },
  {
    title: "Architecture IDs",
    description: "Supported model architecture identifiers.",
    sourcePath: "docs/architecture-ids.md",
    navGroup: "reference",
    navOrder: 2,
  },
  {
    title: "MQ4 V2",
    description: "MQ4 V2 block format specification.",
    sourcePath: "docs/quant-formats/mq4-v2.md",
    navGroup: "formats",
    navOrder: 1,
  },
  {
    title: "MQ V2 family",
    description: "Overview of the MQ V2 quantization family.",
    sourcePath: "docs/quant-formats/mq-v2-family.md",
    navGroup: "formats",
    navOrder: 2,
  },
  {
    title: "Product ladder",
    description: "Quantization product ladder and format recommendations.",
    sourcePath: "docs/quant-formats/ladder.md",
    navGroup: "formats",
    navOrder: 3,
  },
  {
    title: "HFP4",
    description: "HFP4 floating-point format specification.",
    sourcePath: "docs/quant-formats/hfp4.md",
    navGroup: "formats",
    navOrder: 4,
  },
];

// Entry IDs are sourcePaths without the leading docs/ and trailing .md,
// preserving source casing (e.g. docs/CLI.md -> CLI).

// Curated sourcePath -> entry id (paths without docs/ and .md, casing kept).
// Built once from the static manifest via runtime insertion below.
const CURATED_BY_PATH: Record<string, string> = {};
const CURATED_BY_LOWER: Record<string, string> = {};
for (const meta of MANIFEST) {
  const entryId = meta.sourcePath.replace(/^docs\//, "").replace(/\.md$/, "");
  CURATED_BY_PATH[meta.sourcePath] = entryId;
  CURATED_BY_LOWER[meta.sourcePath.toLowerCase()] = entryId;
}

function curatedIdForRepoPath(repoPath: string): string | undefined {
  const withExt = `${repoPath}.md`;
  return (
    CURATED_BY_PATH[repoPath] ??
    CURATED_BY_PATH[withExt] ??
    CURATED_BY_LOWER[repoPath.toLowerCase()] ??
    CURATED_BY_LOWER[withExt.toLowerCase()]
  );
}

function isSkippedUrl(url: string): boolean {
  if (!url) return true;
  const value = url.trim();
  if (value === "") return true;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/")) return true;
  if (value.startsWith("//")) return true;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return true;
  return false;
}

function splitSuffix(target: string): { path: string; suffix: string } {
  const idx = target.search(/[?#]/);
  if (idx === -1) return { path: target, suffix: "" };
  return { path: target.slice(0, idx), suffix: target.slice(idx) };
}

function resolveRepoPath(fromSourcePath: string, targetPath: string): string {
  const decoded = targetPath.trim();
  return posixPath.normalize(posixPath.join(posixPath.dirname(fromSourcePath), decoded));
}

function rewriteHref(href: string, fromSourcePath: string): string {
  if (isSkippedUrl(href)) return href;
  const { path, suffix } = splitSuffix(href);
  if (path.trim() === "") return href;
  const resolved = resolveRepoPath(fromSourcePath, path);
  const curatedId = curatedIdForRepoPath(resolved);
  if (curatedId) {
    const slug = curatedId
      .split("/")
      .map((part) => part.toLowerCase())
      .join("/");
    return `/docs/${slug}${suffix}`;
  }
  return `${BLOB_BASE}${resolved}${suffix}`;
}
function rewriteImgSrc(src: string, fromSourcePath: string): string {
  if (isSkippedUrl(src)) return src;
  const { path, suffix } = splitSuffix(src);
  if (path.trim() === "") return src;
  const resolved = resolveRepoPath(fromSourcePath, path);
  return `${RAW_BASE}${resolved}${suffix}`;
}

// Rewrite relative links/images in rendered HTML only — never the raw
// Markdown, so fenced code blocks and inline code are untouched (their
// contents are HTML-escaped and never match real href/src attributes).
function rewriteRenderedHtml(html: string, fromSourcePath: string): string {
  const withLinks = html.replace(
    /href=(["'])([^"']*)\1/g,
    (_match, quote: string, url: string) =>
      `href=${quote}${rewriteHref(url, fromSourcePath)}${quote}`,
  );
  return withLinks.replace(
    /src=(["'])([^"']*)\1/g,
    (_match, quote: string, url: string) =>
      `src=${quote}${rewriteImgSrc(url, fromSourcePath)}${quote}`,
  );
}


const docsLoader: Loader = {
  name: "hipfire-beta-docs",
  load: async ({ store, parseData, renderMarkdown }) => {
    store.clear();
    await Promise.all(
      MANIFEST.map(async (meta) => {
        const id = meta.sourcePath.replace(/^docs\//, "").replace(/\.md$/, "");
        const url = `${RAW_BASE}${meta.sourcePath}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(
            `hipfire docs: failed to fetch ${meta.sourcePath} from beta (HTTP ${res.status} ${res.statusText})`,
          );
        }
        const body = await res.text();
        const data = await parseData({ id, data: meta });
        const renderedResult: unknown = await renderMarkdown(body);
        let html: string;
        if (typeof renderedResult === "string") {
          html = renderedResult;
        } else if (
          renderedResult !== null &&
          typeof renderedResult === "object" &&
          "html" in renderedResult &&
          typeof renderedResult.html === "string"
        ) {
          html = renderedResult.html;
        } else {
          throw new Error(`hipfire docs: renderMarkdown returned no HTML for ${meta.sourcePath}`);
        }
        const rewritten = rewriteRenderedHtml(
          html.replace(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>\s*/i, ""),
          meta.sourcePath,
        );
        store.set({
          id,
          data,
          body,
          digest: createHash("sha256").update(body).digest("hex"),
          rendered: { html: rewritten },
        });
      }),
    );
  },
};

// Docs: rendered from the canonical warpfront/hipfire beta branch at build
// time. /docs/benchmarks and /docs/dflash stay custom Astro pages, not
// collection entries.
const docs = defineCollection({
  loader: docsLoader,
  schema: z.object({
    title: z.string(),
    description: z.string(),
    sourcePath: z.string(),
    navGroup: navGroupEnum,
    navOrder: z.number(),
  }),
});

export const collections = { blog, docs };
