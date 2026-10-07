---
title: "hipfire 0.4.1: faster local agents on Strix Halo"
description: "hipfire 0.4.1 runs Qwen3.8-Flash agents locally on Strix Halo: sampled MTP with penalties, a multi-session prompt cache and HF-exact tokenization."
date: 2026-10-07
tags: ["release", "strix-halo", "qwen3.8-flash", "agents", "speculative-decoding"]
draft: false
---

[hipfire 0.4.1](https://github.com/warpfront/hipfire/releases/tag/v0.4.1) is out. This release targets one workload: running **Qwen3.8-Flash** (`qwen3.8:flash-next`) locally as an agent on AMD **Strix Halo**. Agent traffic is hard on an LLM engine. Requests are sampled, carry presence penalties, call tools, and come back again and again with long, mostly repeated prompts. 0.4.1 speeds up each of those cases.

Full tables, protocols and checksums are on the [0.4.1 benchmarks page](/benchmarks/0.4.1).

## What's new

### Speculative decoding for sampled requests, with penalties

Agent harnesses rarely decode greedily. Before 0.4.1, a request with temperature above zero ran plain autoregressive (AR) decode by default. Now Flash-Next's own MTP head drafts tokens for **sampled** requests too, and the target model verifies them by speculative rejection sampling. That keeps AR's sampling distribution, though not its exact seeded token stream. Repeat, presence and frequency penalties apply to both the target and the draft distributions. A GPU penalty prepass keeps the cost small: penalties are roughly free on AR and cost at most about 1.5 % on sampled MTP on Strix Halo.

Two safeguards come with it. N-gram takeovers let copy-heavy stretches draft from the prompt when that is measured to be cheaper. A same-request AR floor drops back to plain AR when no speculative option is measured to win. The details are in [Speculative decoding on RDNA](/learn/speculative-decoding).

### A session cache that keeps many prompts warm

An engine-owned session cache (8 GiB by default) keeps many prompts warm at once, so a second session or a sub-agent no longer evicts the first. It is built on **[@fivetide](https://github.com/fivetide)'s session-cache and message-end snapshot work (#825 / #826)**. Thank you. Snapshots taken at prefill-chunk boundaries are cold-exact and can serve other sessions. Live continuation inside one conversation is layered on top: it is session-exact, not identical to a cold prefill.

In our R9700 measurements, plain chat conversations and shared cross-session prefixes reused 68–78 % of their prompt tokens. Conversations that contain earlier tool calls do not hit the cache yet (see known limits below). [Session cache on a hybrid model](/learn/session-cache) explains how the cache works when part of the model is a recurrence. `HIPFIRE_SESSION_CACHE_BYTES=0` turns it off.

### Hugging Face-exact tokenization

Our byte-level BPE pre-tokenizer was missing Hugging Face's `\s+(?!\S)` whitespace rule, so indented text produced different token IDs than the reference tokenizer. 0.4.1 matches Hugging Face ID-for-ID on all 945 cases in our corpus (agent prompts, tool-use requests, benchmark prompts and synthetic whitespace cases). There is no switch for this. Prompt token IDs change for text with whitespace runs before non-space characters, so output for the same prompt will differ from older releases. [Tokenizer fidelity](/learn/tokenizer-fidelity) covers the details.

### Certified PeaceMaker kernels

The gathered QSA attention, its score/select step on Strix Halo, and the MQ6 trunk now run from [PeaceMaker](/learn/peacemaker)-built code objects. They are byte-for-byte replacements for the hipcc kernels they replace, and each has an opt-out. Two new defaults trade exactness for prefill speed and are KLD-gated rather than bit-exact: the dense GDN scan on the R9700 and symmetric IU4 MoE. Both have opt-outs listed in the [release notes](https://github.com/warpfront/hipfire/releases/tag/v0.4.1).

## The numbers: Qwen3.8-Flash on Strix Halo

Measured on the 0.4.1 release code on Strix Halo (gfx1151) with release defaults.

| Workload | Result |
|---|---:|
| TC70–84 tool-use panel, sampled, median of 3 seeds | **23/30** in 162.9 s |
| Hermes-20 agent suite, pass 1 | **95** (18/20) in 729.8 s |
| Hermes-20 agent suite, pass 2 | **96** (18/20) in 782.0 s |
| Prefill, synthetic 8K prompt | **2,072.9** tok/s |
| Cold prefill, 32K prompt | **1,776.5** tok/s |
| Decode, greedy AR | 33.8 tok/s |
| Decode, greedy native MTP | **58.7** tok/s |
| Decode, sampled native MTP with presence penalty | **57.0** tok/s |

Prefill and decode cells are medians of three fresh processes. One of the three sampled-MTP runs was slow (45.6 tok/s), so that cell's range is wide. On these cells greedy native MTP decodes 1.74× faster than AR. The sampled TC panel uses temperature 0.7, top-p 0.8, top-k 20 and presence penalty 1.5. Hermes runs with thinking on, one run per pass, and its scores move by several points from run to run. TC and Hermes seconds are summed per-scenario and per-case wall time. See [Strix Halo agent tasks](/benchmarks/0.4.1#flash-next-halo) for seeds and reproduction commands.

On a **Radeon AI PRO R9700** (gfx1201), the same artifact reached 3,817.0 tok/s prefill on the synthetic 8K prompt, 34.9 tok/s greedy AR, 40.7 tok/s greedy native MTP and 41.1 tok/s sampled MTP. Those cells were measured on an earlier 0.4.1 build and not repeated on the final one ([R9700 section](/benchmarks/0.4.1#flash-next-r9700)).

## Qwen3.8 27B on three GPUs

The dense **Qwen3.8 27B** (`qwen3.8:27b-mq4-xts`) was measured on a Radeon RX 7900 XTX, an R9700 and Strix Halo. On the 7900 XTX it decodes at 51.6 tok/s with plain AR, 87.5 tok/s with native MTP (the default once its MTP head is installed) and 131.7 tok/s with the opt-in DFlash draft, on our eight-prompt greedy set. The per-GPU table is in the [27B section](/benchmarks/0.4.1#flash-next-27b).

## Known limits

- **Two tool-use scenarios fail.** TC-75 and TC-76 score 0 on every sampled seed, including with the cache off.
- **Tool-call conversations don't reuse the session cache yet.** A turn whose history contains earlier tool calls is re-rendered differently from the cached record, so it gets no live continuation. The TC numbers above therefore include no cache speedup.
- **A greedy chain can end inside its reasoning.** In a five-turn greedy chain, turn 4 can close the turn before closing its reasoning, which leaves an empty answer. This is deterministic and identical with MTP on or off and with the cache off, so it is the model's trajectory, not cache state.
- **27B kernel packs.** The first speculative run on the 7900 XTX, and the first DFlash run on the R9700, compile kernels that the 0.4.1 pack does not include yet. Later runs reuse the cache.
- **Deprecations.** PFlash and CASK/TriAttention are deprecated and scheduled for removal in 0.5.0. Use the session cache instead of PFlash.

## Get it

```sh
curl -L https://raw.githubusercontent.com/warpfront/hipfire/v0.4.1/scripts/install.sh | bash
hipfire pull qwen3.8:flash-next
hipfire serve qwen3.8:flash-next
```

Upgrading from an earlier release:

```sh
hipfire stop
hipfire update
hipfire pull qwen3.8:flash-next
hipfire serve qwen3.8:flash-next
```

Re-pulling `qwen3.8:flash-next` fetches the new symmetric GPTQ3 artifact. Serve by tag as shown. If you serve a file whose name or path contains "gpt", the Hermes harness injects GPT-specific prompt blocks.

## Thanks

Outside contributors to this release: **@fivetide** (the Flash-Next/QSA series, fixes, and the session-cache work this release's prompt reuse is built on), **@HUSRCF** (the packed-Q8 split-KV verifier and the 7900 XTX 27B specialization), **@ghazni101** (decode timings, the browser UI and multi-slot reasoning), **@aldrouil** (legacy 6-bit residual dispatch) and **@alpineQ** (dense tensor-parallel MTP).

## Next

0.4.2 is about more prefill and decode speed on Strix Halo. We'll publish numbers once they're measured.
