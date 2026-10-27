/** hipfire 0.4.4 release numbers. Every value is copied from the README "Measured performance (v0.4.4)" table and
 *  its "What's new in 0.4.4" section (v0.4.4 release notes and CHANGELOG 0.4.4), not recomputed. Each row is one
 *  measurement on the named date, fixture, card and build; none is a speed floor or a guarantee for other prompts,
 *  contexts or hosts. v0.4.4 was published 2026-10-27.
 */

import { REPO } from "./release041";
export { REPO };

export const RELEASE_TAG = "v0.4.4";
export const RELEASE_URL = `${REPO}/releases/tag/${RELEASE_TAG}`;
export const RELEASE_CHANGELOG = `${REPO}/blob/${RELEASE_TAG}/CHANGELOG.md`;
export const RELEASE_DATE = "2026-10-27";
export const INSTALL_CMD = "curl -fsSL https://hipfire.dev/install.sh | bash";

export interface MeasuredRow {
  id: string;
  card: string;
  model: string;
  fixture: string;
  result: string;
  date: string;
  build: string;
  source: string;
  /** Row is carried over from an earlier release and was not re-measured on 0.4.4. */
  notRemeasured?: boolean;
}

/** README "Measured performance (v0.4.4)" rows, in README order. */
export const measuredRows: MeasuredRow[] = [
  {
    id: "r9700-27b-spec",
    card: "R9700",
    model: "qwen3.8-27b.mq4-xts: AR (--spec off), native MTP head (--spec mtp), registry DFlash draft (--spec dflash)",
    fixture:
      "committed prompts humaneval_0_has_close_elements.txt (code, 134 tokens) and fiction_lighthouse.txt (prose, 44 tokens), bench --runs 5 --warmups 3 --backend noslots --workload stateless, 128 tokens, 3 fresh processes x 5 runs (median of 15)",
    result: "decode AR 41.2 (code and prose); DFlash 313.6 (code), 63.4 (prose); MTP 95.0 (code), 55.5 (prose)",
    date: "2026-10-27",
    build: "published v0.4.4 gfx1201 binary archive (tag 75c28fc064)",
    source: "v0.4.4 release-binary bench",
  },
  {
    id: "r9700-27b-prefill",
    card: "R9700",
    model: "qwen3.8-27b.mq4-xts, AR, fp8 KV",
    fixture: "bench --matrix --spec off --pp 512,2048,16384, 3 fresh processes x 5 runs",
    result: "prefill 4,936 (pp512), 5,278 (pp2048), 4,888 (pp16384)",
    date: "2026-10-27",
    build: "published v0.4.4 gfx1201 binary archive",
    source: "v0.4.4 release-binary bench",
  },
  {
    id: "r9700-27b-dflash-longctx",
    card: "R9700",
    model: "qwen3.8-27b.mq4-xts + registry DFlash draft, fp8 KV, native-fp8 split-KV verifier (default)",
    fixture: "serve battery long turns, 1,024 max tokens, 3 fresh processes per arm",
    result: "decode 59.60 (16K), 51.40 (32K), 43.37 (64K), 33.70 (128K)",
    date: "2026-10-26",
    build: "0.4.4 cycle beta",
    source: "CHANGELOG 0.4.4 (#921, #922)",
  },
  {
    id: "xtx-27b-mtp",
    card: "7900 XTX",
    model: "qwen3.8-27b.mq4-xts + native MTP, Q8 KV (#987 + #989 + #998)",
    fixture: "committed mtpfloor prompts, bench --spec mtp, 256 tokens, fresh-process ABBA",
    result:
      "decode 136.5-136.8 (code 1K), 141.1 (prose 1K), 129.5-129.9 (code 32K), 79.7-80.1 (prose 32K)",
    date: "2026-10-26",
    build: "beta 085dd189b5 + #998",
    source: "#998 merge gate (speedups in release notes 0.4.4)",
  },
  {
    id: "halo-27b-dflash",
    card: "Strix Halo",
    model: "qwen3.8-27b.mq4-xts + paired DFlash draft",
    fixture: "committed merge_sort_thinking_off code prompt, bench, 256 tokens, 3 fresh processes",
    result: "decode 135.3",
    date: "2026-10-13",
    build: "v0.4.2 (not re-measured on 0.4.4)",
    source: "CHANGELOG 0.4.2",
    notRemeasured: true,
  },
  {
    id: "r9700-flash-mtp",
    card: "R9700",
    model: "qwen3.8-flash-next-gptq3.mq4 (monolith, q4 PLE), native MTP, decode-share",
    fixture: "11-prompt MTP suite and bench --matrix, 3 rounds of fresh processes",
    result: "decode 61.82 (MTP suite); pp16384 6,677.5",
    date: "2026-10-27",
    build: "v0.4.4 RC2 (125b2b5ca9)",
    source: "release notes 0.4.4",
  },
  {
    id: "r9700-flash-base",
    card: "R9700",
    model:
      "qwen3.8-flash-next-base.mq4-xts (split base, the qwen3.8:flash-next pull), hot set, q4 PLE rows: AR (--spec off) and native MTP (--spec mtp, which runs MTP + n-gram)",
    fixture:
      "committed prompts humaneval_0_has_close_elements.txt (code) and fiction_lighthouse.txt (prose), bench --runs 5 --warmups 3, 640 tokens, 3 fresh processes x 5 runs; pp16384 from bench --matrix --spec off",
    result: "decode AR 49.7 (code), 45.6 (prose); MTP 82.9 (code), 48.5 (prose); prefill 6,647.8 (pp16384)",
    date: "2026-10-27",
    build: "published v0.4.4 gfx1201 binary archive",
    source: "v0.4.4 release-binary bench",
  },
  {
    id: "halo-flash-npu",
    card: "Strix Halo + XDNA2",
    model: "qwen3.8-flash-next-gptq3.mq4 (monolith, q4 PLE, trunk overlay, NPU trunk auto)",
    fixture: "16,355-token prompt, cold serve TTFT, 3 fresh processes x 3 requests",
    result: "prefill 2,472.7 (TTFT 6.61 s)",
    date: "2026-10-27",
    build: "v0.4.4 release head 943b5323da",
    source: "v0.4.4 Halo 16K release gate",
  },
  {
    id: "r9700-a3b",
    card: "R9700",
    model: "qwen3.6:35b-a3b-mq4rs, AR",
    fixture: "bench --matrix --spec off --pp 512,4096,16384 --tg 128 --ctx 128, 3 fresh processes x 5 runs",
    result: "prefill 11,788 (pp512), 19,867 (pp4096), 18,567 (pp16384); decode 242.2 (tg128 at 128 context)",
    date: "2026-10-27",
    build: "published v0.4.4 gfx1201 binary archive",
    source: "v0.4.4 release-binary bench",
  },
  {
    id: "r9700-tp",
    card: "2x / 4x R9700",
    model: "qwen3.8-27b.mq4-xts, dense TP on the mesh route",
    fixture: "bench --matrix --spec off, 3 fresh processes",
    result: "TP2 pp2048 3,358.5, decode 54.89; TP4 pp2048 2,113.4, decode 51.77 (128 context)",
    date: "2026-10-26",
    build: "TP2 beta 3385df7ea5, TP4 the #927 pre-land build",
    source: "release notes 0.4.4, docs/multi-gpu.md",
  },
];

export const row = (id: string) => measuredRows.find((r) => r.id === id)!;

export const tableNotes = [
  "qwen3.6:35b-a3b-mq4rs loads on gfx1201 only.",
  "Flash-Next on a 24 GB card (7900 XTX) runs with host-mapped experts, so its speed depends on the host link; no v0.4.4 measurement of it is listed here.",
];

export interface WhatsNewItem {
  title: string;
  /** Short text; figures and NUMERIC / byte-identical caveats as in the README. */
  points: string[];
}

/** README "What's new in 0.4.4" bullets, shortened. Each figure is a measurement on one named fixture and card,
 *  not a general throughput claim. */
export const whatsNew: WhatsNewItem[] = [
  {
    title: "7900 XTX (gfx1100) speculative decode is faster",
    points: [
      "Two PRs and a draft change by @Ben1078, default on for exact gfx1100, all NUMERIC, not byte-identical. One 7900 XTX, qwen3.8-27b.mq4-xts, hipfire bench --spec mtp, Q8 KV, 256 tokens, fresh-process ABBA.",
      "#987, an int8-activation GEMV for 2..=5-row verify (maintainer gate): decode code-1k 104.7 to 127.4 tok/s (1.217x), prose-1k 106.7 to 131.1 (1.229x), code-32k 81.8 to 95.5 (1.168x), prose-32k 51.7 to 58.9 (1.139x). Off: HIPFIRE_GFX1100_Q8X_VERIFY=0.",
      "#989, a WMMA split-K verify attention (stacked figures are the maintainer gate): stacked on #987, code 32K 95.7 to 121.2 tok/s (1.27x) and prose 32K 59.0 to 73.3 (1.24x), 1K neutral. Off: HIPFIRE_GFX1100_WMMA_VERIFY_ATTN=0.",
      "#998, an MTP draft over a 65,536-token vocabulary subset: a further 1.074x to 1.094x decode at 1K and 32K stacked on the other two, measured on the 27B at up to 39K context only. Greedy MTP text matches beta on 3 of 4 mtpfloor prompts. Off: HIPFIRE_GFX1100_DRAFT_VOCAB=0.",
    ],
  },
  {
    title: "Dense serve --tp N loads the generic mesh executor by default",
    points: [
      "Qwen3.5/3.6/3.8 dense, #927; HIPFIRE_DENSE_TP_ROUTE=hand restores the hand route. Maintainer-measured on 4x R9700, qwen3.8-27b.mq4-xts, bench --matrix --spec off, 3 fresh processes per arm, mesh vs hand route.",
      "TP2 (2026-10-26, beta 3385df7ea5): pp512 2,866.9 to 3,293.4 tok/s (+14.9%), pp2048 2,746.1 to 3,358.5 (+22.3%); decode matches the hand route (54.89 vs 54.95 tok/s at 128 context, 54.19 vs 54.24 at 4K).",
      "TP4 (2026-10-26, the #927 pre-land build, before the rank-0 LM head): pp512 1,919.4 to 2,061.0 (+7.4%), pp2048 1,997.4 to 2,113.4 (+5.8%), decode 43.96 to 51.77 tok/s (+17.8%) at 128 context.",
      "TP2 prompts of 16 and 32 tokens prefill 2.5% to 3.3% slower than on the hand route (pp16 479.6 vs 496.2 tok/s). speculation.mtp = on and uneven TP3/TP5 splits still take the hand route.",
    ],
  },
  {
    title: "Vision is on by default with a streamed tower",
    points: [
      "vision_mode now defaults to auto: a present vision sidecar is loaded and the Qwen3.5/3.8-VL tower streams from host per block, so a vision load costs about 128-142 MiB of idle VRAM instead of about 0.94 GiB (vision_mode=resident keeps the whole-tower upload; hipfire config set vision_mode off restores the text-only load).",
      "Image turns prefill in batched chunks: on the R9700 (qwen3.8-27b.mq4-xts + vision, 1024x1024, HTTP TTFT, greedy) TTFT goes from 37.3 s to 0.51 s. Streamed-tower TTFT is 0.81 s on the 7900 XTX and 1.84 s on Strix Halo.",
      "Batched image prefill is numeric; the tower GEMM is bit-identical and the streamed embeddings are byte-identical to the resident path on gfx1201.",
    ],
  },
  {
    title: "LLaMA-arch models prefill in batched chunks",
    points: [
      "LLaMA, Mistral, SmolLM2 (#982), numeric rather than byte-identical (HIPFIRE_PREFILL_BATCHED=0 restores per-token). Maintainer gate: SmolLM2-360M mq4v1 on gfx1201, 148 to 3,705 tok/s at 1,169 tokens; Llama-3.2-1B HFQ4G256 on a 7900 XTX (gfx1100), 463 to 8,130 tok/s.",
      "A head_dim-64 Q8 flash decode tile (#978, also numeric) removes the decode fall-off with context for SmolLM2 and Llama-3.2-1B. MQ4G256V2 (.mq4) LLaMA-arch files still prefill per token.",
    ],
  },
  {
    title: "Strix Halo (gfx1151) wave",
    points: [
      "@fivetide, @HUSRCF. Contributor-measured on Strix Halo: Qwen3-8B (qwen3-8b.mq4, 7,741-token prompt) DFlash prefill 538 s to 13.1 s and decode 7.4 to 20.8 tok/s (#958); 9B DFlash 2K 45.7 to 59.6 tok/s and 4K 36.0 to 56.5, byte-identical to the previous build (#961, #962, shared box, indicative).",
      "Flash-Next prefill gains (persistent HC-up v2, fused HC-down, one-pass MoE front) are byte-identical by GPU oracle, default on, with kill switches in the CHANGELOG. Qwen3-8B DFlash stays slower than AR at tau 0.2-0.8, so AR remains the faster choice there.",
      "A Flash-Next reload is no longer refused for RAM left in the TTM page pool, and hipfire pull no longer downloads the 305.5 MB trunk overlay on a host that will not apply it.",
    ],
  },
  {
    title: "Flash-Next on the R9700: decode-share is on by default",
    points: [
      "Admitted loads only; byte-identical; HIPFIRE_QWEN4_DECODE_SHARE=off disables it. One R9700, 3 rounds of fresh processes per arm: MTP decode 61.82 vs 51.14 tok/s with it off (+20.9%), pp16384 6,677.5 vs 6,686.7 (-0.1%). The second token after a 16K prompt takes 78.7 ms instead of 22.7 ms. The 0.4.3 Flash-Next defaults (16,384-row chunk, hot set) are unchanged.",
      "On one R9700 (split base, 3 fresh processes per arm, 2026-10-26) the hot set makes --spec auto decode on real text 34% to 50% faster than HIPFIRE_QWEN4_EXPERT_HOTSET=0 (prose 49.7 vs 37.2 tok/s, code 80.6 vs 55.2 and 78.6 vs 52.4) at equal pp16384 (6,648 vs 6,646 tok/s); it costs 4.2% at pp512 and 4.8% on synthetic random-id tg128.",
      "Against HIPFIRE_PREFILL_CHUNK_ROWS=4096, the 16,384-row chunk is 25.7% faster at pp16384 (6,648 vs 5,288 tok/s) and 1.9% to 3.7% slower on real-text --spec auto decode, so a 4,096-row chunk only helps decode-bound workloads with short prompts.",
    ],
  },
  {
    title: "Long-context DFlash on the R9700: native-fp8 split-KV verifier is default on",
    points: [
      "Exact gfx1201 (#921, #922, @paleluna82-del; 27B-class H24/KV4/D256, fp8 KV, live context at or above 8,192, at most 16 verify rows; HIPFIRE_GFX12_FA2_SPLIT_VERIFY_FP8=0 turns it off).",
      "Maintainer-measured on one R9700, 27B mq4-xts with the registry DFlash draft, median over 3 fresh processes per arm: decode 16K 53.30 to 59.60 tok/s (+11.8%), 32K 40.40 to 51.40 (+27.2%), 64K 29.93 to 43.37 (+44.9%), 128K 18.93 to 33.70 (+78.0%); 4K is unchanged within noise. NUMERIC, not byte-identical (coherent output).",
    ],
  },
];

export const whatsNewIntro =
  "Every figure in this section comes from the v0.4.4 release notes and the CHANGELOG 0.4.4 entry. Each is a measurement on one named fixture and card, not a general throughput claim. Rows marked contributor-measured were not re-run by the maintainers on the contributor's card; the merge gates ran the build, the CPU tests and a smoke on a different card.";

export const upgradeNotes =
  "Greedy text can differ from 0.4.3.1 at near-ties because of the numeric changes above. Registry sampling for the Qwen3.5 and Qwen3.6-35B-A3B tags now defaults to presence_penalty 0.0 (was 1.5). The rest of the upgrade notes and known issues are in the CHANGELOG.";
