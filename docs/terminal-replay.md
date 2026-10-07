# Recorded hero terminal

The homepage and `/embed/terminal` share `TerminalReplay.astro` and its small vanilla TypeScript player. There are no new runtime dependencies. The replay has a fixed-height scrollback with a top fade mask, visibility/document pause, a pause/resume control (hidden on `/embed/terminal`), a three-second loop hold, a reduced-motion static transcript, and an accessible transcript disclosure. The animation is `aria-hidden` with `aria-live="off"`; the disclosure exposes the complete final text without streaming announcements. Without JavaScript the final response and final statistics are rendered statically. A small "replay of a recorded run · real timing" label stays visible.

## Provenance

Source: `/home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash-v2.raw.cast`.
SHA-256: `c9d2f177cfcf717fa7f4038aed2ab2c79f84bc838c920111afaf3c723a7a4781`.
Statistics: `/home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash-v2.log` (lab summary plus `DEMO_RESULT` JSON, written by `stream-demo.py --summary-file`).

Recorded 2026-10-07 on hipx: Qwen3.8-Flash (flash-next GPTQ3 MQ4) on Strix Halo (`0000:bf:00.0`), release defaults with native MTP (verified `timings.mtp=true`), greedy, thinking off, under `hipx-lock.sh timing` via `demo.sh --gpu halo --model flash --max-tokens 600 --min-tokens 250`. The cast is an asciinema v2 file written by a minimal PTY recorder, `/home/kaden/qcal/release-0.4.1/marketing/demo/pty-cast-rec.py` (120×34, real output bytes, monotonic timestamps), wrapped around that command. Earlier takes with longer-answer prompts hit the 600-token cap and were discarded; they are kept in `/home/kaden/qcal/release-0.4.1/marketing/demo/takes-v2/` (take 3 is the shipped run).

Prompt (extracted verbatim from the typed command in the cast):

> Write a minimal Python LRU cache with per-key TTL and two pytest tests

The displayed native CLI equivalent is:

```sh
~ $ hipfire run qwen3.8:flash-next "Write a minimal Python LRU cache with per-key TTL and two pytest tests"
```

The actual recorded command uses `demo.sh --gpu halo --model flash` and is retained in the JSON provenance; this is a replay of that streaming request, not a claim that the raw cast recorded the native CLI command. The real response (a fenced Python block; the prompt does not forbid Markdown) is preserved. No response text is corrected or invented.

The extractor removes only ANSI saved/restored-cursor status-footer segments, including those sharing an output write with response text, and normalizes CRLF to LF. It retains 382 nonempty **cast output writes** and their individual timestamps; these are cast writes, not network SSE boundaries. Enter is at 85.204475s, first response at 85.688265s and last response at 92.814673s: the Enter-to-first-write wait is 483.79ms (it includes the harness's 300ms post-Enter pause) and first-to-last response is 7.126s. Client TTFT is 183ms (server-reported 179ms).

The footer's live line replays the **run's own recorded status ticker**: 71 readings, ~100ms apart, each the model-tokenizer estimate of the streamed text so far (`~N tokens`) and that count over wall time since first content (`~R tok/s`). They are shown at their recorded times. After the stream the footer switches to the exact sidecar figures for **this run**: 482 completion tokens (server usage, `finish_reason=stop`), 67.6 tok/s server-measured decode, 183ms to first token. The homepage 58.7 tok/s tile is a different measure (median of 8 benchmark prompts), labelled as such.

Regenerate the static JSON (the extractor requires `ok`, MTP and `finish_reason=stop` in `DEMO_RESULT`):

```sh
bun /home/kaden/ClaudeCode/warpfront/wt-site-preview/scripts/extract-terminal-replay.mjs /home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash-v2.raw.cast /home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash-v2.log /home/kaden/ClaudeCode/warpfront/wt-site-preview/src/data/terminal-replay.json
```

Only command typing is shortened (400ms lead-in plus 1800ms typing). Generation, its ticker and its preceding recorded wait are never time-scaled. Browser paint/video sampling can combine writes arriving within one frame.

## Capture and export

Build from `/home/kaden/ClaudeCode/warpfront/wt-site-preview` with `bun run build`, then serve:

```sh
python3 -m http.server 4387 --bind 127.0.0.1 --directory /home/kaden/ClaudeCode/warpfront/wt-site-preview/dist
```

`/embed/terminal` renders only the terminal. Use a 1200×675 or 1080×1080 viewport at device scale 1. Square styling is selected by viewport aspect ratio, not a runtime query parser. The route is noindex.

The browser tool's `recordStart(..., {fps: 20})` MP4s were attempted, but their encoded durations exceeded the reported wall durations. Those drafts were not shipped because recording stutter would misrepresent generation timing. The standalone Puppeteer exporter in `scripts/export-terminal.mjs` instead samples the same browser player at exact 50ms animation-clock steps, without altering any recorded chunk offsets. **Every frame asserts its replay elapsed time, exact response prefix and (while streaming) the recorded ticker reading against the JSON**, and capture fails if the pause control is visible. It exports 233 frames / 11.65s, including a final 1.8-second hold, and cleans its temporary PNG sequence.

Install the capture-only driver in an isolated directory (not the site's dependencies):

```sh
mkdir -p /tmp/hipfire-terminal-capture-driver
bun add --cwd /tmp/hipfire-terminal-capture-driver puppeteer-core
PUPPETEER_MODULE=/tmp/hipfire-terminal-capture-driver/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js CHROMIUM_PATH=/home/kaden/.omp/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome bun /home/kaden/ClaudeCode/warpfront/wt-site-preview/scripts/export-terminal.mjs /home/kaden/qcal/release-0.4.1/marketing/terminal 1200 675
```

Repeat with `1080 1080` for square output. Set `CHROMIUM_PATH` to your installed Chromium executable if the cached version changes. The fallback launches a separate headless browser with `--disable-gpu`, has an explicit launch timeout, and must be invoked with an overall 180-second command timeout. `exportTerminal(page, absoluteOutputDir, width, height)` can also be imported into a standalone Puppeteer program.

The exporter has explicit browser/ffmpeg timeouts. It uses ffmpeg H.264, yuv420p, faststart, and palettegen/paletteuse GIFs at 20fps with infinite looping and an enforced 8,000,000-byte ceiling. A 1200×675 render must be padded by one bottom pixel to **1200×676** for H.264/yuv420p's even-dimension requirement; the landscape GIF remains exactly 1200×675. Square outputs remain 1080×1080. No output or generation timing is rescaled. Exports, screenshots and extracted video/GIF verification frames live outside the repository in `/home/kaden/qcal/release-0.4.1/marketing/terminal/v2/`.
