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
const commandEnd = events.findIndex((event, index) => index > 0 && event[2] === '\r\n');
const recordedCommand = events.slice(1, commandEnd).map((event) => event[2]).join('');
const prompt = recordedCommand.match(/'([^']+)'$/)?.[1];
if (!prompt || header.version !== 2) throw new Error('Unexpected cast command or version.');
const firstContent = events.findIndex((event, index) => index > commandEnd && event[2] === '```');
const endContent = events.findIndex((event, index) => index > firstContent && event[2].includes('\u001b[r'));
if (firstContent < 0 || endContent < 0) throw new Error('Missing response boundaries.');
const origin = events[commandEnd][0];
// The status ticker saves/restores the cursor. A cast write may contain both
// its footer and response bytes: remove only the saved-cursor footer segment.
const chunks = events.slice(firstContent, endContent).flatMap(([time, type, bytes]) => {
  if (type !== 'o') return [];
  const text = bytes.replace(/\u001b7[\s\S]*?\u001b8/g, '').replace(/\r\n/g, '\n');
  if (text.includes('\u001b')) throw new Error('Unexpected response escape sequence.');
  return text ? [{ at: Math.round((time - origin) * 1e6) / 1000, text }] : [];
});
const number = (pattern) => {
  const match = log.match(pattern);
  if (!match) throw new Error(`Missing recorded statistic: ${pattern}`);
  return Number(match[1]);
};
const replay = {
  model: 'Qwen3.8-Flash', hardware: 'Strix Halo',
  prompt, command: `hipfire run qwen3.8:flash-next ${JSON.stringify(prompt)}`,
  completionTokens: number(/completion tokens:\s*(\d+)/),
  serverDecodeTokensPerSecond: number(/server decode\s*:\s*([\d.]+)/),
  ttftMilliseconds: number(/TTFT\s*:\s*(\d+) ms/),
  streamEnd: Math.round((events[endContent][0] - origin) * 1e6) / 1000,
  source: {
    cast: castPath.split('/').pop(), log: logPath.split('/').pop(),
    sha256: createHash('sha256').update(raw).digest('hex'),
    recordedCommand, commandEnteredAt: origin,
    firstContentAt: events[firstContent][0], lastContentAt: events[endContent - 1][0],
    timing: 'Milliseconds relative to recorded command Enter; no generation time scaling.',
    chunks: 'Cast output writes, not network SSE boundaries; footer-only writes omitted.',
  },
  chunks,
};
await writeFile(outputPath, `${JSON.stringify(replay, null, 2)}\n`);
console.log(`${chunks.length} recorded output writes; prompt: ${prompt}`);
