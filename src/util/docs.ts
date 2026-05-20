// Shared helpers for the docs collection. Live in a separate module because
// Astro's getStaticPaths runs in an isolated context and can't reference
// page-frontmatter-level functions.

export function toUrlSlug(id: string): string {
  return id
    .split("/")
    .map((p) => p.toLowerCase())
    .join("/");
}

export function pretty(id: string, title?: string): string {
  if (title) return title;
  const base = id.split("/").pop() ?? id;
  return base.replace(/[-_]/g, " ");
}

export function groupOf(id: string): string {
  if (id.startsWith("methodology/")) return "methodology";
  if (id.startsWith("perf-checkpoints/")) return "perf checkpoints";
  if (id.startsWith("quant-formats/")) return "quant formats";
  return "reference";
}
