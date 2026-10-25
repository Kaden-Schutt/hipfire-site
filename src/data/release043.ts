/** hipfire 0.4.3 / 0.4.3.1 release numbers. Every value names its source: a line of the v0.4.3 or v0.4.3.1 release
 *  notes (published on the GitHub release pages) or the receipt of the RC gate / A3B comparison that backs it. Figures
 *  are copied from those sources, not recomputed; where a row is the sum or sequence of separate sessions it says so.
 *  v0.4.3 and v0.4.3.1 were released 2026-10-24.
 */

import { REPO } from "./release041";
export { REPO };

export const RELEASE_TAG = "v0.4.3";
export const PATCH_TAG = "v0.4.3.1";
export const RELEASE_URL = `${REPO}/releases/tag/${RELEASE_TAG}`;
export const PATCH_URL = `${REPO}/releases/tag/${PATCH_TAG}`;
export const RELEASE_CHANGELOG = `${REPO}/blob/${RELEASE_TAG}/CHANGELOG.md`;
export const PATCH_CHANGELOG = `${REPO}/blob/${PATCH_TAG}/CHANGELOG.md`;
// Master holds the latest release; its install.sh defaults to the latest release tag + prebuilt kernel pack.
export const RELEASE_INSTALL_SCRIPT = "https://raw.githubusercontent.com/warpfront/hipfire/master/scripts/install.sh";
export const RELEASE_DATE = "2026-10-24";

// ── A3B: Qwen3.6-35B-A3B on one R9700 ───────────────────────────────────

export const a3bFile = {
  mq4rsTag: "qwen3.6:35b-a3b-mq4rs",
  mq4rTag: "qwen3.6:35b-a3b-mq4r",
  mq4rsSha256: "8806a742d558ebe43256010096cd82cfac3a20be5218ad56a3f74267db001894",
  mq4rSha256: "4685c140c46b1a6f31a0fd9053bf09d5faf1d2529d715b84794249b66cde0428",
  mq4rsGb: 18.7,
  hf: "https://huggingface.co/hipfire-models/qwen3.6-35b-a3b",
  kldMq4rs: 0.129,
  kldMq4r: 0.206,
} as const;

export interface A3bPrefillRow {
  pp: number;
  v042_mq4r: number;
  v043_mq4r: number;
  v043_mq4rs: number;
  /** 0.4.3 mq4rs over 0.4.2.1 mq4r. */
  speedup: number;
  /** 0.4.3 mq4r over 0.4.2.1 mq4r (same file). */
  engineOnly: number;
  /** 0.4.3 mq4rs over 0.4.3 mq4r (same engine). */
  quantOnly: number;
}

/** Card B (R9700, gfx1201, Gen5 x16), one fabric timing hold (job j3197), 2026-10-24. Median of 9 samples per cell
 *  (3 fresh processes × --runs 3). "0.4.2" is v0.4.2.1. Source: A3B-PREFILL-042-VS-043.md + the v0.4.3 release notes. */
export const a3bPrefill = {
  date: "2026-10-24",
  card: "R9700 (gfx1201, card B)",
  job: "j3197",
  command:
    "hipfire bench <model> --matrix --json --pp 512,1024,4096,8192,16384 --tg 1 --ctx 1 --runs 3 --warmups 1 --spec off",
  rcBuild: "1851b72ce7",
  v042Build: "v0.4.2.1 (6b363a56a1ae)",
  rows: [
    { pp: 512, v042_mq4r: 3292, v043_mq4r: 3332, v043_mq4rs: 11589, speedup: 3.52, engineOnly: 1.01, quantOnly: 3.48 },
    { pp: 1024, v042_mq4r: 3248, v043_mq4r: 3607, v043_mq4rs: 15718, speedup: 4.84, engineOnly: 1.11, quantOnly: 4.36 },
    { pp: 4096, v042_mq4r: 2886, v043_mq4r: 3737, v043_mq4rs: 19828, speedup: 6.87, engineOnly: 1.29, quantOnly: 5.31 },
    { pp: 8192, v042_mq4r: 2488, v043_mq4r: 3615, v043_mq4rs: 20035, speedup: 8.05, engineOnly: 1.45, quantOnly: 5.54 },
    { pp: 16384, v042_mq4r: 1957, v043_mq4r: 3561, v043_mq4rs: 18545, speedup: 9.47, engineOnly: 1.82, quantOnly: 5.21 },
  ] satisfies A3bPrefillRow[],
  /** pp16000 on qwen3.6-35b-a3b-d53.mq4rs only, three separate same-session A/Bs, 3 fresh processes per arm. */
  levers: [
    { from: 16084.5, to: 16694.8, pct: 3.8 },
    { from: 16670.6, to: 18021.6, pct: 8.1 },
    { from: 18341.9, to: 18587.9, pct: 1.3 },
  ],
  leverSumPct: 15.6,
  /** WikiText-2 prefill KLD on the asymmetric mq4r file after the 0.4.3 prefill levers. */
  mq4rKldPrefill: { before: 0.2082, after: 0.2115, delta: 0.0034, ci: "[+0.0009, +0.0058]" },
  source: "v0.4.3 release notes, “Prefill perf comparison on Qwen3.6-35B-A3B”; receipt A3B-PREFILL-042-VS-043.md",
} as const;

/** Defaults each arm picked (observed in the .err logs), A3B-PREFILL-042-VS-043.md "Defaults each version picks". */
export const a3bDefaults = [
  { item: "KV (kv_mode=auto)", a: "q8 K and V", b: "fp8", c: "fp8" },
  { item: "prefill chunk", a: "512 rows", b: "8192 rows", c: "8192 rows" },
  { item: "MoE prefill route", a: "per-expert buffers", b: "per-expert buffers", c: "symmetric IU4 MoE (40 layers admitted by capability)" },
] as const;

export interface A3bDecodeRow {
  label: string;
  hip: number;
  pm4: number;
  pct: number;
  /** Figures as printed in the release notes (e.g. "232" vs "217.0"). */
  hipTxt: string;
  pm4Txt: string;
}

/** v0.4.3.1: mq4rs decode takes the automatic PM4 replay route on gfx1201. Card B, `--spec off --matrix --pp 128
 *  --ctx 128,8192 --tg 128 --runs 3 --warmups 2`, default config both arms (HIP arm = `replay.backend = "hip"`),
 *  3 fresh processes per arm. Source: v0.4.3.1 release notes. */
export const a3bDecode = {
  card: "R9700 (gfx1201, card B)",
  command: "hipfire bench <model> --spec off --matrix --pp 128 --ctx 128,8192 --tg 128 --runs 3 --warmups 2",
  rows: [
    { label: "tg128, ctx 128", hip: 157, pm4: 232, pct: 48, hipTxt: "157", pm4Txt: "232" },
    { label: "tg128, ctx 8K", hip: 146.6, pm4: 217.0, pct: 48, hipTxt: "146.6", pm4Txt: "217.0" },
    { label: "1024-token reasoning generation", hip: 154, pm4: 225.0, pct: 46, hipTxt: "154", pm4Txt: "225.0" },
  ] satisfies A3bDecodeRow[],
  /** RC 130e3ab9a2 gate re-check, 2026-10-24, 3 fresh processes (tg128 ctx 128, then ctx 8192). */
  gate: {
    rc: "130e3ab9a2",
    date: "2026-10-24",
    ctx128: [231.4, 232.3, 231.9],
    ctx8192: [216.9, 217.2, 216.9],
    pp128: [5338, 5338, 5336],
    redlineLogitsHash: "330b2082fb49d5e7",
  },
  source: "v0.4.3.1 release notes (decode table); RC-GATES-0.4.3.1-RESULT.md §2",
} as const;

// ── Flash-Next on one R9700 (Qwen3.8-Flash) ─────────────────────────────

export interface ChangeRow043 {
  change: string;
  hw: string;
  result: string;
  quality?: string;
}

/** Change-level measurements from the v0.4.3 release notes “Headline numbers” table. Rows are not chained. */
export const flashNextRows: ChangeRow043[] = [
  {
    change: "MQ6 INT8 prefill, now default on gfx1201",
    hw: "One R9700 · Flash-Next · pp16384 at the 4096-row chunk · 3 fresh processes per arm",
    result: "4,720.5 → 4,899.3 tok/s (+3.8 %) against the previous F16 route",
    quality: "paired KLD change within the +0.010 budget on both corpora; byte-identical to the INT8 HIP route",
  },
  {
    change: "Compact forward scratch, now default on gfx1201 (4096-row chunk)",
    hw: "One R9700 (card A) · split base qwen3.8-flash-next-base.mq4-xts · hipfire bench --matrix pp16384, tg128 and --spec auto · 3 fresh processes per arm · full vs compact scratch, both at the 4096-row chunk",
    result:
      "Forward scratch 4,388 → 1,270 MiB; resident experts 6,948 → 8,234. pp16384 5,024 → 5,405 tok/s (+7.6 %); tg128 33.56 → 34.84 (+3.8 %); --spec auto prose 45.8 → 49.0 (+7.0 %), code 68.2 → 73.9 (+8.4 %)",
    quality: "byte-identical (kldseq, serve AR and MTP transcripts)",
  },
  {
    change: "Default prefill chunk is now 16,384 rows on gfx1201: faster prefill, slower decode",
    hw: "One R9700 (card A) · gptq3 monolith · pp16384, AR tg128 (synthetic random token ids, understates real-text decode) and --spec auto (fiction_lighthouse prose, humaneval_0_has_close_elements code) · 3 fresh processes per arm · 16,384-row vs 4096-row chunk, both with compact scratch",
    result:
      "pp16384 5,405 → 6,431 tok/s (+19.0 %). Decode costs: AR tg128 34.88 → 33.11 (−5.1 %); --spec auto prose 49.1 → 44.3 (−9.8 %), code 73.7 → 66.1 (−10.3 %); resident experts 8,234 → 6,578. HIPFIRE_PREFILL_CHUNK_ROWS=4096 restores the old decode speed",
    quality: "byte-identical (kldseq WT2 and code24, serve AR and MTP transcripts)",
  },
  {
    change: "Four exact-kernel prefill waves W1–W4 (default-on)",
    hw: "One R9700 (card B) · pp16384 at the 16,384-row chunk with compact scratch · 3 fresh processes per arm · each wave an interleaved same-session A/B",
    result:
      "W1 5,506.8 → 5,926.1 (+7.6 %); W2 5,903.9 → 6,028.8 (+2.1 %); W3 6,037.2 → 6,385.5 (+5.8 %); W4 6,380.1 → 6,449.8 (+1.1 %). Measured in separate sessions, not chained into one total",
    quality: "byte-identical kernels; Redline decode hash unchanged",
  },
];

export const hotSet = {
  mtpGainPct: "+14 % to +26 %",
  mtpProse: 14.4,
  mtpCoding: 26.3,
  mtpCodeEdit: -3.1,
  arGainPct: "+7 % to +40 %",
  prefillPct: 0.5,
  fixture:
    "card C, split base with and without the expert hot-set sidecar, 16,384-row default chunk, q4 PLE rows, 128 tokens, 3 fresh processes per arm",
  source: "v0.4.3 release notes, Highlights (HOTSET-DEFAULT-CHECK.md)",
  /** Earlier on/off table; the release notes mark it as measured before the scratch diet, W1–W4 and the 16,384 chunk. */
  earlier: [
    { vs: "vs hot set off, prefill 8K and 16K", change: "+18 % to +19 %" },
    { vs: "vs hot set off, short-context decode", change: "−9.5 %" },
    { vs: "vs hot set off, pp512", change: "−6 %" },
    { vs: "vs v0.4.2.1, long prefill (2K / 8K / 16K)", change: "+15 % to +23 %" },
    { vs: "vs v0.4.2.1, decode (ctx 128 to 20K)", change: "−3 % to −11 % (worst at ctx 128)" },
  ],
} as const;

// ── MTP decode in the RC gates ──────────────────────────────────────────

export interface MtpTurn {
  turn: string;
  tokens?: number;
  tau: number;
  mtp: number;
  ar: number;
}

/** RC 130e3ab9a2 (= v0.4.3 + 6 commits, shipped as v0.4.3.1), 2026-10-24. Serve battery: greedy, thinking off, 5
 *  turns, AR arm then --mtp auto with --compare-transcript. Correctness gate, not a benchmark matrix: one run. */
export const flashNextMtp = {
  rc: "130e3ab9a2",
  date: "2026-10-24",
  card: "R9700 (gfx1201, card A)",
  model: "qwen3.8-flash-next-gptq3.mq4 · q4 PLE · --kv fp8 · max-seq 8192 · 400 max tokens",
  transcriptIdentical: true,
  rows: [
    { turn: "merge_sorted (code)", tokens: 149, tau: 3.81, mtp: 77.1, ar: 50.9 },
    { turn: "distance word problem", tokens: 283, tau: 3.55, mtp: 62.8, ar: 42.9 },
    { turn: "seasons", tokens: 67, tau: 2.0, mtp: 63.4, ar: 48.3 },
    { turn: "lighthouse story", tokens: 112, tau: 1.11, mtp: 45.7, ar: 43.6 },
    { turn: "coding-practices list", tokens: 100, tau: 1.17, mtp: 48.0, ar: 44.4 },
  ] satisfies MtpTurn[],
  source: "RC-GATES-0.4.3.1-RESULT.md §5",
} as const;

/** Same RC, Qwen3.8-27B native MTP on gfx1201 (`--spec mtp` failed to load on v0.4.3; fixed in v0.4.3.1). */
export const mtp27b = {
  rc: "130e3ab9a2",
  date: "2026-10-24",
  card: "R9700 (gfx1201, card A)",
  model: "qwen3.8-27b.mq4-xts + qwen3.8-27b.mtp · KV fp8 · DeltaNet Q8 · K=3 · max tokens 400",
  rows: [
    { turn: "code", tau: 2.77, mtp: 66.7, ar: 40.5 },
    { turn: "reason", tau: 2.76, mtp: 78.7, ar: 40.7 },
    { turn: "factual", tau: 1.81, mtp: 55.9, ar: 34.6 },
    { turn: "prose", tau: 1.17, mtp: 48.0, ar: 40.4 },
    { turn: "instruct", tau: 1.63, mtp: 57.2, ar: 40.8 },
  ] satisfies MtpTurn[],
  source: "RC-GATES-0.4.3.1-RESULT.md §3",
} as const;

// ── Strix Halo (gfx1151 + XDNA2) ────────────────────────────────────────

/** Halo 16K gate, attempt 4 (the only fully measured one), RC head 9d74311a53, 2026-10-23. 16,355-token prompt,
 *  client TTFT, 3 fresh processes × 3 requests, all-9 median, method of job j1745 with the TTM-pool drain fixed. */
export const halo16k = {
  date: "2026-10-23",
  tokens: 16355,
  head: "9d74311a53",
  job: "j2148",
  median: 2365.6,
  gate: 2386,
  missPct: -0.9,
  samples: [
    [2314.2, 2404.9, 2403.4],
    [2316.0, 2406.8, 2404.5],
    [2208.9, 2350.9, 2365.6],
  ],
  steadyRange: "2,403–2,407",
  v042Shipped: 2386,
  /** 0.4.3.1 regression check, 2026-10-24, warm kernel caches, v0.4.3 control in the same hold sequence. */
  regression: {
    rc: "130e3ab9a2",
    date: "2026-10-24",
    rcRequests: [2300.9, 2390.1, 2357.4, 2323.0, 2397.9, 2393.6],
    controlRequests: [2311.9, 2396.6, 2397.8],
  },
  source: "v0.4.3 release notes, Headline numbers (last row) and Known issues; RC-GATES-0.4.3-RESULT.md (a); RC-GATES-0.4.3.1-RESULT.md §6",
} as const;

/** Halo figures measured by the contributor (@fivetide), not re-measured on Halo hardware by the release gates. */
export const haloContributor = [
  { change: "27B DFlash with a Q8_0 lm_head", result: "decodes 1.8× faster (the 16-row lm_head is 6× faster)", pr: "908" },
  { change: "Flash-Next 8-request AR throughput", result: "53.7 → 75 tok/s aggregate (lane promotion, two-launch GDN lanes, PeaceMaker row kernels)", pr: "909" },
  { change: "Flash-Next native-MTP decode", result: "+6 % from PeaceMaker multi-column verify kernels", pr: "930" },
  { change: "Flash-Next DFlash2, block 8, greedy", result: "42.5 → 52.0 tok/s (verifies only the draft's confident prefix)", pr: "930" },
] as const;

// ── Other measured changes ──────────────────────────────────────────────

export const otherRows: ChangeRow043[] = [
  {
    change: "Strix Halo GDN prefill NaN fix (repetitive prompts), final version",
    hw: "Strix Halo · 16K Flash-Next prefill · GDN chunk kernel time",
    result: "first fix 372 → 611 ms (+238 ms of a 16K prefill); final version 364.6 ms, below v0.4.2",
  },
  {
    change: "Strix Halo F32 GatedDeltaNet state by default",
    hw: "Flash-Next · KLD against BF16",
    result: "KLD improves by 0.0068 (code) and 0.0118 (WikiText-2 subset); cost within ±2 %. Text can differ from 0.4.2.1 on gfx1151",
  },
  {
    change: "Flash-Next prefill on a narrow PCIe link (7900 XTX at x4, 7.09 GB/s)",
    hw: "7900 XTX (gfx1100) · mq2 host experts · one hold, exact beta d8865a16b",
    result: "pp8192 265.1 → 931.9 tok/s (3.52×), at a cost of pp512 −14.4 % and decode −10.7 %",
  },
  {
    change: "7900 XTX layer-major S1 prefill path, base at pp16384",
    hw: "7900 XTX (gfx1100) · two fresh processes, six samples per arm · accepted with exception, not a release-gate statistic",
    result: "1,738.9–1,750.2 tok/s (about 1.87× beta, as published)",
  },
  {
    change: "Flash-Next load: expert-header page faults and CPU symmetry scan removed",
    hw: "Flash-Next load path (symmetry scan: gfx1201 compact-scratch default)",
    result: "CPU symmetry scan 8 s warm / 229–310 s cold → 0.1 ms; load phase 177.9 s → under 0.25 s on the affected path",
  },
  {
    change: "Default FA2 split-KV verifier on exact gfx1100",
    hw: "7900 XTX · contributor measurement (@HUSRCF, #894)",
    result: "+13.6 % DFlash",
  },
];

// ── New Flash-Next tiers ────────────────────────────────────────────────

export const tiers = [
  { tag: "qwen3.8:flash-next-mq3-xts", base: "59.1 GB", dl: "~88.2 / ~113.5 GB", what: "3-bit experts on 16,839 of 24,576 routed experts; the rest is the MQ4 XTS bytes", gpus: "R9700, Strix Halo" },
  { tag: "qwen3.8:flash-next-mq2-xts", base: "46.9 GB", dl: "~76.0 / ~101.3 GB", what: "6,306 experts stay 4-bit; 18,270 are 2-bit (E8P)", gpus: "7900 XTX, R9700" },
  { tag: "qwen3.8:flash-next-mq2-xts-4500", base: "44.5 GB", dl: "~73.7 / ~98.9 GB", what: "4,500 experts stay 4-bit; 20,076 are 2-bit (E8P)", gpus: "7900 XTX, R9700" },
] as const;

export const tierKld = { tier: "mq2-xts (6,306 hot experts)", gpu: "7900 XTX", corpus: "WikiText-2", kld: 0.1966 } as const;
