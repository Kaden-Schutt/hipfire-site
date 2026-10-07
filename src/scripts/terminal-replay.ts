import replay from '../data/terminal-replay.json';

const LEAD_IN = 400;
const TYPING = 1800;
const HOLD = 3000;
const generationStart = LEAD_IN + TYPING;
const end = generationStart + replay.streamEnd;
const duration = end + HOLD;
const finalText = replay.chunks.map((chunk) => chunk.text).join('');

/** Footer second line at a replay time: the recorded run's own live ticker
 * readings while streaming (tokenizer estimate, rate over wall time since
 * first content), then the server-reported statistics of this run. */
const statusAt = (elapsed: number, final: string) => {
  if (elapsed >= end) return final;
  if (elapsed < generationStart) return 'typing command…';
  const at = elapsed - generationStart;
  let reading: (typeof replay.ticker)[number] | undefined;
  for (const candidate of replay.ticker) {
    if (candidate.at > at) break;
    reading = candidate;
  }
  if (!reading || at < replay.chunks[0].at) return 'waiting for first token…';
  return `live · ~${reading.tokens} tokens · ~${reading.rate ?? '–'} tok/s`;
};

for (const root of document.querySelectorAll<HTMLElement>('[data-terminal-replay]')) {
  const command = root.querySelector<HTMLElement>('[data-replay-command]')!;
  const output = root.querySelector<HTMLElement>('[data-replay-output]')!;
  const scrollback = root.querySelector<HTMLElement>('[data-replay-scrollback]')!;
  const cursor = root.querySelector<HTMLElement>('[data-replay-cursor]')!;
  const footer = root.querySelector<HTMLElement>('[data-replay-footer]')!;
  const button = root.querySelector<HTMLButtonElement>('[data-replay-toggle]')!;
  const finalStatus = footer.dataset.final!;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let visible = false;
  let paused = false;
  let elapsed = 0;
  let last = 0;
  let frame = 0;
  let nextChunk = 0;
  let typed = -1;
  let status = '';

  const setStatus = (text: string) => {
    if (text === status) return;
    status = text;
    footer.textContent = text;
    footer.toggleAttribute('data-live', text.startsWith('live'));
  };
  const reset = () => {
    elapsed = 0;
    nextChunk = 0;
    typed = -1;
    output.textContent = '';
    scrollback.scrollTop = 0;
  };
  const render = () => {
    const count = Math.min(replay.command.length, Math.max(0,
      Math.floor((elapsed - LEAD_IN) / TYPING * replay.command.length)));
    if (count !== typed) {
      command.textContent = replay.command.slice(0, count);
      typed = count;
    }
    cursor.hidden = elapsed >= generationStart;
    let text = '';
    while (nextChunk < replay.chunks.length &&
      generationStart + replay.chunks[nextChunk].at <= elapsed) {
      text += replay.chunks[nextChunk++].text;
    }
    if (text) {
      output.append(document.createTextNode(text));
      scrollback.scrollTop = scrollback.scrollHeight;
    }
    setStatus(statusAt(elapsed, finalStatus));
    root.dataset.replayPhase = elapsed < generationStart ? 'typing' : elapsed < end ? 'streaming' : 'complete';
    root.dataset.replayElapsed = String(Math.round(elapsed));
  };
  const tick = (now: number) => {
    elapsed += now - last;
    last = now;
    if (elapsed >= duration) reset();
    render();
    frame = requestAnimationFrame(tick);
  };
  const update = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    button.hidden = false;
    if (reducedMotion.matches) {
      command.textContent = replay.command;
      output.textContent = finalText;
      scrollback.scrollTop = 0;
      setStatus(finalStatus);
      cursor.hidden = true;
      button.disabled = true;
      button.textContent = 'Static replay';
      root.dataset.replayPhase = 'static';
      return;
    }
    button.disabled = false;
    button.textContent = paused ? 'Resume replay' : 'Pause replay';
    render();
    if (visible && !paused && !document.hidden) {
      last = performance.now();
      frame = requestAnimationFrame(tick);
    }
  };
  button.addEventListener('click', () => { paused = !paused; update(); });
  reducedMotion.addEventListener('change', () => { reset(); update(); });
  document.addEventListener('visibilitychange', update);
  // Capture route can restart at a known origin without changing playback speed.
  root.addEventListener('terminal-replay:restart', () => { paused = false; reset(); update(); });
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }, { threshold: 0.1 });
  reset();
  update();
  observer.observe(root);
}
