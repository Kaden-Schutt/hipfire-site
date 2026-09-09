// Shared helpers for the docs collection. Live in a separate module because
// Astro's getStaticPaths runs in an isolated context and can't reference
// page-frontmatter-level functions.

export type NavGroupId =
  | "start"
  | "operate"
  | "understand"
  | "reference"
  | "formats"
  | "performance";

/** Fixed sidebar / nav group order from the public docs contract. */
export const NAV_GROUP_ORDER: readonly NavGroupId[] = [
  "start",
  "operate",
  "understand",
  "reference",
  "formats",
  "performance",
] as const;

/** Human labels for curated nav groups. */
export const NAV_GROUP_LABELS: Record<NavGroupId, string> = {
  start: "Start",
  operate: "Operate",
  understand: "Understand",
  reference: "Reference",
  formats: "Formats",
  performance: "Performance",
};

export type DocsNavEntry = {
  id: string;
  data: {
    title: string;
    navGroup: Exclude<NavGroupId, "performance">;
    navOrder: number;
  };
};

export type NavItem = {
  id: string;
  slug: string;
  title: string;
  href: string;
};

export type NavSection = {
  group: NavGroupId;
  label: string;
  items: NavItem[];
};

/** Manual performance destinations (custom Astro pages, not collection entries). */
export const PERFORMANCE_LINKS: readonly NavItem[] = [
  {
    id: "benchmarks",
    slug: "benchmarks",
    title: "Benchmarks",
    href: "/docs/benchmarks",
  },
  {
    id: "dflash",
    slug: "dflash",
    title: "DFlash",
    href: "/docs/dflash",
  },
] as const;

/** Lowercase path segments for public `/docs/...` routes; IDs keep source casing. */
export function toUrlSlug(id: string): string {
  return id
    .split("/")
    .map((p) => p.toLowerCase())
    .join("/");
}

export function githubSourceUrl(sourcePath: string): string {
  return `https://github.com/warpfront/hipfire/blob/beta/${sourcePath}`;
}

export function githubEditUrl(sourcePath: string): string {
  return `https://github.com/warpfront/hipfire/edit/beta/${sourcePath}`;
}

/** Build sidebar sections: curated entries by navGroup/navOrder, then performance. */
export function buildDocsNav(entries: DocsNavEntry[]): NavSection[] {
  const buckets: Record<Exclude<NavGroupId, "performance">, NavItem[]> = {
    start: [],
    operate: [],
    understand: [],
    reference: [],
    formats: [],
  };

  const sorted = [...entries].sort((a, b) => {
    const ga = NAV_GROUP_ORDER.indexOf(a.data.navGroup);
    const gb = NAV_GROUP_ORDER.indexOf(b.data.navGroup);
    if (ga !== gb) return ga - gb;
    if (a.data.navOrder !== b.data.navOrder) return a.data.navOrder - b.data.navOrder;
    return a.data.title.localeCompare(b.data.title);
  });

  for (const d of sorted) {
    const slug = toUrlSlug(d.id);
    buckets[d.data.navGroup].push({
      id: d.id,
      slug,
      title: d.data.title,
      href: `/docs/${slug}`,
    });
  }

  const sections: NavSection[] = [];
  for (const group of NAV_GROUP_ORDER) {
    if (group === "performance") {
      sections.push({
        group,
        label: NAV_GROUP_LABELS[group],
        items: [...PERFORMANCE_LINKS],
      });
      continue;
    }
    const items = buckets[group];
    if (items.length === 0) continue;
    sections.push({
      group,
      label: NAV_GROUP_LABELS[group],
      items,
    });
  }
  return sections;
}
