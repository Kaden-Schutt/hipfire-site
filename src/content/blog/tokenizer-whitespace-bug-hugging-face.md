---
title: "The tokenizer bug that cost our agents 250 seconds"
description: "One missing whitespace lookahead made our tokenizer split indentation differently from Hugging Face. How agent runs exposed it, the fix, and 969k tests."
date: 2026-10-21
tags: ["tokenizer", "hugging-face", "agents", "correctness", "testing"]
draft: true
---

While we were preparing [hipfire 0.4.1](/blog/hipfire-0-4-1-local-agents-strix-halo), one agent benchmark refused to make sense. On an earlier 0.4.1 build, pass 1 of the Hermes-20 agent suite on Strix Halo took **1,145 seconds and scored 92**. Decode speed wasn't the problem: pooled decode across the run was 49.1 tok/s. The time went into volume. The agent wrote 42,323 tokens over 138 requests. One case looped through 16 requests of searching, writing and re-reading files. In another, the agent's Python code failed with an `IndentationError` four times.

We expected a sampler or speculative-decoding bug. The real cause was a single regex alternative in our tokenizer.

## The bug: `\s+(?!\S)`

Byte-level BPE tokenizers (Qwen, Llama, DeepSeek and many others) run a regex "pre-tokenizer" before merging bytes into tokens. The Hugging Face pattern for these models ends with:

```text
\s+(?!\S)|\s+
```

The first alternative matches a whitespace run but leaves its **last** whitespace character behind when a non-space follows. That last space then attaches to the next word. Four spaces of indentation before `return` therefore become three spaces plus `" return"`, which is how the model's reference tokenizer splits it.

Rust's `regex` crate has no lookaround, and our pre-tokenizer had dropped the `(?!\S)` part. A code comment claimed the remaining `\s+` produced the same spans. It didn't. Using the real Qwen3.8 vocabulary:

| Text | Hugging Face IDs | Our old IDs |
|---|---|---|
| `a  b` (two spaces) | `[64, 220, 292]` | `[64, 256, 65]` |
| `\n    return 1\n` | `[198, 262, 460, 220, 16, 198]` | `[198, 257, 671, 220, 16, 198]` |

Decoding either sequence gives back identical text, which is why the bug went unnoticed. The model, though, received token sequences that its reference tokenizer never produces. In one captured agent request, an indented Docker Compose tool result tokenized as "four spaces + one space" under Hugging Face, and as a single five-space token under ours.

## How we proved it

We rebuilt all 138 prompts from the Hermes run and tokenized them with the model's own Hugging Face tokenizer:

| Comparison | Prompts |
|---|---:|
| Official Hugging Face token count equals what our server reported | **42 / 138** |
| Same tokenizer with only the lookahead removed: count equals ours | **138 / 138** |
| Token IDs differ between the two | **120 / 138** |

Removing that one alternative reproduced every count our server had reported. The total prompt-token difference was only 0.24 %, small enough to pass for noise. Counts were close, but the IDs were not.

## The fix

The 0.4.1 tokenizer reproduces the lookahead without regex lookaround. When a whitespace run is followed by a non-space, it hands the final whitespace character back to the next match. This is a linear scan with no extra allocation. The runtime now also reads the Split regex embedded in each model's `tokenizer.json`, rather than imposing one pattern on every byte-BPE model, and it honors the model's declared NFC normalizer.

We accept the fix only on exact token IDs, not counts. A committed corpus of **945 cases** covers all 138 Hermes prompts, the 55 TC requests plus 14 captured TC sessions, all 44 benchmark prompts and 694 synthetic whitespace and Unicode cases. It holds 868,076 reference tokens, and the new tokenizer matches Hugging Face `tokenizers` **ID-for-ID on 945 / 945**.

There is deliberately no switch. Every byte-BPE family goes through this path, so prompt token IDs in 0.4.1 change for any text with whitespace runs before non-space characters. Output for the same prompt won't match older releases. One reassuring check: all 55 TC tool-use prompts tokenized identically before and after, so earlier TC results were unaffected.

## What it did to the agent run

On the next 0.4.1 build with the fix, Hermes pass 1 scored **98 in 896.9 seconds**, down from 1,145.4. That's **248.5 seconds faster and 6 points higher**. The run produced 12,100 fewer output tokens and needed 115 requests instead of 138:

- The case that hit four `IndentationError`s hit none.
- The looping case went from 16 requests to 7, which saved 109 seconds.
- Three cases that had scored partial credit reached 100. One other case dropped to 85.

To be precise about attribution: these are two single runs, not a controlled A/B. Sampled agent trajectories vary from run to run. The fixed build also carried a session-cache change built on [@fivetide](https://github.com/fivetide)'s message-end snapshot work, so the 248 seconds can't all be credited to the tokenizer. Still, the timeline points to the tokenizer. Indentation errors disappeared, and the biggest savings came from code and file-editing loops getting shorter, not from faster decode.

The released 0.4.1 build later scored 95 in 729.8 seconds on the same pass. Single Hermes runs move by several points, so we report each run as measured. Full numbers are on the [0.4.1 benchmarks page](/benchmarks/0.4.1#flash-next-halo).

## After 0.4.1: testing against Hugging Face directly

A 945-case corpus proves the bug we found. It doesn't prove there are no others. So after 0.4.1 shipped, we built a **differential test**: Hugging Face `tokenizers` runs as a dev-only oracle, never a runtime dependency, and our tokenizer must match its IDs and round-trip decode exactly.

The test covers **19 shipped byte-BPE tokenizer families**, including Qwen2 through Qwen3.8 and Flash-Next, DeepSeek4, MiniMax, LFM2/2.5, Llama and dots.ocr. Each family runs the 945 corpus cases, the 44 benchmark prompts and 50,000 seeded adversarial inputs, about **969k cases** in total. The first run found four more bugs:

| Family | What was wrong | First-run mismatches |
|---|---|---:|
| MiniMax M2.5 / M2.7 | An inverted Split rule was ignored, so contractions like `n't` split wrongly | 3,886 / 3,768 |
| North-Mini-Code | Digit runs must group in threes from the right (`6789` → `6` `789`) | 18,365 |
| LFM2.5-MoE | `ignore_merges` means a whole pre-token in the vocabulary wins over BPE merges (` recursively`) | 82 |
| Qwen3.5 / Qwen3.8 | NFC normalization used newer Unicode tables than Hugging Face, reordering two rare combining marks | 1 each |

All four are fixed, and every family now runs with **zero mismatches**. Every distinct failing input is pinned as a regression case. Exactness didn't cost speed on normal prompts: encoding all 138 Hermes requests takes 418 ms single-threaded against 467 ms for Hugging Face `tokenizers`. Very long documents are still slower (299 ms against 211 ms at 256K tokens), and we're working on that.

**These four fixes and the differential test landed after 0.4.1 and aren't in the 0.4.1 binaries.** They ship with the next release. With the Flash-Next tokenizer, every case in our 945-case corpus was already exact in 0.4.1. The Qwen3.5/3.8 difference only appears on rare combining-mark sequences.

## What we took away

- **Compare token IDs, not decoded text and not counts.** Both looked fine while the model was reading different input.
- **Test against the reference directly.** A differential test with a fuzzer found four bugs that our hand-written tests had missed.
- **Look at the inputs before blaming the model.** Our first theories were about sampling and speculative decoding. The fix was one missing regex alternative.

The full write-up, with a worked indentation example, is in [Tokenizer fidelity](/learn/tokenizer-fidelity).
