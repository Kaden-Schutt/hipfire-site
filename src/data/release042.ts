/** hipfire 0.4.2 release numbers. Every value names its source: a line of the v0.4.2 release notes
 *  (RELEASE-NOTES-0.4.2.md, published on the release page) or a receipt of the 0.4.2 Strix Halo release-matrix
 *  rerun. A `null` cell has no receipt yet and renders as TBD. Dated 2026-10-14 unless noted.
 */

import { REPO, haloCold as haloCold041, type Cell } from "./release041";
export { REPO };

export const RELEASE_TAG = "v0.4.2";
export const RELEASE_URL = `${REPO}/releases/tag/${RELEASE_TAG}`;
export const RELEASE_CHANGELOG = `${REPO}/blob/${RELEASE_TAG}/CHANGELOG.md`;
export const RELEASE_INSTALL_SCRIPT = `https://raw.githubusercontent.com/warpfront/hipfire/${RELEASE_TAG}/scripts/install.sh`;
export const NPU_TRUNK_DOC = `${REPO}/blob/${RELEASE_TAG}/docs/npu/npu-trunk.md`;
export const RELEASE_NOTES_SRC = "v0.4.2 release notes";

/** Canonical Flash-Next pin since 2026-10-02. `legacyFile` is a byte-identical alias (the 0.4.1 pages' "GPTQ3 MQ4"). */
export const flashNext = {
  tag: "qwen3.8:flash-next",
  file: "qwen3.8-flash-next.mq4-xts",
  legacyFile: "qwen3.8-flash-next-gptq3.mq4",
  bytes: 125288544792,
  sha256: "8b15b6fede7d7c5bfed0db4720a8295bedda51bc93e545fa242bd50d0f200972",
  hf: "https://huggingface.co/hipfire-models/qwen3.8-flash-next",
} as const;

// ── Headline: Strix Halo 16K prefill with the NPU trunk on ──────────────

export const npuHeadline = {
  date: "2026-10-14",
  tokens: 16355,
  ttftMs: 6854,
  tps: 2386,
  steadyTtftMs: 6849.5,
  gate: { build: "1be80ed54", tokens: 16356, ttftMs: 7085, tps: 2309, steadyTtftMs: 7079 },
  shippedTip: "6ea3f5076",
  deltaVsGatePct: -3.4,
  memlock: { pinnedBytes: 1053843456, limitBytes: 1318060032, ulimitKiB: 1287168 },
  source: "release notes, Headline numbers row 1 and § Strix Halo NPU trunk (j327 shipped-tip measurement)",
} as const;

/** `fusions.npu_trunk` off → auto, default serve config, 3 fresh processes per arm, median of per-process medians. */
export const npuAutoVsOff = {
  date: "2026-10-13",
  rows: [
    { prompt: "9,330 tokens", off: 4625, auto: 4319, pct: -6.6 },
    { prompt: "16K (16,355 tokens)", off: 7878, auto: 7085, pct: -10.1 },
    { prompt: "24,438 tokens", off: 11944, auto: 11159, pct: -6.6 },
    { prompt: "56K", off: 30047, auto: 27260, pct: -9.3 },
  ],
  source: "release notes § Strix Halo NPU trunk, off → auto table (CHANGELOG NPU trunk entry)",
} as const;

/** The two changes after the gate build, each measured interleaved, 3 fresh processes × 3 requests per arm, 16K. */
export const npuFollowUps = {
  hcFusion: { base: "93720b4fb", baseMs: 7194, candMs: 6896, baseTps: 2274, candTps: 2372 },
  plePrefetch: { baseMs: 7111, candMs: 7054, thpBackedPct: 44 },
  source: "release notes § Strix Halo NPU trunk, PLE prefetch and HC fusion paragraphs",
} as const;

// ── Strix Halo release-matrix rerun on v0.4.2 (same cells as 0.4.1) ─────

export const RECEIPT_DIR = "/home/kaden/qcal/release-0.4.2/rel-matrix-042/";

export interface MatrixCell {
  /** null until the receipt lands. */
  v042: Cell | null;
  v041: Cell;
  receipt: string | null;
}

/** Fresh-process medians of three repetitions, warm sample discarded; same protocol and prompts as 0.4.1. */
export const haloMatrix = {
  date: "2026-10-14",
  pp8192: { v042: null, v041: haloCold041.pp8192, receipt: null } as MatrixCell,
  /** 0.4.1 value copied from release041.ts haloCold (the 0.4.1 page's 32K prompt-file row). */
  prompt32k: { v042: null, v041: { median: 1776.5, min: 1776.3, max: 1780.3 }, receipt: null } as MatrixCell,
  decAr: { v042: null, v041: haloCold041.decAr, receipt: null } as MatrixCell,
  decMtp: { v042: null, v041: haloCold041.decMtp, receipt: null } as MatrixCell,
  decSampledMtp: { v042: null, v041: haloCold041.decSampledMtp, receipt: null } as MatrixCell,
  /** md5 of the 32K prompt file in the rerun's prompts/ directory (prompts/MD5SUMS). */
  prompt32kMd5: "3028a2c129301fe50d285927a3603299",
} as const;

// ── Other release-note headline rows (change-level campaigns, not the matrix) ──

export interface ChangeRow {
  change: string;
  hw: string;
  result: string;
  source: string;
}

export const changeRows: ChangeRow[] = [
  {
    change: "27B DFlash, exact 16-row verify GEMMs",
    hw: "Strix Halo · 27B mq4-xts + paired draft · 3 fresh processes per arm",
    result: "code 97.9 → 135.3 tok/s (+38.2 %); prose 19.0 → 26.3 tok/s; AR unchanged",
    source: "release notes, Headline numbers (CHANGELOG gfx1151 XLDS entry, 2026-10-13)",
  },
  {
    change: "27B paired DFlash by default",
    hw: "One R9700 · mq4-xts · C1 sampled, effort xhigh, 4,096-token cap · 3 fresh processes per arm",
    result: "44.00 → 74.49 tok/s (+69.3 %) vs MTP auto",
    source: "release notes, Headline numbers (CHANGELOG 27B DFlash default entry, 2026-10-12)",
  },
  {
    change: "DFlash width 8 on batching serves",
    hw: "One R9700 · 27B mq4-xts + MQ4V2 draft · 64 code prompts × 256, C8 steady greedy",
    result: "254.6 → 324.6 tok/s (+27.5 %); C1 114.8 → 107.8 (−6.1 %)",
    source: "release notes, Headline numbers (CHANGELOG speculation.dflash_block entry, 2026-10-11)",
  },
  {
    change: "IU4 verify at width 8 (separate campaign)",
    hw: "Same R9700 fixture · C8 steady greedy · 8 fresh processes per arm",
    result: "340.1 → 374.5 tok/s (+9.9 %); C1 −7.7 %",
    source: "release notes, Headline numbers (CHANGELOG DFlash IU4 verify entry, 2026-10-11)",
  },
  {
    change: "Flash-Next EP2 owner-routed prefill (opt-in EP)",
    hw: "2× R9700 · Flash-Next · committed prompts · 3 fresh processes per arm",
    result: "p8k / p16k: one card 3,033 / 3,754 → EP2 3,943 / 4,308 tok/s",
    source: "release notes, Headline numbers (CHANGELOG EP owner-routed prefill entry, 2026-10-13)",
  },
  {
    change: "Deep appends reuse the prompt",
    hw: "Strix Halo · Flash-Next · +512 tokens onto a 192K / 256K prompt",
    result: "9.3 → 141.8 / 4.7 → 197.5 tok/s",
    source: "release notes, Headline numbers (CHANGELOG deep-append entry, 2026-10-11)",
  },
  {
    change: "gfx1100 Qwen3.5-4B decode fusions (#845)",
    hw: "RX 7900 XTX · Qwen3.5-4B",
    result: "decode +5.5 % (MQ4), +3.0 % (MQ3), bit-identical",
    source: "release notes, Headline numbers (CHANGELOG #845 entry, 2026-10-13)",
  },
];

/** q4 PLE on Halo: 8K committed prompt, steady after the default prewarm, one run per cell. */
export const haloPleQ4 = {
  q4: 1828.4,
  q8Approx: 1599,
  source: "release notes, Headline numbers (CHANGELOG PLE sidecar entry, 2026-10-11)",
} as const;
