/** Links for /learn pages. Every source link points at the v0.4.1 tag, never a moving branch. */
import { REPO, RELEASE_TAG, RELEASE_URL, RELEASE_CHANGELOG } from "./release041";

export const tagBlob = (path: string) => `${REPO}/blob/${RELEASE_TAG}/${path}`;
export const tagTree = (path = "") => `${REPO}/tree/${RELEASE_TAG}${path ? `/${path}` : ""}`;

export { RELEASE_URL, RELEASE_CHANGELOG };

/** The learn decks, in index order. `group` drives the index sections. */
export interface Deck {
  href: string;
  group: "release" | "silicon";
  tag: string;
  title: string;
  sub: string;
}

export const decks: Deck[] = [
  {
    href: "/learn/speculative-decoding",
    group: "release",
    tag: "Flash-Next · native MTP",
    title: "Speculative decoding on RDNA",
    sub: "Draft, verify, accept. Greedy and sampled MTP with lossless rejection sampling, penalties on every verify row, n-gram takeovers priced in milliseconds, and an AR floor.",
  },
  {
    href: "/learn/peacemaker",
    group: "release",
    tag: "kernels · certification",
    title: "PeaceMaker: certified kernels",
    sub: "hipfire's own kernel builder. Code objects written without a ROCm assembler, lifted back byte for byte, checked for wait, hazard and LDS bugs, and byte-identical to the hipcc kernels they replace.",
  },
  {
    href: "/learn/session-cache",
    group: "release",
    tag: "prompt reuse",
    title: "Session cache on a hybrid model",
    sub: "Reusing prefill when part of the model is a recurrence: snapshot chains at chunk boundaries, copy plus delta, cold-exact vs session-exact, and live continuation.",
  },
  {
    href: "/learn/tokenizer-fidelity",
    group: "release",
    tag: "tokenizer",
    title: "Tokenizer fidelity",
    sub: "One missing regex alternative, \\s+(?!\\S), changed how whitespace runs split. What it is, how 0.4.1 matches Hugging Face, and how that is tested.",
  },
  {
    href: "/learn/magnum-quant",
    group: "release",
    tag: "quantization · FWHT",
    title: "MagnumQuant and FWHT rotation",
    sub: "Why a Walsh-Hadamard rotation makes 4-bit weights behave, the V2 group layout, and how a symmetric grid lets Flash-Next's experts run on int4 WMMA.",
  },
  {
    href: "/learn/sparse-attention",
    group: "release",
    tag: "attention · memory",
    title: "QSA sparse attention and VMM KV",
    sub: "How Flash-Next attends to 2,048 selected tokens instead of the whole context, and how the VMM backend commits KV memory only as the context grows.",
  },
  {
    href: "/learn/rdna-wmma",
    group: "silicon",
    tag: "consumer / pro / APU",
    title: "RDNA & WMMA",
    sub: "wave32, the 16×16×16 WMMA tile on gfx11 and gfx12, occupancy, the memory ladder, and which WMMA instructions 0.4.1 actually issues on Strix Halo and the R9700.",
  },
  {
    href: "/learn/cdna-mfma",
    group: "silicon",
    tag: "data center",
    title: "CDNA & MFMA",
    sub: "wave64, MFMA tiles, HBM and the Infinity Fabric package, rocprofv3 counters, and where MFMA sits in hipfire today.",
  },
];
