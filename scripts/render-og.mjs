// Renders the 1200×630 Open Graph / Twitter cards into public/og/ and writes
// src/data/og-cards.json (card path → alt text), which Base.astro reads to pick
// a page's og:image and fall back to the site default when a card is missing.
//
// Run ahead of time and commit the output; the site build never launches a browser:
//   PUPPETEER_MODULE=/abs/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js \
//   CHROMIUM_PATH=/abs/chrome bun scripts/render-og.mjs
// Install puppeteer-core in an isolated directory, not the site's runtime (same
// convention as scripts/export-terminal.mjs). Titles use Inter and numbers use
// JetBrains Mono, loaded from Google Fonts like the site; the run fails if either
// font is not loaded. Re-run after changing a blog title, a /learn deck or release041.ts.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { haloCold, qwen27b } from '../src/data/release041.ts';
import { decks } from '../src/data/learn.ts';

const ROOT = new URL('..', import.meta.url);
const OUT = new URL('public/og/', ROOT);
const MANIFEST = new URL('src/data/og-cards.json', ROOT);
const WIDTH = 1200;
const HEIGHT = 630;

const fmt = (n, digits = 0) =>
  n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// The hipfire mark without its black backing square, so it sits on the card background.
const markSvg = (await readFile(new URL('public/assets/hipfire-mark.svg', ROOT), 'utf8'))
  .replace(/<rect[^>]*\/>\s*/, '')
  .replace(/ role="img" aria-label="hipfire mark"/, ' aria-hidden="true"');

// ── Card list ───────────────────────────────────────────────────────────

const cards = [];

cards.push({
  path: '/og/default.png',
  alt: 'hipfire: Fast local LLMs on the AMD GPU you already own. hipfire.dev',
  kind: 'default',
  title: 'Fast local LLMs on the AMD GPU you already own.',
});

const xtx = qwen27b.gpus.find((g) => g.arch === 'gfx1100');
const r9700 = qwen27b.gpus.find((g) => g.arch === 'gfx1201');
const stats = [
  {
    value: fmt(haloCold.decMtp.median, 1),
    label: 'Qwen3.8-Flash output on Strix Halo',
    ctx: 'native MTP · median of 3 runs over 8 prompts',
  },
  {
    value: fmt(r9700.pp8192),
    label: 'Qwen3.8 27B prompt processing on Radeon AI PRO R9700',
    ctx: '8K-token prompt',
  },
  {
    value: fmt(xtx.decDflash, 1),
    label: 'Qwen3.8 27B output on Radeon RX 7900 XTX',
    ctx: 'opt-in DFlash draft',
  },
];
cards.push({
  path: '/og/benchmarks-0.4.1.png',
  alt: `hipfire 0.4.1 benchmarks: ${stats.map((s) => `${s.value} tok/s ${s.label} (${s.ctx})`).join('; ')}.`,
  kind: 'bench',
  stats,
});

// Published posts only: a draft's card would publish its title under /og/.
const blogDir = new URL('src/content/blog/', ROOT);
for (const file of (await readdir(blogDir)).filter((f) => /\.mdx?$/.test(f)).sort()) {
  const source = await readFile(new URL(file, blogDir), 'utf8');
  const front = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1];
  if (!front) throw new Error(`render-og: ${file} has no frontmatter.`);
  const field = (key) => {
    const raw = front.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1].trim();
    if (raw === undefined) return undefined;
    if (raw.startsWith('"')) return JSON.parse(raw);
    if (raw.startsWith("'")) return raw.slice(1, -1).replace(/''/g, "'");
    return raw;
  };
  if (field('draft') === 'true') continue;
  const title = field('title');
  const date = field('date');
  if (!title || !date) throw new Error(`render-og: ${file} needs title and date.`);
  const slug = file.replace(/\.mdx?$/, '');
  cards.push({
    path: `/og/blog/${slug}.png`,
    alt: `hipfire blog: ${title}`,
    kind: 'post',
    kicker: `/blog · ${String(date).slice(0, 10)}`,
    title,
  });
}

cards.push({
  path: '/og/learn/index.png',
  alt: 'hipfire learn: How hipfire runs LLMs on AMD GPUs.',
  kind: 'post',
  kicker: '/learn · hipfire 0.4.1',
  title: 'How hipfire runs LLMs on AMD GPUs.',
});
for (const deck of decks) {
  cards.push({
    path: `/og${deck.href}.png`,
    alt: `hipfire learn: ${deck.title}`,
    kind: 'post',
    kicker: `/learn · ${deck.tag}`,
    title: deck.title,
  });
}

// ── Markup ──────────────────────────────────────────────────────────────

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
  body {
    background:
      radial-gradient(900px 520px at 100% 0%, rgba(225, 29, 42, 0.16), transparent 60%),
      #0b0b0c;
    color: #f5f5f5;
    font-family: "Inter", sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  .card { position: absolute; inset: 0; padding: 64px 72px 56px; display: flex; flex-direction: column; }
  .card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 10px; background: #e11d2a; }
  .mono { font-family: "JetBrains Mono", monospace; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .brand svg { width: 64px; height: 64px; display: block; }
  .brand-name { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 40px; letter-spacing: -0.01em; }
  .brand.small svg { width: 48px; height: 48px; }
  .brand.small .brand-name { font-size: 30px; }
  .kicker { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 28px; color: #e11d2a; letter-spacing: 0.01em; }
  .body { flex: 1; display: flex; flex-direction: column; justify-content: center; min-height: 0; }
  .title { font-weight: 800; letter-spacing: -0.025em; line-height: 1.08; overflow-wrap: break-word; }
  .footer { display: flex; align-items: center; justify-content: space-between; }
  .site { font-family: "JetBrains Mono", monospace; font-weight: 500; font-size: 30px; color: #b3b3b3; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
  .stat { border-top: 4px solid #e11d2a; padding-top: 22px; }
  .stat-val { font-family: "JetBrains Mono", monospace; font-weight: 700; font-size: 72px; line-height: 1; letter-spacing: -0.03em; white-space: nowrap; }
  .stat-unit { font-size: 30px; font-weight: 500; color: #b3b3b3; margin-left: 10px; letter-spacing: 0; }
  .stat-label { margin-top: 18px; font-weight: 700; font-size: 27px; line-height: 1.2; }
  .stat-ctx { margin-top: 10px; font-family: "JetBrains Mono", monospace; font-size: 21px; line-height: 1.35; color: #8f8f8f; }
`;

const brand = (small = false) =>
  `<div class="brand${small ? ' small' : ''}">${markSvg}<span class="brand-name">hipfire</span></div>`;

function body(card) {
  if (card.kind === 'default') {
    return `
      ${brand()}
      <div class="body"><h1 class="title" data-fit data-max="92" data-lines="3">${esc(card.title)}</h1></div>
      <div class="footer"><span class="kicker">LLM inference for AMD GPUs</span><span class="site">hipfire.dev</span></div>`;
  }
  if (card.kind === 'bench') {
    return `
      <div class="footer">${brand(true)}<span class="kicker">0.4.1 benchmarks</span></div>
      <div class="body"><div class="stats">${card.stats
        .map(
          (s) => `
        <div class="stat">
          <div class="stat-val">${esc(s.value)}<span class="stat-unit">tok/s</span></div>
          <div class="stat-label">${esc(s.label)}</div>
          <div class="stat-ctx">${esc(s.ctx)}</div>
        </div>`,
        )
        .join('')}</div></div>
      <div class="footer"><span class="site">hipfire.dev/benchmarks/0.4.1</span></div>`;
  }
  return `
    <div class="kicker">${esc(card.kicker)}</div>
    <div class="body"><h1 class="title" data-fit data-max="84" data-lines="4">${esc(card.title)}</h1></div>
    <div class="footer">${brand(true)}<span class="site">hipfire.dev</span></div>`;
}

const html = (card) => `<!doctype html>
<html><head><meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@700;800&family=JetBrains+Mono:wght@400;500;700&display=block" />
<style>${css}</style></head>
<body><div class="card">${body(card)}</div></body></html>`;

// Shrink each [data-fit] title until it fits its line budget and the card body.
const fitTitles = () => {
  for (const el of document.querySelectorAll('[data-fit]')) {
    const maxLines = Number(el.dataset.lines);
    const box = el.parentElement;
    let size = Number(el.dataset.max);
    for (; size > 40; size -= 2) {
      el.style.fontSize = `${size}px`;
      const lines = Math.round(el.scrollHeight / (size * 1.08));
      if (lines <= maxLines && el.scrollHeight <= box.clientHeight && el.scrollWidth <= box.clientWidth) break;
    }
    if (size <= 40) throw new Error(`Title does not fit: ${el.textContent}`);
  }
};

// ── Render ──────────────────────────────────────────────────────────────

const driver = process.env.PUPPETEER_MODULE;
const executablePath = process.env.CHROMIUM_PATH;
if (!driver?.startsWith('/') || !executablePath?.startsWith('/')) {
  throw new Error('Set absolute PUPPETEER_MODULE and CHROMIUM_PATH paths.');
}
const puppeteer = (await import(driver)).default;
const browser = await puppeteer.launch({
  executablePath,
  headless: true,
  timeout: 20000,
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
});

await rm(OUT, { recursive: true, force: true });
const manifest = { width: WIDTH, height: HEIGHT, cards: {} };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  for (const card of cards) {
    await page.setContent(html(card), { waitUntil: 'load', timeout: 20000 });
    // Every card sets text in both families; a fallback face would silently change the look.
    const missing = await page.evaluate(async () => {
      await Promise.all(
        ['700 40px Inter', '800 40px Inter', '500 40px "JetBrains Mono"', '700 40px "JetBrains Mono"'].map((f) =>
          document.fonts.load(f, 'hipfire 0123456789'),
        ),
      );
      await document.fonts.ready;
      const loaded = new Set([...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')));
      return ['Inter', 'JetBrains Mono'].filter((family) => !loaded.has(family));
    });
    if (missing.length) throw new Error(`render-og: fonts not loaded for ${card.path}: ${missing.join(', ')}`);
    await page.evaluate(fitTitles);
    const file = new URL(`.${card.path.slice('/og'.length)}`, OUT);
    await mkdir(new URL('.', file), { recursive: true });
    await page.screenshot({ path: file.pathname, type: 'png', clip: { x: 0, y: 0, width: WIDTH, height: HEIGHT } });
    manifest.cards[card.path] = { alt: card.alt };
    console.log(card.path);
  }
} finally {
  await browser.close();
}
await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`${cards.length} cards → public/og/, manifest → src/data/og-cards.json`);
