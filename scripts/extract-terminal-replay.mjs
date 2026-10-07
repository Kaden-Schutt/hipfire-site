import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Run with absolute paths: bun scripts/extract-terminal-replay.mjs CAST LOG OUTPUT.
const [castPath, logPath, outputPath] = process.argv.slice(2);
if (![castPath, logPath, outputPath].every((path) => path?.startsWith('/'))) {
  throw new Error('Provide absolute CAST, LOG and OUTPUT paths.');
}
const raw = await readFile(castPath, 'utf8');
const log = await readFile(logPath, 'utf8');
const [header, ...events] = raw.trim().split('\n').map((line) => JSON.parse(line));
if (header.version !== 2) throw new Error('Unexpected cast version.');
const commandEnd = events.findIndex((event, index) => index > 0 && event[2] === '\r\n');
// The first write(s) clear the screen and print the title and `$ ` prompt; the
// command is then typed one character per write and ends with a bare CRLF.
const typed = events.slice(0, commandEnd).map((event) => event[2]).join('')
  .replace(/\u001b\][^\u0007]*\u0007/g, '').replace(/\u001b\[[0-9;?]*[A-Za-z]/g, '');
const recordedCommand = typed.slice(typed.lastIndexOf('$ ') + 2);
const prompt = recordedCommand.match(/'([^']+)'$/)?.[1];
if (!prompt) throw new Error('Unexpected cast command.');

// The live status ticker saves/restores the cursor around a bottom-row write.
// A cast write may contain both a ticker update and response bytes.
const FOOTER = /\u001b7([\s\S]*?)\u001b8/g;
const contentOf = (bytes) => bytes.replace(FOOTER, '').replace(/\r\n/g, '\n');
const firstContent = events.findIndex((event, index) => index > commandEnd && contentOf(event[2]) !== '');
const endContent = events.findIndex((event, index) => index > firstContent && event[2].includes('\u001b[r'));
if (firstContent < 0 || endContent < 0) throw new Error('Missing response boundaries.');
const origin = events[commandEnd][0];
const at = (time) => Math.round((time - origin) * 1e6) / 1000;

const chunks = events.slice(firstContent, endContent).flatMap(([time, type, bytes]) => {
  if (type !== 'o') return [];
  const text = contentOf(bytes);
  if (text.includes('\u001b')) throw new Error('Unexpected response escape sequence.');
  return text ? [{ at: at(time), text }] : [];
});

// Recorded ticker readings: the run's own live tokenizer estimate (~N tokens,
// ~R tok/s over wall time since first content), sampled every 100 ms.
const ticker = events.slice(commandEnd, endContent).flatMap(([time, , bytes]) =>
  [...bytes.matchAll(FOOTER)].flatMap(([, footer]) => {
    const match = footer.match(/~(\d+|--) tok\/s · ~(\d+) tokens/);
    return match ? [{ at: at(time), tokens: Number(match[2]), rate: match[1] === '--' ? null : Number(match[1]) }] : [];
  }));
if (!ticker.length) throw new Error('Missing recorded ticker readings.');

const resultLine = log.split('\n').find((line) => line.startsWith('DEMO_RESULT '));
if (!resultLine) throw new Error('Missing DEMO_RESULT line in the stats sidecar.');
const result = JSON.parse(resultLine.slice('DEMO_RESULT '.length));
if (!result.ok || result.mode !== 'mtp' || result.finish_reason !== 'stop') {
  throw new Error(`Recorded run is not a complete MTP run: ${JSON.stringify(result.failures)}`);
}
const replay = {
  model: 'Qwen3.8-Flash', hardware: 'Strix Halo',
  prompt, command: `hipfire run qwen3.8:flash-next ${JSON.stringify(prompt)}`,
  completionTokens: result.completion_tokens,
  serverDecodeTokensPerSecond: Math.round(result.server_decode_tok_s * 10) / 10,
  ttftMilliseconds: Math.round(result.ttft_ms_client),
  streamEnd: at(events[endContent][0]),
  source: {
    cast: castPath.split('/').pop(), log: logPath.split('/').pop(),
    sha256: createHash('sha256').update(raw).digest('hex'),
    recordedCommand, commandEnteredAt: origin,
    firstContentAt: events[firstContent][0], lastContentAt: events[endContent - 1][0],
    timing: 'Milliseconds relative to recorded command Enter; no generation time scaling.',
    chunks: 'Cast output writes, not network SSE boundaries; footer-only writes omitted.',
    ticker: 'Recorded live footer readings: tokenizer estimate of streamed text, rate over wall time since first content.',
  },
  ticker,
  chunks,
};
await writeFile(outputPath, `${JSON.stringify(replay, null, 2)}\n`);
console.log(`${chunks.length} recorded output writes, ${ticker.length} ticker readings; prompt: ${prompt}`);
