/** Dated beta performance snapshots shared by the homepage and /docs/benchmarks.
 *  Fixture-scoped measured points only — beta optimization is continuous and
 *  numbers update frequently.
 */

export const ENGINE_REPO = "https://github.com/warpfront/hipfire";
export const ENGINE_BRANCH = "beta";
export const ENGINE_REPO_TREE = `${ENGINE_REPO}/tree/${ENGINE_BRANCH}`;
export const ENGINE_REPO_BLOB = `${ENGINE_REPO}/blob/${ENGINE_BRANCH}`;
export const ENGINE_INSTALL_SCRIPT =
  `https://raw.githubusercontent.com/warpfront/hipfire/${ENGINE_BRANCH}/scripts/install.sh`;

export const FRESHNESS_NOTE =
  "Optimization on the hipfire beta branch is continuous. Every figure below is fixture-scoped, and a date is shown only when its source carries a measurement date. These source-published snapshots are not immutable or lasting claims. Numbers update frequently. /docs/benchmarks is the build-time live ledger.";

export const HETEROGENEOUS_NOTE =
  "Rows are heterogeneous fixtures. Compare cells only when model, quant/mode, prompt, method, and backend match.";

// ── Qwen3.6 35B-A3B MQ4R (existing multi-arch AR snapshot) ──────────────

export interface Qwen36Row {
  gpu: string;
  arch: string;
  tg128Ar: number;
  eightTurnAvg: number;
  finalTurn: string;
}

export const qwen36Mq4r = {
  id: "qwen36-35b-a3b-mq4r",
  model: "Qwen3.6 35B-A3B",
  quant: "MQ4R",
  mode: "AR · Q8 KV",
  method:
    "Ordinary autoregressive decode, single GPU; no MTP, DFlash, reduced-output bench, or manual clock pinning. TG128 = three-run medians. Multi-turn columns from clean eight-turn serving runs.",
  sourceLabel: "beta README · Qwen3.6 35B-A3B MQ4R",
  sourceUrl: `${ENGINE_REPO_BLOB}/README.md#qwen-36-35b-a3b-mq4r-performance`,
  rows: [
    {
      gpu: "Radeon RX 7900 XTX",
      arch: "gfx1100",
      tg128Ar: 253.3,
      eightTurnAvg: 191.0,
      finalTurn: "160.3 @ 18.2K",
    },
    {
      gpu: "Radeon 8060S / Strix Halo",
      arch: "gfx1151",
      tg128Ar: 115.1,
      eightTurnAvg: 92.2,
      finalTurn: "82.5 @ 21.3K",
    },
    {
      gpu: "Radeon AI PRO R9700",
      arch: "gfx1201",
      tg128Ar: 203.9,
      eightTurnAvg: 169.5,
      finalTurn: "146.7 @ 22.2K",
    },
  ] satisfies Qwen36Row[],
} as const;

// ── Qwen3.8-27B MQ4V2 product ladder (2026-08-20, hiptrx gfx1201/R9700) ──

export interface Qwen38LadderRow {
  tier: "XT" | "Base" | "Pro";
  ar: number;
  prefill: number;
  dflash: number;
  tau: number;
  bpw: number;
}

export const qwen38Mq4v2 = {
  id: "qwen38-27b-mq4v2-2026-08-20",
  date: "2026-08-20",
  model: "Qwen3.8-27B",
  quant: "MQ4V2",
  fixture: "hiptrx · gfx1201 · Radeon AI PRO R9700",
  method:
    "Product-ladder checkpoint on the hiptrx gfx1201 / Radeon AI PRO R9700 fixture. AR decode, prefill, DFlash decode, mean accepted draft length (τ), and bits-per-weight.",
  sourcePath: "docs/perf-checkpoints/2026-08-20-qwen38-mq-v2-product-ladder.md",
  sourceLabel: "beta · 2026-08-20 Qwen3.8 MQ-V2 product ladder",
  sourceUrl: `${ENGINE_REPO_BLOB}/docs/perf-checkpoints/2026-08-20-qwen38-mq-v2-product-ladder.md`,
  /** Featured hero figure: Base tier DFlash on this fixture. */
  featured: {
    value: 263.3,
    unit: "tok/s",
    label: "DFlash decode",
    detail: "Qwen3.8-27B MQ4V2 Base · gfx1201 R9700 · 2026-08-20",
  },
  rows: [
    { tier: "XT", ar: 35.3, prefill: 490.7, dflash: 251.6, tau: 11.7, bpw: 4.456 },
    { tier: "Base", ar: 33.2, prefill: 479.0, dflash: 263.3, tau: 13.11, bpw: 4.659 },
    { tier: "Pro", ar: 31.8, prefill: 473.8, dflash: 258.2, tau: 13.11, bpw: 4.897 },
  ] satisfies Qwen38LadderRow[],
} as const;

// ── DeepSeek V4 Flash MQ2R multi-GPU (4× R9700) ─────────────────────────

export interface DeepSeekV4Row {
  topology: string;
  decode: number;
  prefill: number;
}

export const deepseekV4FlashMq2r = {
  id: "deepseek-v4-flash-mq2r-4xr9700",
  model: "DeepSeek V4 Flash",
  quant: "MQ2R",
  fixture: "4× Radeon AI PRO R9700 (gfx1201)",
  method:
    "n=3 fresh-process medians; greedy; speculative decode off; KV f32; 2052-token prompt.",
  sourceLabel: "beta README · RDNA4 gfx1201 R9700",
  sourceUrl: `${ENGINE_REPO_BLOB}/README.md#rdna4-gfx1201-radeon-ai-pro-r9700`,
  /** Featured hero figure: TP4/EP decode on this fixture. */
  featured: {
    value: 54.3,
    unit: "tok/s",
    label: "TP4/EP decode",
    detail: "DeepSeek V4 Flash MQ2R · 4× R9700 · TP4/EP",
  },
  rows: [
    { topology: "TP3/EP", decode: 53.1, prefill: 481 },
    { topology: "TP4/EP", decode: 54.3, prefill: 389 },
  ] satisfies DeepSeekV4Row[],
} as const;

/** Homepage hero cards — three independent fixtures, not cross-comparable. */
export const heroStats = [
  {
    value: qwen38Mq4v2.featured.value.toFixed(1),
    unitLabel: `${qwen38Mq4v2.featured.unit} ${qwen38Mq4v2.featured.label}`,
    sub: qwen38Mq4v2.featured.detail,
  },
  {
    value: deepseekV4FlashMq2r.featured.value.toFixed(1),
    unitLabel: `${deepseekV4FlashMq2r.featured.unit} ${deepseekV4FlashMq2r.featured.label}`,
    sub: deepseekV4FlashMq2r.featured.detail,
  },
  {
    value: qwen36Mq4r.rows[0].tg128Ar.toFixed(1),
    unitLabel: "tok/s AR on 7900 XTX",
    sub: `${qwen36Mq4r.model} ${qwen36Mq4r.quant} · ${qwen36Mq4r.mode} · gfx1100`,
  },
] as const;
