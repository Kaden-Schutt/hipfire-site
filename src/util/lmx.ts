// Live fetch of hipfire benchmark rows from localmaxxing.com.
// Runs at Astro build time. Reads are PUBLIC — no API key needed for the leaderboard.
//
// Cloudflare Pages must be able to reach localmaxxing.com at build time.
// If the API is unreachable, build fails — that's an intentional signal to
// fix the upstream before we ship a stale-data page.

export interface LmxRow {
  id: string;
  rank?: number;
  createdAt: string;
  contextLength: number | null;
  batchSize: number | null;
  promptTokens: number | null;
  outputTokens: number | null;
  ttftMs: number | null;
  tokSOut: number | null;
  tokSPrefill: number | null;
  tokSTotal: number | null;
  peakVramGb: number | null;
  notes: string | null;
  model: {
    hfId: string;
    displayName: string;
    family: string;
    params: number;
    isMoE?: boolean;
  };
  hardware: {
    hwClass: "DISCRETE_GPU" | "UNIFIED" | "CPU_ONLY";
    gpuName?: string | null;
    gpuCount?: number | null;
    vramGb?: number | null;
    chipVendor?: string | null;
    chipFamily?: string | null;
    chipVariant?: string | null;
    unifiedMemoryGb?: number | null;
    cpu?: string | null;
    os?: string | null;
  };
  engine: {
    engineName: string;
    engineVersion: string;
    quantization: string;
    backend?: string;
  };
  engineFlags: Record<string, unknown> & {
    specDecoding?: boolean;
    specMethod?: string;
    kvCacheDtype?: string;
    commandSnippet?: string;
  };
  user: { username: string; verified: boolean };
}

const ENDPOINT_BASE = "https://localmaxxing.com/api/leaderboard?engineName=hipfire&limit=200";

let cached: LmxRow[] | null = null;
let cachedAt = 0;

export async function fetchHipfireRows(): Promise<LmxRow[]> {
  // Astro build is short-lived; this cache just avoids duplicate fetches
  // when multiple pages call within one build.
  const now = Date.now();
  if (cached && now - cachedAt < 60_000) return cached;
  // Cache-bust to bypass Cloudflare's 4h CDN cache on the public leaderboard
  // endpoint — we want the latest approved rows at every build.
  const url = `${ENDPOINT_BASE}&_t=${Date.now()}`;
  const res = await fetch(url, {
    headers: {
      "user-agent": "hipfire-site-build/1.0",
      "cache-control": "no-cache",
    },
  });
  if (!res.ok) {
    throw new Error(`localmaxxing leaderboard fetch failed: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as { rows: LmxRow[]; total: number };
  cached = data.rows;
  cachedAt = now;
  return data.rows;
}

// Derive the gfx arch from hardware fields. Returns "gfx????" or "?".
export function archOf(row: LmxRow): string {
  const hw = row.hardware;
  const name = hw.gpuName ?? hw.chipVariant ?? hw.chipFamily ?? "";
  if (name.includes("5700")) return "gfx1010";
  if (name.includes("6950") || name.includes("6900")) return "gfx1030";
  if (name.includes("7900")) return "gfx1100";
  if (name.includes("8060") || name.includes("Strix")) return "gfx1151";
  if (name.includes("9070") || name.includes("R9700")) return "gfx1201";
  if (name.includes("MI300")) return "gfx942";
  if (name.includes("MI50") || name.includes("MI60") || name.includes("BC-250")) return "gfx906";
  return "?";
}

export function archGen(arch: string): string {
  return (
    {
      gfx1010: "RDNA 1",
      gfx1030: "RDNA 2",
      gfx1100: "RDNA 3",
      gfx1151: "RDNA 3.5",
      gfx1201: "RDNA 4",
      gfx942: "CDNA 3",
      gfx906: "Vega 20",
    }[arch] ?? arch
  );
}

// Pull a labelled set of fields from notes (free-form text per row).
// Looks for "τ: X.YYYY" / "accept_rate: X.YYYY" / "AR baseline ...: X tok/s — DFlash Yx".
export interface NotesParse {
  tau?: number;
  acceptRate?: number;
  arBaseline?: number;
  speedup?: number;
  promptMd5?: string;
}
export function parseNotes(notes: string | null): NotesParse {
  if (!notes) return {};
  const out: NotesParse = {};
  const tau = notes.match(/τ:\s*([\d.]+)/) ?? notes.match(/tau:\s*([\d.]+)/i);
  if (tau) out.tau = parseFloat(tau[1]);
  const acc = notes.match(/accept_rate:\s*([\d.]+)/);
  if (acc) out.acceptRate = parseFloat(acc[1]);
  const ar = notes.match(/AR baseline[^:]*:\s*([\d.]+)\s*tok\/s/i);
  if (ar) out.arBaseline = parseFloat(ar[1]);
  const sp = notes.match(/DFlash (?:speedup\s*)?([\d.]+)x/i);
  if (sp) out.speedup = parseFloat(sp[1]);
  const md = notes.match(/md5[=:]\s*([0-9a-f]{8,})/);
  if (md) out.promptMd5 = md[1];
  return out;
}

export function modeOf(row: LmxRow): "DFlash" | "MTP" | "AR" | "SPEC" {
  const ev = row.engineFlags ?? {};
  if ((ev as { mtpEnabled?: boolean }).mtpEnabled) return "MTP";
  if (ev.specDecoding) {
    const m = (ev.specMethod ?? "").toLowerCase();
    if (m.includes("dflash")) return "DFlash";
    return "SPEC";
  }
  return "AR";
}

export function hardwareLabel(row: LmxRow): string {
  const hw = row.hardware;
  if (hw.hwClass === "DISCRETE_GPU") return hw.gpuName ?? "?";
  if (hw.hwClass === "UNIFIED") {
    const parts = [hw.chipFamily, hw.chipVariant].filter((x) => x && x !== hw.chipFamily);
    return parts.length ? `${hw.chipFamily} (${parts.join(" ")})` : hw.chipFamily ?? "?";
  }
  return hw.cpu ?? "CPU";
}

// Bucket rows by arch, then sort each bucket by tokSOut desc.
export function bucketByArch(rows: LmxRow[]): Map<string, LmxRow[]> {
  const buckets = new Map<string, LmxRow[]>();
  for (const r of rows) {
    const a = archOf(r);
    if (!buckets.has(a)) buckets.set(a, []);
    buckets.get(a)!.push(r);
  }
  for (const v of buckets.values()) v.sort((x, y) => (y.tokSOut ?? 0) - (x.tokSOut ?? 0));
  return buckets;
}
