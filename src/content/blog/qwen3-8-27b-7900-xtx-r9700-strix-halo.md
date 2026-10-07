---
title: "Running Qwen3.8 27B on a Radeon RX 7900 XTX, R9700 and Strix Halo"
description: "Qwen3.8 27B on AMD GPUs with hipfire 0.4.1: measured tok/s on a 7900 XTX, R9700 and Strix Halo for AR, native MTP and DFlash, and how to enable each."
date: 2026-10-14
tags: ["qwen3.8-27b", "7900-xtx", "r9700", "strix-halo", "speculative-decoding", "benchmarks"]
draft: true
---

Qwen3.8 27B is the dense flagship in hipfire's model registry. Its `qwen3.8:27b-mq4-xts` build is a 14.99 GB 4-bit quantization (symmetric MQ4V2 XT) that wants a 24 GB+ card or Strix Halo. We measured it on three AMD GPUs with [hipfire 0.4.1](/blog/hipfire-0-4-1-local-agents-strix-halo): a **Radeon RX 7900 XTX** (gfx1100), a **Radeon AI PRO R9700** (gfx1201) and **Strix Halo** (gfx1151). Each GPU ran three decode modes: plain AR, native MTP and DFlash.

## The numbers

| GPU | Prefill, 8K prompt | Decode, AR | Decode, native MTP | Decode, DFlash |
|---|---:|---:|---:|---:|
| Radeon RX 7900 XTX | 3,021.5 tok/s | 51.63 tok/s | **87.52** tok/s (τ 2.415) | **131.69** tok/s (τ 7.234) |
| Radeon AI PRO R9700 | **5,166.1** tok/s | 41.06 tok/s | **67.95** tok/s (τ 2.355) | **123.30** tok/s (τ 7.154) |
| Strix Halo | 1,192.7 tok/s | 15.08 tok/s | **27.45** tok/s (τ 2.400) | **43.21** tok/s (τ 7.230) |

Measured on 2026-10-07 on the 0.4.1 release code. Each cell is the median of three fresh-process runs. Prefill is one 8,192-token prompt. Decode is eight fixed prompts, run greedily with up to 256 tokens each: a coding task, a short story, a factual answer, a HumanEval problem, an LRU cache, a copy-heavy code edit, an agentic tool call, and a long repeated prompt. τ is the average number of tokens emitted per pass of the 27B model. One of the three R9700 native-MTP runs was slow (55.66 tok/s) and is kept in the range. The [27B section of the benchmarks page](/benchmarks/0.4.1#flash-next-27b) has the model checksum and the protocol.

Relative to plain AR on the same GPU, that works out to:

| GPU | Native MTP | DFlash |
|---|---:|---:|
| Radeon RX 7900 XTX | 1.70× | 2.55× |
| Radeon AI PRO R9700 | 1.65× | 3.00× |
| Strix Halo | 1.82× | 2.87× |

## AR, MTP and DFlash in plain words

**AR (autoregressive)** is the baseline. The model runs one full forward pass for every token it writes. For a 27B model, decode speed is set mostly by how fast the GPU can stream the weights from memory, so it doesn't matter much how fast it can do math.

**Speculative decoding** guesses several tokens cheaply, then checks all of them in one pass of the big model and keeps the ones the big model agrees with. One pass can now produce several tokens. τ measures how many it produces on average. The two methods below differ in where the guesses come from.

**Native MTP** uses the model's own multi-token-prediction head, a 226 MB sidecar that the registry ships with the 27B. It drafts up to three tokens per step. On our prompt set it averages about 2.4 tokens per pass, which gives 1.65–1.82× AR decode. The head is small and comes with the model, so it's **on by default** once the sidecar is installed.

**DFlash** uses a separate small draft model (1.21 GB) that proposes a whole block of tokens at once. When the text is predictable, such as code, edits that copy existing text, or repeated context, most of the block is accepted. That gives τ above 7 on this set and up to 3.00× AR decode. On open-ended prose far fewer drafts are accepted. In earlier measurements on Qwen 3.5, a 27B gained only 1.00–1.13× on prose and instruction answers, and a 9B fell below AR (0.79×). That's why DFlash stays **opt-in**.

MTP's gain also depends on the prompt. Our model docs record native MTP on the R9700 at 1.09–1.65× AR on six of eight task genres, 0.96× on a tool answer and 0.95× on code editing. Measure your own workload before you pick. Greedy MTP output follows its own verifier and can differ from greedy AR output. The [speculative decoding explainer](/learn/speculative-decoding) covers the verify math.

## How to enable each

Pulling the model also fetches its MTP head and its DFlash draft:

```sh
hipfire pull qwen3.8:27b-mq4-xts
hipfire serve qwen3.8:27b-mq4-xts -d
```

**Native MTP** is now active. `mtp_mode` defaults to `auto`, so the next load speculates with the installed head. In the daemon log, look for `qwen35 MTP speculator enabled`.

**DFlash** is off until you turn it on. When a draft is loaded, DFlash takes over from MTP:

```sh
hipfire config set dflash_mode auto
```

`auto` uses the pulled draft when it's there and falls back to AR otherwise. `on` refuses to load without it. To scope it to one model, use `hipfire config qwen3.8:27b-mq4-xts set dflash_mode on`. The setting applies at load time, so restart the server (`hipfire stop`, then serve again) and watch for `DFlash draft loaded:` in the load output.

**Plain AR**, for a baseline or for a workload where speculation loses:

```sh
hipfire config set speculation off
```

The [configuration reference](/docs/config) lists every speculation key, and the [DFlash page](/docs/dflash) has more on the draft model.

## Which GPU for what

- **7900 XTX**: the fastest decode of the three, at 51.63 tok/s AR and 131.69 tok/s with DFlash.
- **R9700**: the fastest prefill, at 5,166.1 tok/s on an 8K prompt (1.71× the 7900 XTX), which matters for long agent contexts.
- **Strix Halo**: the slowest AR decode at 15.08 tok/s, but speculative decoding nearly triples it to 43.21 tok/s with DFlash. Its kernel pack covers both MTP and DFlash for this model with no compilation on first use.

The [RDNA & WMMA](/learn/rdna-wmma) page covers the hardware differences behind these numbers.

## One caveat: first-run compilation

The 0.4.1 kernel pack doesn't yet include every speculative-decode kernel for two of these GPUs. On the 7900 XTX, the first native-MTP or DFlash run compiles one missing verify kernel. On the R9700, the first DFlash run compiles eight helpers. The compiled kernels are cached, and the measured runs above reused that cache, so the numbers don't include compile time. Prefill and AR need no compilation on any of the three, and neither does anything on Strix Halo for this model.
