# Recorded hero terminal

The homepage and `/embed/terminal` share `TerminalReplay.astro` and its small vanilla TypeScript player. There are no new runtime dependencies. The replay has a fixed-height scrollback, visibility/document pause, a pause/resume control, a three-second loop hold, a reduced-motion static transcript, and an accessible transcript disclosure. The animation is `aria-hidden` with `aria-live="off"`; the disclosure exposes the complete final text without streaming announcements. Without JavaScript the final response is rendered statically.

## Provenance

Source: `/home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash.raw.cast`.
SHA-256: `b8d63cf3840d8f13c13f773dcee36b195ea3ed92b2ca1861aee8d687a53f543d`.
Statistics: `/home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash-clean.log` (also present in the raw cast summary).

The sidecar has statistics but **does not contain the prompt**. The extractor reconstructs the typed command from the cast and extracts its quoted prompt verbatim:

> Write a compact Python TTL LRU cache class with get, put and per-key expiry, then add three concise pytest tests. Output only Python code, no Markdown or explanation. Keep the whole answer to roughly 300 to 450 tokens.

The displayed native CLI equivalent is:

```sh
~ $ hipfire run qwen3.8:flash-next "Write a compact Python TTL LRU cache class with get, put and per-key expiry, then add three concise pytest tests. Output only Python code, no Markdown or explanation. Keep the whole answer to roughly 300 to 450 tokens."
```

The actual recorded command uses `demo.sh --gpu halo --model flash` and is retained in the JSON provenance; this is a replay of that streaming request, not a claim that the raw cast recorded the native CLI command. Its real response is preserved, including its Markdown fences despite the instruction requesting code only. No response text is corrected or invented.

The extractor removes only ANSI saved/restored-cursor status-footer segments, including those sharing an output write with response text, and normalizes CRLF to LF. It retains 111 nonempty **cast output writes** and their individual timestamps; these are not the original 380 network SSE boundaries, which the cast does not expose separately. Enter is at 78.230247s, first response at 78.854929s, last response at 84.100587s, and stream cleanup at 84.131034s. Thus the recorded Enter-to-first-write wait is 624.682ms, and first-to-last response is 5.245658s. The separately measured client TTFT is 323ms; the Enter-to-write wait also includes the recording harness delay. The footer uses the log's exact 72.2 tok/s **server decode** and 381 completion tokens, not a manufactured live rate or the site's separate benchmark median.

Regenerate the static JSON:

```sh
bun /home/kaden/ClaudeCode/warpfront/wt-site-preview/scripts/extract-terminal-replay.mjs /home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash.raw.cast /home/kaden/qcal/release-0.4.1/marketing/demo/demo-halo-flash-clean.log /home/kaden/ClaudeCode/warpfront/wt-site-preview/src/data/terminal-replay.json
```

Only command typing is shortened (400ms lead-in plus 1800ms typing). Generation and its preceding recorded wait are never time-scaled. Browser paint/video sampling can combine writes arriving within one frame.

## Capture and export

Build from `/home/kaden/ClaudeCode/warpfront/wt-site-preview` with `bun run build`, then serve:

```sh
python3 -m http.server 4387 --bind 127.0.0.1 --directory /home/kaden/ClaudeCode/warpfront/wt-site-preview/dist
```

`/embed/terminal` renders only the terminal. Use a 1200×675 or 1080×1080 viewport at device scale 1. Square styling is selected by viewport aspect ratio, not a runtime query parser. The route is noindex.

The browser tool's `recordStart(..., {fps: 20})` MP4s were attempted, but their encoded durations exceeded the reported wall durations (~12.3s versus ~10s). Those drafts were not shipped because recording stutter would misrepresent generation timing. The tool's freeze/thaw hooks also interfered with clock stepping. The standalone Puppeteer fallback in `scripts/export-terminal.mjs` instead samples the same browser player at exact 50ms animation-clock steps, without altering any recorded chunk offsets. **Every frame asserts its replay elapsed time and exact response prefix against the original JSON**; capture fails on clock drift. It exports 199 frames / 9.95s, including a final 1.8-second hold, and cleans its temporary PNG sequence.

Install the capture-only driver in an isolated directory (not the site's dependencies):

```sh
mkdir -p /tmp/hipfire-terminal-capture-driver
bun add --cwd /tmp/hipfire-terminal-capture-driver puppeteer-core
PUPPETEER_MODULE=/tmp/hipfire-terminal-capture-driver/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js CHROMIUM_PATH=/home/kaden/.omp/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome bun /home/kaden/ClaudeCode/warpfront/wt-site-preview/scripts/export-terminal.mjs /home/kaden/qcal/release-0.4.1/marketing/terminal 1200 675
```

Repeat with `1080 1080` for square output. Set `CHROMIUM_PATH` to your installed Chromium executable if the cached version changes. The fallback launches a separate headless browser with `--disable-gpu`, has an explicit launch timeout, and must be invoked with an overall 180-second command timeout. `exportTerminal(page, absoluteOutputDir, width, height)` can also be imported into a standalone Puppeteer program.

The exporter has explicit browser/ffmpeg timeouts. It uses ffmpeg H.264, yuv420p, faststart, and palettegen/paletteuse GIFs at 20fps with infinite looping and an enforced 8,000,000-byte ceiling. A 1200×675 render must be padded by one bottom pixel to **1200×676** for H.264/yuv420p's even-dimension requirement; the landscape GIF remains exactly 1200×675. Square outputs remain 1080×1080. No output or generation timing is rescaled. Exports, screenshots and extracted video/GIF verification frames live outside the repository in `/home/kaden/qcal/release-0.4.1/marketing/terminal/`.
