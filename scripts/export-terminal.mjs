import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const exec = promisify(execFile);
const replay = JSON.parse(await readFile(new URL('../src/data/terminal-replay.json', import.meta.url), 'utf8'));

/** Accepts a standalone Puppeteer page, without tool-managed clock hooks.
 * Capture the SAME player at exact 20fps sample times, avoiding screencast
 * encoder stalls. Only the browser animation clock is stepped: recorded
 * chunk timestamps are unchanged. No GPU, live model or video time scaling.
 */
export async function exportTerminal(page, outputDir, width, height) {
  if (!outputDir.startsWith('/')) throw new Error('Output directory must be absolute.');
  const frames = await mkdtemp(join(tmpdir(), 'hipfire-terminal-'));
  const name = `halo-flash-${width}x${height}`;
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
    await page.goto('http://127.0.0.1:4387/embed/terminal/', { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('[data-terminal-replay][data-replay-phase]', { timeout: 10000 });
    // Let IntersectionObserver schedule the first frame before restarting.
    await new Promise((resolve) => setTimeout(resolve, 100));
    // Pause the real-clock loop (programmatically; the capture route hides the control).
    const controlHidden = await page.evaluate(() => {
      const button = document.querySelector('[data-replay-toggle]');
      if (button.textContent === 'Pause replay') button.click();
      return getComputedStyle(button).display === 'none';
    });
    if (!controlHidden) throw new Error('Interactive replay control is visible in the capture route.');
    await page.evaluate(`(() => {
      let clock = 0;
      let id = 0;
      const queue = new Map();
      const originalNow = performance.now.bind(performance);
      const originalRequest = window.requestAnimationFrame;
      const originalCancel = window.cancelAnimationFrame;
      window.__terminalCaptureRestore = () => {
        performance.now = originalNow;
        window.requestAnimationFrame = originalRequest;
        window.cancelAnimationFrame = originalCancel;
      };
      performance.now = () => clock;
      window.requestAnimationFrame = (callback) => { queue.set(++id, callback); return id; };
      window.cancelAnimationFrame = (key) => { queue.delete(key); };
      window.__terminalCaptureStep = (time) => {
        clock = time;
        const pending = [...queue.values()];
        queue.clear();
        for (const callback of pending) callback(clock);
      };
    })()`);
    await page.evaluate(() => document.querySelector('[data-terminal-replay]').dispatchEvent(new Event('terminal-replay:restart')));
    const end = 400 + 1800 + replay.streamEnd;
    const count = Math.ceil((end + 1800) / 50);
    for (let index = 0; index < count; index++) {
      await page.evaluate((time) => window.__terminalCaptureStep(time), index * 50);
      const path = join(frames, `${String(index).padStart(4, '0')}.png`);
      await page.screenshot({ path, type: 'png', timeout: 10000 });
      const actual = await page.evaluate(() => ({
        elapsed: Number(document.querySelector('[data-terminal-replay]').dataset.replayElapsed),
        text: document.querySelector('[data-replay-output]').textContent,
        status: document.querySelector('[data-replay-footer]').textContent,
      }));
      const expected = replay.chunks.filter((chunk) => 2200 + chunk.at <= index * 50).map((chunk) => chunk.text).join('');
      if (actual.elapsed !== index * 50 || actual.text !== expected) {
        throw new Error(`Capture clock drift at frame ${index}: ${actual.elapsed}ms instead of ${index * 50}ms.`);
      }
      // While streaming, the footer must show the recorded ticker reading for this instant.
      const reading = replay.ticker.filter((entry) => 2200 + entry.at <= index * 50).at(-1);
      if (reading && index * 50 < end && !actual.status.includes(`~${reading.tokens} tokens`)) {
        throw new Error(`Ticker mismatch at frame ${index}: "${actual.status}" lacks ~${reading.tokens} tokens.`);
      }
      if (index === 10 || index === 100 || index === count - 1) {
        await page.screenshot({ path: join(outputDir, `${name}-${index === 10 ? 'start' : index === 100 ? 'mid-stream' : 'end'}.png`), type: 'png' });
      }
    }
    const input = join(frames, '%04d.png');
    const mp4 = join(outputDir, `${name}.mp4`);
    const gif = join(outputDir, `${name}.gif`);
    // yuv420p H.264 requires even dimensions. Pad the 675px capture by one
    // bottom row rather than changing the terminal's size or aspect ratio.
    await exec('ffmpeg', ['-y', '-v', 'error', '-framerate', '20', '-i', input, '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', mp4], { timeout: 120000 });
    await exec('ffmpeg', ['-y', '-v', 'error', '-framerate', '20', '-i', input, '-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle', '-loop', '0', gif], { timeout: 120000 });
    const result = { mp4, mp4Bytes: (await stat(mp4)).size, gif, gifBytes: (await stat(gif)).size, frames: count, fps: 20, durationSeconds: count / 20 };
    if (result.gifBytes > 8_000_000) throw new Error(`GIF exceeds 8MB: ${result.gifBytes}`);
    return result;
  } finally {
    await page.evaluate('window.__terminalCaptureRestore?.()');
    await rm(frames, { recursive: true, force: true });
  }
}

// Standalone fallback avoids browser-tool freeze/thaw hooks overriding rAF.
// Install puppeteer-core in an isolated directory, not the site's runtime.
if (import.meta.main) {
  const [outputDir, width = '1200', height = '675'] = process.argv.slice(2);
  const driver = process.env.PUPPETEER_MODULE;
  const executablePath = process.env.CHROMIUM_PATH;
  if (!driver?.startsWith('/') || !executablePath?.startsWith('/')) {
    throw new Error('Set absolute PUPPETEER_MODULE and CHROMIUM_PATH paths.');
  }
  const puppeteer = (await import(driver)).default;
  const browser = await puppeteer.launch({
    executablePath, headless: true, timeout: 20000,
    args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
  });
  try {
    const page = await browser.newPage();
    console.log(JSON.stringify(await exportTerminal(page, outputDir, Number(width), Number(height)), null, 2));
  } finally {
    await browser.close();
  }
}
