/** hipfire 0.4.1 release numbers: measurements from the 0.4.1 release matrix (see the v0.4.1 release notes
 *  for the exact build behind each cell). Cells not re-run on the final build say "measured on an earlier
 *  0.4.1 build" in the page copy. Dated 2026-10-07 unless noted.
 */

export const REPO = "https://github.com/warpfront/hipfire";
export const RELEASE_TAG = "v0.4.1";
export const RELEASE_URL = `${REPO}/releases/tag/${RELEASE_TAG}`;
export const RELEASE_CHANGELOG = `${REPO}/blob/${RELEASE_TAG}/CHANGELOG.md`;
export const RELEASE_INSTALL_SCRIPT = `https://raw.githubusercontent.com/warpfront/hipfire/${RELEASE_TAG}/scripts/install.sh`;

export const CIRU_BOARD_URL = "https://llm.ciru.ai/research/strix-showdown-20261001/";
export const CIRU_REPO_URL = "https://github.com/ciru-ai/strix-showdown-20261001";

// ── Strix Halo (gfx1151): agent tasks ───────────────────────────────────

export interface TcSeed {
  seed: number;
  points: number;
  seconds: number;
}

export const haloTc = {
  date: "2026-10-07",
  seeds: [
    { seed: 123, points: 23, seconds: 169.87 },
    { seed: 124, points: 24, seconds: 158.21 },
    { seed: 125, points: 21, seconds: 162.86 },
  ] satisfies TcSeed[],
  medianPoints: 23,
  medianSeconds: 162.86,
} as const;

/** Greedy TC panel (T0, top-k 1, 8 turns, 4096 tokens): one seed, earlier pre-release build. */
export const haloGreedy = { points: 21, seconds: 126.41, seed: 123 } as const;

export const haloHermes = {
  date: "2026-10-07",
  smoke: { score: 100, seconds: 58.16, note: "3/3" },
  p1: { score: 95, binary: "18/20", seconds: 729.79, calls: 89 },
  p2: { score: 96, binary: "18/20", seconds: 782.03, calls: 117 },
} as const;

// ── Strix Halo: cold prefill and decode (fresh-process medians of 3) ────

export interface Cell {
  median: number;
  min: number;
  max: number;
}

export const haloCold = {
  date: "2026-10-07",
  pp8192: { median: 2072.9, min: 2072.7, max: 2076.9 },
  ciru32k: { median: 1776.5, min: 1776.3, max: 1780.3 },
  decAr: { median: 33.78, min: 33.77, max: 33.88 },
  decMtp: { median: 58.67, min: 58.54, max: 58.76 },
  /** Sampled MTP, T0.7 / top-p 0.8 / top-k 20, presence penalty 1.5; one slow repetition at 45.55. */
  decSampledMtp: { median: 56.98, min: 45.55, max: 57.21 },
} as const;

// ── Radeon AI PRO R9700 (gfx1201, card B): Flash-Next, earlier pre-release build ──

export const r9700Fn = {
  date: "2026-10-07",
  pp8192: { median: 3817.0, min: 3801.6, max: 3819.9 },
  ciru8k: { median: 2082.6, min: 2078.0, max: 2087.8 },
  ciru32k: { median: 2051.3, min: 2047.6, max: 2053.6 },
  ciru128k: { median: 1814.6, min: 1811.9, max: 1816.5 },
  decAr: { median: 34.92, min: 34.88, max: 35.01 },
  decMtp: { median: 40.71, min: 40.12, max: 40.86 },
  decSampledMtp: { median: 41.09, min: 40.99, max: 41.62 },
  /** Single-seed evals on the same card (earlier pre-release build). */
  tc: { points: 24, seconds: 256.56 },
  hermesSmoke: { score: 100, seconds: 94.63, note: "3/3" },
} as const;

// ── 27B (Qwen3.8 27B MQ4 XTS): one row per GPU ──────────────────────────

/** tok/s medians of three fresh-process reps; decode = 8 committed prompts, greedy, 256 tokens. */
export interface Gpu27b {
  gpu: string;
  arch: string;
  pp8192: number;
  decAr: number;
  /** Native MTP (registry sidecar, K=3); the default when the sidecar is installed. */
  decMtp: number;
  tauMtp: number;
  /** DFlash draft (opt-in). */
  decDflash: number;
  tauDflash: number;
}

export const qwen27b = {
  date: "2026-10-07",
  tag: "qwen3.8:27b-mq4-xts",
  sha256: "3e38ccbae3776470eb5a89344d300e9279d6b9ab6c31fd40ca1758c4f7c6f8ae",
  bytes: 14987185152,
  gpus: [
    { gpu: "Radeon RX 7900 XTX", arch: "gfx1100", pp8192: 3021.5, decAr: 51.63, decMtp: 87.52, tauMtp: 2.415, decDflash: 131.69, tauDflash: 7.234 },
    { gpu: "Radeon AI PRO R9700", arch: "gfx1201", pp8192: 5166.1, decAr: 41.06, decMtp: 67.95, tauMtp: 2.355, decDflash: 123.3, tauDflash: 7.154 },
    { gpu: "Strix Halo", arch: "gfx1151", pp8192: 1192.7, decAr: 15.08, decMtp: 27.45, tauMtp: 2.4, decDflash: 43.21, tauDflash: 7.23 },
  ] satisfies Gpu27b[],
} as const;

/** R9700 27B DFlash split by prompt type: 0.4.1 serve path, greedy, chat template (thinking off), 256 tokens,
 *  single stream, tok/s medians of three fresh-process reps per prompt. Supplements the 8-mixed-prompt cell above. */
export const r9700Dflash27bByPrompt = {
  gpu: "Radeon AI PRO R9700",
  arch: "gfx1201",
  codeMedian: 238.7,
  proseMedian: 58.4,
  code: [
    { prompt: "code-edit copy", tps: 271.2 },
    { prompt: "merge sort", tps: 269.2 },
    { prompt: "glimmer coding", tps: 238.7 },
    { prompt: "HumanEval below_zero", tps: 229.2 },
    { prompt: "LRU cache", tps: 201.4 },
  ],
  prose: [{ prompt: "fiction", tps: 58.4 }],
} as const;

// ── Reproduce ───────────────────────────────────────────────────────────

export const flashNext = {
  tag: "qwen3.8:flash-next",
  file: "qwen3.8-flash-next-gptq3.mq4",
  bytes: 125288544792,
  sha256: "8b15b6fede7d7c5bfed0db4720a8295bedda51bc93e545fa242bd50d0f200972",
  md5: "be007fc3219e9f6cdb1d4dfa8380625f",
  hf: "https://huggingface.co/hipfire-models/qwen3.8-flash-next",
} as const;

/** Binaries the Strix Halo numbers were measured with (one build, both kernel packs). */
export const measuredBinaries = {
  daemon: "040e12ee04030c182277ba364c4dfc27",
  hipfire: "dacebd7d2a50eca134280c804ca9bfac",
} as const;
