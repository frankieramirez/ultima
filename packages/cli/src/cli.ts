import { createInterface } from 'node:readline/promises';

import type { InitIO } from './init.ts';
import { run } from './run.ts';

const argv = process.argv.slice(2);
// Only the hidden `hook` reads stdin: the harness writes its post-edit payload there.
const stdin = argv[0] === 'hook' ? await readStdin() : '';
const io: InitIO = {
  interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
  ask: async (question) => {
    const prompt = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt.question(`${question} [y/N] `);
    prompt.close();
    return /^y(es)?$/i.test(answer.trim());
  },
  out: (text) => process.stdout.write(text),
  err: (text) => process.stderr.write(text),
};
const { code, stdout, stderr } = await run(argv, stdin, io);
process.stdout.write(stdout);
process.stderr.write(stderr);
process.exitCode = code;

async function readStdin(): Promise<string> {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
    return Buffer.concat(chunks).toString('utf8');
  } catch {
    return '';
  }
}
